import { useEffect, useState } from 'react'
import { dismissStorageIssue, useStorageIssue } from '../data/store'
import type { AppData } from '../data/types'
import { latestBackup, restoreBackup, writeBackup } from '../logic/backup'
import { isDesktop } from '../logic/desktop'
import { useNav } from '../nav'
import { Sheet, toast } from './kit'

const when = (t: number) => new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

/**
 * Prévient quand le stockage pose problème : données illisibles au démarrage (on propose la
 * dernière sauvegarde) ou enregistrement impossible (mémoire pleine).
 */
export function StorageAlert() {
  const issue = useStorageIssue()
  if (issue?.kind === 'read') return <UnreadableData />
  if (issue?.kind === 'write') return <WriteFailed />
  return null
}

function UnreadableData() {
  const nav = useNav()
  const [found, setFound] = useState<{ data: AppData; at?: number } | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    latestBackup().then(
      (b) => live && setFound(b ?? null),
      () => live && setFound(null),
    )
    return () => {
      live = false
    }
  }, [])
  const restore = () => {
    if (!found) return
    restoreBackup(found.data)
    dismissStorageIssue()
    toast('Sauvegarde restaurée')
  }
  const pickFile = () => {
    dismissStorageIssue()
    nav.push({ name: 'settingsSection', section: 'data' })
  }
  return (
    <Sheet open onClose={() => {}} title="Données illisibles">
      <p className="muted" style={{ marginTop: 0 }}>
        Tes données n’ont pas pu être lues au démarrage. Elles sont mises de côté, rien n’a été effacé.
      </p>
      {found === undefined && <p className="small faint">Recherche d’une sauvegarde…</p>}
      {found === null && <p className="small faint">Aucune sauvegarde automatique trouvée{isDesktop ? ' dans Documents/PCTRA' : ' dans Documents/PETRA'}.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {found && (
          <button className="btn primary" onClick={restore}>
            Restaurer la sauvegarde{found.at ? ` du ${when(found.at)}` : ''}
          </button>
        )}
        <button className="btn ghost" onClick={pickFile}>{found ? 'Choisir une autre sauvegarde' : 'Choisir un fichier de sauvegarde'}</button>
        <button className="btn ghost sm" onClick={dismissStorageIssue}>Continuer sans restaurer</button>
      </div>
    </Sheet>
  )
}

function WriteFailed() {
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    const r = await writeBackup().catch(() => ({ local: false }))
    setSaving(false)
    toast(r.local ? 'Copie enregistrée dans Documents/PETRA' : 'Copie impossible')
  }
  return (
    <div className="storage-banner" role="alert">
      <span className="grow">Enregistrement impossible : la mémoire est peut-être pleine. Tes derniers changements risquent d’être perdus.</span>
      {!isDesktop && (
        <button className="btn sm primary" disabled={saving} onClick={save}>
          Copier dans un fichier
        </button>
      )}
    </div>
  )
}
