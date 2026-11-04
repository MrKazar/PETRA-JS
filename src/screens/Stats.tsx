import { useMemo, useState } from 'react'
import { update, useData } from '../data/store'
import { useNav } from '../nav'
import { ZONES_FINE, type FineId } from '../data/anatomy'
import type { Goal, Session } from '../data/types'
import { REGIONS, regionLabel } from '../logic/body'
import { WEEK, liftHistory, liftOptions, project, sessionsBetween, sessionsOf, summarize, weeklyTonnage, type LiftOption, type Summary } from '../logic/stats'
import { addDays, dateKey, formatDuration, parseKey, uid } from '../logic/util'
import { Empty, Header, NumInput, confirmAction, toast } from '../ui/kit'
import { TimeLine, WeekBars } from '../ui/Charts'

type View = 'tonnage' | 'e1rm' | 'compare' | 'goals'

const VIEWS: { view: View; label: string }[] = [
  { view: 'tonnage', label: 'Tonnage' },
  { view: 'e1rm', label: '1RM estimé' },
  { view: 'compare', label: 'Comparer' },
  { view: 'goals', label: 'Objectifs' },
]

const num = (n: number, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('fr-FR')
const kg = (n: number) => `${num(n)} kg`
/** Tonnage : en tonnes au-delà de 10 000 kg. */
const tons = (n: number) => (n >= 10000 ? `${num(n / 1000, 1)} t` : `${num(n, 0)} kg`)
const dayMonth = (t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
const fullDate = (t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : undefined)

function Delta({ value, suffix = '%', digits = 0 }: { value?: number; suffix?: string; digits?: number }) {
  if (value === undefined || !Number.isFinite(value)) return <span className="faint">—</span>
  const r = Math.round(value * 10 ** digits) / 10 ** digits
  return <span className={`delta${r > 0 ? ' up' : r < 0 ? ' down' : ''}`}>{r > 0 ? '+' : r < 0 ? '−' : '='}{r ? `${num(Math.abs(r), digits)}${suffix}` : ''}</span>
}

/** PCTRA : graphiques de progression, comparaisons et objectifs. */
export function StatsScreen() {
  const data = useData()
  const [view, setView] = useState<View>('tonnage')
  const [lift, setLift] = useState<string>()
  const options = useMemo(() => liftOptions(data.sessions), [data.sessions])
  const current = lift && options.some((o) => o.key === lift) ? lift : options[0]?.key
  const openLift = (key: string) => {
    setLift(key)
    setView('e1rm')
  }

  return (
    <div className="screen">
      <div className="screen-inner">
        <Header title="Graphiques" sub="Ta progression semaine après semaine, et où tu vas" />
        <div className="seg" role="tablist">
          {VIEWS.map((v) => (
            <button key={v.view} role="tab" aria-selected={view === v.view} className={view === v.view ? 'on' : ''} onClick={() => setView(v.view)}>
              {v.label}
            </button>
          ))}
        </div>
        {!data.sessions.length ? (
          <Empty title="Pas encore de séance">Les graphiques se remplissent avec les séances faites sur le téléphone, une fois synchronisées.</Empty>
        ) : view === 'tonnage' ? (
          <TonnageView sessions={data.sessions} />
        ) : view === 'e1rm' ? (
          <LiftView sessions={data.sessions} options={options} lift={current} onLift={setLift} goals={data.goals ?? []} />
        ) : view === 'compare' ? (
          <CompareView sessions={data.sessions} programs={data.programs} onLift={openLift} />
        ) : (
          <GoalsView sessions={data.sessions} options={options} goals={data.goals ?? []} defaultLift={current} onLift={openLift} />
        )}
      </div>
    </div>
  )
}

/* ---------- Tonnage ---------- */

function MuscleSelect({ value, onChange }: { value?: FineId; onChange: (v?: FineId) => void }) {
  return (
    <select className="input st-select" value={value ?? ''} onChange={(e) => onChange((e.target.value || undefined) as FineId | undefined)} aria-label="Muscle">
      <option value="">Tous les muscles</option>
      {ZONES_FINE.map((z) => (
        <optgroup key={z} label={z}>
          {REGIONS.filter((r) => r.zone === z).map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

function TonnageView({ sessions }: { sessions: Session[] }) {
  const [weeks, setWeeks] = useState(12)
  const [muscle, setMuscle] = useState<FineId>()
  const rows = useMemo(() => weeklyTonnage(sessions, weeks, Date.now(), muscle), [sessions, weeks, muscle])
  const done = rows.slice(0, -1)
  const active = done.filter((r) => r.tonnage > 0)
  const avg = active.length ? active.reduce((s, r) => s + r.tonnage, 0) / active.length : 0
  const best = done.reduce((b, r) => (r.tonnage > b.tonnage ? r : b), done[0] ?? rows[0])
  const last4 = done.slice(-4).reduce((s, r) => s + r.tonnage, 0)
  const prev4 = done.slice(-8, -4).reduce((s, r) => s + r.tonnage, 0)
  const now = rows[rows.length - 1]
  return (
    <div className="stack">
      <div className="row wrap st-controls">
        <MuscleSelect value={muscle} onChange={setMuscle} />
        <div className="seg st-seg">
          {[12, 26, 52].map((n) => (
            <button key={n} className={weeks === n ? 'on' : ''} onClick={() => setWeeks(n)}>{n} sem.</button>
          ))}
        </div>
      </div>
      <div className="stat-grid">
        <div className="stat"><div className="v">{tons(now.tonnage)}</div><div className="l">Cette semaine</div></div>
        <div className="stat"><div className="v">{tons(avg)}</div><div className="l">Moyenne par semaine</div></div>
        <div className="stat"><div className="v">{best && best.tonnage ? tons(best.tonnage) : '—'}</div><div className="l">Meilleure semaine{best && best.tonnage ? ` (${dayMonth(best.start)})` : ''}</div></div>
        <div className="stat"><div className="v"><Delta value={pct(last4, prev4)} /></div><div className="l">4 dernières semaines contre les 4 d’avant</div></div>
      </div>
      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>Tonnage par semaine{muscle ? ` · ${regionLabel(muscle)}` : ''}</div>
        <WeekBars
          bars={rows.map((r, i) => ({
            start: r.start,
            value: r.tonnage,
            hint: `${i === rows.length - 1 ? 'cette semaine' : `semaine du ${dayMonth(r.start)}`} · ${r.sessions} séance${r.sessions > 1 ? 's' : ''}`,
          }))}
          format={tons}
        />
      </div>
      <div className="small faint">
        Tonnage = charge × répétitions de chaque série faite (× 2 pour un exercice fait côté par côté), sans la chauffe ni le cardio. Pour un muscle, un exercice compte entier s’il en est le muscle principal et pour moitié s’il est secondaire. Les exercices au poids du corps sans lest ne comptent pas.
      </div>
    </div>
  )
}

/* ---------- 1RM estimé ---------- */

function LiftSelect({ options, value, onChange }: { options: LiftOption[]; value?: string; onChange: (k: string) => void }) {
  return (
    <select className="input st-select" value={value ?? ''} onChange={(e) => onChange(e.target.value)} aria-label="Exercice">
      {options.map((o) => (
        <option key={o.key} value={o.key}>{o.name} ({o.sessions} séance{o.sessions > 1 ? 's' : ''})</option>
      ))}
    </select>
  )
}

function LiftView({ sessions, options, lift, onLift, goals }: { sessions: Session[]; options: LiftOption[]; lift?: string; onLift: (k: string) => void; goals: Goal[] }) {
  const nav = useNav()
  const history = useMemo(() => (lift ? liftHistory(sessions, lift) : []), [sessions, lift])
  if (!lift || !options.length) return <Empty title="Aucun exercice avec charge">Le 1RM estimé se calcule sur les exercices faits avec une charge.</Empty>
  const withE = history.filter((p) => p.e1rm !== undefined)
  const useMax = withE.length === 0
  const pts = (useMax ? history : withE).map((p) => ({ t: p.date, v: useMax ? p.max : p.e1rm!, hint: `${num(p.weight)} kg × ${p.reps}` }))
  const recent = pts.filter((p) => p.t >= Date.now() - 4 * WEEK)
  const now = recent.length ? Math.max(...recent.map((p) => p.v)) : pts[pts.length - 1]?.v
  const best = pts.length ? Math.max(...pts.map((p) => p.v)) : 0
  const goal = goals.find((g) => g.key === lift && g.kind === (useMax ? 'max' : 'e1rm'))
  const proj = goal ? project(goal, sessions) : undefined
  const name = options.find((o) => o.key === lift)?.name ?? ''
  return (
    <div className="stack">
      <div className="row wrap st-controls">
        <LiftSelect options={options} value={lift} onChange={onLift} />
      </div>
      <div className="stat-grid">
        <div className="stat"><div className="v">{now !== undefined ? kg(now) : '—'}</div><div className="l">{useMax ? 'Charge max' : '1RM estimé'} (4 dernières semaines)</div></div>
        <div className="stat"><div className="v">{kg(best)}</div><div className="l">Record</div></div>
        <div className="stat"><div className="v">{kg(Math.max(...history.map((p) => p.max)))}</div><div className="l">Charge la plus lourde</div></div>
        <div className="stat"><div className="v"><Delta value={pts.length > 1 ? pct(pts[pts.length - 1].v, pts[0].v) : undefined} /></div><div className="l">Depuis le {pts[0] ? dayMonth(pts[0].t) : '—'}</div></div>
      </div>
      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>{useMax ? 'Charge max' : '1RM estimé'} · {name}</div>
        <TimeLine points={pts} format={kg} target={goal?.target} projection={proj?.eta && goal ? { t: proj.eta, v: goal.target } : undefined} />
        {useMax && <div className="small faint">Séries de plus de 12 répétitions seulement : pas de 1RM fiable, la courbe montre la charge max.</div>}
      </div>
      <div className="card stack" style={{ gap: 0 }}>
        <div className="section-title" style={{ marginTop: 0 }}>Dernières séances</div>
        <table className="st-table">
          <thead>
            <tr><th>Date</th><th>Meilleure série</th><th className="r">1RM estimé</th><th className="r">Charge max</th></tr>
          </thead>
          <tbody>
            {[...history].reverse().slice(0, 12).map((p) => (
              <tr key={p.sessionId} className="clickable" onClick={() => nav.push({ name: 'session', id: p.sessionId })}>
                <td>{fullDate(p.date)}</td>
                <td>{num(p.weight)} kg × {p.reps}</td>
                <td className="r">{p.e1rm ? kg(p.e1rm) : '—'}</td>
                <td className="r">{kg(p.max)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="small faint">1RM estimé : la charge qu’on pourrait soulever une seule fois, calculée sur la meilleure série de chaque séance (formule d’Epley, séries de 12 répétitions au plus). C’est une estimation pour suivre la tendance, pas un test à faire.</div>
    </div>
  )
}

/* ---------- Comparer ---------- */

type Preset = '4' | '8' | 'month' | 'custom'
const PRESETS: { id: Preset; label: string }[] = [
  { id: '4', label: '4 dernières semaines / 4 d’avant' },
  { id: '8', label: '8 dernières semaines / 8 d’avant' },
  { id: 'month', label: 'Ce mois-ci / le mois dernier' },
  { id: 'custom', label: 'Dates au choix' },
]

interface Side {
  label: string
  sessions: Session[]
  /** Nombre de semaines couvertes (périodes), pour les moyennes par semaine. */
  weeks?: number
}

function CompareView({ sessions, programs, onLift }: { sessions: Session[]; programs: { id: string; name: string }[]; onLift: (k: string) => void }) {
  const [mode, setMode] = useState<'periods' | 'programs'>('periods')
  const [preset, setPreset] = useState<Preset>('4')
  const today = dateKey()
  const [custom, setCustom] = useState<{ a: [string, string]; b: [string, string] }>({ a: [addDays(today, -27), today], b: [addDays(today, -55), addDays(today, -28)] })
  const used = programs.filter((p) => sessions.some((s) => s.programId === p.id))
  const [pa, setPa] = useState<string>()
  const [pb, setPb] = useState<string>()
  const progA = used.find((p) => p.id === pa) ?? used[0]
  const progB = used.find((p) => p.id === pb) ?? used.find((p) => p !== progA)

  let sides: [Side, Side] | undefined
  if (mode === 'periods') {
    sides = periodsWith(sessions, preset, custom)
  } else if (progA && progB) {
    sides = [
      { label: progA.name, sessions: sessionsOf(sessions, progA) },
      { label: progB.name, sessions: sessionsOf(sessions, progB) },
    ]
  }

  return (
    <div className="stack">
      <div className="row wrap st-controls">
        <div className="seg st-seg">
          <button className={mode === 'periods' ? 'on' : ''} onClick={() => setMode('periods')}>Deux périodes</button>
          <button className={mode === 'programs' ? 'on' : ''} onClick={() => setMode('programs')}>Deux programmes</button>
        </div>
        {mode === 'periods' ? (
          <select className="input st-select" value={preset} onChange={(e) => setPreset(e.target.value as Preset)} aria-label="Périodes">
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        ) : (
          used.length >= 2 && (
            <>
              <select className="input st-select" value={progA?.id} onChange={(e) => setPa(e.target.value)} aria-label="Programme A">
                {used.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <span className="muted">contre</span>
              <select className="input st-select" value={progB?.id} onChange={(e) => setPb(e.target.value)} aria-label="Programme B">
                {used.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </>
          )
        )}
      </div>
      {mode === 'periods' && preset === 'custom' && (
        <div className="row wrap st-controls">
          {(['a', 'b'] as const).map((k) => (
            <label key={k} className="row small muted" style={{ gap: 6 }}>
              Période {k.toUpperCase()} du
              <input type="date" className="input st-date" value={custom[k][0]} max={custom[k][1]} onChange={(e) => e.target.value && setCustom({ ...custom, [k]: [e.target.value, custom[k][1]] })} />
              au
              <input type="date" className="input st-date" value={custom[k][1]} min={custom[k][0]} onChange={(e) => e.target.value && setCustom({ ...custom, [k]: [custom[k][0], e.target.value] })} />
            </label>
          ))}
        </div>
      )}
      {mode === 'programs' && used.length < 2 ? (
        <Empty title="Il faut deux programmes">Fais au moins une séance de deux programmes différents pour les comparer.</Empty>
      ) : (
        sides && <Comparison a={sides[0]} b={sides[1]} perSession={mode === 'programs'} onLift={onLift} />
      )}
    </div>
  )
}

/** Les deux périodes et leurs séances. */
function periodsWith(sessions: Session[], preset: Preset, custom: { a: [string, string]; b: [string, string] }): [Side, Side] {
  const today = dateKey()
  const side = (from: string, to: string, label: string): Side => {
    const f = parseKey(from).getTime()
    const t = parseKey(addDays(to, 1)).getTime()
    return { label, sessions: sessionsBetween(sessions, f, t), weeks: Math.max(1, Math.round((t - f) / 86400000) / 7) }
  }
  if (preset === 'month') {
    const d = parseKey(today)
    const first = new Date(d.getFullYear(), d.getMonth(), 1)
    const prevFirst = new Date(d.getFullYear(), d.getMonth() - 1, 1)
    const prevLast = new Date(d.getFullYear(), d.getMonth(), 0)
    const name = (x: Date) => x.toLocaleDateString('fr-FR', { month: 'long' })
    return [side(dateKey(first), today, name(first)), side(dateKey(prevFirst), dateKey(prevLast), name(prevFirst))]
  }
  if (preset === 'custom') {
    const lbl = (r: [string, string]) => `${dayMonth(parseKey(r[0]).getTime())} – ${dayMonth(parseKey(r[1]).getTime())}`
    return [side(custom.a[0], custom.a[1], lbl(custom.a)), side(custom.b[0], custom.b[1], lbl(custom.b))]
  }
  const n = Number(preset)
  const aFrom = addDays(today, -7 * n + 1)
  return [side(aFrom, today, `${n} dernières semaines`), side(addDays(aFrom, -7 * n), addDays(aFrom, -1), `${n} semaines d’avant`)]
}

function Comparison({ a, b, perSession, onLift }: { a: Side; b: Side; perSession: boolean; onLift: (k: string) => void }) {
  const A = useMemo(() => summarize(a.sessions), [a.sessions])
  const B = useMemo(() => summarize(b.sessions), [b.sessions])
  // Programmes : moyennes par séance ; périodes : moyennes par semaine.
  const per = (s: Summary, side: Side) => (perSession ? Math.max(1, s.sessions) : side.weeks ?? 1)
  const unit = perSession ? 'par séance' : 'par semaine'
  const timed = (s: Session[]) => s.filter((x) => x.endedAt && x.endedAt > x.startedAt).length
  const rows: { label: string; a: number; b: number; fmt: (v: number) => string }[] = [
    ...(perSession ? [] : [{ label: 'Séances par semaine', a: A.sessions / per(A, a), b: B.sessions / per(B, b), fmt: (v: number) => num(v) }]),
    { label: `Séries ${unit}`, a: A.sets / per(A, a), b: B.sets / per(B, b), fmt: (v) => num(v) },
    { label: `Tonnage ${unit}`, a: A.tonnage / per(A, a), b: B.tonnage / per(B, b), fmt: tons },
    { label: 'Durée moyenne d’une séance', a: A.durationSec / Math.max(1, timed(a.sessions)), b: B.durationSec / Math.max(1, timed(b.sessions)), fmt: (v) => (v ? formatDuration(Math.round(v)) : '—') },
  ]
  const muscles = REGIONS.map((r) => ({ r, a: A.work[r.id].sets / per(A, a), b: B.work[r.id].sets / per(B, b) }))
    .filter((m) => m.a || m.b)
    .sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b))
  const lifts = [...A.best.entries()]
    .filter(([k]) => B.best.has(k))
    .map(([k, v]) => ({ key: k, name: v.name, a: v.e1rm, b: B.best.get(k)!.e1rm }))
    .sort((x, y) => (pct(y.a, y.b) ?? 0) - (pct(x.a, x.b) ?? 0))
  const [allMuscles, setAllMuscles] = useState(false)

  return (
    <div className="st-compare">
      <div className="card stack" style={{ gap: 0 }}>
        <div className="section-title" style={{ marginTop: 0 }}>En résumé</div>
        <table className="st-table">
          <thead>
            <tr><th /><th className="r">{a.label}</th><th className="r">{b.label}</th><th className="r">Écart</th></tr>
          </thead>
          <tbody>
            <tr><td>Séances</td><td className="r">{A.sessions}</td><td className="r">{B.sessions}</td><td className="r"><Delta value={A.sessions - B.sessions} suffix="" /></td></tr>
            {rows.map((r) => (
              <tr key={r.label}><td>{r.label}</td><td className="r">{r.fmt(r.a)}</td><td className="r">{r.fmt(r.b)}</td><td className="r"><Delta value={pct(r.a, r.b)} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card stack" style={{ gap: 0 }}>
        <div className="section-title" style={{ marginTop: 0 }}>Séries {unit} par muscle · plus gros écarts</div>
        {!muscles.length && <div className="small muted">Aucune série de part et d’autre.</div>}
        <table className="st-table">
          {muscles.length > 0 && (
            <thead>
              <tr><th>Muscle</th><th className="r">{a.label}</th><th className="r">{b.label}</th><th className="r">Écart</th></tr>
            </thead>
          )}
          <tbody>
            {muscles.slice(0, allMuscles ? undefined : 10).map((m) => (
              <tr key={m.r.id}><td>{m.r.label}</td><td className="r">{num(m.a)}</td><td className="r">{num(m.b)}</td><td className="r"><Delta value={m.a - m.b} suffix="" digits={1} /></td></tr>
            ))}
          </tbody>
        </table>
        {muscles.length > 10 && (
          <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => setAllMuscles(!allMuscles)}>{allMuscles ? 'Voir moins' : `Voir les ${muscles.length - 10} autres`}</button>
        )}
      </div>

      <div className="card stack" style={{ gap: 0 }}>
        <div className="section-title" style={{ marginTop: 0 }}>1RM estimé · exercices faits des deux côtés</div>
        {!lifts.length && <div className="small muted">Aucun exercice chargé fait dans les deux.</div>}
        <table className="st-table">
          {lifts.length > 0 && (
            <thead>
              <tr><th>Exercice</th><th className="r">{a.label}</th><th className="r">{b.label}</th><th className="r">Écart</th></tr>
            </thead>
          )}
          <tbody>
            {lifts.map((l) => (
              <tr key={l.key} className="clickable" onClick={() => onLift(l.key)}><td>{l.name}</td><td className="r">{kg(l.a)}</td><td className="r">{kg(l.b)}</td><td className="r"><Delta value={pct(l.a, l.b)} digits={1} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------- Objectifs ---------- */

function GoalsView({ sessions, options, goals, defaultLift, onLift }: { sessions: Session[]; options: LiftOption[]; goals: Goal[]; defaultLift?: string; onLift: (k: string) => void }) {
  const [key, setKey] = useState(defaultLift)
  const [kind, setKind] = useState<Goal['kind']>('e1rm')
  const [target, setTarget] = useState<number>()
  const [deadline, setDeadline] = useState('')
  const sel = options.find((o) => o.key === (key ?? defaultLift))
  const history = useMemo(() => (sel ? liftHistory(sessions, sel.key) : []), [sessions, sel])
  const ref = kind === 'e1rm' ? Math.max(0, ...history.map((p) => p.e1rm ?? 0)) : Math.max(0, ...history.map((p) => p.max))

  const add = () => {
    if (!sel || !target || target <= 0) return
    const g: Goal = { id: uid(), key: sel.key, name: sel.name, kind, target, deadline: deadline || undefined, createdAt: Date.now() }
    update((d) => ({ ...d, goals: [...(d.goals ?? []), g] }))
    setTarget(undefined)
    setDeadline('')
    toast(`Objectif ajouté : ${sel.name}`)
  }
  const remove = (g: Goal) => {
    if (!confirmAction(`Supprimer l’objectif ${g.name} ?`)) return
    update((d) => ({ ...d, goals: (d.goals ?? []).filter((x) => x.id !== g.id) }))
  }

  return (
    <div className="stack">
      {goals.length === 0 && <div className="card muted">Aucun objectif pour l’instant. Choisis un exercice et une charge à atteindre : PCTRA calcule quand tu y arriveras si tu continues au même rythme.</div>}
      <div className="st-goals">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} sessions={sessions} onRemove={() => remove(g)} onOpen={() => onLift(g.key)} />
        ))}
      </div>

      <div className="card stack" style={{ gap: 10 }}>
        <div className="section-title" style={{ margin: 0 }}>Nouvel objectif</div>
        {!options.length ? (
          <div className="small muted">Il faut au moins une séance avec un exercice chargé.</div>
        ) : (
          <>
            <div className="row wrap st-controls">
              <LiftSelect options={options} value={sel?.key} onChange={setKey} />
              <div className="seg st-seg">
                <button className={kind === 'e1rm' ? 'on' : ''} onClick={() => setKind('e1rm')}>1RM estimé</button>
                <button className={kind === 'max' ? 'on' : ''} onClick={() => setKind('max')}>Charge à soulever</button>
              </div>
            </div>
            <div className="row wrap st-controls">
              <label className="row small muted" style={{ gap: 6 }}>
                Cible
                <NumInput value={target} onChange={setTarget} step={2.5} placeholder={ref ? String(Math.ceil((ref * 1.1) / 2.5) * 2.5) : 'kg'} width={110} />
                kg
              </label>
              <label className="row small muted" style={{ gap: 6 }}>
                Pour le (facultatif)
                <input type="date" className="input st-date" value={deadline} min={addDays(dateKey(), 1)} onChange={(e) => setDeadline(e.target.value)} />
              </label>
              <button className="btn" disabled={!target || target <= 0} onClick={add}>Ajouter</button>
            </div>
            {ref > 0 && <div className="small faint">Aujourd’hui : {kind === 'e1rm' ? '1RM estimé' : 'charge max'} {kg(ref)} sur {sel?.name}.</div>}
          </>
        )}
      </div>
      <div className="small faint">La date prévue suit la tendance des 12 dernières semaines (au moins 3 séances sur 10 jours). Plus on approche de son maximum, plus la progression ralentit : c’est un repère, pas une promesse. Les objectifs restent sur ce PC.</div>
    </div>
  )
}

function GoalCard({ goal, sessions, onRemove, onOpen }: { goal: Goal; sessions: Session[]; onRemove: () => void; onOpen: () => void }) {
  const p = useMemo(() => project(goal, sessions), [goal, sessions])
  const pts = useMemo(
    () =>
      liftHistory(sessions, goal.key)
        .filter((x) => x.date >= Date.now() - 26 * WEEK)
        .map((x) => ({ t: x.date, v: goal.kind === 'e1rm' ? x.e1rm : x.max, hint: `${num(x.weight)} kg × ${x.reps}` }))
        .filter((x): x is { t: number; v: number; hint: string } => x.v !== undefined),
    [sessions, goal],
  )
  const start = p.start ?? 0
  const progress = p.reached ? 1 : p.current !== undefined && goal.target > start ? Math.max(0, Math.min(1, (p.current - start) / (goal.target - start))) : 0
  const dl = goal.deadline ? parseKey(goal.deadline).getTime() : undefined
  let status: { text: string; tone?: 'ok' | 'late' }
  if (p.reached) status = { text: 'Objectif atteint, bravo.', tone: 'ok' }
  else if (p.tooFew) status = { text: 'Pas encore assez de séances récentes pour une tendance (3 sur au moins 10 jours).' }
  else if (!p.eta) status = { text: 'Au rythme actuel, pas de progression : la tendance est plate ou en baisse.', tone: 'late' }
  else {
    const weeksLeft = (p.eta - Date.now()) / WEEK
    let text = `Au rythme actuel (${p.perWeek! >= 0 ? '+' : ''}${num(p.perWeek!)} kg par semaine) : vers le ${fullDate(p.eta)}, dans ${weeksLeft < 1.5 ? 'quelques jours' : `${Math.round(weeksLeft)} semaines`}.`
    let tone: 'ok' | 'late' | undefined
    if (dl) {
      const gap = Math.round((p.eta - dl) / WEEK)
      if (gap <= 0) {
        text += ' Dans les temps.'
        tone = 'ok'
      } else {
        text += ` Environ ${gap} semaine${gap > 1 ? 's' : ''} après la date visée.`
        tone = 'late'
      }
    }
    status = { text, tone }
  }
  return (
    <div className="card stack st-goal" style={{ gap: 8 }}>
      <div className="row">
        <div className="grow">
          <h3 style={{ margin: 0 }}><button className="st-link" onClick={onOpen}>{goal.name}</button></h3>
          <div className="small muted">
            {goal.kind === 'e1rm' ? '1RM estimé' : 'Charge à soulever'} : <b style={{ color: 'var(--text)' }}>{kg(goal.target)}</b>
            {goal.deadline ? ` · pour le ${fullDate(parseKey(goal.deadline).getTime())}` : ''}
          </div>
        </div>
        <button className="btn sm ghost" onClick={onRemove}>Supprimer</button>
      </div>
      <div className="st-progress" aria-label={`${Math.round(progress * 100)} %`}>
        <span style={{ width: `${progress * 100}%` }} className={p.reached ? 'done' : ''} />
      </div>
      <div className="row small muted">
        <span className="grow">Départ {p.start !== undefined ? kg(p.start) : '—'}</span>
        <span>Actuel <b style={{ color: 'var(--text)' }}>{p.current !== undefined ? kg(p.current) : '—'}</b> · {Math.round(progress * 100)} %</span>
      </div>
      <div className={`small st-status${status.tone ? ` ${status.tone}` : ''}`}>{status.text}</div>
      {pts.length > 0 && <TimeLine points={pts} format={kg} target={goal.target} projection={p.eta && p.eta < Date.now() + 104 * WEEK ? { t: p.eta, v: goal.target } : undefined} height={150} width={460} />}
    </div>
  )
}

