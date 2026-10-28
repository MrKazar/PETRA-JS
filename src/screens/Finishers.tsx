import { useState } from 'react'
import { ScanSheet, ShareSheet } from '../ui/Share'
import { shareFinisher } from '../logic/share'
import { useData } from '../data/store'
import type { FinisherType } from '../data/types'
import { DEFAULT_FINISHERS, FINISHER_EXERCISES, FINISHER_TYPES, drawFinisher, finisherTypeLabel, finishersOf, formatItem, type Finisher, type FinisherItem } from '../data/finishers'
import { deleteFinisher, resetFinishers, saveFinisher, saveSettings } from '../logic/actions'
import { uid } from '../logic/util'
import { Header, NumInput, SectionTitle, Sheet, Toggle, confirmAction, toast } from '../ui/kit'
import { IconQr, IconCopy, IconDown, IconFlame, IconPlus, IconTrash, IconUp, IconX } from '../ui/icons'

export function FinishersScreen() {
  const data = useData()
  const finishers = finishersOf(data)
  const [preview, setPreview] = useState<Finisher>()
  const [editing, setEditing] = useState<Finisher>()
  const [scanning, setScanning] = useState(false)
  const done = data.sessions.filter((s) => s.finisher)
  const countById = new Map<string, number>()
  for (const s of done) countById.set(s.finisher!.id, (countById.get(s.finisher!.id) ?? 0) + 1)

  const draw = (type: FinisherType) => setPreview(drawFinisher(type, preview?.type === type ? preview.id : data.lastFinisher[type], finishers))
  const create = (type: FinisherType) => {
    const n = finishers.filter((f) => f.type === type).length + 1
    setEditing({ id: uid(), type, name: `${finisherTypeLabel(type)} ${n}`, items: [] })
  }

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
            <div className="stat"><div className="v">{finishers.length}</div><div className="l">Finishers</div></div>
            <div className="stat"><div className="v">{done.length}</div><div className="l">Réalisés</div></div>
          </div>
          <div className="small muted">Touche un finisher pour changer ses exercices et ses répétitions, ou pour le partager.</div>
          <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setScanning(true)}><IconQr style={{ width: 16 }} /> Scanner un QR code</button>
          {data.finishers && (
            <button
              className="btn sm ghost"
              style={{ alignSelf: 'flex-start', paddingLeft: 0 }}
              onClick={() => {
                if (!confirmAction(`Remettre les ${DEFAULT_FINISHERS.length} finishers d’origine ? Tes modifications seront perdues.`)) return
                resetFinishers()
                toast('Finishers d’origine remis')
              }}
            >
              Remettre les finishers d’origine
            </button>
          )}
        </div>

        {FINISHER_TYPES.map((t) => {
          const pool = finishers.filter((f) => f.type === t.type)
          return (
            <div key={t.type} className="stack" style={{ gap: 8 }}>
              <SectionTitle
                right={
                  <span className="row" style={{ gap: 0 }}>
                    {pool.length > 0 && <button className="btn ghost sm" onClick={() => draw(t.type)}><IconFlame style={{ width: 16 }} /> Tirer</button>}
                    <button className="btn ghost sm" onClick={() => create(t.type)}><IconPlus style={{ width: 16 }} /> Nouveau</button>
                  </span>
                }
              >
                {t.label}
              </SectionTitle>
              {pool.length === 0 && <div className="small faint">Aucun finisher de ce type : il ne sera pas proposé.</div>}
              {pool.map((f) => (
                <button key={f.id} className="card tight clickable" style={{ textAlign: 'left', width: '100%', cursor: 'pointer' }} onClick={() => setEditing(f)}>
                  <div className="row">
                    <div className="grow" style={{ fontWeight: 600 }}>{f.name}</div>
                    {data.lastFinisher[t.type] === f.id && <span className="badge olive">Dernier tiré</span>}
                    {countById.get(f.id) ? <span className="badge green">{countById.get(f.id)}×</span> : null}
                  </div>
                  <div className="small muted" style={{ marginTop: 4 }}>{f.items.length ? f.items.map(formatItem).join(' · ') : 'Aucun exercice'}</div>
                </button>
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
                {preview.items.map((it, i) => <li key={i}>{formatItem(it)}</li>)}
              </ol>
            </div>
            <div className="small muted">Aperçu : le tirage qui compte se fait quand tu termines une séance.</div>
            <button className="btn block" onClick={() => draw(preview.type)}>Retirer au sort</button>
          </div>
        )}
      </Sheet>

      {scanning && <ScanSheet onClose={() => setScanning(false)} />}
      {editing && (
        <FinisherEditor
          key={editing.id}
          initial={editing}
          isNew={!finishers.some((f) => f.id === editing.id)}
          onClose={() => setEditing(undefined)}
          onDuplicate={(f) => setEditing({ ...f, id: uid(), name: `${f.name} (copie)` })}
        />
      )}
    </div>
  )
}

const KINDS: { kind: FinisherItem['kind']; label: string }[] = [
  { kind: 'reps', label: 'rép.' },
  { kind: 'temps', label: 'sec.' },
  { kind: 'echec', label: 'échec' },
]

function FinisherEditor({ initial, isNew, onClose, onDuplicate }: { initial: Finisher; isNew: boolean; onClose: () => void; onDuplicate: (f: Finisher) => void }) {
  const [f, setF] = useState<Finisher>(initial)
  const [picking, setPicking] = useState(initial.items.length === 0)
  const [sharing, setSharing] = useState(false)
  const setItem = (i: number, patch: Partial<FinisherItem>) => setF({ ...f, items: f.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) })
  const move = (i: number, d: number) => {
    const items = [...f.items]
    ;[items[i], items[i + d]] = [items[i + d], items[i]]
    setF({ ...f, items })
  }
  const add = (it: FinisherItem) => setF({ ...f, items: [...f.items, { ...it }] })
  const valid = f.name.trim() && f.items.length > 0 && f.items.every((it) => it.name.trim())
  const save = () => {
    saveFinisher({ ...f, name: f.name.trim(), items: f.items.map((it) => ({ ...it, name: it.name.trim(), value: it.kind === 'echec' ? undefined : it.value ?? 10 })) })
    toast(isNew ? 'Finisher ajouté' : 'Finisher enregistré')
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={isNew ? 'Nouveau finisher' : f.name}>
      <div className="stack">
        <label className="field">
          <span>Nom · {finisherTypeLabel(f.type)}</span>
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </label>

        <div>
          {f.items.map((it, i) => (
            <div key={i} style={{ padding: '8px 0', borderTop: i ? '1px solid var(--line)' : undefined }}>
              <div className="row" style={{ gap: 6 }}>
                <input className="input grow" style={{ minHeight: 40, padding: '6px 10px', minWidth: 0 }} value={it.name} placeholder="Exercice" onChange={(e) => setItem(i, { name: e.target.value })} />
                <button className="icon-btn" style={{ width: 32 }} aria-label="Monter" disabled={i === 0} onClick={() => move(i, -1)}><IconUp /></button>
                <button className="icon-btn" style={{ width: 32 }} aria-label="Descendre" disabled={i === f.items.length - 1} onClick={() => move(i, 1)}><IconDown /></button>
                <button className="icon-btn" style={{ width: 32 }} aria-label="Retirer" onClick={() => setF({ ...f, items: f.items.filter((_, j) => j !== i) })}><IconX /></button>
              </div>
              <div className="row" style={{ gap: 6, marginTop: 6 }}>
                {it.kind !== 'echec' && <NumInput value={it.value} width={64} onChange={(v) => setItem(i, { value: v == null ? undefined : Math.max(0, Math.round(v)) })} />}
                <div className="seg grow" style={{ padding: 2 }}>
                  {KINDS.map((k) => (
                    <button key={k.kind} className={it.kind === k.kind ? 'on' : ''} style={{ minHeight: 32 }} onClick={() => setItem(i, { kind: k.kind, value: k.kind === 'echec' ? undefined : it.value ?? (k.kind === 'temps' ? 30 : 10) })}>
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {picking ? (
          <div className="card tight stack" style={{ gap: 8 }}>
            <div className="row between">
              <span className="eyebrow">Exercices {finisherTypeLabel(f.type).toLowerCase()}</span>
              <button className="btn ghost sm" onClick={() => setPicking(false)}>Fermer</button>
            </div>
            <div className="chips">
              {FINISHER_EXERCISES[f.type].map((it) => (
                <button key={`${it.kind}${it.name}`} className="chip" onClick={() => add(it)}>
                  <IconPlus style={{ width: 14 }} /> {formatItem(it)}
                </button>
              ))}
              <button className="chip" onClick={() => add({ name: '', kind: 'reps', value: 10 })}>
                <IconPlus style={{ width: 14 }} /> Autre exercice…
              </button>
            </div>
          </div>
        ) : (
          <button className="btn block" onClick={() => setPicking(true)}>
            <IconPlus /> Ajouter un exercice
          </button>
        )}

        <button className="btn primary block" disabled={!valid} onClick={save}>Enregistrer</button>
        {!isNew && (
          <div className="row">
            <button className="btn grow" onClick={() => setSharing(true)}><IconQr /> Partager</button>
            <button className="btn grow" onClick={() => onDuplicate(f)}><IconCopy /> Dupliquer</button>
            <button
              className="btn danger grow"
              onClick={() => {
                if (!confirmAction(`Supprimer « ${f.name} » ?`)) return
                deleteFinisher(f.id)
                onClose()
              }}
            >
              <IconTrash /> Supprimer
            </button>
          </div>
        )}
        {sharing && <ShareSheet payload={shareFinisher(f)} title={`Partager « ${f.name} »`} onClose={() => setSharing(false)} />}
      </div>
    </Sheet>
  )
}
