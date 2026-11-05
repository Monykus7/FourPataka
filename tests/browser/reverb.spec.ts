import { expect, test } from '@playwright/test';

test('reverb retains anti-phase stereo energy and silent input generates no wet signal', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { reverbModule } = await import('/src/modules/pedals/' + 'reverb.ts');
    const { defaultModuleSettings } = await import('/src/modules/' + 'index.ts');
    const rows = [];
    for (const silent of [false, true]) {
      const rate = 48000,
        context = new OfflineAudioContext(2, rate, rate),
        source = context.createBufferSource(),
        buffer = context.createBuffer(2, rate / 4, rate);
      if (!silent)
        for (let i = 0; i < buffer.length; i++) {
          const v = 0.1 * Math.sin((2 * Math.PI * 317 * i) / rate);
          buffer.getChannelData(0)[i] = v;
          buffer.getChannelData(1)[i] = -v;
        }
      source.buffer = buffer;
      const processor = reverbModule.create(
        context,
        { ...defaultModuleSettings(reverbModule), mix: 100 },
        false,
        { sampleRate: rate, compressorLatency: 0, oversamplingLatency: 0 },
      );
      source.connect(processor.input);
      processor.output.connect(context.destination);
      source.start();
      const result = await context.startRendering();
      let peak = 0,
        cancellation = 0;
      for (let i = 0; i < result.length; i++) {
        const l = result.getChannelData(0)[i],
          r = result.getChannelData(1)[i];
        peak = Math.max(peak, Math.abs(l), Math.abs(r));
        cancellation = Math.max(cancellation, Math.abs(l + r));
      }
      processor.dispose();
      rows.push({ silent, peak, cancellation });
    }
    return rows;
  });
  expect(proof[0].peak).toBeGreaterThan(0.001);
  expect(proof[0].cancellation).toBe(0);
  expect(proof[1].peak).toBe(0);
});

test('reverb dry and bypass are unity; wet onset follows pre-delay and early reflection weights', async ({
  page,
}) => {
  await page.goto('/');
  const rows = await page.evaluate(async () => {
    const { reverbModule } = await import('/src/modules/pedals/' + 'reverb.ts');
    const { defaultModuleSettings } = await import('/src/modules/' + 'index.ts');
    const rows = [];
    for (const rate of [44100, 48000])
      for (const [mix, bypass] of [
        [0, false],
        [100, true],
        [100, false],
      ] as const) {
        const context = new OfflineAudioContext(2, Math.ceil(rate * 0.25), rate),
          source = context.createBufferSource();
        const buffer = context.createBuffer(2, 1, rate);
        buffer.getChannelData(0)[0] = 0.1;
        source.buffer = buffer;
        const p = { ...defaultModuleSettings(reverbModule), preDelay: 50, size: 100, mix };
        const processor = reverbModule.create(context, p, bypass, {
          sampleRate: rate,
          compressorLatency: 0,
          oversamplingLatency: 0,
        });
        source.connect(processor.input);
        processor.output.connect(context.destination);
        source.start();
        const result = await context.startRendering(),
          left = result.getChannelData(0),
          right = result.getChannelData(1);
        let peak = 0,
          leak = 0,
          error = 0;
        for (let i = 0; i < left.length; i++) {
          peak = Math.max(peak, Math.abs(left[i]));
          leak = Math.max(leak, Math.abs(right[i]));
          error = Math.max(error, Math.abs(left[i] - (i === 0 ? 0.1 : 0)));
        }
        const onset = left.findIndex((v) => Math.abs(v) > 1e-7) / rate;
        // The first tap has 25% early-field share and 50% tap weight. Linear
        // interpolation can split its impulse over two adjacent samples.
        const first = Math.floor(0.0537 * rate);
        let early = 0;
        for (let i = first - 1; i <= first + 2; i++) early += left[i];
        processor.dispose();
        processor.dispose();
        rows.push({ mix, bypass, peak, leak, error, onset, early });
      }
    return rows;
  });
  for (const row of rows) {
    expect(row.leak, JSON.stringify(row)).toBe(0);
    if (row.mix === 0 || row.bypass) expect(row.error).toBeLessThan(1e-6);
    else {
      expect(row.onset).toBeGreaterThanOrEqual(0.0536);
      expect(row.onset).toBeLessThan(0.0538);
      expect(row.early).toBeCloseTo(0.0125, 5);
      expect(row.peak).toBeLessThan(0.101);
    }
  }
});

test('reverb remains bounded and decays below its budget at supported rate and parameter extremes', async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto('/');
  const rows = await page.evaluate(async () => {
    const { reverbModule, reverbTail } = await import('/src/modules/pedals/' + 'reverb.ts');
    const { defaultModuleSettings } = await import('/src/modules/' + 'index.ts');
    const rows = [];
    for (const rate of [3000, 44100, 48000, 192000])
      for (const patch of [
        {},
        { preDelay: 100, decay: 10, size: 200, damping: 500, output: 12 },
        { preDelay: 0, decay: 0.1, size: 50, damping: 18000 },
      ]) {
        const p = { ...defaultModuleSettings(reverbModule), mix: 100, ...patch };
        const tail = reverbTail(p);
        const context = new OfflineAudioContext(1, Math.ceil((tail + 0.3) * rate), rate),
          source = context.createBufferSource(),
          buffer = context.createBuffer(1, Math.ceil(0.1 * rate), rate);
        buffer.getChannelData(0).fill(0.1);
        source.buffer = buffer;
        const processor = reverbModule.create(context, p, false, {
          sampleRate: rate,
          compressorLatency: 0,
          oversamplingLatency: 0,
        });
        source.connect(processor.input);
        processor.output.connect(context.destination);
        source.start();
        const data = (await context.startRendering()).getChannelData(0);
        let peak = 0,
          late = 0;
        for (let i = 0; i < data.length; i++) {
          if (!Number.isFinite(data[i])) throw new Error('Nonfinite reverb');
          peak = Math.max(peak, Math.abs(data[i]));
          if (i > (tail + 0.11) * rate) late = Math.max(late, Math.abs(data[i]));
        }
        processor.dispose();
        rows.push({ rate, peak, late });
      }
    return rows;
  });
  for (const row of rows) {
    expect(row.peak, JSON.stringify(row)).toBeLessThan(0.401);
    expect(row.late, JSON.stringify(row)).toBeLessThan(1e-6);
  }
});
