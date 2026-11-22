import type { AppData } from '../data/types'
import { evaluate } from './achievements'

/**
 * Niveau d'XP actuel, gardé en cache : il ne change que quand l'historique ou les réglages changent
 * (pas à chaque série de la séance en cours), donc le thème peut le lire à chaque affichage.
 */
let last: { key: unknown[]; level: number } | undefined

export function currentLevel(data: AppData): number {
  const key = [data.sessions, data.programs, data.routines, data.routineLog, data.settings]
  if (last && last.key.every((k, i) => k === key[i])) return last.level
  const level = evaluate(data).level.level
  last = { key, level }
  return level
}
