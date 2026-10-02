import { expect, test } from '@playwright/test';
import { placePedal } from '../helpers/board';

test('score delay parameters freeze until replay while whole-chain bypass remains live', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const enginePath = '/src/audio/engine.ts',
      projectPath = '/src/core/project.ts',
      parserPath = '/src/core/parser.ts',
      musicPath = '/src/core/music.ts',
      pedalsPath = '/src/core/pedals.ts';
    const { AudioEngine } = await import(enginePath),
      { createProject } = await import(projectPath),
      { parseScore } = await import(parserPath),
      { mathematicalPreset } = await import(musicPath),
      { makePedal } = await import(pedalsPath);
    const engine = new AudioEngine(),
      project = createProject(),
      pedal = makePedal('delay');
    engine.setMonitor(0);
    engine.setMix(1);
    const score = parseScore(
      'tempo 60\ntrack melody using brightReed {\n A4 whole\n}',
      project.instruments.map((p: any) => p.key),
    );
    project.tracks.forEach((t: any) => {
      t.sound = mathematicalPreset('sine');
      t.level = 1;
    });
    pedal.params = { time: 100, feedback: 0, output: 0, mix: 100 };
    project.processing.tracks.melody.pedals = [pedal];
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const until = async (seconds: number) => {
      const deadline = performance.now() + 6000;
      while (engine.progress < seconds && engine.mode && performance.now() < deadline)
        await wait(20);
    };
    await engine.play(score, project.tracks, project.processing);
    await until(0.4);
    const baseline = engine.measure().peak;
    pedal.params.time = 2000;
    pedal.params.feedback = 95;
    pedal.params.output = -24;
    engine.updateProcessing(project.processing, 'A');
    await until(0.7);
    const frozen = engine.measure().peak,
      pending = engine.processingPending(project.processing, 'A', 'track:melody');
    project.processing.tracks.melody.bypassed = true;
    engine.updateProcessing(project.processing, 'A');
    await until(1);
    const bypass = engine.measure().peak;
    engine.stop();
    await wait(120);
    project.processing.tracks.melody.bypassed = false;
    await engine.play(score, project.tracks, project.processing);
    await until(0.7);
    const replay = engine.measure().peak,
      replayPending = engine.processingPending(project.processing, 'A', 'track:melody');
    engine.stop();
    await wait(60);
    await engine.context!.close();
    return { baseline, frozen, pending, bypass, replay, replayPending };
  });
  expect(proof.baseline).toBeGreaterThan(0.1);
  expect(proof.frozen).toBeCloseTo(proof.baseline, 2);
  expect(proof.pending).toBe(true);
  expect(proof.bypass).toBeGreaterThan(0.1);
  expect(proof.replay).toBeLessThan(0.00001);
  expect(proof.replayPending).toBe(false);
});

test('delay dry/wet output and maximum-feedback shortest repeats remain bounded', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const effectsPath = '/src/audio/effects.ts',
      pedalsPath = '/src/core/pedals.ts';
    const { createChain } = await import(effectsPath),
      { makePedal } = await import(pedalsPath);
    const rate = 48000,
      context = new OfflineAudioContext(1, rate, rate),
      pedal = makePedal('delay');
    pedal.params = { time: 20, feedback: 95, output: 6, mix: 50 };
    const graph = createChain(context, { pedals: [pedal], bypassed: false });
    graph.output.connect(context.destination);
    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, rate, rate);
    source.buffer.getChannelData(0)[960] = 1;
    source.connect(graph.input);
    source.start();
    const samples = (await context.startRendering()).getChannelData(0);
    const peak = (at: number) =>
      Math.max(
        ...samples.slice(Math.round(rate * at) - 4, Math.round(rate * at) + 5).map(Math.abs),
      );
    const result = {
      dry: peak(0.02),
      first: peak(0.04),
      second: peak(0.06),
      peak: Math.max(...samples.map(Math.abs)),
      finite: samples.every(Number.isFinite),
    };
    graph.dispose();
    return result;
  });
  expect(proof.dry).toBeCloseTo(0.5, 4);
  expect(proof.first).toBeCloseTo(0.5 * 10 ** (6 / 20), 4);
  expect(proof.second).toBeCloseTo(proof.first * 0.95, 4);
  expect(proof.peak).toBeLessThan(1.001);
  expect(proof.finite).toBe(true);
});

test('delay controls save independent presets, apply copies, and retain exact settings after reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await placePedal(page, 'delay');
  const time = page.getByRole('spinbutton', { name: 'delay 1 time exact value', exact: true });
  const feedback = page.getByRole('spinbutton', {
    name: 'delay 1 feedback exact value',
    exact: true,
  });
  await expect(time).toHaveValue('300');
  await expect(feedback).toHaveValue('30');
  await time.fill('450');
  await feedback.fill('45');
  const dial = page.getByRole('slider', { name: 'delay 1 mix dial', exact: true });
  await dial.focus();
  await dial.press('ArrowUp');
  await expect(
    page.getByRole('spinbutton', { name: 'delay 1 mix exact value', exact: true }),
  ).toHaveValue('36');
  await page
    .getByRole('textbox', { name: 'New chain preset name', exact: true })
    .fill('Short echoes');
  await page.getByRole('button', { name: 'Save chain as new', exact: true }).click();
  await page.getByRole('button', { name: 'Copy A to B', exact: true }).click();
  const target = page.getByRole('combobox', { name: 'Chain application destination', exact: true });
  for (const value of ['master', 'track:melody']) {
    await target.selectOption(value);
    await page.getByRole('button', { name: 'Apply chain to destination', exact: true }).click();
  }
  await time.fill('800');
  await page.getByRole('button', { name: 'Save chain preset', exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const p = JSON.parse(localStorage.getItem('fourpataka.project.v1')!).processing;
        return [
          p.audition.A.pedals[0]?.params.time,
          p.audition.B.pedals[0]?.params.time,
          p.master.pedals[0]?.params.time,
          p.tracks.melody.pedals[0]?.params.time,
          p.tracks.bass.pedals.length,
        ];
      }),
    )
    .toEqual([800, 450, 450, 450, 0]);
  await page.reload();
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Pedal editing destination', exact: true })
    .selectOption('master');
  await expect(time).toHaveValue('450');
  await expect(feedback).toHaveValue('45');
  await expect(page.locator('.board-cable')).toHaveCount(2);
  await page.screenshot({ path: '.test-results/delay-desktop.png', fullPage: true });
});

test('delay shows measured bypass tails and clears the indicator on Stop and dry replay', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await placePedal(page, 'delay');
  await page.getByRole('spinbutton', { name: 'delay 1 time exact value', exact: true }).fill('100');
  await page
    .getByRole('spinbutton', { name: 'delay 1 feedback exact value', exact: true })
    .fill('50');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect.poll(async () => page.locator('.meter-bars .lit').count()).toBeGreaterThan(0);
  await page.getByRole('checkbox', { name: 'Bypass delay 1', exact: true }).check();
  await expect(page.locator('.delay-tail-status')).toHaveText('Echo tails active');
  await expect(page.locator('.compact-pedal.delay')).toContainText('Tail active');
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await expect(page.locator('.delay-tail-status')).toHaveCount(0);
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect.poll(async () => page.locator('.meter-bars .lit').count()).toBeGreaterThan(0);
  await expect(page.locator('.delay-tail-status')).toHaveCount(0);
  await expect(page.locator('.compact-pedal.delay')).toContainText('Bypassed');
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
});

test('delay dials and inspector remain usable at 390 px with bounded feedback', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await placePedal(page, 'delay');
  const dial = page.getByRole('slider', { name: 'delay 1 feedback dial', exact: true });
  await dial.focus();
  await dial.press('End');
  await expect(
    page.getByRole('spinbutton', { name: 'delay 1 feedback exact value', exact: true }),
  ).toHaveValue('95');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'delay 1 feedback exact value', exact: true }),
  ).toHaveValue('30');
  await page.screenshot({ path: '.test-results/delay-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('live delay edits extend audition cleanup, bypass reports tails, and Stop clears replay', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const enginePath = '/src/audio/engine.ts',
      pedalsPath = '/src/core/pedals.ts',
      musicPath = '/src/core/music.ts';
    const { AudioEngine } = await import(enginePath);
    const { makePedal, defaultProcessing } = await import(pedalsPath);
    const { mathematicalPreset } = await import(musicPath);
    const engine = new AudioEngine(),
      processing = defaultProcessing(),
      pedal = makePedal('delay');
    engine.setMonitor(0);
    engine.setMix(1);
    pedal.params = { time: 100, feedback: 0, output: 0, mix: 100 };
    processing.audition.A.pedals = [pedal];
    const sound = mathematicalPreset('sine');
    sound.attack = 0.005;
    sound.release = 0.01;
    const phrase = {
      tempo: 60,
      beats: 0.08,
      events: [{ beat: 0, duration: 0.08, notes: ['A4'], frequencies: [440] }],
    };
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const until = async (seconds: number) => {
      const deadline = performance.now() + 5000;
      while (engine.progress < seconds && engine.mode && performance.now() < deadline)
        await wait(20);
    };
    await engine.auditionPhrase(sound, phrase, undefined, processing.audition.A);
    await until(0.04);
    pedal.params.time = 400;
    pedal.params.feedback = 40;
    engine.updateProcessing(processing, 'A');
    await until(0.2);
    pedal.bypassed = true;
    engine.updateProcessing(processing, 'A');
    const active = engine.activeTails('audition').includes(pedal.id);
    await until(0.49);
    const sustained = engine.measure().peak,
      mode = engine.mode,
      progress = engine.progress;
    engine.stop();
    await wait(120);
    const values = new Float32Array(engine.analyser!.fftSize);
    engine.analyser!.getFloatTimeDomainData(values);
    const stopped = Math.max(...values.map(Math.abs)),
      stoppedTails = engine.activeTails('audition');
    // An empty phrase reuses settings but must never reuse the previous buffers.
    await engine.auditionPhrase(
      sound,
      { tempo: 60, beats: 0.8, events: [] },
      undefined,
      processing.audition.A,
    );
    await until(0.5);
    const fresh = engine.measure().peak,
      freshTails = engine.activeTails('audition');
    engine.stop();
    await wait(60);
    await engine.context!.close();
    return { active, sustained, mode, progress, stopped, stoppedTails, fresh, freshTails };
  });
  expect(proof.active).toBe(true);
  expect(proof.mode).toBe('audition');
  expect(proof.progress).toBeGreaterThan(0.35);
  expect(proof.sustained).toBeGreaterThan(0.01);
  expect(proof.stopped).toBeLessThan(0.00001);
  expect(proof.stoppedTails).toEqual([]);
  expect(proof.fresh).toBe(0);
  expect(proof.freshTails).toEqual([]);
});

test('delay impulse has deliberate echo timing, bounded feedback and independent buffers', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const effectsPath = '/src/audio/effects.ts',
      pedalsPath = '/src/core/pedals.ts';
    const { createChain, chainLatency } = await import(effectsPath);
    const { makePedal } = await import(pedalsPath);
    const results = [];
    for (const rate of [44100, 48000]) {
      const context = new OfflineAudioContext(2, rate, rate);
      const pedal = makePedal('delay');
      pedal.params = { time: 100, feedback: 50, output: 0, mix: 100 };
      const chain = { pedals: [pedal], bypassed: false };
      const left = createChain(context, chain),
        right = createChain(context, structuredClone(chain));
      const merger = context.createChannelMerger(2);
      left.output.connect(merger, 0, 0);
      right.output.connect(merger, 0, 1);
      merger.connect(context.destination);
      const source = context.createBufferSource();
      source.buffer = context.createBuffer(1, rate, rate);
      source.buffer.getChannelData(0)[Math.round(rate * 0.02)] = 1;
      source.connect(left.input);
      source.start();
      const data = await context.startRendering();
      const samples = data.getChannelData(0);
      const peak = (at: number) =>
        Math.max(
          ...samples.slice(Math.round(rate * at) - 4, Math.round(rate * at) + 5).map(Math.abs),
        );
      results.push({
        first: peak(0.12),
        second: peak(0.22),
        third: peak(0.32),
        dry: peak(0.02),
        silent: Math.max(...data.getChannelData(1).map(Math.abs)),
        latency: chainLatency(chain, 0.002),
        tail: left.tail,
      });
      left.dispose();
      right.dispose();
    }
    return results;
  });
  for (const p of proof) {
    expect(p.first).toBeCloseTo(1, 4);
    expect(p.second).toBeCloseTo(0.5, 4);
    expect(p.third).toBeCloseTo(0.25, 4);
    expect(p.dry).toBe(0);
    expect(p.silent).toBe(0);
    expect(p.latency).toBe(0);
    expect(p.tail).toBeCloseTo(1.1, 6);
  }
});

test('pedal and whole-chain delay bypass pass new input dry while stored echoes finish', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const effectsPath = '/src/audio/effects.ts',
      pedalsPath = '/src/core/pedals.ts';
    const { createChain } = await import(effectsPath);
    const { makePedal } = await import(pedalsPath);
    const results = [];
    for (const wholeChain of [false, true]) {
      const rate = 48000,
        context = new OfflineAudioContext(1, rate, rate);
      const pedal = makePedal('delay');
      pedal.params = { time: 100, feedback: 50, output: 0, mix: 100 };
      const chain = { pedals: [pedal], bypassed: false };
      const graph = createChain(context, chain);
      graph.output.connect(context.destination);
      const source = context.createBufferSource();
      source.buffer = context.createBuffer(1, rate, rate);
      const input = source.buffer.getChannelData(0);
      input[Math.round(rate * 0.02)] = 1;
      input[Math.round(rate * 0.4)] = 1;
      source.connect(graph.input);
      source.start();
      const suspended = context.suspend(0.16);
      const rendered = context.startRendering();
      await suspended;
      if (wholeChain) chain.bypassed = true;
      else pedal.bypassed = true;
      graph.update(chain, true);
      await context.resume();
      const samples = (await rendered).getChannelData(0);
      const peak = (at: number) =>
        Math.max(
          ...samples.slice(Math.round(rate * at) - 4, Math.round(rate * at) + 5).map(Math.abs),
        );
      results.push({
        old: peak(0.22),
        decay: peak(0.32),
        newDry: peak(0.4),
        newEcho: peak(0.5),
        later: peak(0.52),
      });
      graph.dispose();
    }
    return results;
  });
  for (const p of proof) {
    expect(p.old).toBeCloseTo(0.5, 4);
    expect(p.decay).toBeCloseTo(0.25, 4);
    expect(p.newDry).toBeCloseTo(1, 4);
    expect(p.newEcho).toBeLessThan(0.000001);
    expect(p.later).toBeCloseTo(0.0625, 4);
  }
});
