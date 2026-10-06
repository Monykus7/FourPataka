import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('WAV controls render and download PCM without changing project history or including monitor/A-B', async ({
  page,
}) => {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('fourpataka.project.v1')))
    .not.toBeNull();
  const before = await page.evaluate(() => localStorage.getItem('fourpataka.project.v1'));
  const downloadWav = async () => {
    await page.getByRole('button', { name: 'Export WAV', exact: true }).click();
    const panel = page.getByRole('dialog', { name: 'Export WAV', exact: true });
    await expect(panel.getByRole('combobox', { name: 'Sample rate' })).toBeFocused();
    await panel.getByRole('combobox', { name: 'Channels', exact: true }).selectOption('1');
    await panel.getByRole('spinbutton', { name: 'Echo tail limit (seconds)' }).fill('0');
    await panel.getByRole('button', { name: 'Render WAV', exact: true }).click();
    await expect(panel.getByRole('status')).toContainText('Render ready');
    const pending = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Save WAV', exact: true }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe('Untitled-session.wav');
    const bytes = await readFile((await download.path())!);
    await panel.getByRole('button', { name: 'Close WAV export' }).click();
    await expect(page.getByRole('button', { name: 'Export WAV', exact: true })).toBeFocused();
    return bytes;
  };
  const first = await downloadWav();
  expect(first.toString('ascii', 0, 4)).toBe('RIFF');
  expect(first.readUInt32LE(24)).toBe(48000);
  expect(first.readUInt16LE(22)).toBe(1);
  expect(first.readUInt32LE(40)).toBe(first.length - 44);
  expect(await page.evaluate(() => localStorage.getItem('fourpataka.project.v1'))).toBe(before);
  await page.getByRole('slider', { name: 'Monitor volume' }).fill('0');
  await page.getByRole('button', { name: 'B', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'H1 exact magnitude', exact: true }).fill('0');
  const second = await downloadWav();
  expect(second.length).toBe(first.length);
  let maximumDifference = 0;
  for (let i = 44; i < first.length; i += 2)
    maximumDifference = Math.max(
      maximumDifference,
      Math.abs(first.readInt16LE(i) - second.readInt16LE(i)),
    );
  // Web Audio implementations need not return byte-identical oscillator tables.
  expect(maximumDifference).toBeLessThanOrEqual(1);
});

test('clipping is reported and saving requires an explicit lower level or normalization', async ({
  page,
}) => {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('fourpataka.project.v1')))
    .not.toBeNull();
  const fixture = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('fourpataka.project.v1')!);
    p.scoreText =
      'tempo 120\ntrack melody using brightReed {\n chord:(A A A A A A A A)4 quarter\n}';
    p.tracks[0].sound.harmonics = [1, ...Array(31).fill(0)];
    p.tracks[0].sound.trim = 0;
    p.tracks[0].level = 1;
    p.mixGain = 1;
    return JSON.stringify(p);
  });
  await page.addInitScript(
    (fixture) => localStorage.setItem('fourpataka.project.v1', fixture),
    fixture,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Export WAV', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Export WAV' });
  await panel.getByRole('spinbutton', { name: 'Echo tail limit (seconds)' }).fill('0');
  await panel.getByRole('button', { name: 'Render WAV', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('This level would clip');
  await expect(panel.getByRole('button', { name: 'Save WAV', exact: true })).toBeDisabled();
  await panel.getByRole('spinbutton', { name: 'Export level (dB)' }).fill('-24');
  await expect(panel.getByRole('button', { name: 'Save WAV', exact: true })).toBeEnabled();
  await panel.getByRole('spinbutton', { name: 'Export level (dB)' }).fill('0');
  await panel.getByRole('checkbox', { name: 'Normalize to −1 dBFS' }).check();
  await expect(panel.getByText('File peak: -1.00 dBFS')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Save WAV', exact: true }).click();
  const bytes = await readFile((await (await downloadPromise).path())!);
  let peak = 0;
  for (let i = 44; i < bytes.length; i += 2) peak = Math.max(peak, Math.abs(bytes.readInt16LE(i)));
  expect(peak).toBeLessThan(29206);
  expect(peak).toBeGreaterThan(29200);
});

test('export preflight errors, format changes, Escape and narrow-screen controls are usable', async ({
  page,
}) => {
  await page.goto('/');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Export WAV', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Export WAV' });
  await panel.getByRole('spinbutton', { name: 'Echo tail limit (seconds)' }).fill('31');
  await expect(panel.getByRole('alert')).toContainText('Invalid WAV');
  await expect(panel.getByRole('button', { name: 'Render WAV', exact: true })).toBeDisabled();
  await panel.getByRole('spinbutton', { name: 'Echo tail limit (seconds)' }).fill('0');
  await panel.getByRole('combobox', { name: 'Sample rate' }).selectOption('44100');
  await panel.getByRole('button', { name: 'Render WAV', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('Render ready');
  await panel.getByRole('combobox', { name: 'Channels', exact: true }).selectOption('1');
  await expect(panel.getByRole('button', { name: 'Save WAV', exact: true })).toBeDisabled();
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await panel.screenshot({ path: '.test-results/export-mobile.png' });
  await page.keyboard.press('Escape');
  await expect(panel).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Export WAV', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page.getByRole('textbox', { name: 'Score editor' }).fill('broken');
  await page.getByRole('button', { name: 'Export WAV', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('Fix the score diagnostics');
});
