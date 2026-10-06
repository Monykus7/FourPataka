import { expect, type Page } from '@playwright/test';

export async function synthesisNotationWorkflow(page: Page) {
  await page.getByRole('button', { name: /^Show H17–H32/ }).click();
  const upper = page.getByRole('spinbutton', { name: 'H32 exact magnitude', exact: true });
  await upper.fill('.32');
  await page.getByRole('button', { name: 'H32 inverted polarity', exact: true }).click();
  await page.getByRole('button', { name: /^Hide H17–H32/ }).click();
  await expect(upper).toHaveCount(0);
  await page.getByRole('button', { name: /^Show H17–H32/ }).click();
  await expect(upper).toHaveValue('0.32');
  await expect(
    page.getByRole('button', { name: 'H32 inverted polarity', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  const source = 'track test using sine {\n  chord:Cmaj13#11@3 quarter\n}';
  await editor.fill(source);
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeEnabled();
  // Move from the end of the document into the symbol without selecting notes.
  await editor.press('Control+End');
  await editor.press('ArrowUp');
  await editor.press('Home');
  for (let i = 0; i < 10; i++) await editor.press('ArrowRight');
  await expect(page.locator('.chord-expansion')).toContainText('C3 · E3 · G3 · B3 · D4 · F#4 · A4');
  await expect(editor).toHaveText(source, { useInnerText: true });
  await editor.press('Control+End');
  await expect(page.locator('.chord-expansion')).toHaveCount(0);
  await editor
    .locator('.cm-line')
    .filter({ hasText: 'chord:Cmaj13#11@3' })
    .hover({ position: { x: 100, y: 12 } });
  await expect(page.locator('.chord-expansion')).toContainText('C3 · E3 · G3');
  await editor.fill('track test using sine {\n chord:CnotAChord quarter\n}');
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeDisabled();
}
