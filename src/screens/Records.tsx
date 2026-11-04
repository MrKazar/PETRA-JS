import { useData } from '../data/store'
import { useNav } from '../nav'
import { personalRecords } from '../logic/session'
import { Empty, TopBar } from '../ui/kit'
import { formatDuration } from '../logic/util'
import { IconTrophy } from '../ui/icons'

export function RecordsScreen() {
  const data = useData()
  const nav = useNav()
  const prs = personalRecords(data.sessions)
  return (
    <div className="screen">
      <div className="screen-inner">
        <TopBar title="Records personnels" onBack={nav.pop} />
        {!prs.length && <Empty icon={<IconTrophy />}>Tes meilleures charges (et tes meilleures séries au poids du corps) apparaîtront ici dès que tu auras validé des séries.</Empty>}
        <div className="list">
          {prs.map((r) => (
            <div key={r.name} className="list-item">
              <IconTrophy style={{ width: 22, color: 'var(--khaki)', flex: 'none' }} />
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div className="small muted">
                  {new Date(r.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} · {r.sessions} séance{r.sessions > 1 ? 's' : ''} {r.kind === 'charge' ? ` · 1RM estimé ${Math.round(r.best1RM)} kg` : ' · poids du corps'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {r.kind === 'charge' ? (
                  <>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{String(r.bestWeight).replace('.', ',')} kg</div>
                    <div className="small faint">× {r.repsAtBest}</div>
                  </>
                ) : r.kind === 'reps' ? (
                  <>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{r.bestReps}</div>
                    <div className="small faint">rép. d’affilée</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{formatDuration(r.bestSec ?? 0)}</div>
                    <div className="small faint">tenu</div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
