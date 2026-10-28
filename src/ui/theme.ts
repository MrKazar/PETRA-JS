import type { ThemeId } from '../data/types'

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
}

export const THEMES: Theme[] = [
  {
    id: 'militaire',
    label: 'Militaire',
    description: 'Olive et kaki, carte topographique. Le design d’origine.',
    emblem: 'emblem.webp',
    logo: 'logo.webp',
    swatches: ['#0d0f0e', '#171a17', '#4a543a', '#b7a98a'],
    statusBar: '#0D0F0E',
  },
  {
    id: 'police',
    label: 'Police',
    description: 'Bleu nuit et argent, écusson étoilé, police condensée.',
    emblem: 'emblem-police.webp',
    swatches: ['#0a0e16', '#121926', '#24427e', '#b9c6de'],
    statusBar: '#0A0E16',
  },
  {
    id: 'gendarmerie',
    label: 'Gendarmerie',
    description: 'Bleu profond, argent et rouge, médaillon, titres à empattements.',
    emblem: 'emblem-gendarmerie.webp',
    swatches: ['#0b0f1a', '#141a2a', '#1d3264', '#c8ccd8'],
    statusBar: '#0B0F1A',
  },
  {
    id: 'forces',
    label: 'Forces spéciales',
    description: 'Noir mat et sable, dague ailée, titres au pochoir.',
    emblem: 'emblem-forces.webp',
    swatches: ['#08090a', '#121312', '#6b5f43', '#cbb98c'],
    statusBar: '#08090A',
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
  },
  {
    id: 'pompier',
    label: 'Pompier',
    description: 'Rouge feu et laiton, médaillon aux flammes et haches croisées.',
    emblem: 'emblem-pompier.webp',
    swatches: ['#120d0c', '#1d1412', '#9e1c1c', '#d4a24c'],
    statusBar: '#120D0C',
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
]

export const themeOf = (id: ThemeId | undefined) => THEMES.find((t) => t.id === id) ?? THEMES[0]

/** Nom comparé sans accents, majuscules ni espaces autour : « neodyme » débloque « NéoDyme ». */
const simplify = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

/** Thèmes proposés pour ce nom d'utilisateur (les thèmes cachés seulement avec le bon nom). */
export const themesFor = (name: string | undefined) => THEMES.filter((t) => !t.unlockName || simplify(name ?? '') === simplify(t.unlockName))

/** Thème réellement appliqué : un thème caché dont le nom ne correspond plus revient au thème militaire. */
export function activeTheme(s: { theme?: ThemeId; name?: string }) {
  const t = themeOf(s.theme)
  return themesFor(s.name).includes(t) ? t : THEMES[0]
}

/** Applique le thème au document (variables CSS via data-theme, couleur de la barre d'état). */
export function applyTheme(id: ThemeId | undefined) {
  const t = themeOf(id)
  document.documentElement.dataset.theme = t.id
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.statusBar)
}
