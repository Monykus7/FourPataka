const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('fourpatakaDesktop', {
  platform: process.platform,
  openProject: () => ipcRenderer.invoke('fourpataka:open-project'),
  saveProject: (text, name) => ipcRenderer.invoke('fourpataka:save-project', text, name),
  saveRecovery: (text, name) => ipcRenderer.invoke('fourpataka:save-recovery', text, name),
  saveWav: (buffer, name) => ipcRenderer.invoke('fourpataka:save-wav', buffer, name),
  onMenuAction: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('fourpataka:menu', listener);
    return () => ipcRenderer.removeListener('fourpataka:menu', listener);
  },
});
