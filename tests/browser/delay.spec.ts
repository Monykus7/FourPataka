import { expect, test } from '@playwright/test';

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
