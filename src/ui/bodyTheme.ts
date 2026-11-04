import type { CSSProperties } from 'react'

/**
 * Couleurs du schéma du corps, toutes au même endroit. Le composant et la feuille de style lisent
 * ces valeurs (variables CSS --bm-*), donc changer le fond ou une couleur se fait ici seulement.
 */
export const BODY_THEME = {
  /** Fond de la planche (dégradé du centre vers le bord). */
  bg: '#1d1030',
  bgEdge: '#0e0718',
  border: '#3d2566',
  /** Texte de la légende et des titres Face / Dos. */
  ink: '#a58bd6',
  inkFaint: '#7d68a6',
  /** Tissu musculaire de fond (muscle non travaillé). */
  tissue: '#3a235f',
  /** Peau et tendons : tête, mains, pieds, genoux. */
  skin: '#24143a',
  /** Liseré clair autour de la silhouette, qui la détache du fond. */
  rim: '#5b3d8f',
  /** Contours et repères osseux. */
  edge: '#0b0614',
  /** Contour du muscle sélectionné. */
  selected: '#ffffff',
  /** Reflet léger en haut à gauche de chaque muscle (0 = aucun). */
  shine: 0.2,
  /** Ombre sur les bords de chaque muscle, qui lui donne du volume (0 = aucune). */
  shade: 0.42,
  /** Couleur par niveau : 0 pas travaillé, 1 négligé, 2 un peu, 3 bien, 4 beaucoup. */
  levels: ['#3a235f', '#f2bd4b', '#a5cf6a', '#5c9b39', '#2f7194'],
} as const

/** Variables CSS du thème, à poser sur l'écran qui affiche le schéma et sa légende. */
export function bodyThemeVars(t: typeof BODY_THEME = BODY_THEME): CSSProperties {
  const v: Record<string, string> = {
    '--bm-bg': t.bg,
    '--bm-bg-edge': t.bgEdge,
    '--bm-border': t.border,
    '--bm-ink': t.ink,
    '--bm-ink-faint': t.inkFaint,
    '--bm-tissue': t.tissue,
    '--bm-skin': t.skin,
    '--bm-edge': t.edge,
    '--bm-rim': t.rim,
    '--bm-selected': t.selected,
  }
  t.levels.forEach((c, i) => (v[`--bm-lv${i}`] = c))
  return v as CSSProperties
}
