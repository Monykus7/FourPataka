const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('fourpatakaDesktop', {
  platform: process.platform,
  onMenuAction: callback => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('fourpataka:menu', listener);
    return () => ipcRenderer.removeListener('fourpataka:menu', listener);
  },
});
