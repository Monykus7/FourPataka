import { expect, test } from '@playwright/test';
import { demoWorkflow } from '../helpers/demo';

test('demo source loads undoably, plays to completion and survives reload', async ({ page }) => {
  await page.goto('/');
  await demoWorkflow(page);
});

test('starter song renders finite audio without clipping at default levels', async ({ page }) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { createProject } = await import('/src/core/' + 'project.ts');
    const { renderWav } = await import('/src/audio/' + 'export.ts');
    const result = await renderWav(createProject(), {
      sampleRate: 48000,
      channels: 1,
      tailSeconds: 0,
    });
    return {
      peak: result.peak,
      beats: result.plan.score.beats,
      tracks: result.plan.score.tracks.map((track: any) => track.beats),
    };
  });
  expect(proof.beats).toBe(17);
  expect(proof.tracks).toEqual([17, 17]);
  expect(Number.isFinite(proof.peak)).toBe(true);
  expect(proof.peak).toBeGreaterThan(0.05);
  expect(proof.peak).toBeLessThan(1);
});
