import { expect, test } from '@playwright/test';
import { phaserWorkflow } from '../helpers/phaser';

test('phaser drags cables selects exact stages and retains independent copies through reload', async ({
  page,
}) => {
  await page.goto('/');
  await phaserWorkflow(page);
  await page.screenshot({ path: '.test-results/phaser-wide.png', fullPage: true });
  const tile = page.locator('.compact-pedal');
  expect(await tile.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Pedal editing destination', exact: true })
    .selectOption('master');
  await expect(
    page.getByRole('combobox', {
      name: 'fourpataka:pedal/phaser 1 stages exact value',
      exact: true,
    }),
  ).toHaveValue('8');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('region', { name: 'Selected pedal controls' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.test-results/phaser-narrow.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
