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

test('pedal presets apply independent copies, A/B includes chains, and order is undoable', async ({
  page,
}) => {
  await page.goto('/');
  const board = page.getByRole('region', { name: 'Pedalboard', exact: true });
  const destination = board.getByRole('combobox', { name: 'Pedal editing destination' });
  await board
    .getByRole('combobox', { name: 'Pedal preset', exact: true })
    .selectOption('warm-drive');
  await board.getByRole('button', { name: 'Load chain preset', exact: true }).click();
  const drive = board.getByRole('spinbutton', { name: 'overdrive 1 drive exact value' });
  await expect(drive).toHaveValue('6');
  await board
    .getByRole('combobox', { name: 'Chain application destination' })
    .selectOption('track:melody');
  await board.getByRole('button', { name: 'Apply chain to destination', exact: true }).click();
  await board
    .getByRole('combobox', { name: 'Chain application destination' })
    .selectOption('master');
  await board.getByRole('button', { name: 'Apply chain to destination', exact: true }).click();
  await drive.fill('12');
  await board.getByRole('button', { name: 'Save chain preset', exact: true }).click();
  await destination.selectOption('track:melody');
  await expect(drive).toHaveValue('6');
  await destination.selectOption('master');
  await expect(drive).toHaveValue('6');
  await destination.selectOption('audition');
  await expect(drive).toHaveValue('12');
  await board
    .getByRole('button', { name: 'Apply chain to all associated (2)', exact: true })
    .click();
  await destination.selectOption('track:melody');
  await expect(drive).toHaveValue('12');
  await destination.selectOption('master');
  await expect(drive).toHaveValue('12');
  await destination.selectOption('track:bass');
  await expect(drive).toHaveCount(0);
  await destination.selectOption('audition');
  await page.getByRole('button', { name: 'B', exact: true }).click();
  await expect(drive).toHaveCount(0);
  await page.getByRole('button', { name: 'Copy A to B', exact: true }).click();
  await expect(drive).toHaveValue('12');
  await drive.fill('4');
  await page.getByRole('button', { name: 'A', exact: true }).click();
  await expect(drive).toHaveValue('12');
  await board.getByRole('button', { name: 'Add compressor', exact: true }).click();
  await board.getByRole('button', { name: 'Move compressor 2 left' }).click();
  await expect(
    board.getByRole('spinbutton', { name: 'compressor 1 ratio exact value' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(
    board.getByRole('spinbutton', { name: 'compressor 2 ratio exact value' }),
  ).toBeVisible();
  await board.getByRole('button', { name: 'Listen to chain', exact: true }).click();
  await expect(page.getByRole('img', { name: 'After pedals waveform', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'After pedals spectrum', exact: true })).toBeVisible();
  await board.getByRole('spinbutton', { name: 'compressor 2 ratio exact value' }).fill('3');
  await expect(board.locator('.pedal-pending')).toHaveCount(0);
  await board.getByRole('button', { name: 'Move compressor 2 left' }).click();
  await expect(board.locator('.pedal-pending')).toBeVisible();
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await page.waitForTimeout(450);
  await page.reload();
  await expect(
    board.getByRole('spinbutton', { name: 'compressor 1 ratio exact value' }),
  ).toHaveValue('3');
  await page.screenshot({ path: '.test-results/pedalboard-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.test-results/pedalboard-mobile.png', fullPage: true });
});

test('hard Stop clears a processed audition before a fresh silent replay', async ({ page }) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const enginePath = '/src/audio/engine.ts',
      musicPath = '/src/core/music.ts',
      pedalsPath = '/src/core/pedals.ts';
    const { AudioEngine } = await import(enginePath),
      { mathematicalPreset } = await import(musicPath),
      { makePedal } = await import(pedalsPath);
    const engine = new AudioEngine();
    engine.setMonitor(0);
    const sound = mathematicalPreset('saw'),
      chain = { pedals: [makePedal('overdrive'), makePedal('compressor')], bypassed: false };
    const phrase = {
      tempo: 60,
      beats: 2,
      events: [{ beat: 0, duration: 2, notes: ['A4'], frequencies: [440] }],
    };
    await engine.auditionPhrase(sound, phrase, undefined, chain);
    await new Promise((r) => setTimeout(r, 200));
    const playing = engine.measure().peak;
    engine.stop();
    await new Promise((r) => setTimeout(r, 150));
    const samples = new Float32Array(engine.analyser!.fftSize);
    engine.analyser!.getFloatTimeDomainData(samples);
    const afterStop = Math.max(...Array.from(samples, Math.abs));
    sound.harmonics.fill(0);
    await engine.auditionPhrase(sound, phrase, undefined, chain);
    await new Promise((r) => setTimeout(r, 150));
    const silent = engine.measure().peak;
    engine.stop();
    await new Promise((r) => setTimeout(r, 60));
    await engine.context!.close();
    return { playing, afterStop, silent };
  });
  expect(proof.playing).toBeGreaterThan(0.001);
  expect(proof.afterStop).toBeLessThan(0.00001);
  expect(proof.silent).toBeLessThan(0.00001);
});

test('score track latency compensation cancels opposite sources, freezes parameters, and keeps bypass live', async ({
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
      'tempo 60\ntrack melody using brightReed {\n A4 whole\n}\ntrack bass using softBass {\n A4 whole\n}',
      project.instruments.map((p: any) => p.key),
    );
    if (score.diagnostics.length || score.events.length !== 2)
      throw new Error('Invalid cancellation proof score');
    project.tracks.forEach((t: any, i: number) => {
      t.sound = mathematicalPreset('sine');
      t.sound.polarity[0] = i ? -1 : 1;
      t.level = 1;
    });
    const pedal = makePedal('compressor');
    pedal.params.ratio = 1;
    pedal.params.threshold = 0;
    pedal.params.mix = 50;
    project.processing.tracks.melody.pedals = [pedal];
    const engine = new AudioEngine();
    engine.setMonitor(0);
    engine.setMix(1);
    await engine.play(score, project.tracks, project.processing);
    await new Promise((r) => setTimeout(r, 250));
    const aligned = engine.measure().peak;
    project.processing.tracks.melody.pedals[0].params.ratio = 20;
    engine.updateProcessing(project.processing, 'A');
    await new Promise((r) => setTimeout(r, 100));
    const frozen = engine.measure().peak,
      pending = engine.processingPending(project.processing, 'A');
    project.processing.tracks.melody.bypassed = true;
    engine.updateProcessing(project.processing, 'A');
    await new Promise((r) => setTimeout(r, 150));
    const bypass = engine.measure().peak;
    const taps = !!engine.outputAnalyser('track:melody') && !!engine.outputAnalyser('master');
    engine.stop();
    await new Promise((r) => setTimeout(r, 60));
    await engine.context!.close();
    return { aligned, frozen, bypass, pending, taps };
  });
  expect(proof.aligned).toBeLessThan(0.0001);
  expect(proof.frozen).toBeLessThan(0.0001);
  expect(proof.bypass).toBeLessThan(0.0001);
  expect(proof.pending).toBe(true);
  expect(proof.taps).toBe(true);
});
