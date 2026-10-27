import { useEffect, useRef, useState } from 'react'
import { getData, useData } from '../data/store'
import { useNav } from '../nav'
import type { ActiveSession, FinisherType, SessionExercise } from '../data/types'
import { PHASE_LABEL } from '../data/types'
import { groupLabel } from '../data/catalog'
import { FINISHER_TYPES, drawFinisher, type Finisher } from '../data/finishers'
import { abandonSession, finishSession, setActive } from '../logic/actions'
import { addSet, completeSet, extendRest, nextPending, patchSet, removeSet, startRest, statsOf, toSessionExercise } from '../logic/session'
import { buzzRestOver, tap } from '../logic/native'
import { formatClock } from '../logic/util'
import { ExercisePicker } from '../ui/ExercisePicker'
import { Empty, NumInput, Sheet, TopBar, confirmAction } from '../ui/kit'
import { IconCheck, IconFlame, IconPlus, IconSkip, IconTrash, IconX } from '../ui/icons'
import { useNow } from '../ui/useNow'

export function WorkoutScreen() {
  const data = useData()
  const nav = useNav()
  const s = data.active
  const now = useNow(250, !!s)
  const [picking, setPicking] = useState(false)
  const [finishing, setFinishing] = useState(false)

  if (!s) {
    return (
      <div className="screen">
        <div className="screen-inner">
          <TopBar title="Séance" onBack={nav.pop} />
          <Empty>Aucune séance en cours.</Empty>
        </div>
      </div>
    )
  }

  /** Applique une transformation sur la séance la plus récente (évite d'écraser une saisie concurrente). */
  const apply = (fn: (a: ActiveSession) => ActiveSession) => {
    const cur = getData().active
    if (cur) setActive(fn(cur), cur)
  }

  const onCheck = (ex: SessionExercise, i: number) => {
    const set = ex.sets[i]
    if (set.done) {
      apply((a) => patchSet(a, ex.id, i, { done: false, doneAt: undefined }))
      return
    }
    tap()
    apply((a) => {
      let next = completeSet(a, ex.id, i)
      const up = nextPending(next)
      if (up) {
        const sameEx = up.exercise.id === ex.id
        // Repos de l'exercice en cours ; entre deux exercices, celui du réglage par défaut s'il est plus long.
        // Après une série d'échauffement, repos court (60 s max).
        const base = set.phase === 'chauffe' ? Math.min(ex.restSec, 60) : ex.restSec
        const secs = sameEx ? base : Math.max(base, getData().settings.defaultRestSec)
        next = startRest(next, secs, `${up.exercise.name} · série ${up.index + 1}`)
      } else next = { ...next, rest: undefined }
      return next
    })
  }

  const st = statsOf(s, now)
  const up = nextPending(s)

  const askFinish = () => {
    if (st.setsDone === 0 && !confirmAction('Aucune série validée. Terminer quand même ?')) return
    if (data.settings.finishersEnabled) setFinishing(true)
    else complete()
  }
  const complete = (f?: Finisher) => {
    const id = finishSession(f ? { type: f.type, id: f.id, name: f.name, items: f.items } : undefined)
    if (id) nav.replace({ name: 'session', id })
  }
  const abandon = () => {
    if (!confirmAction('Abandonner la séance ? Rien ne sera enregistré.')) return
    abandonSession()
    nav.pop()
  }

  return (
    <div className="screen">
      <div className="screen-inner">
        <TopBar
          title={s.programName}
          onBack={nav.pop}
          right={<span className="badge gold" style={{ fontSize: 14, padding: '4px 10px', fontVariantNumeric: 'tabular-nums' }}>{formatClock((now - s.startedAt) / 1000)}</span>}
        />

        {s.rest && <RestPanel rest={s.rest} now={now} onAdd={() => apply((a) => extendRest(a, 15))} onSkip={() => apply((a) => ({ ...a, rest: undefined }))} />}

        <div className="row small muted between">
          <span>
            {st.setsDone}/{st.setsTotal} séries
          </span>
          {up && !s.rest && <span className="ellipsis" style={{ maxWidth: '65%' }}>Suivant : {up.exercise.name}</span>}
        </div>
        <div className="progress">
          <div style={{ width: `${st.setsTotal ? (st.setsDone / st.setsTotal) * 100 : 0}%` }} />
        </div>

        {s.exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            current={up?.exercise.id === ex.id ? up.index : -1}
            onCheck={(i) => onCheck(ex, i)}
            onPatch={(i, patch) => apply((a) => patchSet(a, ex.id, i, patch))}
            onAddSet={() => apply((a) => addSet(a, ex.id))}
            onRemoveSet={(i) => apply((a) => removeSet(a, ex.id, i))}
            onRemove={() => {
              if (confirmAction(`Retirer ${ex.name} de la séance ?`)) apply((a) => ({ ...a, exercises: a.exercises.filter((e) => e.id !== ex.id) }))
            }}
          />
        ))}

        {!s.exercises.length && <Empty>Séance libre : ajoute les exercices au fur et à mesure.</Empty>}

        <button className="btn block" onClick={() => setPicking(true)}>
          <IconPlus /> Ajouter un exercice
        </button>

        <label className="field">
          <span>Notes de séance</span>
          <textarea className="input" placeholder="Sensations, douleurs, records…" value={s.notes ?? ''} onChange={(e) => apply((a) => ({ ...a, notes: e.target.value }))} />
        </label>

        <button className="btn primary block big" onClick={askFinish}>
          <IconCheck /> Terminer la séance
        </button>
        <button className="btn ghost block" onClick={abandon}>Abandonner</button>
      </div>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        defaultRest={data.settings.defaultRestSec}
        onPick={(ex) => {
          apply((a) => ({ ...a, exercises: [...a.exercises, toSessionExercise(ex)] }))
          setPicking(false)
        }}
      />

      {finishing && <FinisherSheet lastByType={data.lastFinisher} onClose={() => setFinishing(false)} onDone={complete} />}
    </div>
  )
}

function RestPanel({ rest, now, onAdd, onSkip }: { rest: NonNullable<ActiveSession['rest']>; now: number; onAdd: () => void; onSkip: () => void }) {
  const left = (rest.endsAt - now) / 1000
  const total = (rest.endsAt - rest.startedAt) / 1000
  const over = left <= 0
  const buzzed = useRef<number | null>(null)
  useEffect(() => {
    if (over && buzzed.current !== rest.endsAt) {
      buzzed.current = rest.endsAt
      if (getData().settings.vibrate) buzzRestOver()
    }
  }, [over, rest.endsAt])

  return (
    <div className={`rest${over ? ' over' : ''}`}>
      <div className="row">
        <div className="grow">
          <div className="eyebrow" style={{ color: over ? 'var(--green)' : undefined }}>{over ? 'C’est reparti !' : 'Repos'}</div>
          <div className="clock">{over ? `+${formatClock(-left)}` : formatClock(Math.ceil(left))}</div>
          <div className="small muted ellipsis" style={{ marginTop: 4 }}>{rest.label}</div>
        </div>
        <div className="stack" style={{ gap: 6 }}>
          {!over && (
            <button className="btn sm" onClick={onAdd}>
              +15 s
            </button>
          )}
          <button className={`btn sm${over ? ' primary' : ''}`} onClick={onSkip}>
            {over ? 'OK' : <><IconSkip style={{ width: 16 }} /> Passer</>}
          </button>
        </div>
      </div>
      {!over && (
        <div className="progress" style={{ marginTop: 10 }}>
          <div style={{ width: `${Math.min(100, (1 - left / total) * 100)}%` }} />
        </div>
      )}
    </div>
  )
}

function ExerciseCard({
  ex,
  current,
  onCheck,
  onPatch,
  onAddSet,
  onRemoveSet,
  onRemove,
}: {
  ex: SessionExercise
  current: number
  onCheck: (i: number) => void
  onPatch: (i: number, p: { reps?: number; weight?: number; durationSec?: number }) => void
  onAddSet: () => void
  onRemoveSet: (i: number) => void
  onRemove: () => void
}) {
  const allDone = ex.sets.length > 0 && ex.sets.every((x) => x.done)
  const [editing, setEditing] = useState(false)
  return (
    <div className={`card${current >= 0 ? ' accent' : ''}`} style={{ opacity: allDone ? 0.75 : 1 }}>
      <div className="row" style={{ marginBottom: 6 }}>
        <div className="grow">
          <h3>
            {ex.name} {allDone && <IconCheck style={{ width: 16, color: 'var(--green)', verticalAlign: -2 }} />}
          </h3>
          <div className="small muted">
            {groupLabel(ex.group)}
            {ex.parCote ? ' · par côté' : ''}
            {ex.restSec ? ` · repos ${ex.restSec} s` : ''}
          </div>
        </div>
        <button className={`btn sm${editing ? ' primary' : ' ghost'}`} onClick={() => setEditing(!editing)}>{editing ? 'OK' : 'Modifier'}</button>
      </div>
      {ex.note && <div className="small faint" style={{ marginBottom: 6 }}>{ex.note}</div>}
      {ex.sets.map((set, i) => {
        const timed = set.durationSec != null
        return (
          <div key={i} className={`set-row${set.done ? ' done' : ''}`}>
            <span className="idx" style={{ color: i === current ? 'var(--gold)' : undefined }}>{i + 1}</span>
            <span className="small muted ellipsis">{PHASE_LABEL[set.phase]}</span>
            {timed ? (
              <span className="row" style={{ gap: 2 }}>
                <NumInput value={set.durationSec! / 60} width={56} onChange={(v) => onPatch(i, { durationSec: Math.round((v ?? 0) * 60) })} />
                <span className="unit">min</span>
              </span>
            ) : (
              <span className="row" style={{ gap: 2 }}>
                <NumInput value={set.reps} width={48} placeholder="—" onChange={(v) => onPatch(i, { reps: v })} />
                <span className="unit">×</span>
              </span>
            )}
            {timed ? (
              <span />
            ) : (
              <span className="row" style={{ gap: 2 }}>
                <NumInput value={set.weight} width={58} placeholder="—" onChange={(v) => onPatch(i, { weight: v })} />
                <span className="unit">kg</span>
              </span>
            )}
            {editing ? (
              <button className="icon-btn" style={{ width: 40, height: 40 }} aria-label="Retirer la série" onClick={() => onRemoveSet(i)}>
                <IconX />
              </button>
            ) : (
              <button className={`check${set.done ? ' on' : ''}`} aria-label={set.done ? 'Annuler la série' : 'Valider la série'} onClick={() => onCheck(i)}>
                <IconCheck />
              </button>
            )}
          </div>
        )
      })}
      <div className="row" style={{ marginTop: 6 }}>
        <button className="btn sm ghost" onClick={onAddSet}>
          <IconPlus style={{ width: 16 }} /> Série
        </button>
        <span className="grow" />
        {editing && (
          <button className="btn sm danger" onClick={onRemove}>
            <IconTrash style={{ width: 16 }} /> Retirer
          </button>
        )}
      </div>
    </div>
  )
}

function FinisherSheet({ lastByType, onClose, onDone }: { lastByType: Partial<Record<FinisherType, string>>; onClose: () => void; onDone: (f?: Finisher) => void }) {
  const [drawn, setDrawn] = useState<Finisher>()
  return (
    <Sheet open onClose={onClose} title={drawn ? drawn.name : 'Un finisher pour finir ?'}>
      {!drawn ? (
        <div className="stack">
          <p className="muted small" style={{ margin: 0 }}>Un seul tour, à fond. Choisis le type, je tire un finisher au hasard (jamais le même que la dernière fois).</p>
          <div className="list">
            {FINISHER_TYPES.map((t) => (
              <button key={t.type} className="list-item clickable" style={{ cursor: 'pointer' }} onClick={() => setDrawn(drawFinisher(t.type, lastByType[t.type]))}>
                <IconFlame style={{ width: 22, color: 'var(--gold)' }} />
                <span className="grow" style={{ textAlign: 'left', fontWeight: 600 }}>{t.label}</span>
              </button>
            ))}
          </div>
          <button className="btn block" onClick={() => onDone()}>Pas de finisher, terminer</button>
        </div>
      ) : (
        <div className="stack">
          <div className="card accent">
            <div className="eyebrow">Un seul tour · à fond</div>
            <ol className="finisher-list">
              {drawn.items.map((it) => <li key={it}>{it}</li>)}
            </ol>
          </div>
          <button className="btn primary block big" onClick={() => onDone(drawn)}>
            <IconCheck /> Finisher fait, terminer
          </button>
          <div className="row">
            <button className="btn grow" onClick={() => setDrawn(undefined)}>Changer de type</button>
            <button className="btn grow" onClick={() => onDone()}>Terminer sans</button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

