import { expect, test, type Page } from '@playwright/test';
import { createProject, RECOVERY_KEY, STORAGE_KEY, PREFERENCES_KEY } from '../../src/core/project';

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Local save recovery' });

test('recovery restores independent sound and pedal copies in one undo step while keeping preferences', async ({
  page,
}) => {
  const current = { ...createProject(), name: 'Current work' };
  const prior = structuredClone(current);
  prior.name = 'Previous work';
  prior.comparison.A.harmonics[0] = 0.37;
  prior.comparison.B.polarity[0] = -1;
  prior.tracks[0].sound.harmonics[0] = 0.21;
  prior.processing.master.bypass = true;
  const raw = JSON.stringify(prior, null, 2);
  await page.addInitScript(
    ({ current, raw, keys }) => {
      localStorage.setItem(keys.current, JSON.stringify(current));
      localStorage.setItem(keys.previous, raw);
      localStorage.setItem(
        keys.preferences,
        JSON.stringify({ theme: 'earth', monitor: 0.2, autocomplete: false }),
      );
    },
    {
      current,
      raw,
      keys: { current: STORAGE_KEY, previous: RECOVERY_KEY, preferences: PREFERENCES_KEY },
    },
  );
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Open local save recovery', exact: true });
  await trigger.focus();
  await trigger.press('Enter');
  await expect(
    dialog(page).getByRole('heading', { name: 'Previous work', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), RECOVERY_KEY)).toBe(raw);
  await dialog(page).getByRole('button', { name: 'Restore selected copy', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Project name', exact: true })).toHaveValue(
    'Previous work',
  );
  await expect
    .poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).name, STORAGE_KEY))
    .toBe('Previous work');
  const restored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(restored.comparison).toEqual(prior.comparison);
  expect(restored.tracks).toEqual(prior.tracks);
  expect(restored.processing).toEqual(prior.processing);
  await expect(page.getByRole('combobox', { name: 'Theme preset' })).toHaveValue('earth');
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).monitor, PREFERENCES_KEY),
  ).toBe(0.2);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Project name', exact: true })).toHaveValue(
    'Current work',
  );
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Project name', exact: true })).toHaveValue(
    'Previous work',
  );
});
