import { expect, test } from '@playwright/test';

test('late-created chorus matches the original session phase and stops each owned oscillator once', async ({
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
        buffer = context.createBuffer(1, rate, rate),
        merger = context.createChannelMerger(2);
      for (let i = 0; i < rate; i++)
        buffer.getChannelData(0)[i] = 0.1 * Math.sin((2 * Math.PI * 317 * i) / rate);
      source.buffer = buffer;
      const create = context.createOscillator.bind(context);
      let stopped = 0;
      context.createOscillator = () => {
        const oscillator = create(),
          stop = oscillator.stop.bind(oscillator);
        oscillator.stop = (...args) => {
          stopped++;
          stop(...args);
        };
        return oscillator;
      };
      const env = {
        sampleRate: rate,
        oversamplingLatency: 0,
        compressorLatency: 0,
        timeOrigin: 0.1,
      };
      const p = { ...defaultModuleSettings(chorusModule), rate: 1.3, depth: 80, mix: 100 };
      const first = chorusModule.create(context, p, false, env);
      source.connect(first.input);
      first.output.connect(merger, 0, 0);
      merger.connect(context.destination);
      source.start();
      const suspended = context.suspend(0.5),
        rendering = context.startRendering();
      await suspended;
      const second = chorusModule.create(context, p, false, env);
      source.connect(second.input);
      second.output.connect(merger, 0, 1);
      await context.resume();
      const result = await rendering,
        a = result.getChannelData(0),
        b = result.getChannelData(1);
      let error = 0;
      for (let i = Math.ceil(rate * 0.7); i < a.length; i++)
        error = Math.max(error, Math.abs(a[i] - b[i]));
      first.dispose();
      second.dispose();
      second.dispose();
      rows.push({ rate, error, stopped });
    }
    return rows;
  });
  for (const row of proof) {
    expect(row.error, JSON.stringify(row)).toBeLessThan(0.00001);
    expect(row.stopped).toBe(2);
  }
});

test('rapid boundary edits retain a causal delay while one shared LFO keeps running', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { chorusModule } = await import('/src/modules/pedals/' + 'chorus.ts');
    const { defaultModuleSettings } = await import('/src/modules/' + 'index.ts');
    const rows = [];
    for (const rate of [3000, 44100, 48000]) {
      const context = new OfflineAudioContext(1, Math.ceil(rate * 0.4), rate),
        source = context.createBufferSource(),
        buffer = context.createBuffer(1, 1, rate);
      buffer.getChannelData(0)[0] = 0.1;
      source.buffer = buffer;
      let starts = 0;
      const create = context.createOscillator.bind(context);
      context.createOscillator = () => {
        const oscillator = create(),
          start = oscillator.start.bind(oscillator);
        oscillator.start = (...args) => {
          starts++;
          start(...args);
        };
        return oscillator;
      };
      const settings = {
        ...defaultModuleSettings(chorusModule),
        time: 11,
        depth: 100,
        rate: 1,
        mix: 100,
      };
      const processor = chorusModule.create(context, settings, false, {
        sampleRate: rate,
        oversamplingLatency: 0,
        compressorLatency: 0,
      });
      source.connect(processor.input);
      processor.output.connect(context.destination);
      source.start(0.25);
      const suspended = context.suspend(0.2),
        rendering = context.startRendering();
      await suspended;
      processor.update({ ...settings, time: 5 }, false);
      processor.update({ ...settings, time: 30 }, false);
      processor.update({ ...settings, time: 5 }, false);
      await context.resume();
      const data = (await rendering).getChannelData(0);
      let first = -1,
        peak = 0;
      for (let i = 0; i < data.length; i++) {
        if (first < 0 && Math.abs(data[i]) > 1e-7) first = i;
        peak = Math.max(peak, Math.abs(data[i]));
      }
      processor.dispose();
      rows.push({ rate, first, peak, starts, finite: data.every(Number.isFinite) });
    }
    return rows;
  });
  for (const row of proof) {
    expect(row.first, JSON.stringify(row)).toBeGreaterThanOrEqual(Math.floor(row.rate * 0.251) - 1);
    expect(row.first).toBeLessThan(row.rate * 0.29);
    expect(row.finite).toBe(true);
    expect(row.peak).toBeLessThanOrEqual(0.101);
    expect(row.starts).toBe(1);
  }
});

test('bypass drains stored chorus audio then becomes dry, with a finite feed ramp', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { chorusModule } = await import('/src/modules/pedals/' + 'chorus.ts');
    const { defaultModuleSettings } = await import('/src/modules/' + 'index.ts');
    const rows = [];
    for (const rate of [3000, 44100, 48000]) {
      const context = new OfflineAudioContext(1, Math.ceil(rate * 0.25), rate),
        source = context.createConstantSource();
      source.offset.value = 0.1;
      const p = { ...defaultModuleSettings(chorusModule), time: 30, depth: 100, mix: 100 };
      const processor = chorusModule.create(context, p, false, {
        sampleRate: rate,
        oversamplingLatency: 0,
        compressorLatency: 0,
      });
      source.connect(processor.input);
      processor.output.connect(context.destination);
      source.start();
      const suspended = context.suspend(0.1),
        rendering = context.startRendering();
      await suspended;
      const at = context.currentTime;
      processor.update(p, true);
      const active = processor.tailActive;
      await context.resume();
      const data = (await rendering).getChannelData(0);
      let lateError = 0,
        wetRemains = 0;
      for (let i = Math.ceil((at + 0.05) * rate) + 2; i < data.length; i++) {
        const dry = 0.1 * (1 - Math.exp(-(i / rate - at) / 0.015));
        lateError = Math.max(lateError, Math.abs(data[i] - dry));
      }
      for (let i = Math.ceil((at + 0.01) * rate); i < Math.floor((at + 0.02) * rate); i++)
        wetRemains = Math.max(wetRemains, data[i] - 0.1 * (1 - Math.exp(-(i / rate - at) / 0.015)));
      const finished = !processor.tailActive;
      processor.dispose();
      rows.push({ rate, lateError, wetRemains, active, finished });
    }
    return rows;
  });
  for (const row of proof) {
    expect(row.active).toBe(true);
    expect(row.finished).toBe(true);
    expect(row.wetRemains).toBeGreaterThan(0.01);
    expect(row.lateError, JSON.stringify(row)).toBeLessThan(0.00001);
  }
});
