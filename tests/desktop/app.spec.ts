import { expect, test, _electron as electron, type ElectronApplication } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { dragEquipment, patchBoard, placePedal } from '../helpers/board';

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

test('native score chain assignments preserve independent copies through file save and reload', async () => {
  const page = await app.firstWindow();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Pedal chain for melody', exact: true })
    .selectOption('warmDrive');
  await page
    .getByRole('combobox', { name: 'Pedal chain for master', exact: true })
    .selectOption('cleanGlue');
  await expect(page.getByRole('textbox', { name: 'Score editor' })).toContainText(
    'master through cleanGlue',
  );
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Pedal editing destination' })
    .selectOption('track:melody');
  await page
    .getByRole('spinbutton', { name: 'overdrive 1 drive exact value', exact: true })
    .fill('11');
  const savePath = resolve('.test-results', 'desktop', 'chain-assignments.fourpataka.json');
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, savePath);
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  await expect(page.locator('.toast[role=status]')).toContainText(
    'Saved chain-assignments.fourpataka.json',
  );
  const saved = JSON.parse(await readFile(savePath, 'utf8'));
  expect(saved.scoreText).toContain('track melody using brightReed through warmDrive');
  expect(saved.processing.tracks.melody).toMatchObject({
    assignmentKey: 'warmDrive',
    presetId: 'warm-drive',
    pedals: [{ params: { drive: 11 } }],
  });
  expect(saved.processing.master.assignmentKey).toBe('cleanGlue');
  expect(
    saved.processing.library.find((p: any) => p.key === 'warmDrive').chain.pedals[0].params.drive,
  ).toBe(6);
  await page.reload();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Pedal chain for melody', exact: true }),
  ).toHaveValue('warmDrive');
  await page.screenshot({ path: '.test-results/desktop/score-chains.png', fullPage: true });
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Pedal editing destination' })
    .selectOption('track:melody');
  await expect(
    page.getByRole('spinbutton', { name: 'overdrive 1 drive exact value', exact: true }),
  ).toHaveValue('11');
});

test('packaged delay drags, dials, native saving and tail-aware bypass work together', async () => {
  const page = await app.firstWindow();
  // Hidden test windows throttle renderer timers; this proof needs the same
  // timely meters and tail indicators as a foreground application window.
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.setBackgroundThrottling(false),
  );
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await dragEquipment(page, 'delay');
  await patchBoard(page);
  const time = page.getByRole('spinbutton', { name: 'delay 1 time exact value', exact: true });
  await time.fill('400');
  await page
    .getByRole('spinbutton', { name: 'delay 1 feedback exact value', exact: true })
    .fill('95');
  const mix = page.getByRole('slider', { name: 'delay 1 mix dial', exact: true });
  await mix.focus();
  await mix.press('End');
  await expect(
    page.getByRole('spinbutton', { name: 'delay 1 mix exact value', exact: true }),
  ).toHaveValue('100');
  const savePath = resolve('.test-results', 'desktop', 'delay-round-trip.fourpataka.json');
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, savePath);
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  await expect(page.locator('.toast[role=status]')).toContainText(
    'Saved delay-round-trip.fourpataka.json',
  );
  const saved = JSON.parse(await readFile(savePath, 'utf8'));
  expect(saved.processing.audition.A.pedals[0]).toMatchObject({
    kind: 'delay',
    params: { time: 400, feedback: 95, output: 0, mix: 100 },
  });
  expect(saved.processing.audition.A.board.cables).toHaveLength(2);
  await page.reload();
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await expect(time).toHaveValue('400');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect
    .poll(async () => page.locator('.meter-bars .lit').count(), { timeout: 10000 })
    .toBeGreaterThan(0);
  await page.getByRole('checkbox', { name: 'Bypass Audition A chain', exact: true }).check();
  await expect(page.locator('.delay-tail-status')).toHaveText('Echo tails active');
  await expect(page.locator('.compact-pedal.delay')).toContainText('Tail active');
  await page.screenshot({ path: '.test-results/desktop/delay-board.png', fullPage: true });
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await expect(page.locator('.delay-tail-status')).toHaveCount(0);
});

test('packaged EQ dials, flat reset and native project save retain exact settings', async () => {
  expect(await app.evaluate(({ app }) => app.getVersion())).toBe('0.14.0');
  const page = await app.firstWindow();
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await placePedal(page, 'eq');
  const low = page.getByRole('spinbutton', { name: 'eq 1 low gain exact value', exact: true });
  const mid = page.getByRole('spinbutton', { name: 'eq 1 mid gain exact value', exact: true });
  await low.fill('6');
  await mid.fill('-4');
  await page
    .getByRole('spinbutton', { name: 'eq 1 mid frequency exact value', exact: true })
    .fill('2100');
  await page.getByRole('slider', { name: 'eq 1 high gain dial', exact: true }).focus();
  await page.getByRole('slider', { name: 'eq 1 high gain dial', exact: true }).press('ArrowUp');
  await expect(
    page.getByRole('spinbutton', { name: 'eq 1 high gain exact value', exact: true }),
  ).toHaveValue('0.5');
  await page.getByRole('button', { name: 'Reset EQ 1 to flat', exact: true }).click();
  await expect(low).toHaveValue('0');
  await expect(mid).toHaveValue('0');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(low).toHaveValue('6');
  await expect(mid).toHaveValue('-4');
  const grip = page.getByRole('button', { name: 'Move eq 1 on board', exact: true });
  await grip.focus();
  await grip.press('ArrowDown');
  const savePath = resolve('.test-results', 'desktop', 'eq-round-trip.fourpataka.json');
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, savePath);
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  await expect(page.locator('.toast[role=status]')).toContainText(
    'Saved eq-round-trip.fourpataka.json',
  );
  const saved = JSON.parse(await readFile(savePath, 'utf8'));
  expect(saved.processing.audition.A.pedals[0]).toMatchObject({
    kind: 'eq',
    params: { low: 6, mid: -4, high: 0.5, frequency: 2100 },
  });
  const id = saved.processing.audition.A.pedals[0].id;
  expect(saved.processing.audition.A.board.positions[id]).toEqual({ column: 0, row: 1 });
  expect(saved.processing.audition.A.board.cables).toMatchObject([
    { from: null, to: id },
    { from: id, to: null },
  ]);
  await page.reload();
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await expect(low).toHaveValue('6');
  await expect(page.locator('.compact-pedal.eq')).toHaveCSS('top', '268px');
  await expect(
    page.getByRole('spinbutton', { name: 'eq 1 mid frequency exact value', exact: true }),
  ).toHaveValue('2100');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(page.getByRole('img', { name: 'After pedals waveform', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
});

test('packaged equipment can be dragged onto Velcro slots and patched with the mouse', async () => {
  const page = await app.firstWindow();
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await dragEquipment(page, 'compressor');
  await expect(page.locator('.compact-pedal.compressor')).toHaveCSS('left', '92px');
  await expect(page.locator('.compact-pedal.compressor')).toContainText('UNPATCHED');
  // Windows may constrain the native viewport to its work area. Center gesture
  // targets above the fixed transport before reading raw mouse coordinates.
  await page
    .getByRole('button', { name: 'Board input output jack', exact: true })
    .evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  const start = (await page
    .getByRole('button', { name: 'Board input output jack', exact: true })
    .boundingBox())!;
  const end = (await page
    .getByRole('button', { name: 'compressor 1 input jack', exact: true })
    .boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.board-route-status')).toHaveText('Output unplugged');
  await page.getByRole('button', { name: 'compressor 1 output jack', exact: true }).click();
  await page.getByRole('button', { name: 'Board output input jack', exact: true }).click();
  await expect(page.locator('.board-route-status')).toHaveText('1 in signal path');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(page.getByRole('img', { name: 'After pedals waveform', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await page.screenshot({ path: '.test-results/desktop/physical-board.png', fullPage: true });
});

test('packaged pedal dials rotate and support exact keyboard adjustment with undo', async () => {
  const page = await app.firstWindow();
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await placePedal(page, 'overdrive');
  const dial = page.getByRole('slider', { name: 'overdrive 1 drive dial', exact: true });
  const exact = page.getByRole('spinbutton', {
    name: 'overdrive 1 drive exact value',
    exact: true,
  });
  await dial.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  const box = (await dial.boundingBox())!;
  const point = (angle: number) => ({
    x:
      box.x +
      box.width / 2 +
      Math.sin((angle * Math.PI) / 180) * (Math.min(box.width, box.height) / 2 - 4),
    y:
      box.y +
      box.height / 2 -
      Math.cos((angle * Math.PI) / 180) * (Math.min(box.width, box.height) / 2 - 4),
  });
  await page.mouse.move(point(0).x, point(0).y);
  await page.mouse.down();
  for (let angle = 15; angle <= 90; angle += 15)
    await page.mouse.move(point(angle).x, point(angle).y);
  await page.mouse.up();
  await expect(exact).toHaveValue('14');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(exact).toHaveValue('6');
  await dial.focus();
  await dial.press('ArrowUp');
  await expect(exact).toHaveValue('6.5');
  await expect(dial).toHaveAttribute('aria-valuenow', '6.5');
});

test('packaged Compose applies timing and instruments to source with undo', async () => {
  const page = await app.firstWindow();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await page.getByRole('combobox', { name: 'Time signature preset' }).selectOption('7/8');
  await page.getByRole('spinbutton', { name: 'Composition tempo' }).fill('96');
  await page.getByRole('button', { name: 'Apply timing' }).click();
  await expect(editor).toContainText('time 7/8');
  await expect(editor).toContainText('tempo 96');
  await expect(page.locator('.timeline-panel .tag')).toHaveText('7/8');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).toContainText('time 4/4');
  await expect(editor).toContainText('tempo 120');
  await page.getByRole('combobox', { name: 'Instrument for melody' }).selectOption('sine');
  await expect(editor).toContainText('melody using sine');
  await expect(editor).toContainText('bass using softBass');
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
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.send('fourpataka:menu', 'pedalboard'),
  );
  await expect(page.getByRole('heading', { name: 'Pedalboard', exact: true })).toBeVisible();
  const pedalboard = page.getByRole('region', { name: 'Pedalboard', exact: true });
  await pedalboard
    .getByRole('combobox', { name: 'Pedal preset', exact: true })
    .selectOption('warm-drive');
  await pedalboard.getByRole('button', { name: 'Load chain preset', exact: true }).click();
  await expect(
    pedalboard.getByRole('spinbutton', { name: 'overdrive 1 drive exact value' }),
  ).toHaveValue('6');
  await expect(
    page.getByRole('button', { name: 'Select cable from Board input to Overdrive 1', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Listen', exact: true })).toHaveClass(/playing/);
  await expect(page.getByRole('img', { name: 'After pedals waveform', exact: true })).toBeVisible();
  await pedalboard.getByRole('checkbox', { name: 'Bypass overdrive 1', exact: true }).check();
  await page.getByRole('button', { name: 'Stop all sound' }).click();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Score editor' })
    .fill(
      'tempo 60\ntrack melody using brightReed {\n C4 whole\n C5 whole\n}\ntrack bass using softBass {\n C2 whole\n C3 whole\n}',
    );
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Comparison material', exact: true })
    .selectOption('phrase');
  await page.getByRole('combobox', { name: 'Comparison phrase track' }).selectOption('bass');
  await page.getByRole('button', { name: 'Compare / replay', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Listen', exact: true })).toHaveClass(/playing/);
  const progress = page.getByRole('progressbar', { name: 'Comparison phrase progress' });
  await expect.poll(async () => Number(await progress.getAttribute('value'))).toBeGreaterThan(0.2);
  const beforeSwitch = Number(await progress.getAttribute('value'));
  await page.getByRole('button', { name: 'B', exact: true }).click();
  await expect(page.getByRole('button', { name: 'B', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect
    .poll(async () => Number(await progress.getAttribute('value')))
    .toBeGreaterThan(beforeSwitch);
  await page.getByRole('combobox', { name: 'Theme preset' }).selectOption('earth');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'earth');
  await page.getByRole('button', { name: 'Stop all sound' }).click();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Theme preset' })).toHaveValue('earth');
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
  await expect(page.locator('.toast[role=status]')).toContainText('Saved saved.fourpataka.json');
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
