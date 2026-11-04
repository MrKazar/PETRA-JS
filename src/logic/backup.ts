import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { getData, normalize, setData, update } from '../data/store'
import type { AppData } from '../data/types'
import { desktop } from './desktop'

/** Dossier des sauvegardes : Documents/PETRA sur le téléphone (il reste après une désinstallation). */
export const BACKUP_DIR = 'PETRA'
/** Nombre de copies gardées ; les plus anciennes sont supprimées. */
export const BACKUP_KEEP = 10

const pad = (n: number) => String(n).padStart(2, '0')

/** Nom horodaté (petra-2026-10-28-2041.json) : chaque copie est un nouveau fichier. */
export function backupName(at = new Date()): string {
  return `petra-${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}.json`
}

/** Fichiers à supprimer pour ne garder que les `keep` plus récents (les noms se trient par date). */
export function backupsToPrune(names: string[], keep = BACKUP_KEEP): string[] {
  const ours = names.filter((n) => /^petra-\d{4}-\d{2}-\d{2}-\d{4,6}\.json$/.test(n)).sort()
  return ours.slice(0, Math.max(0, ours.length - keep))
}

/** Lit une sauvegarde (fichier ou texte) ; lève une erreur si ce n'est pas une sauvegarde PETRA. */
export function parseBackup(text: string): AppData {
  const parsed = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.programs)) throw new Error('format')
  for (const k of ['sessions', 'routines'] as const) if (k in parsed && !Array.isArray(parsed[k])) throw new Error('format')
  for (const k of ['settings', 'routineLog', 'weekPlan', 'weekPlanB', 'planOverrides'] as const)
    if (k in parsed && (typeof parsed[k] !== 'object' || parsed[k] === null || Array.isArray(parsed[k]))) throw new Error('format')
  if (!parsed.programs.every((p: unknown) => !!p && typeof p === 'object' && Array.isArray((p as { exercises?: unknown }).exercises))) throw new Error('format')
  return normalize(parsed)
}

/** Sauvegardes du plus récent au plus ancien (les noms se trient par date). */
export function newestFirst(names: string[]): string[] {
  return names.filter((n) => /^petra-\d{4}-\d{2}-\d{2}-\d{4,6}\.json$/.test(n)).sort().reverse()
}

/**
 * La sauvegarde automatique la plus récente qui se lit correctement : Documents/PETRA sur le
 * téléphone, Documents/PCTRA sur le PC. `undefined` s'il n'y en a aucune.
 */
export async function latestBackup(): Promise<{ data: AppData; at?: number } | undefined> {
  const texts: string[] = []
  if (desktop) {
    if (desktop.backups) texts.push(...(await desktop.backups().catch(() => [] as string[])))
  } else {
    try {
      const { files } = await Filesystem.readdir({ path: BACKUP_DIR, directory: Directory.Documents })
      for (const name of newestFirst(files.map((f) => f.name))) {
        try {
          const { data } = await Filesystem.readFile({ path: `${BACKUP_DIR}/${name}`, directory: Directory.Documents, encoding: Encoding.UTF8 })
          texts.push(String(data))
          break
        } catch {
          /* fichier illisible : on essaie le suivant */
        }
      }
    } catch {
      return undefined
    }
  }
  for (const text of texts) {
    try {
      const raw = JSON.parse(text) as { backupAt?: unknown }
      return { data: parseBackup(text), at: typeof raw.backupAt === 'number' ? raw.backupAt : undefined }
    } catch {
      /* copie abîmée : la suivante */
    }
  }
  return undefined
}

/**
 * Sauvegarde : une copie dans Documents/PETRA (les plus anciennes sont supprimées). Renvoie ce qui a réussi.
 */
export async function writeBackup(): Promise<{ local: boolean }> {
  const at = new Date()
  const json = JSON.stringify({ ...getData(), backupAt: at.getTime() })
  return { local: await writeLocal(at, json) }
}

async function writeLocal(at: Date, json: string): Promise<boolean> {
  const name = backupName(at)
  try {
    await Filesystem.writeFile({
      path: `${BACKUP_DIR}/${name}`,
      data: json,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    })
  } catch {
    return false
  }
  update((d) => ({ ...d, settings: { ...d.settings, lastBackupAt: at.getTime() } }))
  try {
    const { files } = await Filesystem.readdir({ path: BACKUP_DIR, directory: Directory.Documents })
    for (const old of backupsToPrune(files.map((f) => f.name))) {
      // Un fichier laissé par une installation précédente peut être protégé : on le laisse.
      await Filesystem.deleteFile({ path: `${BACKUP_DIR}/${old}`, directory: Directory.Documents }).catch(() => {})
    }
  } catch {
    /* lecture du dossier impossible : la copie est quand même faite */
  }
  return true
}

/** Remplace toutes les données par une sauvegarde, en gardant l'état des sauvegardes de ce téléphone. */
export function restoreBackup(data: AppData) {
  const { lastBackupAt, pc } = getData().settings
  setData({ ...data, settings: { ...data.settings, lastBackupAt, pc } })
}
