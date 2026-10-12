import { expect, type Page } from '@playwright/test';
export async function presetModuleWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Mellow pluck mellowPluck', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Mellow pluck/ })).toBeVisible();
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page
    .locator('.cm-content')
    .fill('tempo 120\ntrack plucks using mellowPluck {\n C4 quarter\n E4 quarter\n}');
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
}
