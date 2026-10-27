import { buildCycle, groupLabel, loadFor, setLabels, type CatalogExercise } from '../data/catalog'
import { formatDuration } from '../logic/util'

const repsText = (reps?: number, durationSec?: number, parCote = false) =>
  durationSec != null ? formatDuration(durationSec) : reps != null ? `${reps} rép.${parCote ? ' / côté' : ''}` : '—'

/** Tableau du cycle préconisé : série, répétitions, charge (selon la charge de travail), repos. */
export function Prescription({ ex, workLoad }: { ex: CatalogExercise; workLoad?: number }) {
  const sets = buildCycle(ex)
  const labels = setLabels(sets)
  return (
    <div className="prescription">
      {sets.map((s, i) => {
        const kg = loadFor(s, workLoad)
        const charge = !ex.charge || ex.cardio ? '' : kg != null ? `${kg} kg` : s.phase === 'travail' ? '100 %' : s.pct != null ? `${s.pct} %` : ''
        return [
          <span key={`l${i}`} className="k">{labels[i]}</span>,
          <span key={`r${i}`}>{repsText(s.reps, s.durationSec, ex.par_cote)}</span>,
          <span key={`c${i}`} className="r">{charge}</span>,
          <span key={`p${i}`} className="r">{s.restSec ? `repos ${formatDuration(s.restSec)}` : ''}</span>,
        ]
      })}
    </div>
  )
}

export function exerciseSubtitle(e: CatalogExercise): string {
  return [groupLabel(e.groupe_musculaire), e.equipement, e.charge ? null : 'poids du corps', e.par_cote ? 'par côté' : null]
    .filter((x, i, a) => x && a.indexOf(x) === i)
    .join(' · ')
}
