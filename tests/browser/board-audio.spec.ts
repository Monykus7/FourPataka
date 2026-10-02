import { expect, test } from '@playwright/test';

test('live audition follows routed IDs, ignores placement and off-path edits, and freezes repatching until replay', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const enginePath = '/src/audio/engine.ts',
      pedalsPath = '/src/core/pedals.ts',
      boardPath = '/src/core/board.ts',
      musicPath = '/src/core/music.ts';
    const { AudioEngine } = await import(enginePath),
      { makePedal, defaultProcessing } = await import(pedalsPath),
      { boardLayout } = await import(boardPath),
      { mathematicalPreset } = await import(musicPath);
    const processing = defaultProcessing(),
      unused = makePedal('overdrive'),
      eq = makePedal('eq');
    eq.params.frequency = 440;
    const chain = processing.audition.A;
    chain.pedals = [unused, eq];
    chain.board = {
      positions: boardLayout(chain).positions,
      cables: [
        { id: 'in', from: null, to: eq.id },
        { id: 'out', from: eq.id, to: null },
      ],
    };
    const engine = new AudioEngine();
    engine.setMonitor(0);
    engine.setMix(1);
    const sound = mathematicalPreset('sine'),
      phrase = {
        tempo: 60,
        beats: 16,
        events: [{ beat: 0, duration: 16, notes: ['A4'], frequencies: [440] }],
      };
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    await engine.auditionPhrase(sound, phrase, undefined, chain);
    const deadline = performance.now() + 5000;
    while (engine.measure().peak < 0.001 && performance.now() < deadline) await wait(25);
    await wait(100);
    const baseline = engine.measure().peak,
      before = engine.progress;
    chain.board.positions[eq.id] = { column: 3, row: 1 };
    unused.params.drive = 24;
    engine.updateProcessing(processing, 'A');
    const visualPending = engine.processingPending(processing, 'A');
    eq.params.mid = -12;
    engine.updateProcessing(processing, 'A');
    await wait(250);
    const cut = engine.measure().peak,
      parameterPending = engine.processingPending(processing, 'A');
    chain.board.cables = [];
    engine.updateProcessing(processing, 'A');
    await wait(150);
    const routingPending = engine.processingPending(processing, 'A'),
      retained = engine.measure().peak,
      after = engine.progress;
    chain.bypassed = true;
    engine.updateProcessing(processing, 'A');
    await wait(200);
    const bypass = engine.measure().peak;
    engine.stop();
    await wait(100);
    chain.bypassed = false;
    await engine.auditionPhrase(sound, phrase, undefined, chain);
    await wait(200);
    const unplugged = engine.measure().peak;
    engine.stop();
    await wait(70);
    await engine.context!.close();
    return {
      baseline,
      before,
      after,
      visualPending,
      parameterPending,
      routingPending,
      cut,
      retained,
      bypass,
      unplugged,
    };
  });
  expect(proof.baseline).toBeGreaterThan(0.05);
  expect(proof.visualPending).toBe(false);
  expect(proof.parameterPending).toBe(false);
  expect(proof.cut).toBeLessThan(proof.baseline * 0.4);
  expect(proof.routingPending).toBe(true);
  expect(proof.retained).toBeCloseTo(proof.cut, 3);
  expect(proof.after).toBeGreaterThan(proof.before);
  expect(proof.bypass).toBeGreaterThan(proof.baseline * 0.9);
  expect(proof.unplugged).toBeLessThan(0.00001);
});
test('patch cables select the actual audio order and unplugged outputs are silent', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const effectsPath = '/src/audio/effects.ts',
      pedalsPath = '/src/core/pedals.ts',
      boardPath = '/src/core/board.ts';
    const { createChain, measureOversamplingLatency } = await import(effectsPath),
      { makePedal } = await import(pedalsPath),
      { boardLayout } = await import(boardPath);
    const rate = 48000,
      oversampling = await measureOversamplingLatency(rate);
    const eq = makePedal('eq'),
      drive = makePedal('overdrive');
    eq.params.mid = 12;
    eq.params.frequency = 440;
    drive.params.drive = 18;
    const render = async (wired: boolean, reverse = false, bypass = false, legacy = false) => {
      const c = new OfflineAudioContext(1, 16000, rate);
      const chain = { pedals: [eq, drive], bypassed: bypass } as any;
      if (!legacy)
        chain.board = {
          positions: boardLayout(chain).positions,
          cables: wired
            ? [
                { id: 'a', from: null, to: reverse ? drive.id : eq.id },
                { id: 'b', from: reverse ? drive.id : eq.id, to: reverse ? eq.id : drive.id },
                { id: 'c', from: reverse ? eq.id : drive.id, to: null },
              ]
            : [],
        };
      const graph = createChain(c, chain, oversampling);
      const oscillator = c.createOscillator();
      oscillator.frequency.value = 440;
      const gain = c.createGain();
      gain.gain.value = 0.1;
      oscillator.connect(gain).connect(graph.input);
      graph.output.connect(c.destination);
      oscillator.start();
      oscillator.stop(0.2);
      const values = Array.from((await c.startRendering()).getChannelData(0).slice(4800, 9600));
      graph.dispose();
      return values;
    };
    const forward = await render(true),
      old = await render(true, false, false, true),
      reverse = await render(true, true),
      unplugged = await render(false),
      bypass = await render(false, false, true);
    const error = (a: number[], b: number[]) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    return {
      migration: error(forward, old),
      difference: error(forward, reverse),
      unplugged: Math.max(...unplugged.map(Math.abs)),
      bypass: Math.max(...bypass.map(Math.abs)),
    };
  });
  expect(proof.migration).toBeLessThan(0.000001);
  expect(proof.difference).toBeGreaterThan(0.02);
  expect(proof.unplugged).toBe(0);
  expect(proof.bypass).toBeGreaterThan(0.09);
});
