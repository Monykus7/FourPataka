import { expect, test } from '@playwright/test';

const phrase =
  '// timing stays here\ntempo 60 // quarter-note BPM\ntime 4/4 // meter\ntrack melody using brightReed {\n  C4 whole\n  D4 8th\n}\ntrack bass using softBass {\n  C2 half\n}';
test('time completion inserts a supported meter and respects the autocomplete switch', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill('time 6/');
  await editor.press('Control+Space');
  // CodeMirror guards newly opened suggestions against accidental pointer acceptance.
  await expect(page.locator('.cm-tooltip-autocomplete')).toBeVisible();
  await page.waitForTimeout(100);
  await page.locator('.cm-tooltip-autocomplete').getByRole('option', { name: /6\/8/ }).click();
  await expect(editor).toHaveText('time 6/8');
  await page.getByRole('switch', { name: 'Autocomplete', exact: true }).click();
  await editor.fill('time 6/');
  await editor.press('Control+Space');
  await expect(page.locator('.cm-tooltip-autocomplete')).toHaveCount(0);
});
test('IDE timing edits preserve meter positions and remain undoable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill(phrase);
  await editor.click();
  await editor.fill(phrase.replace('tempo 60', 'tempo 90').replace('time 4/4', 'time 6/8'));
  await expect(page.locator('.timeline-panel .tag')).toHaveText('6/8');
  await page
    .getByRole('combobox', { name: 'Inspect melody event', exact: true })
    .selectOption('melody:1');
  await expect(page.getByRole('status', { name: 'Selected timeline event' })).toContainText(
    'Bar 2 · beat 3',
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).toContainText('time 4/4');
  await expect(page.getByRole('button', { name: 'Apply timing', exact: true })).toHaveCount(0);
});

test('running timing stays frozen while malformed IDE meter blocks playback', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  const source = 'tempo 20\ntime 6/8\ntrack lead using sine {\nC4 whole\n}';
  await editor.fill(source);
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await editor.fill(source.replace('time 6/8', 'time 3/4'));
  await expect(page.locator('.timeline-panel .tag')).toHaveText('6/8');
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await expect(page.locator('.timeline-panel .tag')).toHaveText('3/4');
  await editor.fill(source.replace('time 6/8', 'time 33/8'));
  await expect(page.locator('.diagnostics-list')).toContainText('Time signature');
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeDisabled();
});

test('track maker reads IDE meter and reorders events at narrow widths', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Score editor' })
    .fill('time 6/8\ntrack lead using sine {\nC4 whole\n}');
  await page.getByRole('button', { name: 'Make a track', exact: true }).click();
  const maker = page.getByRole('dialog');
  await expect(maker.locator('.maker-phrase-heading')).toContainText('4 quarter beats · 6/8');
  await maker.getByRole('button', { name: 'Move event 3 up' }).click();
  await expect(maker.getByRole('textbox', { name: 'Event 2 pitches' })).toHaveValue('G4');
});
