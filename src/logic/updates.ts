import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

const REPO = 'MrKazar/PETRA-JS'

export interface UpdateInfo {
  version: string
  url: string
}

/** Compare deux versions « 1.2.3 ». */
export function isNewer(remote: string, local: string): boolean {
  const a = remote.replace(/^v/, '').split('.').map(Number)
  const b = local.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}

/** Interroge la dernière release GitHub ; renvoie le lien de l'APK si elle est plus récente. */
export async function checkForUpdate(): Promise<UpdateInfo | undefined> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
  if (res.status === 404) return undefined
  if (!res.ok) throw new Error(`GitHub ${res.status}`)
  const rel = (await res.json()) as { tag_name: string; html_url: string; assets?: { name: string; browser_download_url: string }[] }
  if (!isNewer(rel.tag_name, __APP_VERSION__)) return undefined
  const apk = rel.assets?.find((a) => a.name.endsWith('.apk'))
  return { version: rel.tag_name.replace(/^v/, ''), url: apk?.browser_download_url ?? rel.html_url }
}

/* ---------- Installation depuis l'appli (Android) ---------- */


interface ApkUpdaterPlugin {
  canInstall(): Promise<{ allowed: boolean }>
  openInstallSettings(): Promise<void>
  downloadAndInstall(opts: { url: string }): Promise<void>
  addListener(event: 'progress', cb: (e: { progress: number }) => void): Promise<PluginListenerHandle>
}

const ApkUpdater = registerPlugin<ApkUpdaterPlugin>('ApkUpdater')

export const canInstallInApp = () => Capacitor.getPlatform() === 'android'

export type UpdaterState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'none' }
  | { kind: 'error'; message: string }
  | { kind: 'available'; info: UpdateInfo }
  | { kind: 'permission'; info: UpdateInfo }
  | { kind: 'downloading'; info: UpdateInfo; progress: number }
  | { kind: 'installing'; info: UpdateInfo }

let state: UpdaterState = { kind: 'idle' }
const listeners = new Set<() => void>()
const set = (s: UpdaterState) => {
  state = s
  listeners.forEach((l) => l())
}
export const getUpdaterState = () => state
export const subscribeUpdater = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export async function checkNow() {
  if (state.kind === 'checking' || state.kind === 'downloading') return
  set({ kind: 'checking' })
  try {
    const info = await checkForUpdate()
    set(info ? { kind: 'available', info } : { kind: 'none' })
  } catch {
    set({ kind: 'error', message: 'Impossible de vérifier (pas de connexion ?)' })
  }
}

/** Vérification silencieuse au lancement : n'affiche rien si elle échoue. */
export async function checkOnLaunch() {
  try {
    const info = await checkForUpdate()
    if (info) set({ kind: 'available', info })
  } catch {
    /* hors ligne : on réessaiera au prochain lancement */
  }
}

export async function installUpdate(info: UpdateInfo) {
  if (!canInstallInApp() || !info.url.endsWith('.apk')) {
    window.location.href = info.url
    return
  }
  const { allowed } = await ApkUpdater.canInstall()
  if (!allowed) {
    set({ kind: 'permission', info })
    await ApkUpdater.openInstallSettings()
    return
  }
  set({ kind: 'downloading', info, progress: 0 })
  const sub = await ApkUpdater.addListener('progress', (e) => set({ kind: 'downloading', info, progress: e.progress }))
  try {
    await ApkUpdater.downloadAndInstall({ url: info.url })
    set({ kind: 'installing', info })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    set(msg === 'PERMISSION' ? { kind: 'permission', info } : { kind: 'error', message: `Échec du téléchargement : ${msg}` })
  } finally {
    sub.remove()
  }
}
