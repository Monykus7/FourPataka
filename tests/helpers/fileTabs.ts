import { expect, type Page } from '@playwright/test';

export async function fileTabsWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await page.getByRole('button', { name: 'New score file', exact: true }).click();
  await page.getByRole('textbox', { name: 'Score file name' }).fill('Rhythm section');
  await page.getByRole('button', { name: 'Create score file' }).click();
  const files = page.getByRole('tablist', { name: 'Score files' });
  const count = await files.getByRole('tab').count();
  const selected = files.getByRole('tab', { name: 'Rhythm section', exact: true });
  for (const name of ['drums', 'bassLine']) {
    await page
      .locator('.score-view-actions')
      .getByRole('button', { name: 'Add track to file', exact: true })
      .click();
    await page.getByRole('textbox', { name: 'Track name', exact: true }).fill(name);
    await page.getByRole('button', { name: 'Create track', exact: true }).click();
    await expect(files.getByRole('tab')).toHaveCount(count);
    await expect(selected).toHaveAttribute('aria-selected', 'true');
  }
  await expect(editor).toContainText('track drums');
  await expect(editor).toContainText('track bassLine');
  await page.getByRole('button', { name: 'Rename track', exact: true }).click();
  await page.getByRole('textbox', { name: 'Track name', exact: true }).fill('renamed');
  await editor.press('Control+End');
  await editor.press('Enter');
  await editor.pressSequentially('// keep this edit');
  await page.getByRole('button', { name: 'Confirm rename track', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('score changed');
  await expect(editor).not.toContainText('track renamed');
  await page.getByRole('button', { name: 'Cancel track operation' }).click();
  await expect(page.getByRole('tablist', { name: 'Score views' })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Track in file' }).selectOption('drums');
  await expect(editor).toContainText('track bassLine');
  await editor.press('Control+End');
  await editor.press('Enter');
  await editor.pressSequentially('t');
  await expect(selected).toHaveAttribute('aria-selected', 'true');
  await editor.pressSequentially('rack third using sine {');
  await expect(selected).toHaveAttribute('aria-selected', 'true');
  await expect(editor).toBeFocused();
  await expect(files.getByRole('tab')).toHaveCount(count);
  await editor.press('Control+Home');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(selected).toHaveAttribute('aria-selected', 'true');
}
