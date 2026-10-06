const { app, BrowserWindow, Menu, protocol, net, session, ipcMain, dialog } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { validateWav } = require('./wav.cjs');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'fourpataka',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);
app.setName('FourPataka');
if (process.env.FOURPATAKA_TEST_USER_DATA)
  app.setPath('userData', process.env.FOURPATAKA_TEST_USER_DATA);
if (process.env.FOURPATAKA_TEST === '1') app.commandLine.appendSwitch('disable-gpu');
let window;
const developmentUrl =
  !app.isPackaged && process.env.FOURPATAKA_DEV_URL === 'http://127.0.0.1:5175'
    ? process.env.FOURPATAKA_DEV_URL
    : null;
const trustedUrl = (url) => {
  try {
    return developmentUrl
      ? new URL(url).origin === developmentUrl
      : url.startsWith('fourpataka://studio/');
  } catch {
    return false;
  }
};
function assertStudio(event) {
  if (
    !window ||
    event.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame ||
    !trustedUrl(event.senderFrame.url)
  )
    throw new Error('Untrusted project request.');
}
const action = (name) => {
  if (window && !window.isDestroyed()) window.webContents.send('fourpataka:menu', name);
};

function createWindow() {
  window = new BrowserWindow({
    title: 'FourPataka',
    width: 1440,
    height: 1000,
    minWidth: 760,
    minHeight: 600,
    backgroundColor: '#0f0e17',
    show: process.env.FOURPATAKA_TEST !== '1',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      autoplayPolicy: 'no-user-gesture-required',
      partition: 'persist:fourpataka',
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!trustedUrl(url)) event.preventDefault();
  });
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.on('closed', () => {
    window = null;
  });
  void window.loadURL(developmentUrl || 'fourpataka://studio/');
}

app.whenReady().then(() => {
  const root = path.join(app.getAppPath(), 'dist');
  const studioSession = session.fromPartition('persist:fourpataka');
  studioSession.protocol.handle('fourpataka', async (request) => {
    try {
      const url = new URL(request.url);
      if (url.host !== 'studio' || request.method !== 'GET')
        return new Response('Not found', { status: 404 });
      const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const target = path.resolve(root, `.${relative}`);
      if (!target.startsWith(root + path.sep)) return new Response('Not found', { status: 404 });
      const response = await net.fetch(pathToFileURL(target).href);
      const headers = new Headers(response.headers);
      headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'",
      );
      headers.set('X-Content-Type-Options', 'nosniff');
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
  studioSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  studioSession.setPermissionCheckHandler(() => false);
  ipcMain.handle('fourpataka:open-project', async (event) => {
    assertStudio(event);
    const result = await dialog.showOpenDialog(window, {
      title: 'Open FourPataka project',
      properties: ['openFile'],
      filters: [{ name: 'FourPataka project', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const file = result.filePaths[0];
    if ((await fs.stat(file)).size > 2_000_000)
      throw new Error('Project file is too large (maximum 2 MB).');
    return { canceled: false, text: await fs.readFile(file, 'utf8'), name: path.basename(file) };
  });
  ipcMain.handle('fourpataka:save-project', async (event, text, name) => {
    assertStudio(event);
    if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > 2_000_000)
      throw new Error('Invalid project or project exceeds 2 MB.');
    const project = JSON.parse(text);
    // The renderer validates musical data; this origin-checked file bridge
    // accepts both the legacy bank and the current 32-partial document envelope.
    if (
      !project ||
      ![1, 2].includes(project.schemaVersion) ||
      typeof project.scoreText !== 'string'
    )
      throw new Error('Invalid FourPataka project.');
    const basename =
      (typeof name === 'string' ? name : 'FourPataka')
        .slice(0, 100)
        .replace(/[^a-z0-9_-]/gi, '-') || 'FourPataka';
    const result = await dialog.showSaveDialog(window, {
      title: 'Save FourPataka project',
      defaultPath: `${basename}.fourpataka.json`,
      filters: [{ name: 'FourPataka project', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await fs.writeFile(result.filePath, text, 'utf8');
    return { canceled: false, name: path.basename(result.filePath) };
  });
  ipcMain.handle('fourpataka:save-recovery', async (event, text, name) => {
    assertStudio(event);
    // A damaged save is intentionally not JSON-validated. This bridge only
    // writes bounded text to a destination chosen through the native dialog.
    if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > 10_000_000)
      throw new Error('Recovery copy exceeds 10 MB or is not text.');
    const basename =
      (typeof name === 'string' ? name : 'FourPataka-recovery')
        .slice(0, 100)
        .replace(/[^a-z0-9_-]/gi, '-') || 'FourPataka-recovery';
    const result = await dialog.showSaveDialog(window, {
      title: 'Export recovery copy',
      defaultPath: `${basename}.json`,
      filters: [{ name: 'Recovery text', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await fs.writeFile(result.filePath, text, 'utf8');
    return { canceled: false, name: path.basename(result.filePath) };
  });
  ipcMain.handle('fourpataka:save-wav', async (event, data, name) => {
    assertStudio(event);
    const buffer = validateWav(data);
    const basename =
      (typeof name === 'string' ? name : 'FourPataka')
        .slice(0, 100)
        .replace(/[^a-z0-9_-]/gi, '-') || 'FourPataka';
    const result = await dialog.showSaveDialog(window, {
      title: 'Save WAV export',
      defaultPath: `${basename}.wav`,
      filters: [{ name: 'PCM WAV audio', extensions: ['wav'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await fs.writeFile(result.filePath, buffer);
    return { canceled: false, name: path.basename(result.filePath) };
  });
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'File',
        submenu: [
          { label: 'Open project…', accelerator: 'CmdOrCtrl+O', click: () => action('open') },
          { label: 'Save project as…', accelerator: 'CmdOrCtrl+S', click: () => action('save') },
          { label: 'Export WAV…', accelerator: 'CmdOrCtrl+Shift+E', click: () => action('wav') },
          {
            label: 'Local save recovery…',
            accelerator: 'CmdOrCtrl+Shift+O',
            click: () => action('recovery'),
          },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => action('undo') },
          { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => action('redo') },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { label: 'Instrument', accelerator: 'CmdOrCtrl+1', click: () => action('instrument') },
          { label: 'Compose', accelerator: 'CmdOrCtrl+2', click: () => action('compose') },
          { label: 'Pedalboard', accelerator: 'CmdOrCtrl+3', click: () => action('pedalboard') },
          {
            label: 'Command reference',
            accelerator: 'CmdOrCtrl+K',
            click: () => action('commands'),
          },
          { label: 'Make a track', accelerator: 'CmdOrCtrl+Shift+T', click: () => action('track') },
          { type: 'separator' },
          { label: 'Learn', click: () => action('learn') },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Playback',
        submenu: [
          { label: 'Play score', click: () => action('play') },
          { label: 'Stop', click: () => action('stop') },
        ],
      },
    ]),
  );
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
