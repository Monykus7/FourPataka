import { expect, test, _electron as electron, type ElectronApplication } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

let app: ElectronApplication;
test.beforeEach(async () => {
  const userData = resolve('.test-results', 'desktop', `profile-${randomUUID()}`);
  await mkdir(userData, { recursive: true });
  const environment = { ...process.env, FOURPATAKA_TEST: '1', FOURPATAKA_TEST_USER_DATA: userData };
  delete environment.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({
    executablePath: process.env.FOURPATAKA_TEST_EXECUTABLE,
    args: process.env.FOURPATAKA_TEST_EXECUTABLE ? [] : ['.'],
    env: environment,
  });
});
test.afterEach(async () => {
  await app?.close();
});

test('desktop loads local assets, isolates the renderer, plays audio, and opens tools from its menu', async () => {
  const page = await app.firstWindow();
  await expect(page.getByRole('heading', { name: 'Instrument', exact: true })).toBeVisible();
  expect(page.url()).toBe('fourpataka://studio/');
  const isolation = await page.evaluate(() => ({
    node: typeof (window as any).require,
    platform: window.fourpatakaDesktop?.platform,
  }));
  expect(isolation).toEqual({ node: 'undefined', platform: 'win32' });
  const preferences = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences(),
  );
  expect(preferences.contextIsolation).toBe(true);
  expect(preferences.sandbox).toBe(true);
  expect(preferences.nodeIntegration).toBe(false);
  const originalH1 = await page
    .getByRole('spinbutton', { name: 'H1 exact magnitude' })
    .inputValue();
  await page.getByRole('button', { name: 'Waveform', exact: true }).click();
  await expect(
    page.getByRole('img', { name: 'Signed harmonic coefficients preview' }),
  ).toBeVisible();
  const dotsWave = page.getByRole('group', { name: 'Editable harmonic source waveform' });
  const dotsBox = (await dotsWave.boundingBox())!;
  await page.mouse.click(dotsBox.x + dotsBox.width * 0.21, dotsBox.y + dotsBox.height * 0.3);
  await expect(page.getByRole('button', { name: /^Wave point / })).toHaveCount(6);
  await page.getByRole('button', { name: 'Reset waveform to sine', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Wave point / })).toHaveCount(5);
  await page.getByRole('button', { name: 'Draw', exact: true }).click();
  const wave = page.getByRole('group', { name: 'Editable harmonic source waveform' });
  const box = (await wave.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5, { steps: 10 });
  await page.mouse.up();
  await page.getByRole('button', { name: 'Harmonics', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'H1 exact magnitude' })).not.toHaveValue(
    originalH1,
  );
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Listen', exact: true })).toHaveClass(/playing/);
  await page.getByRole('button', { name: 'Stop all sound' }).click();
  await page
    .getByRole('combobox', { name: 'Comparison material', exact: true })
    .selectOption('phrase');
  await page.getByRole('combobox', { name: 'Comparison phrase track' }).selectOption('bass');
  await page.getByRole('button', { name: 'Compare / replay', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Listen', exact: true })).toHaveClass(/playing/);
  await page.getByRole('button', { name: 'B', exact: true }).click();
  await expect(page.getByRole('button', { name: 'B', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Stop all sound' }).click();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.send('fourpataka:menu', 'track'),
  );
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Make a track' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close track maker' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const prohibited = await page.evaluate(async () => {
    try {
      return (await fetch('fourpataka://elsewhere/index.html')).status;
    } catch {
      return 404;
    }
  });
  expect(prohibited).toBe(404);
});

test('native project dialogs round-trip a project, preserve canceled operations, and reject oversize data', async () => {
  const page = await app.firstWindow();
  await expect(page.getByRole('button', { name: 'Save project', exact: true })).toBeVisible();
  const savePath = resolve('.test-results', 'desktop', 'saved.fourpataka.json');
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, savePath);
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved saved.fourpataka.json');
  const project = JSON.parse(await readFile(savePath, 'utf8'));
  project.name = 'Native round trip';
  await writeFile(savePath, JSON.stringify(project));
  await app.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] });
  }, savePath);
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue(
    'Native round trip',
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue('Untitled session');
  await app.evaluate(({ dialog }) => {
    dialog.showSaveDialog = async () => ({ canceled: true });
  });
  expect(
    await page.evaluate(
      (text) => window.fourpatakaDesktop!.saveProject!(text, 'cancel'),
      JSON.stringify(project),
    ),
  ).toEqual({ canceled: true });
  const rejected = await page.evaluate(async () => {
    try {
      await window.fourpatakaDesktop!.saveProject!('x'.repeat(2_000_001), 'oversize');
      return false;
    } catch {
      return true;
    }
  });
  expect(rejected).toBe(true);
});
