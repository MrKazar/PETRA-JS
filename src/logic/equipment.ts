import { EQUIPMENT, type EquipmentItem } from '../data/equipment'

export { EQUIPMENT, type EquipmentItem }

const BY_ID = new Map(EQUIPMENT.map((x) => [x.id, x]))

/** Matériel exigé par chaque exercice du catalogue (absent = aucun matériel). */
const NEEDS = new Map<string, EquipmentItem[]>()
for (const item of EQUIPMENT) for (const id of item.ids) NEEDS.set(id, [...(NEEDS.get(id) ?? []), item])

export const needsOf = (exerciseId: string): EquipmentItem[] => NEEDS.get(exerciseId) ?? []

/** Avoir l'un donne aussi l'autre (une paire d'haltères contient un haltère seul, etc.). */
const IMPLIES: Record<string, string[]> = {
  halteres: ['haltere_seul'],
  barre_olympique_disques: ['disques_seuls'],
  banc_avec_supports_de_barre: ['banc_plat'],
  banc_inclinable: ['banc_plat'],
  vis_a_vis_a_deux_poulies: ['poulie_haute', 'poulie_basse', 'poulie_reglable_a_mi_hauteur'],
}

/** Catégories dans l'ordre de la liste. */
export const CATEGORIES = [...new Set(EQUIPMENT.map((x) => x.cat))]

/** Le matériel possédé, implications comprises. */
export function ownedSet(owned: readonly string[]): Set<string> {
  const set = new Set(owned.filter((id) => BY_ID.has(id)))
  for (const id of [...set]) for (const more of IMPLIES[id] ?? []) set.add(more)
  return set
}

/** Matériel qui manque pour faire cet exercice. */
export const missingFor = (exerciseId: string, owned: Set<string>) => needsOf(exerciseId).filter((x) => !owned.has(x.id))

export const canDo = (exerciseId: string, owned: Set<string>) => needsOf(exerciseId).every((x) => owned.has(x.id))

/** Toujours présents (ou presque) : cochés dans tous les préréglages. */
const EVERYWHERE = ['mur', 'marche_cale']

const HOME = ['halteres', 'banc_inclinable', 'barre_de_traction', 'elastique_mini_band', 'kettlebell', 'disques_seuls', 'corde_a_sauter', 'roue_abdominale']

const CARDIO_GYM = ['tapis_de_course', 'velo_d_appartement', 'velo_elliptique', 'rameur', 'stairmaster']

/** Préréglages pour cocher vite, à affiner ensuite. */
export const PRESETS: { id: string; label: string; hint: string; items: string[] }[] = [
  { id: 'salle', label: 'Salle complète', hint: 'Tout le matériel', items: EQUIPMENT.map((x) => x.id) },
  {
    id: 'salle_classique',
    label: 'Salle classique',
    hint: 'Barres, haltères, bancs, poulies, machines courantes',
    items: [
      ...HOME, ...CARDIO_GYM,
      'barre_olympique_disques', 'barre_ez', 'rack_a_squat_cage', 'banc_avec_supports_de_barre', 'banc_decline', 'barres_paralleles', 'banc_a_lombaires_45',
      'vis_a_vis_a_deux_poulies', 'station_de_tirage_vertical', 'station_de_tirage_horizontal', 'corde', 'barre_droite_courte', 'barre_de_tirage_large', 'poignee_triangle', 'poignee_simple', 'sangle_de_cheville',
      'presse_a_cuisses_45', 'leg_extension', 'leg_curl_allonge', 'leg_curl_assis', 'pec_deck_reverse_pec_deck', 'developpe_couche_machine', 'developpe_epaules_machine', 'rowing_machine',
      'machine_abducteurs_adducteurs', 'smith_machine', 'mollets_assis_machine', 'machine_assistee_tractions_dips', 'pupitre', 'chaise_romaine', 'box_caisse',
    ],
  },
  { id: 'maison', label: 'Maison', hint: 'Haltères, banc, barre de traction, élastiques', items: HOME },
  { id: 'rien', label: 'Poids du corps', hint: 'Aucun matériel', items: [] },
].map((p) => ({ ...p, items: [...new Set([...EVERYWHERE, ...p.items])] }))
