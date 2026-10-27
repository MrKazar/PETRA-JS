import { useState } from 'react'
import { useData, update } from '../data/store'
import { useNav } from '../nav'
import { programFor, routinesFor } from '../logic/planner'
import { addDays, dateKey, formatShortDay, WEEKDAYS, weekday } from '../logic/util'
import { Sheet, TopBar } from '../ui/kit'
import { IconChevron } from '../ui/icons'

export function PlanScreen() {
  const data = useData()
  const nav = useNav()
  const today = dateKey()
  const [pickDay, setPickDay] = useState<number | null>(null)
  const [pickDate, setPickDate] = useState<string | null>(null)
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i))
  const doneDays = new Set(data.sessions.map((s) => dateKey(new Date(s.startedAt))))

  const setWeek = (day: number, id: string | undefined) => update((d) => ({ ...d, weekPlan: { ...d.weekPlan, [day]: id } }))
  const setOverride = (date: string, value: string | null | 'default') =>
    update((d) => {
      const o = { ...d.planOverrides }
      if (value === 'default') delete o[date]
      else o[date] = value
      return { ...d, planOverrides: o }
    })

  const name = (id?: string | null) => (id ? data.programs.find((p) => p.id === id)?.name : undefined)

  return (
    <div className="screen">
      <div className="screen-inner">
        <TopBar title="Plan" />
        {!data.programs.length && (
          <div className="card accent">
            <h3>Commence par un programme</h3>
            <p className="muted small">Crée tes séances dans l’onglet Programmes, puis choisis ici lesquelles faire chaque jour.</p>
            <button className="btn primary" onClick={() => nav.reset({ name: 'programs' })}>Aller aux programmes</button>
          </div>
        )}

        <div className="section-title">Ma semaine type</div>
        <div className="list">
          {WEEKDAYS.map((d, i) => {
            const n = name(data.weekPlan[i])
            return (
              <div key={d} className="list-item clickable" onClick={() => setPickDay(i)}>
                <div style={{ width: 84, fontWeight: 700 }}>{d}</div>
                <div className={`grow ellipsis${n ? '' : ' faint'}`} style={{ fontWeight: n ? 600 : 400 }}>{n ?? 'Repos'}</div>
                <IconChevron style={{ width: 18, color: 'var(--faint)' }} />
              </div>
            )
          })}
        </div>

        <div className="section-title">Les deux prochaines semaines</div>
        <div className="list">
          {days.map((k) => {
            const p = programFor(data, k)
            const overridden = k in data.planOverrides
            const r = routinesFor(data, k).length
            return (
              <div key={k} className="list-item clickable" onClick={() => setPickDate(k)}>
                <div style={{ width: 84 }}>
                  <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{k === today ? 'Aujourd’hui' : formatShortDay(k)}</div>
                </div>
                <div className="grow">
                  <div className={`ellipsis${p ? '' : ' faint'}`} style={{ fontWeight: p ? 600 : 400 }}>{p?.name ?? 'Repos'}</div>
                  <div className="row small muted" style={{ gap: 6, marginTop: 2 }}>
                    {overridden && <span className="badge blue">modifié</span>}
                    {doneDays.has(k) && <span className="badge green">fait</span>}
                    {r > 0 && <span>{r} routine{r > 1 ? 's' : ''}</span>}
                  </div>
                </div>
                <IconChevron style={{ width: 18, color: 'var(--faint)' }} />
              </div>
            )
          })}
        </div>
      </div>

      <Sheet open={pickDay != null} onClose={() => setPickDay(null)} title={pickDay != null ? `Chaque ${WEEKDAYS[pickDay].toLowerCase()}` : ''}>
        <ProgramChoices
          current={pickDay != null ? data.weekPlan[pickDay] ?? null : null}
          programs={data.programs}
          onPick={(id) => {
            if (pickDay != null) setWeek(pickDay, id ?? undefined)
            setPickDay(null)
          }}
        />
      </Sheet>

      <Sheet open={pickDate != null} onClose={() => setPickDate(null)} title={pickDate ? `Le ${formatShortDay(pickDate)}` : ''}>
        {pickDate && (
          <>
            <ProgramChoices
              current={pickDate in data.planOverrides ? data.planOverrides[pickDate] : undefined}
              programs={data.programs}
              onPick={(id) => {
                setOverride(pickDate, id)
                setPickDate(null)
              }}
            />
            {pickDate in data.planOverrides && (
              <button className="btn block" style={{ marginTop: 10 }} onClick={() => { setOverride(pickDate, 'default'); setPickDate(null) }}>
                Revenir à la semaine type ({name(data.weekPlan[weekday(pickDate)]) ?? 'Repos'})
              </button>
            )}
          </>
        )}
      </Sheet>
    </div>
  )
}

function ProgramChoices({ current, programs, onPick }: { current: string | null | undefined; programs: { id: string; name: string }[]; onPick: (id: string | null) => void }) {
  return (
    <div className="list">
      <button className={`list-item clickable${current === null ? ' on' : ''}`} style={{ textAlign: 'left', borderColor: current === null ? 'var(--gold)' : undefined }} onClick={() => onPick(null)}>
        <span className="grow">Repos</span>
      </button>
      {programs.map((p) => (
        <button key={p.id} className="list-item clickable" style={{ textAlign: 'left', borderColor: current === p.id ? 'var(--gold)' : undefined }} onClick={() => onPick(p.id)}>
          <span className="grow" style={{ fontWeight: 600 }}>{p.name}</span>
          <span className="small muted">{p.id === current ? 'actuel' : ''}</span>
        </button>
      ))}
    </div>
  )
}
