import { expect, test } from '@playwright/test';

test('paper studio has two primary views, a smaller Learn link, and no mobile overflow', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('navigation', { name: 'Studio views' }).getByRole('button')).toHaveCount(2);
  const primary = await page.getByRole('button', { name: 'Instrument Shape your sound' }).boundingBox();
  const learn = await page.getByRole('button', { name: 'Learn', exact: true }).boundingBox();
  expect(learn!.height).toBeLessThan(primary!.height * .65);
  expect(await page.locator('.panel').first().evaluate(el => getComputedStyle(el).backgroundImage)).toContain('wrinkled-paper.png');
  await page.screenshot({ path: '.test-results/paper-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.test-results/paper-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hear the idea.' })).toBeVisible();
});
