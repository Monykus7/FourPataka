import { expect, test } from '@playwright/test';
import { chorusWorkflow } from '../helpers/chorus';

test('chorus drags patches resets undoes and keeps safe owned settings through reload', async ({
  page,
}) => {
  await page.goto('/');
  await chorusWorkflow(page);
  await page.screenshot({ path: '.test-results/chorus-wide.png', fullPage: true });
  expect(
    await page.locator('.compact-pedal').evaluate((el) => el.scrollHeight <= el.clientHeight),
  ).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Pedal editing destination', exact: true })
    .selectOption('master');
  await expect(
    page.getByRole('spinbutton', {
      name: 'fourpataka:pedal/chorus 1 base delay exact value',
      exact: true,
    }),
  ).toHaveValue('5');
  await expect(
    page.getByRole('spinbutton', {
      name: 'fourpataka:pedal/chorus 1 depth exact value',
      exact: true,
    }),
  ).toHaveValue('100');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('region', { name: 'Selected pedal controls' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.test-results/chorus-narrow.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
