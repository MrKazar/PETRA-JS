import { useState } from 'react'
import { useData, update } from '../data/store'
import { useNav } from '../nav'
import { saveProgram, saveSettings } from '../logic/actions'
import { weekLetter, type WeekLetter } from '../logic/planner'
import { addDays, dateKey, uid, WEEKDAYS, weekday } from '../logic/util'
import { groupLabel } from '../data/catalog'
import { estimateDuration, formatEstimate } from '../logic/session'
import { Empty, Header, SectionTitle, Sheet, Toggle } from '../ui/kit'
import { IconChevron, IconDumbbell, IconHistory, IconPlus, IconTrophy } from '../ui/icons'

export function ProgramsScreen() {
  const data = useData()
  const nav = useNav()
  const today = dateKey()
  const s = data.settings
  const current = weekLetter(s, today)
  const [editWeek, setEditWeek] = useState<WeekLetter>(current)
  const [pickDay, setPickDay] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const shownWeek: WeekLetter = s.abWeeks ? editWeek : 'A'
  const plan = shownWeek === 'B' ? data.weekPlanB : data.weekPlan
  const nameOf = (id?: string | null) => (id ? data.programs.find((p) => p.id === id)?.name : undefined)

  const setDay = (day: number, id: string | null) =>
    update((d) => (shownWeek === 'B' ? { ...d, weekPlanB: { ...d.weekPlanB, [day]: id ?? undefined } } : { ...d, weekPlan: { ...d.weekPlan, [day]: id ?? undefined } }))
  /** Fait de la semaine en cours une semaine A ou B. */
  const setCurrentWeek = (letter: WeekLetter) => {
    const monday = addDays(today, -weekday(today))
    saveSettings({ weekAAnchor: letter === 'A' ? monday : addDays(monday, -7) })
  }

  const create = () => {
    if (!name.trim()) return
    const id = uid()
    saveProgram({ id, name: name.trim(), exercises: [], createdAt: Date.now() })
    setCreating(false)
    setName('')
    nav.push({ name: 'program', id })
  }

  return (
    <div className="screen">
      <div className="screen-inner">
        <Header title="Programmes" sub="Tes séances et ton planning" />

        <SectionTitle>Planning</SectionTitle>
        <div className="card stack">
          <div className="row">
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Alternance semaine A / semaine B</div>
              <div className="small muted">Deux semaines types qui alternent.</div>
            </div>
            <Toggle on={s.abWeeks} onChange={(v) => saveSettings({ abWeeks: v })} label="Alternance A / B" />
          </div>
          {s.abWeeks && (
            <>
              <div className="row small">
                <span className="grow muted">
                  Cette semaine : <b style={{ color: 'var(--text)' }}>semaine {current}</b>
                </span>
                <button className="btn sm" onClick={() => setCurrentWeek(current === 'A' ? 'B' : 'A')}>Passer en {current === 'A' ? 'B' : 'A'}</button>
              </div>
              <div className="seg">
                <button className={editWeek === 'A' ? 'on' : ''} onClick={() => setEditWeek('A')}>Semaine A</button>
                <button className={editWeek === 'B' ? 'on' : ''} onClick={() => setEditWeek('B')}>Semaine B</button>
              </div>
            </>
          )}
          <div>
            {WEEKDAYS.map((d, i) => {
              const n = nameOf(plan[i])
              return (
                <div key={d} className="task" style={{ minHeight: 48 }} onClick={() => setPickDay(i)}>
                  <div style={{ width: 90, fontWeight: 500 }}>{d}</div>
                  <div className={`grow ellipsis${n ? '' : ' faint'}`} style={{ fontWeight: n ? 600 : 400 }}>{n ?? 'Repos'}</div>
                  <IconChevron style={{ width: 18, color: 'var(--faint)' }} />
                </div>
              )
            })}
          </div>
        </div>

        <SectionTitle>Mes programmes</SectionTitle>
        {data.programs.length ? (
          <div className="list">
            {data.programs.map((p) => {
              const groups = [...new Set(p.exercises.map((e) => groupLabel(e.group)))].slice(0, 4)
              return (
                <div key={p.id} className="card clickable" onClick={() => nav.push({ name: 'program', id: p.id })}>
                  <div className="row">
                    <div className="icon-box"><IconDumbbell /></div>
                    <div className="grow">
                      <h3>{p.name}</h3>
                      <div className="small muted" style={{ marginTop: 2 }}>
                        {p.exercises.length} exercice{p.exercises.length > 1 ? 's' : ''} · {p.exercises.reduce((n, e) => n + e.sets.length, 0)} séries{p.exercises.length ? ` · ${formatEstimate(estimateDuration(p, s.defaultRestSec))}` : ''}
                      </div>
                      {groups.length > 0 && (
                        <div className="chips" style={{ marginTop: 8 }}>
                          {groups.map((g) => <span key={g} className="badge gold">{g}</span>)}
                        </div>
                      )}
                    </div>
                    <IconChevron style={{ width: 20, color: 'var(--faint)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card">
            <Empty icon={<IconDumbbell />} title="Aucun programme">Crée tes séances (ex. Push, Jambes, Haut du corps) avec le bouton « Programme ».</Empty>
          </div>
        )}

        <div className="row">
          <button className="btn grow" onClick={() => nav.push({ name: 'history' })}>
            <IconHistory /> Historique
          </button>
          <button className="btn grow" onClick={() => nav.push({ name: 'records' })}>
            <IconTrophy /> Records
          </button>
        </div>
        <div className="fab-space" />
      </div>

      <button className="fab" onClick={() => setCreating(true)}>
        <IconPlus /> Programme
      </button>

      <Sheet open={creating} onClose={() => setCreating(false)} title="Nouveau programme">
        <div className="stack">
          <input className="input" autoFocus placeholder="Nom de la séance (ex. Push)" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
          <button className="btn primary block" disabled={!name.trim()} onClick={create}>Créer</button>
        </div>
      </Sheet>

      <Sheet open={pickDay != null} onClose={() => setPickDay(null)} title={pickDay != null ? `${WEEKDAYS[pickDay]}${s.abWeeks ? ` · semaine ${shownWeek}` : ''}` : ''}>
        <ProgramChoices
          current={pickDay != null ? plan[pickDay] ?? null : null}
          programs={data.programs}
          onPick={(id) => {
            if (pickDay != null) setDay(pickDay, id)
            setPickDay(null)
          }}
        />
      </Sheet>
    </div>
  )
}

function ProgramChoices({ current, programs, onPick }: { current: string | null | undefined; programs: { id: string; name: string }[]; onPick: (id: string | null) => void }) {
  return (
    <div className="list">
      <button className={`list-item clickable${current === null ? ' on' : ''}`} style={{ textAlign: 'left' }} onClick={() => onPick(null)}>
        <span className="grow">Repos</span>
      </button>
      {programs.map((p) => (
        <button key={p.id} className={`list-item clickable${current === p.id ? ' on' : ''}`} style={{ textAlign: 'left' }} onClick={() => onPick(p.id)}>
          <span className="grow" style={{ fontWeight: 600 }}>{p.name}</span>
        </button>
      ))}
      {!programs.length && <div className="small muted">Crée d’abord un programme.</div>}
    </div>
  )
}
