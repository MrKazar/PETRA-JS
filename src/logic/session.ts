import type { ActiveSession, IntervalStep, IntervalTimer, PlannedSet, Program, ProgramExercise, Session, SessionExercise, SessionSet } from '../data/types'
import { uid } from './util'

export function startFrom(program: Program | null, now = Date.now()): ActiveSession {
  return {
    id: uid(),
    programId: program?.id,
    programName: program?.name ?? 'Séance libre',
    startedAt: now,
    exercises: (program?.exercises ?? []).map(toSessionExercise),
  }
}

export function toSessionExercise(ex: ProgramExercise): SessionExercise {
  return { ...ex, id: uid(), sets: ex.sets.map((s) => ({ ...s, done: false })) }
}

type SetPatch = Partial<SessionSet>

export function patchSet(s: ActiveSession, exId: string, index: number, patch: SetPatch): ActiveSession {
  return {
    ...s,
    exercises: s.exercises.map((e) =>
      e.id !== exId ? e : { ...e, sets: e.sets.map((set, i) => (i === index ? { ...set, ...patch } : set)) },
    ),
  }
}

/** Ajoute une série en recopiant la dernière (même phase, reps, charge). */
export function addSet(s: ActiveSession, exId: string): ActiveSession {
  return {
    ...s,
    exercises: s.exercises.map((e) => {
      if (e.id !== exId) return e
      const last: PlannedSet = e.sets[e.sets.length - 1] ?? { phase: 'travail', reps: 10 }
      return { ...e, sets: [...e.sets, { phase: last.phase, reps: last.reps, weight: last.weight, durationSec: last.durationSec, unit: last.unit, toFailure: last.toFailure, pct: last.pct, restSec: last.restSec, done: false }] }
    }),
  }
}

export function removeSet(s: ActiveSession, exId: string, index: number): ActiveSession {
  return {
    ...s,
    exercises: s.exercises.map((e) => (e.id !== exId ? e : { ...e, sets: e.sets.filter((_, i) => i !== index) })),
  }
}

/** Valide une série, et quand la série suivante du même exercice existe, reporte sa charge si elle est vide. */
export function completeSet(s: ActiveSession, exId: string, index: number, now = Date.now()): ActiveSession {
  let next = patchSet(s, exId, index, { done: true, doneAt: now })
  const ex = next.exercises.find((e) => e.id === exId)
  const done = ex?.sets[index]
  const following = ex?.sets[index + 1]
  if (done && following && !following.done && following.weight == null && done.weight != null && following.phase === done.phase) {
    next = patchSet(next, exId, index + 1, { weight: done.weight })
  }
  return next
}

export function startRest(s: ActiveSession, seconds: number, label: string, now = Date.now()): ActiveSession {
  if (seconds <= 0) return { ...s, rest: undefined }
  return { ...s, rest: { startedAt: now, endsAt: now + seconds * 1000, label } }
}

export function extendRest(s: ActiveSession, seconds: number, now = Date.now()): ActiveSession {
  if (!s.rest) return s
  const base = Math.max(s.rest.endsAt, now)
  return { ...s, rest: { ...s.rest, endsAt: base + seconds * 1000 } }
}

export function nextPending(s: Pick<Session, 'exercises'>): { exercise: SessionExercise; index: number } | undefined {
  for (const exercise of s.exercises) {
    const index = exercise.sets.findIndex((x) => !x.done)
    if (index >= 0) return { exercise, index }
  }
  return undefined
}

export function describeSet(set: PlannedSet, parCote = false): string {
  if (set.durationSec != null) {
    const m = Math.floor(set.durationSec / 60)
    const sec = set.durationSec % 60
    return m ? `${m} min${sec ? ` ${sec} s` : ''}` : `${sec} s`
  }
  const reps = set.reps != null ? `${set.reps} ${set.unit ?? 'reps'}${parCote ? '/côté' : ''}` : set.toFailure ? 'max' : '—'
  return set.weight != null && set.weight > 0 ? `${reps} × ${set.weight} kg` : reps
}

export interface SessionStats {
  durationSec: number
  setsDone: number
  setsTotal: number
  volumeKg: number
  exercisesDone: number
}

export function statsOf(s: Session, now = Date.now()): SessionStats {
  let setsDone = 0
  let setsTotal = 0
  let volumeKg = 0
  let exercisesDone = 0
  for (const e of s.exercises) {
    let any = false
    for (const set of e.sets) {
      setsTotal++
      if (!set.done) continue
      any = true
      setsDone++
      if (set.reps && set.weight) volumeKg += set.reps * set.weight * (e.parCote ? 2 : 1)
    }
    if (any) exercisesDone++
  }
  return { durationSec: ((s.endedAt ?? now) - s.startedAt) / 1000, setsDone, setsTotal, volumeKg, exercisesDone }
}

/** Termine la séance : garde seulement les exercices et séries réalisés. */
export function finalize(s: ActiveSession, now = Date.now()): Session {
  const { rest: _rest, timer: _timer, ...rest } = s
  void _rest
  void _timer
  return {
    ...rest,
    endedAt: now,
    exercises: s.exercises.map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) })).filter((e) => e.sets.length > 0),
  }
}

export interface PersonalRecord {
  name: string
  bestWeight: number
  repsAtBest: number
  best1RM: number
  date: number
  sessions: number
}

/** Records par exercice : charge max (et 1RM estimé, formule d'Epley). */
export function personalRecords(sessions: Session[]): PersonalRecord[] {
  const map = new Map<string, PersonalRecord>()
  for (const s of sessions) {
    const seen = new Set<string>()
    for (const e of s.exercises) {
      const key = e.catalogId ?? e.name.toLowerCase()
      for (const set of e.sets) {
        if (!set.done || !set.weight || !set.reps) continue
        const rm = set.weight * (1 + set.reps / 30)
        const cur = map.get(key)
        if (!cur) {
          map.set(key, { name: e.name, bestWeight: set.weight, repsAtBest: set.reps, best1RM: rm, date: s.startedAt, sessions: 0 })
        } else {
          if (set.weight > cur.bestWeight || (set.weight === cur.bestWeight && set.reps > cur.repsAtBest)) {
            cur.bestWeight = set.weight
            cur.repsAtBest = set.reps
            cur.date = s.startedAt
          }
          cur.best1RM = Math.max(cur.best1RM, rm)
        }
        if (!seen.has(key)) {
          seen.add(key)
          map.get(key)!.sessions++
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

/** Secondes estimées par répétition, et minimum pour une série (installation, placement). */
const SEC_PER_REP = 4
const MIN_SET_SEC = 25

/**
 * Durée estimée d'un programme : temps de chaque série (durée prévue, ou répétitions × 4 s, doublé par côté)
 * plus les repos prévus entre les séries. Entre deux exercices, au moins le repos par défaut, comme en séance.
 */
export function estimateDuration(program: Pick<Program, 'exercises'>, defaultRestSec: number): number {
  let total = 0
  program.exercises.forEach((ex, e) => {
    ex.sets.forEach((set, i) => {
      const work = set.durationSec ?? Math.max(MIN_SET_SEC, (set.toFailure ? 12 : set.reps ?? 10) * SEC_PER_REP)
      total += work * (ex.parCote && set.durationSec == null ? 2 : 1)
      const lastOfEx = i === ex.sets.length - 1
      if (lastOfEx && e === program.exercises.length - 1) return
      const rest = set.restSec ?? ex.restSec
      total += lastOfEx ? Math.max(rest, defaultRestSec) : rest
    })
  })
  return total
}

/** Durée arrondie aux 5 minutes : « ~45 min », « ~1 h 10 ». */
export function formatEstimate(sec: number): string {
  const min = Math.max(5, Math.round(sec / 300) * 5)
  return min < 60 ? `~${min} min` : `~${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, '0')}` : ''}`
}

/* ---------- Minuteur d'intervalles (façon HIIT) ---------- */

export const PREP_SEC = 10

/**
 * Enchaînement des séries en durée à partir de la prochaine série : tant qu'elles sont chronométrées,
 * même sur plusieurs exercices (circuit). Préparation, puis travail / repos ; pas de repos après la dernière.
 */
export function buildIntervals(s: Pick<Session, 'exercises'>): IntervalStep[] {
  const work: IntervalStep[] = []
  const rests: number[] = []
  let started = false
  outer: for (const ex of s.exercises) {
    for (let i = 0; i < ex.sets.length; i++) {
      const set = ex.sets[i]
      if (set.done) {
        if (started) break outer
        continue
      }
      if (set.durationSec == null || set.durationSec <= 0) {
        if (started || work.length === 0) break outer
      }
      started = true
      work.push({ kind: 'work', sec: set.durationSec!, exId: ex.id, index: i, name: ex.name })
      rests.push(set.restSec ?? ex.restSec)
    }
  }
  if (!work.length) return []
  const steps: IntervalStep[] = [{ kind: 'prep', sec: PREP_SEC, name: work[0].name }]
  work.forEach((w, i) => {
    steps.push(w)
    if (i < work.length - 1 && rests[i] > 0) steps.push({ kind: 'rest', sec: rests[i], name: work[i + 1].name })
  })
  return steps
}

export function startTimer(s: ActiveSession, now = Date.now()): ActiveSession {
  const steps = buildIntervals(s)
  if (steps.length < 2) return s
  return { ...s, rest: undefined, timer: { steps, startedAt: now, pausedMs: 0 } }
}

export interface TimerPosition {
  /** Étape en cours (steps.length quand tout est fini). */
  index: number
  /** Secondes restantes dans l'étape en cours. */
  left: number
  /** Secondes restantes au total. */
  totalLeft: number
}

export function timerPosition(t: IntervalTimer, now = Date.now()): TimerPosition {
  let elapsed = ((t.pausedAt ?? now) - t.startedAt - t.pausedMs) / 1000
  const total = t.steps.reduce((a, x) => a + x.sec, 0)
  const totalLeft = Math.max(0, total - elapsed)
  for (let i = 0; i < t.steps.length; i++) {
    if (elapsed < t.steps[i].sec) return { index: i, left: t.steps[i].sec - elapsed, totalLeft }
    elapsed -= t.steps[i].sec
  }
  return { index: t.steps.length, left: 0, totalLeft: 0 }
}

/** Valide les séries dont l'étape de travail est passée ; retire le minuteur une fois fini. */
export function syncTimer(s: ActiveSession, now = Date.now()): ActiveSession {
  const t = s.timer
  if (!t) return s
  const pos = timerPosition(t, now)
  let next = s
  let at = t.startedAt + t.pausedMs
  t.steps.forEach((step, i) => {
    at += step.sec * 1000
    if (i >= pos.index || step.kind !== 'work' || step.exId == null || step.index == null) return
    const set = next.exercises.find((e) => e.id === step.exId)?.sets[step.index]
    if (set && !set.done) next = patchSet(next, step.exId, step.index, { done: true, doneAt: Math.min(at, now) })
  })
  if (pos.index >= t.steps.length) next = { ...next, timer: undefined }
  return next
}

export function pauseTimer(s: ActiveSession, now = Date.now()): ActiveSession {
  if (!s.timer || s.timer.pausedAt) return s
  return { ...s, timer: { ...s.timer, pausedAt: now } }
}

export function resumeTimer(s: ActiveSession, now = Date.now()): ActiveSession {
  if (!s.timer?.pausedAt) return s
  const { pausedAt, ...t } = s.timer
  return { ...s, timer: { ...t, pausedMs: t.pausedMs + (now - pausedAt) } }
}

/** Passe à l'étape suivante (la série en cours est validée comme faite). */
export function skipStep(s: ActiveSession, now = Date.now()): ActiveSession {
  if (!s.timer) return s
  const { left } = timerPosition(s.timer, now)
  return syncTimer({ ...s, timer: { ...s.timer, startedAt: s.timer.startedAt - left * 1000 } }, now)
}

/** Quand chaque étape commence, en heure réelle (pour les notifications écran verrouillé). */
export function timerSchedule(t: IntervalTimer): { at: number; step: IntervalStep; i: number }[] {
  let at = t.startedAt + t.pausedMs
  return t.steps.map((step, i) => {
    const out = { at, step, i }
    at += step.sec * 1000
    return out
  })
}
