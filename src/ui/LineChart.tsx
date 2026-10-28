/** Courbe simple (sans dépendance) : une valeur par séance, dernier point mis en avant. */
export function LineChart({ values, format = (v) => String(v), height = 96 }: { values: number[]; format?: (v: number) => string; height?: number }) {
  const W = 300
  const H = height
  const pad = { l: 6, r: 44, t: 10, b: 10 }
  if (values.length === 0) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const x = (i: number) => pad.l + (values.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (values.length - 1))
  const y = (v: number) => (max === min ? H / 2 : pad.t + ((max - v) * (H - pad.t - pad.b)) / span)
  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const last = values.length - 1
  return (
    <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`De ${format(values[0])} à ${format(values[last])}`}>
      <line x1={pad.l} x2={W - pad.r} y1={y(max)} y2={y(max)} className="grid" />
      {max !== min && <line x1={pad.l} x2={W - pad.r} y1={y(min)} y2={y(min)} className="grid" />}
      <text x={W - pad.r + 6} y={y(max) + 4} className="lbl">{format(max)}</text>
      {max !== min && <text x={W - pad.r + 6} y={y(min) + 4} className="lbl">{format(min)}</text>}
      {values.length > 1 && <polygon points={`${x(0)},${H - pad.b} ${pts} ${x(last)},${H - pad.b}`} className="area" />}
      {values.length > 1 && <polyline points={pts} className="line" />}
      {values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === last ? 4.5 : 2.5} className={i === last ? 'dot last' : 'dot'} />)}
    </svg>
  )
}
