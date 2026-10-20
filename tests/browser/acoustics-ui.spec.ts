import { expect, test } from '@playwright/test';
import { acousticsWorkflow } from '../helpers/acoustics';

test('instrument body controls save apply undo and reload independent settings', async ({
  page,
}) => {
  await page.goto('/');
  await acousticsWorkflow(page);
  await page.reload();
  const panel = page.getByRole('region', { name: 'Instrument acoustics' });
  await page
    .getByRole('checkbox', { name: 'Enable instrument acoustics', exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole('spinbutton', { name: 'Chamber mix exact value', exact: true }),
  ).toHaveValue('40');
  await panel.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await panel.screenshot({ path: '.test-results/acoustics-wide.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.scrollIntoViewIfNeeded();
  await panel.screenshot({ path: '.test-results/acoustics-narrow.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('body settings survive engine changes and source resets without changing their own history', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('checkbox', { name: 'Enable instrument acoustics', exact: true }).check();
  const mix = page.getByRole('spinbutton', { name: 'Chamber mix exact value', exact: true });
  await mix.fill('70');
  const engine = page.getByRole('combobox', { name: 'Synthesis engine', exact: true });
  await engine.selectOption('example:engine/basic-tone');
  await expect(mix).toHaveValue('70');
  await page.getByRole('spinbutton', { name: 'Detune (cents) exact engine value' }).fill('50');
  await expect(mix).toHaveValue('70');
  await engine.selectOption('fourpataka:engine/fourier');
  await expect(mix).toHaveValue('70');
  await page.getByRole('button', { name: 'Reset to sine', exact: true }).click();
  await expect(mix).toHaveValue('70');
});
