import { expect, test } from '@playwright/test';

test('frozen chorus WAV matches the direct module path at both rates and budgets its tail', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { createProject } = await import('/src/core/' + 'project.ts');
    const { makePedal } = await import('/src/core/' + 'pedals.ts');
    const { renderWav, prepareExport } = await import('/src/audio/' + 'export.ts');
    const { createVoice } = await import('/src/audio/' + 'voice.ts');
    const { chorusModule } = await import('/src/modules/pedals/' + 'chorus.ts');
    const rows = [];
    for (const rate of [44100, 48000]) {
      const project = createProject();
      project.scoreText = 'tempo 120\ntrack chorusProof using saw {\n C4 half\n}';
      const pedal = makePedal(chorusModule.id);
      pedal.params.rate = 0.85;
      pedal.params.time = 5;
      pedal.params.depth = 100;
      project.processing.master.pedals = [pedal];
      const options = {
        sampleRate: rate,
        channels: 1,
        bitDepth: 16,
        normalize: false,
        tailSeconds: 0.05,
      } as any;
      const plan = prepareExport(project, options);
      const pending = renderWav(project, options);
      // A UI edit after Export must not mutate the frozen processor settings.
      pedal.params.rate = 5;
      const actual = await pending;
      const context = new OfflineAudioContext(1, plan.frames, rate);
      const mix = context.createGain();
      mix.gain.value = plan.snapshot.mixGain;
      mix.connect(context.destination);
      const processor = chorusModule.create(
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
      const voice = createVoice(context, trackGain, track.sound, event.frequencies[0], 0, 1);
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

test('live chorus edits preserve the musical clock and oscillator; replacement and Stop own cleanup', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { AudioEngine } = await import('/src/audio/' + 'engine.ts');
    const { createProject } = await import('/src/core/' + 'project.ts');
    const { makePedal, emptyChain } = await import('/src/core/' + 'pedals.ts');
    const { chorusModule } = await import('/src/modules/pedals/' + 'chorus.ts');
    const engine = new AudioEngine() as any;
    await engine.ready();
    engine.monitor.gain.value = 0;
    const context = engine.context as AudioContext;
    const original = context.createOscillator.bind(context),
      starts: number[] = [];
    let stops = 0;
    context.createOscillator = () => {
      const oscillator = original(),
        start = oscillator.start.bind(oscillator),
        stop = oscillator.stop.bind(oscillator);
      let modulation = false;
      const setWave = oscillator.setPeriodicWave.bind(oscillator);
      oscillator.setPeriodicWave = (wave) => {
        modulation = true;
        setWave(wave);
      };
      oscillator.start = (when = 0) => {
        if (modulation && oscillator.frequency.value <= 5) {
          starts.push(when);
          const ownedStop = oscillator.stop.bind(oscillator);
          oscillator.stop = (at = 0) => {
            stops++;
            ownedStop(at);
          };
        }
        start(when);
      };
      oscillator.stop = stop;
      return oscillator;
    };
    const wait = async (at: number) => {
      const deadline = performance.now() + 5000;
      while (context.currentTime < at) {
        if (performance.now() > deadline) throw new Error('Audio clock stalled');
        await new Promise((r) => setTimeout(r, 20));
      }
    };
    // Advance the device context before Play so absolute context zero cannot masquerade as song zero.
    await wait(context.currentTime + 0.2);
    const project = createProject(),
      processing = structuredClone(project.processing);
    const chain = emptyChain();
    chain.pedals = [makePedal(chorusModule.id)];
    processing.audition.A = chain;
    const source = JSON.stringify(project),
      sound = project.comparison.A;
    await engine.auditionPhrase(
      sound,
      {
        tempo: 60,
        beats: 2,
        events: [{ beat: 0, duration: 2, notes: [], frequencies: [261.625565] }],
      },
      undefined,
      chain,
    );
    const session = engine.session,
      origin = session.start;
    await wait(origin + 0.1);
    chain.pedals[0].params.time = 5;
    chain.pedals[0].params.depth = 100;
    chain.pedals[0].params.rate = 1.25;
    engine.updateProcessing(processing, 'A');
    await wait(origin + 0.2);
    const retained =
      engine.session === session && engine.context === context && starts.length === 1;
    const graph = session.chains.get('audition');
    chain.pedals.push(makePedal('example:pedal/level'));
    engine.updateProcessing(processing, 'A');
    const queued =
      engine.processingPending(processing, 'A') && session.chains.get('audition') === graph;
    engine.switchAudition(sound, chain);
    await wait(origin + 0.45);
    const replaced =
      session.chains.get('audition') !== graph && engine.session === session && starts.length === 2;
    engine.stop();
    const cleanupDeadline = performance.now() + 5000;
    while (stops !== starts.length) {
      if (performance.now() > cleanupDeadline)
        throw new Error('Modulation source leaked after Stop');
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const stopped = engine.session === null && stops === starts.length;
    await context.close();
    return {
      retained,
      replaced,
      queued,
      stopped,
      origin,
      firstStart: starts[0],
      unchanged: source === JSON.stringify(project),
    };
  });
  expect(proof.firstStart).toBe(proof.origin);
  expect(proof.retained).toBe(true);
  expect(proof.replaced).toBe(true);
  expect(proof.queued).toBe(true);
  expect(proof.stopped).toBe(true);
  expect(proof.unchanged).toBe(true);
});
