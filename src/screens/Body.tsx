import { useMemo, useState } from 'react'
import { useData } from '../data/store'
import { BodyFigure } from '../ui/BodyMap'
import { Header } from '../ui/kit'
import { LEVELS, REGIONS, doneWork, levelOf, plannedDays, plannedWork, regionLabel, scaleWork, weekStart, type BodyWork, type RegionId } from '../logic/body'

type View = 'week' | 'month' | 'program'

const VIEWS: { view: View; label: string }[] = [
  { view: 'week', label: 'Cette semaine' },
  { view: 'month', label: '4 dernières semaines' },
  { view: 'program', label: 'Programme prévu' },
]

const WEEK = 7 * 86400000
const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')
const shortDate = (t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

/** PCTRA : le schéma du corps, pour voir les points forts et les points faibles de l'entraînement. */
export function BodyScreen() {
  const data = useData()
  const [view, setView] = useState<View>('month')
  const [selected, setSelected] = useState<RegionId>()

  const { work, sub, empty } = useMemo((): { work: BodyWork; sub: string; empty?: string } => {
    const now = Date.now()
    if (view === 'week') {
      const w = doneWork(data.sessions, weekStart(now), now + 1)
      return { work: w, sub: 'Séries faites depuis lundi', empty: 'Aucune séance cette semaine pour l’instant.' }
    }
    if (view === 'month') {
      const w = scaleWork(doneWork(data.sessions, now - 4 * WEEK, now + 1), 4)
      return { work: w, sub: 'Moyenne de séries par semaine sur les 4 dernières semaines', empty: 'Aucune séance sur les 4 dernières semaines.' }
    }
    const days = plannedDays(data)
    return {
      work: plannedWork(data),
      sub: `Séries prévues sur une semaine type du planning${data.settings.abWeeks ? ' (moyenne des semaines A et B)' : ''} · ${fmt(days)} jour${days > 1 ? 's' : ''} d’entraînement`,
      empty: 'Aucun programme au planning : choisis tes séances de la semaine dans Programmes.',
    }
  }, [view, data])

  const total = REGIONS.reduce((n, r) => n + work[r.id].sets, 0)
  const neglected = new Set(REGIONS.filter((r) => levelOf(work[r.id].sets) <= 1).map((r) => r.id))
  const lv = (id: RegionId) => levelOf(work[id].sets)
  const label = (id: RegionId) => `${regionLabel(id)} : ${fmt(work[id].sets)} série${work[id].sets > 1 ? 's' : ''}`
  const ranked = [...REGIONS].sort((a, b) => work[b.id].sets - work[a.id].sets)
  const sel = selected && work[selected]
  const perWeek = view === 'month' ? ' par semaine' : ''

  return (
    <div className="screen">
      <div className="screen-inner">
        <Header title="Schéma du corps" sub={sub} />
        <div className="seg" role="tablist">
          {VIEWS.map((v) => (
            <button key={v.view} role="tab" aria-selected={view === v.view} className={view === v.view ? 'on' : ''} onClick={() => setView(v.view)}>
              {v.label}
            </button>
          ))}
        </div>

        <div className="bm-layout">
          <div className="card bm-figures">
            <BodyFigure side="front" levelOf={lv} selected={selected} neglected={neglected} onSelect={setSelected} labelOf={label} />
            <BodyFigure side="back" levelOf={lv} selected={selected} neglected={neglected} onSelect={setSelected} labelOf={label} />
            <div className="bm-legend">
              {LEVELS.map((l) => (
                <span key={l.level}>
                  <i className={`bm-swatch lv${l.level}`} />
                  {l.label} <span className="faint">({l.range})</span>
                </span>
              ))}
            </div>
          </div>

          <div className="stack bm-side">
            {total === 0 && empty && <div className="card muted">{empty}</div>}

            {sel && selected ? (
              <div className="card stack" style={{ gap: 8 }}>
                <div className="row">
                  <h2 className="grow" style={{ margin: 0 }}>{regionLabel(selected)}</h2>
                  <button className="btn sm ghost" onClick={() => setSelected(undefined)}>Fermer</button>
                </div>
                <div className="muted">
                  <b style={{ color: 'var(--text)' }}>{fmt(sel.sets)}</b> série{sel.sets > 1 ? 's' : ''}{perWeek} · {LEVELS[lv(selected)].label}
                </div>
                {!sel.exercises.length && <div className="small muted">Aucun exercice ne travaille ce muscle sur cette période.</div>}
                {sel.exercises.map((e) => (
                  <div key={e.key} className="bm-ex">
                    <div className="grow">
                      <div style={{ fontWeight: 600 }}>{e.name}</div>
                      <div className="small muted">
                        {e.primary ? 'Muscle principal' : 'En secondaire (compte pour moitié)'}
                        {e.lastAt ? ` · dernière fois le ${shortDate(e.lastAt)}` : ''}
                      </div>
                    </div>
                    <div className="bm-num">
                      {fmt(view === 'month' ? e.sets / 4 : e.sets)}
                      <div className="small faint" style={{ fontWeight: 400 }}>série{(view === 'month' ? e.sets / 4 : e.sets) > 1 ? 's' : ''}{perWeek ? '/sem.' : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              total > 0 && <div className="small muted">Clique sur un muscle pour voir ses exercices.</div>
            )}

            {total > 0 && neglected.size > 0 && (
              <div className="card stack" style={{ gap: 6 }}>
                <div className="section-title" style={{ margin: 0 }}>Muscles négligés</div>
                <div className="chips">
                  {REGIONS.filter((r) => neglected.has(r.id)).map((r) => (
                    <button key={r.id} className={`chip${selected === r.id ? ' on' : ''}`} onClick={() => setSelected(r.id)}>
                      {r.label}
                    </button>
                  ))}
                </div>
                <div className="small faint">Moins de 4 séries{perWeek || ' sur la période'}. Repère utile, pas une obligation : à toi de voir si c’est voulu.</div>
              </div>
            )}

            {total > 0 && (
              <div className="card stack" style={{ gap: 4 }}>
                <div className="section-title" style={{ margin: 0 }}>Séries{perWeek} par muscle</div>
                {ranked.map((r) => {
                  const s = work[r.id].sets
                  return (
                    <button key={r.id} className={`bm-bar${selected === r.id ? ' sel' : ''}`} onClick={() => setSelected(r.id)}>
                      <span className="bm-bar-label">{r.label}</span>
                      <span className="bm-bar-track">
                        <span className={`bm-bar-fill lv${levelOf(s)}`} style={{ width: `${Math.min(100, (s / Math.max(20, work[ranked[0].id].sets)) * 100)}%` }} />
                      </span>
                      <span className="bm-num">{fmt(s)}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <div className="small faint">
          Une série compte entière pour le muscle principal de l’exercice et pour moitié pour ses muscles secondaires. Les séries de chauffe et le cardio ne comptent pas. Repère courant : 10 à 20 séries par semaine et par muscle pour progresser.
        </div>
      </div>
    </div>
  )
}
