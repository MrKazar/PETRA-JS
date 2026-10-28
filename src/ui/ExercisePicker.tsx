import { useMemo, useState } from 'react'
import { CATALOG, GROUPS, cardioSummary, exerciseFromCatalog, pdcSummary, groupLabel, type CatalogExercise } from '../data/catalog'
import type { ProgramExercise } from '../data/types'
import { uid } from '../logic/util'
import { NumInput, Sheet } from './kit'
import { IconChevron, IconPlus, IconSearch } from './icons'
import { Prescription, exerciseSubtitle } from './Prescription'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function useCatalogSearch() {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<string>()
  const results = useMemo(() => {
    const nq = norm(q.trim())
    return CATALOG.filter((e) => (!group || e.groupe_musculaire === group) && (!nq || norm(e.nom).includes(nq) || norm(e.equipement).includes(nq)))
  }, [q, group])
  return { q, setQ, group, setGroup, results }
}

export function CatalogFilters({ q, setQ, group, setGroup }: Pick<ReturnType<typeof useCatalogSearch>, 'q' | 'setQ' | 'group' | 'setGroup'>) {
  return (
    <>
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
    </>
  )
}

export function CatalogRow({ e, onClick }: { e: CatalogExercise; onClick: () => void }) {
  return (
    <button className="list-item clickable" style={{ textAlign: 'left', width: '100%' }} onClick={onClick}>
      <div className="grow">
        <div style={{ fontWeight: 600 }}>{e.nom}</div>
        <div className="small muted">
          {exerciseSubtitle(e)}
          {e.cardio ? ` · ${cardioSummary(e.cardio)}` : e.pdc ? ` · ${pdcSummary(e.pdc, e.par_cote)}` : e.travail ? ` · travail ${e.travail.reps}` : ''}
        </div>
      </div>
      <IconChevron style={{ width: 18, color: 'var(--faint)', flex: 'none' }} />
    </button>
  )
}

/** Fiche d'un exercice du catalogue, avec saisie de la charge de travail avant l'ajout. */
export function CatalogDetail({ ex, onAdd, addLabel = 'Ajouter' }: { ex: CatalogExercise; onAdd: (p: ProgramExercise) => void; addLabel?: string }) {
  const [load, setLoad] = useState<number>()
  return (
    <div className="stack">
      <div className="small muted" style={{ marginTop: -6 }}>{exerciseSubtitle(ex)}</div>
      {ex.muscles_secondaires.length > 0 && (
        <div className="chips">
          {ex.muscles_secondaires.map((m) => <span key={m} className="badge">{groupLabel(m)}</span>)}
        </div>
      )}
      <div className="card tight">
        <div className="eyebrow" style={{ marginBottom: 8 }}>{ex.cardio ? (ex.cardio.mode === 'duree' ? 'Durée conseillée' : ex.cardio.mode === 'intervalles' ? 'Fractionné conseillé' : 'Répétitions conseillées') : ex.pdc ? 'Séries conseillées' : 'Cycle préconisé'}</div>
        <Prescription ex={ex} workLoad={load} />
      </div>
      {ex.cardio && <div className="small muted">{ex.cardio.consigne} Intensité {ex.cardio.intensite}. Durée et tours se règlent ensuite dans le programme.</div>}
      {ex.pdc && <div className="small muted">Au poids du corps : pas de chauffe ni d’hypertrophie. Séries, répétitions (ou temps, ou échec) et repos se règlent ensuite dans le programme.</div>}
      {ex.charge && !ex.cardio && (
        <div className="row">
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Charge de travail</div>
            <div className="small muted">Les charges de chauffe et d’hypertrophie en découlent.</div>
          </div>
          <NumInput value={load} onChange={setLoad} placeholder="kg" />
          <span className="small faint">kg</span>
        </div>
      )}
      <button className="btn primary block" onClick={() => onAdd(exerciseFromCatalog(ex, load))}>
        <IconPlus /> {addLabel}
      </button>
    </div>
  )
}

export function ExercisePicker({ open, onClose, onPick, defaultRest }: { open: boolean; onClose: () => void; onPick: (ex: ProgramExercise) => void; defaultRest: number }) {
  const search = useCatalogSearch()
  const [detail, setDetail] = useState<CatalogExercise>()

  const custom = () => {
    const name = search.q.trim()
    if (!name) return
    onPick({
      id: uid(),
      name,
      group: search.group ?? 'autre',
      parCote: false,
      usesLoad: true,
      restSec: defaultRest,
      sets: [
        { phase: 'chauffe', reps: 12, pct: 50, restSec: 60 },
        { phase: 'travail', reps: 8, restSec: defaultRest },
        { phase: 'travail', reps: 8, restSec: defaultRest },
        { phase: 'hypertrophie', reps: 12, pct: 70, restSec: 60 },
      ],
    })
  }

  const close = () => {
    setDetail(undefined)
    onClose()
  }

  return (
    <Sheet open={open} onClose={detail ? () => setDetail(undefined) : close} title={detail ? detail.nom : 'Ajouter un exercice'}>
      {detail ? (
        <CatalogDetail
          ex={detail}
          onAdd={(p) => {
            setDetail(undefined)
            onPick(p)
          }}
        />
      ) : (
        <div className="stack">
          <CatalogFilters {...search} />
          <div className="list">
            {search.results.slice(0, 120).map((e) => <CatalogRow key={e.id} e={e} onClick={() => setDetail(e)} />)}
            {search.q.trim() && (
              <button className="btn block" onClick={custom}>
                <IconPlus /> Créer « {search.q.trim()} »
              </button>
            )}
            {!search.results.length && !search.q.trim() && <div className="muted center small">Aucun exercice dans ce groupe.</div>}
          </div>
        </div>
      )}
    </Sheet>
  )
}
