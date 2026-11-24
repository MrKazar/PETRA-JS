import { useData } from '../data/store'
import { useNav } from '../nav'
import { bumpFeats, saveSettings } from '../logic/actions'
import { progress } from '../logic/level'
import { activeTheme, isSecret, nextLevelTheme, themesShown, unlocked } from '../ui/theme'
import { LogoFull, TopBar, imgUrl, toast } from '../ui/kit'

export function AppearanceScreen() {
  const data = useData()
  const nav = useNav()
  const pr = progress(data)
  const level = pr.level
  const s = { ...data.settings, ...pr }
  const current = activeTheme(s)
  const next = nextLevelTheme(level)
  return (
    <div className="screen">
      <div className="screen-inner">
        <TopBar title="Apparence" onBack={nav.pop} />
        <div className="card">
          <LogoFull />
          <div className="small muted" style={{ textAlign: 'center', marginTop: 10 }}>{current.description}</div>
        </div>
        <div className="small muted">
          Niveau {level}. {next ? `Prochain thème : ${next.label} au niveau ${next.unlockLevel}.` : 'Tous les thèmes sont débloqués.'}
        </div>
        <div className="theme-grid">
          {themesShown(s).sort((a, b) => (a.unlockLevel ?? (isSecret(a) ? 99 : 1)) - (b.unlockLevel ?? (isSecret(b) ? 99 : 1))).map((t) => {
            const open = unlocked(t, s)
            return (
              <button key={t.id} className={`theme-card${current.id === t.id ? ' on' : ''}${open ? '' : ' locked'}`} onClick={() => {
                if (!open) return toast(`${t.label} se débloque au niveau ${t.unlockLevel}`)
                saveSettings({ theme: t.id })
                bumpFeats((f) => ({ ...f, themes: [...new Set([...(f.themes ?? []), t.id])] }))
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
        <div className="small faint">Le thème change les couleurs, les polices, le logo et l’icône de l’appli sur le téléphone. La nouvelle icône apparaît quand tu quittes l’appli. Les thèmes se débloquent en montant de niveau, tous sont ouverts au niveau 50.</div>
      </div>
    </div>
  )
}
