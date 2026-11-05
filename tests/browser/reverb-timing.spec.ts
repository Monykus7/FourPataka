import { expect, test } from '@playwright/test';

test('reverb bypass drains stored sound, extends for real edits, and does not renew on identical updates', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { reverbModule } = await import('/src/modules/pedals/' + 'reverb.ts');
    const { defaultModuleSettings } = await import('/src/modules/' + 'index.ts');
    const rate = 48000,
      context = new OfflineAudioContext(1, rate * 3.5, rate),
      source = context.createBufferSource(),
      buffer = context.createBuffer(1, rate * 3.5, rate);
    buffer.getChannelData(0).fill(0.1);
    source.buffer = buffer;
    let p = { ...defaultModuleSettings(reverbModule), decay: 0.3, mix: 100 };
    const processor = reverbModule.create(context, p, false, {
      sampleRate: rate,
      compressorLatency: 0,
      oversamplingLatency: 0,
    });
    source.connect(processor.input);
    processor.output.connect(context.destination);
    source.start();
    let at = 0,
      active = false,
      ended = false,
      budget = 0;
    const a = context.suspend(0.2).then(() => {
      at = context.currentTime;
      processor.update(p, true);
      active = processor.tailActive;
      return context.resume();
    });
    const b = context.suspend(0.3).then(() => {
      p = { ...p, decay: 1 };
      processor.update(p, true);
      return context.resume();
    });
    const c = context.suspend(0.5).then(() => {
      p = { ...p, decay: 0.1 };
      processor.update(p, true);
      budget = processor.tail;
      return context.resume();
    });
    const d = context.suspend(2.9).then(() => {
      for (let i = 0; i < 5; i++) processor.update(p, true);
      return context.resume();
    });
    const e = context.suspend(3.1).then(() => {
      ended = !processor.tailActive;
      return context.resume();
    });
    const data = (await context.startRendering()).getChannelData(0);
    await Promise.all([a, b, c, d, e]);
    let wet = 0,
      late = 0;
    for (let i = Math.ceil((at + 0.01) * rate); i < data.length; i++) {
      const t = i / rate - at;
      const dry = 0.1 * (1 - Math.exp(-t / 0.015));
      if (t < 0.08) wet = Math.max(wet, Math.abs(data[i] - dry));
      if (i > 3.2 * rate) late = Math.max(late, Math.abs(data[i] - 0.1));
    }
    processor.dispose();
    return { active, ended, budget, wet, late };
  });
  expect(proof.active).toBe(true);
  expect(proof.ended).toBe(true);
  expect(proof.budget).toBeCloseTo(2.515);
  expect(proof.wet).toBeGreaterThan(0.001);
  expect(proof.late).toBeLessThan(1e-6);
});

test('rapid room edits remain finite and every reverb node is disposed once', async ({ page }) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { reverbModule } = await import('/src/modules/pedals/' + 'reverb.ts');
    const { defaultModuleSettings } = await import('/src/modules/' + 'index.ts');
    const rate = 48000,
      context = new OfflineAudioContext(1, rate * 2, rate);
    let created = 0,
      disconnected = 0;
    for (const key of ['createGain', 'createDelay', 'createBiquadFilter'] as const) {
      const make = context[key].bind(context) as (...args: any[]) => AudioNode;
      (context as any)[key] = (...args: any[]) => {
        const node = make(...args),
          disconnect = node.disconnect.bind(node);
        created++;
        node.disconnect = (() => {
          disconnected++;
          disconnect();
        }) as typeof node.disconnect;
        return node;
      };
    }
    const defaults = defaultModuleSettings(reverbModule),
      processor = reverbModule.create(context, defaults, false, {
        sampleRate: rate,
        compressorLatency: 0,
        oversamplingLatency: 0,
      });
    const source = context.createBufferSource(),
      buffer = context.createBuffer(1, rate / 2, rate);
    for (let i = 0; i < buffer.length; i++)
      buffer.getChannelData(0)[i] = 0.05 * Math.sin((2 * Math.PI * 317 * i) / rate);
    source.buffer = buffer;
    source.connect(processor.input);
    processor.output.connect(context.destination);
    source.start();
    const update = context.suspend(0.2).then(() => {
      for (const patch of [
        { size: 200, decay: 10, damping: 500, preDelay: 100 },
        { size: 50, decay: 0.1, damping: 18000, preDelay: 0 },
        { size: 200, decay: 10, damping: 500, preDelay: 100 },
      ])
        processor.update({ ...defaults, ...patch, mix: 100 }, false);
      return context.resume();
    });
    const data = (await context.startRendering()).getChannelData(0);
    await update;
    let peak = 0;
    for (const v of data) {
      if (!Number.isFinite(v)) throw new Error('Nonfinite edit');
      peak = Math.max(peak, Math.abs(v));
    }
    processor.dispose();
    processor.dispose();
    return { peak, created, disconnected, expected: reverbModule.nodes };
  });
  expect(proof.peak).toBeLessThan(0.15);
  expect(proof.created).toBe(proof.expected);
  expect(proof.disconnected).toBe(proof.created);
});

test('reverb controls change actual late-field damping and decay', async ({ page }) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { reverbModule } = await import('/src/modules/pedals/' + 'reverb.ts');
    const { defaultModuleSettings } = await import('/src/modules/' + 'index.ts');
    const render = async (patch: object, high = false) => {
      const rate = 48000,
        context = new OfflineAudioContext(1, rate * 2, rate),
        source = context.createBufferSource(),
        buffer = context.createBuffer(1, rate / 10, rate);
      for (let i = 0; i < buffer.length; i++)
        buffer.getChannelData(0)[i] = high ? 0.1 * Math.sin((2 * Math.PI * 8000 * i) / rate) : 0.1;
      source.buffer = buffer;
      const processor = reverbModule.create(
        context,
        { ...defaultModuleSettings(reverbModule), ...patch, mix: 100 },
        false,
        { sampleRate: rate, compressorLatency: 0, oversamplingLatency: 0 },
      );
      source.connect(processor.input);
      processor.output.connect(context.destination);
      source.start();
      const data = (await context.startRendering()).getChannelData(0);
      let energy = 0;
      for (let i = rate * (high ? 0.25 : 0.5); i < data.length; i++) energy += data[i] ** 2;
      processor.dispose();
      return energy;
    };
    return {
      short: await render({ decay: 0.1 }),
      long: await render({ decay: 3 }),
      dark: await render({ damping: 500 }, true),
      bright: await render({ damping: 18000 }, true),
    };
  });
  expect(proof.long).toBeGreaterThan(proof.short * 10);
  expect(proof.dark).toBeLessThan(proof.bright * 0.2);
});
