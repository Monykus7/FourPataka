import { expect, test } from '@playwright/test';

test('EQ respects frozen score parameters, aligned tracks, live bypass and hard Stop', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const enginePath = '/src/audio/engine.ts',
      projectPath = '/src/core/project.ts',
      pedalsPath = '/src/core/pedals.ts',
      parserPath = '/src/core/parser.ts',
      musicPath = '/src/core/music.ts';
    const { AudioEngine } = await import(enginePath),
      { createProject } = await import(projectPath),
      { makePedal } = await import(pedalsPath),
      { parseScore } = await import(parserPath),
      { mathematicalPreset } = await import(musicPath);
    const project = createProject();
    const score = parseScore(
      'tempo 60\ntrack melody using brightReed {\n A4 whole\n A4 whole\n}\ntrack bass using softBass {\n A4 whole\n A4 whole\n}',
      project.instruments.map((p: any) => p.key),
    );
    project.tracks.forEach((t: any, i: number) => {
      t.sound = mathematicalPreset('sine');
      t.sound.polarity[0] = i ? -1 : 1;
      t.level = 1;
    });
    const compressor = makePedal('compressor');
    compressor.params.ratio = 1;
    compressor.params.mix = 50;
    const eq = makePedal('eq');
    project.processing.tracks.melody.pedals = [eq];
    project.processing.tracks.bass.pedals = [compressor];
    const engine = new AudioEngine();
    engine.setMonitor(0);
    engine.setMix(1);
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    await engine.play(score, project.tracks, project.processing);
    await delay(350);
    const aligned = engine.measure().peak;
    eq.params.mid = -12;
    eq.params.frequency = 440;
    engine.updateProcessing(project.processing, 'A');
    await delay(200);
    const frozen = engine.measure().peak,
      pending = engine.processingPending(project.processing, 'A');
    engine.stop();
    await delay(100);
    await engine.play(score, project.tracks, project.processing);
    await delay(350);
    const changed = engine.measure().peak;
    eq.bypassed = true;
    engine.updateProcessing(project.processing, 'A');
    await delay(250);
    const bypass = engine.measure().peak;
    engine.stop();
    await delay(150);
    const silence = engine.measure().peak;
    await engine.context!.close();
    return { aligned, frozen, pending, changed, bypass, silence };
  });
  expect(proof.aligned).toBeLessThan(0.0001);
  expect(proof.frozen).toBeLessThan(0.0001);
  expect(proof.pending).toBe(true);
  expect(proof.changed).toBeGreaterThan(0.05);
  expect(proof.bypass).toBeLessThan(0.0001);
  expect(proof.silence).toBeLessThan(0.00001);
});

test('EQ audition edits and A/B replacement retain progress and clean state on replay', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const enginePath = '/src/audio/engine.ts',
      pedalsPath = '/src/core/pedals.ts',
      musicPath = '/src/core/music.ts';
    const { AudioEngine } = await import(enginePath),
      { makePedal, defaultProcessing } = await import(pedalsPath),
      { mathematicalPreset } = await import(musicPath);
    const engine = new AudioEngine();
    engine.setMonitor(0);
    engine.setMix(1);
    const processing = defaultProcessing();
    const pedal = makePedal('eq');
    pedal.params.frequency = 440;
    processing.audition.A.pedals = [pedal];
    processing.audition.B = structuredClone(processing.audition.A);
    processing.audition.B.pedals[0].id = crypto.randomUUID();
    processing.audition.B.pedals[0].params.mid = 12;
    const sound = mathematicalPreset('sine');
    const phrase = {
      tempo: 60,
      beats: 16,
      events: [{ beat: 0, duration: 16, notes: ['A4'], frequencies: [440] }],
    };
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    await engine.auditionPhrase(sound, phrase, undefined, processing.audition.A);
    await delay(350);
    const baseline = engine.measure().peak,
      before = engine.progress;
    pedal.params.mid = -12;
    engine.updateProcessing(processing, 'A');
    await delay(250);
    const cut = engine.measure().peak,
      afterEdit = engine.progress;
    engine.switchAudition(sound, processing.audition.B);
    await delay(250);
    const boost = engine.measure().peak,
      afterSwitch = engine.progress;
    engine.stop();
    await delay(150);
    const silence = engine.measure().peak;
    sound.harmonics.fill(0);
    await engine.auditionPhrase(sound, phrase, undefined, processing.audition.A);
    await delay(250);
    const restart = engine.measure().peak;
    engine.stop();
    await delay(70);
    await engine.context!.close();
    return { baseline, cut, boost, before, afterEdit, afterSwitch, silence, restart };
  });
  expect(proof.baseline).toBeGreaterThan(0.05);
  expect(proof.cut).toBeLessThan(proof.baseline * 0.4);
  expect(proof.boost).toBeGreaterThan(proof.baseline * 3);
  expect(proof.afterEdit).toBeGreaterThan(proof.before);
  expect(proof.afterSwitch).toBeGreaterThan(proof.afterEdit);
  expect(proof.silence).toBeLessThan(0.00001);
  expect(proof.restart).toBeLessThan(0.00001);
});

test('EQ presets retain independent A/B, track and master copies through saving and reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page.getByRole('button', { name: 'Add EQ', exact: true }).click();
  const low = page.getByRole('spinbutton', { name: 'eq 1 low gain exact value', exact: true });
  await low.fill('6');
  await page
    .getByRole('textbox', { name: 'New chain preset name', exact: true })
    .fill('EQ presence');
  await page.getByRole('button', { name: 'Save chain as new', exact: true }).click();
  await page.getByRole('button', { name: 'Copy A to B', exact: true }).click();
  const target = page.getByRole('combobox', { name: 'Chain application destination', exact: true });
  for (const value of ['track:melody', 'master']) {
    await target.selectOption(value);
    await page.getByRole('button', { name: 'Apply chain to destination', exact: true }).click();
  }
  await low.fill('12');
  await page.getByRole('button', { name: 'Save chain preset', exact: true }).click();
  const destination = page.getByRole('combobox', {
    name: 'Pedal editing destination',
    exact: true,
  });
  for (const value of ['track:melody', 'master']) {
    await destination.selectOption(value);
    await expect(low).toHaveValue('6');
  }
  await destination.selectOption('track:bass');
  await expect(page.locator('.pedal-module.eq')).toHaveCount(0);
  await destination.selectOption('audition');
  await page
    .getByRole('button', { name: 'Apply chain to all associated (2)', exact: true })
    .click();
  await expect
    .poll(async () => {
      const processing = await page.evaluate(
        () => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).processing,
      );
      return [
        processing.audition.A.pedals[0].params.low,
        processing.audition.B.pedals[0].params.low,
        processing.tracks.melody.pedals[0].params.low,
        processing.master.pedals[0].params.low,
        processing.tracks.bass.pedals.length,
      ];
    })
    .toEqual([12, 6, 12, 12, 0]);
  await page.reload();
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Pedal editing destination', exact: true })
    .selectOption('master');
  await expect(low).toHaveValue('12');
  await low.fill('-4');
  await page
    .getByRole('combobox', { name: 'Pedal editing destination', exact: true })
    .selectOption('track:melody');
  await expect(low).toHaveValue('12');
  await expect(
    page
      .getByRole('combobox', { name: 'Pedal preset', exact: true })
      .getByRole('option', { name: 'EQ presence' }),
  ).toHaveCount(1);
});

test('EQ remains usable at 390 px with all eight modules and visible vertical connections', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page.getByRole('button', { name: 'Add EQ', exact: true }).click();
  await page.screenshot({ path: '.test-results/eq-mobile.png', fullPage: true });
  for (let i = 1; i < 8; i++)
    await page.getByRole('button', { name: 'Add EQ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add EQ', exact: true })).toBeDisabled();
  await expect(page.locator('.pedal-module.eq')).toHaveCount(8);
  await expect(page.locator('.patch-cable .vertical-cable')).toHaveCount(9);
  const frequency = page.getByRole('slider', { name: 'eq 8 mid frequency dial', exact: true });
  await frequency.focus();
  await frequency.press('End');
  await expect(
    page.getByRole('spinbutton', { name: 'eq 8 mid frequency exact value', exact: true }),
  ).toHaveValue('4000');
  await page.getByRole('checkbox', { name: 'Bypass eq 8', exact: true }).check();
  await page.getByRole('button', { name: 'Reset EQ 8 to flat', exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'eq 8 mid frequency exact value', exact: true }),
  ).toHaveValue('1000');
  await expect(page.getByRole('checkbox', { name: 'Bypass eq 8', exact: true })).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('EQ joins the cable path with precise rotary controls and bounds', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page.getByRole('button', { name: 'Add EQ', exact: true }).click();
  const eq = page.locator('.pedal-module.eq');
  await expect(eq).toContainText('Three-band EQ');
  await expect(eq).toContainText('Shelves 200 Hz / 4 kHz');
  await page.screenshot({ path: '.test-results/eq-desktop.png', fullPage: true });
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

test('flat reset is one undo step and retains the module order and bypass state', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page.getByRole('button', { name: 'Add EQ', exact: true }).click();
  const eq = page.locator('.pedal-module.eq');
  const id = await eq.getAttribute('data-pedal-id');
  const value = (name: string) =>
    eq.getByRole('spinbutton', { name: `eq 1 ${name} exact value`, exact: true });
  for (const [name, n] of [
    ['low gain', '6'],
    ['mid gain', '-4'],
    ['high gain', '3'],
    ['mid frequency', '1700'],
    ['output', '-3'],
    ['mix', '40'],
  ])
    await value(name).fill(n);
  await eq.getByRole('checkbox', { name: 'Bypass eq 1', exact: true }).check();
  await eq.getByRole('button', { name: 'Reset EQ 1 to flat', exact: true }).click();
  for (const [name, n] of [
    ['low gain', '0'],
    ['mid gain', '0'],
    ['high gain', '0'],
    ['mid frequency', '1000'],
    ['output', '0'],
    ['mix', '100'],
  ])
    await expect(value(name)).toHaveValue(n);
  await expect(eq).toHaveAttribute('data-pedal-id', id!);
  await expect(eq.getByRole('checkbox', { name: 'Bypass eq 1', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  for (const [name, n] of [
    ['low gain', '6'],
    ['mid gain', '-4'],
    ['high gain', '3'],
    ['mid frequency', '1700'],
    ['output', '-3'],
    ['mix', '40'],
  ])
    await expect(value(name)).toHaveValue(n);
  await expect(eq.getByRole('checkbox', { name: 'Bypass eq 1', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(value('low gain')).toHaveValue('0');
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
