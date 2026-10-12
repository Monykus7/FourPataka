import { expect, test } from '@playwright/test';
import { engineInstrumentWorkflow } from '../helpers/engineInstruments';

test('independent engine controls create a score instrument with Apply undo and reload ownership', async ({
  page,
}) => {
  await page.goto('/');
  await engineInstrumentWorkflow(page);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('fourpataka.project.v1')!),
  );
  const tone = saved.instruments.find((p: any) => p.key === 'myTone');
  expect(saved.schemaVersion).toBe(5);
  expect(tone.sound.engine.settings.detune).toBe(200);
  expect(saved.tracks.find((t: any) => t.key === 'tones').sound).toEqual(tone.sound);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Engine controls' })).toBeVisible();
  await page.screenshot({ path: '.test-results/engine-controls-narrow.png', fullPage: true });
});

test('cross-engine changes retain absolute phase gain and the original audio clock', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { createVoice } = await import('/src/audio/' + 'voice.ts');
    const { mathematicalPreset } = await import('/src/core/' + 'music.ts');
    const { createEngineSound } = await import('/src/core/' + 'engineSound.ts');
    const context = new OfflineAudioContext(1, 28800, 48000);
    const sine = mathematicalPreset('sine');
    const voice = createVoice(context, context.destination, sine, 480, 0, 0.4);
    const pause = context.suspend(0.125);
    const rendering = context.startRendering();
    await pause;
    const time = context.currentTime;
    voice.update(createEngineSound('example:engine/basic-tone'));
    const sameClock = context.currentTime === time;
    await context.resume();
    const data = (await rendering).getChannelData(0);
    let error = 0;
    for (let i = 6000; i < 14400; i++)
      error = Math.max(
        error,
        Math.abs(data[i] - 10 ** (-12 / 20) * Math.sin((2 * Math.PI * 480 * i) / 48000)),
      );
    voice.dispose();
    return { sameClock, error, leftover: voice.oscillators?.length };
  });
  expect(proof.sameClock).toBe(true);
  expect(proof.error).toBeLessThan(0.002);
  expect(proof.leftover).toBe(0);
});

test('engine score WAV is deterministic and includes settings pitch release and frozen ownership', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { createProject, reconcileTracks, importProject } = await import(
      '/src/core/' + 'project.ts'
    );
    const { createEngineSound } = await import('/src/core/' + 'engineSound.ts');
    const { parseScore } = await import('/src/core/' + 'parser.ts');
    const { renderWav } = await import('/src/audio/' + 'export.ts');
    const p = createProject();
    const tone = createEngineSound('example:engine/basic-tone');
    p.instruments.push({ id: 'tone', key: 'tone', label: 'Tone', version: 1, sound: tone });
    p.scoreText = 'tempo 120\ntrack tones using tone {\n A4 quarter\n}';
    const owned = reconcileTracks(
      p,
      parseScore(
        p.scoreText,
        p.instruments.map((i: any) => i.key),
      ),
    );
    const reload = importProject(JSON.stringify(owned));
    const output = [];
    for (const rate of [44100, 48000]) {
      const first = await renderWav(owned, { sampleRate: rate, channels: 1, tailSeconds: 0 });
      const second = await renderWav(reload, { sampleRate: rate, channels: 1, tailSeconds: 0 });
      const data = first.buffer.getChannelData(0),
        copy = second.buffer.getChannelData(0);
      let difference = 0,
        sine = 0;
      for (let i = 0; i < data.length; i++)
        difference = Math.max(difference, Math.abs(data[i] - copy[i]));
      for (let i = Math.round(rate * 0.1); i < Math.round(rate * 0.2); i++)
        sine += data[i] * Math.sin((2 * Math.PI * 440 * i) / rate);
      output.push({
        rate,
        difference,
        coefficient: (sine * 2) / Math.round(rate * 0.1),
        finite: data.every((x: number) => Number.isFinite(x)),
        tail: Math.max(...Array.from(data.slice(Math.round(rate * 0.8)), Math.abs)),
        engine: first.plan.snapshot.tracks[0].sound.engine.id,
      });
    }
    return output;
  });
  for (const result of proof) {
    expect(result.difference).toBe(0);
    expect(result.coefficient).toBeCloseTo(0.8 * 0.75 * 10 ** (-12 / 20), 3);
    expect(result.finite).toBe(true);
    expect(result.tail).toBe(0);
    expect(result.engine).toBe('example:engine/basic-tone');
  }
});

test('unavailable engine settings stay visible and saveable while affected playback is blocked', async ({
  page,
}) => {
  await page.goto('/');
  const fixture = await page.evaluate(async () => {
    const { createProject } = await import('/src/core/' + 'project.ts');
    const p = createProject();
    const missing = {
      engine: {
        id: 'absent:engine/voice',
        apiVersion: 1,
        dataVersion: 9,
        settings: { future: [1, 2, 3] },
        extra: 'preserve',
      },
    };
    p.instruments[0].sound = missing;
    p.editorPresetId = p.instruments[0].id;
    p.comparison.A = structuredClone(missing);
    return JSON.stringify(p);
  });
  await page.addInitScript((fixture) => {
    if (!sessionStorage.getItem('engine-recovery-loaded')) {
      localStorage.setItem('fourpataka.project.v1', fixture);
      sessionStorage.setItem('engine-recovery-loaded', '1');
    }
  }, fixture);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Engine is not installed');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(page.locator('.toast[role=status]')).toContainText(
    'Original settings are preserved',
  );
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!)))
          .comparison.A.engine.extra,
    )
    .toBe('preserve');
  await page
    .getByRole('combobox', { name: 'Synthesis engine', exact: true })
    .selectOption('example:engine/basic-tone');
  await expect(page.getByRole('heading', { name: 'Engine controls' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Engine is not installed');
});

test('live score comparison across engines advances time and preserves the applied source', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { AudioEngine } = await import('/src/audio/' + 'engine.ts');
    const { createProject, reconcileTracks } = await import('/src/core/' + 'project.ts');
    const { parseScore } = await import('/src/core/' + 'parser.ts');
    const { createEngineSound } = await import('/src/core/' + 'engineSound.ts');
    const p = createProject();
    p.scoreText = 'tempo 60\ntrack lead using sine {\n A4 half\n A5 quarter\n}';
    const score = parseScore(
      p.scoreText,
      p.instruments.map((i: any) => i.key),
    );
    const tracks = reconcileTracks(p, score).tracks;
    const beforeCopy = JSON.stringify(tracks);
    const engine = new AudioEngine();
    await engine.play(score, tracks, p.processing);
    await new Promise((r) => setTimeout(r, 200));
    const before = engine.progress;
    engine.updateScoreComparison(createEngineSound('example:engine/basic-tone'), 'lead');
    await new Promise((r) => setTimeout(r, 250));
    const after = engine.progress;
    const rms = engine.measure().rms;
    const sameCopy = JSON.stringify(tracks) === beforeCopy;
    const voices = [...engine.session.ownedVoices];
    engine.stop();
    await new Promise((r) => setTimeout(r, 80));
    const nodes = voices.reduce((sum: number, v: any) => sum + (v.oscillators?.length ?? 0), 0);
    await engine.context.close();
    return { before, after, rms, sameCopy, nodes };
  });
  expect(proof.after).toBeGreaterThan(proof.before);
  expect(proof.rms).toBeGreaterThan(0.001);
  expect(proof.sameCopy).toBe(true);
  expect(proof.nodes).toBe(0);
});
