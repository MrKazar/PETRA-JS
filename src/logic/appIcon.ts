import { Capacitor, registerPlugin } from '@capacitor/core'
import type { ThemeId } from '../data/types'

interface AppIconPlugin {
  set(options: { name: string }): Promise<{ changed: boolean }>
}

const AppIcon = registerPlugin<AppIconPlugin>('AppIcon')

/** Nom de l'activity-alias Android de chaque thème (voir AndroidManifest.xml). */
export const ICON_ALIAS: Record<ThemeId, string> = {
  spartiate: 'Militaire', // même icône que l'ancien thème militaire (le logo ne change pas)
  minimal: 'Minimal',
  vantablack: 'Vantablack',
  pompier: 'Pompier',
  neon: 'Neon',
}

/** Met l'icône du téléphone au thème choisi (Android seulement). */
export async function syncAppIcon(theme: ThemeId): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') return false
  try {
    return (await AppIcon.set({ name: ICON_ALIAS[theme] ?? 'Militaire' })).changed
  } catch {
    return false // ancienne version native sans le plugin
  }
}
