import { useState } from 'react'
import { applyOverload, setLoadStep } from '../logic/actions'
import type { OverloadSuggestion } from '../logic/progress'
import { NumInput, toast } from './kit'
import { IconUp } from './icons'

const kg = (v: number) => `${String(v).replace('.', ',')} kg`

/** Écarts les plus courants entre deux plaques d'une machine ou d'une poulie. */
const STEPS = [1, 2.5, 5, 10]

/** Proposition de surcharge progressive, avec bouton pour l'appliquer au programme. */
export function OverloadCard({ programId, s, showName = false }: { programId: string; s: OverloadSuggestion; showName?: boolean }) {
  const [other, setOther] = useState<number>()
  if (s.needsStep) {
    const pick = (step: number) => {
      setLoadStep(programId, s.exerciseId, step)
      toast(`${s.name} : écart de ${kg(step)} retenu`)
    }
    return (
      <div className="overload" style={{ flexWrap: 'wrap' }}>
        <IconUp style={{ width: 20, color: 'var(--success)', flex: 'none' }} />
        <div className="grow small" style={{ flex: '1 1 200px' }}>
          <div style={{ fontWeight: 600 }}>{showName ? `${s.name} : tu peux` : 'Tu peux'} monter au-dessus de {kg(s.from)}</div>
          <div className="muted">Quel écart entre deux plaques sur cet appareil ? Je le retiens pour les prochaines fois.</div>
          <div className="chips" style={{ marginTop: 6 }} onClick={(ev) => ev.stopPropagation()}>
            {STEPS.map((x) => (
              <button key={x} className="chip" onClick={() => pick(x)}>{kg(x)}</button>
            ))}
            <span className="row" style={{ gap: 4 }}>
              <NumInput value={other} width={56} placeholder="autre" onChange={setOther} />
              <button className="btn sm" disabled={!other || other <= 0} onClick={() => other && pick(other)}>OK</button>
            </span>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="overload">
      <IconUp style={{ width: 20, color: 'var(--success)', flex: 'none' }} />
      <div className="grow small">
        <div style={{ fontWeight: 600 }}>{showName ? `${s.name} : passer` : 'Passer'} à {kg(s.to)}</div>
        <div className="muted">Séries de travail réussies à {kg(s.from)} sur les {s.streak} dernières séances.</div>
      </div>
      <button
        className="btn sm primary"
        onClick={(ev) => {
          ev.stopPropagation()
          applyOverload(programId, s)
          toast(`${s.name} : charge de travail à ${kg(s.to)}`)
        }}
      >
        Appliquer
      </button>
    </div>
  )
}
