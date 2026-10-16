import { expect, test } from '@playwright/test';
import { SWING_SCORE, swingWorkflow } from '../helpers/swing';

test('swing IDE inspection undo playback and reload preserve the canonical source', async ({
  page,
}) => {
  await page.goto('/');
  await swingWorkflow(page);
  await expect
    .poll(() => page.evaluate(() => JSON.stringify(localStorage)))
    .toContain('swing eighth 75');
  await page.reload();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Score editor' })).toHaveText(SWING_SCORE, {
    useInnerText: true,
  });
});

test('swing WAV agrees with exact scheduled gates at both rates and live comparison keeps its clock', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { createProject, reconcileTracks } = await import('/src/core/' + 'project.ts');
    const { parseScore } = await import('/src/core/' + 'parser.ts');
    const { renderWav } = await import('/src/audio/' + 'export.ts');
    const { createVoice } = await import('/src/audio/' + 'voice.ts');
    const { AudioEngine } = await import('/src/audio/' + 'engine.ts');
    let p = createProject();
    p.scoreText =
      'tempo 120\nswing eighth 75\ntrack lead using sine {\nrest eighth\nstaccato[ A4 eighth ]\nrest quarter\n}';
    const score = parseScore(
      p.scoreText,
      p.instruments.map((i: any) => i.key),
    );
    p = reconcileTracks(p, score);
    Object.assign(p.tracks[0].sound, { trim: 0, attack: 0.005, release: 0.01 });
    p.tracks[0].level = 0.25;
    p.mixGain = 1;
    const differences = [];
    const levels = [];
    for (const rate of [44100, 48000]) {
      const rendered = await renderWav(p, { sampleRate: rate, channels: 1, tailSeconds: 0 });
      const expected = new OfflineAudioContext(1, rendered.buffer.length, rate);
      const gain = expected.createGain();
      gain.gain.value = 0.25;
      gain.connect(expected.destination);
      // Independent numeric oracle: second swung eighth begins at 0.75 beats,
      // or .375 seconds at120BPM; its staccato gate is .0625 seconds.
      createVoice(expected, gain, p.tracks[0].sound, 440, 0.375, 0.0625, undefined, 0.03);
      const direct = (await expected.startRendering()).getChannelData(0);
      const actual = rendered.buffer.getChannelData(0);
      let delta = 0,
        early = 0,
        audible = 0;
      for (let i = 0; i < actual.length; i++) {
        delta = Math.max(delta, Math.abs(actual[i] - direct[i]));
        if (i / rate < 0.37) early = Math.max(early, Math.abs(actual[i]));
        if (i / rate > 0.39 && i / rate < 0.42) audible = Math.max(audible, Math.abs(actual[i]));
      }
      differences.push(delta);
      levels.push({ early, audible });
    }
    const engine = new AudioEngine();
    const scheduled: { start: number; duration: number }[] = [];
    const voice = engine.voice.bind(engine);
    engine.voice = (...args: any[]) => {
      scheduled.push({ start: args[4] - args[0].start, duration: args[5] });
      return voice(...args);
    };
    const owned = JSON.stringify(p.tracks);
    await engine.play(score, p.tracks, p.processing);
    const context = engine.context;
    const start = engine.session.start;
    const wait = async (at: number) => {
      const deadline = performance.now() + 5000;
      while (context.currentTime < at) {
        if (performance.now() > deadline) throw new Error('Audio clock stalled');
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    };
    await wait(start + 0.1);
    const before = engine.progress;
    engine.updateScoreComparison(structuredClone(p.tracks[0].sound), 'lead');
    await wait(start + 0.6);
    const continuity =
      engine.context === context && engine.session.start === start && engine.progress > before;
    const independent = JSON.stringify(p.tracks) === owned;
    const voices = [...engine.session.ownedVoices];
    engine.stop();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const nodes = voices.reduce((n: number, v: any) => n + (v.oscillators?.length ?? 0), 0);
    await context.close();
    return { differences, levels, scheduled, continuity, independent, nodes };
  });
  proof.differences.forEach((delta) => expect(delta).toBeLessThan(0.00001));
  proof.levels.forEach((level) => {
    expect(level.early).toBe(0);
    expect(level.audible).toBeGreaterThan(0.1);
  });
  expect(proof.scheduled).toHaveLength(1);
  expect(proof.scheduled[0].start).toBeCloseTo(0.375, 8);
  expect(proof.scheduled[0].duration).toBeCloseTo(0.0625, 8);
  expect(proof.continuity).toBe(true);
  expect(proof.independent).toBe(true);
  expect(proof.nodes).toBe(0);
});

test('swing autocomplete supplies empty fields and subdivision choices', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill('swi');
  await editor.press('Control+Space');
  await expect(page.locator('.cm-tooltip-autocomplete')).toBeVisible();
  await page.waitForTimeout(100);
  await editor.press('Enter');
  await expect(editor).toHaveText('swing  ', { useInnerText: true });
  await editor.fill('swing ');
  await editor.press('Control+Space');
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('16th');
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('off');
});
