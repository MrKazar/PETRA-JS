import { getData, normalize, setData } from '../data/store'
import { toast } from '../ui/kit'
import type { AppData } from '../data/types'
import { merge, toWire, type PairInfo } from './sync'

/**
 * Côté PC (PCTRA) : l'appli Electron expose `window.pctra` (voir desktop/preload.cjs). Le
 * processus principal reçoit la synchro du téléphone sur le réseau local et la passe à la page,
 * qui fusionne avec ses données et renvoie le résultat.
 */

export interface PairingState extends PairInfo {
  /** Message si le serveur local n'a pas pu démarrer (port occupé…). */
  error?: string
}

interface PctraBridge {
  /** Version de PCTRA (indépendante de celle de PETRA). */
  version: string
  pairing(): Promise<PairingState>
  newToken(): Promise<PairingState>
  onSync(cb: (id: number, payload: { data?: Partial<AppData> }) => void): void
  reply(id: number, result: { data?: AppData; error?: string }): void
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
/** Branche la réception des synchros (une fois, au démarrage de l'appli PC). */
export function startDesktop() {
  if (!desktop || started) return
  started = true
  desktop.onSync((id, payload) => {
    try {
      if (!payload?.data || !Array.isArray(payload.data.programs)) throw new Error('format')
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
      toast('Synchronisé avec le téléphone')
    } catch {
      desktop.reply(id, { error: 'Données reçues illisibles' })
    }
  })
}
