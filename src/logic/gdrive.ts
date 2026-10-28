import { Capacitor, registerPlugin } from '@capacitor/core'

interface GoogleDrivePlugin {
  authorize(options: { interactive: boolean }): Promise<{ token: string }>
}

const GoogleDrive = registerPlugin<GoogleDrivePlugin>('GoogleDrive')

/** Nom du fichier de sauvegarde dans le Drive (PETRA ne voit que les fichiers qu'elle a créés). */
export const DRIVE_FILE_NAME = 'petra-sauvegarde.json'
const API = 'https://www.googleapis.com'

export const googleAvailable = () => Capacitor.getPlatform() === 'android'

/** Jeton d'accès au Drive ; interactive=false ne montre rien et échoue si une connexion est nécessaire. */
export async function googleToken(interactive: boolean): Promise<string> {
  return (await GoogleDrive.authorize({ interactive })).token
}

/** Message lisible pour une erreur de connexion Google. */
export function googleError(e: unknown): string {
  const code = (e as { code?: string })?.code
  if (code === 'CANCELLED') return 'Connexion annulée'
  if (code === '10' || code === '16' || code === '17')
    return 'Google refuse la connexion : PETRA n’est pas encore déclarée dans Google Cloud (ou l’empreinte SHA-1 ne correspond pas).'
  if (code === '7') return 'Pas de connexion internet'
  return (e as Error)?.message || 'Connexion Google impossible'
}

async function drive(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } })
  if (!res.ok) throw new Error(`Drive ${res.status}`)
  return res
}

/** Adresse du compte connecté. */
export async function googleEmail(token: string): Promise<string | undefined> {
  const r = await drive(token, '/drive/v3/about?fields=user(emailAddress)')
  return ((await r.json()) as { user?: { emailAddress?: string } }).user?.emailAddress
}

/** Fichier de sauvegarde déjà créé par PETRA dans ce Drive (le plus récent). */
export async function findDriveBackup(token: string): Promise<{ id: string; modifiedTime: string } | undefined> {
  const q = encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and trashed = false`)
  const r = await drive(token, `/drive/v3/files?q=${q}&orderBy=modifiedTime desc&pageSize=1&fields=files(id,modifiedTime)`)
  return ((await r.json()) as { files: { id: string; modifiedTime: string }[] }).files[0]
}

/** Envoie la sauvegarde : remplace le fichier existant ou le crée. Renvoie son identifiant. */
export async function uploadDriveBackup(token: string, json: string, fileId?: string): Promise<string> {
  const id = fileId ?? (await findDriveBackup(token))?.id
  if (id) {
    try {
      await drive(token, `/upload/drive/v3/files/${id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: json })
      return id
    } catch {
      /* fichier supprimé entre-temps : on en crée un nouveau */
    }
  }
  const boundary = 'petra' + Date.now()
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify({ name: DRIVE_FILE_NAME, mimeType: 'application/json' }),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    json,
    `--${boundary}--`,
  ].join('\r\n')
  const r = await drive(token, '/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body })
  return ((await r.json()) as { id: string }).id
}

/** Contenu de la sauvegarde du Drive, ou undefined s'il n'y en a pas. */
export async function downloadDriveBackup(token: string): Promise<string | undefined> {
  const f = await findDriveBackup(token)
  if (!f) return undefined
  return (await drive(token, `/drive/v3/files/${f.id}?alt=media`)).text()
}

/** Retire l'accès de PETRA au compte (le fichier reste dans le Drive). */
export async function revokeGoogle(token: string) {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => {})
}
