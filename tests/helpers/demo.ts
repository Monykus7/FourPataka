import { expect, type Page } from '@playwright/test';

export async function demoWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  const original = 'track personal using sine {\n C4 quarter\n}';
  await editor.fill(original);
  await page.getByRole('button', { name: 'Load demo score', exact: true }).click();
  await expect(editor).toContainText('time 1/2 at 22');
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).scoreText),
    )
    .toContain('tuplet:4:3[');
  await expect(page.getByRole('region', { name: 'Timeline', exact: true })).toContainText('7/8');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).scoreText),
    )
    .toBe(original);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  // CodeMirror virtualizes off-screen lines; inspect authoritative source for the final flourish.
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).scoreText),
    )
    .toContain('Gmaj7@5 8th');
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Load demo score', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Load demo score', exact: true })).toBeEnabled({
    timeout: 20000,
  });
  await page.reload();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Score editor' })).toContainText('Cmaj@5 quarter');
}
