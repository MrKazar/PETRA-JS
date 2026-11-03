import type { AppData, Settings, SyncMeta } from '../data/types'

/**
 * Synchro téléphone ↔ appli PC, sans cloud : les deux appareils gardent chacun leurs données et
 * les fusionnent élément par élément (programme, séance, routine, jour de suivi…). Pour chaque
 * élément, la version modifiée le plus récemment gagne, et une suppression plus récente que la
 * dernière modification l'emporte (elle est retenue quelque temps dans `sync.gone`).
 */

/** Port de l'appli PC sur le réseau local. */
export const PC_PORT = 47123
export const SYNC_PATH = '/petra/sync'
export const PING_PATH = '/petra/ping'
/** Préfixe du QR code d'association affiché par l'appli PC. */
export const PAIR_PREFIX = 'PETRA-PC:'
/** Une suppression est oubliée au bout d'un an (l'autre appareil a eu le temps de la recevoir). */
const GONE_TTL = 365 * 24 * 3600 * 1000

type Keyed = { id: string }
const COLLECTIONS = [
  ['programs', 'p'],
  ['sessions', 's'],
  ['routines', 'r'],
] as const
const RECORDS = [
  ['routineLog', 'log'],
  ['planOverrides', 'ov'],
] as const
const FIELDS = ['weekPlan', 'weekPlanB', 'lastFinisher', 'finishers'] as const
/** Réglages communs aux deux appareils ; les autres (notifications, vibration, écran…) restent propres à chacun. */
export const SYNCED_SETTINGS = ['name', 'defaultRestSec', 'abWeeks', 'weekAAnchor', 'finishersEnabled', 'theme', 'timerSound'] as const satisfies readonly (keyof Settings)[]

const emptyMeta = (): SyncMeta => ({ stamps: {}, gone: {} })

/**
 * Note ce qui a changé entre deux états (appelé à chaque modification des données) : les éléments
 * modifiés reçoivent la date `now`, ceux qui ont disparu sont notés comme supprimés.
 */
export function track(prev: AppData, next: AppData, now = Date.now()): SyncMeta | undefined {
  const base = prev.sync ?? next.sync
  let meta: SyncMeta | undefined
  const edit = () => (meta ??= { stamps: { ...(base?.stamps ?? {}) }, gone: { ...(base?.gone ?? {}) } })
  const touched = (k: string) => {
    const m = edit()
    m.stamps[k] = now
    delete m.gone[k]
  }
  const removed = (k: string) => {
    const m = edit()
    m.gone[k] = now
    delete m.stamps[k]
  }

  for (const [field, p] of COLLECTIONS) {
    const a = prev[field] as Keyed[]
    const b = next[field] as Keyed[]
    if (a === b) continue
    const before = new Map(a.map((x) => [x.id, x]))
    for (const x of b) {
      if (before.get(x.id) !== x) touched(`${p}:${x.id}`)
      before.delete(x.id)
    }
    for (const id of before.keys()) removed(`${p}:${id}`)
  }
  for (const [field, p] of RECORDS) {
    const a = prev[field] as Record<string, unknown>
    const b = next[field] as Record<string, unknown>
    if (a === b) continue
    for (const k of Object.keys(b)) if (!(k in a) || a[k] !== b[k]) touched(`${p}:${k}`)
    for (const k of Object.keys(a)) if (!(k in b)) removed(`${p}:${k}`)
  }
  for (const f of FIELDS) if (prev[f] !== next[f]) touched(`f:${f}`)
  for (const k of SYNCED_SETTINGS) if (prev.settings[k] !== next.settings[k]) touched(`set:${k}`)
  return meta ?? base
}

/**
 * Fusionne les données d'un autre appareil dans les données locales. La séance en cours et les
 * réglages propres à l'appareil restent ceux de `local`.
 *
 * À égalité (élément jamais modifié depuis l'arrivée de la synchro, des deux côtés), `local` gagne,
 * sauf avec `preferRemote` : le PC l'utilise pour que le téléphone, qui a l'historique, fasse foi.
 */
export function merge(local: AppData, remote: AppData, now = Date.now(), opts: { preferRemote?: boolean } = {}): AppData {
  const L = local.sync ?? emptyMeta()
  const R = remote.sync ?? emptyMeta()
  const out = emptyMeta()

  /** Qui garde l'élément `key` : local, distant, ou personne (supprimé). */
  const pick = (key: string, lHas: boolean, rHas: boolean): 'l' | 'r' | null => {
    const lt = lHas ? (L.stamps[key] ?? 0) : -Infinity
    const rt = rHas ? (R.stamps[key] ?? 0) : -Infinity
    const dt = Math.max(L.gone[key] ?? -Infinity, R.gone[key] ?? -Infinity)
    const pt = Math.max(lt, rt)
    if (dt > -Infinity && dt >= pt) {
      if (now - dt < GONE_TTL) out.gone[key] = dt
      return null
    }
    if (pt === -Infinity) return null
    if (pt > 0) out.stamps[key] = pt
    if (lt !== rt) return lt > rt ? 'l' : 'r'
    return opts.preferRemote ? 'r' : 'l'
  }

  const result: AppData = { ...local, settings: { ...local.settings } }

  for (const [field, p] of COLLECTIONS) {
    const a = local[field] as Keyed[]
    const b = remote[field] as Keyed[]
    const rById = new Map(b.map((x) => [x.id, x]))
    const lIds = new Set(a.map((x) => x.id))
    const list: Keyed[] = []
    for (const x of a) {
      const who = pick(`${p}:${x.id}`, true, rById.has(x.id))
      if (who) list.push(who === 'l' ? x : rById.get(x.id)!)
    }
    for (const x of b) if (!lIds.has(x.id) && pick(`${p}:${x.id}`, false, true)) list.push(x)
    ;(result as unknown as Record<string, Keyed[]>)[field] = list
  }
  result.sessions = [...result.sessions].sort((x, y) => y.startedAt - x.startedAt)

  for (const [field, p] of RECORDS) {
    const a = local[field] as Record<string, unknown>
    const b = remote[field] as Record<string, unknown>
    const rec: Record<string, unknown> = {}
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const who = pick(`${p}:${k}`, k in a, k in b)
      if (who) rec[k] = who === 'l' ? a[k] : b[k]
    }
    ;(result as unknown as Record<string, unknown>)[field] = rec
  }

  for (const f of FIELDS) if (pick(`f:${f}`, true, true) === 'r') (result as unknown as Record<string, unknown>)[f] = remote[f]
  for (const k of SYNCED_SETTINGS) if (pick(`set:${k}`, true, true) === 'r' && remote.settings[k] !== undefined) (result.settings as unknown as Record<string, unknown>)[k] = remote.settings[k]

  result.sync = out
  return result
}

/** Ce qu'un appareil envoie à l'autre : tout sauf la séance en cours et l'association au PC. */
export function toWire(d: AppData): AppData {
  const { active: _active, ...rest } = d
  const { pc: _pc, ...settings } = d.settings
  return { ...rest, settings: settings as Settings }
}

/* ---------- QR code d'association ---------- */

export interface PairInfo {
  /** Adresses IP du PC sur le réseau local. */
  hosts: string[]
  port: number
  token: string
  name: string
}

const toB64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)))
const fromB64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)))

export function encodePairing(p: PairInfo): string {
  return PAIR_PREFIX + toB64(JSON.stringify({ v: 1, h: p.hosts, p: p.port, t: p.token, n: p.name }))
}

export const isPairingCode = (text: string) => text.trim().startsWith(PAIR_PREFIX)

export function decodePairing(text: string): PairInfo {
  const t = text.trim()
  if (!t.startsWith(PAIR_PREFIX)) throw new Error('Ce n’est pas un QR code de l’appli PC PETRA')
  let o: { h?: unknown; p?: unknown; t?: unknown; n?: unknown }
  try {
    o = JSON.parse(fromB64(t.slice(PAIR_PREFIX.length)))
  } catch {
    throw new Error('QR code de l’appli PC illisible')
  }
  if (!Array.isArray(o.h) || !o.h.length || typeof o.p !== 'number' || typeof o.t !== 'string') throw new Error('QR code de l’appli PC incomplet')
  return { hosts: o.h.map(String), port: o.p, token: o.t, name: typeof o.n === 'string' && o.n ? o.n : 'PC' }
}
