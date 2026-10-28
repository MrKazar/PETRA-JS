import { Capacitor, registerPlugin } from '@capacitor/core'

export interface CloudFile {
  uri: string
  name: string
  /** Google Drive, OneDrive, Dropbox… (déduit du stockage choisi). */
  provider: string
}

interface CloudBackupPlugin {
  pick(options: { name: string }): Promise<CloudFile>
  write(options: { uri: string; data: string }): Promise<void>
  release(options: { uri: string }): Promise<void>
}

const CloudBackup = registerPlugin<CloudBackupPlugin>('CloudBackup')

export const cloudAvailable = () => Capacitor.getPlatform() === 'android'

/** Ouvre le sélecteur Android pour créer le fichier de sauvegarde (dans Drive, OneDrive…). Undefined si annulé. */
export async function pickCloudFile(): Promise<CloudFile | undefined> {
  try {
    return await CloudBackup.pick({ name: 'petra-sauvegarde.json' })
  } catch {
    return undefined
  }
}

export const writeCloudFile = (uri: string, data: string) => CloudBackup.write({ uri, data })

export const releaseCloudFile = (uri: string) => CloudBackup.release({ uri }).catch(() => {})
