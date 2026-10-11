import { expect, type Page } from '@playwright/test';

const fixture =
  'tempo 60\ntime 4/4\n// global retained\ntrack lead using sine { // header\n legato[\n  repeat 2 { C4 quarter\n D4 quarter\n }\n ]\n}\ntime 7/8 at 4\ntrack bass using softBass {\n C2 whole\n}\n';
const saved = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).scoreText);

export async function scoreWorkspaceWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill(fixture);
  await expect.poll(() => saved(page)).toBe(fixture);
  const tabs = page.getByRole('tablist', { name: 'Score views' });
  await tabs.getByRole('tab', { name: 'lead', exact: true }).click();
  await expect(editor).toContainText('repeat 2');
  await expect(editor).not.toContainText('tempo');
  await expect(editor).not.toContainText('track bass');
  const lead =
    'track lead using sine { // header\n legato[\n  repeat 2 { C4 quarter\n D4 quarter\n }\n ]\n}';
  await editor.fill(lead.replace('C4', 'G4'));
  await expect.poll(() => saved(page)).toBe(fixture.replace('C4', 'G4'));
  await tabs.getByRole('tab', { name: 'bass', exact: true }).click();
  await expect(editor).toContainText('C2 whole');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => saved(page)).toBe(fixture);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect.poll(() => saved(page)).toBe(fixture.replace('C4', 'G4'));
  await tabs.getByRole('tab', { name: 'lead', exact: true }).focus();
  await tabs.getByRole('tab', { name: 'lead', exact: true }).press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'bass', exact: true })).toBeFocused();
  await expect(tabs.getByRole('tab', { name: 'bass', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rename track', exact: true })).toBeDisabled();
  await tabs.getByRole('tab', { name: 'lead', exact: true }).click();
  await expect(page.locator('.score-editor .playing-line')).toHaveCount(1);
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect.poll(() => saved(page)).toBe(fixture.replace('C4', 'G4'));
  await expect(tabs.getByRole('tab', { name: 'lead', exact: true })).toBeVisible();
  await expect(tabs.getByRole('tab', { name: 'bass', exact: true })).toBeVisible();
}

export async function trackOperationsWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill(
    'tempo 120\ntrack all using sine {\n C4 quarter\n}\ntrack bass using softBass {\n C2 quarter\n}',
  );
  const tabs = page.getByRole('tablist', { name: 'Score views' });
  await tabs.getByRole('tab', { name: 'all', exact: true }).click();
  await expect(page.getByRole('tabpanel')).toHaveAttribute(
    'aria-labelledby',
    'score-view-track-all',
  );
  await page.getByRole('button', { name: 'Rename track', exact: true }).click();
  await page.getByRole('textbox', { name: 'Track tab name' }).fill('bass');
  await page.getByRole('button', { name: 'Confirm rename track' }).click();
  await expect(page.getByRole('alert')).toContainText('already');
  await page.getByRole('textbox', { name: 'Track tab name' }).fill('melody');
  await page.getByRole('button', { name: 'Confirm rename track' }).click();
  await expect(tabs.getByRole('tab', { name: 'melody', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect.poll(() => saved(page)).toContain('track melody using sine');
  await page.getByRole('button', { name: 'Remove track', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm remove track' }).click();
  await expect(tabs.getByRole('tab', { name: 'melody', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(tabs.getByRole('tab', { name: 'melody', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New track tab', exact: true }).click();
  await page.getByRole('textbox', { name: 'Track tab name' }).fill('harmony');
  await page.getByRole('combobox', { name: 'New track instrument' }).selectOption('triangle');
  await page.getByRole('button', { name: 'Create track tab' }).click();
  await expect(editor).toContainText('track harmony using triangle');
  await expect(editor).toContainText('rest bar');
  const before = await saved(page);
  await editor.fill('track harmony using triangle {\n C4 quarter');
  await expect(tabs.getByRole('tab', { name: 'All score', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(editor).toContainText('track bass');
  await expect(page.locator('.diagnostics-list')).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => saved(page)).toBe(before);
  await expect(tabs.getByRole('tab', { name: 'harmony', exact: true })).toBeVisible();
}
