import { useState } from 'react'
import type { ProgramExercise, SupersetPart } from '../data/types'
import { supersetSets } from '../logic/session'
import { uid } from '../logic/util'
import { ExercisePicker } from './ExercisePicker'
import { NumInput, Sheet } from './kit'
import { IconPlus, IconTrash, IconX } from './icons'

/** Exercice du catalogue → exercice de superset (répétitions de sa série de travail, charge de travail). */
function toPart(ex: ProgramExercise): SupersetPart {
  const work = ex.sets.find((s) => s.phase === 'travail' || s.phase === 'serie' || s.phase === 'cardio') ?? ex.sets[0]
  return {
    ...(ex.catalogId ? { catalogId: ex.catalogId } : {}),
    name: ex.name,
    group: ex.group,
    parCote: ex.parCote,
    ...(ex.usesLoad === false ? { usesLoad: false } : {}),
    ...(work?.durationSec != null ? { durationSec: work.durationSec } : { reps: work?.reps ?? 10 }),
    ...(ex.workLoad != null ? { weight: ex.workLoad } : {}),
  }
}

/** Création ou modification d'un superset : exercices combinés, nombre de tours, repos entre les tours. */
export function SupersetEditor({
  initial,
  defaultRest,
  onClose,
  onSave,
  onDelete,
}: {
  initial?: ProgramExercise
  defaultRest: number
  onClose: () => void
  onSave: (ex: ProgramExercise) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initial?.name ?? 'Superset')
  const [parts, setParts] = useState<SupersetPart[]>(initial?.parts ?? [])
  const [rounds, setRounds] = useState(initial?.sets.length ?? 3)
  const [rest, setRest] = useState(initial?.restSec ?? defaultRest)
  const [picking, setPicking] = useState(!initial)
  const patch = (i: number, p: Partial<SupersetPart>) => setParts(parts.map((x, k) => (k === i ? { ...x, ...p } : x)))

  const save = () => {
    onSave({
      id: initial?.id ?? uid(),
      name: name.trim() || 'Superset',
      group: 'superset',
      parCote: false,
      restSec: rest,
      parts,
      sets: supersetSets(parts, rounds, rest),
      ...(initial?.note ? { note: initial.note } : {}),
    })
  }

  return (
    <>
      <Sheet open={!picking} onClose={onClose} title={initial ? 'Modifier le superset' : 'Nouveau superset'}>
        <div className="stack">
          <p className="muted small" style={{ margin: 0 }}>Les exercices s’enchaînent sans pause ; un seul Valider par tour, puis repos.</p>
          <label className="field">
            <span>Nom</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Épaules poulie" />
          </label>

          <div className="list">
            {parts.map((p, i) => (
              <div key={i} className="list-item" style={{ alignItems: 'center' }}>
                <span className="ss-dot" />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="ellipsis" style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="row" style={{ gap: 4, marginTop: 4 }}>
                    {p.durationSec != null ? (
                      <><NumInput value={p.durationSec} width={52} onChange={(v) => patch(i, { durationSec: v ?? 0 })} /><span className="small faint">s</span></>
                    ) : (
                      <><NumInput value={p.reps} width={48} onChange={(v) => patch(i, { reps: v })} /><span className="small faint">{p.parCote ? 'reps/côté' : 'reps'}</span></>
                    )}
                    {p.usesLoad !== false && p.durationSec == null && (
                      <><NumInput value={p.weight} width={56} placeholder="kg" onChange={(v) => patch(i, { weight: v })} /><span className="small faint">kg</span></>
                    )}
                  </div>
                </div>
                <button className="icon-btn" aria-label={`Retirer ${p.name}`} onClick={() => setParts(parts.filter((_, k) => k !== i))}><IconX /></button>
              </div>
            ))}
          </div>
          <button className="btn block" onClick={() => setPicking(true)}>
            <IconPlus /> Ajouter un exercice au superset
          </button>

          <div className="row">
            <label className="field grow">
              <span>Tours</span>
              <NumInput value={rounds} onChange={(v) => setRounds(Math.max(1, Math.round(v ?? 1)))} />
            </label>
            <label className="field grow">
              <span>Repos entre les tours (s)</span>
              <NumInput value={rest} onChange={(v) => setRest(Math.max(0, Math.round(v ?? 0)))} />
            </label>
          </div>

          <button className="btn primary block big" disabled={parts.length < 2} onClick={save}>
            {parts.length < 2 ? 'Ajoute au moins 2 exercices' : initial ? 'Enregistrer' : `Créer le superset (${parts.length} exercices)`}
          </button>
          {onDelete && (
            <button className="btn danger block" onClick={onDelete}>
              <IconTrash /> Supprimer le superset
            </button>
          )}
        </div>
      </Sheet>
      <ExercisePicker
        forSuperset
        open={picking}
        defaultRest={defaultRest}
        onClose={() => (parts.length || initial ? setPicking(false) : onClose())}
        onPick={(ex) => {
          setParts([...parts, toPart(ex)])
          setPicking(false)
        }}
      />
    </>
  )
}
