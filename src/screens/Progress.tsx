import { useData } from '../data/store'
import { useNav } from '../nav'
import { isCardio } from '../data/catalog'
import { exerciseHistory, exerciseKey, overloadSuggestion, type ProgressPoint } from '../logic/progress'
import { formatDuration } from '../logic/util'
import { Empty, TopBar } from '../ui/kit'
import { LineChart } from '../ui/LineChart'
import { OverloadCard } from '../ui/Overload'
import { IconHistory } from '../ui/icons'

const fmtKg = (v: number) => `${String(Math.round(v * 10) / 10).replace('.', ',')} kg`
const shortDate = (t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

type Metric = { label: string; value: (p: ProgressPoint) => number | undefined; format: (v: number) => string }

const WEIGHT: Metric = { label: 'Charge de travail max', value: (p) => p.weight, format: fmtKg }
const REPS: Metric = { label: 'Répétitions (séries de travail)', value: (p) => p.reps || undefined, format: (v) => `${v} rép.` }
const TIME: Metric = { label: 'Temps total', value: (p) => p.durationSec || undefined, format: (v) => formatDuration(v) }

/** Progression d'un programme : l'évolution de chaque exercice d'une séance à l'autre. */
export function ProgressScreen({ id }: { id: string }) {
  const data = useData()
  const nav = useNav()
  const program = data.programs.find((p) => p.id === id)
  if (!program) {
    return (
      <div className="screen">
        <div className="screen-inner">
          <TopBar title="Progression" onBack={nav.pop} />
          <Empty>Ce programme n’existe plus.</Empty>
        </div>
      </div>
    )
  }
  const sessions = data.sessions.filter((s) => s.programId === program.id)
  const last = sessions.reduce((m, s) => Math.max(m, s.startedAt), 0)

  return (
    <div className="screen">
      <div className="screen-inner">
        <TopBar title={`Progression · ${program.name}`} onBack={nav.pop} />
        <div className="stat-grid">
          <div className="stat"><div className="v">{sessions.length}</div><div className="l">Séances faites</div></div>
          <div className="stat"><div className="v">{last ? shortDate(last) : '—'}</div><div className="l">Dernière</div></div>
        </div>
        {!sessions.length && <Empty icon={<IconHistory />} title="Pas encore de séance">Lance ce programme : l’évolution de chaque exercice apparaîtra ici après la première séance.</Empty>}

        {sessions.length > 0 &&
          program.exercises.map((e) => {
            const history = exerciseHistory(data.sessions, program.id, exerciseKey(e))
            const metric = isCardio(e) ? TIME : history.some((p) => p.weight) ? WEIGHT : REPS
            const points = history.filter((p) => metric.value(p) != null)
            const values = points.map((p) => metric.value(p)!)
            const first = values[0]
            const latest = values[values.length - 1]
            const best = values.length ? Math.max(...values) : 0
            const diff = values.length > 1 ? latest - first : 0
            const suggestion = overloadSuggestion(e, data.sessions, program.id)
            return (
              <div key={e.id} className="card stack" style={{ gap: 8 }}>
                <div className="row">
                  <div className="grow">
                    <h3>{e.name}</h3>
                    <div className="small muted">{metric.label}{e.workLoad && metric === WEIGHT ? ` · prévu ${fmtKg(e.workLoad)}` : ''}</div>
                  </div>
                  {values.length > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>{metric.format(latest)}</div>
                      {values.length > 1 && (
                        <div className={`small delta${diff > 0 ? ' up' : diff < 0 ? ' down' : ''}`}>
                          {diff > 0 ? '+' : diff < 0 ? '−' : '='}{diff ? metric.format(Math.abs(diff)) : ''} depuis le {shortDate(points[0].date)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {values.length > 0 ? (
                  <>
                    <LineChart values={values} format={metric.format} />
                    <div className="small faint">
                      {points.length} séance{points.length > 1 ? 's' : ''} · record {metric.format(best)}
                    </div>
                    <div className="chips">
                      {points.slice(-6).reverse().map((p) => (
                        <button key={p.sessionId} className="chip" onClick={() => nav.push({ name: 'session', id: p.sessionId })}>
                          {shortDate(p.date)} · {metric.format(metric.value(p)!)}
                          {metric === WEIGHT && p.reps ? ` × ${p.reps}` : ''}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="small faint">Pas encore fait dans ce programme.</div>
                )}
                {suggestion && <OverloadCard programId={program.id} s={suggestion} />}
              </div>
            )
          })}
      </div>
    </div>
  )
}
