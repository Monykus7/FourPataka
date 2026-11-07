import { expect, type Page } from '@playwright/test';
import { noteWav } from '../fixtures/wavNote';
import type { Project } from '../../src/core/project';

export const WAV_SCORE = 'tempo 120\ntrack sample using sampledNote {\n A3 half\n}';

export const savedWavProject = (page: Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem('fourpataka.project.v1') ?? 'null') as Project | null,
  );

export async function openWavImport(page: Page) {
  await page.getByRole('button', { name: 'Import WAV', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'WAV to instrument' });
  await expect(panel).toBeVisible();
  return panel;
}

export async function createWavPreset(page: Page, stereo = false) {
  await page.getByRole('slider', { name: 'Monitor volume', exact: true }).fill('0');
  const panel = await openWavImport(page);
  await panel.getByLabel('WAV recording').setInputFiles({
    name: 'sampledNote.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.from(noteWav(48000, stereo)),
  });
  if (stereo) {
    await expect(panel.getByText('The mono mix loses energy', { exact: false })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Create instrument' })).toHaveCount(0);
    await panel.getByRole('combobox', { name: 'Channel', exact: true }).selectOption('left');
  }
  await expect(panel.getByLabel('Crop start (s)')).toBeVisible();
  await panel.getByLabel('Crop start (s)').fill('0.06');
  await panel.getByLabel('Crop end (s)').fill('0.65');
  await panel.getByLabel('Onset (s)', { exact: true }).fill('0.02');
  await panel.getByLabel('Note-off (s)', { exact: true }).fill('0.39');
  await panel.getByLabel('Reference pitch (Hz)').fill('220');
  await panel.getByRole('button', { name: 'Analyze selection' }).click();
  await expect(panel.getByText('220.00 Hz · A3', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Play original', exact: true }).click();
  await expect(panel.getByText('Playing original', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Stop preview', exact: true }).click();
  await panel.getByRole('button', { name: 'Play reconstruction', exact: true }).click();
  await expect(panel.getByText('Playing reconstruction', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Stop preview', exact: true }).click();
  await panel.getByText('Signed harmonic coefficients', { exact: true }).click();
  await panel.getByLabel('H2', { exact: true }).fill('-0.25');
  await panel.getByLabel('Instrument name').fill('Sampled note');
  await panel.getByRole('button', { name: 'Create instrument' }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sampled note sampledNote' })).toBeVisible();
  await expect
    .poll(
      async () =>
        (await savedWavProject(page))?.instruments.find((i) => i.key === 'sampledNote')?.sound,
    )
    .toMatchObject({
      harmonics: expect.arrayContaining([0.25]),
      polarity: expect.arrayContaining([-1]),
    });
}

export async function useWavPresetInScore(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page.getByRole('textbox', { name: 'Score editor' }).focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(WAV_SCORE);
  await expect
    .poll(
      async () =>
        (await savedWavProject(page))?.tracks.find((track) => track.key === 'sample')?.sound,
    )
    .toMatchObject({
      harmonics: expect.arrayContaining([0.25]),
      polarity: expect.arrayContaining([-1]),
    });
}
