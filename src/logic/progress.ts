import { findCatalog, roundLoad } from '../data/catalog'
import { loadKind, needsStep, stepLoad } from './loads'
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

/**
 * Prochaine charge de travail : un cran du matériel (haltères 1 kg puis 2 kg au-delà de 10 kg, barre 2,5 kg,
 * machine / poulie l'écart entre deux plaques). Les gros mouvements du bas du corps à la barre montent de 5 kg.
 */
export function nextWorkLoad(e: ProgramExercise, from: number): number {
  const k = loadKind(e)
  if (k === 'barre' && !e.loadStep && findCatalog(e.catalogId)?.profil === 'poly_lourd' && LOWER_BODY.has(e.group)) return roundLoad(from + 5)
  return stepLoad(e, from, 1)
}

/** Séries qui servent de référence : le travail, ou en mode libre les séries simples avec charge. */
export function workSetsOf<T extends { phase: string }>(sets: T[]): T[] {
  const work = sets.filter((x) => x.phase === 'travail')
  return work.length ? work : sets.filter((x) => x.phase === 'serie')
}

/** Charge de référence : charge de travail, sinon la plus lourde des séries simples (mode libre). */
export function referenceLoad(e: ProgramExercise): number | undefined {
  if (e.workLoad && e.workLoad > 0) return e.workLoad
  const w = workSetsOf(e.sets).map((x) => x.weight ?? 0).filter((x) => x > 0)
  return w.length ? Math.max(...w) : undefined
}

export interface OverloadSuggestion {
  exerciseId: string
  name: string
  from: number
  to: number
  streak: number
  /** Machine / poulie dont on ne connaît pas encore l'écart entre deux plaques : à demander avant d'appliquer. */
  needsStep?: boolean
}

/**
 * Surcharge progressive : si les dernières séances du programme ont toutes leurs séries de travail
 * réussies (répétitions prévues atteintes, à la charge de travail ou plus), on propose d'augmenter.
 */
export function overloadSuggestion(e: ProgramExercise, sessions: Session[], programId: string, streak = OVERLOAD_STREAK): OverloadSuggestion | undefined {
  if (e.usesLoad === false || e.parts) return undefined
  const from = referenceLoad(e)
  if (!from) return undefined
  const planned = workSetsOf(e.sets).filter((x) => x.reps != null && x.durationSec == null)
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
    const work = workSetsOf(x.sets).filter((s) => s.done)
    return work.length >= planned.length && work.every((s) => (s.reps ?? 0) >= target && (s.weight ?? 0) >= from)
  })
  if (!ok) return undefined
  if (needsStep(e)) return { exerciseId: e.id, name: e.name, from, to: from, streak, needsStep: true }
  return { exerciseId: e.id, name: e.name, from, to: nextWorkLoad(e, from), streak }
}

/** Applique la nouvelle charge : charge de travail (mode guidé) ou séries simples à l'ancienne charge (mode libre). */
export function withOverload(e: ProgramExercise, from: number, to: number, apply: (e: ProgramExercise, load: number) => ProgramExercise): ProgramExercise {
  if (e.workLoad && e.workLoad > 0) return apply(e, to)
  return { ...e, sets: e.sets.map((s) => (s.phase === 'serie' && (s.weight ?? 0) >= from ? { ...s, weight: to } : s)) }
}

export function overloadSuggestions(programId: string | undefined, sessions: Session[], exercises: ProgramExercise[]): OverloadSuggestion[] {
  if (!programId) return []
  return exercises.map((e) => overloadSuggestion(e, sessions, programId)).filter((x): x is OverloadSuggestion => !!x)
}
