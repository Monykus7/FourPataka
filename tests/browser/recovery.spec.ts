import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  createProject,
  RECOVERY_KEY,
  STORAGE_KEY,
  PREFERENCES_KEY,
  UNREADABLE_KEY,
} from '../../src/core/project';

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
  prior.processing.master.bypassed = true;
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
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Listen', exact: true })).toHaveClass(/playing/);
  const trigger = page.getByRole('button', { name: 'Open local save recovery', exact: true });
  await trigger.focus();
  await trigger.press('Enter');
  await expect(
    dialog(page).getByRole('heading', { name: 'Previous work', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), RECOVERY_KEY)).toBe(raw);
  await dialog(page).getByRole('button', { name: 'Restore selected copy', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Listen', exact: true })).not.toHaveClass(
    /playing/,
  );
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

test('exports captured original bytes even after slots change, without restoring or adding history', async ({
  page,
}) => {
  const current = createProject();
  const raw = JSON.stringify({ ...current, name: 'Saved Ω copy' }, null, 2);
  const damaged = '{broken Ω\n';
  await page.addInitScript(
    ({ current, raw, damaged }) => {
      localStorage.setItem('fourpataka.project.v1', JSON.stringify(current));
      localStorage.setItem('fourpataka.project.recovery.v1', raw);
      localStorage.setItem('fourpataka.project.unreadable.v1', damaged);
    },
    { current, raw, damaged },
  );
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Open local save recovery', exact: true });
  await trigger.click();
  await expect(dialog(page).getByRole('heading', { name: 'Saved Ω copy' })).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem('fourpataka.project.recovery.v1', 'newer slot contents'),
  );
  const download = page.waitForEvent('download');
  await dialog(page).getByRole('button', { name: 'Export selected copy', exact: true }).click();
  expect(await readFile((await (await download).path())!, 'utf8')).toBe(raw);
  await dialog(page)
    .getByRole('radio', { name: /Unreadable save/ })
    .check();
  await expect(
    dialog(page).getByRole('button', { name: 'Restore selected copy', exact: true }),
  ).toBeDisabled();
  const badDownload = page.waitForEvent('download');
  await dialog(page).getByRole('button', { name: 'Export selected copy', exact: true }).click();
  expect(await readFile((await (await badDownload).path())!, 'utf8')).toBe(damaged);
  await dialog(page).press('Escape');
  await expect(dialog(page)).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await expect(page.getByRole('textbox', { name: 'Project name', exact: true })).toHaveValue(
    current.name,
  );
});

test('damaged startup retains original bytes and offers persistent recovery review after reload', async ({
  page,
}) => {
  const prior = { ...createProject(), name: 'Recovered session' };
  const raw = JSON.stringify(prior, null, 2);
  await page.addInitScript(
    ({ raw }) => {
      if (sessionStorage.getItem('recovery-fixture-installed')) return;
      sessionStorage.setItem('recovery-fixture-installed', 'yes');
      localStorage.setItem('fourpataka.project.v1', '{damaged first save');
      localStorage.setItem('fourpataka.project.recovery.v1', raw);
    },
    { raw },
  );
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Project name', exact: true })).toHaveValue(
    'Recovered session',
  );
  const notice = page.getByRole('complementary', { name: 'Local save recovery notice' });
  await expect(notice).toContainText('Recovered the previous local save');
  await notice.getByRole('button', { name: 'Review recovery copies' }).click();
  await dialog(page)
    .getByRole('radio', { name: /Unreadable save/ })
    .check();
  await expect(dialog(page).getByRole('button', { name: 'Restore selected copy' })).toBeDisabled();
  await dialog(page).getByRole('button', { name: 'Close recovery' }).click();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Project name', exact: true })).toHaveValue(
    'Recovered session',
  );
  expect(await page.evaluate((key) => localStorage.getItem(key), UNREADABLE_KEY)).toBe(
    '{damaged first save',
  );
  expect(await page.evaluate((key) => localStorage.getItem(key), RECOVERY_KEY)).toBe(raw);
});

test('empty recovery and malformed backup remain keyboard usable at 390 pixels', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Open local save recovery', exact: true });
  await trigger.click();
  await expect(dialog(page)).toContainText('No recovery copies are available yet');
  await expect(dialog(page).getByRole('button', { name: 'Restore selected copy' })).toBeDisabled();
  await dialog(page).press('Escape');
  await expect(trigger).toBeFocused();
  await page.evaluate(() => {
    localStorage.setItem('fourpataka.project.recovery.v1', '{invalid backup');
    localStorage.setItem('fourpataka.project.unreadable.v1', '');
  });
  await trigger.click();
  await expect(dialog(page).getByRole('radio')).toHaveCount(2);
  await expect(dialog(page).getByRole('button', { name: 'Restore selected copy' })).toBeDisabled();
  await expect(dialog(page).getByRole('button', { name: 'Export selected copy' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  const bounds = await dialog(page).boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: '.test-results/recovery-mobile.png', fullPage: true });
});

test('full storage leaves the damaged latest save exportable without an archival write', async ({
  page,
}) => {
  const backup = { ...createProject(), name: 'Quota recovery' };
  const damaged = '{unarchived Ω damage';
  await page.addInitScript(
    ({ backup, damaged }) => {
      localStorage.setItem('fourpataka.project.v1', damaged);
      localStorage.setItem('fourpataka.project.recovery.v1', JSON.stringify(backup));
      localStorage.setItem('fourpataka.project.unreadable.v1', '{older damage');
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith('fourpataka.project.'))
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    },
    { backup, damaged },
  );
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Project name', exact: true })).toHaveValue(
    'Quota recovery',
  );
  await expect(page.getByText('Save unavailable', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open local save recovery' }).click();
  await dialog(page)
    .getByRole('radio', { name: /Unreadable save \(latest\)/ })
    .check();
  await expect(dialog(page).getByRole('button', { name: 'Restore selected copy' })).toBeDisabled();
  const download = page.waitForEvent('download');
  await dialog(page).getByRole('button', { name: 'Export selected copy' }).click();
  expect(await readFile((await (await download).path())!, 'utf8')).toBe(damaged);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(damaged);
  expect(await page.evaluate((key) => localStorage.getItem(key), UNREADABLE_KEY)).toBe(
    '{older damage',
  );
});
