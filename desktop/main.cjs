// PCTRA : l'appli PC de PETRA (Electron). Affiche la même appli React que le téléphone, en
// grand, et reçoit la synchro du téléphone par le Wi-Fi local (voir server.cjs).
const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const crypto = require('node:crypto')
const { startSyncServer, localAddresses } = require('./server.cjs')

const PORT = 47123
app.setName('PCTRA')

if (!app.requestSingleInstanceLock()) app.quit()

let win
let serverError
const pending = new Map()
let nextId = 1

const configFile = () => path.join(app.getPath('userData'), 'pctra.json')
function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configFile(), 'utf8'))
  } catch {
    return {}
  }
}
function writeConfig(c) {
  fs.mkdirSync(path.dirname(configFile()), { recursive: true })
  fs.writeFileSync(configFile(), JSON.stringify(c, null, 2))
}
const newToken = () => crypto.randomBytes(24).toString('base64url')
function token() {
  const c = readConfig()
  if (!c.token) {
    c.token = newToken()
    writeConfig(c)
  }
  return c.token
}

const pairing = () => ({ hosts: localAddresses(), port: PORT, token: token(), name: os.hostname(), error: serverError })

/** Copie des données après chaque synchro, au cas où (Documents/PCTRA). */
function keepCopy(data) {
  try {
    const dir = path.join(app.getPath('documents'), 'PCTRA')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'petra-pc.json'), JSON.stringify({ ...data, backupAt: Date.now() }))
  } catch {
    /* pas de copie : la synchro est quand même faite */
  }
}

/** Passe les données du téléphone à la page, qui fusionne et renvoie le résultat. */
function handleSync(payload) {
  return new Promise((resolve, reject) => {
    if (!win || win.isDestroyed()) return reject(new Error('PCTRA n’est pas prêt'))
    const id = nextId++
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error('PCTRA n’a pas répondu'))
    }, 20000)
    pending.set(id, (result) => {
      clearTimeout(timer)
      pending.delete(id)
      if (result?.data) keepCopy(result.data)
      resolve(result)
    })
    win.webContents.send('pctra:sync', id, payload)
  })
}

ipcMain.on('pctra:sync-reply', (_e, id, result) => pending.get(id)?.(result))
ipcMain.handle('pctra:pairing', () => pairing())
ipcMain.handle('pctra:new-token', () => {
  writeConfig({ ...readConfig(), token: newToken() })
  return pairing()
})
ipcMain.on('pctra:version', (e) => {
  e.returnValue = app.getVersion()
})

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'PCTRA',
    backgroundColor: '#0D0F0E',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: false },
  })
  win.on('page-title-updated', (e) => e.preventDefault())
  // Liens externes (GitHub…) dans le navigateur.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.loadFile(path.join(__dirname, 'web', 'index.html'))
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.whenReady().then(async () => {
  createWindow()
  try {
    await startSyncServer({ port: PORT, getToken: token, handle: handleSync })
  } catch (e) {
    serverError =
      e?.code === 'EADDRINUSE'
        ? `Le port ${PORT} est déjà utilisé : ferme l’autre PCTRA ouvert, puis relance.`
        : `Synchro indisponible : ${e?.message ?? e}`
  }
})

app.on('window-all-closed', () => app.quit())
