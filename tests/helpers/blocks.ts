import { expect, type Page } from '@playwright/test';

export async function blockWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  const source =
    'track lead using sine {\nlegato[\ntriplet[\nC4 eighth\nGmaj7 eighth\nD4 eighth\n]\nE4 quarter\n]\nstaccato[\nF5 quarter\nGmaj7 eighth\nrest eighth\n]\nA4 quarter\n}';
  await editor.fill(source);
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeEnabled();
  await page
    .getByRole('combobox', { name: 'Inspect lead event', exact: true })
    .selectOption('lead:4');
  await expect(page.getByRole('status', { name: 'Selected timeline event' })).toContainText(
    'staccato',
  );
  await editor.fill(source.replace('staccato[', 'staccato'));
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeDisabled();
  await expect(page.locator('.diagnostics-list')).toContainText('Unexpected closing');
  await editor.fill(source);
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Load demo score', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Load demo score', exact: true })).toBeEnabled({
    timeout: 10000,
  });
  await editor.fill('track lead using sine {\nstaccato[ C4 quarter\n] }');
  await page.getByRole('button', { name: 'Insert note command', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Inspect lead event', exact: true })
    .selectOption('lead:1');
  await expect(page.getByRole('status', { name: 'Selected timeline event' })).toContainText('C5');
  await expect(page.getByRole('status', { name: 'Selected timeline event' })).not.toContainText(
    'staccato',
  );
  await editor.fill(source);
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeEnabled();
  await page.reload();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Score editor' })).toContainText('Gmaj7 eighth');
}
