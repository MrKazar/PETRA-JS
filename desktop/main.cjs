// PCTRA : l'appli PC de PETRA (Electron). Affiche la même appli React que le téléphone, en
// grand, et reçoit la synchro du téléphone par le Wi-Fi local (voir server.cjs).
const { app, BrowserWindow, ipcMain, shell, screen } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const crypto = require('node:crypto')
const { startSyncServer, localAddresses } = require('./server.cjs')
const { writeCopy, readCopies } = require('./backups.cjs')
const { autoUpdater } = require('electron-updater')
const { SIZES, MIN, normalizePrefs, boundsVisible } = require('./window.cjs')

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

const backupDir = () => path.join(app.getPath('documents'), 'PCTRA')

/** Copie des données après chaque synchro, au cas où (Documents/PCTRA, les 5 dernières). */
function keepCopy(data) {
  try {
    writeCopy(backupDir(), JSON.stringify({ ...data, backupAt: Date.now() }))
  } catch {
    /* pas de copie : la synchro est quand même faite */
  }
}
ipcMain.handle('pctra:backups', () => readCopies(backupDir()))

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

let dataRev = 0
ipcMain.on('pctra:rev', (_e, rev) => {
  if (typeof rev === 'number') dataRev = rev
})
ipcMain.on('pctra:sync-reply', (_e, id, result) => pending.get(id)?.(result))
ipcMain.handle('pctra:pairing', () => pairing())
ipcMain.handle('pctra:new-token', () => {
  writeConfig({ ...readConfig(), token: newToken() })
  return pairing()
})
/* ---------- Mises à jour automatiques (releases GitHub de PETRA-JS, fichier latest.yml) ---------- */

/**
 * État des mises à jour, envoyé à la page à chaque changement :
 * idle | checking | none (à jour) | downloading (percent) | ready (version) | error (message).
 */
let update = { kind: 'idle' }
function setUpdate(next) {
  update = next
  win?.webContents.send('pctra:update-state', update)
}
let checking = false
async function checkUpdates() {
  if (!app.isPackaged) return setUpdate({ kind: 'error', message: 'Mises à jour disponibles seulement dans PCTRA installé.' })
  if (checking || update.kind === 'downloading' || update.kind === 'ready') return
  checking = true
  try {
    await autoUpdater.checkForUpdates()
  } catch {
    /* l'événement « error » a déjà prévenu */
  } finally {
    checking = false
  }
}
function setupUpdates() {
  if (!app.isPackaged) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('checking-for-update', () => setUpdate({ kind: 'checking' }))
  autoUpdater.on('update-not-available', () => setUpdate({ kind: 'none' }))
  autoUpdater.on('update-available', (info) => setUpdate({ kind: 'downloading', version: info.version, percent: 0 }))
  autoUpdater.on('download-progress', (p) => setUpdate({ kind: 'downloading', version: update.version, percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (info) => setUpdate({ kind: 'ready', version: info.version }))
  autoUpdater.on('error', (e) => {
    if (update.kind === 'ready') return
    const m = String(e?.message)
    setUpdate({
      kind: 'error',
      message: /net::|ENOTFOUND|ETIMEDOUT|ECONN/.test(m)
        ? 'Pas de connexion Internet.'
        : // Release trouvée sans latest.yml : la nouvelle version est encore en train d'être publiée.
          /latest\.yml|404|Cannot find/i.test(m)
          ? 'Une nouvelle version est en cours de publication : réessaie dans quelques minutes.'
          : 'Vérification impossible pour le moment.',
    })
  })
  void checkUpdates()
  setInterval(checkUpdates, 6 * 3600 * 1000)
}
ipcMain.handle('pctra:update-state', () => update)
ipcMain.on('pctra:check-update', () => void checkUpdates())
ipcMain.on('pctra:install-update', () => {
  if (update.kind === 'ready') autoUpdater.quitAndInstall(true, true)
})

ipcMain.on('pctra:version', (e) => {
  e.returnValue = app.getVersion()
})

/* ---------- Fenêtre : mode, taille, zoom, premier plan, démarrage avec Windows ---------- */

const winPrefs = () => normalizePrefs(readConfig().window)
function saveWinPrefs(patch) {
  const c = readConfig()
  c.window = normalizePrefs({ ...normalizePrefs(c.window), ...patch })
  writeConfig(c)
  return c.window
}
const startedAtLogin = process.argv.includes('--au-demarrage')

function applyAutoStart(p) {
  if (!app.isPackaged) return
  app.setLoginItemSettings({ openAtLogin: p.autoStart, args: ['--au-demarrage'] })
}

/** Ce que la page affiche dans Paramètres › Fenêtre. */
function windowState() {
  const p = winPrefs()
  const area = screen.getDisplayMatching(win?.getBounds() ?? screen.getPrimaryDisplay().bounds).workAreaSize
  return { ...p, bounds: undefined, sizes: SIZES.filter((s) => s.width <= area.width && s.height <= area.height), screen: area, canAutoStart: app.isPackaged && process.platform !== 'linux' }
}
const sendWindowState = () => win?.webContents.send('pctra:window-state', windowState())

/** Applique un mode d'affichage à la fenêtre ouverte. */
function applyMode(mode) {
  if (!win) return
  if (mode === 'plein-ecran') return win.setFullScreen(true)
  if (win.isFullScreen()) win.setFullScreen(false)
  if (mode === 'maximise') win.maximize()
  else if (win.isMaximized()) win.unmaximize()
}

ipcMain.handle('pctra:window-get', () => windowState())
ipcMain.handle('pctra:window-set', (_e, patch) => {
  const before = winPrefs()
  const p = saveWinPrefs({ ...patch, ...(patch?.width ? { mode: 'fenetre', bounds: null } : {}) })
  if (patch?.width && win) {
    applyMode('fenetre')
    win.setSize(p.width, p.height)
    win.center()
  } else if (p.mode !== before.mode) applyMode(p.mode)
  if (p.zoom !== before.zoom) win?.webContents.setZoomFactor(p.zoom)
  if (p.onTop !== before.onTop) win?.setAlwaysOnTop(p.onTop)
  if (p.autoStart !== before.autoStart) applyAutoStart(p)
  return windowState()
})

/** Retient la position et la taille de la fenêtre (mode fenêtré) pour la rouvrir au même endroit. */
function rememberBounds() {
  if (!win || win.isFullScreen() || win.isMaximized() || win.isMinimized()) return
  const b = win.getBounds()
  saveWinPrefs({ bounds: b, width: b.width, height: b.height })
}

function createWindow() {
  const p = winPrefs()
  const areas = screen.getAllDisplays().map((d) => d.workArea)
  const place = boundsVisible(p.bounds, areas) ? p.bounds : { width: p.width, height: p.height }
  win = new BrowserWindow({
    ...place,
    minWidth: MIN.width,
    minHeight: MIN.height,
    show: false,
    title: 'PCTRA',
    backgroundColor: '#0D0F0E',
    autoHideMenuBar: true,
    alwaysOnTop: p.onTop,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: false },
  })
  win.once('ready-to-show', () => {
    if (startedAtLogin && p.startMinimized) {
      win.showInactive()
      win.minimize()
    } else win.show()
    applyMode(p.mode)
  })
  win.webContents.on('did-finish-load', () => win?.webContents.setZoomFactor(winPrefs().zoom))
  // F11 : plein écran ; Ctrl + / Ctrl - / Ctrl 0 : zoom (retenus pour les prochaines fois).
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return
    const zoomBy = (d) => {
      const z = saveWinPrefs({ zoom: d === 0 ? 1 : winPrefs().zoom + d }).zoom
      win.webContents.setZoomFactor(z)
      sendWindowState()
    }
    if (input.key === 'F11') {
      e.preventDefault()
      const full = !win.isFullScreen()
      saveWinPrefs({ mode: full ? 'plein-ecran' : 'fenetre' })
      applyMode(full ? 'plein-ecran' : 'fenetre')
      sendWindowState()
    } else if (input.control && (input.key === '+' || input.key === '=')) {
      e.preventDefault()
      zoomBy(0.1)
    } else if (input.control && input.key === '-') {
      e.preventDefault()
      zoomBy(-0.1)
    } else if (input.control && input.key === '0') {
      e.preventDefault()
      zoomBy(0)
    }
  })
  win.on('resized', rememberBounds)
  win.on('moved', rememberBounds)
  win.on('close', rememberBounds)
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
  applyAutoStart(winPrefs())
  setupUpdates()
  try {
    await startSyncServer({ port: PORT, getToken: token, handle: handleSync, getRev: () => dataRev })
  } catch (e) {
    serverError =
      e?.code === 'EADDRINUSE'
        ? `Le port ${PORT} est déjà utilisé : ferme l’autre PCTRA ouvert, puis relance.`
        : `Synchro indisponible : ${e?.message ?? e}`
  }
})

app.on('window-all-closed', () => app.quit())
