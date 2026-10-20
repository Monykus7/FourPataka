import { expect, test } from '@playwright/test';

test('frozen chamber WAV matches body before nonlinear track pedals at both sample rates', async ({
  page,
}) => {
  await page.goto('/');
  const rows = await page.evaluate(async () => {
    const { createProject } = await import('/src/core/' + 'project.ts');
    const { makePedal, emptyChain } = await import('/src/core/' + 'pedals.ts');
    const { prepareExport, renderWav } = await import('/src/audio/' + 'export.ts');
    const { createChamber } = await import('/src/audio/' + 'chamber.ts');
    const { createVoice } = await import('/src/audio/' + 'voice.ts');
    const { createChain, measureOversamplingLatency, measureCompressorLatency } = await import(
      '/src/audio/' + 'effects.ts'
    );
    const { ACOUSTICS_DEFAULTS } = await import('/src/modules/foundation/' + 'acoustics.ts');
    const rows = [];
    for (const rate of [44100, 48000]) {
      const p = createProject();
      p.scoreText = 'tempo 120\ntrack body using saw {\n C4 eighth\n}';
      p.instruments.find((i: any) => i.key === 'saw')!.sound.acoustics = {
        ...ACOUSTICS_DEFAULTS,
        enabled: true,
        mix: 65,
      };
      const chain = emptyChain();
      chain.pedals = [makePedal('overdrive')];
      p.processing.tracks.body = chain;
      const options = {
        sampleRate: rate,
        channels: 1,
        bitDepth: 16,
        normalize: false,
        tailSeconds: 2,
      } as any;
      const drive = await measureOversamplingLatency(rate),
        comp = await measureCompressorLatency(rate);
      const plan = prepareExport(p, options, drive, comp),
        pending = renderWav(p, options);
      p.instruments.find((i: any) => i.key === 'saw')!.sound.acoustics!.mix = 0;
      const actual = await pending;
      const context = new OfflineAudioContext(1, plan.frames, rate),
        mix = context.createGain(),
        level = context.createGain();
      mix.gain.value = plan.snapshot.mixGain;
      mix.connect(context.destination);
      const track = plan.snapshot.tracks.find((t: any) => t.key === 'body')!;
      level.gain.value = track.level;
      level.connect(mix);
      const pedals = createChain(context, plan.snapshot.processing.tracks.body, drive, comp);
      const body = createChamber(context, track.sound.acoustics);
      body.output.connect(pedals.input);
      pedals.output.connect(level);
      const voice = createVoice(
        context,
        body.input,
        track.sound,
        plan.score.events[0].frequencies[0],
        0,
        0.25,
      );
      const expected = (await context.startRendering()).getChannelData(0),
        data = actual.buffer.getChannelData(0);
      let error = 0;
      for (let i = 0; i < data.length; i++)
        error = Math.max(error, Math.abs(data[i] - expected[i]));
      rows.push({
        error,
        capped: actual.capped,
        tail: plan.estimatedTail,
        capWarns: prepareExport(plan.snapshot, { ...options, tailSeconds: 0 }, drive, comp).capped,
      });
      voice.dispose();
      body.dispose();
      pedals.dispose();
    }
    return rows;
  });
  for (const row of rows) {
    expect(row.error).toBeLessThan(0.000001);
    expect(row.capped).toBe(false);
    expect(row.tail).toBeGreaterThanOrEqual(1.3);
    expect(row.capWarns).toBe(true);
  }
});

test('live body edits and independent A/B branches retain the clock and Stop owns cleanup', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { AudioEngine } = await import('/src/audio/' + 'engine.ts');
    const { createProject } = await import('/src/core/' + 'project.ts');
    const { emptyChain } = await import('/src/core/' + 'pedals.ts');
    const { ACOUSTICS_DEFAULTS } = await import('/src/modules/foundation/' + 'acoustics.ts');
    const engine = new AudioEngine() as any;
    await engine.ready();
    engine.monitor.gain.value = 0;
    const p = createProject(),
      sound = structuredClone(p.comparison.A);
    sound.acoustics = { ...ACOUSTICS_DEFAULTS, enabled: true };
    const original = JSON.stringify(p);
    await engine.auditionPhrase(
      sound,
      {
        tempo: 60,
        beats: 2,
        events: [{ beat: 0, duration: 2, notes: [], frequencies: [261.625565] }],
      },
      undefined,
      emptyChain(),
    );
    const session = engine.session,
      origin = session.start,
      first = session.chambers.get('audition'),
      voice = session.voices[0];
    let stops = 0;
    const wrap = (body: any) => {
      const dispose = body.dispose.bind(body);
      body.dispose = () => {
        stops++;
        dispose();
      };
    };
    wrap(first);
    const wait = async (at: number) => {
      const until = performance.now() + 5000;
      while (engine.context.currentTime < at) {
        if (performance.now() > until) throw new Error('Audio clock stalled');
        await new Promise((r) => setTimeout(r, 20));
      }
    };
    await wait(origin + 0.1);
    sound.acoustics.size = 8;
    sound.acoustics.decay = 600;
    engine.updateAudition(sound);
    const retained =
      engine.session === session &&
      session.chambers.get('audition') === first &&
      session.voices[0] === voice;
    const b = structuredClone(sound);
    b.acoustics.mix = 80;
    engine.switchAudition(b, emptyChain());
    const second = session.chambers.get('audition');
    wrap(second);
    await wait(origin + 0.3);
    const independent =
      first !== second &&
      engine.session === session &&
      session.start === origin &&
      session.processingTail >= 1.3;
    engine.stop();
    await new Promise((r) => setTimeout(r, 100));
    const ended = engine.session === null;
    await engine.context.close();
    return { retained, independent, ended, stops, unchanged: JSON.stringify(p) === original };
  });
  expect(proof).toEqual({
    retained: true,
    independent: true,
    ended: true,
    stops: 2,
    unchanged: true,
  });
});

test('score comparison replaces only the selected body branch and preserves frozen applied copies', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { AudioEngine } = await import('/src/audio/' + 'engine.ts');
    const { createProject, reconcileTracks } = await import('/src/core/' + 'project.ts');
    const { parseScore } = await import('/src/core/' + 'parser.ts');
    const { ACOUSTICS_DEFAULTS } = await import('/src/modules/foundation/' + 'acoustics.ts');
    let p = createProject();
    p.scoreText =
      'tempo 60\ntrack body using saw {\n C4 whole\n}\ntrack other using sine {\n E4 whole\n}';
    const score = parseScore(
      p.scoreText,
      p.instruments.map((i: any) => i.key),
    );
    p = reconcileTracks(p, score);
    const original = JSON.stringify(p),
      engine = new AudioEngine() as any;
    await engine.ready();
    engine.monitor.gain.value = 0;
    await engine.play(score, p.tracks, p.processing);
    const session = engine.session,
      origin = session.start,
      body = session.chambers.get('body'),
      other = session.chambers.get('other');
    let replaced = 0;
    const replace = body.replace.bind(body);
    body.replace = (s: any) => {
      replaced++;
      replace(s);
    };
    const sound = structuredClone(p.tracks.find((t: any) => t.key === 'body')!.sound);
    sound.acoustics = { ...ACOUSTICS_DEFAULTS, enabled: true };
    engine.updateScoreComparison(sound, 'body', 'A');
    sound.acoustics.mix = 70;
    engine.updateScoreComparison(sound, 'body', 'A');
    engine.updateScoreComparison(sound, 'body', 'B');
    const retained =
      engine.session === session &&
      session.start === origin &&
      session.chambers.get('other') === other &&
      session.processingTail >= 1.3;
    engine.stop();
    await new Promise((r) => setTimeout(r, 100));
    await engine.context.close();
    return { replaced, retained, unchanged: JSON.stringify(p) === original };
  });
  expect(proof).toEqual({ replaced: 2, retained: true, unchanged: true });
});

test('body branch retirement follows audio time while the device is suspended', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { createChamber } = await import('/src/audio/' + 'chamber.ts');
    const { ACOUSTICS_DEFAULTS } = await import('/src/modules/foundation/' + 'acoustics.ts');
    const context = new AudioContext();
    await context.suspend();
    let created = 0,
      disconnected = 0;
    for (const key of ['createGain', 'createDelay', 'createBiquadFilter'] as const) {
      const make = context[key].bind(context) as (...args: any[]) => AudioNode;
      (context as any)[key] = (...args: any[]) => {
        const node = make(...args),
          disconnect = node.disconnect.bind(node);
        created++;
        node.disconnect = ((...args: any[]) => {
          if (!args.length) disconnected++;
          (disconnect as any)(...args);
        }) as typeof node.disconnect;
        return node;
      };
    }
    const body = createChamber(context, { ...ACOUSTICS_DEFAULTS, enabled: true });
    body.output.connect(context.destination);
    body.replace({ ...ACOUSTICS_DEFAULTS, enabled: true, size: 8 });
    await new Promise((r) => setTimeout(r, 100));
    const retained = disconnected === 0;
    await context.resume();
    const deadline = performance.now() + 5000;
    while (context.currentTime < 0.15) {
      if (performance.now() > deadline) throw new Error('Audio clock stalled');
      await new Promise((r) => setTimeout(r, 20));
    }
    const retired = disconnected === 23;
    body.dispose();
    body.dispose();
    await context.close();
    return { retained, retired, created, disconnected };
  });
  expect(proof.retained).toBe(true);
  expect(proof.retired).toBe(true);
  expect(proof.created).toBe(48);
  expect(proof.disconnected).toBe(48);
});
