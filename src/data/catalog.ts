import raw from './exercices.json'
import type { PlannedSet, ProgramExercise } from './types'
import { uid } from '../logic/util'

interface Bloc {
  series: number
  reps: string
  charge?: string
  objectif?: string
  repos_sec?: number
}

export interface CatalogExercise {
  id: string
  nom: string
  groupe_musculaire: string
  muscles_secondaires: string[]
  equipement: string
  type: string
  par_cote: boolean
  chauffe?: Bloc
  travail?: Bloc
  hypertrophie?: Bloc
  cardio?: {
    echauffement_min: number
    effort_min: number
    retour_calme_min: number
    intensite: string
    consigne: string
  }
}

export const CATALOG: CatalogExercise[] = (raw as { exercices: CatalogExercise[] }).exercices
export const GROUPS: string[] = (raw as { groupes_musculaires: string[] }).groupes_musculaires

export const GROUP_LABEL: Record<string, string> = {
  abdominaux: 'Abdominaux',
  adducteurs: 'Adducteurs',
  avant_bras: 'Avant-bras',
  biceps: 'Biceps',
  dos: 'Dos',
  epaules: 'Épaules',
  fessiers: 'Fessiers',
  ischio_jambiers: 'Ischio-jambiers',
  lombaires: 'Lombaires',
  mollets: 'Mollets',
  obliques: 'Obliques',
  pectoraux: 'Pectoraux',
  quadriceps: 'Quadriceps',
  trapezes: 'Trapèzes',
  triceps: 'Triceps',
  cardio: 'Cardio',
  autre: 'Autre',
}

export const groupLabel = (g: string) => GROUP_LABEL[g] ?? g

/** « 10-12 puis 5-6 » → 12 ; « 3-6 » → 6 ; « 15 » → 15. */
export function parseReps(text: string): number | undefined {
  const m = text.match(/(\d+)(?:\s*-\s*(\d+))?/)
  if (!m) return undefined
  return Number(m[2] ?? m[1])
}

export type Cycle = 'force' | 'hypertrophie'

/** Construit les séries d'un exercice du catalogue selon le cycle choisi. */
export function buildSets(ex: CatalogExercise, cycle: Cycle, withWarmup = true): { sets: PlannedSet[]; restSec: number } {
  if (ex.cardio) {
    const c = ex.cardio
    return {
      restSec: 0,
      sets: [
        { phase: 'chauffe', durationSec: c.echauffement_min * 60 },
        { phase: 'effort', durationSec: c.effort_min * 60 },
        { phase: 'retour', durationSec: c.retour_calme_min * 60 },
      ],
    }
  }
  const sets: PlannedSet[] = []
  if (withWarmup && ex.chauffe) {
    const reps = parseReps(ex.chauffe.reps)
    for (let i = 0; i < ex.chauffe.series; i++) sets.push({ phase: 'chauffe', reps })
  }
  const bloc = cycle === 'force' ? ex.travail : ex.hypertrophie
  const phase = cycle === 'force' ? 'travail' : 'hypertrophie'
  if (bloc) {
    const reps = parseReps(bloc.reps)
    for (let i = 0; i < bloc.series; i++) sets.push({ phase, reps })
  }
  return { sets, restSec: bloc?.repos_sec ?? 90 }
}

export function exerciseFromCatalog(ex: CatalogExercise, cycle: Cycle, withWarmup: boolean): ProgramExercise {
  const { sets, restSec } = buildSets(ex, cycle, withWarmup)
  return {
    id: uid(),
    catalogId: ex.id,
    name: ex.nom,
    group: ex.groupe_musculaire,
    parCote: ex.par_cote,
    restSec,
    sets,
    note: ex.cardio ? `${ex.cardio.consigne} Intensité ${ex.cardio.intensite}.` : undefined,
  }
}

export const findCatalog = (id?: string) => (id ? CATALOG.find((e) => e.id === id) : undefined)
