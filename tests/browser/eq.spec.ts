import { expect, test } from '@playwright/test';

test('EQ joins the cable path with precise rotary controls and bounds', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page.getByRole('button', { name: 'Add EQ', exact: true }).click();
  const eq = page.locator('.pedal-module.eq');
  await expect(eq).toContainText('Three-band EQ');
  await expect(eq).toContainText('Shelves 200 Hz / 4 kHz');
  await expect(page.locator('.patch-cable')).toHaveCount(2);
  const low = eq.getByRole('spinbutton', { name: 'eq 1 low gain exact value', exact: true });
  const dial = eq.getByRole('slider', { name: 'eq 1 low gain dial', exact: true });
  await expect(low).toHaveValue('0');
  await dial.focus();
  await dial.press('ArrowUp');
  await expect(low).toHaveValue('0.5');
  await dial.press('End');
  await expect(low).toHaveValue('12');
  await dial.press('Home');
  await expect(low).toHaveValue('-12');
  await low.fill('99');
  await expect(low).toHaveValue('12');
  const frequency = eq.getByRole('spinbutton', { name: 'eq 1 mid frequency exact value' });
  await frequency.fill('9000');
  await expect(frequency).toHaveValue('4000');
  await page.getByRole('button', { name: 'Add overdrive', exact: true }).click();
  await page.getByRole('button', { name: 'Move eq 1 right', exact: true }).click();
  await expect(page.locator('.pedal-module').first()).toHaveClass(/overdrive/);
  await expect(page.locator('.patch-cable')).toHaveCount(3);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.pedal-module').first()).toHaveClass(/eq/);
});

test('EQ is flat at every mix and shapes the three bands at 48 and 44.1 kHz', async ({ page }) => {
  await page.goto('/');
  const proofs = await page.evaluate(async () => {
    const effectsPath = '/src/audio/effects.ts',
      pedalsPath = '/src/core/pedals.ts';
    const { createEffect, chainLatency } = await import(effectsPath);
    const { makePedal } = await import(pedalsPath);
    const results = [];
    for (const rate of [48000, 44100]) {
      const render = async (
        params: Record<string, number>,
        frequency: number,
        bypassed = false,
      ) => {
        const context = new OfflineAudioContext(1, Math.round(rate * 0.3), rate);
        const pedal = makePedal('eq');
        Object.assign(pedal.params, params);
        pedal.bypassed = bypassed;
        const effect = createEffect(context, pedal, 0.001, 0.006);
        const oscillator = context.createOscillator();
        oscillator.frequency.value = frequency;
        const level = context.createGain();
        level.gain.value = 0.05;
        oscillator.connect(level).connect(effect.input);
        effect.output.connect(context.destination);
        oscillator.start();
        oscillator.stop(0.2);
        const samples = (await context.startRendering()).getChannelData(0);
        const rms = Math.sqrt(
          samples
            .slice(Math.round(rate * 0.1), Math.round(rate * 0.2))
            .reduce((sum, v) => sum + v * v, 0) / Math.round(rate * 0.1),
        );
        const tail = Math.max(...samples.slice(Math.round(rate * 0.29)).map(Math.abs));
        const latency = effect.latency;
        effect.dispose();
        return { samples: Array.from(samples), rms, latency, tail };
      };
      const dry = await render({ mix: 0 }, 1000);
      const wet = await render({ mix: 100 }, 1000);
      const half = await render({ mix: 50 }, 1000);
      const low = await render({ low: 12 }, 40);
      const lowDry = await render({ mix: 0 }, 40);
      const mid = await render({ mid: -12, frequency: 2000 }, 2000);
      const midDry = await render({ mix: 0 }, 2000);
      const high = await render({ high: 12 }, 12000);
      const highDry = await render({ mix: 0 }, 12000);
      const bypass = await render({ low: 12, mid: -12, high: 12, output: 12 }, 1000, true);
      const blend = await render({ mid: 12, mix: 50 }, 1000);
      const boost = await render({ mid: 12 }, 1000);
      const error = (a: number[], b: number[]) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
      results.push({
        rate,
        flat: error(dry.samples, wet.samples),
        half: error(dry.samples, half.samples),
        bypass: error(dry.samples, bypass.samples),
        blend: error(
          blend.samples,
          dry.samples.map((v, i) => (v + boost.samples[i]) / 2),
        ),
        lowDb: 20 * Math.log10(low.rms / lowDry.rms),
        midDb: 20 * Math.log10(mid.rms / midDry.rms),
        highDb: 20 * Math.log10(high.rms / highDry.rms),
        latency: wet.latency,
        chainLatency: chainLatency(
          {
            pedals: [makePedal('eq'), makePedal('compressor'), makePedal('overdrive')],
            bypassed: false,
          },
          0.001,
          0.006,
        ),
        tail: Math.max(low.tail, mid.tail, high.tail),
      });
    }
    return results;
  });
  for (const p of proofs) {
    expect(p.flat, `flat EQ at ${p.rate}`).toBeLessThan(0.000001);
    expect(p.half).toBeLessThan(0.000001);
    expect(p.bypass).toBeLessThan(0.000001);
    expect(p.blend).toBeLessThan(0.000001);
    expect(p.lowDb).toBeGreaterThan(11.8);
    expect(p.midDb).toBeCloseTo(-12, 1);
    expect(p.highDb).toBeGreaterThan(11);
    expect(p.latency).toBe(0);
    expect(p.chainLatency).toBeCloseTo(0.007, 6);
    expect(p.tail).toBeLessThan(0.000001);
  }
});

test('EQ remains finite below its nominal high shelf and isolated across stereo chains', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const effectsPath = '/src/audio/effects.ts',
      pedalsPath = '/src/core/pedals.ts';
    const { createChain } = await import(effectsPath);
    const { makePedal } = await import(pedalsPath);
    const context = new OfflineAudioContext(2, 8000, 8000);
    const pedal = makePedal('eq');
    Object.assign(pedal.params, { low: 12, mid: 12, high: 12, frequency: 4000 });
    const left = createChain(context, { pedals: [pedal], bypassed: false });
    const right = createChain(context, { pedals: [structuredClone(pedal)], bypassed: false });
    const merger = context.createChannelMerger(2);
    left.output.connect(merger, 0, 0);
    right.output.connect(merger, 0, 1);
    merger.connect(context.destination);
    const source = context.createOscillator();
    source.frequency.value = 3000;
    source.connect(left.input);
    source.start();
    source.stop(0.2);
    const data = await context.startRendering();
    const result = {
      finite: Array.from(data.getChannelData(0)).every(Number.isFinite),
      peak: Math.max(...data.getChannelData(0).map(Math.abs)),
      isolated: Math.max(...data.getChannelData(1).map(Math.abs)),
      tail: Math.max(...data.getChannelData(0).slice(7200).map(Math.abs)),
    };
    left.dispose();
    right.dispose();
    return result;
  });
  expect(proof.finite).toBe(true);
  expect(proof.peak).toBeGreaterThan(1);
  expect(proof.isolated).toBe(0);
  expect(proof.tail).toBeLessThan(0.000001);
});
