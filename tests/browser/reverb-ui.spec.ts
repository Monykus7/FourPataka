import { expect, test } from '@playwright/test';
import { reverbWorkflow, verifyReverbListenStop } from '../helpers/reverb';
test('reverb drags from a scrollable equipment menu and preserves board controls copies and history', async ({
  page,
}) => {
  await page.goto('/');
  await reverbWorkflow(page);
  await verifyReverbListenStop(page);
  expect(
    await page.locator('.compact-pedal').evaluate((el) => el.scrollHeight <= el.clientHeight),
  ).toBe(true);
  await page.locator('.board-inspector').screenshot({ path: '.test-results/reverb-wide.png' });
  await page.reload();
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Pedal editing destination', exact: true })
    .selectOption('master');
  await expect(
    page.getByRole('spinbutton', {
      name: 'fourpataka:pedal/reverb 1 decay exact value',
      exact: true,
    }),
  ).toHaveValue('0.5');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.board-inspector').scrollIntoViewIfNeeded();
  await page.locator('.board-inspector').screenshot({ path: '.test-results/reverb-narrow.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
