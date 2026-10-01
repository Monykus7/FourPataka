const { app, BrowserWindow, Menu, protocol, net, session } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([{ scheme: 'fourpataka', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
app.setName('FourPataka');
if (process.env.FOURPATAKA_TEST_USER_DATA) app.setPath('userData', process.env.FOURPATAKA_TEST_USER_DATA);
if (process.env.FOURPATAKA_TEST === '1') app.commandLine.appendSwitch('disable-gpu');
let window;
const developmentUrl = !app.isPackaged && process.env.FOURPATAKA_DEV_URL === 'http://127.0.0.1:5175' ? process.env.FOURPATAKA_DEV_URL : null;
const trustedUrl = url => developmentUrl ? new URL(url).origin === developmentUrl : url.startsWith('fourpataka://studio/');
const action = name => { if (window && !window.isDestroyed()) window.webContents.send('fourpataka:menu', name); };

function createWindow() {
  window = new BrowserWindow({
    title: 'FourPataka', width: 1440, height: 1000, minWidth: 760, minHeight: 600,
    backgroundColor: '#0f0e17', show: process.env.FOURPATAKA_TEST !== '1',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true, partition: 'persist:fourpataka' },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (!trustedUrl(url)) event.preventDefault(); });
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  window.on('closed', () => { window = null; });
  void window.loadURL(developmentUrl || 'fourpataka://studio/');
}

app.whenReady().then(() => {
  const root = path.join(app.getAppPath(), 'dist');
  protocol.handle('fourpataka', async request => {
    try {
      const url = new URL(request.url);
      if (url.host !== 'studio' || request.method !== 'GET') return new Response('Not found', { status: 404 });
      const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const target = path.resolve(root, `.${relative}`);
      if (!target.startsWith(root + path.sep)) return new Response('Not found', { status: 404 });
      const response = await net.fetch(pathToFileURL(target).href);
      const headers = new Headers(response.headers);
      headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'");
      headers.set('X-Content-Type-Options', 'nosniff');
      return new Response(response.body, { status: response.status, headers });
    } catch { return new Response('Not found', { status: 404 }); }
  });
  const studioSession = session.fromPartition('persist:fourpataka');
  studioSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  studioSession.setPermissionCheckHandler(() => false);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [{ label: 'Open project…', accelerator: 'CmdOrCtrl+O', click: () => action('open') }, { label: 'Save project as…', accelerator: 'CmdOrCtrl+S', click: () => action('save') }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'Edit', submenu: [{ label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => action('undo') }, { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => action('redo') }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ label: 'Instrument', accelerator: 'CmdOrCtrl+1', click: () => action('instrument') }, { label: 'Compose', accelerator: 'CmdOrCtrl+2', click: () => action('compose') }, { label: 'Command reference', accelerator: 'CmdOrCtrl+K', click: () => action('commands') }, { label: 'Make a track', accelerator: 'CmdOrCtrl+Shift+T', click: () => action('track') }, { type: 'separator' }, { label: 'Learn', click: () => action('learn') }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] },
    { label: 'Playback', submenu: [{ label: 'Play score', click: () => action('play') }, { label: 'Stop', click: () => action('stop') }] },
  ]));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
