import { useRef, useState } from 'react'
import { useData } from '../data/store'
import { useNav } from '../nav'
import { bumpFeats, saveSettings } from '../logic/actions'
import { progress } from '../logic/level'
import { DEV_CODE_HASH, activeTheme, codeHash, isSecret, nextLevelTheme, themeForCode, themesShown, unlocked, unlockedForReal } from '../ui/theme'
import { LogoFull, TopBar, imgUrl, toast } from '../ui/kit'

export function AppearanceScreen() {
  const data = useData()
  const nav = useNav()
  const pr = progress(data)
  const level = pr.level
  const s = { ...data.settings, ...pr }
  const current = activeTheme(s)
  // Codes cachés (thèmes secrets, mode test) : appui long (1,5 s) sur la ligne « Niveau », puis le code.
  const [asking, setAsking] = useState(false)
  const [code, setCode] = useState('')
  const press = useRef(0)
  const holdStart = () => {
    window.clearTimeout(press.current)
    press.current = window.setTimeout(() => setAsking(true), 1500)
  }
  const holdEnd = () => window.clearTimeout(press.current)
  const submitCode = () => {
    setAsking(false)
    setCode('')
    const secret = themeForCode(code)
    if (secret) {
      // Thème caché : débloqué pour de bon (succès « Mot de passe », synchronisé avec PCTRA) et appliqué.
      bumpFeats((f) => ({ ...f, codes: [...new Set([...(f.codes ?? []), secret.id])], themes: [...new Set([...(f.themes ?? []), secret.id])] }))
      saveSettings({ theme: secret.id })
      return toast(`Thème ${secret.label} débloqué`)
    }
    if (codeHash(code) !== DEV_CODE_HASH) return toast('Code inconnu')
    const on = !data.settings.devThemes
    saveSettings({ devThemes: on || undefined })
    toast(on ? 'Mode test : toutes les apparences sont ouvertes' : 'Mode test désactivé')
  }
  const next = nextLevelTheme(level)
  return (
    <div className="screen">
      <div className="screen-inner">
        <TopBar title="Apparence" onBack={nav.pop} />
        <div className="card">
          <LogoFull />
          <div className="small muted" style={{ textAlign: 'center', marginTop: 10 }}>{current.description}</div>
        </div>
        <div className="small muted" onPointerDown={holdStart} onPointerUp={holdEnd} onPointerLeave={holdEnd} onPointerCancel={holdEnd} onContextMenu={(e) => e.preventDefault()}>
          {s.devThemes ? 'Mode test. ' : ''}Niveau {level}. {next ? `Prochain thème : ${next.label} au niveau ${next.unlockLevel}.` : 'Tous les thèmes sont débloqués.'}
        </div>
        {asking && (
          <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); submitCode() }}>
            <input className="input grow" type="password" autoFocus autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} onBlur={() => !code && setAsking(false)} aria-label="Code" />
            <button className="btn" type="submit">OK</button>
          </form>
        )}
        <div className="theme-grid">
          {themesShown(s).sort((a, b) => (a.unlockLevel ?? (isSecret(a) ? 99 : 1)) - (b.unlockLevel ?? (isSecret(b) ? 99 : 1))).map((t) => {
            const open = unlocked(t, s)
            return (
              <button key={t.id} className={`theme-card${current.id === t.id ? ' on' : ''}${open ? '' : ' locked'}`} onClick={() => {
                if (!open) return toast(`${t.label} se débloque au niveau ${t.unlockLevel}`)
                saveSettings({ theme: t.id })
                // En mode test, un thème pas encore vraiment débloqué ne compte pas pour les succès.
                if (unlockedForReal(t, s)) bumpFeats((f) => ({ ...f, themes: [...new Set([...(f.themes ?? []), t.id])] }))
              }}>
                <span className="emb" style={{ background: t.swatches[0] }}>
                  <img src={imgUrl(t.emblem)} alt="" />
                </span>
                <span className="n">{t.label}</span>
                {open ? (
                  <span className="sw">{t.swatches.map((c) => <i key={c} style={{ background: c }} />)}</span>
                ) : (
                  <span className="lock">Niveau {t.unlockLevel}</span>
                )}
              </button>
            )
          })}
        </div>
        <div className="small faint">Le thème change les couleurs, les polices, le logo et l’icône de l’appli, sur le téléphone comme sur PCTRA. Sur le téléphone, la nouvelle icône apparaît quand tu quittes l’appli. Les thèmes se débloquent en montant de niveau, tous sont ouverts au niveau 50.</div>
      </div>
    </div>
  )
}
