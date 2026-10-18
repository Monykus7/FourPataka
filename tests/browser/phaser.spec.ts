import { expect, test } from '@playwright/test';

test('phaser static notches follow the independent bilinear all-pass formula at both sample rates', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { phaserModule } = await import('/src/modules/pedals/' + 'phaser.ts');
    const { defaultModuleSettings } = await import('/src/modules/' + 'index.ts');
    const rows = [];
    for (const rate of [44100, 48000])
      for (const stages of [4, 6, 8]) {
        // Lowest notch is an analytic first-order cascade zero, not another render of the implementation.
        const frequency =
          (rate / Math.PI) *
          Math.atan(Math.tan((Math.PI * 1000) / rate) * Math.tan(Math.PI / (2 * stages)));
        const context = new OfflineAudioContext(1, rate / 2, rate);
        const source = context.createOscillator();
        source.frequency.value = frequency;
        const settings = {
          ...defaultModuleSettings(phaserModule),
          stages,
          frequency: 1000,
          depth: 0,
          feedback: 0,
          mix: 50,
        };
        const processor = phaserModule.create(context, settings, false, {
          sampleRate: rate,
          oversamplingLatency: 0,
          compressorLatency: 0,
        });
        source.connect(processor.input);
        processor.output.connect(context.destination);
        source.start();
        const data = (await context.startRendering()).getChannelData(0);
        let residual = 0;
        for (let i = rate / 4; i < data.length; i++)
          residual = Math.max(residual, Math.abs(data[i]));
        processor.dispose();
        source.disconnect();
        rows.push({ rate, stages, residual });
      }
    return rows;
  });
  for (const row of result)
    expect(row.residual, `${row.rate}/${row.stages} static notch`).toBeLessThan(0.0001);
});

test('phaser sweep moves notches and bounds feedback tails at supported rate extrema', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { phaserModule } = await import('/src/modules/pedals/' + 'phaser.ts');
    const { defaultModuleSettings } = await import('/src/modules/' + 'index.ts');
    const rows = [];
    for (const rate of [3000, 44100, 48000, 192000]) {
      const context = new OfflineAudioContext(1, Math.ceil(rate * 6.3), rate);
      const source = context.createBufferSource(),
        buffer = context.createBuffer(1, Math.ceil(rate * 0.25), rate);
      // Deterministic broadband excitation tests every pole, rather than one convenient note.
      let seed = 7;
      for (let i = 0; i < buffer.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
        buffer.getChannelData(0)[i] = (seed / 2147483648) * 0.1;
      }
      source.buffer = buffer;
      const settings = {
        ...defaultModuleSettings(phaserModule),
        rate: 5,
        frequency: 100,
        depth: 100,
        stages: 8,
        feedback: 85,
        mix: 100,
      };
      const processor = phaserModule.create(context, settings, false, {
        sampleRate: rate,
        oversamplingLatency: 0,
        compressorLatency: 0,
      });
      source.connect(processor.input);
      processor.output.connect(context.destination);
      source.start();
      const data = (await context.startRendering()).getChannelData(0);
      let peak = 0,
        end = 0;
      for (let i = 0; i < data.length; i++) {
        peak = Math.max(peak, Math.abs(data[i]));
        if (i > rate * 6.2) end = Math.max(end, Math.abs(data[i]));
      }
      rows.push({ rate, finite: data.every(Number.isFinite), peak, end });
      processor.dispose();
      processor.dispose();
    }
    const context = new OfflineAudioContext(1, 48000, 48000),
      source = context.createOscillator();
    source.frequency.value = 800;
    const p = phaserModule.create(
      context,
      { ...defaultModuleSettings(phaserModule), rate: 1, frequency: 800, depth: 100, feedback: 0 },
      false,
      { sampleRate: 48000, oversamplingLatency: 0, compressorLatency: 0 },
    );
    source.connect(p.input);
    p.output.connect(context.destination);
    source.start();
    const data = (await context.startRendering()).getChannelData(0);
    const windows = [0.225, 0.475, 0.725, 0.925].map((t) => {
      let power = 0;
      for (let i = Math.floor(t * 48000); i < Math.floor(t * 48000) + 2400; i++)
        power += data[i] * data[i];
      return Math.sqrt(power / 2400);
    });
    p.dispose();
    return { rows, windows };
  });
  for (const row of result.rows) {
    expect(row.finite).toBe(true);
    expect(row.peak).toBeLessThan(0.5);
    expect(row.end, `tail at ${row.rate}`).toBeLessThan(0.0001);
  }
  expect(Math.max(...result.windows) - Math.min(...result.windows)).toBeGreaterThan(0.1);
});

test('late-created phaser retains session-relative LFO phase and disposes its oscillator exactly once', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { phaserModule } = await import('/src/modules/pedals/' + 'phaser.ts');
    const { defaultModuleSettings } = await import('/src/modules/' + 'index.ts');
    const context = new OfflineAudioContext(2, 48000, 48000),
      source = context.createOscillator(),
      merger = context.createChannelMerger(2);
    source.frequency.value = 733;
    const environment = {
      sampleRate: 48000,
      oversamplingLatency: 0,
      compressorLatency: 0,
      timeOrigin: 0.1,
    };
    const settings = { ...defaultModuleSettings(phaserModule), feedback: 0, rate: 1.3, depth: 80 };
    const first = phaserModule.create(context, settings, false, environment);
    source.connect(first.input);
    first.output.connect(merger, 0, 0);
    merger.connect(context.destination);
    source.start();
    const suspension = context.suspend(0.5);
    const rendering = context.startRendering();
    await suspension;
    const original = context.createOscillator.bind(context);
    let stops = 0;
    context.createOscillator = () => {
      const oscillator = original(),
        stop = oscillator.stop.bind(oscillator);
      oscillator.stop = (...args) => {
        stops++;
        stop(...args);
      };
      return oscillator;
    };
    const second = phaserModule.create(context, settings, false, environment);
    source.connect(second.input);
    second.output.connect(merger, 0, 1);
    await context.resume();
    const buffer = await rendering;
    const a = buffer.getChannelData(0),
      b = buffer.getChannelData(1);
    let error = 0;
    for (let i = 36000; i < a.length; i++) error = Math.max(error, Math.abs(a[i] - b[i]));
    first.dispose();
    second.dispose();
    second.dispose();
    return { error, stops };
  });
  expect(proof.error).toBeLessThan(0.0001);
  expect(proof.stops).toBe(1);
});
