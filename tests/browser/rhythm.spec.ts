import { expect, test } from '@playwright/test';
import { rhythmWorkflow } from '../helpers/rhythm';

test('meter changes, tuplets and articulation work through score and Track Maker with undo', async ({
  page,
}) => {
  await page.goto('/');
  await rhythmWorkflow(page);
});

test('articulation audio gates match WAV and keep fractionally timed onsets', async ({ page }) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { createVoice } = await import('/src/audio/' + 'voice.ts');
    const { playbackTiming } = await import('/src/core/' + 'articulation.ts');
    const { parseScore } = await import('/src/core/' + 'parser.ts');
    const { createProject, reconcileTracks } = await import('/src/core/' + 'project.ts');
    const { renderWav } = await import('/src/audio/' + 'export.ts');
    const score = parseScore(
      'tempo 60\ntime 4/4\ntrack lead using sine {\n staccato[ A4 quarter ]\n rest quarter\n legato[\n A4 quarter\n A4 quarter\n ]\n}',
      ['sine'],
    );
    let project = createProject();
    project.scoreText =
      'tempo 60\ntime 4/4\ntrack lead using sine {\n staccato[ A4 quarter ]\n rest quarter\n legato[\n A4 quarter\n A4 quarter\n ]\n}';
    project = reconcileTracks(project, score);
    project.tracks[0].sound.trim = 0;
    project.tracks[0].level = 0.25;
    project.mixGain = 1;
    project.tracks[0].sound.release = 0.4;
    const sound = project.tracks[0].sound;
    const context = new OfflineAudioContext(1, Math.ceil(4.5 * 48000), 48000);
    const level = context.createGain();
    level.gain.value = 0.25;
    level.connect(context.destination);
    const ends = score.events
      .filter((e: any) => e.frequencies.length)
      .map((event: any) => {
        const timing = playbackTiming(event, 60);
        return createVoice(
          context,
          level,
          sound,
          440,
          event.beat,
          timing.duration,
          undefined,
          timing.releaseLimit,
        ).end;
      });
    const direct = (await context.startRendering()).getChannelData(0);
    const rendered = (
      await renderWav(project, { sampleRate: 48000, channels: 1, tailSeconds: 0 })
    ).buffer.getChannelData(0);
    let difference = 0;
    for (let i = 0; i < Math.min(direct.length, rendered.length); i++)
      difference = Math.max(difference, Math.abs(direct[i] - rendered[i]));
    const rms = (from: number, to: number) => {
      let sum = 0;
      for (let i = Math.round(from * 48000); i < to * 48000; i++) sum += direct[i] ** 2;
      return Math.sqrt(sum / ((to - from) * 48000));
    };
    const triplets = parseScore(
      'track lead using sine {\n' + Array(300).fill('A4 8th triplet').join('\n') + '\n}',
      ['sine'],
    );
    return {
      difference,
      ends,
      held: rms(0.1, 0.4),
      gap: rms(0.55, 0.9),
      connected: rms(3.005, 3.015),
      beats: triplets.beats,
    };
  });
  expect(proof.beats).toBe(100);
  [0.53, 3.43, 4.4].forEach((end, i) => expect(proof.ends[i]).toBeCloseTo(end, 8));
  expect(proof.held).toBeGreaterThan(0.1);
  expect(proof.gap).toBe(0);
  expect(proof.connected).toBeGreaterThan(0.1);
  expect(proof.difference).toBeLessThan(0.0001);
});

test('group autocomplete inserts an empty triplet block', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill('tri');
  await editor.press('Control+Space');
  // CodeMirror guards newly opened suggestions against accidental pointer acceptance.
  await expect(page.locator('.cm-tooltip-autocomplete')).toBeVisible();
  await page.waitForTimeout(100);
  await page.getByRole('option', { name: /^triplet/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).scoreText),
    )
    .toMatch(/^triplet\[\n\s*\n\]$/);
});

test('live scheduler uses articulation gates and retains overlap beyond a tiny final note', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { AudioEngine } = await import('/src/audio/' + 'engine.ts');
    const { parseScore } = await import('/src/core/' + 'parser.ts');
    const { createProject, reconcileTracks } = await import('/src/core/' + 'project.ts');
    const source = 'tempo 60\ntrack lead using sine {\n staccato[ A4 quarter ]\n}';
    const score = parseScore(source, ['sine']);
    let project = createProject();
    project.scoreText = source;
    project = reconcileTracks(project, score);
    project.tracks[0].sound.release = 0.4;
    const engine = new AudioEngine();
    await engine.play(score, project.tracks);
    const first = (engine as any).session;
    const gateEnd = first.voices[0].end - first.start;
    engine.stop();
    const shortScore = parseScore(
      'tempo 300\ntrack lead using sine {\n legato[\n A4 quarter\n A4 64th\n ]\n}',
      ['sine'],
    );
    project.tracks[0].sound.release = 0.01;
    await engine.play(shortScore, project.tracks);
    const last = (engine as any).session;
    const clock = last.phraseSeconds;
    const sounding = last.soundingSeconds;
    const duration = last.duration;
    engine.stop();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const remaining = first.ownedVoices.size + last.ownedVoices.size;
    await engine.context?.close();
    return { gateEnd, clock, sounding, duration, remaining };
  });
  expect(proof.gateEnd).toBeCloseTo(0.53, 8);
  expect(proof.clock).toBeCloseTo(0.2125, 8);
  expect(proof.sounding).toBeCloseTo(0.22, 8);
  expect(proof.duration).toBeGreaterThanOrEqual(0.23);
  expect(proof.remaining).toBe(0);
});
