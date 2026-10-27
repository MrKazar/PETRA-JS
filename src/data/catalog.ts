import raw from './exercices.json'
import type { PlannedSet, ProgramExercise } from './types'
import { uid } from '../logic/util'

interface Phase {
  reps: string
  repos_sec: number
  charge_pct?: number
}

export interface CatalogExercise {
  id: string
  nom: string
  groupe_musculaire: string
  muscles_secondaires: string[]
  equipement: string
  type: string
  par_cote: boolean
  /** Faux : au poids du corps. */
  charge: boolean
  profil?: string
  chauffe?: Phase
  travail?: { reps: string; repos_sec: number }
  hypertrophie?: Phase
  cardio?: {
    echauffement_min: number
    effort_min: number
    retour_calme_min: number
    intensite: string
    consigne: string
  }
}

export const CATALOG: CatalogExercise[] = (raw as unknown as { exercices: CatalogExercise[] }).exercices
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
  corps_entier: 'Corps entier',
  cardio: 'Cardio',
  autre: 'Autre',
  deltoides_anterieurs: 'Deltoïdes antérieurs',
}

export const groupLabel = (g: string) => GROUP_LABEL[g] ?? g.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

/** Nombre retenu pour une fourchette : borne haute (« 6-8 » → 8 ; « 45 s » → 45 s). */
export function parseReps(text: string): { reps?: number; durationSec?: number } {
  const m = text.match(/(\d+)(?:\s*-\s*(\d+))?\s*(s\b)?/)
  if (!m) return {}
  const n = Number(m[2] ?? m[1])
  return m[3] ? { durationSec: n } : { reps: n }
}

/** Arrondi des charges au demi-kilo. */
export const roundLoad = (kg: number) => Math.round(kg * 2) / 2

/** Cycle fixe : 1 chauffe, 2 travail, 1 hypertrophie (ou les 3 phases d'un cardio). */
export function buildCycle(ex: CatalogExercise): PlannedSet[] {
  if (ex.cardio) {
    const c = ex.cardio
    return [
      { phase: 'chauffe', durationSec: c.echauffement_min * 60, restSec: 0 },
      { phase: 'effort', durationSec: c.effort_min * 60, restSec: 0 },
      { phase: 'retour', durationSec: c.retour_calme_min * 60, restSec: 0 },
    ]
  }
  const sets: PlannedSet[] = []
  if (ex.chauffe) sets.push({ phase: 'chauffe', ...parseReps(ex.chauffe.reps), pct: ex.chauffe.charge_pct, restSec: ex.chauffe.repos_sec })
  if (ex.travail) {
    const work = { phase: 'travail' as const, ...parseReps(ex.travail.reps), restSec: ex.travail.repos_sec }
    sets.push({ ...work }, { ...work })
  }
  if (ex.hypertrophie) sets.push({ phase: 'hypertrophie', ...parseReps(ex.hypertrophie.reps), pct: ex.hypertrophie.charge_pct, restSec: ex.hypertrophie.repos_sec })
  return sets
}

/** Charge d'une série d'après la charge de travail. */
export function loadFor(set: PlannedSet, workLoad: number | undefined): number | undefined {
  if (workLoad == null || workLoad <= 0) return undefined
  if (set.phase === 'travail') return roundLoad(workLoad)
  if (set.pct != null) return roundLoad((workLoad * set.pct) / 100)
  return undefined
}

/** Recalcule les charges de toutes les séries quand la charge de travail change. */
export function withWorkLoad(ex: ProgramExercise, workLoad: number | undefined): ProgramExercise {
  return {
    ...ex,
    workLoad,
    sets: ex.sets.map((s) => (s.phase === 'travail' || s.pct != null ? { ...s, weight: loadFor(s, workLoad) } : s)),
  }
}

export function exerciseFromCatalog(ex: CatalogExercise, workLoad?: number): ProgramExercise {
  const base: ProgramExercise = {
    id: uid(),
    catalogId: ex.id,
    name: ex.nom,
    group: ex.groupe_musculaire,
    parCote: ex.par_cote,
    usesLoad: ex.charge,
    restSec: ex.travail?.repos_sec ?? 0,
    sets: buildCycle(ex),
    note: ex.cardio ? `${ex.cardio.consigne} Intensité ${ex.cardio.intensite}.` : undefined,
  }
  return ex.charge ? withWorkLoad(base, workLoad) : base
}

export const findCatalog = (id?: string) => (id ? CATALOG.find((e) => e.id === id) : undefined)

/** Libellé numéroté des séries (« Travail 1 », « Travail 2 »). */
export function setLabels(sets: { phase: PlannedSet['phase'] }[]): string[] {
  const seen: Record<string, number> = {}
  const total: Record<string, number> = {}
  for (const s of sets) total[s.phase] = (total[s.phase] ?? 0) + 1
  return sets.map((s) => {
    seen[s.phase] = (seen[s.phase] ?? 0) + 1
    const label = { chauffe: 'Chauffe', travail: 'Travail', hypertrophie: 'Hypertrophie', effort: 'Effort', retour: 'Retour au calme' }[s.phase]
    return total[s.phase] > 1 ? `${label} ${seen[s.phase]}` : label
  })
}
