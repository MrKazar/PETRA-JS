import { useMemo, useState } from 'react'
import { useData } from '../data/store'
import { METAL_LABEL, levelCost, type Metal } from '../logic/achievements'
import { xpTimeline, type XpPoint } from '../logic/xpTimeline'
import { Medal } from './Medal'

/**
 * Grande courbe d'XP de PCTRA : XP cumulée depuis le jour 1 jusqu'à aujourd'hui, avec un repère à
 * chaque séance où une médaille a été débloquée. Axe des dates réel, ou une séance par cran.
 */

const DAY = 86400000
const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR')
const longDate = (t: number) => new Date(t).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
const shortDate = (t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
const monthShort = (t: number) => {
  const d = new Date(t)
  const m = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  return d.getMonth() === 0 ? `${m} ${d.getFullYear()}` : m
}
const RANK: Metal[] = ['bronze', 'argent', 'or', 'platine']
const bestMetal = (p: XpPoint) => p.unlocks.reduce<Metal>((m, u) => (RANK.indexOf(u.metal) > RANK.indexOf(m) ? u.metal : m), 'bronze')
/** XP totale qu'il faut pour atteindre un niveau. */
const xpForLevel = (level: number) => {
  let xp = 0
  for (let n = 1; n < level; n++) xp += levelCost(n)
  return xp
}

type Axis = 'date' | 'seance'

export function XpChart() {
  const data = useData()
  const tl = useMemo(() => xpTimeline(data), [data])
  const [axis, setAxis] = useState<Axis>('date')
  const [hover, setHover] = useState<number>()
  const pts = tl.points
  const last = pts.length - 1
  const W = 1100
  const H = 400
  const pad = { l: 64, r: 64, t: 22, b: 30 }
  const t0 = tl.start
  const t1 = Math.max(pts[last].t, t0 + 7 * DAY)
  // Par séance : jour 1 au cran 0, séance k au cran k, aujourd'hui un demi-cran après la dernière.
  const sessions = pts.filter((p) => p.n).length
  const pos = (p: XpPoint, i: number) => (axis === 'date' ? (p.t - t0) / (t1 - t0) : (i === last && !p.n ? sessions + 0.5 : p.n ?? 0) / Math.max(1, sessions + 0.5))
  const x = (p: XpPoint, i: number) => pad.l + pos(p, i) * (W - pad.l - pad.r)
  const top = Math.max(100, pts[last].xp) * 1.08
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / top)

  // Graduations d'XP rondes, et repères de niveau à droite.
  const raw = top / 5
  const pow = 10 ** Math.floor(Math.log10(raw))
  const stepV = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw
  const grid: number[] = []
  for (let v = 0; v <= top; v += stepV) grid.push(v)
  const maxLevel = pts[last].level + 1
  const lvStep = [1, 2, 5, 10, 20].find((s) => maxLevel / s <= 6) ?? 25
  const levels: number[] = []
  for (let l = lvStep; l <= maxLevel; l += lvStep) if (xpForLevel(l) <= top) levels.push(l)

  // Axe du bas : mois (par date) ou numéros de séance.
  const xTicks: { x: number; label: string }[] = []
  if (axis === 'date') {
    const d = new Date(t0)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    const months: number[] = []
    for (d.setMonth(d.getMonth() + 1); d.getTime() < t1; d.setMonth(d.getMonth() + 1)) months.push(d.getTime())
    const every = Math.max(1, Math.ceil(months.length / 12))
    months.forEach((m, i) => i % every === 0 && xTicks.push({ x: pad.l + ((m - t0) / (t1 - t0)) * (W - pad.l - pad.r), label: monthShort(m) }))
  } else {
    const every = [1, 2, 5, 10, 20, 25, 50, 100].find((s) => sessions / s <= 12) ?? 200
    for (let n = every; n <= sessions; n += every) xTicks.push({ x: pad.l + (n / (sessions + 0.5)) * (W - pad.l - pad.r), label: `n° ${n}` })
  }

  // Courbe en escalier : l'XP monte d'un coup à la fin de chaque séance.
  const path = pts.map((p, i) => (i ? `H${x(p, i)}V${y(p.xp)}` : `M${x(p, i)},${y(p.xp)}`)).join('')
  const area = `${path}V${y(0)}H${x(pts[0], 0)}Z`
  const medals = pts.map((p, i) => ({ p, i })).filter(({ p }) => p.unlocks.length)
  const totalUnlocks = medals.reduce((n, m) => n + m.p.unlocks.length, 0)
  const lastMedal = medals[medals.length - 1]?.i
  const shownIdx = hover ?? lastMedal ?? last
  const shown = pts[shownIdx]
  const days = Math.floor((pts[last].t - t0) / DAY) + 1

  const nearest = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect()
    const px = ((clientX - r.left) / r.width) * W
    let best = 0
    for (let i = 1; i < pts.length; i++) {
      const d = Math.abs(x(pts[i], i) - px)
      const b = Math.abs(x(pts[best], best) - px)
      // À égalité de distance, on préfère un point avec médaille.
      if (d < b - 0.5 || (Math.abs(d - b) <= 0.5 && pts[i].unlocks.length > pts[best].unlocks.length)) best = i
    }
    // Un point avec médaille proche (8 px à l'écran) passe devant la séance la plus proche.
    const tol = (8 / r.width) * W
    const near = medals.filter(({ p, i }) => Math.abs(x(p, i) - px) <= tol).sort((a, b) => Math.abs(x(a.p, a.i) - px) - Math.abs(x(b.p, b.i) - px))[0]
    setHover(near && !pts[best].unlocks.length ? near.i : best)
  }

  return (
    <div className="card xp-card">
      <div className="xp-head">
        <div className="grow">
          <div className="section-title" style={{ margin: 0 }}>Expérience depuis le jour 1</div>
          <div className="small muted">
            Jour 1 : {longDate(t0)} · {fmt(days)} jour{days > 1 ? 's' : ''} · {fmt(sessions)} séance{sessions > 1 ? 's' : ''} · {fmt(totalUnlocks)} médaille{totalUnlocks > 1 ? 's' : ''}
          </div>
        </div>
        <div className="seg xp-seg" role="tablist">
          <button role="tab" aria-selected={axis === 'date'} className={axis === 'date' ? 'on' : ''} onClick={() => setAxis('date')}>Par jour</button>
          <button role="tab" aria-selected={axis === 'seance'} className={axis === 'seance' ? 'on' : ''} onClick={() => setAxis('seance')}>Par séance</button>
        </div>
      </div>
      <div className="xp-kpis">
        <div><b>{fmt(pts[last].xp)}</b><span>XP au total</span></div>
        <div><b>Niveau {pts[last].level}</b><span>aujourd’hui</span></div>
        <div><b>{fmt(sessions ? pts[last].xp / Math.max(1, days / 7) : 0)}</b><span>XP par semaine en moyenne</span></div>
      </div>
      <svg className="ch xp-ch" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`XP de 0 le ${shortDate(t0)} à ${fmt(pts[last].xp)} aujourd'hui, ${totalUnlocks} médailles`} onMouseMove={(e) => nearest(e.clientX, e.currentTarget)} onMouseLeave={() => setHover(undefined)}>
        <defs>
          <linearGradient id="xp-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--khaki)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--khaki)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {grid.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className={v === 0 ? 'axis' : 'grid'} />
            <text x={pad.l - 8} y={y(v) + 4} className="lbl" textAnchor="end">{fmt(v)}</text>
          </g>
        ))}
        {levels.map((l) => (
          <g key={l}>
            <line x1={W - pad.r - 10} x2={W - pad.r} y1={y(xpForLevel(l))} y2={y(xpForLevel(l))} className="xp-lv" />
            <text x={W - pad.r + 6} y={y(xpForLevel(l)) + 4} className="lbl xp-lv-lbl">niv. {l}</text>
          </g>
        ))}
        {xTicks.map((tk) => <text key={tk.label + tk.x} x={tk.x} y={H - 8} className="lbl" textAnchor="middle">{tk.label}</text>)}
        <text x={pad.l} y={pad.t - 8} className="lbl xp-edge">Jour 1</text>
        <text x={W - pad.r} y={pad.t - 8} className="lbl xp-edge" textAnchor="end">Aujourd’hui</text>
        <path d={area} fill="url(#xp-fill)" />
        <path d={path} className="line" />
        {hover !== undefined && <line x1={x(shown, shownIdx)} x2={x(shown, shownIdx)} y1={pad.t} y2={y(0)} className="xp-cursor" />}
        {medals.map(({ p, i }) => {
          const r = 4 + Math.min(4, p.unlocks.length - 1) * 1.2
          const on = i === shownIdx
          return (
            <g key={i} className={`xp-medal ${bestMetal(p)}${on ? ' on' : ''}`}>
              <circle cx={x(p, i)} cy={y(p.xp)} r={on ? r + 2.5 : r} />
              {p.unlocks.length > 1 && on && <text x={x(p, i)} y={y(p.xp) - r - 7} textAnchor="middle" className="lbl xp-count">{p.unlocks.length}</text>}
            </g>
          )
        })}
        {hover !== undefined && !shown.unlocks.length && <circle cx={x(shown, shownIdx)} cy={y(shown.xp)} r={5} className="dot on" />}
      </svg>
      <div className="xp-legend small muted">
        {RANK.map((m) => <span key={m}><i className={`xp-sw ${m}`} />{METAL_LABEL[m]}</span>)}
        <span className="faint">Un repère par séance qui a débloqué au moins une médaille. Survole la courbe pour le détail.</span>
      </div>
      <XpDetail p={shown} hover={hover !== undefined} isLast={shownIdx === last} />
    </div>
  )
}

function XpDetail({ p, hover, isLast }: { p: XpPoint; hover: boolean; isLast: boolean }) {
  const title = p.n ? `Séance n° ${p.n}${p.name ? ` · ${p.name.split(' · ')[0]}` : ''}` : isLast ? 'Aujourd’hui' : 'Jour 1'
  return (
    <div className="xp-detail">
      <div className="xp-detail-head">
        <div className="grow">
          <div className="eyebrow">{!hover && p.unlocks.length ? 'Dernière médaille · ' : ''}{longDate(p.t)}</div>
          <div className="xp-detail-title">{title}</div>
        </div>
        <div className="xp-detail-num">
          <b>{p.gained > 0 ? `+${fmt(p.gained)} XP` : `${fmt(p.xp)} XP`}</b>
          <span className="small muted">{p.gained > 0 ? `${fmt(p.xp)} XP au total · ` : ''}niveau {p.level}</span>
        </div>
      </div>
      {p.unlocks.length > 0 ? (
        <div className="xp-unlocks">
          {p.unlocks.map((u) => (
            <div key={`${u.id}:${u.tier}`} className="xp-unlock">
              <Medal metal={u.metal} icon={u.icon} size={40} label={u.name} secretId={u.secret ? u.id : undefined} />
              <div>
                <div className="n">{u.name}</div>
                <div className="small muted">{u.secret ? 'Secret' : METAL_LABEL[u.metal]}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="small faint">Pas de médaille débloquée à ce moment-là.</div>
      )}
    </div>
  )
}
