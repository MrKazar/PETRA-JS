import { useMemo, useState } from 'react'
import type { AppData, Program } from '../data/types'
import { REGIONS, SESSION_LEVELS, levelOf, programWork, regionLabel, sessionLevelOf, timesPerWeek, type RegionId } from '../logic/body'
import { BodyFigure } from './BodyMap'

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')

/** PCTRA : à côté d'un programme, les muscles que travaille la séance, mis à jour pendant l'édition. */
export function ProgramBody({ program, data }: { program: Program; data: Pick<AppData, 'weekPlan' | 'weekPlanB' | 'settings'> }) {
  const work = useMemo(() => programWork(program), [program])
  const [selected, setSelected] = useState<RegionId>()
  const times = timesPerWeek(data, program.id)
  const worked = REGIONS.filter((r) => work[r.id].sets > 0).sort((a, b) => work[b.id].sets - work[a.id].sets)
  const lv = (id: RegionId) => sessionLevelOf(work[id].sets)
  const label = (id: RegionId) => `${regionLabel(id)} : ${fmt(work[id].sets)} série${work[id].sets > 1 ? 's' : ''}`
  const sel = selected && work[selected]

  return (
    <aside className="card stack pb-panel" style={{ gap: 10 }}>
      <div className="section-title" style={{ margin: 0 }}>Muscles travaillés</div>
      <div className="small muted">
        Séries de travail de cette séance{times > 0 ? `, prévue ${fmt(times)} fois par semaine au planning` : ', pas encore au planning'}. Se met à jour à chaque modification.
      </div>
      <div className="bm-figures pb-figures">
        <BodyFigure side="front" levelOf={lv} selected={selected} onSelect={(id) => setSelected(id === selected ? undefined : id)} labelOf={label} />
        <BodyFigure side="back" levelOf={lv} selected={selected} onSelect={(id) => setSelected(id === selected ? undefined : id)} labelOf={label} />
        <div className="bm-legend">
          {SESSION_LEVELS.map((l) => (
            <span key={l.level}>
              <i className={`bm-swatch lv${l.level}`} />
              {l.label} <span className="faint">({l.range})</span>
            </span>
          ))}
        </div>
      </div>

      {sel && selected && (
        <div className="stack" style={{ gap: 4 }}>
          <div style={{ fontWeight: 600 }}>
            {regionLabel(selected)} · {fmt(sel.sets)} série{sel.sets > 1 ? 's' : ''}
          </div>
          {!sel.exercises.length && <div className="small muted">Aucun exercice de cette séance ne le travaille.</div>}
          {sel.exercises.map((e) => (
            <div key={e.key} className="small muted">
              {e.name} : {e.sets} série{e.sets > 1 ? 's' : ''}
              {e.primary ? '' : ' (secondaire, compte pour moitié)'}
            </div>
          ))}
        </div>
      )}

      {worked.length > 0 ? (
        <div className="stack" style={{ gap: 2 }}>
          <div className="pb-row pb-head small faint">
            <span>Muscle</span>
            <span>Séance</span>
            {times > 0 && <span>Semaine</span>}
          </div>
          {worked.map((r) => {
            const s = work[r.id].sets
            return (
              <button key={r.id} className={`pb-row${selected === r.id ? ' sel' : ''}`} onClick={() => setSelected(r.id === selected ? undefined : r.id)}>
                <span className="row" style={{ gap: 8, minWidth: 0 }}>
                  <i className={`bm-swatch lv${sessionLevelOf(s)}`} />
                  <span className="ellipsis">{r.label}</span>
                </span>
                <span className="bm-num">{fmt(s)}</span>
                {times > 0 && (
                  <span className={`bm-num pb-week lv${levelOf(s * times)}-text`} title="Séries par semaine avec ce programme seul">
                    {fmt(s * times)}
                  </span>
                )}
              </button>
            )
          })}
          {times > 0 && <div className="small faint">Semaine : cette séance seule, sans compter tes autres programmes. Repère courant : 10 à 20 séries par muscle et par semaine.</div>}
        </div>
      ) : (
        <div className="small muted">Ajoute des exercices : les muscles qu’ils travaillent s’allument ici.</div>
      )}
    </aside>
  )
}
