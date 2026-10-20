import { expect, test } from '@playwright/test';

test('chamber preserves dry identity and bounds real damped reflections and tails at rate extremes', async ({
  page,
}) => {
  await page.goto('/');
  const rows = await page.evaluate(async () => {
    const { createChamber } = await import('/src/audio/' + 'chamber.ts');
    const { ACOUSTICS_DEFAULTS, ACOUSTICS_TAIL } = await import(
      '/src/modules/foundation/' + 'acoustics.ts'
    );
    const rows = [];
    for (const rate of [3000, 44100, 48000, 192000]) {
      for (const settings of [
        undefined,
        { ...ACOUSTICS_DEFAULTS, enabled: true, mix: 0 },
        { ...ACOUSTICS_DEFAULTS, enabled: true, mix: 100 },
        { enabled: true, mix: 100, size: 1, decay: 600, damping: 500 },
        { enabled: true, mix: 100, size: 8, decay: 600, damping: 14000 },
      ]) {
        const context = new OfflineAudioContext(2, Math.ceil(rate * 1.6), rate);
        const buffer = context.createBuffer(2, Math.ceil(rate * 0.1), rate);
        buffer.getChannelData(0).fill(0.1);
        buffer.getChannelData(1).fill(-0.07);
        const source = context.createBufferSource();
        source.buffer = buffer;
        const chamber = createChamber(context, settings);
        source.connect(chamber.input);
        chamber.output.connect(context.destination);
        source.start();
        const result = await context.startRendering();
        let peak = 0,
          late = 0,
          dryError = 0,
          changed = 0,
          stereoError = 0;
        for (let i = 0; i < result.length; i++) {
          const l = result.getChannelData(0)[i],
            r = result.getChannelData(1)[i];
          if (!Number.isFinite(l) || !Number.isFinite(r))
            throw new Error('Nonfinite chamber output');
          peak = Math.max(peak, Math.abs(l), Math.abs(r));
          if (i > rate * (0.1 + ACOUSTICS_TAIL)) late = Math.max(late, Math.abs(l), Math.abs(r));
          dryError = Math.max(dryError, Math.abs(l - (i < buffer.length ? 0.1 : 0)));
          changed = Math.max(changed, Math.abs(l - (i < buffer.length ? 0.1 : 0)));
          stereoError = Math.max(stereoError, Math.abs(r + 0.7 * l));
        }
        chamber.dispose();
        chamber.dispose();
        rows.push({
          rate,
          dry: !settings?.enabled || !settings.mix,
          peak,
          late,
          dryError,
          changed,
          stereoError,
        });
      }
    }
    return rows;
  });
  for (const row of rows) {
    expect(row.peak, JSON.stringify(row)).toBeLessThanOrEqual(0.101);
    expect(row.late, JSON.stringify(row)).toBeLessThan(0.000001);
    expect(row.stereoError, JSON.stringify(row)).toBeLessThan(0.00003);
    if (row.dry) expect(row.dryError).toBeLessThan(0.000001);
    else expect(row.changed).toBeGreaterThan(0.02);
  }
});

test('size changes reflection timing, damping removes high frequencies, and decay retains a longer body', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { createChamber } = await import('/src/audio/' + 'chamber.ts');
    const { ACOUSTICS_DEFAULTS } = await import('/src/modules/foundation/' + 'acoustics.ts');
    const render = async (patch: object, sine = false) => {
      const rate = 48000,
        context = new OfflineAudioContext(2, rate, rate);
      const input = context.createBuffer(2, sine ? rate / 10 : 1, rate);
      for (let i = 0; i < input.length; i++)
        input.getChannelData(0)[i] = sine ? 0.1 * Math.sin((2 * Math.PI * 8000 * i) / rate) : 0.1;
      const source = context.createBufferSource();
      source.buffer = input;
      const chamber = createChamber(context, {
        ...ACOUSTICS_DEFAULTS,
        enabled: true,
        mix: 100,
        ...patch,
      });
      source.connect(chamber.input);
      chamber.output.connect(context.destination);
      source.start();
      const result = await context.startRendering();
      chamber.dispose();
      const left = result.getChannelData(0),
        right = result.getChannelData(1);
      let leak = 0;
      for (const v of right) leak = Math.max(leak, Math.abs(v));
      const energy = (from: number, to: number) => {
        let e = 0;
        for (let i = Math.floor(from * rate); i < to * rate; i++) e += left[i] ** 2;
        return e;
      };
      return {
        onset: left.findIndex((v) => Math.abs(v) > 1e-8) / rate,
        high: energy(0.03, 0.09),
        late: energy(0.12, 0.6),
        leak,
      };
    };
    return {
      small: await render({ size: 1 }),
      large: await render({ size: 8 }),
      dark: await render({ damping: 500 }, true),
      bright: await render({ damping: 14000 }, true),
      short: await render({ decay: 40 }),
      long: await render({ decay: 600 }),
    };
  });
  expect(proof.large.onset - proof.small.onset).toBeGreaterThan(0.004);
  expect(proof.dark.high).toBeLessThan(proof.bright.high * 0.2);
  expect(proof.long.late).toBeGreaterThan(proof.short.late * 2);
  for (const row of Object.values(proof)) expect(row.leak).toBe(0);
});

test('live chamber edits and disabling drain without instability, and disposal clears every owned node once', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { createChamber, CHAMBER_RESOURCES } = await import('/src/audio/' + 'chamber.ts');
    const { ACOUSTICS_DEFAULTS } = await import('/src/modules/foundation/' + 'acoustics.ts');
    const context = new OfflineAudioContext(1, 48000 * 1.8, 48000);
    let created = 0,
      disconnected = 0;
    for (const key of ['createGain', 'createDelay', 'createBiquadFilter'] as const) {
      const make = context[key].bind(context) as (...args: any[]) => AudioNode;
      (context as any)[key] = (...args: any[]) => {
        const node = make(...args),
          disconnect = node.disconnect.bind(node);
        created++;
        node.disconnect = ((...args: any[]) => {
          if (!args.length) disconnected++;
          (disconnect as any)(...args);
        }) as typeof node.disconnect;
        return node;
      };
    }
    const chamber = createChamber(context, { ...ACOUSTICS_DEFAULTS, enabled: true, mix: 100 });
    const owned = created;
    const buffer = context.createBuffer(1, 48000 * 1.8, 48000);
    buffer.getChannelData(0).fill(0.1);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(chamber.input);
    chamber.output.connect(context.destination);
    source.start();
    const edit = context.suspend(0.1).then(() => {
      chamber.update({
        ...ACOUSTICS_DEFAULTS,
        enabled: true,
        mix: 100,
        size: 1,
        decay: 600,
        damping: 500,
      });
      return context.resume();
    });
    const off = context.suspend(0.2).then(() => {
      chamber.update({ ...ACOUSTICS_DEFAULTS, enabled: false, mix: 100 });
      return context.resume();
    });
    const result = await context.startRendering();
    await Promise.all([edit, off]);
    let peak = 0,
      late = 0;
    for (let i = 0; i < result.length; i++) {
      const v = result.getChannelData(0)[i];
      if (!Number.isFinite(v)) throw new Error('Nonfinite live edit');
      peak = Math.max(peak, Math.abs(v));
      if (i > 48000 * 1.55) late = Math.max(late, Math.abs(v - 0.1));
    }
    chamber.dispose();
    chamber.dispose();
    return { peak, late, owned, expected: CHAMBER_RESOURCES.nodes, disconnected };
  });
  expect(proof.peak).toBeLessThan(0.21);
  expect(proof.late).toBeLessThan(0.000001);
  expect(proof.owned).toBe(proof.expected);
  expect(proof.disconnected).toBe(proof.owned);
});
