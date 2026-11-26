import { Capacitor, registerPlugin } from '@capacitor/core'
import type { ThemeId } from '../data/types'

interface AppIconPlugin {
  set(options: { name: string; bg?: string }): Promise<{ changed: boolean }>
}

const AppIcon = registerPlugin<AppIconPlugin>('AppIcon')

/** Nom de l'activity-alias Android de chaque thème (voir AndroidManifest.xml). */
export const ICON_ALIAS: Record<ThemeId, string> = {
  spartiate: 'Militaire', // même icône que l'ancien thème militaire (le logo ne change pas)
  olympe: 'Olympe',
  arene: 'Arene',
  acier: 'Acier',
  jade: 'Jade',
  crepuscule: 'Crepuscule',
  abysse: 'Abysse',
  givre: 'Givre',
  lave: 'Lave',
  sakura: 'Sakura',
  carbone: 'Carbone',
  minimal: 'Minimal',
  vantablack: 'Vantablack',
  pompier: 'Pompier',
  neon: 'Neon',
  lambda: 'Lambda',
  loup: 'Loup',
  phalange: 'Phalange',
  phenix: 'Phenix',
  nuit: 'Nuit',
  miroir: 'Miroir',
  citrouille: 'Citrouille',
  leonidas: 'Leonidas',
  immortel: 'Immortel',
  architecte: 'Architecte',
}

/** Met l'icône du téléphone au thème choisi (Android seulement). */
export async function syncAppIcon(theme: ThemeId, bg?: string): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') return false
  try {
    return (await AppIcon.set({ name: ICON_ALIAS[theme] ?? 'Militaire', bg })).changed
  } catch {
    return false // ancienne version native sans le plugin
  }
}
