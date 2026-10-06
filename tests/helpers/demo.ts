import { EXAMPLE_SCORE, createProject } from '../../src/core/project';
import { parseScore } from '../../src/core/parser';
import { expect, type Page } from '@playwright/test';

export async function demoWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  const original = 'track personal using sine {\n C4 quarter\n}';
  await editor.fill(original);
  await page.getByRole('button', { name: 'Load demo score', exact: true }).click();
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).scoreText);
  await expect.poll(saved).toBe(EXAMPLE_SCORE);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).scoreText),
    )
    .toBe(original);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect.poll(saved).toBe(EXAMPLE_SCORE);
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Load demo score', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Load demo score', exact: true })).toBeEnabled({
    timeout: Math.max(
      20000,
      parseScore(
        EXAMPLE_SCORE,
        createProject().instruments.map((p) => p.key),
        createProject().processing.library.map((p) => p.key),
      ).seconds *
        1000 +
        3000,
    ),
  });
  await page.reload();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Score editor' })).toBeVisible();
  await expect.poll(saved).toBe(EXAMPLE_SCORE);
}
