import { expect, test } from '@playwright/test';

test('named dialogs focus their first field and return to the trigger on Escape, close and submit', async ({
  page,
}) => {
  await page.goto('/');
  const save = page.getByRole('button', { name: 'Save sound as new preset', exact: true });
  await save.focus();
  await save.press('Enter');
  const preset = page.getByRole('dialog', { name: 'Save your sound', exact: true });
  await expect(preset.getByRole('textbox', { name: 'Display name', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(save).toBeFocused();
  await page.getByRole('button', { name: 'Compose', exact: true }).press('Enter');
  const make = page.getByRole('button', { name: 'Make a track', exact: true });
  const modal = page.getByRole('dialog', { name: 'Make a track', exact: true });
  for (const close of ['escape', 'button', 'submit']) {
    await make.focus();
    await make.press('Enter');
    await expect(modal.getByRole('textbox', { name: 'New track name' })).toBeFocused();
    if (close === 'escape') await page.keyboard.press('Escape');
    else
      await modal
        .getByRole('button', {
          name: close === 'button' ? 'Close track maker' : 'Add track',
          exact: true,
        })
        .press('Enter');
    await expect(modal).toHaveCount(0);
    await expect(make).toBeFocused();
  }
  await page.getByRole('button', { name: 'Undo', exact: true }).press('Enter');
  await expect(page.locator('.editor-status')).toContainText('2 tracks');
});
