import { expect, type Page } from '@playwright/test';
export async function ideWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).scoreText);
  await expect(page.getByRole('button', { name: 'Apply timing', exact: true })).toHaveCount(0);
  const source =
    'tempo 180\ntime 4/4\ntime 7/8 at 4*2\ntrack lead using sine {\n repeat 3 {\n C4 quarter\n rest bar\n }\n}';
  await editor.fill(source);
  await editor.press('Home');
  await editor.press('Tab');
  expect(await editor.evaluate((el) => el === document.activeElement)).toBe(true);
  await expect.poll(saved).toMatch(/\n  }$/);
  await editor.press('Shift+Tab');
  await expect.poll(saved).toBe(source);
  await page
    .getByRole('combobox', { name: 'Panel beside score', exact: true })
    .selectOption('timeline');
  const timeline = page.getByRole('region', { name: 'Timeline', exact: true });
  await page
    .getByRole('combobox', { name: 'Inspect lead event', exact: true })
    .selectOption('lead:4');
  await expect(page.getByRole('status', { name: 'Selected timeline event' })).toContainText(
    'Bar 3',
  );
  await expect.poll(saved).toBe(source);
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Load demo score', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Load demo score', exact: true })).toBeEnabled({
    timeout: 12000,
  });
  await page.reload();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Panel beside score', exact: true })).toHaveValue(
    'timeline',
  );
  await expect(page.getByRole('textbox', { name: 'Score editor' })).toContainText('repeat 3');
  await page
    .getByRole('combobox', { name: 'Panel beside score', exact: true })
    .selectOption('reference');
  await expect(page.getByRole('region', { name: 'Command reference', exact: true })).toBeVisible();
}
