import { useState } from 'react'
import { useData, update } from '../data/store'
import type { Recurrence, Routine, TaskStatus } from '../data/types'
import { setRoutineStatus } from '../logic/actions'
import { describeRecurrence, routinesFor } from '../logic/planner'
import { dateKey, formatShortDay, uid, WEEKDAYS } from '../logic/util'
import { useNav } from '../nav'
import { tap } from '../logic/native'
import { Empty, SectionTitle, Sheet, TopBar, confirmAction } from '../ui/kit'
import { IconCheck, IconCheckList, IconChevron, IconDots, IconPlus, IconTrash } from '../ui/icons'

/** Ligne de tâche cochable en un appui ; le menu « ⋮ » donne Reporter / Sauter / Modifier. */
export function TaskRow({ routine, status, carried, onStatus, onEdit }: { routine: Routine; status?: TaskStatus; carried?: boolean; onStatus: (s: TaskStatus | undefined) => void; onEdit: () => void }) {
  const [menu, setMenu] = useState(false)
  const inactive = status === 'saute' || status === 'reporte'
  const extra = [status === 'saute' ? 'Sautée aujourd’hui' : status === 'reporte' ? 'Reportée à demain' : null, carried ? 'Reportée d’hier' : null, routine.time ?? null]
    .filter(Boolean)
    .join(' · ')
  const pick = (s: TaskStatus | undefined) => {
    setMenu(false)
    onStatus(s)
  }
  return (
    <div className={`task${status === 'fait' ? ' done' : ''}${inactive ? ' inactive' : ''}`} onClick={() => { tap(); onStatus(status === 'fait' ? undefined : 'fait') }}>
      <span className="circle">{status === 'fait' && <IconCheck />}</span>
      <div className="grow">
        <div className="title">{routine.name}</div>
        {extra && <div className="small muted">{extra}</div>}
      </div>
      <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn" aria-label="Options de la tâche" onClick={() => setMenu(!menu)}>
          <IconDots />
        </button>
        {menu && (
          <div className="menu">
            {status && <button onClick={() => pick(undefined)}>Remettre à faire</button>}
            <button onClick={() => pick('reporte')}>Reporter à demain</button>
            <button onClick={() => pick('saute')}>Sauter aujourd’hui</button>
            <button onClick={() => { setMenu(false); onEdit() }}>Modifier</button>
          </div>
        )}
      </div>
    </div>
  )
}

export function RoutinesScreen() {
  const data = useData()
  const nav = useNav()
  const today = dateKey()
  const todays = routinesFor(data, today)
  const [editing, setEditing] = useState<Routine | null>(null)

  const blank = (): Routine => ({ id: uid(), name: '', recurrence: { kind: 'daily' }, createdAt: Date.now() })

  return (
    <div className="screen">
      <div className="screen-inner">
        <TopBar title="Routines et tâches" onBack={nav.pop} />
        <div className="card">
          <SectionTitle>Aujourd’hui</SectionTitle>
          {todays.length ? (
            todays.map(({ routine, status, carried }) => (
              <TaskRow key={routine.id} routine={routine} status={status} carried={carried} onStatus={(s) => setRoutineStatus(today, routine.id, s)} onEdit={() => setEditing(routine)} />
            ))
          ) : (
            <div className="muted small" style={{ paddingTop: 8 }}>Rien de prévu aujourd’hui.</div>
          )}
        </div>

        <SectionTitle>Toutes mes routines</SectionTitle>
        {data.routines.length ? (
          <div className="list">
            {data.routines.map((r) => (
              <div key={r.id} className="list-item clickable" onClick={() => setEditing(r)}>
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div className="small muted">
                    {describeRecurrence(r.recurrence)}
                    {r.recurrence.kind === 'once' ? ` (${formatShortDay(r.recurrence.date)})` : ''}
                    {r.time ? ` · ${r.time}` : ''}
                  </div>
                </div>
                <IconChevron style={{ width: 18, color: 'var(--faint)' }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <Empty icon={<IconCheckList />} title="Aucune routine">Ajoute tes habitudes : étirements, eau, sommeil, marche…</Empty>
          </div>
        )}
        <div className="fab-space" />
      </div>
      <button className="fab" onClick={() => setEditing(blank())}>
        <IconPlus /> Routine
      </button>
      {editing && <RoutineEditor routine={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

export function RoutineEditor({ routine, onClose }: { routine: Routine; onClose: () => void }) {
  const data = useData()
  const exists = data.routines.some((r) => r.id === routine.id)
  const [name, setName] = useState(routine.name)
  const [time, setTime] = useState(routine.time ?? '')
  const [rec, setRec] = useState<Recurrence>(routine.recurrence)

  const save = () => {
    if (!name.trim()) return
    const r: Routine = { ...routine, name: name.trim(), time: time || undefined, recurrence: rec }
    update((d) => ({ ...d, routines: exists ? d.routines.map((x) => (x.id === r.id ? r : x)) : [...d.routines, r] }))
    onClose()
  }
  const remove = () => {
    if (!confirmAction(`Supprimer la routine « ${routine.name} » ?`)) return
    update((d) => ({ ...d, routines: d.routines.filter((x) => x.id !== routine.id) }))
    onClose()
  }

  const days = rec.kind === 'weekdays' ? rec.days : []
  const toggleDay = (i: number) => {
    const next = days.includes(i) ? days.filter((d) => d !== i) : [...days, i].sort()
    setRec({ kind: 'weekdays', days: next })
  }

  return (
    <Sheet open onClose={onClose} title={exists ? 'Modifier' : routine.recurrence.kind === 'once' ? 'Nouvelle tâche' : 'Nouvelle routine'}>
      <div className="stack">
        <label className="field">
          <span>Nom</span>
          <input className="input" autoFocus value={name} placeholder="Ex. 10 min d’étirements" onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Heure (facultatif)</span>
          <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <div className="field">
          <span>Récurrence</span>
          <div className="chips">
            <button className={`chip${rec.kind === 'daily' ? ' on' : ''}`} onClick={() => setRec({ kind: 'daily' })}>Tous les jours</button>
            <button className={`chip${rec.kind === 'weekdays' ? ' on' : ''}`} onClick={() => setRec({ kind: 'weekdays', days: days.length ? days : [0, 2, 4] })}>Certains jours</button>
            <button className={`chip${rec.kind === 'once' ? ' on' : ''}`} onClick={() => setRec({ kind: 'once', date: rec.kind === 'once' ? rec.date : dateKey() })}>Une fois</button>
          </div>
        </div>
        {rec.kind === 'weekdays' && (
          <div className="chips">
            {WEEKDAYS.map((d, i) => (
              <button key={d} className={`chip${days.includes(i) ? ' on' : ''}`} onClick={() => toggleDay(i)}>{d.slice(0, 3)}</button>
            ))}
          </div>
        )}
        {rec.kind === 'once' && (
          <label className="field">
            <span>Date</span>
            <input className="input" type="date" value={rec.date} onChange={(e) => setRec({ kind: 'once', date: e.target.value })} />
          </label>
        )}
        <button className="btn primary block big" disabled={!name.trim() || (rec.kind === 'weekdays' && !days.length)} onClick={save}>Enregistrer</button>
        {exists && (
          <button className="btn danger block" onClick={remove}>
            <IconTrash /> Supprimer
          </button>
        )}
      </div>
    </Sheet>
  )
}
