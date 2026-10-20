import { expect, test } from '@playwright/test';

test('chorus zero depth gives one correctly scaled musical delay, with dry and bypass identity', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { chorusModule } = await import('/src/modules/pedals/' + 'chorus.ts');
    const { defaultModuleSettings } = await import('/src/modules/' + 'index.ts');
    const rows = [];
    for (const rate of [44100, 48000])
      for (const [mix, bypassed] of [
        [100, false],
        [0, false],
        [100, true],
      ] as const) {
        const context = new OfflineAudioContext(1, rate / 10, rate),
          source = context.createBufferSource();
        const buffer = context.createBuffer(1, 1, rate);
        buffer.getChannelData(0)[0] = 0.1;
        source.buffer = buffer;
        const p = { ...defaultModuleSettings(chorusModule), time: 10, depth: 0, mix };
        const processor = chorusModule.create(context, p, bypassed, {
          sampleRate: rate,
          oversamplingLatency: 0,
          compressorLatency: 0,
        });
        source.connect(processor.input);
        processor.output.connect(context.destination);
        source.start();
        const data = (await context.startRendering()).getChannelData(0),
          index = mix === 100 && !bypassed ? rate / 100 : 0;
        let error = 0;
        for (let i = 0; i < data.length; i++)
          error = Math.max(error, Math.abs(data[i] - (i === index ? 0.1 : 0)));
        rows.push({ rate, mix, bypassed, error });
        processor.dispose();
        processor.dispose();
      }
    return rows;
  });
  for (const row of proof) expect(row.error, JSON.stringify(row)).toBeLessThan(0.000001);
});

test('opposed chorus voices follow an independent variable-delay formula and preserve channel separation', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { chorusModule } = await import('/src/modules/pedals/' + 'chorus.ts');
    const { defaultModuleSettings } = await import('/src/modules/' + 'index.ts');
    const rows = [];
    for (const rate of [44100, 48000]) {
      const context = new OfflineAudioContext(2, rate, rate),
        source = context.createBufferSource(),
        buffer = context.createBuffer(2, rate, rate);
      for (let i = 0; i < rate; i++) {
        buffer.getChannelData(0)[i] = 0.1 * Math.sin((2 * Math.PI * 220 * i) / rate);
        buffer.getChannelData(1)[i] = -0.07;
      }
      source.buffer = buffer;
      const processor = chorusModule.create(
        context,
        { ...defaultModuleSettings(chorusModule), mix: 100 },
        false,
        { sampleRate: rate, oversamplingLatency: 0, compressorLatency: 0 },
      );
      source.connect(processor.input);
      processor.output.connect(context.destination);
      source.start();
      const rendered = await context.startRendering(),
        left = rendered.getChannelData(0),
        right = rendered.getChannelData(1);
      let error = 0,
        rightError = 0,
        variation = 0;
      for (let i = Math.ceil(rate * 0.1); i < rate; i++) {
        const t = i / rate,
          excursion = 0.003 * Math.sin(2 * Math.PI * 0.8 * t);
        const expected =
          0.05 *
          (Math.sin(2 * Math.PI * 220 * (t - 0.015 - excursion)) +
            Math.sin(2 * Math.PI * 220 * (t - 0.015 + excursion)));
        error = Math.max(error, Math.abs(left[i] - expected));
        rightError = Math.max(rightError, Math.abs(right[i] + 0.07));
        variation = Math.max(
          variation,
          Math.abs(left[i] - 0.1 * Math.sin(2 * Math.PI * 220 * (t - 0.015))),
        );
      }
      processor.dispose();
      rows.push({ rate, error, rightError, variation });
    }
    return rows;
  });
  for (const row of proof) {
    expect(row.error, JSON.stringify(row)).toBeLessThan(0.003);
    expect(row.rightError).toBeLessThan(0.000001);
    expect(row.variation).toBeGreaterThan(0.05);
  }
});

test('chorus stays finite and drains within its declared tail at default and extreme settings', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { chorusModule } = await import('/src/modules/pedals/' + 'chorus.ts');
    const { defaultModuleSettings } = await import('/src/modules/' + 'index.ts');
    const rows = [];
    for (const rate of [3000, 44100, 48000, 192000])
      for (const patch of [
        {},
        { rate: 5, time: 5, depth: 100, mix: 100, output: 12 },
        { rate: 0.05, time: 30, depth: 100, mix: 100 },
      ]) {
        const context = new OfflineAudioContext(1, Math.ceil(rate * 0.2), rate),
          source = context.createBufferSource(),
          buffer = context.createBuffer(1, Math.ceil(rate * 0.1), rate);
        let seed = 7;
        for (let i = 0; i < buffer.length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
          buffer.getChannelData(0)[i] = (seed / 2147483648) * 0.1;
        }
        source.buffer = buffer;
        const processor = chorusModule.create(
          context,
          { ...defaultModuleSettings(chorusModule), ...patch },
          false,
          { sampleRate: rate, oversamplingLatency: 0, compressorLatency: 0 },
        );
        source.connect(processor.input);
        processor.output.connect(context.destination);
        source.start();
        const data = (await context.startRendering()).getChannelData(0);
        let peak = 0,
          end = 0;
        for (let i = 0; i < data.length; i++) {
          peak = Math.max(peak, Math.abs(data[i]));
          if (i > rate * 0.151) end = Math.max(end, Math.abs(data[i]));
        }
        processor.dispose();
        processor.dispose();
        rows.push({ rate, patch, finite: data.every(Number.isFinite), peak, end });
      }
    return rows;
  });
  for (const row of proof) {
    expect(row.finite).toBe(true);
    expect(row.peak, JSON.stringify(row)).toBeLessThan(0.401);
    expect(row.end, JSON.stringify(row)).toBe(0);
  }
});
