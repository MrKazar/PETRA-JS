import { findCatalog, type CatalogExercise } from './catalog'
import { muscleOf, norm } from './muscles'

/**
 * Anatomie fine pour le schéma du corps (PCTRA) : 36 muscles ou chefs de muscle, et pour chaque
 * exercice ses muscles principaux (1 par série) et secondaires (0,5 par série).
 */

export type Family = 'pousser' | 'tirer' | 'jambes' | 'tronc'

export const ZONES_FINE = ['Pectoraux', 'Épaules', 'Bras', 'Avant-bras', 'Dos', 'Tronc', 'Hanches et fessiers', 'Cuisses', 'Bas des jambes'] as const
export type FineZone = (typeof ZONES_FINE)[number]

export const MUSCLES_FINE = [
  { id: 'pec_haut', label: 'Haut des pectoraux', zone: 'Pectoraux', family: 'pousser' },
  { id: 'pec_milieu', label: 'Milieu des pectoraux', zone: 'Pectoraux', family: 'pousser' },
  { id: 'pec_bas', label: 'Bas des pectoraux', zone: 'Pectoraux', family: 'pousser' },
  { id: 'dentele', label: 'Dentelé antérieur', zone: 'Pectoraux', family: 'pousser' },
  { id: 'delt_ant', label: 'Deltoïde antérieur', zone: 'Épaules', family: 'pousser' },
  { id: 'delt_lat', label: 'Deltoïde latéral', zone: 'Épaules', family: 'pousser' },
  { id: 'delt_post', label: 'Deltoïde postérieur', zone: 'Épaules', family: 'tirer' },
  { id: 'coiffe', label: 'Coiffe des rotateurs (infra-épineux)', zone: 'Épaules', family: 'tirer' },
  { id: 'biceps', label: 'Biceps', zone: 'Bras', family: 'tirer' },
  { id: 'brachial', label: 'Brachial', zone: 'Bras', family: 'tirer' },
  { id: 'triceps_long', label: 'Triceps, chef long', zone: 'Bras', family: 'pousser' },
  { id: 'triceps_lat', label: 'Triceps, chefs latéral et médial', zone: 'Bras', family: 'pousser' },
  { id: 'brachio_radial', label: 'Brachio-radial', zone: 'Avant-bras', family: 'tirer' },
  { id: 'flechisseurs_ab', label: 'Fléchisseurs de l’avant-bras', zone: 'Avant-bras', family: 'tirer' },
  { id: 'extenseurs_ab', label: 'Extenseurs de l’avant-bras', zone: 'Avant-bras', family: 'tirer' },
  { id: 'trap_sup', label: 'Trapèze supérieur', zone: 'Dos', family: 'tirer' },
  { id: 'trap_moyen', label: 'Trapèze moyen', zone: 'Dos', family: 'tirer' },
  { id: 'trap_inf', label: 'Trapèze inférieur', zone: 'Dos', family: 'tirer' },
  { id: 'rhomboides', label: 'Rhomboïdes', zone: 'Dos', family: 'tirer' },
  { id: 'grand_dorsal', label: 'Grand dorsal', zone: 'Dos', family: 'tirer' },
  { id: 'grand_rond', label: 'Grand rond', zone: 'Dos', family: 'tirer' },
  { id: 'erecteurs', label: 'Lombaires (érecteurs du rachis)', zone: 'Dos', family: 'jambes' },
  { id: 'grand_droit', label: 'Grand droit (abdominaux)', zone: 'Tronc', family: 'tronc' },
  { id: 'obliques', label: 'Obliques', zone: 'Tronc', family: 'tronc' },
  { id: 'flechisseurs_hanche', label: 'Fléchisseurs de hanche (psoas)', zone: 'Hanches et fessiers', family: 'jambes' },
  { id: 'grand_fessier', label: 'Grand fessier', zone: 'Hanches et fessiers', family: 'jambes' },
  { id: 'moyen_fessier', label: 'Moyen fessier (abducteurs)', zone: 'Hanches et fessiers', family: 'jambes' },
  { id: 'adducteurs', label: 'Adducteurs', zone: 'Cuisses', family: 'jambes' },
  { id: 'droit_femoral', label: 'Quadriceps, droit fémoral', zone: 'Cuisses', family: 'jambes' },
  { id: 'vaste_externe', label: 'Quadriceps, vaste externe', zone: 'Cuisses', family: 'jambes' },
  { id: 'vaste_interne', label: 'Quadriceps, vaste interne', zone: 'Cuisses', family: 'jambes' },
  { id: 'biceps_femoral', label: 'Ischio, biceps fémoral', zone: 'Cuisses', family: 'jambes' },
  { id: 'semi_tendineux', label: 'Ischio, semi-tendineux et semi-membraneux', zone: 'Cuisses', family: 'jambes' },
  { id: 'gastrocnemiens', label: 'Mollets, gastrocnémiens', zone: 'Bas des jambes', family: 'jambes' },
  { id: 'soleaire', label: 'Mollets, soléaire', zone: 'Bas des jambes', family: 'jambes' },
  { id: 'tibial', label: 'Tibial antérieur', zone: 'Bas des jambes', family: 'jambes' },
] as const satisfies readonly { id: string; label: string; zone: FineZone; family: Family }[]

export type FineId = (typeof MUSCLES_FINE)[number]['id']

const QUADS: FineId[] = ['droit_femoral', 'vaste_externe', 'vaste_interne']
const ISCHIOS: FineId[] = ['biceps_femoral', 'semi_tendineux']
const TRICEPS: FineId[] = ['triceps_lat', 'triceps_long']

/** Muscle secondaire du catalogue (groupe entier) → muscles fins. */
function secondaryOf(group: string, primaryGroup: string): FineId[] {
  switch (group) {
    case 'pectoraux':
      return ['pec_milieu']
    case 'triceps':
      return TRICEPS
    case 'biceps':
      return ['biceps', 'brachial']
    case 'epaules':
    case 'deltoides_anterieurs':
      return ['delt_ant']
    case 'trapezes':
      // Dans un tirage ou un oiseau, c'est le milieu du trapèze qui travaille ; sinon le haut.
      return primaryGroup === 'dos' || primaryGroup === 'epaules' ? ['trap_moyen'] : ['trap_sup']
    case 'fessiers':
      return ['grand_fessier']
    case 'ischio_jambiers':
      return ISCHIOS
    case 'lombaires':
      return ['erecteurs']
    case 'abdominaux':
      return ['grand_droit']
    case 'obliques':
      return ['obliques']
    case 'quadriceps':
      return QUADS
    case 'adducteurs':
      return ['adducteurs']
    case 'avant_bras':
      return ['flechisseurs_ab']
    case 'dos':
    case 'grand_dorsal':
      return ['grand_dorsal']
    case 'mollets':
      return ['gastrocnemiens']
    case 'fléchisseurs_hanche':
      return ['flechisseurs_hanche']
    default:
      return []
  }
}

export interface Anatomy {
  primary: FineId[]
  secondary: FineId[]
}

type Rule = { p: FineId[]; s?: FineId[] }

/** Muscles principaux (et secondaires propres au mouvement) d'après le groupe et le nom. */
function ruleFor(group: string, sub: string | undefined, n: string): Rule {
  switch (group) {
    case 'pectoraux': {
      if (/dentel|serratus|pompes scapulaires|push-up plus|wall slide|glissements? au mur/.test(n)) return { p: ['dentele'], s: ['pec_milieu'] }
      if (/pull-?over/.test(n)) return { p: ['pec_milieu', 'grand_dorsal'], s: ['dentele', 'triceps_long'] }
      const pec: FineId = sub === 'pec_haut' ? 'pec_haut' : sub === 'pec_bas' ? 'pec_bas' : 'pec_milieu'
      // Les pompes font aussi travailler le dentelé (protraction des omoplates).
      return { p: [pec], s: /pompes/.test(n) ? ['dentele'] : [] }
    }
    case 'dos': {
      if (sub === 'dos_chaine') return { p: ['erecteurs', 'grand_fessier', ...ISCHIOS], s: ['trap_sup', 'flechisseurs_ab', 'adducteurs'] }
      if (/scapulaire/.test(n)) return { p: ['trap_inf'], s: ['grand_dorsal', 'rhomboides'] }
      if (/pull-?over/.test(n)) return { p: ['grand_dorsal'], s: ['grand_rond', 'triceps_long', 'dentele'] }
      if (sub === 'dos_largeur') return { p: ['grand_dorsal', 'grand_rond'], s: ['biceps', 'brachial', 'trap_inf', 'rhomboides'] }
      return { p: ['rhomboides', 'trap_moyen', 'grand_dorsal'], s: ['delt_post', 'biceps', 'brachial'] }
    }
    case 'trapezes':
      if (/en y|y raise/.test(n)) return { p: ['trap_inf'], s: ['delt_post', 'trap_moyen'] }
      return { p: ['trap_sup'] }
    case 'epaules': {
      if (/rotation externe/.test(n)) return { p: ['coiffe'], s: ['delt_post'] }
      if (/face pull/.test(n)) return { p: ['delt_post', 'trap_moyen'], s: ['coiffe', 'rhomboides'] }
      if (/tirage menton|upright/.test(n)) return { p: ['delt_lat', 'trap_sup'], s: ['delt_ant'] }
      if (/arnold/.test(n)) return { p: ['delt_ant', 'delt_lat'], s: TRICEPS }
      if (sub === 'epaule_arriere') return { p: ['delt_post'], s: ['trap_moyen', 'rhomboides'] }
      if (sub === 'epaule_cote') return { p: ['delt_lat'], s: /developpe|landmine|kettlebell/.test(n) ? ['delt_ant', 'triceps_lat'] : ['trap_sup'] }
      if (/frontale/.test(n)) return { p: ['delt_ant'], s: ['pec_haut'] }
      // Développés au-dessus de la tête : le dentelé et le haut du trapèze font tourner l'omoplate.
      return { p: ['delt_ant'], s: ['delt_lat', 'dentele', 'trap_sup'] }
    }
    case 'biceps':
      if (/marteau/.test(n)) return { p: ['brachial', 'brachio_radial'], s: ['biceps'] }
      if (/zottman/.test(n)) return { p: ['biceps', 'brachio_radial'], s: ['brachial', 'extenseurs_ab'] }
      return { p: ['biceps'], s: ['brachial'] }
    case 'triceps':
      if (/nuque|au-dessus|tete/.test(n)) return { p: ['triceps_long'], s: ['triceps_lat'] }
      if (/barre au front|skull|extension couche|jm press|tate/.test(n)) return { p: TRICEPS }
      return { p: ['triceps_lat'], s: ['triceps_long'] }
    case 'avant_bras':
      if (/poignets inverse/.test(n)) return { p: ['extenseurs_ab'] }
      if (/curl inverse/.test(n)) return { p: ['brachio_radial', 'extenseurs_ab'], s: ['brachial'] }
      if (/rouleau/.test(n)) return { p: ['flechisseurs_ab', 'extenseurs_ab'] }
      if (/fermier/.test(n)) return { p: ['flechisseurs_ab'], s: ['trap_sup'] }
      return { p: ['flechisseurs_ab'] }
    case 'lombaires':
      return { p: ['erecteurs'] }
    case 'quadriceps':
      return { p: QUADS, s: /squat|presse|fente|step/.test(n) && !/sissy/.test(n) ? ['adducteurs'] : [] }
    case 'ischio_jambiers':
      if (/leg curl|nordic|glute ham/.test(n)) return { p: ISCHIOS, s: ['gastrocnemiens'] }
      return { p: ISCHIOS }
    case 'fessiers':
      if (/croisee|curtsy/.test(n)) return { p: ['grand_fessier', 'moyen_fessier'] }
      if (/gainage lateral/.test(n)) return { p: ['moyen_fessier'] }
      if (sub === 'abducteurs') return { p: ['moyen_fessier'] }
      return { p: ['grand_fessier'] }
    case 'adducteurs':
      return { p: ['adducteurs'] }
    case 'mollets':
      if (/tibial|pointes/.test(n)) return { p: ['tibial'] }
      if (/assis/.test(n)) return { p: ['soleaire'], s: ['gastrocnemiens'] }
      return { p: ['gastrocnemiens'], s: ['soleaire'] }
    case 'abdominaux':
      // Relevés de jambes, L-sit : c'est d'abord le psoas qui lève les jambes, les abdominaux tiennent le bassin.
      if (/releve de (jambes|genoux)|toes to bar|l-sit|mountain/.test(n)) return { p: ['grand_droit', 'flechisseurs_hanche'] }
      if (/ciseaux|battements|jackknife|v-ups|dragon|crunch inverse/.test(n)) return { p: ['grand_droit'], s: ['flechisseurs_hanche'] }
      return { p: ['grand_droit'] }
    case 'obliques':
      return { p: ['obliques'] }
    default:
      return { p: [] }
  }
}

/** Muscles principaux et secondaires d'un exercice (fiche du catalogue, sinon son groupe et son nom). */
export function anatomyOf(e: { catalogId?: string; name: string; group: string }): Anatomy {
  const cat: Pick<CatalogExercise, 'nom' | 'groupe_musculaire' | 'muscles_secondaires'> = findCatalog(e.catalogId) ?? {
    nom: e.name,
    groupe_musculaire: e.group,
    muscles_secondaires: [],
  }
  if (cat.groupe_musculaire === 'cardio') return { primary: [], secondary: [] }
  const rule = ruleFor(cat.groupe_musculaire, muscleOf(cat as CatalogExercise), norm(cat.nom))
  const primary = [...new Set(rule.p)]
  const secondary: FineId[] = []
  for (const id of [...(rule.s ?? []), ...cat.muscles_secondaires.flatMap((g) => secondaryOf(g, cat.groupe_musculaire))]) {
    if (!primary.includes(id) && !secondary.includes(id)) secondary.push(id)
  }
  return { primary, secondary }
}
