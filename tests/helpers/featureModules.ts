import { expect, type Page } from '@playwright/test';
export async function featureModuleWorkflow(page: Page) {
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!));
  await expect.poll(async () => (await saved())?.schemaVersion).toBe(6);
  const initial = await saved();
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  const pair = page.getByRole('region', { name: 'Partial pair', exact: true });
  await pair.getByRole('spinbutton', { name: 'Partial pair H2 strength exact value' }).fill('0.6');
  await expect
    .poll(
      async () => (await saved()).featureSettings?.['example:feature/partial-pair']?.settings.h2,
    )
    .toBe(0.6);
  await pair.getByRole('button', { name: 'Load partial pair', exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'H2 exact magnitude', exact: true }),
  ).toHaveValue('0.6');
  await expect
    .poll(async () => JSON.stringify((await saved()).instruments))
    .toBe(JSON.stringify(initial.instruments));
  await expect
    .poll(async () => JSON.stringify((await saved()).tracks))
    .toBe(JSON.stringify(initial.tracks));
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'H2 exact magnitude', exact: true }),
  ).toHaveValue(String(initial.comparison.A.harmonics[1]));
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await expect(pair.locator('dd').first()).toContainText('dBFS');
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await expect(pair.locator('dd').first()).toHaveText('Stopped');
  const beforeHide = JSON.stringify(await saved());
  await page.getByRole('checkbox', { name: 'Show Partial pair', exact: true }).uncheck();
  await expect(pair).toHaveCount(0);
  await expect.poll(async () => JSON.stringify(await saved())).toBe(beforeHide);
  await page.reload();
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Show Partial pair', exact: true }),
  ).not.toBeChecked();
  await page.getByRole('checkbox', { name: 'Show Partial pair', exact: true }).check();
  await expect(
    pair.getByRole('spinbutton', { name: 'Partial pair H2 strength exact value' }),
  ).toHaveValue('0.6');
  await pair.getByRole('button', { name: 'Insert octave pair', exact: true }).click();
  await expect(page.locator('.cm-content')).toContainText('chord:(C4 C5) quarter');
  await expect(page.locator('.cm-content')).toBeFocused();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.cm-content')).not.toContainText('chord:(C4 C5) quarter');
}
