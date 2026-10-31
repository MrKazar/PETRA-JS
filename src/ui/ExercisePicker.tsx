import { useMemo, useState } from 'react'
import { CATALOG, cardioSummary, exerciseFromCatalog, pdcSummary, groupLabel, type CatalogExercise } from '../data/catalog'
import { KINDS, ZONES, findMuscle, findZone, kindOf, muscleIdOf, norm, worksSecondary, type Kind } from '../data/muscles'
import type { ProgramExercise } from '../data/types'
import { uid } from '../logic/util'
import { NumInput, Sheet } from './kit'
import { IconChevron, IconPlus, IconSearch } from './icons'
import { Prescription, exerciseSubtitle } from './Prescription'

export function useCatalogSearch() {
  const [q, setQ] = useState('')
  const [zone, setZone] = useState<string>()
  const [muscle, setMuscle] = useState<string>()
  const [kind, setKind] = useState<Kind>('tous')
  const m = findMuscle(muscle)
  const z = findZone(zone)
  const { results, secondary } = useMemo(() => {
    const nq = norm(q.trim())
    const zoneMuscles = new Set(z?.muscles.map((x) => x.id))
    const kindOk = (e: CatalogExercise) => kind === 'tous' || kindOf(e) === kind
    const textOk = (e: CatalogExercise) => !nq || norm(e.nom).includes(nq) || norm(e.equipement).includes(nq) || norm(findMuscle(muscleIdOf(e))?.label ?? '').includes(nq)
    const results = CATALOG.filter((e) => {
      const id = muscleIdOf(e)
      return (!m || id === m.id) && (!z || m || zoneMuscles.has(id ?? '')) && kindOk(e) && textOk(e)
    })
    const secondary = m ? CATALOG.filter((e) => muscleIdOf(e) !== m.id && worksSecondary(e, m) && kindOk(e) && textOk(e)) : []
    return { results, secondary }
  }, [q, z, m, kind])
  /** Groupe à donner à un exercice créé à la main. */
  const group = m?.group ?? z?.muscles[0]?.group
  const browsing = !q.trim() && !m
  return { q, setQ, zone, setZone, muscle, setMuscle, kind, setKind, results, secondary, group, browsing }
}

type Search = ReturnType<typeof useCatalogSearch>

const count = (pred: (e: CatalogExercise) => boolean, kind: Kind) => CATALOG.filter((e) => pred(e) && (kind === 'tous' || kindOf(e) === kind)).length

/** Recherche + navigation zone → muscle → exercices. */
export function CatalogFilters({ q, setQ, zone, setZone, muscle, setMuscle, kind, setKind }: Search) {
  const z = findZone(zone)
  const m = findMuscle(muscle)
  return (
    <>
      <div className="row" style={{ position: 'relative' }}>
        <IconSearch style={{ position: 'absolute', left: 12, width: 18, color: 'var(--faint)' }} />
        <input className="input" style={{ paddingLeft: 38 }} placeholder="Rechercher (nom, muscle, matériel)…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="chips scroll">
        {KINDS.map((k) => (
          <button key={k.kind} className={`chip${kind === k.kind ? ' on' : ''}`} onClick={() => setKind(k.kind)}>{k.label}</button>
        ))}
      </div>
      {(z || m) && (
        <div className="crumbs">
          <button onClick={() => { setZone(undefined); setMuscle(undefined) }}>Toutes les zones</button>
          {z && <><span>›</span><button className={m ? '' : 'on'} onClick={() => setMuscle(undefined)}>{z.label}</button></>}
          {m && <><span>›</span><button className="on">{m.label}</button></>}
        </div>
      )}
    </>
  )
}

/** Étapes de navigation : zones, puis muscles d'une zone. Rien quand on affiche des exercices. */
export function CatalogBrowse({ zone, setZone, muscle, setMuscle, kind, q }: Search) {
  if (q.trim() || muscle) return null
  const z = findZone(zone)
  if (!z) {
    return (
      <div className="zone-grid">
        {ZONES.map((x) => {
          const ids = new Set(x.muscles.map((mm) => mm.id))
          return (
            <button key={x.id} className="zone-card" onClick={() => setZone(x.id)}>
              <span className="n">{x.label}</span>
              <span className="small muted">{x.muscles.map((mm) => mm.label.replace(/ \(.*\)/, '')).join(' · ')}</span>
              <span className="c">{count((e) => ids.has(muscleIdOf(e) ?? ''), kind)} exercices</span>
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div className="list">
      {z.muscles.map((mm) => (
        <button key={mm.id} className="list-item clickable" style={{ width: '100%', textAlign: 'left' }} onClick={() => setMuscle(mm.id)}>
          <div className="grow">
            <div style={{ fontWeight: 600 }}>{mm.label}</div>
            {mm.hint && <div className="small muted">{mm.hint}</div>}
          </div>
          <span className="badge">{count((e) => muscleIdOf(e) === mm.id, kind)}</span>
          <IconChevron style={{ width: 18, color: 'var(--faint)', flex: 'none' }} />
        </button>
      ))}
      <div className="eyebrow" style={{ marginTop: 6 }}>Tous les exercices · {z.label}</div>
    </div>
  )
}

/** Liste des exercices trouvés, avec ceux qui travaillent le muscle en secondaire. */
export function CatalogResults({ search, onOpen, limit = 400 }: { search: Search; onOpen: (e: CatalogExercise) => void; limit?: number }) {
  const m = findMuscle(search.muscle)
  return (
    <>
      {!search.browsing && <div className="small muted">{search.results.length} exercice{search.results.length > 1 ? 's' : ''}{m ? ` · ${m.label}` : ''}</div>}
      {(!search.browsing || search.zone) && (
        <div className="list">
          {search.results.slice(0, limit).map((e) => <CatalogRow key={e.id} e={e} onClick={() => onOpen(e)} />)}
        </div>
      )}
      {search.secondary.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginTop: 8 }}>Travaillent aussi ce muscle</div>
          <div className="list">
            {search.secondary.slice(0, limit).map((e) => <CatalogRow key={e.id} e={e} onClick={() => onOpen(e)} />)}
          </div>
        </>
      )}
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
/** bare : sans les séries préconisées ni la charge (choix d'un exercice de superset, réglé ensuite). */
export function CatalogDetail({ ex, onAdd, addLabel = 'Ajouter', bare = false }: { ex: CatalogExercise; onAdd: (p: ProgramExercise) => void; addLabel?: string; bare?: boolean }) {
  const [load, setLoad] = useState<number>()
  return (
    <div className="stack">
      <div className="small muted" style={{ marginTop: -6 }}>{exerciseSubtitle(ex)}</div>
      {ex.muscles_secondaires.length > 0 && (
        <div className="chips">
          {ex.muscles_secondaires.map((m) => <span key={m} className="badge">{groupLabel(m)}</span>)}
        </div>
      )}
      {!bare && <div className="card tight">
        <div className="eyebrow" style={{ marginBottom: 8 }}>{ex.cardio ? (ex.cardio.mode === 'duree' ? 'Durée conseillée' : ex.cardio.mode === 'intervalles' ? 'Fractionné conseillé' : 'Répétitions conseillées') : ex.pdc ? 'Séries conseillées' : 'Cycle préconisé'}</div>
        <Prescription ex={ex} workLoad={load} />
      </div>}
      {!bare && ex.cardio && <div className="small muted">{ex.cardio.consigne} Intensité {ex.cardio.intensite}. Durée et tours se règlent ensuite dans le programme.</div>}
      {!bare && ex.pdc && <div className="small muted">Au poids du corps : pas de chauffe ni d’hypertrophie. Séries, répétitions (ou temps, ou échec) et repos se règlent ensuite dans le programme.</div>}
      {!bare && ex.charge && !ex.cardio && (
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

export function ExercisePicker({ open, onClose, onPick, defaultRest, forSuperset = false }: { open: boolean; onClose: () => void; onPick: (ex: ProgramExercise) => void; defaultRest: number; forSuperset?: boolean }) {
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
    <Sheet open={open} onClose={detail ? () => setDetail(undefined) : close} title={detail ? detail.nom : forSuperset ? 'Exercice du superset' : 'Ajouter un exercice'}>
      {detail ? (
        <CatalogDetail
          ex={detail}
          bare={forSuperset}
          addLabel={forSuperset ? 'Ajouter au superset' : undefined}
          onAdd={(p) => {
            setDetail(undefined)
            onPick(p)
          }}
        />
      ) : (
        <div className="stack">
          <CatalogFilters {...search} />
          <CatalogBrowse {...search} />
          <CatalogResults search={search} onOpen={setDetail} limit={150} />
          {search.q.trim() && (
            <button className="btn block" onClick={custom}>
              <IconPlus /> Créer « {search.q.trim()} »
            </button>
          )}
          {!search.browsing && !search.results.length && !search.q.trim() && <div className="muted center small">Aucun exercice avec ce filtre.</div>}
        </div>
      )}
    </Sheet>
  )
}
