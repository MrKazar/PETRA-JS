import { findCatalog, roundLoad } from '../data/catalog'
import type { ProgramExercise } from '../data/types'

/**
 * Matériel d'un exercice, pour le pas des charges :
 * haltères (1 kg jusqu'à 10 kg, puis 2 kg), barre (2,5 kg, soit 1,25 kg de chaque côté),
 * machine / poulie (écart entre deux plaques, propre à chaque appareil : demandé une fois).
 */
export type LoadKind = 'halteres' | 'barre' | 'machine' | 'autre'

export function loadKind(e: Pick<ProgramExercise, 'catalogId'>): LoadKind {
  const eq = findCatalog(e.catalogId)?.equipement.toLowerCase() ?? ''
  if (/halt[eè]re|kettlebell/.test(eq)) return 'halteres'
  if (/^barre(?! de traction| parall)|smith|trap bar|disque/.test(eq)) return 'barre'
  if (/machine|poulie/.test(eq)) return 'machine'
  return 'autre'
}

/** Haltères : pas de 1 kg jusqu'à 10 kg, puis de 2 kg. */
const DB_SWITCH = 10

/** Pas réglé à la main, sinon le pas du matériel (undefined : machine dont l'écart n'est pas encore connu). */
export function knownStep(e: Pick<ProgramExercise, 'catalogId' | 'loadStep'>): number | undefined {
  if (e.loadStep && e.loadStep > 0) return e.loadStep
  const k = loadKind(e)
  if (k === 'barre') return 2.5
  if (k === 'machine') return undefined
  if (k === 'autre') return 2.5
  return undefined // haltères : pas variable, voir stepLoad
}

/** Il faut demander l'écart entre deux plaques avant de proposer une charge. */
export const needsStep = (e: Pick<ProgramExercise, 'catalogId' | 'loadStep'>) => !(e.loadStep && e.loadStep > 0) && loadKind(e) === 'machine'

const snap = (kg: number, step: number) => Math.round(Math.round(kg / step) * step * 100) / 100

/** Charge d'à côté, vers le haut (dir = 1) ou vers le bas (dir = -1), en suivant le pas du matériel. */
export function stepLoad(e: Pick<ProgramExercise, 'catalogId' | 'loadStep'>, kg: number, dir: 1 | -1): number {
  const v = Math.max(0, kg)
  const fixed = knownStep(e)
  if (fixed == null && loadKind(e) !== 'halteres') return Math.max(0, roundLoad(v + dir * 2.5))
  if (fixed != null) {
    const on = snap(v, fixed)
    // Hors de la grille : on se cale d'abord sur la valeur de la grille dans le bon sens.
    if (Math.abs(on - v) > 1e-6) return Math.max(0, dir > 0 ? (on > v ? on : snap(on + fixed, fixed)) : on < v ? on : snap(on - fixed, fixed))
    return Math.max(0, snap(v + dir * fixed, fixed))
  }
  // Haltères : 1, 2, … 10, puis 12, 14, 16…
  const grid = (x: number) => (x <= DB_SWITCH ? Math.round(x) : Math.round(x / 2) * 2)
  if (dir > 0) {
    const n = v < DB_SWITCH ? Math.floor(v) + 1 : Math.floor(v / 2) * 2 + 2
    return grid(n)
  }
  if (v <= 0) return 0
  const n = v <= DB_SWITCH ? Math.ceil(v) - 1 : Math.ceil(v / 2) * 2 - 2
  return Math.max(0, grid(n))
}

/** Charge arrondie à ce que le matériel permet (séries de chauffe et d'hypertrophie en %). */
export function roundForEquipment(e: Pick<ProgramExercise, 'catalogId' | 'loadStep'>, kg: number): number {
  const fixed = knownStep(e)
  if (fixed != null) return snap(kg, fixed)
  if (loadKind(e) === 'halteres') return kg <= DB_SWITCH ? Math.max(1, Math.round(kg)) : Math.round(kg / 2) * 2
  return roundLoad(kg)
}

/** Explication du pas, pour l'éditeur d'exercice. */
export function stepHint(e: Pick<ProgramExercise, 'catalogId' | 'loadStep'>): string {
  if (e.loadStep && e.loadStep > 0) return `${fmtKg(e.loadStep)} kg (réglé à la main)`
  switch (loadKind(e)) {
    case 'halteres':
      return '1 kg jusqu’à 10 kg, puis 2 kg'
    case 'barre':
      return '2,5 kg (1,25 kg de chaque côté)'
    case 'machine':
      return 'écart entre deux plaques, à régler'
    default:
      return '2,5 kg'
  }
}

export const fmtKg = (v: number) => String(v).replace('.', ',')
