import { useSyncExternalStore } from 'react'
import { checkNow, getUpdaterState, installUpdate, subscribeUpdater } from '../logic/updates'
import { Progress } from './kit'

export const useUpdater = () => useSyncExternalStore(subscribeUpdater, getUpdaterState)

/** Bandeau de mise à jour (accueil) : n'apparaît que lorsqu'une version plus récente existe. */
export function UpdateBanner() {
  const s = useUpdater()
  if (s.kind !== 'available' && s.kind !== 'downloading' && s.kind !== 'permission' && s.kind !== 'installing') return null
  return (
    <div className="card accent">
      <UpdateBody />
    </div>
  )
}

/** Contenu commun au bandeau et à la carte des paramètres. */
export function UpdateBody() {
  const s = useUpdater()
  const version = 'info' in s ? s.info.version : undefined
  return (
    <div className="stack">
      <div className="row">
        <div className="grow">
          <div style={{ fontWeight: 600 }}>{version ? `Nouvelle version ${version}` : `Version ${__APP_VERSION__}`}</div>
          <div className="small muted">
            {s.kind === 'checking' && 'Recherche d’une mise à jour…'}
            {s.kind === 'none' && 'Tu as la dernière version.'}
            {s.kind === 'error' && s.message}
            {s.kind === 'idle' && 'Mises à jour depuis GitHub'}
            {s.kind === 'available' && `Tu as la ${__APP_VERSION__}. Tes données sont conservées.`}
            {s.kind === 'downloading' && `Téléchargement… ${Math.round(s.progress * 100)} %`}
            {s.kind === 'permission' && 'Autorise PETRA à installer des applis dans le réglage qui vient de s’ouvrir, puis reviens et appuie sur « Installer ».'}
            {s.kind === 'installing' && 'Confirme l’installation dans la fenêtre d’Android.'}
          </div>
        </div>
        {(s.kind === 'idle' || s.kind === 'none' || s.kind === 'error') && (
          <button className="btn sm" onClick={checkNow}>Vérifier</button>
        )}
        {(s.kind === 'available' || s.kind === 'permission') && (
          <button className="btn primary sm" onClick={() => installUpdate(s.info)}>Installer</button>
        )}
        {s.kind === 'installing' && (
          <button className="btn sm" onClick={() => installUpdate(s.info)}>Relancer</button>
        )}
      </div>
      {s.kind === 'downloading' && <Progress value={s.progress} />}
    </div>
  )
}
