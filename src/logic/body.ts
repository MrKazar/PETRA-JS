import { findCatalog, type CatalogExercise } from '../data/catalog'
import { muscleOf } from '../data/muscles'
import type { AppData, PlannedSet, Session } from '../data/types'
import { addDays, dateKey, parseKey, weekday } from './util'
import { exerciseKey } from './progress'

/**
 * Schéma du corps (PCTRA) : combien de séries chaque muscle a reçues, d'après le muscle principal
 * et les muscles secondaires de chaque exercice. Une série compte 1 pour le muscle principal et
 * 0,5 pour chaque muscle secondaire ; les séries de chauffe ne comptent pas.
 */

export type RegionId =
  | 'pectoraux'
  | 'epaule_avant'
  | 'epaule_cote'
  | 'epaule_arriere'
  | 'biceps'
  | 'triceps'
  | 'avant_bras'
  | 'abdominaux'
  | 'obliques'
  | 'trapezes'
  | 'dos'
  | 'lombaires'
  | 'fessiers'
  | 'quadriceps'
  | 'ischio_jambiers'
  | 'adducteurs'
  | 'mollets'

export const REGIONS: { id: RegionId; label: string }[] = [
  { id: 'pectoraux', label: 'Pectoraux' },
  { id: 'epaule_avant', label: 'Avant d’épaule' },
  { id: 'epaule_cote', label: 'Côté d’épaule' },
  { id: 'epaule_arriere', label: 'Arrière d’épaule' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'avant_bras', label: 'Avant-bras' },
  { id: 'abdominaux', label: 'Abdominaux' },
  { id: 'obliques', label: 'Obliques' },
  { id: 'trapezes', label: 'Trapèzes' },
  { id: 'dos', label: 'Dos (dorsaux)' },
  { id: 'lombaires', label: 'Lombaires' },
  { id: 'fessiers', label: 'Fessiers' },
  { id: 'quadriceps', label: 'Quadriceps' },
  { id: 'ischio_jambiers', label: 'Ischio-jambiers' },
  { id: 'adducteurs', label: 'Adducteurs' },
  { id: 'mollets', label: 'Mollets' },
]

export const regionLabel = (id: RegionId) => REGIONS.find((r) => r.id === id)?.label ?? id

/** Groupe du catalogue → zone du schéma (les épaules se répartissent selon l'exercice). */
const GROUP_REGION: Record<string, RegionId | undefined> = {
  pectoraux: 'pectoraux',
  biceps: 'biceps',
  triceps: 'triceps',
  avant_bras: 'avant_bras',
  abdominaux: 'abdominaux',
  obliques: 'obliques',
  trapezes: 'trapezes',
  dos: 'dos',
  grand_dorsal: 'dos',
  lombaires: 'lombaires',
  fessiers: 'fessiers',
  quadriceps: 'quadriceps',
  ischio_jambiers: 'ischio_jambiers',
  adducteurs: 'adducteurs',
  mollets: 'mollets',
  epaules: 'epaule_avant',
  deltoides_anterieurs: 'epaule_avant',
}

const SHOULDER: Record<string, RegionId> = { epaule_avant: 'epaule_avant', epaule_cote: 'epaule_cote', epaule_arriere: 'epaule_arriere' }

export interface Targets {
  primary?: RegionId
  secondary: RegionId[]
}

/** Zones travaillées par un exercice (fiche du catalogue, sinon son groupe et son nom). */
export function targetsOf(e: { catalogId?: string; name: string; group: string }): Targets {
  const cat: Pick<CatalogExercise, 'nom' | 'groupe_musculaire' | 'muscles_secondaires'> = findCatalog(e.catalogId) ?? {
    nom: e.name,
    groupe_musculaire: e.group,
    muscles_secondaires: [],
  }
  const group = cat.groupe_musculaire
  const primary = group === 'epaules' ? SHOULDER[muscleOf(cat as CatalogExercise) ?? ''] ?? 'epaule_avant' : GROUP_REGION[group]
  const secondary: RegionId[] = []
  for (const g of cat.muscles_secondaires) {
    const r = GROUP_REGION[g]
    if (r && r !== primary && !secondary.includes(r)) secondary.push(r)
  }
  return { primary, secondary }
}

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
  if (t.primary) put(t.primary, 1, true)
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
