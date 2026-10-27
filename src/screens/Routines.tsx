import { useState } from 'react'
import { useData, update } from '../data/store'
import type { Recurrence, Routine, TaskStatus } from '../data/types'
import { setRoutineStatus } from '../logic/actions'
import { describeRecurrence, routinesFor } from '../logic/planner'
import { dateKey, formatShortDay, uid, WEEKDAYS } from '../logic/util'
import { Empty, Sheet, TopBar, confirmAction } from '../ui/kit'
import { IconCheck, IconCheckList, IconPlus, IconPostpone, IconTrash, IconX } from '../ui/icons'

export function RoutineStatusButtons({ status, onChange }: { status?: TaskStatus; onChange: (s: TaskStatus | undefined) => void }) {
  const b = (s: TaskStatus, label: string, icon: React.ReactNode) => (
    <button className={`${s}${status === s ? ' on' : ''}`} aria-label={label} title={label} onClick={() => onChange(status === s ? undefined : s)}>
      {icon}
    </button>
  )
  return (
    <div className="status-btns">
      {b('fait', 'Fait', <IconCheck />)}
      {b('reporte', 'Reporter à demain', <IconPostpone />)}
      {b('saute', 'Sauter', <IconX />)}
    </div>
  )
}

export function RoutinesScreen() {
  const data = useData()
  const today = dateKey()
  const todays = routinesFor(data, today)
  const [editing, setEditing] = useState<Routine | null>(null)

  const blank = (): Routine => ({ id: uid(), name: '', recurrence: { kind: 'daily' }, createdAt: Date.now() })

  return (
    <div className="screen">
      <div className="screen-inner">
        <TopBar title="Routines" />
        <div className="section-title">Aujourd’hui</div>
        {todays.length ? (
          <div className="list">
            {todays.map(({ routine, status, carried }) => (
              <div className="list-item" key={routine.id}>
                <div className="grow">
                  <div style={{ fontWeight: 600, textDecoration: status === 'fait' ? 'line-through' : undefined }}>{routine.name}</div>
                  <div className="small muted">
                    {routine.time ?? 'Dans la journée'}
                    {carried ? ' · reportée d’hier' : ''}
                    {status === 'reporte' ? ' · reportée à demain' : status === 'saute' ? ' · sautée' : ''}
                  </div>
                </div>
                <RoutineStatusButtons status={status} onChange={(s) => setRoutineStatus(today, routine.id, s)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="muted small">Rien de prévu aujourd’hui.</div>
        )}

        <div className="section-title">Toutes mes routines</div>
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
              </div>
            ))}
          </div>
        ) : (
          <Empty icon={<IconCheckList />}>Ajoute tes habitudes : étirements, eau, sommeil, marche…</Empty>
        )}
        <div className="fab-space" />
      </div>
      <button className="fab" aria-label="Nouvelle routine" onClick={() => setEditing(blank())}>
        <IconPlus />
      </button>
      {editing && <RoutineEditor routine={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function RoutineEditor({ routine, onClose }: { routine: Routine; onClose: () => void }) {
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
    <Sheet open onClose={onClose} title={exists ? 'Modifier la routine' : 'Nouvelle routine'}>
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
