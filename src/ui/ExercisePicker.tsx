import { useMemo, useState } from 'react'
import { CATALOG, GROUPS, exerciseFromCatalog, groupLabel, type Cycle } from '../data/catalog'
import type { ProgramExercise } from '../data/types'
import { uid } from '../logic/util'
import { Sheet, Toggle } from './kit'
import { IconPlus, IconSearch } from './icons'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function ExercisePicker({ open, onClose, onPick, defaultRest }: { open: boolean; onClose: () => void; onPick: (ex: ProgramExercise) => void; defaultRest: number }) {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<string>()
  const [cycle, setCycle] = useState<Cycle>('hypertrophie')
  const [warmup, setWarmup] = useState(true)

  const results = useMemo(() => {
    const nq = norm(q.trim())
    return CATALOG.filter((e) => (!group || e.groupe_musculaire === group) && (!nq || norm(e.nom).includes(nq) || norm(e.equipement).includes(nq)))
  }, [q, group])

  const custom = () => {
    const name = q.trim()
    if (!name) return
    onPick({
      id: uid(),
      name,
      group: group ?? 'autre',
      parCote: false,
      restSec: defaultRest,
      sets: [
        { phase: 'travail', reps: 10 },
        { phase: 'travail', reps: 10 },
        { phase: 'travail', reps: 10 },
      ],
    })
  }

  return (
    <Sheet open={open} onClose={onClose} title="Ajouter un exercice">
      <div className="stack">
        <div className="row" style={{ position: 'relative' }}>
          <IconSearch style={{ position: 'absolute', left: 12, width: 18, color: 'var(--faint)' }} />
          <input className="input" style={{ paddingLeft: 38 }} placeholder="Rechercher (nom, matériel)…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="chips scroll">
          <button className={`chip${!group ? ' on' : ''}`} onClick={() => setGroup(undefined)}>Tous</button>
          {GROUPS.map((g) => (
            <button key={g} className={`chip${group === g ? ' on' : ''}`} onClick={() => setGroup(g)}>{groupLabel(g)}</button>
          ))}
        </div>
        <div className="row between">
          <div className="chips">
            <button className={`chip${cycle === 'force' ? ' on' : ''}`} onClick={() => setCycle('force')}>Force</button>
            <button className={`chip${cycle === 'hypertrophie' ? ' on' : ''}`} onClick={() => setCycle('hypertrophie')}>Hypertrophie</button>
          </div>
          <label className="row small muted">
            Échauffement <Toggle on={warmup} onChange={setWarmup} label="Séries d'échauffement" />
          </label>
        </div>
        <div className="list">
          {results.map((e) => {
            const bloc = cycle === 'force' ? e.travail : e.hypertrophie
            return (
              <button
                key={e.id}
                className="list-item clickable"
                style={{ textAlign: 'left', cursor: 'pointer' }}
                onClick={() => onPick(exerciseFromCatalog(e, cycle, warmup))}
              >
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{e.nom}</div>
                  <div className="small muted">
                    {groupLabel(e.groupe_musculaire)} · {e.equipement}
                    {e.cardio ? ` · ${e.cardio.effort_min} min d'effort` : bloc ? ` · ${bloc.series} × ${bloc.reps}` : ''}
                    {e.par_cote ? ' · par côté' : ''}
                  </div>
                </div>
                <IconPlus style={{ width: 20, color: 'var(--gold)' }} />
              </button>
            )
          })}
          {q.trim() && (
            <button className="btn block" onClick={custom}>
              <IconPlus /> Créer « {q.trim()} »
            </button>
          )}
          {!results.length && !q.trim() && <div className="muted center small">Aucun exercice dans ce groupe.</div>}
        </div>
      </div>
    </Sheet>
  )
}
