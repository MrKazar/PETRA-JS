import type { Feats, ThemeId } from '../data/types'

export interface Theme {
  id: ThemeId
  label: string
  description: string
  /** Fichier de l'emblème dans public/img. */
  emblem: string
  /** Logo complet en image ; sinon il est composé (emblème + PETRA dans la police du thème). */
  logo?: string
  /** Fond, carte, action, accent : pour l'aperçu. */
  swatches: [string, string, string, string]
  statusBar: string
  /** Thème caché : n'apparaît et ne s'applique qu'avec ce nom d'utilisateur. */
  unlockName?: string
  /** Thème caché débloqué par un succès secret de l'appareil (ici les 7 appuis sur l'emblème). */
  unlockTaps?: number
  /** Niveau d'XP à atteindre pour débloquer ce thème (thèmes non secrets, tous ouverts au niveau 50). */
  unlockLevel?: number
}

export const THEMES: Theme[] = [
  {
    id: 'spartiate',
    label: 'Spartiate',
    description: 'Bronze, rouge sombre et noir profond, titres en capitales antiques.',
    emblem: 'emblem.webp',
    logo: 'logo.webp',
    swatches: ['#0e0b09', '#1a1411', '#8e2a1e', '#c99a5b'],
    statusBar: '#0E0B09',
  },
  {
    id: 'olympe',
    label: 'Olympe',
    description: 'Marbre clair et or, capitales antiques.',
    emblem: 'emblem-olympe.webp',
    swatches: ['#f3efe6', '#fffdf8', '#a8822f', '#8a6a22'],
    statusBar: '#F3EFE6',
    unlockLevel: 5,
  },
  {
    id: 'arene',
    label: 'Arène',
    description: 'Sable chaud et rouille, l’énergie du combat.',
    emblem: 'emblem-arene.webp',
    swatches: ['#17110b', '#241a12', '#b3541e', '#e2c290'],
    statusBar: '#17110B',
    unlockLevel: 8,
  },
  {
    id: 'acier',
    label: 'Acier',
    description: 'Gris acier et bleu glacier, look sportif moderne.',
    emblem: 'emblem-acier.webp',
    swatches: ['#0b0e12', '#151a21', '#2f6f9f', '#9fd4ff'],
    statusBar: '#0B0E12',
    unlockLevel: 3,
  },
  {
    id: 'jade',
    label: 'Jade',
    description: 'Noir volcanique et émeraude, sobre et premium.',
    emblem: 'emblem-jade.webp',
    swatches: ['#070a09', '#0f1513', '#1f7a55', '#5fe0a6'],
    statusBar: '#070A09',
    unlockLevel: 12,
  },
  {
    id: 'crepuscule',
    label: 'Crépuscule',
    description: 'Bordeaux profond et pêche, ambiance coucher de soleil.',
    emblem: 'emblem-crepuscule.webp',
    swatches: ['#140a10', '#21121a', '#a3324f', '#f2a97f'],
    statusBar: '#140A10',
    unlockLevel: 35,
  },
  {
    id: 'abysse',
    label: 'Abysse',
    description: 'Bleu des profondeurs, turquoise et corail.',
    emblem: 'emblem-abysse.webp',
    swatches: ['#050d14', '#0b1822', '#0f8a8a', '#ff8a6b'],
    statusBar: '#050D14',
    unlockLevel: 25,
  },
  {
    id: 'givre',
    label: 'Givre',
    description: 'Clair et glacé, blanc bleuté et bleu nuit.',
    emblem: 'emblem-givre.webp',
    swatches: ['#eef4f8', '#ffffff', '#1f4f80', '#2b6cb0'],
    statusBar: '#EEF4F8',
    unlockLevel: 20,
  },
  {
    id: 'lave',
    label: 'Lave',
    description: 'Noir charbon et orange incandescent.',
    emblem: 'emblem-lave.webp',
    swatches: ['#0a0706', '#15100d', '#e2470f', '#ffb23a'],
    statusBar: '#0A0706',
    unlockLevel: 40,
  },
  {
    id: 'sakura',
    label: 'Sakura',
    description: 'Clair et doux, rose poudré et anthracite.',
    emblem: 'emblem-sakura.webp',
    swatches: ['#fbf3f4', '#ffffff', '#c2557a', '#a8456a'],
    statusBar: '#FBF3F4',
    unlockLevel: 30,
  },
  {
    id: 'carbone',
    label: 'Carbone',
    description: 'Anthracite et jaune vif, esprit salle de sport.',
    emblem: 'emblem-carbone.webp',
    swatches: ['#0c0c0c', '#171717', '#ffd600', '#ffd600'],
    statusBar: '#0C0C0C',
    unlockLevel: 16,
  },
  {
    id: 'minimal',
    label: 'Minimaliste',
    description: 'Noir et blanc sur fond clair, sans décor, logo à plat.',
    emblem: 'emblem-minimal.webp',
    swatches: ['#ffffff', '#f5f5f4', '#121212', '#8b8b88'],
    statusBar: '#FFFFFF',
  },
  {
    id: 'vantablack',
    label: 'Vantablack',
    description: 'Noir absolu, contrastes discrets, logo en silhouette éclairée par la tranche.',
    emblem: 'emblem-vantablack.webp',
    swatches: ['#000000', '#050505', '#161616', '#d9d9d9'],
    statusBar: '#000000',
    unlockLevel: 50,
  },
  {
    id: 'pompier',
    label: 'Royal',
    description: 'Rouge royal et or, médaillon rouge.',
    emblem: 'emblem-pompier.webp',
    swatches: ['#120d0c', '#1d1412', '#9e1c1c', '#d4a24c'],
    statusBar: '#120D0C',
    unlockLevel: 45,
  },
  {
    id: 'neon',
    label: 'Néon',
    description: 'Violet et magenta lumineux sur nuit, logo et titres en pixel art.',
    emblem: 'emblem-neon.webp',
    unlockName: 'NéoDyme',
    swatches: ['#0a0414', '#140a24', '#8a2be2', '#ff46dc'],
    statusBar: '#0A0414',
  },
  {
    id: 'lambda',
    label: 'Lambda',
    description: 'Le bouclier des Spartiates : rouge sang, or et noir, frise grecque.',
    emblem: 'emblem-lambda.webp',
    unlockTaps: 7,
    swatches: ['#0e0708', '#1b0d0e', '#b3141c', '#e8bd62'],
    statusBar: '#0E0708',
  },
]

export const themeOf = (id: ThemeId | undefined) => THEMES.find((t) => t.id === id) ?? THEMES[0]

/** Nom comparé sans accents, majuscules ni espaces autour : « neodyme » débloque « NéoDyme ». */
const simplify = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

type Unlock = { name?: string; feats?: Feats; theme?: ThemeId; level?: number }

/** Thème secret : lié à un nom d'utilisateur ou à un succès secret, jamais au niveau. */
export const isSecret = (t: Theme) => !!(t.unlockName || t.unlockTaps)

/** Secret trouvé (bon nom d'utilisateur ou succès secret obtenu). */
const secretOpen = (t: Theme, s: Unlock) =>
  (!t.unlockName || simplify(s.name ?? '') === simplify(t.unlockName)) && (!t.unlockTaps || (s.feats?.logoTaps ?? 0) >= t.unlockTaps)

/** Palier atteint. Le thème déjà choisi avant l'arrivée des paliers reste utilisable tant qu'on le garde. */
const levelOpen = (t: Theme, s: Unlock) => !t.unlockLevel || (s.level ?? 1) >= t.unlockLevel || s.theme === t.id

/** Thème ouvert pour ces réglages et ce niveau. */
export const unlocked = (t: Theme, s: Unlock) => secretOpen(t, s) && levelOpen(t, s)

/** Thèmes proposés (les thèmes cachés seulement une fois débloqués). Accepte aussi un simple nom. */
export const themesFor = (s: Unlock | string | undefined) => {
  const u = typeof s === 'object' ? s : { name: s }
  return THEMES.filter((t) => unlocked(t, u))
}

/** Thèmes visibles dans Apparence : tous les thèmes non secrets (verrouillés ou non) et les secrets trouvés. */
export const themesShown = (s: Unlock) => THEMES.filter((t) => secretOpen(t, s))

/** Thèmes débloqués en passant du niveau `from` au niveau `to`. */
export const themesUnlockedBetween = (from: number, to: number) =>
  THEMES.filter((t) => t.unlockLevel && t.unlockLevel > from && t.unlockLevel <= to)

/** Prochain thème à débloquer par le niveau. */
export const nextLevelTheme = (level: number) =>
  THEMES.filter((t) => t.unlockLevel && t.unlockLevel > level).sort((a, b) => a.unlockLevel! - b.unlockLevel!)[0]

/** Thème réellement appliqué : un thème caché dont le nom ne correspond plus (ou un thème retiré) revient au thème spartiate. */
export function activeTheme(s: Unlock) {
  const t = themeOf(s.theme)
  return themesFor(s).includes(t) ? t : THEMES[0]
}

/** Applique le thème au document (variables CSS via data-theme, couleur de la barre d'état). */
export function applyTheme(id: ThemeId | undefined) {
  const t = themeOf(id)
  document.documentElement.dataset.theme = t.id
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.statusBar)
}
