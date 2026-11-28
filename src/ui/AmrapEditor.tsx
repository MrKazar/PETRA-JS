import { useState } from 'react'
import type { ProgramExercise, SupersetPart } from '../data/types'
import { AMRAP_DURATIONS, makeAmrap } from '../logic/amrap'
import { toPart } from './SupersetEditor'
import { ExercisePicker } from './ExercisePicker'
import { NumInput, Sheet } from './kit'
import { IconDown, IconPlus, IconTrash, IconUp, IconX } from './icons'

/** Création ou modification d'un AMRAP : nom, durée, circuit d'un tour (1.4.3). */
export function AmrapEditor({
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
  const [name, setName] = useState(initial?.name ?? 'AMRAP')
  // Le tour type (première série) garde les répétitions réglées dans le programme.
  const [parts, setParts] = useState<SupersetPart[]>(
    (initial?.parts ?? []).map((p, k) => ({ ...p, ...(initial?.sets[0]?.parts?.[k] ?? {}) })),
  )
  const [minutes, setMinutes] = useState<number | undefined>(initial?.amrap ? initial.amrap.capSec / 60 : 10)
  const [custom, setCustom] = useState(initial?.amrap ? !AMRAP_DURATIONS.includes(initial.amrap.capSec / 60) : false)
  const [picking, setPicking] = useState(!initial)
  const move = (i: number, d: number) => {
    const next = [...parts]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    setParts(next)
  }
  const patch = (i: number, p: Partial<SupersetPart>) => setParts(parts.map((x, k) => (k === i ? { ...x, ...p } : x)))
  const capSec = Math.round((minutes ?? 0) * 60)
  const ok = parts.length >= 1 && capSec >= 60

  return (
    <>
      <Sheet open={!picking} onClose={onClose} title={initial ? 'Modifier l’AMRAP' : 'Nouvel AMRAP'}>
        <div className="stack">
          <p className="muted small" style={{ margin: 0 }}>Autant de tours que possible dans le temps donné. Le circuit tourne en boucle, sans repos imposé.</p>
          <label className="field">
            <span>Nom</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Cindy" />
          </label>

          <div className="field">
            <span>Durée</span>
            <div className="seg" role="group" aria-label="Durée">
              {AMRAP_DURATIONS.map((m, i) => (
                <button key={m} className={!custom && minutes === m ? 'on' : ''} aria-pressed={!custom && minutes === m} onClick={() => { setCustom(false); setMinutes(m) }}>
                  {i === 0 ? `${m} min` : m}
                </button>
              ))}
              <button className={custom ? 'on' : ''} aria-pressed={custom} aria-label="Autre durée" onClick={() => setCustom(true)}>…</button>
            </div>
            {custom && (
              <div className="row" style={{ gap: 6 }}>
                <NumInput value={minutes} width={70} label="Durée en minutes" onChange={(v) => setMinutes(v)} />
                <span className="small faint">min</span>
              </div>
            )}
          </div>

          <div className="field"><span>Circuit (un tour)</span></div>
          <div className="list">
            {parts.map((p, i) => (
              <div key={i} className="list-item" style={{ alignItems: 'center' }}>
                <span className="ss-dot" />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="ellipsis" style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="row" style={{ gap: 4, marginTop: 4 }}>
                    {p.durationSec != null ? (
                      <><NumInput value={p.durationSec} width={52} label={`Durée en secondes, ${p.name}`} onChange={(v) => patch(i, { durationSec: v ?? 0 })} /><span className="small faint">s</span></>
                    ) : (
                      <><NumInput value={p.reps} width={48} label={`Répétitions, ${p.name}`} onChange={(v) => patch(i, { reps: v })} /><span className="small faint">{p.parCote ? 'rép. / côté' : 'rép.'}</span></>
                    )}
                    {p.usesLoad !== false && p.durationSec == null && (
                      <><NumInput value={p.weight} width={56} placeholder="kg" label={`Charge en kilos, ${p.name}`} onChange={(v) => patch(i, { weight: v })} /><span className="small faint">kg</span></>
                    )}
                  </div>
                </div>
                <div className="stack" style={{ gap: 0 }}>
                  <button className="icon-btn" style={{ height: 30 }} aria-label={`Monter ${p.name}`} disabled={i === 0} onClick={() => move(i, -1)}><IconUp /></button>
                  <button className="icon-btn" style={{ height: 30 }} aria-label={`Descendre ${p.name}`} disabled={i === parts.length - 1} onClick={() => move(i, 1)}><IconDown /></button>
                </div>
                <button className="icon-btn" aria-label={`Retirer ${p.name}`} onClick={() => setParts(parts.filter((_, k) => k !== i))}><IconX /></button>
              </div>
            ))}
          </div>
          <button className="btn block" onClick={() => setPicking(true)}>
            <IconPlus /> Ajouter un exercice au circuit
          </button>

          <button className="btn primary block big" disabled={!ok} onClick={() => onSave(makeAmrap(name, parts, capSec, initial))}>
            {!parts.length ? 'Ajoute au moins 1 exercice' : capSec < 60 ? 'Durée d’au moins 1 min' : initial ? 'Enregistrer' : `Créer l’AMRAP · ${minutes} min · ${parts.length} exercice${parts.length > 1 ? 's' : ''}`}
          </button>
          {onDelete && (
            <button className="btn danger block" onClick={onDelete}>
              <IconTrash /> Supprimer l’AMRAP
            </button>
          )}
        </div>
      </Sheet>
      <ExercisePicker
        forSuperset
        block="AMRAP"
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
