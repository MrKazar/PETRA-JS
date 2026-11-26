import { useMemo, useState } from 'react'
import type { Session } from '../data/types'
import { REGIONS, doneWork, regionLabel, sessionLevelOf, type RegionId } from '../logic/body'
import { Body3D, Body3DLegend } from './Body3D'

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')
const series = (n: number) => `${fmt(n)} série${n > 1 ? 's' : ''}`

/** Récap de séance : le mannequin 3D qui tourne, muscles colorés selon les séries faites, et leurs exercices. */
export function SessionBody({ session }: { session: Session }) {
  const work = useMemo(() => doneWork([session], -Infinity, Infinity), [session])
  const [selected, setSelected] = useState<RegionId>()
  const worked = REGIONS.filter((r) => work[r.id].sets > 0).sort((a, b) => work[b.id].sets - work[a.id].sets)
  if (!worked.length) return null
  const lv = (id: RegionId) => sessionLevelOf(work[id].sets)
  const label = (id: RegionId) => `${regionLabel(id)} : ${series(work[id].sets)}`
  const pick = (id: RegionId) => setSelected(id === selected ? undefined : id)
  const sel = selected && work[selected]

  return (
    <div className="card stack" style={{ gap: 10 }}>
      <div className="eyebrow">Muscles travaillés</div>
      <div className="bm-figures is3d">
        <Body3D compact levelOf={lv} selected={selected} onSelect={pick} labelOf={label} />
        <Body3DLegend session ranges={false} />
      </div>
      {sel && selected && (
        <div className="stack" style={{ gap: 4 }}>
          <div style={{ fontWeight: 600 }}>{regionLabel(selected)} · {series(sel.sets)}</div>
          {!sel.exercises.length && <div className="small muted">Pas travaillé pendant cette séance.</div>}
          {sel.exercises.map((e) => (
            <div key={e.key} className="small muted">
              {e.name} : {e.sets} série{e.sets > 1 ? 's' : ''}{e.primary ? '' : ' (secondaire, compte pour moitié)'}
            </div>
          ))}
        </div>
      )}
      <div className="stack" style={{ gap: 2 }}>
        {worked.map((r) => (
          <button key={r.id} className={`pb-row sb-row${selected === r.id ? ' sel' : ''}`} onClick={() => pick(r.id)}>
            <i className={`bm-swatch lv${lv(r.id)}`} />
            <span style={{ minWidth: 0 }}>
              <span className="ellipsis" style={{ display: 'block' }}>{r.label}</span>
              <span className="small faint ellipsis" style={{ display: 'block' }}>{work[r.id].exercises.map((e) => e.name).join(' · ')}</span>
            </span>
            <span className="bm-num">{fmt(work[r.id].sets)}</span>
          </button>
        ))}
        <div className="small faint">Séries de travail, hors chauffe : 1 par série quand le muscle est visé, 0,5 quand il aide.</div>
      </div>
    </div>
  )
}
