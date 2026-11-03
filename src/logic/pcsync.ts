import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { getData, normalize, onLocalChange, setData, update } from '../data/store'
import type { AppData, PcLink } from '../data/types'
import { REV_PATH, SYNC_PATH, merge, revOf, toWire, type PairInfo } from './sync'

/**
 * Côté téléphone : synchro avec l'appli PC (PCTRA) par le Wi-Fi local. Le téléphone envoie
 * ses données, le PC les fusionne avec les siennes et renvoie le résultat, que le téléphone
 * fusionne à son tour : les deux repartent avec les mêmes données.
 */

export type SyncResult = { ok: true; at: number } | { ok: false; error: string }

const setPc = (pc: PcLink | undefined) => update((d) => ({ ...d, settings: { ...d.settings, pc } }))

/** Associe le PC scanné (remplace l'ancien) puis lance une première synchro. */
export async function pairWith(info: PairInfo): Promise<SyncResult> {
  setPc({ hosts: info.hosts, port: info.port, token: info.token, name: info.name })
  return syncNow()
}

export function unpair() {
  setPc(undefined)
}

class HttpError extends Error {
  status: number
  constructor(status: number) {
    super(`HTTP ${status}`)
    this.status = status
  }
}

/** POST JSON : natif sur le téléphone (http:// sur le réseau local), fetch dans un navigateur. */
async function postJson(url: string, token: string, body: unknown, timeoutMs: number): Promise<unknown> {
  const headers = { 'Content-Type': 'application/json', 'X-Petra-Token': token }
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.request({ url, method: 'POST', headers, data: body, connectTimeout: timeoutMs, readTimeout: 30000 })
    if (res.status !== 200) throw new HttpError(res.status)
    return typeof res.data === 'string' ? JSON.parse(res.data) : res.data
  }
  const ctl = new AbortController()
  const timer = window.setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctl.signal })
    if (!res.ok) throw new HttpError(res.status)
    return await res.json()
  } finally {
    window.clearTimeout(timer)
  }
}

/** GET JSON court (consultation de la révision du PC). */
async function getJson(url: string, token: string, timeoutMs: number): Promise<unknown> {
  const headers = { 'X-Petra-Token': token }
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.request({ url, method: 'GET', headers, connectTimeout: timeoutMs, readTimeout: timeoutMs })
    if (res.status !== 200) throw new HttpError(res.status)
    return typeof res.data === 'string' ? JSON.parse(res.data) : res.data
  }
  const ctl = new AbortController()
  const timer = window.setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { headers, signal: ctl.signal })
    if (!res.ok) throw new HttpError(res.status)
    return await res.json()
  } finally {
    window.clearTimeout(timer)
  }
}

/** Révision des données du PC à la dernière synchro réussie. */
let knownPcRev: number | undefined

let running: Promise<SyncResult> | undefined

/** Synchronise maintenant avec le PC associé. Une seule synchro à la fois. */
export function syncNow(): Promise<SyncResult> {
  running ??= doSync().finally(() => (running = undefined))
  return running
}

/** Synchro discrète (ouverture de l'appli, fin de séance) : ne fait rien si aucun PC n'est associé. */
export function autoSync() {
  if (getData().settings.pc) void syncNow()
}

async function doSync(): Promise<SyncResult> {
  const pc = getData().settings.pc
  if (!pc) return { ok: false, error: 'Aucun PC associé' }
  let refused = false
  for (const host of pc.hosts) {
    try {
      const sent = toWire(getData())
      const reply = (await postJson(`http://${host}:${pc.port}${SYNC_PATH}`, pc.token, { app: 'PETRA', data: sent }, 4000)) as { data?: Partial<AppData> }
      if (!reply?.data || !Array.isArray(reply.data.programs)) throw new Error('réponse')
      // Fusion avec l'état actuel (une série a pu être validée pendant l'échange).
      const merged = merge(getData(), normalize(reply.data))
      const at = Date.now()
      knownPcRev = revOf(merged)
      setData({ ...merged, settings: { ...merged.settings, pc: { ...pc, hosts: [host, ...pc.hosts.filter((h) => h !== host)], lastAt: at, lastError: undefined } } }, { track: false })
      return { ok: true, at }
    } catch (e) {
      if (e instanceof HttpError && e.status === 401) refused = true
    }
  }
  const error = refused
    ? 'Le PC a refusé la synchro : scanne à nouveau son QR code'
    : 'PC introuvable : vérifie que PCTRA est ouvert et que le téléphone est sur le même Wi-Fi'
  const now = getData().settings.pc
  if (now) setPc({ ...now, lastError: error })
  return { ok: false, error }
}

/* ---------- Synchro instantanée, tant que l'appli est ouverte ---------- */

/** Délai après une modification avant de l'envoyer (on regroupe les changements rapprochés). */
const PUSH_DELAY = 800
/** Fréquence de consultation du PC pour voir s'il a changé quelque chose. */
const POLL_EVERY = 2500
/** Pause après un PC injoignable (hors de la maison…), pour ne pas insister. */
const POLL_BACKOFF = 30000

let live = false
/**
 * Démarre la synchro instantanée : chaque modification part vers le PC dans la seconde, et le
 * téléphone regarde toutes les 2,5 s si le PC a changé quelque chose (seulement appli au premier plan).
 */
export function startLiveSync() {
  if (live) return
  live = true
  let pushTimer = 0
  onLocalChange(() => {
    if (!getData().settings.pc) return
    window.clearTimeout(pushTimer)
    pushTimer = window.setTimeout(() => void syncNow(), PUSH_DELAY)
  })
  const poll = async () => {
    let wait = POLL_EVERY
    const pc = getData().settings.pc
    if (pc && document.visibilityState === 'visible' && !running) {
      try {
        const r = (await getJson(`http://${pc.hosts[0]}:${pc.port}${REV_PATH}`, pc.token, 2000)) as { rev?: number }
        if (typeof r?.rev === 'number' && r.rev !== knownPcRev) await syncNow()
      } catch {
        wait = POLL_BACKOFF
      }
    }
    window.setTimeout(poll, wait)
  }
  window.setTimeout(poll, POLL_EVERY)
}
