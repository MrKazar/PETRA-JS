import { useState } from 'react'
import { useData } from '../data/store'
import type { FinisherType } from '../data/types'
import { FINISHERS, FINISHER_TYPES, drawFinisher, type Finisher } from '../data/finishers'
import { saveSettings } from '../logic/actions'
import { Header, SectionTitle, Sheet, Toggle } from '../ui/kit'
import { IconFlame } from '../ui/icons'

export function FinishersScreen() {
  const data = useData()
  const [preview, setPreview] = useState<Finisher>()
  const done = data.sessions.filter((s) => s.finisher)
  const countById = new Map<string, number>()
  for (const s of done) countById.set(s.finisher!.id, (countById.get(s.finisher!.id) ?? 0) + 1)

  const draw = (type: FinisherType) => setPreview(drawFinisher(type, preview?.type === type ? preview.id : data.lastFinisher[type]))

  return (
    <div className="screen">
      <div className="screen-inner">
        <Header title="Finishers" sub="Mini-séance à la fin : un seul tour, à fond" />

        <div className="card stack">
          <div className="row">
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Proposer un finisher en fin de séance</div>
              <div className="small muted">Au moment de terminer, tu choisis le type (ou aucun) et un finisher est tiré au hasard, jamais le même que la fois précédente.</div>
            </div>
            <Toggle on={data.settings.finishersEnabled} onChange={(v) => saveSettings({ finishersEnabled: v })} label="Finishers" />
          </div>
          <div className="stat-grid">
            <div className="stat"><div className="v">{FINISHERS.length}</div><div className="l">Finishers</div></div>
            <div className="stat"><div className="v">{done.length}</div><div className="l">Réalisés</div></div>
          </div>
        </div>

        {FINISHER_TYPES.map((t) => {
          const pool = FINISHERS.filter((f) => f.type === t.type)
          return (
            <div key={t.type} className="stack" style={{ gap: 8 }}>
              <SectionTitle right={<button className="btn ghost sm" onClick={() => draw(t.type)}><IconFlame style={{ width: 16 }} /> Tirer au sort</button>}>{t.label}</SectionTitle>
              {pool.map((f) => (
                <div key={f.id} className="card tight">
                  <div className="row">
                    <div className="grow" style={{ fontWeight: 600 }}>{f.name}</div>
                    {data.lastFinisher[t.type] === f.id && <span className="badge olive">Dernier tiré</span>}
                    {countById.get(f.id) ? <span className="badge green">{countById.get(f.id)}×</span> : null}
                  </div>
                  <div className="small muted" style={{ marginTop: 4 }}>{f.items.join(' · ')}</div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <Sheet open={!!preview} onClose={() => setPreview(undefined)} title={preview?.name}>
        {preview && (
          <div className="stack">
            <div className="card accent">
              <div className="eyebrow">Un seul tour · à fond</div>
              <ol className="finisher-list">
                {preview.items.map((it) => <li key={it}>{it}</li>)}
              </ol>
            </div>
            <div className="small muted">Aperçu : le tirage qui compte se fait quand tu termines une séance.</div>
            <button className="btn block" onClick={() => draw(preview.type)}>Retirer au sort</button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
