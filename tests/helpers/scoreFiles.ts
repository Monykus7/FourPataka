import { expect, type Page } from '@playwright/test';

export async function scoreFilesWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  const original = 'tempo 60\ntrack melody using sine {\n section A {\n C4 quarter\n}\n play A\n}';
  await editor.fill(original);
  await page.getByRole('button', { name: 'New score file', exact: true }).click();
  await page.getByRole('textbox', { name: 'Score file name' }).fill('rhythm.fourier');
  await page.getByRole('textbox', { name: 'Song key' }).fill('Demo');
  await page.getByRole('button', { name: 'Create score file' }).click();
  await expect(editor).toContainText('from song Demo');
  await expect(editor).not.toContainText('tempo 60');
  const body =
    'from song Demo\ntrack drums using sine {\n A4 whole\n}\ntrack bass using softBass {\n C2 whole\n}\ntrack melody using sine {\n play A\n D4 half\n}\n';
  await editor.fill(body);
  await expect(page.locator('.editor-status')).toContainText('Ready to play');
  await expect(page.getByRole('tablist', { name: 'Score views' })).toHaveCount(0);
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!));
  await expect
    .poll(async () => (await saved()).tracks.map((t: any) => t.key))
    .toEqual(['melody', 'drums', 'bass']);
  await page.getByRole('combobox', { name: 'Track in file' }).selectOption('bass');
  await expect(editor).toContainText('track drums');
  const text = (await saved()).scoreText;
  await page.getByRole('button', { name: 'Close rhythm.fourier tab', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'rhythm.fourier', exact: true })).toHaveCount(0);
  await expect.poll(async () => (await saved()).scoreText).toBe(text);
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New score file', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Browse score files' }).click();
  await page.getByRole('button', { name: 'Open rhythm.fourier', exact: true }).click();
  await expect(page.locator('.playing-line')).not.toHaveCount(0);
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await page.getByRole('button', { name: 'Browse score files' }).click();
  await page.getByRole('button', { name: 'Rename rhythm.fourier file', exact: true }).click();
  await page.getByRole('textbox', { name: 'Score file name' }).fill('rhythm-section.fourier');
  await page.getByRole('button', { name: 'Confirm rename file' }).click();
  await expect(
    page.getByRole('tab', { name: 'rhythm-section.fourier', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'rhythm.fourier', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page.getByRole('button', { name: 'Browse score files' }).click();
  await page
    .getByRole('button', { name: 'Delete rhythm-section.fourier file', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirm delete file' }).click();
  await expect.poll(async () => (await saved()).tracks.map((t: any) => t.key)).toEqual(['melody']);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await saved()).tracks.length).toBe(3);
  await page.reload();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: 'rhythm-section.fourier', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(editor).toContainText('track drums');
  await page.getByRole('tab', { name: 'All files', exact: true }).click();
  await expect(editor).toContainText('tempo 60');
  await expect(editor).toContainText('track bass');
  await page.getByRole('tab', { name: 'rhythm-section.fourier', exact: true }).click();
}
