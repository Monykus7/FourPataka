import { showSimpleShapes } from '../helpers/instrumentLibrary';
import { expect, test } from '@playwright/test';

const waveform = (page: import('@playwright/test').Page) =>
  page
    .getByRole('img', { name: 'Steady source waveform, after instrument trim, before envelope' })
    .locator('path')
    .nth(1);

test('Soft bass has its own source shape and accurate library thumbnail', async ({ page }) => {
  await page.goto('/');
  const triangle = page.getByRole('button', { name: 'Triangle triangle', exact: true });
  const bass = page.getByRole('button', { name: 'Soft bass softBass', exact: true });
  await showSimpleShapes(page);
  await triangle.click();
  const trianglePath = await waveform(page).getAttribute('d');
  const triangleThumbnail = await triangle.locator('svg path').getAttribute('d');
  await bass.click();
  await expect(waveform(page)).not.toHaveAttribute('d', trianglePath!);
  await expect(bass.locator('svg path')).not.toHaveAttribute('d', triangleThumbnail!);
  await page.getByRole('button', { name: 'H2', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'H2 exact magnitude' })).toHaveValue('0.22');
  await expect(page.getByRole('combobox', { name: 'H2 polarity', exact: true })).toHaveValue('1');
  await page.getByRole('button', { name: 'H3', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'H3 exact magnitude' })).toHaveValue('0.1');
  await expect(page.getByRole('combobox', { name: 'H3 polarity', exact: true })).toHaveValue('1');
});

test('legacy factory upgrade preserves owned sounds until the updated library preset is loaded', async ({
  page,
}) => {
  await page.goto('/');
  const fixture = await page.evaluate(async () => {
    const projectPath = '/src/core/project.ts';
    const presetsPath = '/src/core/instrumentPresets.ts';
    const { createProject } = await import(projectPath);
    const { legacySoftBassPreset } = await import(presetsPath);
    const project = createProject();
    const preset = project.instruments.find((p: any) => p.key === 'softBass');
    preset.version = 1;
    preset.sound = legacySoftBassPreset();
    const bass = project.tracks.find((track: any) => track.key === 'bass');
    bass.sound = legacySoftBassPreset();
    bass.appliedVersion = 1;
    project.comparison.A = legacySoftBassPreset();
    project.comparison.B = legacySoftBassPreset();
    project.editorPresetId = 'soft-bass';
    return project;
  });
  // Install after pagehide has flushed the old page's owned state.
  await page.addInitScript((project) => {
    localStorage.setItem('fourpataka.project.v1', JSON.stringify(project));
  }, fixture);
  await page.reload();
  await expect(page.locator('.toast[role=status]')).toContainText(
    'Soft bass library preset updated',
  );
  await page.getByRole('button', { name: 'H2', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'H2 exact magnitude' })).toHaveValue('0');
  const oldPath = await waveform(page).getAttribute('d');
  await page.getByRole('button', { name: 'Soft bass softBass', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'H2 exact magnitude' })).toHaveValue('0.22');
  await expect(waveform(page)).not.toHaveAttribute('d', oldPath!);
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('fourpataka.project.v1')!),
  );
  expect(saved.instruments.find((preset: any) => preset.key === 'softBass').version).toBe(2);
  expect(saved.comparison.A.harmonics[1]).toBe(0.22);
  expect(saved.comparison.B.harmonics[1]).toBe(0);
  expect(saved.tracks.find((track: any) => track.key === 'bass').sound.harmonics[1]).toBe(0);
  await page.getByRole('button', { name: 'B', exact: true }).click();
  await expect(waveform(page)).toHaveAttribute('d', oldPath!);
});
