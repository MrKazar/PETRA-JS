import { useState } from 'react'
import { useData } from '../data/store'
import type { Routine } from '../data/types'
import { useNav } from '../nav'
import { beginSession, setRoutineStatus } from '../logic/actions'
import { programFor, routinesFor, weekLetter } from '../logic/planner'
import { statsOf } from '../logic/session'
import { addDays, dateKey, formatDay, formatDuration, uid, WEEKDAYS_SHORT, weekday } from '../logic/util'
import { Empty, Header, Progress, Ring, SectionTitle } from '../ui/kit'
import { IconChevron, IconDumbbell, IconHistory, IconPlay, IconPlus } from '../ui/icons'
import { RoutineEditor, TaskRow } from './Routines'
import { UpdateBanner } from '../ui/UpdateCard'

function greeting(name: string): string {
  const hello = new Date().getHours() >= 18 ? 'Bonsoir' : 'Bonjour'
  return `${hello}${name ? ` ${name}` : ''}. Une action après l’autre.`
}

export function TodayScreen() {
  const data = useData()
  const nav = useNav()
  const today = dateKey()
  const [editing, setEditing] = useState<Routine | null>(null)

  const program = programFor(data, today)
  const letter = weekLetter(data.settings, today)
  const routines = routinesFor(data, today)
  const expected = routines.filter((r) => r.status !== 'saute' && r.status !== 'reporte').length
  const done = routines.filter((r) => r.status === 'fait').length
  const rate = expected ? done / expected : 0
  const next = routines.find((r) => !r.status)

  const monday = addDays(today, -weekday(today))
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const sessionDays = new Set(data.sessions.map((s) => dateKey(new Date(s.startedAt))))
  const doneToday = data.sessions.some((s) => dateKey(new Date(s.startedAt)) === today && (!program || s.programId === program.id))
  const weekSessions = data.sessions.filter((s) => dateKey(new Date(s.startedAt)) >= monday).length
  const plannedThisWeek = week.filter((k) => programFor(data, k)).length
  const nextPlanned = Array.from({ length: 14 }, (_, i) => addDays(today, i + 1)).find((k) => programFor(data, k))
  const last = data.sessions[0]

  const start = (p = program) => {
    if (!data.active) beginSession(p)
    nav.push({ name: 'workout' })
  }

  return (
    <div className="screen">
      <div className="screen-inner">
        <Header title="PETRA — Aujourd’hui" sub={formatDay(today).replace(/^./, (c) => c.toUpperCase())} />
        <div className="muted">{greeting(data.settings.name)}</div>
        <UpdateBanner />

        <SectionTitle right={<button className="btn ghost sm" onClick={() => nav.reset({ name: 'programs' })}>Planning</button>}>Objectif sportif</SectionTitle>
        {data.active ? (
          <div className="card accent">
            <div className="row">
              <div className="icon-box"><IconDumbbell /></div>
              <div className="grow">
                <h3>{data.active.programName}</h3>
                <div className="small muted">Séance en cours</div>
              </div>
            </div>
            <button className="btn primary block" style={{ marginTop: 12 }} onClick={() => nav.push({ name: 'workout' })}>
              <IconPlay /> Reprendre
            </button>
          </div>
        ) : program ? (
          <div className={`card${doneToday ? '' : ' accent'}`}>
            <div className="row">
              <div className="icon-box"><IconDumbbell /></div>
              <div className="grow">
                <h3>{doneToday ? 'Séance du jour faite' : program.name}</h3>
                <div className="small muted">
                  {doneToday
                    ? program.name
                    : `Prévue aujourd’hui${data.settings.abWeeks ? ` · semaine ${letter}` : ''} · ${program.exercises.length} exercice${program.exercises.length > 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
            <button className={`btn block${doneToday ? '' : ' primary'}`} style={{ marginTop: 12 }} onClick={() => start()}>
              <IconPlay /> {doneToday ? 'Refaire' : 'Démarrer'}
            </button>
          </div>
        ) : (
          <div className="card">
            <div className="row">
              <div className="icon-box"><IconDumbbell /></div>
              <div className="grow">
                <h3>{data.programs.length ? 'Repos aujourd’hui' : 'Aucun programme'}</h3>
                <div className="small muted">
                  {data.programs.length
                    ? nextPlanned
                      ? `Prochaine : ${formatDay(nextPlanned)} · ${programFor(data, nextPlanned)?.name}`
                      : 'Rien de prévu sur les 2 semaines'
                    : 'Crée ton premier programme d’entraînement.'}
                </div>
              </div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn grow" onClick={() => nav.reset({ name: 'programs' })}>{data.programs.length ? 'Planning' : 'Programmes'}</button>
              <button className="btn grow" onClick={() => start(null)}>Séance libre</button>
            </div>
          </div>
        )}

        <div className="card">
          <SectionTitle>Progression quotidienne</SectionTitle>
          <div className="row" style={{ marginTop: 8 }}>
            <div className="grow">
              <div style={{ fontSize: 18, fontWeight: 600, color: expected && done >= expected ? 'var(--success)' : undefined }}>
                {expected ? `${done} ${done > 1 ? 'tâches terminées' : 'tâche terminée'} sur ${expected}` : 'Aucune tâche aujourd’hui'}
              </div>
              <div style={{ marginTop: 8 }}>
                <Progress value={rate} />
              </div>
            </div>
            {expected > 0 && <Ring value={rate} />}
          </div>
          <div className="small muted" style={{ marginTop: 10 }}>
            {next ? `Prochaine : ${next.routine.name}` : expected ? 'Tout est fait pour aujourd’hui. Bon travail.' : ''}
          </div>
        </div>

        <div className="card">
          <SectionTitle right={<span className="small muted">{done}/{expected}</span>}>Tâches du jour</SectionTitle>
          {routines.length ? (
            <div style={{ marginTop: 4 }}>
              {routines.map(({ routine, status, carried }) => (
                <TaskRow
                  key={routine.id}
                  routine={routine}
                  status={status}
                  carried={carried}
                  onStatus={(s) => setRoutineStatus(today, routine.id, s)}
                  onEdit={() => setEditing(routine)}
                />
              ))}
            </div>
          ) : (
            <Empty title="Aucune tâche prévue aujourd’hui">Ajoute une tâche avec le bouton « Tâche ».</Empty>
          )}
          <button className="btn ghost sm" style={{ marginTop: 6, paddingLeft: 0 }} onClick={() => nav.push({ name: 'routines' })}>
            Gérer les routines <IconChevron style={{ width: 16 }} />
          </button>
        </div>

        <div className="card">
          <SectionTitle>Bilan de la semaine</SectionTitle>
          <div className="week" style={{ margin: '10px 0' }}>
            {week.map((k, i) => (
              <div key={k} className={`d${programFor(data, k) ? ' plan' : ''}${sessionDays.has(k) ? ' done' : ''}${k === today ? ' today' : ''}`}>
                {WEEKDAYS_SHORT[i]}
              </div>
            ))}
          </div>
          <div className="stat-grid">
            <div className="stat">
              <div className="v">{weekSessions} / {plannedThisWeek || '—'}</div>
              <div className="l">Séances (planning)</div>
            </div>
            <div className="stat">
              <div className="v">{data.settings.abWeeks ? `Semaine ${letter}` : '—'}</div>
              <div className="l">{data.settings.abWeeks ? 'Alternance A / B' : 'Semaine type unique'}</div>
            </div>
          </div>
        </div>

        {last && (
          <>
            <SectionTitle right={<button className="btn ghost sm" onClick={() => nav.push({ name: 'history' })}>Historique</button>}>Dernière séance</SectionTitle>
            <div className="list-item clickable" onClick={() => nav.push({ name: 'session', id: last.id })}>
              <div className="icon-box"><IconHistory /></div>
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
        <div className="fab-space" />
      </div>
      <button className="fab" onClick={() => setEditing({ id: uid(), name: '', recurrence: { kind: 'once', date: today }, createdAt: Date.now() })}>
        <IconPlus /> Tâche
      </button>
      {editing && <RoutineEditor routine={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
