import { expect, type Page } from '@playwright/test';

const fixture =
  'tempo 60\ntime 4/4\n// global retained\ntrack lead using sine {\n legato[C4 quarter]\n}\ntrack bass using softBass {\n C2 whole\n}\n';
const saved = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).scoreText);

export async function unfinishedTrackWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  const source =
    'tempo 120\ntrack lead using sine {\n \n}\ntrack bass using softBass {\n C2 quarter\n}';
  await editor.fill(source);
  const file = page.getByRole('tab', { name: 'score.fourier', exact: true });
  await editor.press('Control+Home');
  await editor.press('ArrowDown');
  await editor.press('ArrowDown');
  await editor.press('End');
  await editor.pressSequentially('t');
  await expect(file).toHaveAttribute('aria-selected', 'true');
  await expect(editor).toBeFocused();
  const incomplete = source.replace(' \n}', ' triplet[\n C4 8th\n D4 8th\n E4 8th\n}');
  await editor.fill(incomplete);
  await expect(file).toHaveAttribute('aria-selected', 'true');
  await expect(editor).toContainText('track bass');
  await expect.poll(() => saved(page)).toBe(incomplete);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(file).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(file).toHaveAttribute('aria-selected', 'true');
  await editor.fill(incomplete.replace('E4 8th\n}', 'E4 8th\n ]\n}'));
  await expect(page.locator('.editor-status')).toContainText('Ready to play');
  await expect(page.getByRole('tablist', { name: 'Score views' })).toHaveCount(0);
}

export async function scoreWorkspaceWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill(fixture);
  await expect.poll(() => saved(page)).toBe(fixture);
  const picker = page.getByRole('combobox', { name: 'Track in file' });
  await picker.selectOption('lead');
  await expect(editor).toContainText('track bass');
  await editor.fill(fixture.replace('C4', 'G4'));
  await expect.poll(() => saved(page)).toBe(fixture.replace('C4', 'G4'));
  await picker.selectOption('bass');
  await expect(editor).toContainText('track lead');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => saved(page)).toBe(fixture);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect.poll(() => saved(page)).toBe(fixture.replace('C4', 'G4'));
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rename track', exact: true })).toBeDisabled();
  await expect(page.locator('.score-editor .playing-line')).not.toHaveCount(0);
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect.poll(() => saved(page)).toBe(fixture.replace('C4', 'G4'));
  await expect(picker.locator('option')).toHaveCount(2);
}

export async function trackOperationsWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill(
    'tempo 120\ntrack all using sine {\n C4 quarter\n}\ntrack bass using softBass {\n C2 quarter\n}',
  );
  const picker = page.getByRole('combobox', { name: 'Track in file' });
  const tabs = page.getByRole('tablist', { name: 'Score files' });
  const count = await tabs.getByRole('tab').count();
  await picker.selectOption('all');
  await page.getByRole('button', { name: 'Rename track', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Track name', exact: true })).toBeFocused();
  await page.getByRole('textbox', { name: 'Track name', exact: true }).press('Escape');
  await expect(page.getByRole('button', { name: 'Rename track', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Rename track', exact: true }).click();
  await page.getByRole('textbox', { name: 'Track name', exact: true }).fill('bass');
  await page.getByRole('button', { name: 'Confirm rename track' }).click();
  await expect(page.getByRole('alert')).toContainText('already');
  await page.getByRole('textbox', { name: 'Track name', exact: true }).fill('melody');
  await page.getByRole('button', { name: 'Confirm rename track' }).click();
  await expect(picker).toHaveValue('melody');
  await expect(tabs.getByRole('tab')).toHaveCount(count);
  await page.getByRole('button', { name: 'Remove track', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm remove track' }).click();
  await expect(editor).not.toContainText('track melody');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).toContainText('track melody');
  await page
    .locator('.score-view-actions')
    .getByRole('button', { name: 'Add track to file', exact: true })
    .click();
  await page.getByRole('textbox', { name: 'Track name', exact: true }).fill('harmony');
  await page.getByRole('combobox', { name: 'New track instrument' }).selectOption('triangle');
  await page.getByRole('button', { name: 'Create track', exact: true }).click();
  await expect(picker).toHaveValue('harmony');
  await expect(editor).toContainText('track bass');
  await expect(tabs.getByRole('tab')).toHaveCount(count);
  await expect.poll(() => saved(page)).toContain('track harmony using triangle');
  const before = await saved(page);
  await editor.fill(
    before.replace(/track harmony[\s\S]*$/, 'track harmony using triangle {\n C4 quarter'),
  );
  await expect(page.getByRole('tab', { name: 'score.fourier', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(editor).toContainText('track bass');
  await expect(page.locator('.diagnostics-list')).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => saved(page)).toBe(before);
}

export async function chordViewWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  const source =
    'tempo 120\ntrack lead using sine {\n chord:Cwide2@3 quarter\n}\ntrack bass using softBass {\n C2 quarter\n}';
  await editor.fill(source);
  await editor.press('Control+Home');
  await editor.press('ArrowDown');
  await editor.press('ArrowDown');
  await editor.press('Home');
  for (let i = 0; i < 10; i++) await editor.press('ArrowRight');
  await expect(page.locator('.chord-expansion')).toContainText('C3 · D4 · G4');
  await page.getByRole('combobox', { name: 'Track in file' }).selectOption('bass');
  await editor.focus();
  await expect(page.locator('.chord-expansion')).toContainText('C3 · D4 · G4');
  await editor.fill(source.replace('Cwide2', 'Fwide2'));
  await expect.poll(() => saved(page)).toBe(source.replace('Cwide2', 'Fwide2'));
}
