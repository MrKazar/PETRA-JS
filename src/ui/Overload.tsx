import { applyOverload } from '../logic/actions'
import type { OverloadSuggestion } from '../logic/progress'
import { toast } from './kit'
import { IconUp } from './icons'

const kg = (v: number) => `${String(v).replace('.', ',')} kg`

/** Proposition de surcharge progressive, avec bouton pour l'appliquer au programme. */
export function OverloadCard({ programId, s, showName = false }: { programId: string; s: OverloadSuggestion; showName?: boolean }) {
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
