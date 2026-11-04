import { CATALOG, type CatalogExercise } from '../data/catalog'
import { MUSCLES_FINE, anatomyOf, type Family, type FineId, type FineZone } from '../data/anatomy'
import type { AppData, PlannedSet, Program, Session } from '../data/types'
import { addDays, dateKey, parseKey, weekday } from './util'
import { exerciseKey } from './progress'

/**
 * Schéma du corps (PCTRA) : combien de séries chaque muscle a reçues, d'après le muscle principal
 * et les muscles secondaires de chaque exercice. Une série compte 1 pour le muscle principal et
 * 0,5 pour chaque muscle secondaire ; les séries de chauffe ne comptent pas.
 */

export type RegionId = FineId
export type { Family }

/** Zones du schéma : les muscles fins de data/anatomy.ts. */
export const REGIONS: { id: RegionId; label: string; zone: FineZone; family: Family }[] = [...MUSCLES_FINE]

export const regionLabel = (id: RegionId) => REGIONS.find((r) => r.id === id)?.label ?? id
export const familyOf = (id: RegionId) => REGIONS.find((r) => r.id === id)!.family

export interface Targets {
  /** Muscles principaux : 1 par série. */
  primary: RegionId[]
  /** Muscles secondaires : 0,5 par série. */
  secondary: RegionId[]
}

/** Zones travaillées par un exercice (fiche du catalogue, sinon son groupe et son nom). */
export const targetsOf = (e: { catalogId?: string; name: string; group: string }): Targets => anatomyOf(e)

export interface RegionExercise {
  key: string
  name: string
  /** Séries de travail faites (ou prévues) sur la période, sans pondération. */
  sets: number
  primary: boolean
  /** Dernière séance où il a été fait. */
  lastAt?: number
}

export interface RegionWork {
  /** Séries pondérées (1 en principal, 0,5 en secondaire). */
  sets: number
  exercises: RegionExercise[]
}

export type BodyWork = Record<RegionId, RegionWork>

const emptyWork = (): BodyWork => Object.fromEntries(REGIONS.map((r) => [r.id, { sets: 0, exercises: [] }])) as unknown as BodyWork

/** Une série compte si ce n'est pas une chauffe (le cardio ne compte pour aucun muscle). */
const counts = (s: PlannedSet) => s.phase !== 'chauffe' && s.phase !== 'cardio' && s.phase !== 'effort' && s.phase !== 'retour'

interface Item {
  catalogId?: string
  name: string
  group: string
  sets: number
  at?: number
}

function add(work: BodyWork, item: Item) {
  if (item.sets <= 0) return
  const t = targetsOf(item)
  const key = exerciseKey(item)
  const put = (id: RegionId, weight: number, primary: boolean) => {
    const w = work[id]
    w.sets += item.sets * weight
    const ex = w.exercises.find((x) => x.key === key)
    if (ex) {
      ex.sets += item.sets
      ex.lastAt = Math.max(ex.lastAt ?? 0, item.at ?? 0) || undefined
    } else w.exercises.push({ key, name: item.name, sets: item.sets, primary, lastAt: item.at })
  }
  for (const r of t.primary) put(r, 1, true)
  for (const r of t.secondary) put(r, 0.5, false)
}

/** Exercices (et parts de superset) d'une liste, avec leur nombre de séries retenues. */
function items(exercises: { catalogId?: string; name: string; group: string; parts?: { catalogId?: string; name: string; group: string }[]; sets: (PlannedSet & { done?: boolean })[] }[], done: boolean, at?: number): Item[] {
  const out: Item[] = []
  for (const e of exercises) {
    const n = e.sets.filter((s) => (!done || s.done) && counts(s)).length
    if (e.parts?.length) for (const p of e.parts) out.push({ catalogId: p.catalogId, name: p.name, group: p.group, sets: n, at })
    else out.push({ catalogId: e.catalogId, name: e.name, group: e.group, sets: n, at })
  }
  return out
}

const sortWork = (work: BodyWork) => {
  for (const r of REGIONS) work[r.id].exercises.sort((a, b) => Number(b.primary) - Number(a.primary) || b.sets - a.sets)
  return work
}

/** Travail réel des séances commencées entre from (inclus) et to (exclu). */
export function doneWork(sessions: Session[], from: number, to: number): BodyWork {
  const work = emptyWork()
  for (const s of sessions) {
    if (s.startedAt < from || s.startedAt >= to) continue
    for (const it of items(s.exercises, true, s.startedAt)) add(work, it)
  }
  return sortWork(work)
}

/** Semaine type prévue au planning (moyenne des semaines A et B si l'alternance est activée). */
export function plannedWork(data: Pick<AppData, 'programs' | 'weekPlan' | 'weekPlanB' | 'settings'>): BodyWork {
  const work = emptyWork()
  const plans = data.settings.abWeeks ? [data.weekPlan, data.weekPlanB] : [data.weekPlan]
  for (const plan of plans) {
    for (let d = 0; d < 7; d++) {
      const p = data.programs.find((x) => x.id === plan[d])
      if (!p) continue
      for (const it of items(p.exercises, false)) add(work, { ...it, sets: it.sets / plans.length })
    }
  }
  return sortWork(work)
}

/** Ce que travaille une séance d'un programme (séries prévues, hors chauffe). */
export function programWork(program: Pick<Program, 'exercises'>): BodyWork {
  const work = emptyWork()
  for (const it of items(program.exercises, false)) add(work, it)
  return sortWork(work)
}

/** Nombre de fois où un programme revient dans la semaine type (moyenne A/B). */
export function timesPerWeek(data: Pick<AppData, 'weekPlan' | 'weekPlanB' | 'settings'>, programId: string): number {
  const plans = data.settings.abWeeks ? [data.weekPlan, data.weekPlanB] : [data.weekPlan]
  let n = 0
  for (const plan of plans) for (let d = 0; d < 7; d++) if (plan[d] === programId) n++
  return n / plans.length
}

/**
 * Niveau d'une zone pour une seule séance : 0 rien, 1 moins de 2 séries, 2 de 2 à 3,
 * 3 de 4 à 8, 4 au-delà de 8.
 */
export function sessionLevelOf(sets: number): Level {
  if (sets <= 0) return 0
  if (sets < 2) return 1
  if (sets < 4) return 2
  if (sets <= 8) return 3
  return 4
}

export const SESSION_LEVELS: { level: Level; label: string; range: string }[] = [
  { level: 0, label: 'Pas travaillé', range: '0' },
  { level: 1, label: 'Léger', range: 'moins de 2' },
  { level: 2, label: 'Moyen', range: '2 à 3' },
  { level: 3, label: 'Bien', range: '4 à 8' },
  { level: 4, label: 'Beaucoup', range: 'plus de 8' },
]

/** Nombre de jours prévus dans la semaine type. */
export function plannedDays(data: Pick<AppData, 'programs' | 'weekPlan' | 'weekPlanB' | 'settings'>): number {
  const plans = data.settings.abWeeks ? [data.weekPlan, data.weekPlanB] : [data.weekPlan]
  let n = 0
  for (const plan of plans) for (let d = 0; d < 7; d++) if (data.programs.some((x) => x.id === plan[d])) n++
  return n / plans.length
}

/** Divise toutes les séries (moyenne par semaine sur plusieurs semaines). */
export function scaleWork(work: BodyWork, by: number): BodyWork {
  for (const r of REGIONS) work[r.id].sets /= by
  return work
}

export type Level = 0 | 1 | 2 | 3 | 4

/**
 * Niveau d'une zone selon ses séries par semaine : 0 rien, 1 moins de 4 (négligé), 2 de 4 à 9,
 * 3 de 10 à 20 (la fourchette la plus souvent conseillée pour progresser), 4 au-delà de 20.
 */
export function levelOf(setsPerWeek: number): Level {
  if (setsPerWeek <= 0) return 0
  if (setsPerWeek < 4) return 1
  if (setsPerWeek < 10) return 2
  if (setsPerWeek <= 20) return 3
  return 4
}

export const LEVELS: { level: Level; label: string; range: string }[] = [
  { level: 0, label: 'Pas travaillé', range: '0' },
  { level: 1, label: 'Négligé', range: 'moins de 4' },
  { level: 2, label: 'Un peu', range: '4 à 9' },
  { level: 3, label: 'Bien', range: '10 à 20' },
  { level: 4, label: 'Beaucoup', range: 'plus de 20' },
]

/** Début (lundi 0 h) de la semaine d'une date. */
export function weekStart(now: number): number {
  const key = dateKey(new Date(now))
  return parseKey(addDays(key, -weekday(key))).getTime()
}

/* ---------- Suggestions pour les muscles négligés ---------- */

export interface Suggestion {
  region: RegionId
  /** Exercices du catalogue qui ciblent ce muscle, ceux déjà pratiqués en premier. */
  exercises: CatalogExercise[]
  /** Séance où l'ajouter : celle qui travaille déjà la même famille de mouvements. */
  program?: Program
}

/** Programmes du planning (semaines A et B), sinon tous les programmes. */
export function plannedPrograms(data: Pick<AppData, 'programs' | 'weekPlan' | 'weekPlanB' | 'settings'>): Program[] {
  const ids = new Set<string | undefined>([...Object.values(data.weekPlan), ...(data.settings.abWeeks ? Object.values(data.weekPlanB) : [])])
  const planned = data.programs.filter((p) => ids.has(p.id))
  return planned.length ? planned : data.programs
}

const primaryOf = (e: { catalogId?: string; name: string; group: string }) => targetsOf(e).primary

/** Parties d'un exercice de programme (un superset compte chacun de ses exercices). */
type Named = { catalogId?: string; name: string; group: string }
const partsOf = (e: Named & { parts?: Named[] }): Named[] => (e.parts?.length ? e.parts : [e])

/** Séance la plus adaptée pour ajouter un exercice de ce muscle : celle qui travaille le plus la même famille de mouvements. */
export function bestProgramFor(region: RegionId, programs: Program[]): Program | undefined {
  const family = familyOf(region)
  let best: { p: Program; score: number } | undefined
  for (const p of programs) {
    const prim = p.exercises.flatMap(partsOf).flatMap(primaryOf)
    const same = prim.filter((r) => r && familyOf(r) === family).length
    // Même famille d'abord, puis la séance la plus courte.
    const score = same * 100 - p.exercises.length
    if (!best || score > best.score) best = { p, score }
  }
  return best?.p
}

export function suggestFor(region: RegionId, data: Pick<AppData, 'programs' | 'sessions' | 'weekPlan' | 'weekPlanB' | 'settings'>, max = 6): Suggestion {
  const used = new Map<string, number>()
  for (const s of data.sessions) for (const e of s.exercises) for (const x of partsOf(e)) if (x.catalogId) used.set(x.catalogId, (used.get(x.catalogId) ?? 0) + 1)
  const exercises = CATALOG.filter((e) => !e.cardio && primaryOf({ catalogId: e.id, name: e.nom, group: e.groupe_musculaire }).includes(region))
    .map((e, i) => ({ e, i, n: used.get(e.id) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .slice(0, max)
    .map((x) => x.e)
  return { region, exercises, program: bestProgramFor(region, plannedPrograms(data)) }
}
