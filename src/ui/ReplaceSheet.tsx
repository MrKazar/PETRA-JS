import { useState } from 'react'
import { CATALOG, exerciseFromCatalog, findCatalog, groupLabel, type CatalogExercise } from '../data/catalog'
import { findMuscle, kindOf, muscleIdOf } from '../data/muscles'
import type { ProgramExercise, SessionExercise } from '../data/types'
import { ExercisePicker } from './ExercisePicker'
import { Sheet } from './kit'
import { IconChevron, IconSearch } from './icons'

const KIND_LABEL = { libre: 'Charge libre', machine: 'Machine / poulie', pdc: 'Poids du corps', cardio: 'Cardio' } as const

/**
 * « Remplacer » en séance : les exercices du même muscle, rangés par matériel (machine prise, pas d'haltères…).
 * Pour cette séance seulement : le programme ne change pas.
 */
export function ReplaceSheet({ ex, mode, defaultRest, onClose, onPick }: { ex: SessionExercise; mode: 'guidee' | 'libre'; defaultRest: number; onClose: () => void; onPick: (p: ProgramExercise) => void }) {
  const [searching, setSearching] = useState(false)
  const cur = findCatalog(ex.catalogId)
  const muscle = cur ? muscleIdOf(cur) : undefined
  const same = CATALOG.filter((e) => e.id !== ex.catalogId && !e.cardio && (muscle ? muscleIdOf(e) === muscle : e.groupe_musculaire === ex.group))
  const curKind = cur ? kindOf(cur) : undefined
  // Autre matériel d'abord : c'est en général pour ça qu'on remplace.
  const groups = (['libre', 'machine', 'pdc'] as const)
    .map((k) => ({ k, list: same.filter((e) => kindOf(e) === k) }))
    .filter((g) => g.list.length)
    .sort((a, b) => Number(a.k === curKind) - Number(b.k === curKind))
  const pick = (e: CatalogExercise) => onPick(exerciseFromCatalog(e, undefined, mode))

  return (
    <>
      <Sheet open={!searching} onClose={onClose} title={`Remplacer ${ex.name}`}>
        <div className="stack">
          <p className="small muted" style={{ margin: 0 }}>
            Pour cette séance seulement. Les séries prévues sont gardées, la charge est à saisir. {muscle ? `Même muscle : ${findMuscle(muscle)?.label}.` : `Même groupe : ${groupLabel(ex.group)}.`}
          </p>
          {groups.map((g) => (
            <div key={g.k} className="stack" style={{ gap: 6 }}>
              <div className="eyebrow">{KIND_LABEL[g.k]}{g.k === curKind ? ' (même matériel)' : ''}</div>
              <div className="list">
                {g.list.map((e) => (
                  <button key={e.id} className="list-item clickable" style={{ textAlign: 'left', width: '100%' }} onClick={() => pick(e)}>
                    <div className="grow">
                      <div style={{ fontWeight: 600 }}>{e.nom}</div>
                      <div className="small muted">{e.equipement}</div>
                    </div>
                    <IconChevron style={{ width: 18, color: 'var(--faint)', flex: 'none' }} />
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!groups.length && <div className="muted small center">Pas d’autre exercice pour ce muscle dans le catalogue.</div>}
          <button className="btn block" onClick={() => setSearching(true)}>
            <IconSearch /> Chercher dans tout le catalogue
          </button>
        </div>
      </Sheet>
      <ExercisePicker open={searching} onClose={() => setSearching(false)} defaultRest={defaultRest} onPick={onPick} mode={mode} />
    </>
  )
}
