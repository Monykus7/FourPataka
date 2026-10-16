import { expect, test } from '@playwright/test';
import { analysisWorkflow } from '../helpers/analysis';

test('analysis separates editable source from pre-monitor output and experiments preserve owned copies', async ({
  page,
}) => {
  await page.goto('/');
  const panel = await analysisWorkflow(page);
  await panel.screenshot({ path: '.test-results/analysis-wide.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.screenshot({ path: '.test-results/analysis-narrow.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page
    .getByRole('checkbox', { name: 'Show Source / output analysis', exact: true })
    .uncheck();
  await expect(panel).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('checkbox', { name: 'Show Source / output analysis', exact: true }),
  ).not.toBeChecked();
});

test('analysis labels frozen score output and engine or hit source limitations', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  const text = 'tempo 60\ntrack lead using sine {\nrepeat 8 {\n C4 whole\n}\n}';
  await editor.fill(text);
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Load demo score', exact: true })).toBeDisabled();
  await editor.fill(text.replace('C4', 'D4'));
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  const panel = page.locator('details[aria-label="Source / output analysis"]');
  await panel.locator('summary').click();
  await expect(panel).toContainText('frozen previous score');
  await expect(panel).toContainText('Whole score');
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Synthesis engine', exact: true })
    .selectOption('example:engine/basic-tone');
  await expect(panel).toContainText('Unavailable for this engine');
});
