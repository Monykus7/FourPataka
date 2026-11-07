import { expect, test } from '@playwright/test';
import {
  createWavPreset,
  openWavImport,
  savedWavProject,
  useWavPresetInScore,
} from '../helpers/wavImport';
import { noteWav } from '../fixtures/wavNote';
import { isFourierSound } from '../../src/core/engineSound';

test('local WAV review keeps independent sounds and can undo, reload and export', async ({
  page,
}) => {
  await page.goto('/');
  await expect.poll(async () => (await savedWavProject(page))?.schemaVersion).toBe(6);
  const before = (await savedWavProject(page))!;
  await createWavPreset(page, true);
  const after = (await savedWavProject(page))!;
  expect(after.comparison).toEqual(before.comparison);
  expect(after.tracks).toEqual(before.tracks);
  expect(after.editorPresetId).toBe(before.editorPresetId);
  const preset = after.instruments.find((item) => item.key === 'sampledNote')!;
  if (!isFourierSound(preset.sound)) throw new Error('Expected a Fourier preset.');
  expect(preset.sound.harmonics[1]).toBe(0.25);
  expect(preset.sound.polarity[1]).toBe(-1);
  expect(JSON.stringify(preset)).not.toContain('.wav');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sampled note sampledNote' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect
    .poll(async () =>
      (await savedWavProject(page))?.instruments.find((item) => item.key === 'sampledNote'),
    )
    .toEqual(preset);
  await page.reload();
  await useWavPresetInScore(page);
  await page.getByRole('button', { name: 'Export WAV', exact: true }).click();
  const exportPanel = page.getByRole('dialog', { name: 'Export WAV' });
  await exportPanel.getByRole('button', { name: 'Render WAV', exact: true }).click();
  await expect(exportPanel.getByRole('status')).toContainText('Render ready');
});

test('cancel and replace in-flight WAV jobs without a stale result or history edit', async ({
  page,
}) => {
  await page.goto('/');
  await expect.poll(async () => (await savedWavProject(page))?.schemaVersion).toBe(6);
  const before = await savedWavProject(page);
  const panel = await openWavImport(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/wavReview.worker.ts*', async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  const input = panel.getByLabel('WAV recording');
  await input.setInputFiles({
    name: 'stale.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.from(noteWav()),
  });
  await panel.getByRole('button', { name: 'Cancel analysis' }).click();
  release();
  await page.unroute('**/wavReview.worker.ts*');
  await input.setInputFiles({
    name: 'invalid.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.from('not a WAV'),
  });
  await expect(panel.getByRole('alert')).toContainText('Expected a little-endian RIFF WAV');
  await expect(panel.getByRole('button', { name: 'Create instrument' })).toHaveCount(0);
  await input.setInputFiles({
    name: 'usable.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.from(noteWav()),
  });
  await expect(panel.getByLabel('Instrument name')).toHaveValue('usable');
  await panel.screenshot({ path: '.test-results/wav-import-wide.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.screenshot({ path: '.test-results/wav-import-narrow.png' });
  expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  expect(await savedWavProject(page)).toEqual(before);
});
