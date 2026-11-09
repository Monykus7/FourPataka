import { expect, type Page } from '@playwright/test';
import { openWavImport, savedWavProject } from './wavImport';
import { evolvingWav } from '../fixtures/wavSpectral';

export const EVOLVING_KEY = 'evolvingNote';
export const EVOLVING_ENGINE = 'fourpataka:engine/spectral';

export async function createEvolvingPreset(page: Page) {
  await page.getByRole('slider', { name: 'Monitor volume', exact: true }).fill('0');
  const panel = await openWavImport(page);
  await panel.getByRole('combobox', { name: 'Reconstruction model' }).selectOption('evolving');
  await panel.getByLabel('WAV recording').setInputFiles({
    name: EVOLVING_KEY + '.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.from(evolvingWav()),
  });
  await panel.getByLabel('Onset (s)', { exact: true }).fill('0.05');
  await panel.getByLabel('Note-off (s)', { exact: true }).fill('0.52');
  await panel.getByLabel('Reference pitch (Hz)').fill('220');
  await panel.getByRole('button', { name: 'Analyze selection' }).click();
  await expect(panel.getByText('220.00 Hz · A3', { exact: true })).toBeVisible();
  await expect(
    panel.getByRole('img', { name: 'Measured RMS and estimated tonal and noise envelopes' }),
  ).toBeVisible();
  await panel.getByRole('button', { name: 'Play reconstruction', exact: true }).click();
  await expect(panel.getByText('Playing reconstruction', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Stop preview', exact: true }).click();
  await expect(panel.getByText('Playing reconstruction', { exact: true })).toHaveCount(0);
  await panel.getByText('Spectral frames', { exact: true }).click();
  await panel.getByLabel('High noise', { exact: true }).fill('0.02');
  await panel.getByLabel('Instrument name').fill('Evolving note');
  await panel.getByRole('button', { name: 'Create instrument' }).click();
  await expect(panel).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await savedWavProject(page))?.instruments.find((item) => item.key === EVOLVING_KEY)?.sound,
    )
    .toMatchObject({
      engine: {
        id: EVOLVING_ENGINE,
        settings: {
          held: expect.arrayContaining([
            expect.objectContaining({ noise: expect.arrayContaining([0.02]) }),
          ]),
        },
      },
    });
}

export async function useEvolvingScore(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page.getByRole('textbox', { name: 'Score editor' }).focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(`tempo 120\ntrack sample using ${EVOLVING_KEY} {\n A3 half\n}`);
  await expect
    .poll(
      async () =>
        (await savedWavProject(page))?.tracks.find((track) => track.key === 'sample')?.sound,
    )
    .toMatchObject({ engine: { id: EVOLVING_ENGINE } });
}
