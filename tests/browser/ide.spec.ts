import { expect, test } from '@playwright/test';
import { ideWorkflow } from '../helpers/ide';
test('IDE indentation, expressions, repeats, bar rests and panel layout survive playback and reload', async ({
  page,
}) => {
  await page.goto('/');
  await ideWorkflow(page);
});
test('repeated positional rests use the same compiled timing for WAV output', async ({ page }) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { createProject, reconcileTracks } = await import('/src/core/' + 'project.ts');
    const { parseScore } = await import('/src/core/' + 'parser.ts');
    const { renderWav } = await import('/src/audio/' + 'export.ts');
    let project = createProject();
    project.scoreText =
      'tempo 120\ntime 4/4\ntime 7/8 at 4*2\ntrack lead using sine {\nrepeat 3 { C4 quarter\nrest bar\n}\n}';
    const score = parseScore(
      project.scoreText,
      project.instruments.map((i: any) => i.key),
      project.processing.library.map((p: any) => p.key),
    );
    project = reconcileTracks(project, score);
    const render = await renderWav(project, { sampleRate: 48000, channels: 1, tailSeconds: 0 });
    return {
      beats: score.beats,
      starts: score.events.filter((e: any) => e.notes.length).map((e: any) => e.beat),
      seconds: render.buffer.duration,
      peak: render.peak,
    };
  });
  expect(proof.beats).toBe(11.5);
  expect(proof.starts).toEqual([0, 4, 8]);
  expect(proof.seconds).toBeGreaterThan(5.75);
  expect(proof.peak).toBeGreaterThan(0);
});
