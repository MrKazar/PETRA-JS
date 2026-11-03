import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { emptyData, getData, setData, update, useData } from '../data/store'
import { BACKUP_KEEP, parseBackup, restoreBackup, writeBackup } from '../logic/backup'
import { useNav } from '../nav'
import type { Settings } from '../data/types'
import { saveSettings } from '../logic/actions'
import { personalRecords } from '../logic/session'
import { UpdateBody } from '../ui/UpdateCard'
import { ScanSheet } from '../ui/Share'
import { activeTheme } from '../ui/theme'
import { Header, LogoFull, TopBar, imgUrl, NumInput, SectionTitle, Sheet, Toggle, confirmAction, toast } from '../ui/kit'
import { IconBell, IconBook, IconQr, IconCheckList, IconChevron, IconClock, IconHistory, IconTrophy, IconUser, IconMonitor } from '../ui/icons'
import { syncNow, unpair } from '../logic/pcsync'
import { encodePairing } from '../logic/sync'
import { desktop, isDesktop, lastPhoneSync, onPhoneSync, type PairingState } from '../logic/desktop'

const when = (t: number) => new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function SettingsScreen() {
  const data = useData()
  const nav = useNav()
  const [scanning, setScanning] = useState(false)
  const s = data.settings
  const totalSec = data.sessions.reduce((n, x) => n + ((x.endedAt ?? x.startedAt) - x.startedAt) / 1000, 0)
  const row = (label: string, sub: string, icon: React.ReactNode, onClick: () => void) => (
    <div className="list-item clickable" onClick={onClick}>
      <div className="icon-box">{icon}</div>
      <div className="grow">
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div className="small muted">{sub}</div>
      </div>
      <IconChevron style={{ width: 18, color: 'var(--faint)' }} />
    </div>
  )

  return (
    <div className="screen">
      <div className="screen-inner">
        <Header title="Paramètres" />
        {scanning && <ScanSheet onClose={() => setScanning(false)} />}
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
          {row('Utilisateur', s.name ? s.name : 'Prénom pour l’accueil', <IconUser />, () => nav.push({ name: 'settingsSection', section: 'user' }))}
          {row('Séances', `Repos ${s.defaultRestSec} s${s.vibrate ? ' · vibration' : ''}${s.keepAwake ? ' · écran allumé' : ''}`, <IconClock />, () => nav.push({ name: 'settingsSection', section: 'sessions' }))}
          {row('Notifications', notifSummary(s), <IconBell />, () => nav.push({ name: 'settingsSection', section: 'notifications' }))}
          {row(isDesktop ? 'Téléphone' : 'Appli PC', pcSummary(s), <IconMonitor />, () => nav.push({ name: 'settingsSection', section: 'pc' }))}
          {row('Scanner un QR code', 'Importer une séance, une semaine ou un finisher', <IconQr />, () => setScanning(true))}
          {row('Données', s.lastBackupAt ? `Dernière sauvegarde : ${when(s.lastBackupAt)}` : 'Sauvegarde et restauration', <IconBook />, () => nav.push({ name: 'settingsSection', section: 'data' }))}
        </div>

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

        <SectionTitle>Application</SectionTitle>
        <div className="card">
          {isDesktop ? <DesktopVersion /> : <UpdateBody />}
        </div>
        <div className="center faint small">Plus fort aujourd’hui, plus utile demain.</div>
      </div>

    </div>
  )
}

export type SettingsSection = 'user' | 'sessions' | 'notifications' | 'data' | 'pc'

const TITLES: Record<SettingsSection, string> = { user: 'Utilisateur', sessions: 'Séances', notifications: 'Notifications', data: 'Données', pc: isDesktop ? 'Téléphone' : 'Appli PC' }

/** Sous-pages de Paramètres. */
export function SettingsSectionScreen({ section }: { section: SettingsSection }) {
  const data = useData()
  const nav = useNav()
  const s = data.settings
  return (
    <div className="screen">
      <div className="screen-inner">
        <TopBar title={TITLES[section]} onBack={nav.pop} />
        {section === 'user' && (
        <div className="card stack">
          <label className="field">
            <span>Prénom</span>
            <input className="input" value={s.name} placeholder="Pour l’accueil" onChange={(e) => saveSettings({ name: e.target.value })} />
          </label>
        </div>
        )}
        {section === 'sessions' && (
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
              <div style={{ fontWeight: 600 }}>Bips du minuteur d’intervalles</div>
              <div className="small muted">Décompte 3-2-1 et bip à chaque changement</div>
            </div>
            <Toggle on={s.timerSound} onChange={(v) => saveSettings({ timerSound: v })} label="Bips" />
          </div>
          <div className="row">
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Écran allumé pendant la séance</div>
            </div>
            <Toggle on={s.keepAwake} onChange={(v) => saveSettings({ keepAwake: v })} label="Écran allumé" />
          </div>
        </div>
        )}
        {section === 'notifications' && <NotificationsSection />}
        {section === 'data' && <DataSection />}
        {section === 'pc' && (isDesktop ? <PhoneLinkSection /> : <PcLinkSection />)}
      </div>
    </div>
  )
}

function pcSummary(s: Settings): string {
  if (isDesktop) {
    const at = lastPhoneSync()
    return at ? `Dernière synchro : ${when(at)}` : 'Associer PETRA sur le téléphone'
  }
  if (!s.pc) return 'Synchroniser avec PCTRA sur ton PC'
  return s.pc.lastAt ? `${s.pc.name} · ${when(s.pc.lastAt)}` : s.pc.name
}

function DesktopVersion() {
  return (
    <div className="row">
      <div className="grow">
        <div style={{ fontWeight: 600 }}>PCTRA {desktop?.version}</div>
        <div className="small muted">Appli PC de PETRA {__APP_VERSION__}</div>
      </div>
      <button className="btn sm" onClick={() => window.open('https://github.com/MrKazar/PETRA-JS/releases/latest', '_blank')}>Dernière version</button>
    </div>
  )
}

/** Téléphone : association avec PCTRA (QR code) et synchro. */
function PcLinkSection() {
  const pc = useData().settings.pc
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)
  const sync = async () => {
    setBusy(true)
    const r = await syncNow()
    setBusy(false)
    toast(r.ok ? 'Synchronisé avec le PC' : r.error)
  }
  return (
    <>
      {scanning && <ScanSheet onClose={() => setScanning(false)} />}
      <div className="card stack">
        <div className="small muted">
          PCTRA est l’appli PETRA pour Windows. Le téléphone et le PC échangent leurs données directement par le Wi-Fi de la maison, sans cloud ni compte.
        </div>
        {pc ? (
          <>
            <div>
              <div style={{ fontWeight: 600 }}>Associé à {pc.name}</div>
              <div className="small" style={{ color: pc.lastError ? 'var(--fr-red)' : 'var(--khaki)' }}>
                {pc.lastError ?? (pc.lastAt ? `Dernière synchro : ${when(pc.lastAt)}` : 'Pas encore synchronisé')}
              </div>
            </div>
            <button className="btn primary block" disabled={busy} onClick={sync}>{busy ? 'Synchronisation…' : 'Synchroniser maintenant'}</button>
            <div className="small faint">Synchro automatique à l’ouverture de PETRA et après chaque séance, quand le PC est allumé avec PCTRA ouvert.</div>
            <div className="row">
              <button className="btn ghost sm grow" onClick={() => setScanning(true)}>Scanner un autre QR code</button>
              <button className="btn danger sm" onClick={() => confirmAction(`Ne plus synchroniser avec ${pc.name} ? Tes données restent sur les deux appareils.`) && unpair()}>Oublier ce PC</button>
            </div>
          </>
        ) : (
          <>
            <ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Ouvre PCTRA sur ton PC, Paramètres › Téléphone.</li>
              <li>Mets le téléphone sur le même Wi-Fi que le PC.</li>
              <li>Scanne le QR code affiché par PCTRA.</li>
            </ol>
            <button className="btn primary block" onClick={() => setScanning(true)}>Scanner le QR code de PCTRA</button>
          </>
        )}
      </div>
    </>
  )
}

/** PC : QR code d'association à scanner avec PETRA. */
function PhoneLinkSection() {
  const [pairing, setPairing] = useState<PairingState>()
  const [img, setImg] = useState<string>()
  const [last, setLast] = useState(lastPhoneSync())
  useEffect(() => {
    void desktop?.pairing().then(setPairing)
    return onPhoneSync(setLast)
  }, [])
  useEffect(() => {
    if (!pairing || pairing.error || !pairing.hosts.length) return
    void QRCode.toDataURL(encodePairing(pairing), { margin: 2, width: 640, color: { dark: '#000000', light: '#ffffff' } }).then(setImg)
  }, [pairing])
  const renew = async () => {
    if (!desktop || !confirmAction('Changer le code ? Le téléphone déjà associé devra scanner le nouveau QR code.')) return
    setPairing(await desktop.newToken())
  }
  return (
    <div className="card stack">
      {pairing?.error ? (
        <div className="small" style={{ color: 'var(--fr-red)' }}>{pairing.error}</div>
      ) : pairing && !pairing.hosts.length ? (
        <div className="small muted">Ce PC n’est connecté à aucun réseau. Branche-le au Wi-Fi ou à la box, puis reviens sur cette page.</div>
      ) : img ? (
        <img src={img} alt="QR code d’association" className="qr-img" />
      ) : (
        <div className="qr-img" />
      )}
      <ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
        <li>Sur le téléphone : PETRA › Paramètres › Appli PC › Scanner le QR code.</li>
        <li>Le téléphone doit être sur le même Wi-Fi (ou la même box) que ce PC.</li>
        <li>Au premier lancement, Windows demande d’autoriser PCTRA sur le réseau : accepte pour les réseaux privés.</li>
      </ol>
      <div className="small" style={{ color: last ? 'var(--khaki)' : 'var(--faint)' }}>{last ? `Dernière synchro avec le téléphone : ${when(last)}` : 'Aucun téléphone synchronisé pour l’instant'}</div>
      {pairing && <div className="small faint">Adresse : {pairing.hosts.join(', ') || '—'} · port {pairing.port} · {pairing.name}</div>}
      <button className="btn ghost sm" onClick={renew}>Changer le code d’association</button>
    </div>
  )
}

function notifSummary(s: Settings): string {
  const on = [s.notifRestEnd && 'fin du repos', s.notifIntervals && 'minuteur', s.notifDaily && `rappel ${s.notifDailyTime}`, s.notifRoutines && 'tâches'].filter(Boolean)
  return on.length ? on.join(' · ') : 'Aucune'
}

function NotifRow({ title, sub, on, onChange }: { title: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="row">
      <div className="grow">
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div className="small muted">{sub}</div>
      </div>
      <Toggle on={on} onChange={onChange} label={title} />
    </div>
  )
}

function NotificationsSection() {
  const s = useData().settings
  return (
    <>
      <div className="card stack">
        <NotifRow title="Vibration" sub="Les notifications font vibrer le téléphone" on={s.notifVibrate} onChange={(v) => saveSettings({ notifVibrate: v })} />
      </div>
      <SectionTitle>Pendant la séance</SectionTitle>
      <div className="card stack">
        <NotifRow title="Fin du repos" sub="Une notification à chaque série quand la pause est finie" on={s.notifRestEnd} onChange={(v) => saveSettings({ notifRestEnd: v })} />
        <NotifRow title="Étapes du minuteur" sub="Travail / repos annoncés, même écran verrouillé" on={s.notifIntervals} onChange={(v) => saveSettings({ notifIntervals: v })} />
        <NotifRow title="Séance en cours" sub="Notification permanente avec la série suivante" on={s.notifOngoing} onChange={(v) => saveSettings({ notifOngoing: v })} />
      </div>
      <SectionTitle>Rappels</SectionTitle>
      <div className="card stack">
        <NotifRow title="Rappel quotidien" sub="Un rappel chaque jour à heure fixe" on={s.notifDaily} onChange={(v) => saveSettings({ notifDaily: v })} />
        {s.notifDaily && (
          <>
            <label className="row">
              <span className="grow" style={{ fontWeight: 600 }}>Heure</span>
              <input className="input" type="time" style={{ width: 140 }} value={s.notifDailyTime} onChange={(e) => e.target.value && saveSettings({ notifDailyTime: e.target.value })} />
            </label>
            <NotifRow title="Seulement les jours de séance" sub="Selon ton planning ; rien si la séance est déjà faite" on={s.notifDailyPlannedOnly} onChange={(v) => saveSettings({ notifDailyPlannedOnly: v })} />
          </>
        )}
        <NotifRow title="Tâches à heure fixe" sub="Un rappel à l’heure de chaque tâche qui en a une" on={s.notifRoutines} onChange={(v) => saveSettings({ notifRoutines: v })} />
      </div>
    </>
  )
}

function DataSection() {
  const data = useData()
  const s = data.settings
  const [backup, setBackup] = useState<'export' | 'import' | null>(null)
  const [importText, setImportText] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const exportText = backup === 'export' ? JSON.stringify(getData(), null, 1) : ''

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
    toast(r.local ? 'Sauvegarde enregistrée dans Documents/PETRA' : 'Sauvegarde impossible sur ce téléphone')
  }

  return (
    <>
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
    </>
  )
}
