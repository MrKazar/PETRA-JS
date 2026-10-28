import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { getData, normalize, setData, update } from '../data/store'
import type { AppData } from '../data/types'

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
  return normalize(parsed)
}

/** Écrit une copie des données dans Documents/PETRA, puis supprime les plus anciennes. Renvoie le nom du fichier. */
export async function writeBackup(): Promise<string | undefined> {
  const at = new Date()
  const name = backupName(at)
  try {
    await Filesystem.writeFile({
      path: `${BACKUP_DIR}/${name}`,
      data: JSON.stringify({ ...getData(), backupAt: at.getTime() }),
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    })
  } catch {
    return undefined
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
  return name
}

/** Remplace toutes les données par une sauvegarde, en gardant la date de la dernière copie. */
export function restoreBackup(data: AppData) {
  const last = getData().settings.lastBackupAt
  setData({ ...data, settings: { ...data.settings, lastBackupAt: last } })
}
