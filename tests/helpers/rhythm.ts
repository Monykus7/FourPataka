import { expect, type Page } from '@playwright/test';
export async function rhythmWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  const source =
    'time 4/4\ntrack lead using sine {\n C4 whole\n C4 8th triplet staccato\n D4 8th triplet legato\n E4 8th triplet\n}';
  await editor.fill(source);
  await page.getByRole('textbox', { name: 'Meter change signature', exact: true }).fill('7/8');
  await page.getByRole('spinbutton', { name: 'Meter change position', exact: true }).fill('4');
  await page.getByRole('button', { name: 'Add meter change', exact: true }).click();
  await expect(editor).toContainText('time 7/8 at 4');
  const timeline = page.getByRole('region', { name: 'Timeline', exact: true });
  await expect(timeline).toContainText('7/8');
  await page
    .getByRole('combobox', { name: 'Inspect lead event', exact: true })
    .selectOption('lead:1');
  await expect(page.getByRole('status', { name: 'Selected timeline event' })).toContainText(
    'Bar 2 · beat 1',
  );
  await expect(page.getByRole('status', { name: 'Selected timeline event' })).toContainText(
    'staccato',
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).toHaveText(source, { useInnerText: true });
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(editor).toContainText('time 7/8 at 4');
  await page.getByRole('button', { name: 'Make a track', exact: true }).click();
  await page.getByRole('combobox', { name: 'Event 1 rhythm', exact: true }).selectOption('triplet');
  await page
    .getByRole('combobox', { name: 'Event 1 articulation', exact: true })
    .selectOption('staccato');
  await page.getByRole('combobox', { name: 'Event 2 rhythm', exact: true }).selectOption('custom');
  await page.getByRole('spinbutton', { name: 'Event 2 tuplet notes', exact: true }).fill('5');
  await page.getByRole('spinbutton', { name: 'Event 2 tuplet time', exact: true }).fill('4');
  await page
    .getByRole('combobox', { name: 'Event 2 articulation', exact: true })
    .selectOption('legato');
  await page.getByRole('combobox', { name: 'Event 3 dots', exact: true }).selectOption('.');
  await expect(page.locator('.maker-preview')).toContainText('C4 quarter triplet staccato');
  await expect(page.locator('.maker-preview')).toContainText('E4 quarter tuplet:5:4 legato');
  await expect(page.locator('.maker-preview')).toContainText('G4 half.');
  await page.getByRole('button', { name: 'Add track', exact: true }).click();
  await expect(editor).toContainText('tuplet:5:4 legato');
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeEnabled();
}
