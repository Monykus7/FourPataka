import { expect, test } from '@playwright/test';
import { sectionsWorkflow } from '../helpers/sections';
import { completeCommand } from '../helpers/autocomplete';

test('named sections define silently, rename one track, trim and retain source playback context', async ({
  page,
}) => {
  await page.goto('/');
  await sectionsWorkflow(page);
  await page.screenshot({ path: '.test-results/sections-1440.png', fullPage: true });
});

test('section completion stays track-local and unused definitions retain chord previews and diagnostics', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const source =
    'track melody using sine {\n section Verse {\n chord:Cwide2@3 quarter\n}\n play V\n}\ntrack bass using softBass {\n section BassOnly {\n C2 whole\n}\n}';
  const editor = await completeCommand(page, source, 'Verse', 6);
  await expect(editor).toContainText('play Verse');
  await editor.press('Control+Home');
  await editor.press('ArrowDown');
  await editor.press('ArrowDown');
  await editor.press('Home');
  for (let i = 0; i < 10; i++) await editor.press('ArrowRight');
  await expect(page.locator('.chord-expansion')).toContainText('C3 · D4 · G4');
  await editor.fill('track melody using sine {\n section A {\n Q4 quarter\n}\n play A\n}');
  await expect(page.locator('.diagnostics-list')).toContainText('called via A at line 5');
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeDisabled();
  await editor.fill('track melody using sine {\n section A {\n chord:Cwide2@3 quarter\n}\n}');
  await editor.press('Control+Home');
  await editor.press('ArrowDown');
  await editor.press('ArrowDown');
  await editor.press('Home');
  for (let i = 0; i < 10; i++) await editor.press('ArrowRight');
  await expect(page.locator('.chord-expansion')).toContainText('C3 · D4 · G4');
  await expect(page.locator('.editor-status')).toContainText('0 quarter beats');
});

test('trimmed sections render like explicit music at both sample rates with finite tails', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { createProject, reconcileTracks } = await import('/src/core/' + 'project.ts');
    const { parseScore } = await import('/src/core/' + 'parser.ts');
    const { renderWav } = await import('/src/audio/' + 'export.ts');
    const { emptyChain } = await import('/src/core/' + 'pedals.ts');
    const phrase =
      'staccato[\n chord:Cmaj7 half\n]\n D4 quarter\n triplet[\n E4 8th\n F4 8th\n G4 8th\n]';
    const named = `section A {\n${phrase}\n}\n play A trim 1.5 {\n A4 quarter\n}\n play A\n rest bar`;
    const flat = `staccato[\n chord:Cmaj7 half\n]\n D4 8th\n A4 quarter\n${phrase}\n rest bar`;
    const projectFor = (body: string) => {
      let project = createProject();
      project.scoreText = `tempo 120\ntime 4/4\ntrack a using sine {\n${body}\n}`;
      project = reconcileTracks(
        project,
        parseScore(
          project.scoreText,
          project.instruments.map((p: any) => p.key),
        ),
      );
      project.processing.master = emptyChain();
      project.processing.tracks.a = emptyChain();
      project.tracks[0].level = 0.1;
      project.mixGain = 1;
      return project;
    };
    const output = [];
    for (const sampleRate of [44100, 48000]) {
      const first = await renderWav(projectFor(named), { sampleRate, channels: 1, tailSeconds: 0 });
      const second = await renderWav(projectFor(flat), { sampleRate, channels: 1, tailSeconds: 0 });
      const a = first.buffer.getChannelData(0),
        b = second.buffer.getChannelData(0);
      let error = 0,
        finite = true;
      for (let i = 0; i < a.length; i++) {
        error = Math.max(error, Math.abs(a[i] - b[i]));
        finite &&= Number.isFinite(a[i]);
      }
      output.push({
        sampleRate,
        frames: a.length,
        expectedFrames: b.length,
        error,
        finite,
        tail: first.endPeak,
        beats: first.plan.score.beats,
      });
    }
    return output;
  });
  for (const result of proof) {
    expect(result.frames).toBe(result.expectedFrames);
    expect(result.beats).toBe(8);
    expect(result.error).toBeLessThan(0.00001);
    expect(result.finite).toBe(true);
    expect(result.tail).toBe(0);
  }
});
