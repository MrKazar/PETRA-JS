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
  /** Thème caché débloqué par un code (empreinte `codeHash` du code, jamais le code en clair). */
  unlockCode?: string
  /** Thème caché débloqué par un succès secret de l'appareil (ici les 7 appuis sur l'emblème). */
  unlockTaps?: number
  /** Niveau d'XP à atteindre pour débloquer ce thème (thèmes non secrets, tous ouverts au niveau 50). */
  unlockLevel?: number
  /** Thème secret débloqué par un succès secret (id du succès). */
  unlockSecret?: string
  /** Thème du développeur : débloqué pour de bon par le code du mode test, sur cet appareil et les appareils synchronisés. */
  unlockDev?: boolean
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
    swatches: ['#f3efe6', '#fffdf8', '#8f6e28', '#8a6a22'],
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
    swatches: ['#050d14', '#0b1822', '#0e7f7f', '#ff8a6b'],
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
    swatches: ['#0a0706', '#15100d', '#c93f0d', '#ffb23a'],
    statusBar: '#0A0706',
    unlockLevel: 40,
  },
  {
    id: 'sakura',
    label: 'Sakura',
    description: 'Clair et doux, rose poudré et anthracite.',
    emblem: 'emblem-sakura.webp',
    swatches: ['#fbf3f4', '#ffffff', '#b44f71', '#a8456a'],
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
    unlockCode: '1i4sbhaafkc',
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
  {
    id: 'loup',
    label: 'Loup-garou',
    description: 'Nuit de pleine lune, bleu nuit et argent : le loup hurle sur son rocher.',
    emblem: 'emblem-loup.webp',
    unlockSecret: 'loup_garou',
    swatches: ['#060b1a', '#0e1730', '#3f63b8', '#e8dcae'],
    statusBar: '#060B1A',
  },
  {
    id: 'phalange',
    label: 'Les 300',
    description: 'Noir, bronze et rouge sang : la phalange des Thermopyles.',
    emblem: 'emblem-phalange.webp',
    unlockSecret: 'thermopyles',
    swatches: ['#0d0605', '#1c0f0b', '#9e1b16', '#c79a52'],
    statusBar: '#0D0605',
  },
  {
    id: 'phenix',
    label: 'Phénix',
    description: 'Braise, orange incandescent et or : renaître de ses cendres.',
    emblem: 'emblem-phenix.webp',
    unlockSecret: 'retour_flamme',
    swatches: ['#120604', '#22100a', '#c04916', '#ffc247'],
    statusBar: '#120604',
  },
  {
    id: 'nuit',
    label: 'Garde de nuit',
    description: 'Bleu marine profond et éclats d’étoiles, l’heure où tout le monde dort.',
    emblem: 'emblem-nuit.webp',
    unlockSecret: 'garde_nuit',
    swatches: ['#04061a', '#0b1030', '#3b4fa8', '#cfd8ff'],
    statusBar: '#04061A',
  },
  {
    id: 'miroir',
    label: 'Miroir',
    description: 'Chrome et acier noir, tout en reflets.',
    emblem: 'emblem-miroir.webp',
    unlockSecret: 'heure_miroir',
    swatches: ['#0f1113', '#1b1e22', '#9aa3ab', '#f2f5f7'],
    statusBar: '#0F1113',
  },
  {
    id: 'citrouille',
    label: 'Citrouille',
    description: 'Violet de minuit et orange lanterne.',
    emblem: 'emblem-citrouille.webp',
    unlockSecret: 'citrouilles',
    swatches: ['#120a16', '#21122a', '#ff7a1a', '#b26cff'],
    statusBar: '#120A16',
  },
  {
    id: 'leonidas',
    label: 'Léonidas',
    description: 'Or royal, rouge et laurier : la garde du roi de Sparte.',
    emblem: 'emblem-leonidas.webp',
    unlockCode: '1ij9g4wij9',
    swatches: ['#120a06', '#21140b', '#a3161b', '#e6c27a'],
    statusBar: '#120A06',
  },
  {
    id: 'immortel',
    label: 'Immortel',
    description: 'Marbre blanc et or pur, réservé aux légendes.',
    emblem: 'emblem-immortel.webp',
    unlockSecret: 'legende',
    swatches: ['#f4f1ea', '#ffffff', '#916e18', '#2a2214'],
    statusBar: '#F4F1EA',
  },
  {
    id: 'architecte',
    label: 'Architecte',
    description: 'Le plan de PETRA, réservé à son créateur : bleu de plan, traits blancs, cotes et cachet doré.',
    emblem: 'emblem-architecte.webp',
    unlockDev: true,
    swatches: ['#061a36', '#0b2547', '#2873c1', '#f0be50'],
    statusBar: '#061A36',
  },
]

export const themeOf = (id: ThemeId | undefined) => THEMES.find((t) => t.id === id) ?? THEMES[0]

type Unlock = { feats?: Feats; theme?: ThemeId; level?: number; secrets?: string[]; devThemes?: boolean }

/** Thème secret : lié à un code ou à un succès secret, jamais au niveau. */
export const isSecret = (t: Theme) => !!(t.unlockCode || t.unlockTaps || t.unlockSecret || t.unlockDev)

/** Secret trouvé (bon code saisi ou succès secret obtenu). */
const secretOpen = (t: Theme, s: Unlock) =>
  !!s.devThemes ||
  (!(t.unlockCode || t.unlockDev) || !!s.feats?.codes?.includes(t.id)) && (!t.unlockTaps || (s.feats?.logoTaps ?? 0) >= t.unlockTaps) &&
  (!t.unlockSecret || !!s.secrets?.includes(t.unlockSecret))

/** Palier atteint. Le thème déjà choisi avant l'arrivée des paliers reste utilisable tant qu'on le garde. */
const levelOpen = (t: Theme, s: Unlock) => !!s.devThemes || !t.unlockLevel || (s.level ?? 1) >= t.unlockLevel || s.theme === t.id

/** Thème ouvert pour ces réglages et ce niveau. */
export const unlocked = (t: Theme, s: Unlock) => secretOpen(t, s) && levelOpen(t, s)

/** Thèmes proposés (les thèmes cachés seulement une fois débloqués). */
export const themesFor = (s: Unlock) => THEMES.filter((t) => unlocked(t, s))

/** Thèmes visibles dans Apparence : tous les thèmes non secrets (verrouillés ou non) et les secrets trouvés. */
export const themesShown = (s: Unlock) => THEMES.filter((t) => secretOpen(t, s))

/** Ouvert sans le mode test : seul un thème vraiment débloqué compte pour les succès (« thèmes essayés »). */
export const unlockedForReal = (t: Theme, s: Unlock) => unlocked(t, { ...s, devThemes: false })

/** Thème caché ouvert par ce code, s'il y en a un. */
export const themeForCode = (code: string) => {
  const h = codeHash(code)
  return THEMES.find((t) => t.unlockCode === h)
}

/**
 * Mode test des apparences : appui long sur la ligne « Niveau » d'Apparence, puis ce code
 * (le même champ accepte les codes des thèmes cachés).
 * Seule l'empreinte du code est dans l'appli (le code lui-même n'apparaît nulle part).
 */
export const DEV_CODE_HASH = '25777hga5ht'
/** Empreinte courte (cyrb53) : de quoi ne pas laisser le code en clair, pas une protection forte. */
export function codeHash(code: string): string {
  const str = code.trim().toUpperCase()
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

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
  // Relu par index.html avant même le chargement de l'appli (pas d'image avec l'ancien design).
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify([t.id]))
  } catch {
    /* stockage refusé */
  }
}
export const THEME_KEY = 'petra.theme'
