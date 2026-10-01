import { expect, test } from '@playwright/test';

test('rapid edits preserve common-component gain throughout unfinished crossfades', async ({
  page,
}) => {
  await page.goto('/');
  const error = await page.evaluate(async () => {
    const voicePath = '/src/audio/voice.ts',
      musicPath = '/src/core/music.ts';
    const { createVoice } = await import(voicePath);
    const { mathematicalPreset } = await import(musicPath);
    const render = async (polarity: number) => {
      const context = new OfflineAudioContext(1, 24000, 48000);
      const sound = mathematicalPreset('sine');
      const voice = createVoice(context, context.destination, sound, 437, 0, 0.4);
      const first = context.suspend(0.2),
        second = context.suspend(0.21);
      const rendering = context.startRendering();
      await first;
      const next = structuredClone(sound);
      next.harmonics[2] = 0.25;
      next.polarity[2] = polarity;
      voice.update(next);
      await context.resume();
      await second;
      next.harmonics[2] = 0.5;
      voice.update(next);
      await context.resume();
      return (await rendering).getChannelData(0);
    };
    const positive = await render(1),
      negative = await render(-1);
    // Opposite added harmonics cancel, leaving the shared fundamental. It must
    // retain its gain and phase during both overlapping transitions.
    let error = 0;
    for (let i = 9600; i < 14400; i++) {
      const expected = 10 ** (-12 / 20) * Math.sin((2 * Math.PI * 437 * i) / 48000);
      error = Math.max(error, Math.abs((positive[i] + negative[i]) / 2 - expected));
    }
    return error;
  });
  expect(error).toBeLessThan(0.001);
});

test('live undertone and solo changes add/remove source paths without restarting a voice', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const voicePath = '/src/audio/voice.ts',
      musicPath = '/src/core/music.ts';
    const { createVoice } = await import(voicePath);
    const { mathematicalPreset } = await import(musicPath);
    const context = new OfflineAudioContext(1, 48000, 48000);
    const sound = mathematicalPreset('sine');
    sound.release = 0.05;
    const voice = createVoice(context, context.destination, sound, 480, 0, 0.7);
    const first = context.suspend(0.12),
      second = context.suspend(0.32);
    const rendering = context.startRendering();
    await first;
    const next = structuredClone(sound);
    next.undertonesEnabled = true;
    next.undertones[0] = 0.5;
    voice.update(next, 'f₀/2');
    await context.resume();
    await second;
    next.undertonesEnabled = false;
    voice.update(next);
    await context.resume();
    const samples = (await rendering).getChannelData(0);
    const coefficient = (f: number, start: number) => {
      let total = 0;
      for (let i = start; i < start + 4800; i++)
        total += samples[i] * Math.sin((2 * Math.PI * f * i) / 48000);
      return (total * 2) / 4800;
    };
    return {
      sub: coefficient(240, 9600),
      soloFundamental: coefficient(480, 9600),
      restored: coefficient(480, 19200),
      disabled: coefficient(240, 19200),
      tail: Math.max(...Array.from(samples.slice(37000), Math.abs)),
    };
  });
  expect(proof.sub).toBeCloseTo(0.5 * 10 ** (-12 / 20), 4);
  expect(Math.abs(proof.soloFundamental)).toBeLessThan(0.0001);
  expect(proof.restored).toBeCloseTo(10 ** (-12 / 20), 4);
  expect(Math.abs(proof.disabled)).toBeLessThan(0.0001);
  expect(proof.tail).toBe(0);
});

test('A/B shares a saved phrase, replays on switching, and keeps live edits at the same position', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('combobox', { name: 'Comparison material', exact: true })
    .selectOption('phrase');
  await page.getByRole('combobox', { name: 'Comparison phrase track' }).selectOption('bass');
  await page.getByRole('spinbutton', { name: 'Comparison phrase start beat' }).fill('2');
  await page.getByRole('spinbutton', { name: 'Comparison phrase end boundary' }).fill('4');
  await page.getByRole('spinbutton', { name: 'Comparison phrase start beat' }).fill('1000003');
  await expect(page.getByRole('spinbutton', { name: 'Comparison phrase start beat' })).toHaveValue(
    '2',
  );
  await expect(page.locator('.comparison-summary')).toContainText(
    'bass · 2 beats · 120 BPM · 2 events',
  );
  await page.getByRole('button', { name: 'Copy A to B', exact: true }).click();
  await page.getByRole('button', { name: 'B', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'H1 exact magnitude' }).fill('0.35');
  await page.getByRole('button', { name: 'Compare / replay', exact: true }).click();
  const progress = page.getByRole('progressbar', { name: 'Comparison phrase progress' });
  await expect.poll(async () => Number(await progress.getAttribute('value'))).toBeGreaterThan(0.3);
  const before = Number(await progress.getAttribute('value'));
  await page.getByRole('spinbutton', { name: 'H1 exact magnitude' }).fill('0.5');
  await expect
    .poll(async () => Number(await progress.getAttribute('value')))
    .toBeGreaterThan(before);
  await page.getByRole('button', { name: 'A', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'H1 exact magnitude' })).toHaveValue('1');
  await expect.poll(async () => Number(await progress.getAttribute('value'))).toBeLessThan(0.2);
  await expect(page.getByRole('spinbutton', { name: 'Comparison phrase start beat' })).toHaveValue(
    '2',
  );
  await page.getByRole('button', { name: 'Stop all sound' }).click();
  await expect(page.getByRole('button', { name: 'Listen', exact: true })).not.toHaveClass(
    /playing/,
  );
  await page.getByRole('spinbutton', { name: 'Comparison phrase end boundary' }).fill('');
  await page.getByRole('spinbutton', { name: 'Comparison phrase start beat' }).fill('1');
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Comparison material' })).toHaveValue('phrase');
  await expect(page.getByRole('combobox', { name: 'Comparison phrase track' })).toHaveValue('bass');
  await expect(
    page.getByRole('spinbutton', { name: 'Comparison phrase end boundary' }),
  ).toHaveValue('');
  const project = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('fourpataka.project.v1')!),
  );
  expect(project.comparison.B.harmonics[0]).toBe(0.5);
  expect(project.tracks[1].sound.harmonics[0]).toBe(1);
  await page.screenshot({ path: '.test-results/comparison-desktop.png', fullPage: true });
});

test('microscope links keyboard spectrum selection, zero components, contribution, and solo', async ({
  page,
}) => {
  await page.goto('/');
  const select = page.getByRole('button', { name: 'Select H3 in spectrum' });
  await select.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.inspector-symbol')).toContainText('H3');
  await expect(select).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.partial-contribution')).toHaveAttribute(
    'aria-label',
    'H3 waveform contribution',
  );
  await page.getByRole('button', { name: 'Solo H3', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Solo on · return to instrument' })).toBeVisible();
  await page.getByRole('button', { name: 'H2', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Select H2 in spectrum' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.inspector-symbol')).toContainText('H2');
  await expect(page.locator('.partial-contribution')).toHaveAttribute(
    'aria-label',
    'H2 waveform contribution',
  );
  await page.getByRole('button', { name: 'Stop all sound' }).click();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Score editor' })
    .fill('track broken using missing {\n C4 quarter\n}');
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  await page.getByRole('combobox', { name: 'Comparison material' }).selectOption('phrase');
  await expect(page.getByRole('button', { name: 'Compare / replay' })).toBeDisabled();
  // Returning from solo remains available even if the selected phrase becomes invalid.
  await page.getByRole('button', { name: 'Solo on · return to instrument' }).click();
  await expect(
    page.locator('.partial-inspector').getByRole('button', { name: 'Solo H2', exact: true }),
  ).toBeDisabled();
  await page.getByRole('combobox', { name: 'Comparison material' }).selectOption('note');
  await expect(page.getByRole('button', { name: 'Compare / replay' })).toBeEnabled();
});

test('live voice edits crossfade in phase without retriggering the envelope', async ({ page }) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const voicePath = '/src/audio/voice.ts';
    const musicPath = '/src/core/music.ts';
    const { createVoice } = await import(voicePath);
    const { mathematicalPreset } = await import(musicPath);
    const context = new OfflineAudioContext(1, 48000, 48000);
    const sound = mathematicalPreset('sine');
    sound.attack = 0.4;
    const voice = createVoice(context, context.destination, sound, 437, 0, 0.8);
    const paused = context.suspend(0.2);
    const rendering = context.startRendering();
    await paused;
    const changeAt = context.currentTime;
    const next = structuredClone(sound);
    next.harmonics[2] = 0.25;
    next.polarity[2] = -1;
    voice.update(next);
    await context.resume();
    const samples = (await rendering).getChannelData(0);
    let error = 0;
    for (let i = Math.ceil((changeAt + 0.025) * 48000); i < 19000; i++) {
      const t = i / 48000;
      const expected =
        Math.min(1, t / sound.attack) *
        10 ** (-12 / 20) *
        (Math.sin(2 * Math.PI * 437 * t) - 0.25 * Math.sin(2 * Math.PI * 1311 * t));
      error = Math.max(error, Math.abs(samples[i] - expected));
    }
    const frame = Math.round(changeAt * 48000);
    const boundaryJump = Math.abs(samples[frame] - samples[frame - 1]);
    return {
      error,
      boundaryJump,
      changeAt,
      before: Array.from(samples.slice(frame - 3, frame)),
      after: Array.from(samples.slice(frame, frame + 3)),
    };
  });
  expect(proof.error).toBeLessThan(0.001);
  expect(proof.boundaryJump, JSON.stringify(proof)).toBeLessThan(0.02);
});

test('phrase auditions freeze musical material and live edits keep the clock running', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const enginePath = '/src/audio/engine.ts';
    const musicPath = '/src/core/music.ts';
    const { AudioEngine } = await import(enginePath);
    const { mathematicalPreset } = await import(musicPath);
    const engine = new AudioEngine();
    const sound = mathematicalPreset('sine');
    const phrase = {
      tempo: 60,
      beats: 2,
      events: [
        { beat: 0, duration: 1, notes: ['A4'], frequencies: [440] },
        { beat: 1, duration: 1, notes: ['A5'], frequencies: [880] },
      ],
    };
    await engine.auditionPhrase(sound, phrase);
    phrase.events[1].frequencies[0] = 110;
    const untilProgress = async (time: number) => {
      const deadline = performance.now() + 10000;
      while (engine.progress < time && performance.now() < deadline)
        await new Promise((resolve) => setTimeout(resolve, 25));
    };
    await untilProgress(0.3);
    const before = engine.progress;
    const updated = structuredClone(sound);
    updated.harmonics[0] = 0.3;
    engine.updateAudition(updated);
    const after = engine.progress;
    await untilProgress(1.2);
    const data = new Float32Array(2048);
    engine.analyser.getFloatTimeDomainData(data);
    // Frequency projection from the actual second scheduled note.
    const energy = (f: number) => {
      let re = 0,
        im = 0;
      for (let i = 0; i < data.length; i++) {
        re += data[i] * Math.cos((2 * Math.PI * f * i) / engine.sampleRate);
        im += data[i] * Math.sin((2 * Math.PI * f * i) / engine.sampleRate);
      }
      return (Math.hypot(re, im) * 2) / data.length;
    };
    const high = energy(880),
      unwanted = energy(110);
    await engine.auditionPhrase(sound, {
      ...phrase,
      events: [{ beat: 0, duration: 2, notes: ['A4'], frequencies: [440] }],
    });
    const replayStart = engine.progress;
    engine.stop();
    const pending = engine.auditionPhrase(sound, phrase);
    engine.stop();
    await pending;
    const modeAfterStop = engine.mode;
    await engine.context.close();
    return { before, after, high, unwanted, replayStart, modeAfterStop };
  });
  expect(proof.before).toBeGreaterThan(0.15);
  expect(proof.after).toBeGreaterThanOrEqual(proof.before);
  expect(proof.high).toBeGreaterThan(0.012);
  expect(proof.unwanted).toBeLessThan(proof.high * 0.15);
  expect(proof.replayStart).toBeLessThan(0.06);
  expect(proof.modeAfterStop).toBeNull();
});
