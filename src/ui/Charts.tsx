import { useState } from 'react'

/** Graphiques de PCTRA, sans dépendance : barres par semaine et courbe dans le temps. */

const monthShort = (t: number) => new Date(t).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
const dayMonth = (t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

/** Graduations « rondes » entre 0 et max. */
function ticks(max: number, n = 4): number[] {
  if (max <= 0) return [0]
  const raw = max / n
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw
  const out: number[] = []
  for (let v = 0; v <= max + step * 0.001; v += step) out.push(v)
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step)
  return out
}

export interface Bar {
  start: number
  value: number
  /** Texte d'info au survol. */
  hint: string
}

/** Barres par semaine, la semaine en cours mise en avant, avec la moyenne des semaines finies. */
export function WeekBars({ bars, format, height = 220 }: { bars: Bar[]; format: (v: number) => string; height?: number }) {
  const [hover, setHover] = useState<number>()
  if (!bars.length) return null
  const W = 720
  const H = height
  const pad = { l: 56, r: 8, t: 12, b: 26 }
  const done = bars.slice(0, -1).filter((b) => b.value > 0)
  const avg = done.length ? done.reduce((s, b) => s + b.value, 0) / done.length : 0
  const tk = ticks(Math.max(...bars.map((b) => b.value), avg, 1))
  const top = tk[tk.length - 1]
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / top)
  const slot = (W - pad.l - pad.r) / bars.length
  const bw = Math.max(2, Math.min(28, slot * 0.7))
  const last = bars.length - 1
  const shown = hover ?? last
  return (
    <div className="ch-wrap">
      <div className="ch-readout">
        <b>{format(bars[shown].value)}</b> <span className="muted">{bars[shown].hint}</span>
      </div>
      <svg className="ch" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Dernière semaine : ${format(bars[last].value)}`} onMouseLeave={() => setHover(undefined)}>
        {tk.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className={v === 0 ? 'axis' : 'grid'} />
            <text x={pad.l - 6} y={y(v) + 4} className="lbl" textAnchor="end">{format(v)}</text>
          </g>
        ))}
        {bars.map((b, i) => {
          const x = pad.l + slot * i + (slot - bw) / 2
          const newMonth = i === 0 || new Date(b.start).getMonth() !== new Date(bars[i - 1].start).getMonth()
          return (
            <g key={b.start} onMouseEnter={() => setHover(i)}>
              <rect x={pad.l + slot * i} y={pad.t} width={slot} height={H - pad.t - pad.b} className="hit" />
              {b.value > 0 && <rect x={x} y={y(b.value)} width={bw} height={y(0) - y(b.value)} rx={Math.min(3, bw / 3)} className={`bar${i === last ? ' now' : ''}${i === hover ? ' hov' : ''}`} />}
              {newMonth && <text x={pad.l + slot * i + slot / 2} y={H - 8} className="lbl" textAnchor="middle">{monthShort(b.start)}</text>}
            </g>
          )
        })}
        {avg > 0 && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={y(avg)} y2={y(avg)} className="avg" />
            <text x={W - pad.r - 4} y={y(avg) - 5} className="lbl avg-lbl" textAnchor="end">moyenne {format(avg)}</text>
          </g>
        )}
      </svg>
    </div>
  )
}

export interface TimePoint {
  t: number
  v: number
  hint?: string
}

/**
 * Courbe dans le temps (axe des dates réel). Options : une ligne d'objectif et une projection en
 * pointillés jusqu'à la date d'arrivée prévue.
 */
export function TimeLine({
  points,
  format,
  target,
  projection,
  height = 220,
  width = 720,
}: {
  points: TimePoint[]
  format: (v: number) => string
  target?: number
  projection?: { t: number; v: number }
  height?: number
  /** Largeur du dessin : plus petite pour un petit graphique, pour garder des textes lisibles. */
  width?: number
}) {
  const [hover, setHover] = useState<number>()
  if (!points.length) return null
  const W = width
  const H = height
  const pad = { l: 56, r: 12, t: 12, b: 26 }
  const ts = points.map((p) => p.t).concat(projection ? [projection.t] : [])
  let t0 = Math.min(...ts)
  let t1 = Math.max(...ts)
  if (t1 - t0 < 7 * 86400000) {
    t0 -= 3.5 * 86400000
    t1 += 3.5 * 86400000
  }
  const vs = points.map((p) => p.v).concat(target ? [target] : [], projection ? [projection.v] : [])
  const vmin = Math.min(...vs)
  const vmax = Math.max(...vs)
  const spread = vmax - vmin || Math.max(1, vmax * 0.1)
  const lo = Math.max(0, vmin - spread * 0.15)
  const hi = vmax + spread * 0.15
  const x = (t: number) => pad.l + ((t - t0) / (t1 - t0)) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - (v - lo) / (hi - lo))
  // Graduations rondes (pas de 1, 2, 2,5 ou 5 × 10ⁿ) qui couvrent les valeurs.
  const raw = (hi - lo) / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw
  const grid: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) grid.push(Math.round(v * 1000) / 1000)
  const months: number[] = []
  const d = new Date(t0)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  for (d.setMonth(d.getMonth() + 1); d.getTime() <= t1; d.setMonth(d.getMonth() + 1)) months.push(d.getTime())
  const every = Math.max(1, Math.ceil(months.length / 8))
  const last = points.length - 1
  const shown = points[hover ?? last]
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t)},${y(p.v)}`).join(' ')
  const nearest = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect()
    const px = ((clientX - r.left) / r.width) * W
    let best = 0
    for (let i = 1; i < points.length; i++) if (Math.abs(x(points[i].t) - px) < Math.abs(x(points[best].t) - px)) best = i
    setHover(best)
  }
  return (
    <div className="ch-wrap">
      <div className="ch-readout">
        <b>{format(shown.v)}</b> <span className="muted">{dayMonth(shown.t)}{shown.hint ? ` · ${shown.hint}` : ''}</span>
      </div>
      <svg className="ch" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`De ${format(points[0].v)} à ${format(points[last].v)}`} onMouseMove={(e) => nearest(e.clientX, e.currentTarget)} onMouseLeave={() => setHover(undefined)}>
        {grid.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={pad.l - 6} y={y(v) + 4} className="lbl" textAnchor="end">{format(v)}</text>
          </g>
        ))}
        {months.map((m, i) => i % every === 0 && (
          <text key={m} x={x(m)} y={H - 8} className="lbl" textAnchor="middle">{monthShort(m)}</text>
        ))}
        {target !== undefined && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={y(target)} y2={y(target)} className="target" />
            <text x={pad.l + 4} y={y(target) - 5} className="lbl target-lbl">objectif {format(target)}</text>
          </g>
        )}
        {projection && <line x1={x(points[last].t)} y1={y(points[last].v)} x2={x(projection.t)} y2={y(projection.v)} className="proj" />}
        {points.length > 1 && <path d={path} className="line" />}
        {points.map((p, i) => <circle key={i} cx={x(p.t)} cy={y(p.v)} r={i === (hover ?? last) ? 5 : 3} className={i === (hover ?? last) ? 'dot on' : 'dot'} />)}
      </svg>
    </div>
  )
}
