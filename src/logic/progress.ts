import { findCatalog } from '../data/catalog'
import type { ProgramExercise, Session, SessionExercise } from '../data/types'

/** Même exercice d'une séance à l'autre : par fiche du catalogue, sinon par nom. */
export const exerciseKey = (e: { catalogId?: string; name: string }) => e.catalogId ?? e.name.trim().toLowerCase()

export interface ProgressPoint {
  sessionId: string
  date: number
  /** Charge max des séries de travail (ou de toutes les séries s'il n'y en a pas). */
  weight?: number
  /** Répétitions totales des séries retenues. */
  reps: number
  durationSec: number
  volume: number
}

function point(s: Session, e: SessionExercise): ProgressPoint | undefined {
  const done = e.sets.filter((x) => x.done)
  if (!done.length) return undefined
  const work = done.filter((x) => x.phase === 'travail')
  const sets = work.length ? work : done
  const weights = sets.map((x) => x.weight ?? 0).filter((w) => w > 0)
  return {
    sessionId: s.id,
    date: s.startedAt,
    weight: weights.length ? Math.max(...weights) : undefined,
    reps: sets.reduce((n, x) => n + (x.reps ?? 0), 0),
    durationSec: done.reduce((n, x) => n + (x.durationSec ?? 0), 0),
    volume: done.reduce((n, x) => n + (x.reps ?? 0) * (x.weight ?? 0) * (e.parCote ? 2 : 1), 0),
  }
}

/** Historique d'un exercice dans les séances d'un programme, de la plus ancienne à la plus récente. */
export function exerciseHistory(sessions: Session[], programId: string | undefined, key: string): ProgressPoint[] {
  const out: ProgressPoint[] = []
  for (const s of sessions) {
    if (programId && s.programId !== programId) continue
    const e = s.exercises.find((x) => exerciseKey(x) === key)
    const p = e && point(s, e)
    if (p) out.push(p)
  }
  return out.sort((a, b) => a.date - b.date)
}

/** Séances consécutives réussies à la charge de travail avant de proposer d'augmenter. */
export const OVERLOAD_STREAK = 2

const LOWER_BODY = new Set(['quadriceps', 'ischio_jambiers', 'fessiers', 'lombaires', 'corps_entier', 'adducteurs'])

/** Pas d'augmentation : 5 kg sur les gros mouvements du bas du corps, 1 à 2 kg en isolation, 2,5 kg sinon. */
export function overloadIncrement(e: ProgramExercise): number {
  const profil = findCatalog(e.catalogId)?.profil
  if (profil === 'poly_lourd' && LOWER_BODY.has(e.group)) return 5
  if (profil === 'iso_petit') return 1
  if (profil === 'iso' || profil === 'abdos_charge') return 2
  return 2.5
}

export interface OverloadSuggestion {
  exerciseId: string
  name: string
  from: number
  to: number
  streak: number
}

/**
 * Surcharge progressive : si les dernières séances du programme ont toutes leurs séries de travail
 * réussies (répétitions prévues atteintes, à la charge de travail ou plus), on propose d'augmenter.
 */
export function overloadSuggestion(e: ProgramExercise, sessions: Session[], programId: string, streak = OVERLOAD_STREAK): OverloadSuggestion | undefined {
  if (e.usesLoad === false || !e.workLoad || e.workLoad <= 0) return undefined
  const planned = e.sets.filter((x) => x.phase === 'travail' && x.reps != null)
  if (!planned.length) return undefined
  const target = Math.max(...planned.map((x) => x.reps!))
  const key = exerciseKey(e)
  const recent = [...sessions]
    .filter((s) => s.programId === programId)
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((s) => s.exercises.find((x) => exerciseKey(x) === key))
    .filter((x): x is SessionExercise => !!x)
    .slice(0, streak)
  if (recent.length < streak) return undefined
  const ok = recent.every((x) => {
    const work = x.sets.filter((s) => s.phase === 'travail' && s.done)
    return work.length >= planned.length && work.every((s) => (s.reps ?? 0) >= target && (s.weight ?? 0) >= e.workLoad!)
  })
  if (!ok) return undefined
  const to = Math.round((e.workLoad + overloadIncrement(e)) * 2) / 2
  return { exerciseId: e.id, name: e.name, from: e.workLoad, to, streak }
}

export function overloadSuggestions(programId: string | undefined, sessions: Session[], exercises: ProgramExercise[]): OverloadSuggestion[] {
  if (!programId) return []
  return exercises.map((e) => overloadSuggestion(e, sessions, programId)).filter((x): x is OverloadSuggestion => !!x)
}
