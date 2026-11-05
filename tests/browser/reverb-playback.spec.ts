import { expect, test } from '@playwright/test';

test('reverb replacement warms independently and survives device suspension without restarting the song', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { AudioEngine } = await import('/src/audio/' + 'engine.ts');
    const { createProject } = await import('/src/core/' + 'project.ts');
    const { makePedal, emptyChain } = await import('/src/core/' + 'pedals.ts');
    const { reverbModule } = await import('/src/modules/pedals/' + 'reverb.ts');
    const engine = new AudioEngine() as any;
    await engine.ready();
    engine.monitor.gain.value = 0;
    const context = engine.context as AudioContext;
    const p = createProject(),
      original = JSON.stringify(p),
      sound = p.comparison.A;
    await engine.auditionPhrase(
      sound,
      {
        tempo: 60,
        beats: 3,
        events: [{ beat: 0, duration: 3, notes: [], frequencies: [261.625565] }],
      },
      undefined,
      emptyChain(),
    );
    const session = engine.session,
      origin = session.start,
      voice = session.voices[0],
      old = [...session.auditionBranches][0] as any;
    const wait = async (at: number) => {
      const deadline = performance.now() + 5000;
      while (context.currentTime < at) {
        if (performance.now() > deadline) throw new Error('Audio clock stalled');
        await new Promise((r) => setTimeout(r, 20));
      }
    };
    await wait(origin + 0.1);
    const chain = emptyChain();
    chain.pedals = [makePedal(reverbModule.id)];
    Object.assign(chain.pedals[0].params, { mix: 100, preDelay: 100, size: 200, decay: 0.4 });
    engine.switchAudition(sound, chain);
    const graph = session.chains.get('audition');
    const warmup = graph.warmup;
    await context.suspend();
    await new Promise((r) => setTimeout(r, 550));
    const held = session.auditionBranches.has(old);
    await context.resume();
    await wait(context.currentTime + warmup + 0.2);
    const retired = !session.auditionBranches.has(old),
      retained =
        engine.session === session && session.start === origin && session.voices[0] === voice;
    const current = session.chambers.get('audition');
    chain.pedals[0].params.decay = 0.8;
    const processing = structuredClone(p.processing);
    processing.audition.A = chain;
    engine.updateProcessing(processing, 'A');
    const edited =
      engine.session === session &&
      session.chains.get('audition') === graph &&
      session.chambers.get('audition') === current;
    engine.stop();
    await new Promise((r) => setTimeout(r, 100));
    const stopped = engine.session === null && session.auditionBranches.size === 0;
    await context.close();
    return {
      held,
      retired,
      retained,
      edited,
      stopped,
      warmup,
      unchanged: JSON.stringify(p) === original,
    };
  });
  expect(proof.held).toBe(true);
  expect(proof.retired).toBe(true);
  expect(proof.retained).toBe(true);
  expect(proof.edited).toBe(true);
  expect(proof.stopped).toBe(true);
  expect(proof.unchanged).toBe(true);
  expect(proof.warmup).toBeGreaterThan(0.29);
});

test('serial warm-up sums musical history while bypass and dry mix require none', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { createChain } = await import('/src/audio/' + 'effects.ts');
    const { makePedal, emptyChain } = await import('/src/core/' + 'pedals.ts');
    const { reverbModule } = await import('/src/modules/pedals/' + 'reverb.ts');
    const context = new OfflineAudioContext(1, 128, 48000),
      chain = emptyChain();
    chain.pedals = [makePedal(reverbModule.id), makePedal(reverbModule.id)];
    const graph = createChain(context, chain, 0, 0),
      warm = graph.warmup,
      latency = graph.latency;
    chain.bypassed = true;
    graph.update(chain);
    const bypass = graph.warmup;
    chain.bypassed = false;
    for (const p of chain.pedals) p.params.mix = 0;
    graph.update(chain);
    const dry = graph.warmup;
    graph.dispose();
    return {
      warm,
      latency,
      bypass,
      dry,
      expected:
        2 *
        reverbModule.warmup!((chain.pedals[0].params = { ...chain.pedals[0].params, mix: 25 }), {
          sampleRate: 48000,
          compressorLatency: 0,
          oversamplingLatency: 0,
        }),
    };
  });
  expect(proof.warm).toBeCloseTo(proof.expected);
  expect(proof.latency).toBe(0);
  expect(proof.bypass).toBe(0);
  expect(proof.dry).toBe(0);
});

test('frozen reverb WAV matches the direct module path at both rates and budgets its tail', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { createProject } = await import('/src/core/' + 'project.ts');
    const { makePedal } = await import('/src/core/' + 'pedals.ts');
    const { renderWav, prepareExport } = await import('/src/audio/' + 'export.ts');
    const { createVoice } = await import('/src/audio/' + 'voice.ts');
    const { createChamber } = await import('/src/audio/' + 'chamber.ts');
    const { ACOUSTICS_DEFAULTS } = await import('/src/modules/' + 'index.ts');
    const { reverbModule } = await import('/src/modules/pedals/' + 'reverb.ts');
    const rows = [];
    for (const [rate, withBody] of [
      [44100, false],
      [48000, false],
      [44100, true],
      [48000, true],
    ] as const) {
      const project = createProject();
      if (withBody)
        project.instruments.find((p: any) => p.key === 'saw')!.sound.acoustics = {
          ...ACOUSTICS_DEFAULTS,
          enabled: true,
        };
      project.scoreText = 'tempo 120\ntrack reverbProof using saw {\n C4 half\n}';
      const pedal = makePedal(reverbModule.id);
      pedal.params.preDelay = 80;
      pedal.params.decay = 0.4;
      pedal.params.size = 150;
      project.processing.master.pedals = [pedal];
      const options = {
        sampleRate: rate,
        channels: 1,
        bitDepth: 16,
        normalize: false,
        tailSeconds: 4,
      } as any;
      const plan = prepareExport(project, options);
      const pending = renderWav(project, options);
      // A UI edit after Export must not mutate the frozen processor settings.
      pedal.params.decay = 10;
      const actual = await pending;
      const context = new OfflineAudioContext(1, plan.frames, rate);
      const mix = context.createGain();
      mix.gain.value = plan.snapshot.mixGain;
      mix.connect(context.destination);
      const processor = reverbModule.create(
        context,
        plan.snapshot.processing.master.pedals[0].params,
        false,
        { sampleRate: rate, oversamplingLatency: 0, compressorLatency: 0, timeOrigin: 0 },
      );
      processor.output.connect(mix);
      const event = plan.score.events[0],
        track = plan.snapshot.tracks[0];
      const trackGain = context.createGain();
      trackGain.gain.value = track.level;
      trackGain.connect(processor.input);
      const body = createChamber(context, track.sound.acoustics);
      body.output.connect(trackGain);
      const voice = createVoice(context, body.input, track.sound, event.frequencies[0], 0, 1);
      const expected = (await context.startRendering()).getChannelData(0),
        data = actual.buffer.getChannelData(0);
      let error = 0;
      for (let i = 0; i < data.length; i++)
        error = Math.max(error, Math.abs(data[i] - expected[i]));
      rows.push({
        error,
        capped: actual.capped,
        capWarns: prepareExport(project, { ...options, tailSeconds: 0 }).capped,
      });
      voice.dispose();
      body.dispose();
      processor.dispose();
    }
    return rows;
  });
  for (const row of proof) {
    expect(row.error).toBeLessThan(0.000001);
    expect(row.capped).toBe(false);
    expect(row.capWarns).toBe(true);
  }
});
