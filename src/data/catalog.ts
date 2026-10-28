import raw from './exercices.json'
import type { PlannedSet, ProgramExercise } from './types'
import { formatDuration, uid } from '../logic/util'

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
  cardio?: CatalogCardio
}

export type CardioPlan =
  | { mode: 'duree'; duree_min: number }
  | { mode: 'intervalles'; tours: number; effort_sec: number; repos_sec: number }
  | { mode: 'reps'; tours: number; reps: number; unite?: string; repos_sec: number }

export type CatalogCardio = CardioPlan & { intensite: string; consigne: string }

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

/** Séries d'un cardio : un bloc continu, ou des tours en durée ou en répétitions. */
export function cardioSets(p: CardioPlan): PlannedSet[] {
  if (p.mode === 'duree') return [{ phase: 'cardio', durationSec: Math.round(p.duree_min * 60), restSec: 0 }]
  const set: PlannedSet =
    p.mode === 'intervalles'
      ? { phase: 'cardio', durationSec: p.effort_sec, restSec: p.repos_sec }
      : { phase: 'cardio', reps: p.reps, unit: p.unite, restSec: p.repos_sec }
  return Array.from({ length: Math.max(1, p.tours) }, () => ({ ...set }))
}

/** Retrouve le format d'un cardio à partir de ses séries (pour l'éditeur). */
export function cardioPlanOf(sets: PlannedSet[]): CardioPlan {
  const first = sets[0]
  if (!first) return { mode: 'duree', duree_min: 20 }
  if (first.durationSec == null) return { mode: 'reps', tours: sets.length, reps: first.reps ?? 10, unite: first.unit, repos_sec: first.restSec ?? 0 }
  if (sets.length === 1 && !first.restSec) return { mode: 'duree', duree_min: first.durationSec / 60 }
  return { mode: 'intervalles', tours: sets.length, effort_sec: first.durationSec, repos_sec: first.restSec ?? 0 }
}

/** Résumé court d'un cardio : « 30 min », « 8 × 1 min · récup 1 min », « 10 × 100 sauts ». */
export function cardioSummary(p: CardioPlan): string {
  if (p.mode === 'duree') return formatDuration(p.duree_min * 60)
  const rest = p.repos_sec ? ` · récup ${formatDuration(p.repos_sec)}` : ''
  if (p.mode === 'intervalles') return `${p.tours} × ${formatDuration(p.effort_sec)}${rest}`
  return `${p.tours} × ${p.reps} ${p.unite ?? 'rép.'}${rest}`
}

export const isCardio = (e: Pick<ProgramExercise, 'group' | 'sets'>) =>
  e.group === 'cardio' || e.sets.some((s) => s.phase === 'cardio' || s.phase === 'effort' || s.phase === 'retour')

/** Cycle fixe : 1 chauffe, 2 travail, 1 hypertrophie (le cardio a son propre format). */
export function buildCycle(ex: CatalogExercise): PlannedSet[] {
  if (ex.cardio) return cardioSets(ex.cardio)
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
    restSec: ex.travail?.repos_sec ?? (ex.cardio && ex.cardio.mode !== 'duree' ? ex.cardio.repos_sec : 0),
    sets: buildCycle(ex),
    note: ex.cardio ? `${ex.cardio.consigne} Intensité ${ex.cardio.intensite}.` : undefined,
  }
  return ex.charge ? withWorkLoad(base, workLoad) : base
}

export const findCatalog = (id?: string) => (id ? CATALOG.find((e) => e.id === id) : undefined)

/** Libellé numéroté des séries (« Travail 1 », « Travail 2 »). */
export function setLabels(sets: Pick<PlannedSet, 'phase' | 'durationSec'>[]): string[] {
  const seen: Record<string, number> = {}
  const total: Record<string, number> = {}
  for (const s of sets) total[s.phase] = (total[s.phase] ?? 0) + 1
  return sets.map((s) => {
    seen[s.phase] = (seen[s.phase] ?? 0) + 1
    if (s.phase === 'cardio') return total.cardio > 1 ? `Série ${seen.cardio}` : s.durationSec != null ? 'Durée' : 'Cardio'
    const label = { chauffe: 'Chauffe', travail: 'Travail', hypertrophie: 'Hypertrophie', effort: 'Effort', retour: 'Retour au calme' }[s.phase]
    return total[s.phase] > 1 ? `${label} ${seen[s.phase]}` : label
  })
}

/** Programmes d'avant la 1.2.1 : un cardio en chauffe / effort / retour au calme devient le format du catalogue. */
export function migrateCardio(e: ProgramExercise): ProgramExercise {
  if (!e.sets.some((s) => s.phase === 'effort' || s.phase === 'retour')) return e
  const c = findCatalog(e.catalogId)?.cardio
  const effort = e.sets.find((s) => s.phase === 'effort')?.durationSec
  const plan: CardioPlan = c && c.mode !== 'duree' ? c : { mode: 'duree', duree_min: (effort ?? (c?.mode === 'duree' ? c.duree_min * 60 : 1200)) / 60 }
  return { ...e, sets: cardioSets(plan), restSec: plan.mode === 'duree' ? 0 : plan.repos_sec }
}
