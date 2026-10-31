import { useData } from '../data/store'
import { useNav } from '../nav'
import { PHASE_LABEL } from '../data/types'
import { finisherTypeLabel } from '../data/finishers'
import { deleteSession } from '../logic/actions'
import { describeSet, statsOf } from '../logic/session'
import { formatDuration } from '../logic/util'
import { overloadSuggestions } from '../logic/progress'
import { OverloadCard } from '../ui/Overload'
import { Empty, TopBar, confirmAction } from '../ui/kit'
import { IconChevron, IconFlame, IconHistory, IconTrash } from '../ui/icons'

const fmtDate = (t: number) => new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const fmtTime = (t: number) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export function HistoryScreen() {
  const data = useData()
  const nav = useNav()

  const byMonth = new Map<string, typeof data.sessions>()
  for (const s of data.sessions) {
    const k = new Date(s.startedAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    byMonth.set(k, [...(byMonth.get(k) ?? []), s])
  }

  return (
    <div className="screen">
      <div className="screen-inner">
        <TopBar title="Historique" onBack={nav.pop} />
        {!data.sessions.length && <Empty icon={<IconHistory />}>Tes séances terminées apparaîtront ici.</Empty>}
        {[...byMonth].map(([month, list]) => (
          <div key={month} className="stack">
            <div className="section-title" style={{ textTransform: 'uppercase' }}>{month} · {list.length}</div>
            <div className="list">
              {list.map((s) => {
                const st = statsOf(s)
                return (
                  <div key={s.id} className="list-item clickable" onClick={() => nav.push({ name: 'session', id: s.id })}>
                    <div className="grow">
                      <div style={{ fontWeight: 600 }}>{s.programName}</div>
                      <div className="small muted" style={{ textTransform: 'capitalize' }}>
                        {new Date(s.startedAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })} · {formatDuration(st.durationSec)} · {st.setsDone} séries
                        {st.volumeKg ? ` · ${Math.round(st.volumeKg)} kg` : ''}
                      </div>
                    </div>
                    {s.finisher && <IconFlame style={{ width: 18, color: 'var(--khaki)' }} />}
                    <IconChevron style={{ width: 18, color: 'var(--faint)' }} />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SessionDetailScreen({ id }: { id: string }) {
  const data = useData()
  const nav = useNav()
  const s = data.sessions.find((x) => x.id === id)
  if (!s) {
    return (
      <div className="screen">
        <div className="screen-inner">
          <TopBar title="Séance" onBack={nav.pop} />
          <Empty>Séance introuvable.</Empty>
        </div>
      </div>
    )
  }
  const st = statsOf(s)
  const program = data.programs.find((p) => p.id === s.programId)
  const latest = program && !data.sessions.some((x) => x.programId === program.id && x.startedAt > s.startedAt)
  const suggestions = program ? overloadSuggestions(program.id, data.sessions, program.exercises) : []
  const remove = () => {
    if (!confirmAction('Supprimer cette séance de l’historique ?')) return
    deleteSession(s.id)
    nav.pop()
  }

  return (
    <div className="screen">
      <div className="screen-inner">
        <TopBar title={s.programName} onBack={nav.pop} />
        <div className="muted small" style={{ textTransform: 'capitalize', marginTop: -6 }}>
          {fmtDate(s.startedAt)} · {fmtTime(s.startedAt)}
        </div>
        <div className="stat-grid">
          <div className="stat"><div className="v">{formatDuration(st.durationSec)}</div><div className="l">Durée</div></div>
          <div className="stat"><div className="v">{st.setsDone}</div><div className="l">Séries</div></div>
          <div className="stat"><div className="v">{st.exercisesDone}</div><div className="l">Exercices</div></div>
          <div className="stat"><div className="v">{Math.round(st.volumeKg)}</div><div className="l">Volume (kg)</div></div>
        </div>

        {s.finisher && (
          <div className="card accent">
            <div className="row">
              <IconFlame style={{ width: 22, color: 'var(--khaki)' }} />
              <div className="grow">
                <div className="eyebrow">Finisher · {finisherTypeLabel(s.finisher.type)}</div>
                <h3>{s.finisher.name}</h3>
              </div>
            </div>
            <ol className="finisher-list">
              {s.finisher.items.map((it, i) => <li key={i}>{it}</li>)}
            </ol>
          </div>
        )}

        {program && latest && suggestions.length > 0 && (
          <div className="card stack" style={{ gap: 8 }}>
            <div className="eyebrow">Surcharge progressive</div>
            {suggestions.map((x) => <OverloadCard key={x.exerciseId} programId={program.id} s={x} showName />)}
          </div>
        )}
        {program && (
          <button className="btn block" onClick={() => nav.push({ name: 'progress', id: program.id })}>
            <IconHistory /> Progression de « {program.name} »
          </button>
        )}

        {s.exercises.map((e) => (
          <div key={e.id} className="card tight">
            <div style={{ fontWeight: 700, marginBottom: e.parts ? 0 : 6 }}>{e.parts ? `Superset · ${e.name}` : e.name}</div>
            {e.parts && <div className="small muted" style={{ marginBottom: 6 }}>{e.parts.map((p) => p.name).join(" · ")}</div>}
            {e.sets.map((set, i) => (
              <div key={i} className="row small" style={{ padding: '4px 0', borderTop: i ? '1px solid var(--line)' : undefined }}>
                <span className="faint" style={{ width: 20, fontWeight: 700 }}>{i + 1}</span>
                <span className="muted grow">{e.parts ? 'Tour' : PHASE_LABEL[set.phase]}</span>
                <span style={{ fontWeight: 600 }}>{describeSet(set, e.parCote)}</span>
              </div>
            ))}
          </div>
        ))}

        {s.notes && (
          <div className="card tight">
            <div className="eyebrow" style={{ marginBottom: 4 }}>Notes</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{s.notes}</div>
          </div>
        )}

        <div className="row">
          <button className="btn grow" onClick={() => nav.reset({ name: 'today' })}>Aujourd’hui</button>
          <button className="btn danger" onClick={remove} aria-label="Supprimer">
            <IconTrash />
          </button>
        </div>
      </div>
    </div>
  )
}
