import { expect, test } from '@playwright/test';

test('compressor unity mix stays aligned at 48 and 44.1 kHz', async ({ page }) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const effectsPath = '/src/audio/effects.ts',
      pedalsPath = '/src/core/pedals.ts';
    const { createEffect, measureOversamplingLatency, measureCompressorLatency } = await import(
      effectsPath
    );
    const { makePedal } = await import(pedalsPath);
    const render = async (kind: 'compressor' | 'overdrive', mix: number, rate: number) => {
      const c = new OfflineAudioContext(1, rate / 5, rate);
      const p = makePedal(kind);
      p.params.output = 0;
      p.params.mix = mix;
      if (kind === 'compressor') {
        p.params.ratio = 1;
        p.params.threshold = 0;
      } else {
        p.params.drive = 0;
        p.params.tone = 16000;
      }
      const effect = createEffect(
        c,
        p,
        await measureOversamplingLatency(rate),
        await measureCompressorLatency(rate),
      );
      effect.output.connect(c.destination);
      const oscillator = c.createOscillator();
      oscillator.frequency.value = 2000;
      const gain = c.createGain();
      gain.gain.value = kind === 'overdrive' ? 0.01 : 0.1;
      oscillator.connect(gain).connect(effect.input);
      oscillator.start();
      oscillator.stop(0.18);
      const result = (await c.startRendering()).getChannelData(0);
      return Array.from(result.slice(Math.round(rate * 0.05), Math.round(rate * 0.15)));
    };
    const results = [];
    for (const rate of [48000, 44100]) {
      const dry = await render('compressor', 0, rate),
        wet = await render('compressor', 100, rate),
        mixed = await render('compressor', 50, rate);
      results.push({
        rate,
        error: Math.max(...dry.map((v, i) => Math.abs(v - wet[i]))),
        mixError: Math.max(...mixed.map((v, i) => Math.abs(v - (dry[i] + wet[i]) / 2))),
      });
    }
    return results;
  });
  proof.forEach((p) => {
    expect(p.error, `identity alignment at ${p.rate}`).toBeLessThan(0.002);
    expect(p.mixError).toBeLessThan(0.00001);
  });
});

test('overdrive mixes linearly, preserves peaks above 1 when bypassed, and isolates chain state', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const effectsPath = '/src/audio/effects.ts',
      pedalsPath = '/src/core/pedals.ts';
    const { createChain, measureOversamplingLatency, measureCompressorLatency } = await import(
      effectsPath
    );
    const { makePedal } = await import(pedalsPath);
    const rate = 48000,
      oversampling = await measureOversamplingLatency(rate),
      compressor = await measureCompressorLatency(rate);
    const render = async (mix: number, bypassed = false) => {
      const context = new OfflineAudioContext(2, 24000, rate);
      const p = makePedal('overdrive');
      p.params.mix = mix;
      p.params.drive = 18;
      p.params.output = 0;
      const chain = createChain(context, { pedals: [p], bypassed }, oversampling, compressor);
      const unrelated = createChain(
        context,
        { pedals: [structuredClone(p)], bypassed: false },
        oversampling,
        compressor,
      );
      const merger = context.createChannelMerger(2);
      chain.output.connect(merger, 0, 0);
      unrelated.output.connect(merger, 0, 1);
      merger.connect(context.destination);
      const oscillator = context.createOscillator();
      oscillator.frequency.value = 440;
      const gain = context.createGain();
      gain.gain.value = 1.5;
      oscillator.connect(gain).connect(chain.input);
      oscillator.start();
      oscillator.stop(0.2);
      const result = await context.startRendering();
      return {
        samples: Array.from(result.getChannelData(0)),
        unrelated: Math.max(...Array.from(result.getChannelData(1), Math.abs)),
      };
    };
    const dry = await render(0),
      wet = await render(100),
      mixed = await render(50),
      bypass = await render(100, true);
    const common = (a: number[], b: number[]) =>
      Math.max(...a.slice(2400, 8000).map((v, i) => Math.abs(v - b[i + 2400])));
    return {
      oversampling,
      identity: common(dry.samples, bypass.samples),
      blend: common(
        mixed.samples,
        dry.samples.map((v, i) => (v + wet.samples[i]) / 2),
      ),
      peak: Math.max(...bypass.samples),
      isolated: wet.unrelated,
      tail: Math.max(...wet.samples.slice(20000).map(Math.abs)),
      effect: common(dry.samples, wet.samples),
    };
  });
  expect(proof.oversampling).toBeGreaterThanOrEqual(0);
  expect(proof.identity).toBeLessThan(0.00001);
  expect(proof.blend).toBeLessThan(0.00001);
  expect(proof.peak).toBeGreaterThan(1.49);
  expect(proof.isolated).toBe(0);
  expect(proof.effect).toBeGreaterThan(0.1);
  expect(proof.tail).toBeLessThan(0.00001);
});
