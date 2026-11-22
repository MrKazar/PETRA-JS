import type { AppData } from '../data/types'
import { evaluate } from './achievements'

export interface Progress {
  level: number
  /** Succès secrets obtenus (ils débloquent les thèmes secrets). */
  secrets: string[]
}

/**
 * Niveau d'XP et succès secrets, gardés en cache : ils ne changent que quand l'historique ou les
 * réglages changent (pas à chaque série de la séance en cours), donc le thème peut les lire à chaque affichage.
 */
let last: { key: unknown[]; p: Progress } | undefined

export function progress(data: AppData): Progress {
  const key = [data.sessions, data.programs, data.routines, data.routineLog, data.settings]
  if (last && last.key.every((k, i) => k === key[i])) return last.p
  const ev = evaluate(data)
  const p = { level: ev.level.level, secrets: ev.list.filter((a) => a.def.family === 'secrets' && a.reached > 0).map((a) => a.def.id) }
  last = { key, p }
  return p
}

export const currentLevel = (data: AppData) => progress(data).level
