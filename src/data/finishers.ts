import type { FinisherType } from './types'

export interface Finisher {
  id: string
  type: FinisherType
  name: string
  items: string[]
}

export const FINISHER_TYPES: { type: FinisherType; label: string }[] = [
  { type: 'abdos', label: 'Abdos' },
  { type: 'dos', label: 'Dos' },
  { type: 'pecs', label: 'Pecs' },
  { type: 'jambes', label: 'Jambes' },
  { type: 'epaules_bras', label: 'Épaules / bras' },
]

export const finisherTypeLabel = (t: FinisherType) => FINISHER_TYPES.find((f) => f.type === t)?.label ?? t

/** Mini-séances au poids du corps (barre, banc). Un seul tour, à fond. */
export const FINISHERS: Finisher[] = [
  { id: 'abdos_1', type: 'abdos', name: 'Abdos 1', items: ['30 abdos', '10 abdos lestés', '15 Russian twists', '45 s de gainage', '30 s de gainage latéral de chaque côté'] },
  { id: 'abdos_2', type: 'abdos', name: 'Abdos 2', items: ['20 relevés de jambes', '20 mountain climbers par jambe', '15 V-ups', "1 min de gainage avec toucher d'épaules"] },
  { id: 'abdos_3', type: 'abdos', name: 'Abdos 3', items: ['20 crunchs bicyclette par côté', '15 relevés de bassin', '20 battements de jambes par jambe', '30 s de hollow hold'] },
  { id: 'abdos_4', type: 'abdos', name: 'Abdos 4', items: ['20 dead bugs', '20 crunchs', '20 touchers de pieds jambes tendues', '45 s de gainage sur les coudes'] },

  { id: 'dos_1', type: 'dos', name: 'Dos 1', items: ['10 tractions pronation', '10 pompes', '10 tractions prise neutre', '10 pompes', '10 tractions supination'] },
  { id: 'dos_2', type: 'dos', name: 'Dos 2', items: ['15 rowings inversés', '10 tractions australiennes', '20 superman', "Suspension à la barre jusqu'à l'échec"] },
  { id: 'dos_3', type: 'dos', name: 'Dos 3', items: ['5 tractions lentes (5 s en descente)', '10 tractions', '15 rowings inversés', '30 s de suspension active'] },
  { id: 'dos_4', type: 'dos', name: 'Dos 4', items: ['15 élévations en Y allongé sur le ventre', '15 superman avec 2 s de maintien', '10 tractions australiennes', '10 bird dogs par côté'] },

  { id: 'pecs_1', type: 'pecs', name: 'Pecs 1', items: ['20 pompes classiques', '10 pompes militaires', '10 pompes archer', '10 pompes déclinées', '10 pompes inclinées'] },
  { id: 'pecs_2', type: 'pecs', name: 'Pecs 2', items: ['10 pompes explosives', '15 pompes larges', '10 pompes diamant', "Gainage position haute jusqu'à l'échec"] },
  { id: 'pecs_3', type: 'pecs', name: 'Pecs 3', items: ['10 pompes lentes (3 s en descente)', '10 pompes larges', '10 pompes serrées', "Pompes sur les genoux jusqu'à l'échec"] },
  { id: 'pecs_4', type: 'pecs', name: 'Pecs 4', items: ['15 dips', '15 pompes', '10 dips', '10 pompes', '20 s en position basse de pompe'] },

  { id: 'jambes_1', type: 'jambes', name: 'Jambes 1', items: ['20 squats', '10 fentes sautées par jambe', '15 squats sautés', '45 s de chaise contre le mur', '20 montées sur pointes'] },
  { id: 'jambes_2', type: 'jambes', name: 'Jambes 2', items: ['15 squats bulgares par jambe', '20 ponts fessiers', '10 squats sautés', '30 s de chaise contre le mur'] },
  { id: 'jambes_3', type: 'jambes', name: 'Jambes 3', items: ['15 fentes arrière par jambe', '20 squats sumo', '10 squats sautés', '30 s de chaise contre le mur'] },
  { id: 'jambes_4', type: 'jambes', name: 'Jambes 4', items: ['8 squats pistol assistés par jambe', '10 ponts fessiers sur une jambe (par jambe)', '30 jumping jacks', '30 montées sur pointes'] },

  { id: 'epaules_bras_1', type: 'epaules_bras', name: 'Épaules / bras 1', items: ['10 pompes piquées', '15 dips sur banc', '20 élévations latérales légères', '30 s bras tendus en croix'] },
  { id: 'epaules_bras_2', type: 'epaules_bras', name: 'Épaules / bras 2', items: ['10 pompes piquées pieds surélevés', '15 dips sur banc', '10 pompes diamant', "30 s de planche bras tendus avec toucher d'épaules"] },
  { id: 'epaules_bras_3', type: 'epaules_bras', name: 'Épaules / bras 3', items: ['20 cercles de bras vers l\'avant puis 20 vers l\'arrière', '15 pompes piquées', '20 dips sur banc', '20 s de maintien bras tendus en haut des dips'] },
]

/** Tire un finisher du type demandé, jamais le même que la dernière fois pour ce type. */
export function drawFinisher(type: FinisherType, lastId: string | undefined, random: () => number = Math.random): Finisher {
  const pool = FINISHERS.filter((f) => f.type === type)
  const candidates = pool.length > 1 ? pool.filter((f) => f.id !== lastId) : pool
  return candidates[Math.floor(random() * candidates.length)]
}
