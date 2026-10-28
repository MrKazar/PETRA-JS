import { CATALOG, type CatalogExercise } from './catalog'

/** Classement pour la recherche : zone → muscle → exercices. */
export interface Muscle {
  id: string
  label: string
  hint?: string
  /** Groupe musculaire du catalogue. */
  group: string
  /** Mots du nom qui rangent l'exercice dans ce muscle (sinon : tout le groupe, ou le reste du groupe). */
  match?: RegExp
}

export interface Zone {
  id: string
  label: string
  muscles: Muscle[]
}

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const ZONES: Zone[] = [
  {
    id: 'pectoraux',
    label: 'Pectoraux',
    muscles: [
      { id: 'pec_haut', label: 'Haut des pectoraux', hint: 'Faisceau claviculaire', group: 'pectoraux', match: /^(?!pompes).*inclin|pompes declin|vers haut|landmine/ },
      { id: 'pec_bas', label: 'Bas des pectoraux', hint: 'Dips, déclinés', group: 'pectoraux', match: /^(?!pompes).*declin|pompes inclin|dips|vers bas/ },
      { id: 'pec_milieu', label: 'Milieu des pectoraux', hint: 'Développés, écartés, pompes', group: 'pectoraux' },
    ],
  },
  {
    id: 'dos',
    label: 'Dos',
    muscles: [
      { id: 'dos_largeur', label: 'Grand dorsal (largeur)', hint: 'Tractions, tirages verticaux', group: 'dos', match: /traction|tirage vertical|pull-over|pullover|muscle-up|scapulaire/ },
      { id: 'dos_epaisseur', label: 'Milieu du dos (épaisseur)', hint: 'Rowings, tirages horizontaux', group: 'dos' },
      { id: 'dos_chaine', label: 'Soulevés de terre', hint: 'Toute la chaîne postérieure', group: 'dos', match: /souleve|rack pull/ },
      { id: 'trapezes', label: 'Trapèzes', group: 'trapezes' },
      { id: 'lombaires', label: 'Lombaires', group: 'lombaires' },
    ],
  },
  {
    id: 'epaules',
    label: 'Épaules',
    muscles: [
      { id: 'epaule_avant', label: 'Avant d’épaule', hint: 'Développés, élévations frontales', group: 'epaules' },
      { id: 'epaule_cote', label: 'Côté d’épaule', hint: 'Élévations latérales', group: 'epaules', match: /lateral|tirage menton|upright/ },
      { id: 'epaule_arriere', label: 'Arrière d’épaule', hint: 'Oiseau, face pull', group: 'epaules', match: /oiseau|face pull|inverse|rotation externe|arriere/ },
    ],
  },
  {
    id: 'bras',
    label: 'Bras',
    muscles: [
      { id: 'biceps', label: 'Biceps', group: 'biceps' },
      { id: 'triceps', label: 'Triceps', group: 'triceps' },
      { id: 'avant_bras', label: 'Avant-bras', hint: 'Poignets, grip', group: 'avant_bras' },
    ],
  },
  {
    id: 'jambes',
    label: 'Jambes',
    muscles: [
      { id: 'quadriceps', label: 'Quadriceps', group: 'quadriceps' },
      { id: 'ischio_jambiers', label: 'Ischio-jambiers', group: 'ischio_jambiers' },
      { id: 'fessiers', label: 'Fessiers', group: 'fessiers' },
      { id: 'adducteurs', label: 'Adducteurs', group: 'adducteurs' },
      { id: 'mollets', label: 'Mollets', group: 'mollets' },
    ],
  },
  {
    id: 'tronc',
    label: 'Abdos et tronc',
    muscles: [
      { id: 'gainage', label: 'Gainage', hint: 'Planches, maintiens', group: 'abdominaux', match: /gainage|planche|hollow|l-sit|bear crawl/ },
      { id: 'abdominaux', label: 'Abdominaux', hint: 'Crunchs, relevés de jambes', group: 'abdominaux' },
      { id: 'obliques', label: 'Obliques', group: 'obliques' },
    ],
  },
  {
    id: 'global',
    label: 'Corps entier et cardio',
    muscles: [
      { id: 'corps_entier', label: 'Corps entier', hint: 'Mouvements complets, explosifs', group: 'corps_entier' },
      { id: 'cardio', label: 'Cardio', hint: 'Durée, fractionné', group: 'cardio' },
    ],
  },
]

const MUSCLES = ZONES.flatMap((z) => z.muscles.map((m) => ({ ...m, zone: z.id })))
export const findZone = (id?: string) => ZONES.find((z) => z.id === id)
export const findMuscle = (id?: string) => MUSCLES.find((m) => m.id === id)

/** Muscle principal d'un exercice : le premier muscle de son groupe dont les mots correspondent, sinon celui sans mots. */
export function muscleOf(e: CatalogExercise): string | undefined {
  const name = norm(e.nom)
  const inGroup = MUSCLES.filter((m) => m.group === e.groupe_musculaire)
  return (inGroup.find((m) => m.match?.test(name)) ?? inGroup.find((m) => !m.match))?.id
}

const MUSCLE_BY_ID = new Map(CATALOG.map((e) => [e.id, muscleOf(e)]))
export const muscleIdOf = (e: CatalogExercise) => MUSCLE_BY_ID.get(e.id)

export const zoneOfMuscle = (muscleId?: string) => MUSCLES.find((m) => m.id === muscleId)?.zone

/** Muscles travaillés en secondaire par un exercice (groupes entiers). */
export const worksSecondary = (e: CatalogExercise, m: Muscle) => !m.match && MUSCLES.filter((x) => x.group === m.group).length === 1 && e.muscles_secondaires.includes(m.group)

export type Kind = 'tous' | 'libre' | 'machine' | 'pdc'

export const KINDS: { kind: Kind; label: string }[] = [
  { kind: 'tous', label: 'Tout' },
  { kind: 'libre', label: 'Charge libre' },
  { kind: 'machine', label: 'Machine / poulie' },
  { kind: 'pdc', label: 'Poids du corps' },
]

export function kindOf(e: CatalogExercise): Exclude<Kind, 'tous'> | 'cardio' {
  if (e.cardio) return 'cardio'
  if (e.pdc || !e.charge) return 'pdc'
  return /machine|poulie|smith/.test(norm(e.equipement)) ? 'machine' : 'libre'
}
