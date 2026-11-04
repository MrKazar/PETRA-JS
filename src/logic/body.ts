import { CATALOG, findCatalog, type CatalogExercise } from '../data/catalog'
import { muscleOf } from '../data/muscles'
import type { AppData, PlannedSet, Program, Session } from '../data/types'
import { addDays, dateKey, parseKey, weekday } from './util'
import { exerciseKey } from './progress'

/**
 * Schéma du corps (PCTRA) : combien de séries chaque muscle a reçues, d'après le muscle principal
 * et les muscles secondaires de chaque exercice. Une série compte 1 pour le muscle principal et
 * 0,5 pour chaque muscle secondaire ; les séries de chauffe ne comptent pas.
 */

export type RegionId =
  | 'pec_haut'
  | 'pec_milieu'
  | 'pec_bas'
  | 'epaule_avant'
  | 'epaule_cote'
  | 'epaule_arriere'
  | 'biceps'
  | 'triceps'
  | 'avant_bras'
  | 'abdominaux'
  | 'obliques'
  | 'trapezes'
  | 'dos_largeur'
  | 'dos_epaisseur'
  | 'lombaires'
  | 'fessiers'
  | 'moyen_fessier'
  | 'quadriceps'
  | 'ischio_jambiers'
  | 'adducteurs'
  | 'mollets'

/** Familles de mouvements, pour proposer la séance où ajouter un exercice. */
export type Family = 'pousser' | 'tirer' | 'jambes' | 'tronc'

export const REGIONS: { id: RegionId; label: string; family: Family }[] = [
  { id: 'pec_haut', label: 'Haut des pectoraux', family: 'pousser' },
  { id: 'pec_milieu', label: 'Milieu des pectoraux', family: 'pousser' },
  { id: 'pec_bas', label: 'Bas des pectoraux', family: 'pousser' },
  { id: 'epaule_avant', label: 'Avant d’épaule', family: 'pousser' },
  { id: 'epaule_cote', label: 'Côté d’épaule', family: 'pousser' },
  { id: 'epaule_arriere', label: 'Arrière d’épaule', family: 'tirer' },
  { id: 'biceps', label: 'Biceps', family: 'tirer' },
  { id: 'triceps', label: 'Triceps', family: 'pousser' },
  { id: 'avant_bras', label: 'Avant-bras', family: 'tirer' },
  { id: 'trapezes', label: 'Trapèzes (haut)', family: 'tirer' },
  { id: 'dos_largeur', label: 'Grand dorsal (largeur)', family: 'tirer' },
  { id: 'dos_epaisseur', label: 'Milieu du dos (épaisseur)', family: 'tirer' },
  { id: 'lombaires', label: 'Lombaires', family: 'jambes' },
  { id: 'abdominaux', label: 'Abdominaux et gainage', family: 'tronc' },
  { id: 'obliques', label: 'Obliques', family: 'tronc' },
  { id: 'fessiers', label: 'Grand fessier', family: 'jambes' },
  { id: 'moyen_fessier', label: 'Moyen fessier (abducteurs)', family: 'jambes' },
  { id: 'quadriceps', label: 'Quadriceps', family: 'jambes' },
  { id: 'ischio_jambiers', label: 'Ischio-jambiers', family: 'jambes' },
  { id: 'adducteurs', label: 'Adducteurs', family: 'jambes' },
  { id: 'mollets', label: 'Mollets', family: 'jambes' },
]

export const regionLabel = (id: RegionId) => REGIONS.find((r) => r.id === id)?.label ?? id
export const familyOf = (id: RegionId) => REGIONS.find((r) => r.id === id)!.family

/** Groupe du catalogue → zone du schéma, pour les muscles secondaires (groupes entiers). */
const GROUP_REGION: Record<string, RegionId | undefined> = {
  pectoraux: 'pec_milieu',
  biceps: 'biceps',
  triceps: 'triceps',
  avant_bras: 'avant_bras',
  abdominaux: 'abdominaux',
  obliques: 'obliques',
  trapezes: 'trapezes',
  dos: 'dos_epaisseur',
  grand_dorsal: 'dos_largeur',
  lombaires: 'lombaires',
  fessiers: 'fessiers',
  quadriceps: 'quadriceps',
  ischio_jambiers: 'ischio_jambiers',
  adducteurs: 'adducteurs',
  mollets: 'mollets',
  epaules: 'epaule_avant',
  deltoides_anterieurs: 'epaule_avant',
}

/** Muscle détaillé de la recherche (data/muscles.ts) → zone du schéma, pour le muscle principal. */
const MUSCLE_REGION: Record<string, RegionId | undefined> = {
  pec_haut: 'pec_haut',
  pec_milieu: 'pec_milieu',
  pec_bas: 'pec_bas',
  dos_largeur: 'dos_largeur',
  dos_epaisseur: 'dos_epaisseur',
  dos_chaine: 'lombaires',
  trapezes: 'trapezes',
  lombaires: 'lombaires',
  epaule_avant: 'epaule_avant',
  epaule_cote: 'epaule_cote',
  epaule_arriere: 'epaule_arriere',
  biceps: 'biceps',
  triceps: 'triceps',
  avant_bras: 'avant_bras',
  quadriceps: 'quadriceps',
  ischio_jambiers: 'ischio_jambiers',
  fessiers: 'fessiers',
  abducteurs: 'moyen_fessier',
  adducteurs: 'adducteurs',
  mollets: 'mollets',
  gainage: 'abdominaux',
  abdominaux: 'abdominaux',
  obliques: 'obliques',
}

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
  const primary = MUSCLE_REGION[muscleOf(cat as CatalogExercise) ?? ''] ?? GROUP_REGION[cat.groupe_musculaire]
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
    const prim = p.exercises.flatMap(partsOf).map(primaryOf)
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
  const exercises = CATALOG.filter((e) => !e.cardio && primaryOf({ catalogId: e.id, name: e.nom, group: e.groupe_musculaire }) === region)
    .map((e, i) => ({ e, i, n: used.get(e.id) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .slice(0, max)
    .map((x) => x.e)
  return { region, exercises, program: bestProgramFor(region, plannedPrograms(data)) }
}
