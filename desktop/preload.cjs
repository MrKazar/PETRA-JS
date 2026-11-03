// Pont entre la page (React) et PCTRA : `window.pctra`, utilisé par src/logic/desktop.ts.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('pctra', {
  version: ipcRenderer.sendSync('pctra:version'),
  pairing: () => ipcRenderer.invoke('pctra:pairing'),
  newToken: () => ipcRenderer.invoke('pctra:new-token'),
  onSync: (cb) => ipcRenderer.on('pctra:sync', (_e, id, payload) => cb(id, payload)),
  reply: (id, result) => ipcRenderer.send('pctra:sync-reply', id, result),
})
