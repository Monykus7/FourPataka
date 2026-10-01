import { expect, test } from '@playwright/test';

test('track maker creates chords/rests, validates pitches, and undoes a whole track', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page.getByRole('button', { name: 'Make a track', exact: true }).click();
  const maker = page.getByRole('dialog');
  await maker.getByRole('textbox', { name: 'New track name' }).fill('pad');
  await maker.getByRole('combobox', { name: 'New track instrument' }).selectOption('triangle');
  await maker.getByRole('textbox', { name: 'Event 1 pitches' }).fill('C9');
  await expect(maker.getByRole('button', { name: 'Add track', exact: true })).toBeDisabled();
  await maker.getByRole('combobox', { name: 'Event 1 kind' }).selectOption('chord');
  await maker.getByRole('combobox', { name: 'Event 2 kind' }).selectOption('rest');
  await expect(maker.locator('.maker-preview')).toContainText('chord:(Bb4 D5 F5) quarter');
  await page.screenshot({ path: '.test-results/track-maker.png', fullPage: true });
  await maker.getByRole('button', { name: 'Add track', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await expect(editor).toContainText('track pad using triangle');
  await expect(page.locator('.editor-status')).toContainText('3 tracks');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).not.toContainText('track pad');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(editor).toContainText('track pad using triangle');
});

test('command cards insert into selected tracks and update globals without duplicates', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page.getByRole('combobox', { name: 'Command insertion track' }).selectOption('bass');
  await page.getByRole('button', { name: 'Insert chord command', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await expect(editor).toContainText('F2 half\n  chord:(Bb D F)5 8th');
  await page.getByRole('button', { name: 'Insert tempo command', exact: true }).click();
  const text = await editor.innerText();
  expect(text.match(/tempo 120/g)).toHaveLength(1);
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Insert note command', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Stop all sound' }).click();
  await page.screenshot({ path: '.test-results/compose-tools.png', fullPage: true });
});
