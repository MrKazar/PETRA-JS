import { useState } from 'react'
import { useData } from '../data/store'
import { useNav } from '../nav'
import { saveProgram } from '../logic/actions'
import { uid, WEEKDAYS } from '../logic/util'
import { groupLabel } from '../data/catalog'
import { Empty, Sheet, TopBar } from '../ui/kit'
import { IconChevron, IconDumbbell, IconPlus } from '../ui/icons'

export function ProgramsScreen() {
  const data = useData()
  const nav = useNav()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const create = () => {
    if (!name.trim()) return
    const id = uid()
    saveProgram({ id, name: name.trim(), exercises: [], createdAt: Date.now() })
    setCreating(false)
    setName('')
    nav.push({ name: 'program', id })
  }

  return (
    <div className="screen">
      <div className="screen-inner">
        <TopBar title="Programmes" />
        {data.programs.length ? (
          <div className="list">
            {data.programs.map((p) => {
              const groups = [...new Set(p.exercises.map((e) => groupLabel(e.group)))].slice(0, 4)
              const days = WEEKDAYS.filter((_, i) => data.weekPlan[i] === p.id).map((d) => d.slice(0, 3).toLowerCase())
              return (
                <div key={p.id} className="card clickable" onClick={() => nav.push({ name: 'program', id: p.id })}>
                  <div className="row">
                    <div className="grow">
                      <h3>{p.name}</h3>
                      <div className="small muted" style={{ marginTop: 4 }}>
                        {p.exercises.length} exercice{p.exercises.length > 1 ? 's' : ''} · {p.exercises.reduce((n, e) => n + e.sets.length, 0)} séries
                        {days.length ? ` · ${days.join(', ')}` : ''}
                      </div>
                      {groups.length > 0 && (
                        <div className="chips" style={{ marginTop: 8 }}>
                          {groups.map((g) => <span key={g} className="badge gold">{g}</span>)}
                        </div>
                      )}
                    </div>
                    <IconChevron style={{ width: 20, color: 'var(--faint)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <Empty icon={<IconDumbbell />}>
            Aucun programme pour l’instant.
            <br />
            Crée tes séances (ex. Push, Jambes, Haut du corps…) avec le bouton +.
          </Empty>
        )}
        <div className="fab-space" />
      </div>
      <button className="fab" aria-label="Nouveau programme" onClick={() => setCreating(true)}>
        <IconPlus />
      </button>
      <Sheet open={creating} onClose={() => setCreating(false)} title="Nouveau programme">
        <div className="stack">
          <input className="input" autoFocus placeholder="Nom de la séance (ex. Push)" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
          <button className="btn primary block big" disabled={!name.trim()} onClick={create}>Créer</button>
        </div>
      </Sheet>
    </div>
  )
}
