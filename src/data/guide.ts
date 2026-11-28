import type { Route, Tab } from '../nav'
import type { KranosMood } from '../ui/Kranos'

/** Une bulle de Kranos. */
export interface GuideTip {
  mood: KranosMood
  text: string
}

/** Étape de la visite guidée : l'onglet montré et ce que Kranos en dit. */
export interface TourStep extends GuideTip {
  tab: Tab
  /** Étape propre à l'appli PC (onglets Corps et Graphiques). */
  pc?: boolean
}

/** Ce que Kranos dit de chaque onglet : visite guidée et bouton d'aide de l'onglet. */
export const TAB_TIPS: Record<Tab, GuideTip> = {
  today: { mood: 'neutre', text: 'Ici, c’est ton accueil : la séance prévue aujourd’hui, tes routines du jour et ton niveau. Un appui sur « Démarrer » et c’est parti.' },
  programs: { mood: 'neutre', text: 'Dans Programmes, tu crées tes séances puis tu les places dans ta semaine. Tu peux alterner semaine A et semaine B, et tout partager par QR code.' },
  body: { mood: 'neutre', text: 'Le schéma du corps : chaque muscle se colore selon le travail fait pendant tes séances. Touche un muscle pour voir ses exercices.' },
  stats: { mood: 'neutre', text: 'Les graphiques : ta progression semaine après semaine, ton volume par muscle et tes objectifs.' },
  exercises: { mood: 'clin', text: 'Plus de 300 exercices rangés par muscle, chacun avec son animation 3D. Indique ton matériel dans Paramètres et je ne te montre que ce que tu peux faire.' },
  finishers: { mood: 'motive', text: 'Les finishers : un court effort à la fin de la séance. Un seul tour, à fond.' },
  settings: { mood: 'neutre', text: 'Paramètres : ton prénom, l’apparence (les thèmes se débloquent avec ton niveau), les sauvegardes et la liaison avec le PC. C’est là aussi que tu peux me couper.' },
}

export const TOUR: TourStep[] = [
  { tab: 'today', mood: 'salut', text: 'Salut, moi c’est Kranos. Je te montre PETRA en une minute. Plus fort aujourd’hui, plus utile demain !' },
  { tab: 'today', ...TAB_TIPS.today },
  { tab: 'programs', ...TAB_TIPS.programs },
  { tab: 'body', pc: true, ...TAB_TIPS.body },
  { tab: 'stats', pc: true, ...TAB_TIPS.stats },
  { tab: 'exercises', ...TAB_TIPS.exercises },
  { tab: 'finishers', ...TAB_TIPS.finishers },
  { tab: 'settings', ...TAB_TIPS.settings },
  { tab: 'today', mood: 'content', text: 'C’est tout ! Si tu bloques sur un écran, touche mon petit casque en haut : je t’explique.' },
]

/** Bulles des autres écrans, montrées la première fois qu'on les ouvre (après la visite). */
export const SCREEN_TIPS: Record<string, GuideTip> = {
  program: { mood: 'neutre', text: 'Ajoute tes exercices, relie-les en superset si tu veux, puis « Lancer cette séance ». La durée estimée est affichée juste en dessous.' },
  workout: { mood: 'motive', text: 'Fais ta série puis appuie sur « Valider » : le repos démarre tout seul. Les boutons − et + ajustent la charge et les répétitions.' },
  achievements: { mood: 'triomphe', text: 'Tes succès : chaque séance, record ou exploit te rapporte de l’XP. Certains sont secrets… à toi de les trouver.' },
  records: { mood: 'surpris', text: 'Tes meilleures performances, exercice par exercice. Elles se mettent à jour toutes seules à chaque séance.' },
  history: { mood: 'neutre', text: 'Toutes tes séances passées. Touche-en une pour revoir le détail.' },
  routines: { mood: 'neutre', text: 'Les routines : de petites tâches à cocher (étirements, hydratation…), avec un rappel à l’heure si tu veux.' },
  appearance: { mood: 'clin', text: 'Les thèmes se débloquent en montant de niveau. Il en existe aussi des secrets.' },
  progress: { mood: 'neutre', text: 'La progression de ce programme : tes charges et tes répétitions, séance après séance.' },
  'settingsSection:data': { mood: 'alerte', text: 'Tes données restent sur ton appareil. Une sauvegarde est faite après chaque séance : garde-en une copie ailleurs de temps en temps.' },
  'settingsSection:equipment': { mood: 'neutre', text: 'Coche le matériel que tu as : je ne te propose que les exercices que tu peux faire.' },
}

const TABS = Object.keys(TAB_TIPS)

/** Clé de la bulle d'un écran (undefined si Kranos n'a rien à en dire). */
export function tipKey(route: Route): string | undefined {
  const key = route.name === 'settingsSection' ? `settingsSection:${route.section}` : route.name
  return TABS.includes(key) || Object.hasOwn(SCREEN_TIPS, key) ? key : undefined
}

export function tipFor(key: string): GuideTip | undefined {
  if (Object.hasOwn(TAB_TIPS, key)) return (TAB_TIPS as Record<string, GuideTip>)[key]
  return Object.hasOwn(SCREEN_TIPS, key) ? SCREEN_TIPS[key] : undefined
}

export const isTab = (key: string) => TABS.includes(key)

/** Événement envoyé par le casque d'aide des en-têtes. */
export const GUIDE_EVENT = 'petra:guide'
export const askGuide = () => window.dispatchEvent(new Event(GUIDE_EVENT))
