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
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Listen', exact: true })).toHaveClass(/playing/);
  await page.getByRole('button', { name: 'Stop all sound' }).click();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.send('fourpataka:menu', 'track'),
  );
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Make a track' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close track maker' }).click();
  await page.screenshot({ path: '.test-results/desktop/studio.png', fullPage: true });
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
