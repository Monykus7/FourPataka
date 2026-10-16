import { expect, type Page } from '@playwright/test';

export const SWING_SCORE =
  'tempo 120\ntime 4/4\nswing eighth 75\ntrack lead using sine {\n staccato[\n C4 eighth\n D4 eighth\n ]\n triplet[\n E4 eighth\n F4 eighth\n G4 eighth\n ]\n}\ntrack bass using sine {\n swing off\n C3 quarter\n C3 quarter\n}';

export async function swingWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill(SWING_SCORE);
  const timeline = page.getByRole('region', { name: 'Timeline', exact: true });
  await expect(timeline).toContainText('Written grid');
  await page
    .getByRole('combobox', { name: 'Inspect lead event', exact: true })
    .selectOption('lead:1');
  await expect(page.getByText('Beat 0.7500 · 0.2500 quarter beats', { exact: true })).toBeVisible();
  // Separate the second edit from the host's 900ms grouped typing history.
  await page.waitForTimeout(950);
  await editor.fill(SWING_SCORE.replace('swing eighth 75', 'swing eighth 50'));
  await expect(timeline).not.toContainText('Written grid');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).toContainText('swing eighth 75');
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Load demo score', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
}
