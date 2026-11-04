import { anatomyOf, type FineId } from '../data/anatomy'
import type { Goal, Program, Session } from '../data/types'
import { doneWork, weekStart, type BodyWork } from './body'
import { exerciseKey } from './progress'

/**
 * Statistiques de PCTRA (1.2.0) : tonnage par semaine, 1RM estimé, comparaison de périodes ou de
 * programmes, objectifs et projection. Seules les séries faites comptent, sans la chauffe ni le cardio.
 */

const DAY = 86400000
export const WEEK = 7 * DAY

/** Une série faite d'un exercice (une part de superset compte comme un exercice). */
export interface Lift {
  key: string
  name: string
  catalogId?: string
  group: string
  reps: number
  weight: number
  /** Charge × répétitions (× 2 pour un exercice fait côté par côté). */
  tonnage: number
  at: number
  sessionId: string
}

const counts = (phase: string) => phase !== 'chauffe' && phase !== 'cardio' && phase !== 'effort' && phase !== 'retour'

/** Séries faites d'une séance, hors chauffe et cardio. */
export function liftsOf(s: Session): Lift[] {
  const out: Lift[] = []
  for (const e of s.exercises) {
    for (const set of e.sets) {
      if (!set.done || !counts(set.phase)) continue
      const at = set.doneAt ?? s.startedAt
      if (e.parts?.length) {
        e.parts.forEach((p, i) => {
          const x = set.parts?.[i]
          const reps = x?.reps ?? p.reps ?? 0
          const weight = x?.weight ?? p.weight ?? 0
          out.push({ key: exerciseKey(p), name: p.name, catalogId: p.catalogId, group: p.group, reps, weight, tonnage: reps * weight * (p.parCote ? 2 : 1), at, sessionId: s.id })
        })
      } else {
        const reps = set.reps ?? 0
        const weight = set.weight ?? 0
        out.push({ key: exerciseKey(e), name: e.name, catalogId: e.catalogId, group: e.group, reps, weight, tonnage: reps * weight * (e.parCote ? 2 : 1), at, sessionId: s.id })
      }
    }
  }
  return out
}

/* ---------- Tonnage par semaine ---------- */

export interface WeekTonnage {
  /** Lundi 0 h de la semaine. */
  start: number
  tonnage: number
  sessions: number
}

/**
 * Tonnage des `weeks` dernières semaines (la semaine en cours comprise), de la plus ancienne à la
 * plus récente. Avec un muscle : 1 × le tonnage d'un exercice où il est principal, 0,5 × s'il est secondaire.
 */
export function weeklyTonnage(sessions: Session[], weeks: number, now = Date.now(), muscle?: FineId): WeekTonnage[] {
  const last = weekStart(now)
  const out: WeekTonnage[] = []
  // Les semaines se suivent de lundi en lundi (calculées par date, pour les changements d'heure).
  let start = last
  const starts: number[] = [start]
  for (let i = 1; i < weeks; i++) {
    start = weekStart(start - DAY)
    starts.unshift(start)
  }
  for (const st of starts) out.push({ start: st, tonnage: 0, sessions: 0 })
  const factor = new Map<string, number>()
  const weightOf = (l: Lift) => {
    if (!muscle) return 1
    const k = `${l.catalogId ?? ''}|${l.name}|${l.group}`
    let f = factor.get(k)
    if (f === undefined) {
      const t = anatomyOf(l)
      f = t.primary.includes(muscle) ? 1 : t.secondary.includes(muscle) ? 0.5 : 0
      factor.set(k, f)
    }
    return f
  }
  for (const s of sessions) {
    if (s.startedAt < starts[0]) continue
    let i = starts.length - 1
    while (i > 0 && s.startedAt < starts[i]) i--
    const w = out[i]
    let t = 0
    for (const l of liftsOf(s)) t += l.tonnage * weightOf(l)
    w.tonnage += t
    w.sessions++
  }
  return out
}

/* ---------- 1RM estimé ---------- */

/**
 * 1RM estimé d'une série (formule d'Epley : charge × (1 + répétitions / 30)). Au-delà de 12
 * répétitions l'estimation n'est plus fiable : la série n'est pas retenue.
 */
export function e1rm(weight: number, reps: number): number | undefined {
  if (weight <= 0 || reps <= 0 || reps > 12) return undefined
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

export interface LiftPoint {
  date: number
  sessionId: string
  /** 1RM estimé de la meilleure série. */
  e1rm?: number
  /** Charge la plus lourde soulevée (au moins une répétition). */
  max: number
  /** Meilleure série retenue pour le 1RM : charge × répétitions. */
  weight: number
  reps: number
}

/** Évolution d'un exercice chargé, une valeur par séance, de la plus ancienne à la plus récente. */
export function liftHistory(sessions: Session[], key: string): LiftPoint[] {
  const out: LiftPoint[] = []
  for (const s of sessions) {
    const lifts = liftsOf(s).filter((l) => l.key === key && l.weight > 0 && l.reps > 0)
    if (!lifts.length) continue
    let best: { v: number; l: Lift } | undefined
    for (const l of lifts) {
      const v = e1rm(l.weight, l.reps)
      if (v !== undefined && (!best || v > best.v)) best = { v, l }
    }
    const heaviest = lifts.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a))
    const ref = best?.l ?? heaviest
    out.push({ date: s.startedAt, sessionId: s.id, e1rm: best?.v, max: heaviest.weight, weight: ref.weight, reps: ref.reps })
  }
  return out.sort((a, b) => a.date - b.date)
}

export interface LiftOption {
  key: string
  name: string
  /** Nombre de séances où il a été fait avec une charge. */
  sessions: number
  last: number
}

/** Exercices faits avec une charge, les plus pratiqués en premier. */
export function liftOptions(sessions: Session[]): LiftOption[] {
  const map = new Map<string, LiftOption & { seen: Set<string> }>()
  for (const s of sessions) {
    for (const l of liftsOf(s)) {
      if (l.weight <= 0 || l.reps <= 0) continue
      let o = map.get(l.key)
      if (!o) map.set(l.key, (o = { key: l.key, name: l.name, sessions: 0, last: 0, seen: new Set() }))
      if (!o.seen.has(s.id)) {
        o.seen.add(s.id)
        o.sessions++
      }
      o.last = Math.max(o.last, s.startedAt)
    }
  }
  return [...map.values()].map(({ seen: _s, ...o }) => o).sort((a, b) => b.sessions - a.sessions || b.last - a.last || a.name.localeCompare(b.name))
}

/* ---------- Comparer ---------- */

export interface Summary {
  sessions: number
  /** Séries faites (hors chauffe et cardio). */
  sets: number
  tonnage: number
  /** Durée totale des séances terminées, en secondes. */
  durationSec: number
  /** Séries par muscle (1 en principal, 0,5 en secondaire). */
  work: BodyWork
  /** Meilleur 1RM estimé de chaque exercice. */
  best: Map<string, { name: string; e1rm: number }>
}

export function summarize(sessions: Session[]): Summary {
  let sets = 0
  let tonnage = 0
  let durationSec = 0
  const best = new Map<string, { name: string; e1rm: number }>()
  for (const s of sessions) {
    if (s.endedAt && s.endedAt > s.startedAt) durationSec += (s.endedAt - s.startedAt) / 1000
    for (const l of liftsOf(s)) {
      sets++
      tonnage += l.tonnage
      const v = e1rm(l.weight, l.reps)
      if (v !== undefined && v > (best.get(l.key)?.e1rm ?? 0)) best.set(l.key, { name: l.name, e1rm: v })
    }
  }
  return { sessions: sessions.length, sets, tonnage, durationSec, work: doneWork(sessions, -Infinity, Infinity), best }
}

/** Séances commencées entre from (inclus) et to (exclu). */
export function sessionsBetween(sessions: Session[], from: number, to: number): Session[] {
  return sessions.filter((s) => s.startedAt >= from && s.startedAt < to)
}

export const sessionsOf = (sessions: Session[], program: Pick<Program, 'id'>) => sessions.filter((s) => s.programId === program.id)

/* ---------- Objectifs et projection ---------- */

export interface Projection {
  /** Valeur actuelle (la meilleure des 4 dernières semaines, sinon la dernière connue). */
  current?: number
  /** Valeur de départ (la meilleure au moment de la création de l'objectif, sinon la première). */
  start?: number
  reached: boolean
  /** Progression par semaine au rythme actuel (régression sur les 12 dernières semaines). */
  perWeek?: number
  /** Date d'arrivée prévue au rythme actuel ; absente si la tendance ne monte pas. */
  eta?: number
  /** Pas assez de séances pour une tendance. */
  tooFew: boolean
}

const goalValue = (g: Pick<Goal, 'kind'>, p: LiftPoint) => (g.kind === 'e1rm' ? p.e1rm : p.max)

/** Où en est un objectif, et quand il sera atteint si la tendance des 12 dernières semaines continue. */
export function project(goal: Goal, sessions: Session[], now = Date.now()): Projection {
  const pts = liftHistory(sessions, goal.key)
    .map((p) => ({ t: p.date, v: goalValue(goal, p) }))
    .filter((p): p is { t: number; v: number } => p.v !== undefined)
  if (!pts.length) return { reached: false, tooFew: true }
  const recent = pts.filter((p) => p.t >= now - 4 * WEEK)
  const current = recent.length ? Math.max(...recent.map((p) => p.v)) : pts[pts.length - 1].v
  const before = pts.filter((p) => p.t <= goal.createdAt)
  const start = before.length ? Math.max(...before.map((p) => p.v)) : pts[0].v
  const best = Math.max(...pts.map((p) => p.v))
  if (best >= goal.target) return { current: Math.max(current, best), start, reached: true, tooFew: false }

  const win = pts.filter((p) => p.t >= now - 12 * WEEK)
  const span = win.length ? win[win.length - 1].t - win[0].t : 0
  if (win.length < 3 || span < 10 * DAY) return { current, start, reached: false, tooFew: true }
  // Moindres carrés : valeur = a + b × temps.
  const n = win.length
  const mt = win.reduce((s, p) => s + p.t, 0) / n
  const mv = win.reduce((s, p) => s + p.v, 0) / n
  let num = 0
  let den = 0
  for (const p of win) {
    num += (p.t - mt) * (p.v - mv)
    den += (p.t - mt) ** 2
  }
  const slope = den ? num / den : 0
  const perWeek = slope * WEEK
  if (slope <= 0) return { current, start, reached: false, perWeek, tooFew: false }
  const fittedNow = mv + slope * (now - mt)
  const from = Math.max(fittedNow, current)
  const eta = now + Math.max(0, (goal.target - from) / slope)
  return { current, start, reached: false, perWeek, eta, tooFew: false }
}
