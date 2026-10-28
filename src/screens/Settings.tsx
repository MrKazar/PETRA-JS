import { useRef, useState } from 'react'
import { emptyData, getData, setData, update, useData } from '../data/store'
import { BACKUP_KEEP, parseBackup, restoreBackup, writeBackup } from '../logic/backup'
import { cloudAvailable, pickCloudFile, releaseCloudFile } from '../logic/cloud'
import { downloadDriveBackup, findDriveBackup, googleAvailable, googleEmail, googleError, googleToken, revokeGoogle } from '../logic/gdrive'
import { useNav } from '../nav'
import { saveSettings } from '../logic/actions'
import { personalRecords } from '../logic/session'
import { UpdateBody } from '../ui/UpdateCard'
import { activeTheme } from '../ui/theme'
import { Header, LogoFull, imgUrl, NumInput, SectionTitle, Sheet, Toggle, confirmAction, toast } from '../ui/kit'
import { IconCheckList, IconChevron, IconHistory, IconTrophy } from '../ui/icons'

export function SettingsScreen() {
  const data = useData()
  const nav = useNav()
  const s = data.settings
  const [backup, setBackup] = useState<'export' | 'import' | null>(null)
  const [importText, setImportText] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const exportText = backup === 'export' ? JSON.stringify(getData(), null, 1) : ''
  const totalSec = data.sessions.reduce((n, x) => n + ((x.endedAt ?? x.startedAt) - x.startedAt) / 1000, 0)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportText)
      toast('Sauvegarde copiée')
    } catch {
      toast('Copie impossible : sélectionne le texte à la main')
    }
  }
  const share = async () => {
    try {
      await navigator.share({ title: 'Sauvegarde PETRA', text: exportText })
    } catch {
      /* annulé */
    }
  }
  const restoreFrom = (text: string, what: string) => {
    try {
      const parsed = parseBackup(text)
      const n = parsed.sessions.length
      if (!confirmAction(`Remplacer toutes tes données par cette sauvegarde (${parsed.programs.length} programmes, ${n} séance${n > 1 ? 's' : ''}) ?`)) return
      restoreBackup(parsed)
      setBackup(null)
      setImportText('')
      toast('Sauvegarde restaurée')
    } catch {
      toast(`Ce ${what} n’est pas une sauvegarde PETRA valide`)
    }
  }
  const doImport = () => restoreFrom(importText, 'texte')
  const pickFile = (file?: File) => {
    if (!file) return
    file.text().then((t) => restoreFrom(t, 'fichier'), () => toast('Lecture du fichier impossible'))
  }
  const backupNow = async () => {
    setSaving(true)
    const r = await writeBackup()
    setSaving(false)
    const cfg = getData().settings
    const provider = [cfg.google && 'Google Drive', cfg.cloudBackup?.provider].filter(Boolean).join(' et ') || 'le cloud'
    if (r.cloud === false) toast(`Envoi vers ${provider} impossible : vérifie le réseau, ou reconnecte-toi dans Paramètres`)
    else if (r.cloud) toast(`Sauvegarde enregistrée sur le téléphone et sur ${provider}`)
    else toast(r.local ? 'Sauvegarde enregistrée dans Documents/PETRA' : 'Sauvegarde impossible sur ce téléphone')
  }
  const chooseCloud = async () => {
    const f = await pickCloudFile()
    if (!f) return
    if (s.cloudBackup && s.cloudBackup.uri !== f.uri) void releaseCloudFile(s.cloudBackup.uri)
    saveSettings({ cloudBackup: { uri: f.uri, name: f.name, provider: f.provider } })
    await backupNow()
  }
  const removeCloud = () => {
    if (!s.cloudBackup || !confirmAction(`Arrêter l’envoi vers ${s.cloudBackup.provider} ? Le fichier déjà envoyé reste dans ton cloud.`)) return
    void releaseCloudFile(s.cloudBackup.uri)
    saveSettings({ cloudBackup: undefined })
  }
  const connectGoogle = async () => {
    setBusy(true)
    try {
      const token = await googleToken(true)
      const email = await googleEmail(token).catch(() => undefined)
      saveSettings({ google: { email } })
      // Une sauvegarde existe déjà dans ce Drive et ce téléphone est vide : on propose de la récupérer.
      const existing = getData().sessions.length === 0 ? await findDriveBackup(token).catch(() => undefined) : undefined
      setBusy(false)
      if (existing && confirmAction('Une sauvegarde PETRA existe dans ce Drive. La restaurer sur ce téléphone ?')) return restoreGoogle()
      await backupNow()
    } catch (e) {
      setBusy(false)
      toast(googleError(e))
    }
  }
  const restoreGoogle = async () => {
    setBusy(true)
    try {
      const text = await downloadDriveBackup(await googleToken(true))
      setBusy(false)
      if (!text) return toast('Aucune sauvegarde PETRA dans ce Drive')
      restoreFrom(text, 'fichier')
    } catch (e) {
      setBusy(false)
      toast(googleError(e))
    }
  }
  const disconnectGoogle = async () => {
    if (!confirmAction('Déconnecter le compte Google ? La sauvegarde déjà envoyée reste dans ton Drive.')) return
    const token = await googleToken(false).catch(() => undefined)
    if (token) await revokeGoogle(token)
    saveSettings({ google: undefined })
  }
  const when = (t: number) => new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="screen">
      <div className="screen-inner">
        <Header title="Paramètres" />
        <div className="card">
          <LogoFull />
          <div className="stat-grid" style={{ marginTop: 14 }}>
            <div className="stat"><div className="v">{data.sessions.length}</div><div className="l">Séances</div></div>
            <div className="stat"><div className="v">{Math.round(totalSec / 3600)} h</div><div className="l">Entraînement</div></div>
            <div className="stat"><div className="v">{personalRecords(data.sessions).length}</div><div className="l">Records</div></div>
          </div>
        </div>

        <button className="list-item clickable" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav.push({ name: 'appearance' })}>
          <img src={imgUrl(activeTheme(s).emblem)} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Apparence</div>
            <div className="small muted">Thème {activeTheme(s).label}</div>
          </div>
          <IconChevron style={{ width: 18, color: 'var(--faint)' }} />
        </button>

        <div className="list">
          <div className="list-item clickable" onClick={() => nav.push({ name: 'history' })}>
            <div className="icon-box"><IconHistory /></div>
            <span className="grow" style={{ fontWeight: 600 }}>Historique des séances</span>
            <IconChevron style={{ width: 18, color: 'var(--faint)' }} />
          </div>
          <div className="list-item clickable" onClick={() => nav.push({ name: 'records' })}>
            <div className="icon-box"><IconTrophy /></div>
            <span className="grow" style={{ fontWeight: 600 }}>Records personnels</span>
            <IconChevron style={{ width: 18, color: 'var(--faint)' }} />
          </div>
          <div className="list-item clickable" onClick={() => nav.push({ name: 'routines' })}>
            <div className="icon-box"><IconCheckList /></div>
            <span className="grow" style={{ fontWeight: 600 }}>Routines et tâches</span>
            <IconChevron style={{ width: 18, color: 'var(--faint)' }} />
          </div>
        </div>

        <SectionTitle>Moi</SectionTitle>
        <div className="card stack">
          <label className="field">
            <span>Prénom</span>
            <input className="input" value={s.name} placeholder="Pour l’accueil" onChange={(e) => saveSettings({ name: e.target.value })} />
          </label>
        </div>

        <SectionTitle>Séances</SectionTitle>
        <div className="card stack">
          <div className="row">
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Repos par défaut</div>
              <div className="small muted">Minimum entre deux exercices et pour les exercices perso.</div>
            </div>
            <NumInput value={s.defaultRestSec} onChange={(v) => saveSettings({ defaultRestSec: Math.max(0, Math.round(v ?? 0)) })} />
            <span className="small faint">s</span>
          </div>
          <div className="row">
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Vibrer à la fin du repos</div>
            </div>
            <Toggle on={s.vibrate} onChange={(v) => saveSettings({ vibrate: v })} label="Vibration" />
          </div>
          <div className="row">
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Écran allumé pendant la séance</div>
            </div>
            <Toggle on={s.keepAwake} onChange={(v) => saveSettings({ keepAwake: v })} label="Écran allumé" />
          </div>
        </div>

        <SectionTitle>Données</SectionTitle>
        <div className="card stack">
          <div>
            <div style={{ fontWeight: 600 }}>Sauvegarde automatique</div>
            <div className="small muted">
              Une copie après chaque séance terminée, dans Documents/PETRA sur le téléphone (les {BACKUP_KEEP} dernières sont gardées).
            </div>
            <div className="small" style={{ marginTop: 6, color: s.lastBackupAt ? 'var(--khaki)' : 'var(--faint)' }}>
              {s.lastBackupAt ? `Dernière sauvegarde : ${when(s.lastBackupAt)}` : 'Aucune sauvegarde pour l’instant'}
            </div>
          </div>
          <div className="row">
            <button className="btn grow" disabled={saving} onClick={backupNow}>Sauvegarder maintenant</button>
            <button className="btn grow" onClick={() => fileInput.current?.click()}>Restaurer un fichier</button>
            <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          {googleAvailable() && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <div style={{ fontWeight: 600 }}>Google Drive</div>
              {s.google ? (
                <>
                  <div className="small muted">Connecté{s.google.email ? ` : ${s.google.email}` : ''}. La sauvegarde est envoyée dans ton Drive après chaque séance.</div>
                  <div className="small" style={{ marginTop: 6, color: s.google.failed ? 'var(--error)' : 'var(--khaki)' }}>
                    {s.google.failed ? 'Le dernier envoi a échoué (pas de réseau ou connexion à refaire).' : s.google.lastAt ? `Dernier envoi : ${when(s.google.lastAt)}` : 'Pas encore envoyé'}
                  </div>
                  <div className="row" style={{ marginTop: 8 }}>
                    <button className="btn sm grow" disabled={busy} onClick={restoreGoogle}>Restaurer depuis le Drive</button>
                    <button className="btn sm ghost grow" onClick={disconnectGoogle}>Déconnecter</button>
                  </div>
                  {s.google.failed && <button className="btn sm block" style={{ marginTop: 6 }} disabled={busy} onClick={connectGoogle}>Se reconnecter</button>}
                </>
              ) : (
                <>
                  <div className="small muted">Relie ton compte Google : PETRA enverra la sauvegarde dans ton Drive après chaque séance, et tu pourras tout récupérer sur un nouveau téléphone.</div>
                  <button className="btn primary block" style={{ marginTop: 8 }} disabled={busy} onClick={connectGoogle}>Se connecter avec Google</button>
                </>
              )}
            </div>
          )}
          {cloudAvailable() && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              {s.cloudBackup ? (
                <>
                  <div style={{ fontWeight: 600 }}>Fichier dans le cloud</div>
                  <div className="small muted">{s.cloudBackup.provider} · {s.cloudBackup.name}, remplacé après chaque séance.</div>
                  <div className="small" style={{ marginTop: 6, color: s.cloudBackup.failed ? 'var(--error)' : 'var(--khaki)' }}>
                    {s.cloudBackup.failed ? 'Le dernier envoi a échoué : choisis à nouveau le fichier.' : s.cloudBackup.lastAt ? `Dernier envoi : ${when(s.cloudBackup.lastAt)}` : 'Pas encore envoyé'}
                  </div>
                  <div className="row" style={{ marginTop: 8 }}>
                    <button className="btn sm grow" onClick={chooseCloud}>Changer de fichier</button>
                    <button className="btn sm ghost grow" onClick={removeCloud}>Arrêter</button>
                  </div>
                </>
              ) : (
                <button className="btn ghost sm block" onClick={chooseCloud}>Autre cloud (OneDrive…) : choisir un fichier</button>
              )}
            </div>
          )}
          <div className="row">
            <button className="btn ghost sm grow" onClick={() => setBackup('export')}>Copier en texte</button>
            <button className="btn ghost sm grow" onClick={() => setBackup('import')}>Coller un texte</button>
          </div>
          <div className="row wrap">
            <button className="btn danger sm" onClick={() => confirmAction('Effacer tout l’historique des séances ?') && update((d) => ({ ...d, sessions: [] }))}>Effacer les séances</button>
            <button className="btn danger sm" onClick={() => confirmAction('Effacer les routines et leur suivi ?') && update((d) => ({ ...d, routines: [], routineLog: {} }))}>Effacer les routines</button>
            <button className="btn danger sm" onClick={() => confirmAction('Tout effacer et repartir de zéro ?') && setData(emptyData())}>Tout effacer</button>
          </div>
        </div>

        <SectionTitle>Application</SectionTitle>
        <div className="card">
          <UpdateBody />
        </div>
        <div className="center faint small">Plus fort aujourd’hui, plus utile demain.</div>
      </div>

      <Sheet open={backup === 'export'} onClose={() => setBackup(null)} title="Sauvegarde">
        <div className="stack">
          <p className="small muted" style={{ margin: 0 }}>Copie ce texte et garde-le (notes, mail à toi-même…). Il contient tous tes programmes, séances et routines.</p>
          <textarea className="input" readOnly value={exportText} style={{ minHeight: 160, fontSize: 11, fontFamily: 'monospace' }} onFocus={(e) => e.target.select()} />
          <div className="row">
            <button className="btn primary grow" onClick={copy}>Copier</button>
            {'share' in navigator && <button className="btn grow" onClick={share}>Partager</button>}
          </div>
        </div>
      </Sheet>
      <Sheet open={backup === 'import'} onClose={() => setBackup(null)} title="Restaurer une sauvegarde">
        <div className="stack">
          <textarea className="input" value={importText} placeholder="Colle ici le texte de ta sauvegarde" style={{ minHeight: 160, fontSize: 11, fontFamily: 'monospace' }} onChange={(e) => setImportText(e.target.value)} />
          <button className="btn primary block" disabled={!importText.trim()} onClick={doImport}>Restaurer</button>
        </div>
      </Sheet>
    </div>
  )
}
