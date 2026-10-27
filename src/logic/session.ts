import type { ActiveSession, PlannedSet, Program, ProgramExercise, Session, SessionExercise, SessionSet } from '../data/types'
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
      return { ...e, sets: [...e.sets, { phase: last.phase, reps: last.reps, weight: last.weight, durationSec: last.durationSec, done: false }] }
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
  const reps = set.reps != null ? `${set.reps} reps${parCote ? '/côté' : ''}` : '—'
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
  const { rest: _rest, ...rest } = s
  void _rest
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
