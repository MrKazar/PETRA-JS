import { useEffect, useState } from 'react'
import { getData, normalize, onDataChange, setData } from '../data/store'
import { toast } from '../ui/kit'
import type { AppData } from '../data/types'
import { UPDATE_PCTRA, merge, revOf, toWire, versionGap, type PairInfo } from './sync'

/**
 * Côté PC (PCTRA) : l'appli Electron expose `window.pctra` (voir desktop/preload.cjs). Le
 * processus principal reçoit la synchro du téléphone sur le réseau local et la passe à la page,
 * qui fusionne avec ses données et renvoie le résultat.
 */

export interface PairingState extends PairInfo {
  /** Message si le serveur local n'a pas pu démarrer (port occupé…). */
  error?: string
}

export type UpdateState =
  | { kind: 'idle' | 'checking' | 'none' }
  | { kind: 'downloading'; version?: string; percent: number }
  | { kind: 'ready'; version: string }
  | { kind: 'error'; message: string }

interface PctraBridge {
  /** Version de PCTRA (indépendante de celle de PETRA). */
  version: string
  pairing(): Promise<PairingState>
  newToken(): Promise<PairingState>
  onSync(cb: (id: number, payload: { data?: Partial<AppData> }) => void): void
  reply(id: number, result: { data?: AppData; error?: string }): void
  /** État des mises à jour de PCTRA. */
  updateState(): Promise<UpdateState>
  onUpdateState(cb: (state: UpdateState) => void): void
  /** Cherche une nouvelle version (elle se télécharge toute seule si elle existe). */
  checkUpdate(): void
  /** Redémarre PCTRA sur la nouvelle version. */
  installUpdate(): void
  /** Révision actuelle des données, que le téléphone consulte pour la synchro instantanée. */
  setRev(rev: number): void
  /** Copies des données faites après chaque synchro (Documents/PCTRA), la plus récente en premier. */
  backups?(): Promise<string[]>
}

declare global {
  interface Window {
    pctra?: PctraBridge
  }
}

export const desktop: PctraBridge | undefined = typeof window !== 'undefined' ? window.pctra : undefined
export const isDesktop = !!desktop

type Listener = (at: number) => void
const listeners = new Set<Listener>()
/** Prévient l'écran quand le téléphone vient de se synchroniser. */
export function onPhoneSync(l: Listener) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

const LAST_KEY = 'pctra.lastPhoneSync'
/** Dernière synchro reçue du téléphone (propre au PC). */
export function lastPhoneSync(): number | undefined {
  try {
    const v = Number(localStorage.getItem(LAST_KEY))
    return v > 0 ? v : undefined
  } catch {
    return undefined
  }
}

let started = false
/** Prévenu une seule fois par lancement qu'un téléphone en retard se synchronise. */
let warnedOldPhone = false
/** Branche la réception des synchros (une fois, au démarrage de l'appli PC). */
export function startDesktop() {
  if (!desktop || started) return
  started = true
  // Le téléphone consulte cette révision : dès qu'elle change, il se synchronise.
  let rev = revOf(getData())
  desktop.setRev(rev)
  onDataChange(() => {
    const r = revOf(getData())
    if (r !== rev) desktop?.setRev((rev = r))
  })
  desktop.onSync((id, payload) => {
    try {
      if (!payload?.data || !Array.isArray(payload.data.programs)) throw new Error('format')
      const gap = versionGap(payload.data)
      // Données d'un PETRA plus récent : les fusionner risquerait d'en perdre une partie.
      if (gap === 'newer') {
        desktop.reply(id, { error: UPDATE_PCTRA })
        toast('Mets PCTRA à jour pour synchroniser')
        return
      }
      // Le téléphone fait foi pour ce qui n'a jamais été modifié depuis l'arrivée de la synchro.
      const merged = merge(getData(), normalize(payload.data), Date.now(), { preferRemote: true })
      setData(merged, { track: false })
      desktop.reply(id, { data: toWire(merged) })
      const at = Date.now()
      try {
        localStorage.setItem(LAST_KEY, String(at))
      } catch {
        /* rien */
      }
      listeners.forEach((l) => l(at))
      if (gap === 'older' && !warnedOldPhone) {
        warnedOldPhone = true
        toast('Synchronisé, mais PETRA n’est pas à jour sur le téléphone')
      } else toast('Synchronisé avec le téléphone')
    } catch {
      desktop.reply(id, { error: 'Données reçues illisibles' })
    }
  })
}

/** État des mises à jour de PCTRA, pour l'écran (bandeau, Paramètres). */
export function useUpdateState(): UpdateState {
  const [state, setState] = useState<UpdateState>({ kind: 'idle' })
  useEffect(() => {
    if (!desktop) return
    let alive = true
    void desktop.updateState().then((s) => alive && setState(s))
    updateListeners.add(setState)
    return () => {
      alive = false
      updateListeners.delete(setState)
    }
  }, [])
  return state
}
const updateListeners = new Set<(s: UpdateState) => void>()
desktop?.onUpdateState((s) => updateListeners.forEach((l) => l(s)))
