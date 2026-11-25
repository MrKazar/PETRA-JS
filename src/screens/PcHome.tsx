import { useMemo, useState } from 'react'
import { useData } from '../data/store'
import type { AppData, Routine, Session } from '../data/types'
import { useNav } from '../nav'
import { beginSession, setRoutineStatus } from '../logic/actions'
import { programFor, routinesFor, weekLetter } from '../logic/planner'
import { estimateDuration, formatEstimate, personalRecords, statsOf } from '../logic/session'
import { addDays, dateKey, formatDay, formatDuration, parseKey, uid, WEEKDAYS_SHORT, weekday } from '../logic/util'
import { LEVELS, REGIONS, doneWork, levelOf, regionLabel, scaleWork, type RegionId } from '../logic/body'
import { project, weeklyTonnage } from '../logic/stats'
import { BodyFigure } from '../ui/BodyMap'
import { WeekBars } from '../ui/Charts'
import { Header, Progress } from '../ui/kit'
import { IconCheck, IconChevron, IconDumbbell, IconHistory, IconPlay, IconPlus } from '../ui/icons'
import { RoutineEditor, TaskRow } from './Routines'
import { LevelCard, achievementsOn } from './Achievements'

/**
 * PCTRA : l'accueil pensé pour le grand écran. Tout ce qui sert à gérer les séances passées et à
 * venir et à suivre la progression, d'un coup d'œil, sur trois colonnes.
 */

const DAY = 86400000
const WEEK = 7 * DAY
const kg = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} kg`
const tonnes = (n: number) => (n >= 10000 ? `${(n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t` : kg(n))
const shortDate = (t: number) => new Date(t).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

function greeting(name: string): string {
  const hello = new Date().getHours() >= 18 ? 'Bonsoir' : 'Bonjour'
  return `${hello}${name ? ` ${name}` : ''}. Plus fort aujourd’hui, plus utile demain.`
}

/** Semaines d'affilée (en remontant depuis la semaine en cours ou la précédente) avec au moins une séance. */
function streakWeeks(sessions: Session[], today: string): number {
  const weeks = new Set(sessions.map((s) => addDays(dateKey(new Date(s.startedAt)), -weekday(dateKey(new Date(s.startedAt))))))
  let monday = addDays(today, -weekday(today))
  if (!weeks.has(monday)) monday = addDays(monday, -7)
  let n = 0
  while (weeks.has(monday)) {
    n++
    monday = addDays(monday, -7)
  }
  return n
}

export function PcHome({ onEmblem, extra }: { onEmblem?: () => void; extra?: React.ReactNode }) {
  const data = useData()
  const nav = useNav()
  const today = dateKey()
  const now = Date.now()
  const [editing, setEditing] = useState<Routine | null>(null)

  const monday = addDays(today, -weekday(today))
  const mondayAt = parseKey(monday).getTime()
  const weekSessions = data.sessions.filter((s) => s.startedAt >= mondayAt)
  const plannedThisWeek = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((k) => programFor(data, k)).length

  const tonnage = useMemo(() => weeklyTonnage(data.sessions, 12, now), [data.sessions]) // eslint-disable-line react-hooks/exhaustive-deps
  const thisWeekT = tonnage[tonnage.length - 1]?.tonnage ?? 0
  const prev4 = tonnage.slice(-5, -1).filter((w) => w.tonnage > 0)
  const avgT = prev4.length ? prev4.reduce((s, w) => s + w.tonnage, 0) / prev4.length : 0
  const records = useMemo(() => personalRecords(data.sessions), [data.sessions])
  const recentRecords = records.filter((r) => r.date >= now - 30 * DAY).sort((a, b) => b.date - a.date)
  const streak = streakWeeks(data.sessions, today)

  return (
    <div className="screen">
      <div className="screen-inner pc-home">
        <Header title="PCTRA — Tableau de bord" sub={formatDay(today).replace(/^./, (c) => c.toUpperCase())} onEmblem={onEmblem} />
        <div className="muted">{greeting(data.settings.name)}</div>
        {extra}

        <div className="pc-kpis">
          <Kpi label="Séances cette semaine" value={`${weekSessions.length} / ${plannedThisWeek || '—'}`} hint={plannedThisWeek ? 'faites / prévues au planning' : 'aucun planning'} />
          <Kpi
            label="Tonnage de la semaine"
            value={tonnes(thisWeekT)}
            hint={avgT ? `moyenne des 4 semaines d’avant : ${tonnes(avgT)}` : 'pas encore de moyenne'}
            tone={avgT && thisWeekT >= avgT ? 'up' : undefined}
          />
          <Kpi label="Régularité" value={`${streak} sem.`} hint={streak ? 'd’affilée avec au moins une séance' : 'une séance cette semaine pour lancer la série'} />
          <Kpi label="Records sur 30 jours" value={String(recentRecords.length)} hint={recentRecords[0] ? `dernier : ${recentRecords[0].name}` : 'aucun nouveau record'} onClick={() => nav.push({ name: 'records' })} />
        </div>

        <div className="pc-grid">
          <div className="pc-col">
            <TodayCard data={data} today={today} />
            <TasksCard data={data} today={today} onEdit={setEditing} />
            {achievementsOn(data) && <LevelCard onOpen={() => nav.push({ name: 'achievements' })} />}
          </div>

          <div className="pc-col">
            <WeeksCard data={data} today={today} />
            <RecentCard sessions={data.sessions} />
          </div>

          <div className="pc-col">
            <BodyCard data={data} now={now} />
            <div className="card">
              <div className="row">
                <h3 className="grow">Tonnage par semaine</h3>
                <button className="btn ghost sm" onClick={() => nav.reset({ name: 'stats' })}>Graphiques <IconChevron style={{ width: 16 }} /></button>
              </div>
              {tonnage.some((w) => w.tonnage > 0) ? (
                <WeekBars height={170} format={tonnes} bars={tonnage.map((w) => ({ start: w.start, value: w.tonnage, hint: `semaine du ${new Date(w.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${w.sessions} séance${w.sessions > 1 ? 's' : ''}` }))} />
              ) : (
                <div className="small muted" style={{ marginTop: 8 }}>Le graphique se remplit avec tes séances chargées.</div>
              )}
            </div>
            <GoalsCard data={data} now={now} />
          </div>
        </div>
      </div>
      {editing && <RoutineEditor routine={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function Kpi({ label, value, hint, tone, onClick }: { label: string; value: string; hint: string; tone?: 'up'; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`card pc-kpi${onClick ? ' clickable' : ''}`} onClick={onClick}>
      <div className="small muted">{label}</div>
      <div className="pc-kpi-v">{value}</div>
      <div className={`small ${tone === 'up' ? 'pc-up' : 'faint'}`}>{hint}</div>
    </Tag>
  )
}

/** La séance du jour : démarrer, reprendre ou revoir. */
function TodayCard({ data, today }: { data: AppData; today: string }) {
  const nav = useNav()
  const program = programFor(data, today)
  const letter = weekLetter(data.settings, today)
  const doneSession = data.sessions
    .filter((s) => dateKey(new Date(s.startedAt)) === today && (!program || s.programId === program.id))
    .sort((a, b) => b.startedAt - a.startedAt)[0]
  const nextPlanned = Array.from({ length: 14 }, (_, i) => addDays(today, i + 1)).find((k) => programFor(data, k))
  const start = (p = program) => {
    if (!data.active) beginSession(p)
    nav.push({ name: 'workout' })
  }

  let title: string
  let sub: string
  let action: React.ReactNode
  if (data.active) {
    title = data.active.programName
    sub = 'Séance en cours sur le téléphone ou ici'
    action = <button className="btn primary block" onClick={() => nav.push({ name: 'workout' })}><IconPlay /> Reprendre</button>
  } else if (program && doneSession) {
    title = 'Séance du jour faite'
    sub = program.name
    action = <button className="btn block" onClick={() => nav.push({ name: 'session', id: doneSession.id })}><IconHistory /> Voir le résumé</button>
  } else if (program) {
    title = program.name
    sub = `Prévue aujourd’hui${data.settings.abWeeks ? ` · semaine ${letter}` : ''} · ${program.exercises.length} exercice${program.exercises.length > 1 ? 's' : ''}${program.exercises.length ? ` · ${formatEstimate(estimateDuration(program, data.settings.defaultRestSec))}` : ''}`
    action = (
      <div className="row" style={{ gap: 8 }}>
        <button className="btn grow" onClick={() => nav.push({ name: 'program', id: program.id })}>Préparer</button>
        <button className="btn primary grow" onClick={() => start()}><IconPlay /> Démarrer</button>
      </div>
    )
  } else {
    title = data.programs.length ? 'Repos aujourd’hui' : 'Aucun programme'
    sub = data.programs.length
      ? nextPlanned ? `Prochaine : ${formatDay(nextPlanned)} · ${programFor(data, nextPlanned)?.name}` : 'Rien de prévu sur les 2 semaines'
      : 'Crée ton premier programme d’entraînement.'
    action = (
      <div className="row" style={{ gap: 8 }}>
        <button className="btn grow" onClick={() => nav.reset({ name: 'programs' })}>{data.programs.length ? 'Planning' : 'Programmes'}</button>
        <button className="btn grow" onClick={() => start(null)}>Séance libre</button>
      </div>
    )
  }
  return (
    <div className={`card${data.active || (program && !doneSession) ? ' accent' : ''}`}>
      <div className="eyebrow">Aujourd’hui</div>
      <div className="row" style={{ marginTop: 6 }}>
        <div className="icon-box"><IconDumbbell /></div>
        <div className="grow" style={{ minWidth: 0 }}>
          <h3>{title}</h3>
          <div className="small muted">{sub}</div>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>{action}</div>
    </div>
  )
}

function TasksCard({ data, today, onEdit }: { data: AppData; today: string; onEdit: (r: Routine) => void }) {
  const nav = useNav()
  const routines = routinesFor(data, today)
  const expected = routines.filter((r) => r.status !== 'saute' && r.status !== 'reporte').length
  const done = routines.filter((r) => r.status === 'fait').length
  return (
    <div className="card">
      <div className="row">
        <h3 className="grow">Tâches du jour</h3>
        <span className="small muted">{done}/{expected}</span>
      </div>
      {expected > 0 && <div style={{ marginTop: 8 }}><Progress value={done / expected} /></div>}
      {routines.length ? (
        <div style={{ marginTop: 4 }}>
          {routines.map(({ routine, status, carried }) => (
            <TaskRow key={routine.id} routine={routine} status={status} carried={carried} onStatus={(s) => setRoutineStatus(today, routine.id, s)} onEdit={() => onEdit(routine)} />
          ))}
        </div>
      ) : (
        <div className="small muted" style={{ marginTop: 8 }}>Aucune tâche prévue aujourd’hui.</div>
      )}
      <div className="row" style={{ marginTop: 6 }}>
        <button className="btn ghost sm" style={{ paddingLeft: 0 }} onClick={() => nav.push({ name: 'routines' })}>Gérer les routines <IconChevron style={{ width: 16 }} /></button>
        <div className="grow" />
        <button className="btn sm" onClick={() => onEdit({ id: uid(), name: '', recurrence: { kind: 'once', date: today }, createdAt: Date.now() })}><IconPlus /> Tâche</button>
      </div>
    </div>
  )
}

/** Semaine passée, en cours et suivante : ce qui a été fait, raté et ce qui arrive. Chaque jour est cliquable. */
function WeeksCard({ data, today }: { data: AppData; today: string }) {
  const nav = useNav()
  const monday = addDays(today, -weekday(today))
  const byDay = new Map<string, Session[]>()
  for (const s of data.sessions) {
    const k = dateKey(new Date(s.startedAt))
    byDay.set(k, [...(byDay.get(k) ?? []), s])
  }
  const rows = [
    { label: 'Semaine dernière', start: addDays(monday, -7) },
    { label: 'Cette semaine', start: monday },
    { label: 'Semaine prochaine', start: addDays(monday, 7) },
  ]
  return (
    <div className="card">
      <div className="row">
        <h3 className="grow">Séances passées et à venir</h3>
        <button className="btn ghost sm" onClick={() => nav.reset({ name: 'programs' })}>Planning <IconChevron style={{ width: 16 }} /></button>
      </div>
      <div className="pc-cal">
        <div />
        {WEEKDAYS_SHORT.map((d, i) => <div key={i} className="pc-cal-h">{d}</div>)}
        {rows.map((r) => (
          <Row key={r.start} label={`${r.label}${data.settings.abWeeks ? ` · ${weekLetter(data.settings, r.start)}` : ''}`}>
            {Array.from({ length: 7 }, (_, i) => {
              const k = addDays(r.start, i)
              const done = byDay.get(k) ?? []
              const planned = programFor(data, k)
              const past = k < today
              const state = done.length ? 'done' : planned ? (past ? 'missed' : 'plan') : 'rest'
              const open = () => (done.length ? nav.push({ name: 'session', id: done[0].id }) : planned && nav.push({ name: 'program', id: planned.id }))
              // Le nom court (avant « · ») tient dans la case ; le nom complet est dans l'info-bulle.
              const name = (done[0]?.programName ?? planned?.name)?.split(' · ')[0]
              return (
                <button
                  key={k}
                  className={`pc-day ${state}${k === today ? ' today' : ''}`}
                  disabled={state === 'rest'}
                  onClick={open}
                  title={done.length ? `${done[0].programName} · faite` : planned ? `${planned.name} · ${past ? 'pas faite' : 'prévue'}` : 'Repos'}
                >
                  <span className="pc-day-n">{parseKey(k).getDate()}</span>
                  <span className="pc-day-name">{name ?? ''}</span>
                  {state === 'done' && <IconCheck className="pc-day-ic" />}
                </button>
              )
            })}
          </Row>
        ))}
      </div>
      <div className="pc-cal-legend small muted">
        <span><i className="done" /> faite</span>
        <span><i className="plan" /> prévue</span>
        <span><i className="missed" /> pas faite</span>
      </div>
    </div>
  )
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <>
    <div className="pc-cal-row small muted">{label}</div>
    {children}
  </>
)

function RecentCard({ sessions }: { sessions: Session[] }) {
  const nav = useNav()
  const recent = [...sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 6)
  return (
    <div className="card">
      <div className="row">
        <h3 className="grow">Dernières séances</h3>
        <button className="btn ghost sm" onClick={() => nav.push({ name: 'history' })}>Historique <IconChevron style={{ width: 16 }} /></button>
      </div>
      {recent.length ? (
        <table className="pc-table">
          <thead>
            <tr><th>Date</th><th>Séance</th><th>Durée</th><th>Séries</th><th>Volume</th></tr>
          </thead>
          <tbody>
            {recent.map((s) => {
              const st = statsOf(s)
              return (
                <tr key={s.id} onClick={() => nav.push({ name: 'session', id: s.id })}>
                  <td className="muted">{shortDate(s.startedAt)}</td>
                  <td className="ellipsis" style={{ fontWeight: 600 }}>{s.programName}</td>
                  <td>{formatDuration(st.durationSec)}</td>
                  <td>{st.setsDone}</td>
                  <td>{st.volumeKg ? kg(st.volumeKg) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <div className="small muted" style={{ marginTop: 8 }}>Aucune séance pour l’instant.</div>
      )}
    </div>
  )
}

/** Le schéma du corps en petit (moyenne des 4 dernières semaines) et les muscles en retard. */
function BodyCard({ data, now }: { data: AppData; now: number }) {
  const nav = useNav()
  const work = useMemo(() => scaleWork(doneWork(data.sessions, now - 4 * WEEK, now + 1), 4), [data.sessions]) // eslint-disable-line react-hooks/exhaustive-deps
  const lv = (id: RegionId) => levelOf(work[id].sets)
  const total = REGIONS.reduce((n, r) => n + work[r.id].sets, 0)
  const neglected = REGIONS.filter((r) => lv(r.id) <= 1)
  const label = (id: RegionId) => `${regionLabel(id)} : ${String(Math.round(work[id].sets * 10) / 10).replace('.', ',')} séries/sem.`
  const open = () => nav.reset({ name: 'body' })
  return (
    <div className="card">
      <div className="row">
        <h3 className="grow">Corps · 4 dernières semaines</h3>
        <button className="btn ghost sm" onClick={open}>Détail <IconChevron style={{ width: 16 }} /></button>
      </div>
      <div className="bm-figures pc-body">
        <BodyFigure side="front" levelOf={lv} onSelect={open} labelOf={label} />
        <BodyFigure side="back" levelOf={lv} onSelect={open} labelOf={label} />
        <div className="bm-legend">
          {LEVELS.map((l) => (
            <span key={l.level}><i className={`bm-swatch lv${l.level}`} />{l.label}</span>
          ))}
        </div>
      </div>
      {total > 0 && neglected.length > 0 && (
        <>
          <div className="small muted" style={{ marginTop: 10 }}>En retard (moins de 4 séries par semaine)</div>
          <div className="pc-chips">
            {neglected.slice(0, 8).map((r) => <button key={r.id} className="chip" onClick={open}>{r.label}</button>)}
            {neglected.length > 8 && <button className="chip" onClick={open}>+{neglected.length - 8}</button>}
          </div>
        </>
      )}
    </div>
  )
}

function GoalsCard({ data, now }: { data: AppData; now: number }) {
  const nav = useNav()
  const goals = data.goals ?? []
  return (
    <div className="card">
      <div className="row">
        <h3 className="grow">Objectifs</h3>
        <button className="btn ghost sm" onClick={() => nav.reset({ name: 'stats' })}>{goals.length ? 'Tous' : 'Créer'} <IconChevron style={{ width: 16 }} /></button>
      </div>
      {!goals.length && <div className="small muted" style={{ marginTop: 8 }}>Fixe un objectif de charge ou de 1RM dans Graphiques : PCTRA calcule quand tu l’atteindras.</div>}
      {goals.slice(0, 4).map((g) => {
        const p = project(g, data.sessions, now)
        const from = p.start ?? 0
        const ratio = p.reached ? 1 : p.current !== undefined && g.target > from ? Math.max(0, (p.current - from) / (g.target - from)) : 0
        const eta = p.reached
          ? 'atteint'
          : p.eta
            ? `vers le ${new Date(p.eta).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: new Date(p.eta).getFullYear() !== new Date(now).getFullYear() ? 'numeric' : undefined })}`
            : p.tooFew ? 'pas assez de séances' : 'tendance à plat'
        return (
          <div key={g.id} className="pc-goal">
            <div className="row">
              <div className="grow ellipsis" style={{ fontWeight: 600 }}>{g.name}</div>
              <div className="small muted">{p.current !== undefined ? kg(p.current) : '—'} / {kg(g.target)}{g.kind === 'e1rm' ? ' (1RM)' : ''}</div>
            </div>
            <Progress value={ratio} />
            <div className={`small ${p.reached ? 'pc-up' : 'faint'}`}>{eta}</div>
          </div>
        )
      })}
    </div>
  )
}
