import type { AppData, FinisherType } from './types'

/** Un exercice du finisher : des répétitions, un temps tenu, ou jusqu'à l'échec. */
export interface FinisherItem {
  name: string
  kind: 'reps' | 'temps' | 'echec'
  /** Répétitions, ou secondes pour un temps. */
  value?: number
}

export interface Finisher {
  id: string
  type: FinisherType
  name: string
  items: FinisherItem[]
}

export const FINISHER_TYPES: { type: FinisherType; label: string }[] = [
  { type: 'abdos', label: 'Abdos' },
  { type: 'dos', label: 'Dos' },
  { type: 'pecs', label: 'Pecs' },
  { type: 'jambes', label: 'Jambes' },
  { type: 'epaules_bras', label: 'Épaules / bras' },
]

export const finisherTypeLabel = (t: FinisherType) => FINISHER_TYPES.find((f) => f.type === t)?.label ?? t

const R = (name: string, value: number): FinisherItem => ({ name, kind: 'reps', value })
const T = (name: string, value: number): FinisherItem => ({ name, kind: 'temps', value })
const E = (name: string): FinisherItem => ({ name, kind: 'echec' })

/** Finishers proposés par défaut : mini-séances au poids du corps (barre, banc). Un seul tour, à fond. */
export const DEFAULT_FINISHERS: Finisher[] = [
  { id: 'abdos_1', type: 'abdos', name: 'Abdos 1', items: [R('abdos', 30), R('abdos lestés', 10), R('Russian twists', 15), T('gainage', 45), T('gainage latéral de chaque côté', 30)] },
  { id: 'abdos_2', type: 'abdos', name: 'Abdos 2', items: [R('relevés de jambes', 20), R('mountain climbers par jambe', 20), R('V-ups', 15), T('gainage avec toucher d’épaules', 60)] },
  { id: 'abdos_3', type: 'abdos', name: 'Abdos 3', items: [R('crunchs bicyclette par côté', 20), R('relevés de bassin', 15), R('battements de jambes par jambe', 20), T('hollow hold', 30)] },
  { id: 'abdos_4', type: 'abdos', name: 'Abdos 4', items: [R('dead bugs', 20), R('crunchs', 20), R('touchers de pieds jambes tendues', 20), T('gainage sur les coudes', 45)] },

  { id: 'dos_1', type: 'dos', name: 'Dos 1', items: [R('tractions pronation', 10), R('pompes', 10), R('tractions prise neutre', 10), R('pompes', 10), R('tractions supination', 10)] },
  { id: 'dos_2', type: 'dos', name: 'Dos 2', items: [R('rowings inversés', 15), R('tractions australiennes', 10), R('superman', 20), E('suspension à la barre')] },
  { id: 'dos_3', type: 'dos', name: 'Dos 3', items: [R('tractions lentes (5 s en descente)', 5), R('tractions', 10), R('rowings inversés', 15), T('suspension active', 30)] },
  { id: 'dos_4', type: 'dos', name: 'Dos 4', items: [R('élévations en Y allongé sur le ventre', 15), R('superman avec 2 s de maintien', 15), R('tractions australiennes', 10), R('bird dogs par côté', 10)] },

  { id: 'pecs_1', type: 'pecs', name: 'Pecs 1', items: [R('pompes classiques', 20), R('pompes militaires', 10), R('pompes archer', 10), R('pompes déclinées', 10), R('pompes inclinées', 10)] },
  { id: 'pecs_2', type: 'pecs', name: 'Pecs 2', items: [R('pompes explosives', 10), R('pompes larges', 15), R('pompes diamant', 10), E('gainage position haute')] },
  { id: 'pecs_3', type: 'pecs', name: 'Pecs 3', items: [R('pompes lentes (3 s en descente)', 10), R('pompes larges', 10), R('pompes serrées', 10), E('pompes sur les genoux')] },
  { id: 'pecs_4', type: 'pecs', name: 'Pecs 4', items: [R('dips', 15), R('pompes', 15), R('dips', 10), R('pompes', 10), T('position basse de pompe', 20)] },

  { id: 'jambes_1', type: 'jambes', name: 'Jambes 1', items: [R('squats', 20), R('fentes sautées par jambe', 10), R('squats sautés', 15), T('chaise contre le mur', 45), R('montées sur pointes', 20)] },
  { id: 'jambes_2', type: 'jambes', name: 'Jambes 2', items: [R('squats bulgares par jambe', 15), R('ponts fessiers', 20), R('squats sautés', 10), T('chaise contre le mur', 30)] },
  { id: 'jambes_3', type: 'jambes', name: 'Jambes 3', items: [R('fentes arrière par jambe', 15), R('squats sumo', 20), R('squats sautés', 10), T('chaise contre le mur', 30)] },
  { id: 'jambes_4', type: 'jambes', name: 'Jambes 4', items: [R('squats pistol assistés par jambe', 8), R('ponts fessiers sur une jambe (par jambe)', 10), R('jumping jacks', 30), R('montées sur pointes', 30)] },

  { id: 'epaules_bras_1', type: 'epaules_bras', name: 'Épaules / bras 1', items: [R('pompes piquées', 10), R('dips sur banc', 15), R('élévations latérales légères', 20), T('bras tendus en croix', 30)] },
  { id: 'epaules_bras_2', type: 'epaules_bras', name: 'Épaules / bras 2', items: [R('pompes piquées pieds surélevés', 10), R('dips sur banc', 15), R('pompes diamant', 10), T('planche bras tendus avec toucher d’épaules', 30)] },
  { id: 'epaules_bras_3', type: 'epaules_bras', name: 'Épaules / bras 3', items: [R('cercles de bras vers l’avant', 20), R('cercles de bras vers l’arrière', 20), R('pompes piquées', 15), R('dips sur banc', 20), T('maintien bras tendus en haut des dips', 20)] },
]


/** Exercices adaptés aux finishers (poids du corps, barre, banc), proposés dans l'éditeur. */
export const FINISHER_EXERCISES: Record<FinisherType, FinisherItem[]> = {
  abdos: [
    R('crunchs', 20), R('abdos', 30), R('abdos lestés', 10), R('crunchs bicyclette par côté', 20), R('Russian twists', 15),
    R('relevés de jambes', 15), R('relevés de bassin', 15), R('V-ups', 15), R('mountain climbers par jambe', 20), R('dead bugs', 20),
    R('battements de jambes par jambe', 20), R('touchers de pieds jambes tendues', 20), R('relevés de genoux à la barre', 12),
    T('gainage', 45), T('gainage latéral de chaque côté', 30), T('gainage sur les coudes', 45), T('hollow hold', 30), T('gainage avec toucher d’épaules', 45),
  ],
  dos: [
    R('tractions', 10), R('tractions pronation', 10), R('tractions supination', 10), R('tractions prise neutre', 10), R('tractions lentes (5 s en descente)', 5),
    R('tractions australiennes', 10), R('rowings inversés', 15), R('superman', 20), R('superman avec 2 s de maintien', 15),
    R('élévations en Y allongé sur le ventre', 15), R('bird dogs par côté', 10), R('pompes', 10),
    T('suspension active', 30), E('suspension à la barre'),
  ],
  pecs: [
    R('pompes', 15), R('pompes classiques', 20), R('pompes larges', 15), R('pompes serrées', 10), R('pompes diamant', 10), R('pompes déclinées', 10),
    R('pompes inclinées', 10), R('pompes archer', 10), R('pompes explosives', 10), R('pompes militaires', 10), R('pompes lentes (3 s en descente)', 10), R('dips', 12),
    T('position basse de pompe', 20), E('pompes sur les genoux'), E('gainage position haute'),
  ],
  jambes: [
    R('squats', 20), R('squats sautés', 15), R('squats sumo', 20), R('squats bulgares par jambe', 12), R('squats pistol assistés par jambe', 8),
    R('fentes arrière par jambe', 15), R('fentes sautées par jambe', 10), R('ponts fessiers', 20), R('ponts fessiers sur une jambe (par jambe)', 10),
    R('montées sur pointes', 20), R('jumping jacks', 30), R('step-ups par jambe', 12),
    T('chaise contre le mur', 45), E('squats'),
  ],
  epaules_bras: [
    R('pompes piquées', 10), R('pompes piquées pieds surélevés', 10), R('dips sur banc', 15), R('pompes diamant', 10), R('élévations latérales légères', 20),
    R('cercles de bras vers l’avant', 20), R('cercles de bras vers l’arrière', 20), R('chin-ups (supination)', 8),
    T('bras tendus en croix', 30), T('planche bras tendus avec toucher d’épaules', 30), T('maintien bras tendus en haut des dips', 20), E('dips sur banc'),
  ],
}

/** Texte d'un exercice : « 20 squats », « Chaise contre le mur 45 s », « Suspension à la barre jusqu'à l'échec ». */
export function formatItem(it: FinisherItem): string {
  const cap = (t: string) => t.replace(/^./, (c) => c.toUpperCase())
  if (it.kind === 'reps') return `${it.value ?? 0} ${it.name}`
  if (it.kind === 'temps') {
    const s = it.value ?? 0
    const m = Math.floor(s / 60)
    return cap(`${it.name} ${m ? `${m} min${s % 60 ? ` ${s % 60} s` : ''}` : `${s} s`}`)
  }
  return cap(`${it.name} jusqu’à l’échec`)
}

/** Finishers de l'utilisateur (ceux par défaut tant qu'il n'a rien modifié). */
export const finishersOf = (d: Pick<AppData, 'finishers'>) => d.finishers ?? DEFAULT_FINISHERS

/** Tire un finisher du type demandé, jamais le même que la dernière fois pour ce type. */
export function drawFinisher(type: FinisherType, lastId: string | undefined, all: Finisher[] = DEFAULT_FINISHERS, random: () => number = Math.random): Finisher | undefined {
  const pool = all.filter((f) => f.type === type && f.items.length > 0)
  const candidates = pool.length > 1 ? pool.filter((f) => f.id !== lastId) : pool
  return candidates[Math.floor(random() * candidates.length)]
}
