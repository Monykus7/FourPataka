import { expect, type Page } from '@playwright/test';
export async function acousticsWorkflow(page: Page) {
  const value = (label: string) =>
    page.getByRole('spinbutton', { name: 'Chamber ' + label + ' exact value', exact: true });
  const enable = page.getByRole('checkbox', { name: 'Enable instrument acoustics', exact: true });
  await expect(enable).not.toBeChecked();
  await enable.check();
  await value('mix').fill('60');
  await value('size').fill('3.5');
  await value('decay').fill('250');
  await value('damping').fill('4200');
  await page.getByRole('button', { name: 'Save as new', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Save your sound' });
  await dialog.getByLabel('Display name', { exact: true }).fill('Body reed');
  await dialog.getByLabel('Score key', { exact: true }).fill('bodyReed');
  await dialog.getByRole('button', { name: 'Save as new instrument', exact: true }).click();
  await page.getByRole('button', { name: 'Copy A to B', exact: true }).click();
  await page.getByRole('button', { name: 'B', exact: true }).click();
  await value('mix').fill('85');
  await page.getByRole('button', { name: 'A', exact: true }).click();
  await expect(value('mix')).toHaveValue('60');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page
    .locator('.cm-content')
    .fill(
      'tempo 120\ntrack body using bodyReed {\n C4 quarter\n E4 quarter\n}\ntrack plain using sine {\n C3 half\n}',
    );
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!));
  await expect
    .poll(
      async () => (await saved()).tracks.find((t: any) => t.key === 'body')?.sound.acoustics?.mix,
    )
    .toBe(60);
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  await value('mix').fill('40');
  await page.getByRole('button', { name: 'Save preset', exact: true }).click();
  await expect
    .poll(
      async () =>
        (await saved()).instruments.find((t: any) => t.key === 'bodyReed').sound.acoustics.mix,
    )
    .toBe(40);
  expect((await saved()).tracks.find((t: any) => t.key === 'body').sound.acoustics.mix).toBe(60);
  await page.getByRole('combobox', { name: 'Apply destination', exact: true }).selectOption('body');
  await page.getByRole('button', { name: 'Apply to body', exact: true }).click();
  await expect
    .poll(async () => (await saved()).tracks.find((t: any) => t.key === 'body').sound.acoustics.mix)
    .toBe(40);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect
    .poll(async () => (await saved()).tracks.find((t: any) => t.key === 'body').sound.acoustics.mix)
    .toBe(60);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page.getByRole('button', { name: 'Reset acoustics', exact: true }).click();
  await expect(enable).not.toBeChecked();
  await expect(value('mix')).toHaveValue('25');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(enable).toBeChecked();
  await expect(value('mix')).toHaveValue('40');
  await page.getByRole('slider', { name: 'Monitor volume', exact: true }).fill('0');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await expect.poll(async () => (await saved()).comparison.A.acoustics.mix).toBe(40);
  expect((await saved()).comparison.B.acoustics.mix).toBe(85);
  expect(
    (await saved()).tracks.find((t: any) => t.key === 'plain').sound.acoustics,
  ).toBeUndefined();
}
