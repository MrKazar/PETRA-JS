import { useData } from '../data/store'
import { useNav } from '../nav'
import { beginSession, setRoutineStatus } from '../logic/actions'
import { programFor, routinesFor } from '../logic/planner'
import { statsOf } from '../logic/session'
import { addDays, dateKey, formatDay, formatDuration, WEEKDAYS_SHORT, weekday } from '../logic/util'
import { Brand, Empty } from '../ui/kit'
import { IconCheckList, IconChevron, IconDumbbell, IconHistory, IconPlay } from '../ui/icons'
import { RoutineStatusButtons } from './Routines'

export function HomeScreen() {
  const data = useData()
  const nav = useNav()
  const today = dateKey()
  const program = programFor(data, today)
  const routines = routinesFor(data, today)
  const doneRoutines = routines.filter((r) => r.status === 'fait').length

  const monday = addDays(today, -weekday(today))
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const sessionDays = new Set(data.sessions.map((s) => dateKey(new Date(s.startedAt))))
  const doneToday = data.sessions.some((s) => dateKey(new Date(s.startedAt)) === today && (!program || s.programId === program.id))
  const weekSessions = data.sessions.filter((s) => dateKey(new Date(s.startedAt)) >= monday).length
  const last = data.sessions[0]

  const start = (p = program) => {
    if (!data.active) beginSession(p)
    nav.push({ name: 'workout' })
  }

  const hello = data.settings.name ? `Salut ${data.settings.name}` : 'Salut'

  return (
    <div className="screen">
      <div className="screen-inner">
        <Brand />
        <div>
          <div className="eyebrow">{formatDay(today)}</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{hello}, prêt à t'entraîner ?</div>
        </div>

        <div className={`card${program && !doneToday ? ' accent' : ''}`}>
          <div className="eyebrow">Séance du jour</div>
          {data.active ? (
            <>
              <h2 style={{ marginTop: 6 }}>{data.active.programName}</h2>
              <p className="muted small">Séance en cours.</p>
              <button className="btn primary block big" onClick={() => nav.push({ name: 'workout' })}>
                <IconPlay /> Reprendre la séance
              </button>
            </>
          ) : program ? (
            <>
              <h2 style={{ marginTop: 6 }}>{program.name}</h2>
              <p className="muted small" style={{ margin: '4px 0 12px' }}>
                {program.exercises.length} exercice{program.exercises.length > 1 ? 's' : ''} · {program.exercises.reduce((n, e) => n + e.sets.length, 0)} séries
                {doneToday ? ' · déjà faite aujourd’hui ✓' : ''}
              </p>
              <button className={`btn block big${doneToday ? '' : ' primary'}`} onClick={() => start()}>
                <IconPlay /> {doneToday ? 'Refaire la séance' : 'Commencer'}
              </button>
            </>
          ) : (
            <>
              <h2 style={{ marginTop: 6 }}>{data.programs.length ? 'Repos' : 'Aucun programme'}</h2>
              <p className="muted small" style={{ margin: '4px 0 12px' }}>
                {data.programs.length ? 'Rien de prévu aujourd’hui. Tu peux quand même lancer une séance.' : 'Crée ton premier programme, puis place-le dans ton planning.'}
              </p>
              <div className="row">
                {data.programs.length ? (
                  <button className="btn grow" onClick={() => nav.reset({ name: 'plan' })}>Voir le plan</button>
                ) : (
                  <button className="btn primary grow" onClick={() => nav.reset({ name: 'programs' })}>
                    <IconDumbbell /> Créer un programme
                  </button>
                )}
                <button className="btn grow" onClick={() => start(null)}>Séance libre</button>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="row between" style={{ marginBottom: 10 }}>
            <div className="eyebrow">Cette semaine</div>
            <span className="small muted">{weekSessions} séance{weekSessions > 1 ? 's' : ''}</span>
          </div>
          <div className="week">
            {week.map((k, i) => {
              const planned = !!programFor(data, k)
              const done = sessionDays.has(k)
              return (
                <div key={k} className={`d${planned ? ' plan' : ''}${done ? ' done' : ''}${k === today ? ' today' : ''}`}>
                  {WEEKDAYS_SHORT[i]}
                </div>
              )
            })}
          </div>
        </div>

        <div className="row between">
          <div className="section-title">Routines du jour</div>
          {routines.length > 0 && <span className="small muted">{doneRoutines}/{routines.length}</span>}
        </div>
        {routines.length ? (
          <div className="list">
            {routines.map(({ routine, status, carried }) => (
              <div className="list-item" key={routine.id}>
                <div className="grow">
                  <div style={{ fontWeight: 600, textDecoration: status === 'fait' ? 'line-through' : undefined }}>{routine.name}</div>
                  <div className="small muted">
                    {routine.time ?? 'Dans la journée'}
                    {carried ? ' · reportée d’hier' : ''}
                  </div>
                </div>
                <RoutineStatusButtons status={status} onChange={(s) => setRoutineStatus(today, routine.id, s)} />
              </div>
            ))}
          </div>
        ) : (
          <Empty icon={<IconCheckList />}>
            Pas de routine aujourd’hui.{' '}
            <button className="btn ghost sm" onClick={() => nav.reset({ name: 'routines' })}>Ajouter</button>
          </Empty>
        )}

        {last && (
          <>
            <div className="section-title">Dernière séance</div>
            <div className="list-item clickable" onClick={() => nav.push({ name: 'session', id: last.id })}>
              <IconHistory style={{ width: 22, color: 'var(--gold)' }} />
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{last.programName}</div>
                <div className="small muted">
                  {new Date(last.startedAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })} · {formatDuration(statsOf(last).durationSec)} · {statsOf(last).setsDone} séries
                </div>
              </div>
              <IconChevron style={{ width: 18, color: 'var(--faint)' }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
