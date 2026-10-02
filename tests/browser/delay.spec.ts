import { expect, test } from '@playwright/test';

test('live delay edits extend audition cleanup, bypass reports tails, and Stop clears replay', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const enginePath = '/src/audio/engine.ts',
      pedalsPath = '/src/core/pedals.ts',
      musicPath = '/src/core/music.ts';
    const { AudioEngine } = await import(enginePath);
    const { makePedal, defaultProcessing } = await import(pedalsPath);
    const { mathematicalPreset } = await import(musicPath);
    const engine = new AudioEngine(),
      processing = defaultProcessing(),
      pedal = makePedal('delay');
    engine.setMonitor(0);
    engine.setMix(1);
    pedal.params = { time: 100, feedback: 0, output: 0, mix: 100 };
    processing.audition.A.pedals = [pedal];
    const sound = mathematicalPreset('sine');
    sound.attack = 0.005;
    sound.release = 0.01;
    const phrase = {
      tempo: 60,
      beats: 0.08,
      events: [{ beat: 0, duration: 0.08, notes: ['A4'], frequencies: [440] }],
    };
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const until = async (seconds: number) => {
      const deadline = performance.now() + 5000;
      while (engine.progress < seconds && engine.mode && performance.now() < deadline)
        await wait(20);
    };
    await engine.auditionPhrase(sound, phrase, undefined, processing.audition.A);
    await until(0.04);
    pedal.params.time = 400;
    pedal.params.feedback = 40;
    engine.updateProcessing(processing, 'A');
    await until(0.2);
    pedal.bypassed = true;
    engine.updateProcessing(processing, 'A');
    const active = engine.activeTails('audition').includes(pedal.id);
    await until(0.49);
    const sustained = engine.measure().peak,
      mode = engine.mode,
      progress = engine.progress;
    engine.stop();
    await wait(120);
    const values = new Float32Array(engine.analyser!.fftSize);
    engine.analyser!.getFloatTimeDomainData(values);
    const stopped = Math.max(...values.map(Math.abs)),
      stoppedTails = engine.activeTails('audition');
    // An empty phrase reuses settings but must never reuse the previous buffers.
    await engine.auditionPhrase(
      sound,
      { tempo: 60, beats: 0.8, events: [] },
      undefined,
      processing.audition.A,
    );
    await until(0.5);
    const fresh = engine.measure().peak,
      freshTails = engine.activeTails('audition');
    engine.stop();
    await wait(60);
    await engine.context!.close();
    return { active, sustained, mode, progress, stopped, stoppedTails, fresh, freshTails };
  });
  expect(proof.active).toBe(true);
  expect(proof.mode).toBe('audition');
  expect(proof.progress).toBeGreaterThan(0.35);
  expect(proof.sustained).toBeGreaterThan(0.01);
  expect(proof.stopped).toBeLessThan(0.00001);
  expect(proof.stoppedTails).toEqual([]);
  expect(proof.fresh).toBe(0);
  expect(proof.freshTails).toEqual([]);
});

test('delay impulse has deliberate echo timing, bounded feedback and independent buffers', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const effectsPath = '/src/audio/effects.ts',
      pedalsPath = '/src/core/pedals.ts';
    const { createChain, chainLatency } = await import(effectsPath);
    const { makePedal } = await import(pedalsPath);
    const results = [];
    for (const rate of [44100, 48000]) {
      const context = new OfflineAudioContext(2, rate, rate);
      const pedal = makePedal('delay');
      pedal.params = { time: 100, feedback: 50, output: 0, mix: 100 };
      const chain = { pedals: [pedal], bypassed: false };
      const left = createChain(context, chain),
        right = createChain(context, structuredClone(chain));
      const merger = context.createChannelMerger(2);
      left.output.connect(merger, 0, 0);
      right.output.connect(merger, 0, 1);
      merger.connect(context.destination);
      const source = context.createBufferSource();
      source.buffer = context.createBuffer(1, rate, rate);
      source.buffer.getChannelData(0)[Math.round(rate * 0.02)] = 1;
      source.connect(left.input);
      source.start();
      const data = await context.startRendering();
      const samples = data.getChannelData(0);
      const peak = (at: number) =>
        Math.max(
          ...samples.slice(Math.round(rate * at) - 4, Math.round(rate * at) + 5).map(Math.abs),
        );
      results.push({
        first: peak(0.12),
        second: peak(0.22),
        third: peak(0.32),
        dry: peak(0.02),
        silent: Math.max(...data.getChannelData(1).map(Math.abs)),
        latency: chainLatency(chain, 0.002),
        tail: left.tail,
      });
      left.dispose();
      right.dispose();
    }
    return results;
  });
  for (const p of proof) {
    expect(p.first).toBeCloseTo(1, 4);
    expect(p.second).toBeCloseTo(0.5, 4);
    expect(p.third).toBeCloseTo(0.25, 4);
    expect(p.dry).toBe(0);
    expect(p.silent).toBe(0);
    expect(p.latency).toBe(0);
    expect(p.tail).toBeCloseTo(1.1, 6);
  }
});

test('pedal and whole-chain delay bypass pass new input dry while stored echoes finish', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const effectsPath = '/src/audio/effects.ts',
      pedalsPath = '/src/core/pedals.ts';
    const { createChain } = await import(effectsPath);
    const { makePedal } = await import(pedalsPath);
    const results = [];
    for (const wholeChain of [false, true]) {
      const rate = 48000,
        context = new OfflineAudioContext(1, rate, rate);
      const pedal = makePedal('delay');
      pedal.params = { time: 100, feedback: 50, output: 0, mix: 100 };
      const chain = { pedals: [pedal], bypassed: false };
      const graph = createChain(context, chain);
      graph.output.connect(context.destination);
      const source = context.createBufferSource();
      source.buffer = context.createBuffer(1, rate, rate);
      const input = source.buffer.getChannelData(0);
      input[Math.round(rate * 0.02)] = 1;
      input[Math.round(rate * 0.4)] = 1;
      source.connect(graph.input);
      source.start();
      const suspended = context.suspend(0.16);
      const rendered = context.startRendering();
      await suspended;
      if (wholeChain) chain.bypassed = true;
      else pedal.bypassed = true;
      graph.update(chain, true);
      await context.resume();
      const samples = (await rendered).getChannelData(0);
      const peak = (at: number) =>
        Math.max(
          ...samples.slice(Math.round(rate * at) - 4, Math.round(rate * at) + 5).map(Math.abs),
        );
      results.push({
        old: peak(0.22),
        decay: peak(0.32),
        newDry: peak(0.4),
        newEcho: peak(0.5),
        later: peak(0.52),
      });
      graph.dispose();
    }
    return results;
  });
  for (const p of proof) {
    expect(p.old).toBeCloseTo(0.5, 4);
    expect(p.decay).toBeCloseTo(0.25, 4);
    expect(p.newDry).toBeCloseTo(1, 4);
    expect(p.newEcho).toBeLessThan(0.000001);
    expect(p.later).toBeCloseTo(0.0625, 4);
  }
});
