import { expect, type Page } from '@playwright/test';
export async function engineInstrumentWorkflow(page: Page) {
  await page
    .getByRole('combobox', { name: 'Synthesis engine', exact: true })
    .selectOption('example:engine/basic-tone');
  await expect(page.getByRole('heading', { name: 'Engine controls', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Partial inspector', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('spinbutton', { name: 'Detune (cents) exact engine value' }).fill('100');
  await page.getByRole('button', { name: 'Save as new', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Save your sound' });
  await dialog.getByLabel('Display name', { exact: true }).fill('My tone');
  await dialog.getByLabel('Score key', { exact: true }).fill('myTone');
  await dialog.getByRole('button', { name: 'Save as new instrument', exact: true }).click();
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page
    .locator('.cm-content')
    .fill('tempo 120\ntrack tones using myTone {\n C4 quarter\n E4 quarter\n}');
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Detune (cents) exact engine value' }).fill('200');
  await page.getByRole('button', { name: 'Save preset', exact: true }).click();
  const trackDetune = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('fourpataka.project.v1')!).tracks.find(
          (t: any) => t.key === 'tones',
        ).sound.engine.settings.detune,
    );
  await expect.poll(trackDetune).toBe(100);
  await page.getByRole('button', { name: 'Apply to tones', exact: true }).click();
  await expect.poll(trackDetune).toBe(200);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(trackDetune).toBe(100);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect.poll(trackDetune).toBe(200);
  await page.reload();
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'Detune (cents) exact engine value' }),
  ).toHaveValue('200');
}
