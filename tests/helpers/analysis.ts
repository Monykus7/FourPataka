import { expect, type Page } from '@playwright/test';

export async function analysisWorkflow(page: Page) {
  const panel = page.locator('details[aria-label="Source / output analysis"]');
  await expect(panel).toHaveJSProperty('open', false);
  await panel.locator('summary').click();
  await expect(panel).toContainText('100.0 ms');
  await expect(panel).toContainText('Stopped');
  await expect(panel.getByRole('heading', { name: /^Source model/ })).toBeVisible();
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!));
  await expect.poll(async () => (await saved())?.schemaVersion).toBe(5);
  const before = await saved();
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await page
    .locator('.experiment-card')
    .filter({ hasText: 'Compare even harmonics' })
    .getByRole('button', { name: 'Load experiment', exact: true })
    .click();
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'H1 exact magnitude', exact: true }),
  ).toHaveValue('0');
  await expect
    .poll(async () => JSON.stringify((await saved()).instruments))
    .toBe(JSON.stringify(before.instruments));
  await expect
    .poll(async () => JSON.stringify((await saved()).tracks))
    .toBe(JSON.stringify(before.tracks));
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'H1 exact magnitude', exact: true }),
  ).toHaveValue(String(before.comparison.A.harmonics[0]));
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  if (!(await panel.evaluate((element) => (element as HTMLDetailsElement).open)))
    await panel.locator('summary').click();
  const source = panel.locator('.feature-metric-group').first();
  await expect(
    source
      .locator('div')
      .filter({ has: page.locator('dt', { hasText: 'Even harmonic power' }) })
      .locator('dd'),
  ).toHaveText('100.0%');
  await page.getByRole('slider', { name: 'Monitor volume', exact: true }).fill('0');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(panel).toContainText('Measuring');
  await expect(panel.locator('dd').filter({ hasText: /dBFS$/ })).toHaveCount(2);
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await expect(panel).toContainText('Stopped');
  await expect(panel.getByText('Crest factor', { exact: true })).toHaveCount(0);
  return panel;
}
