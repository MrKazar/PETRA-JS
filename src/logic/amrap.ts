import type { ActiveSession, Amrap, AmrapRun, PlannedSet, ProgramExercise, Session, SessionExercise, SessionSet, SupersetPart } from '../data/types'
import { uid } from './util'

/**
 * AMRAP (1.4.3) : un circuit d'exercices répété autant de fois que possible pendant une durée donnée.
 * Pendant l'effort, un seul appui « +1 tour » par tour fini ; à la fin du temps, on saisit les
 * répétitions du tour entamé. Le résultat devient des séries faites (un tour = une série de chaque
 * exercice du circuit), donc le volume, le schéma du corps et l'XP les comptent comme un superset.
 */

/** Décompte avant le départ. */
export const AMRAP_PREP_SEC = 10
export const AMRAP_DURATIONS = [5, 10, 12, 15, 20]

/** Tour type : la série du programme, avec les répétitions (ou secondes) et charges de chaque exercice. */
export function amrapRound(parts: SupersetPart[]): PlannedSet {
  return {
    phase: 'serie',
    restSec: 0,
    parts: parts.map((p) => (p.durationSec != null ? { durationSec: p.durationSec } : { reps: p.reps ?? 10, ...(p.weight != null ? { weight: p.weight } : {}) })),
  }
}

export function makeAmrap(name: string, parts: SupersetPart[], capSec: number, base?: ProgramExercise): ProgramExercise {
  return {
    id: base?.id ?? uid(),
    name: name.trim() || 'AMRAP',
    group: 'amrap',
    parCote: false,
    restSec: 0,
    parts,
    sets: [amrapRound(parts)],
    amrap: { capSec },
    ...(base?.note ? { note: base.note } : {}),
  }
}

export const isAmrap = (e: { amrap?: Amrap }): boolean => !!e.amrap

/** Résultat enregistré (le chrono est fini et le tour entamé saisi). */
export const amrapDone = (e: { amrap?: Amrap }): boolean => e.amrap?.rounds != null

/** Répétitions d'un tour complet (les exercices en secondes ne comptent pas). */
export const repsPerRound = (e: { parts?: SupersetPart[]; sets?: PlannedSet[] }): number =>
  (e.parts ?? []).reduce((n, p, k) => n + (p.durationSec != null ? 0 : (e.sets?.[0]?.parts?.[k]?.reps ?? p.reps ?? 0)), 0)

/* ---------- Chrono ---------- */

/** Secondes écoulées depuis le départ (négatif pendant le décompte), pauses déduites, plafonné à la durée. */
export function elapsedSec(run: AmrapRun, capSec: number, now = Date.now()): number {
  const until = run.stoppedAt ?? run.pausedAt ?? now
  return Math.min(capSec, (until - run.startedAt - run.pausedMs) / 1000)
}

export const runningAmrap = (s: Pick<Session, 'exercises'>): SessionExercise | undefined => s.exercises.find((e) => e.amrap?.run)

function patchAmrap(s: ActiveSession, exId: string, fn: (e: SessionExercise) => SessionExercise): ActiveSession {
  return { ...s, exercises: s.exercises.map((e) => (e.id === exId && e.amrap ? fn(e) : e)) }
}
const withRun = (e: SessionExercise, run: AmrapRun | undefined): SessionExercise => {
  const { run: _old, ...rest } = e.amrap!
  void _old
  return { ...e, amrap: run ? { ...rest, run } : rest }
}

export function startAmrap(s: ActiveSession, exId: string, now = Date.now()): ActiveSession {
  const next = patchAmrap(s, exId, (e) => withRun(e, { startedAt: now + AMRAP_PREP_SEC * 1000, pausedMs: 0, marks: [] }))
  return { ...next, rest: undefined, timer: undefined }
}

/** +1 tour : seulement pendant l'effort (pas pendant le décompte, ni en pause, ni une fois arrêté). */
export function addRound(s: ActiveSession, exId: string, now = Date.now()): ActiveSession {
  return patchAmrap(s, exId, (e) => {
    const run = e.amrap!.run
    if (!run || run.pausedAt || run.stoppedAt) return e
    const t = elapsedSec(run, e.amrap!.capSec, now)
    if (t <= 0 || t >= e.amrap!.capSec) return e
    return withRun(e, { ...run, marks: [...run.marks, Math.round(t * 10) / 10] })
  })
}

export function undoRound(s: ActiveSession, exId: string): ActiveSession {
  return patchAmrap(s, exId, (e) => {
    const run = e.amrap!.run
    if (!run?.marks.length) return e
    return withRun(e, { ...run, marks: run.marks.slice(0, -1) })
  })
}

export function pauseAmrap(s: ActiveSession, exId: string, now = Date.now()): ActiveSession {
  return patchAmrap(s, exId, (e) => {
    const run = e.amrap!.run
    if (!run || run.pausedAt || run.stoppedAt || now < run.startedAt) return e
    return withRun(e, { ...run, pausedAt: now })
  })
}

export function resumeAmrap(s: ActiveSession, exId: string, now = Date.now()): ActiveSession {
  return patchAmrap(s, exId, (e) => {
    const run = e.amrap!.run
    if (!run?.pausedAt) return e
    const { pausedAt, ...rest } = run
    return withRun(e, { ...rest, pausedMs: run.pausedMs + (now - pausedAt) })
  })
}

/** Fin du temps (ou arrêt à la main) : le chrono s'arrête, il reste à saisir le tour entamé. */
export function stopAmrap(s: ActiveSession, exId: string, now = Date.now()): ActiveSession {
  return patchAmrap(s, exId, (e) => {
    const run = e.amrap!.run
    if (!run || run.stoppedAt) return e
    // En pause, l'arrêt compte à l'instant de la pause.
    const at = run.pausedAt ?? now
    const end = Math.min(at, run.startedAt + run.pausedMs + e.amrap!.capSec * 1000)
    const { pausedAt: _p, ...rest } = run
    void _p
    return withRun(e, { ...rest, stoppedAt: end })
  })
}

/** Annule l'AMRAP en cours : retour à la carte, rien n'est compté. */
export function cancelAmrap(s: ActiveSession, exId: string): ActiveSession {
  return patchAmrap(s, exId, (e) => withRun(e, undefined))
}

/**
 * Enregistre le résultat : chaque tour complet devient une série faite, le tour entamé une série de plus
 * (avec les répétitions saisies), et le chrono disparaît.
 */
export function commitExercise(e: SessionExercise, partial: number[], now = Date.now()): SessionExercise {
  const a = e.amrap
  if (!a?.run) return e
  const run = a.run
  const template = e.sets.find((x) => !x.done) ?? e.sets[0] ?? amrapRound(e.parts ?? [])
  const doneAt = (t: number) => Math.min(now, Math.round(run.startedAt + run.pausedMs + t * 1000))
  const round = (at: number, parts = template.parts): SessionSet => ({ phase: 'serie', restSec: 0, parts: parts?.map((p) => ({ ...p })), done: true, doneAt: at })
  const sets: SessionSet[] = run.marks.map((t) => round(doneAt(t)))
  const clean = (e.parts ?? []).map((_, k) => Math.max(0, Math.round(partial[k] ?? 0)))
  if (clean.some((v) => v > 0)) {
    const end = run.stoppedAt ?? now
    sets.push(round(end, template.parts?.map((p, k) => (p.durationSec != null ? { durationSec: clean[k] } : { ...p, reps: clean[k] }))))
  }
  const roundSec = run.marks.map((t, i) => Math.round((t - (run.marks[i - 1] ?? 0)) * 10) / 10)
  return { ...e, sets, amrap: { capSec: a.capSec, rounds: run.marks.length, partial: clean, roundSec } }
}

export function commitAmrap(s: ActiveSession, exId: string, partial: number[], now = Date.now()): ActiveSession {
  return { ...s, exercises: s.exercises.map((e) => (e.id === exId ? commitExercise(e, partial, now) : e)) }
}

/* ---------- Scores, records, historique ---------- */

export interface AmrapScore {
  rounds: number
  /** Répétitions du tour entamé. */
  extra: number
  /** Répétitions au total. */
  reps: number
}

export function scoreOf(e: Pick<SessionExercise, 'amrap' | 'parts' | 'sets'>): AmrapScore | undefined {
  const a = e.amrap
  if (a?.rounds == null) return undefined
  const extra = (a.partial ?? []).reduce((n, v, k) => n + (e.parts?.[k]?.durationSec != null ? 0 : v), 0)
  return { rounds: a.rounds, extra, reps: a.rounds * repsPerRound(e) + extra }
}

/** Score en clair : « 6 tours + 11 rép. ». */
export function formatScore(sc: Pick<AmrapScore, 'rounds' | 'extra'>, short = false): string {
  if (short) return `${sc.rounds} + ${sc.extra}`
  const t = `${sc.rounds} tour${sc.rounds > 1 ? 's' : ''}`
  return sc.extra ? `${t} + ${sc.extra} rép.` : t
}

export const better = (a: AmrapScore, b: AmrapScore) => a.rounds > b.rounds || (a.rounds === b.rounds && a.extra > b.extra)

/** Le même AMRAP : même nom et même durée (un « Cindy » de 10 min n'est pas celui de 20 min). */
export const amrapKey = (e: { name: string; amrap?: Amrap }) => `${e.name.trim().toLowerCase()}|${e.amrap?.capSec ?? 0}`

export interface AmrapResult extends AmrapScore {
  at: number
  sessionId: string
  roundSec: number[]
  capSec: number
}

/** Résultats passés d'un AMRAP, du plus ancien au plus récent (avant `before`). */
export function amrapHistory(sessions: Session[], key: string, before = Infinity): AmrapResult[] {
  const out: AmrapResult[] = []
  for (const s of sessions) {
    if (s.startedAt >= before) continue
    for (const e of s.exercises) {
      if (!e.amrap || amrapKey(e) !== key) continue
      const sc = scoreOf(e)
      if (sc) out.push({ ...sc, at: s.startedAt, sessionId: s.id, roundSec: e.amrap.roundSec ?? [], capSec: e.amrap.capSec })
    }
  }
  return out.sort((a, b) => a.at - b.at)
}

export function bestOf<T extends AmrapScore>(list: T[]): T | undefined {
  let best: T | undefined
  for (const x of list) if (!best || better(x, best)) best = x
  return best
}

/** Temps moyen d'un tour (s) : durée ÷ tours faits, en comptant le tour entamé au prorata. */
export function paceOf(sc: AmrapScore, capSec: number, perRound: number): number | undefined {
  const done = sc.rounds + (perRound ? sc.extra / perRound : 0)
  return done > 0 ? capSec / done : undefined
}

/**
 * Avance (positif) ou retard sur le record au dernier tour fini : temps du record pour le même nombre
 * de tours, moins le temps actuel. Absent sans record, ou au-delà des tours du record.
 */
export function leadOnRecord(marks: number[], record?: Pick<AmrapResult, 'roundSec'>): number | undefined {
  if (!record || !marks.length) return undefined
  const n = marks.length
  if (record.roundSec.length < n) return undefined
  const recAt = record.roundSec.slice(0, n).reduce((a, b) => a + b, 0)
  return Math.round(recAt - marks[n - 1])
}
