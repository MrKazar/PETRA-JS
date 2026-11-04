// Pont entre la page (React) et PCTRA : `window.pctra`, utilisé par src/logic/desktop.ts.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('pctra', {
  version: ipcRenderer.sendSync('pctra:version'),
  pairing: () => ipcRenderer.invoke('pctra:pairing'),
  newToken: () => ipcRenderer.invoke('pctra:new-token'),
  onSync: (cb) => ipcRenderer.on('pctra:sync', (_e, id, payload) => cb(id, payload)),
  reply: (id, result) => ipcRenderer.send('pctra:sync-reply', id, result),
  updateState: () => ipcRenderer.invoke('pctra:update-state'),
  onUpdateState: (cb) => ipcRenderer.on('pctra:update-state', (_e, state) => cb(state)),
  checkUpdate: () => ipcRenderer.send('pctra:check-update'),
  installUpdate: () => ipcRenderer.send('pctra:install-update'),
  setRev: (rev) => ipcRenderer.send('pctra:rev', rev),
  backups: () => ipcRenderer.invoke('pctra:backups'),
})
