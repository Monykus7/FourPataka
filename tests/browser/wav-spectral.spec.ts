import { expect, test } from '@playwright/test';
import {
  createEvolvingPreset,
  EVOLVING_ENGINE,
  EVOLVING_KEY,
  useEvolvingScore,
} from '../helpers/wavSpectral';
import { openWavImport, savedWavProject } from '../helpers/wavImport';
import { shortNoiseWav } from '../fixtures/wavSpectral';

test('W2 creates and independently edits an evolving preset through Compose and WAV export', async ({
  page,
}) => {
  await page.goto('/');
  await expect.poll(async () => (await savedWavProject(page))?.schemaVersion).toBe(6);
  const previous = (await savedWavProject(page))!.comparison;
  await createEvolvingPreset(page);
  expect((await savedWavProject(page))!.comparison).toEqual(previous);
  const preset = (await savedWavProject(page))!.instruments.find(
    (item) => item.key === EVOLVING_KEY,
  )!;
  await page.getByRole('button', { name: /Evolving note evolvingNote/ }).click();
  await expect(page.getByRole('combobox', { name: 'Synthesis engine' })).toHaveValue(
    EVOLVING_ENGINE,
  );
  await page.getByRole('button', { name: 'Copy A to B', exact: true }).click();
  await page.getByText('Spectral frames', { exact: true }).click();
  await page.getByLabel('High noise', { exact: true }).fill('0.12');
  await expect
    .poll(async () => (await savedWavProject(page))?.comparison.A)
    .toMatchObject({
      engine: {
        settings: {
          held: expect.arrayContaining([
            expect.objectContaining({ noise: expect.arrayContaining([0.12]) }),
          ]),
        },
      },
    });
  expect((await savedWavProject(page))!.comparison.B).toEqual(preset.sound);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByLabel('High noise', { exact: true })).toHaveValue('0.02');
  await page.reload();
  await useEvolvingScore(page);
  expect((await savedWavProject(page))!.tracks[0].sound).toEqual(preset.sound);
  await page.getByRole('button', { name: 'Export WAV', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Export WAV' });
  await panel.getByRole('button', { name: 'Render WAV', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('Render ready');
});

test('W2 reviews a short noise hit at narrow width without assigning a pitch', async ({ page }) => {
  await page.goto('/');
  const panel = await openWavImport(page);
  const model = panel.getByRole('combobox', { name: 'Reconstruction model' });
  await model.selectOption('evolving');
  await panel.getByLabel('WAV recording').setInputFiles({
    name: 'noiseHit.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.from(shortNoiseWav()),
  });
  await expect(panel.getByText('No stable fundamental', { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Create instrument' })).toBeVisible();
  await panel.screenshot({ path: '.test-results/w2-wide.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await panel.screenshot({ path: '.test-results/w2-narrow.png' });
  await model.selectOption('static');
  await expect(panel.getByRole('button', { name: 'Create instrument' })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Analyze selection' }).click();
  await expect(panel.getByRole('alert')).toContainText('body window');
});
