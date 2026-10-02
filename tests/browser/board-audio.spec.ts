import { expect, test } from '@playwright/test';
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
