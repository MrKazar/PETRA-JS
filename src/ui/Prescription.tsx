import { buildCycle, groupLabel, loadFor, setLabels, type CatalogExercise } from '../data/catalog'
import { formatDuration } from '../logic/util'

const repsText = (reps?: number, durationSec?: number, parCote = false, unit?: string, toFailure = false) =>
  durationSec != null ? formatDuration(durationSec) : toFailure && reps == null ? 'jusqu’à l’échec' : reps != null ? `${reps} ${unit ?? 'rép.'}${parCote ? ' / côté' : ''}` : '—'

/** Tableau du cycle préconisé : série, répétitions, charge (selon la charge de travail), repos. */
export function Prescription({ ex, workLoad }: { ex: CatalogExercise; workLoad?: number }) {
  const sets = buildCycle(ex)
  if ((ex.cardio || ex.pdc) && sets.length > 1) {
    // Séries identiques : une ligne suffit.
    const s = sets[0]
    return (
      <div className="prescription">
        <span className="k">{sets.length} {ex.cardio ? 'tours' : 'séries'}</span>
        <span>{repsText(s.reps, s.durationSec, ex.par_cote, s.unit, s.toFailure)}</span>
        <span className="r" />
        <span className="r">{s.restSec ? `${ex.cardio ? 'récup' : 'repos'} ${formatDuration(s.restSec)}` : ''}</span>
      </div>
    )
  }
  const labels = setLabels(sets)
  return (
    <div className="prescription">
      {sets.map((s, i) => {
        const kg = loadFor(s, workLoad)
        const charge = !ex.charge || ex.cardio ? '' : kg != null ? `${kg} kg` : s.phase === 'travail' ? '100 %' : s.pct != null ? `${s.pct} %` : ''
        return [
          <span key={`l${i}`} className="k">{labels[i]}</span>,
          <span key={`r${i}`}>{repsText(s.reps, s.durationSec, ex.par_cote, s.unit)}</span>,
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
