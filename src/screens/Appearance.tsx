import { useData } from '../data/store'
import { useNav } from '../nav'
import { saveSettings } from '../logic/actions'
import { THEMES, themeOf } from '../ui/theme'
import { LogoFull, TopBar, imgUrl } from '../ui/kit'

export function AppearanceScreen() {
  const data = useData()
  const nav = useNav()
  const current = themeOf(data.settings.theme)
  return (
    <div className="screen">
      <div className="screen-inner">
        <TopBar title="Apparence" onBack={nav.pop} />
        <div className="card">
          <LogoFull />
          <div className="small muted" style={{ textAlign: 'center', marginTop: 10 }}>{current.description}</div>
        </div>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <button key={t.id} className={`theme-card${current.id === t.id ? ' on' : ''}`} onClick={() => saveSettings({ theme: t.id })}>
              <span className="emb" style={{ background: t.swatches[0] }}>
                <img src={imgUrl(t.emblem)} alt="" />
              </span>
              <span className="n">{t.label}</span>
              <span className="sw">{t.swatches.map((c) => <i key={c} style={{ background: c }} />)}</span>
            </button>
          ))}
        </div>
        <div className="small faint">Le thème change les couleurs, les polices, le logo et l’icône de l’appli sur le téléphone (le lanceur peut mettre quelques secondes à l’afficher).</div>
      </div>
    </div>
  )
}
