import { useEffect, useRef, useState } from 'react'
import { getData, useData } from '../data/store'
import { useNav } from '../nav'
import type { ActiveSession, FinisherType, SessionExercise } from '../data/types'
import { groupLabel, isCardio, setLabels } from '../data/catalog'
import { FINISHER_TYPES, drawFinisher, finishersOf, formatItem, type Finisher } from '../data/finishers'
import { abandonSession, finishSession, setActive } from '../logic/actions'
import { addSet, completeSet, extendRest, nextPending, patchSet, removeSet, startRest, statsOf, toSessionExercise } from '../logic/session'
import { buzzRestOver, tap } from '../logic/native'
import { formatClock, formatDuration } from '../logic/util'
import { ExercisePicker } from '../ui/ExercisePicker'
import { Empty, NumInput, Sheet, TopBar, confirmAction } from '../ui/kit'
import { IconCheck, IconChevron, IconFlame, IconMinus, IconPlus, IconSkip, IconTrash, IconX } from '../ui/icons'
import { useNow } from '../ui/useNow'

export function WorkoutScreen() {
  const data = useData()
  const nav = useNav()
  const s = data.active
  const now = useNow(250, !!s)
  const [picking, setPicking] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [undo, setUndo] = useState<{ label: string; prev: ActiveSession }>()
  const undoTimer = useRef<number | undefined>(undefined)
  const cards = useRef(new Map<string, HTMLDivElement>())
  const upId = s ? nextPending(s)?.exercise.id : undefined
  // Après chaque série validée, l'exercice en cours remonte en haut de l'écran.
  useEffect(() => {
    if (upId) cards.current.get(upId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [upId])

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

  /** Suppression sans confirmation : un bouton Annuler reste affiché quelques secondes. */
  const removeWithUndo = (label: string, fn: (a: ActiveSession) => ActiveSession) => {
    const prev = getData().active
    if (!prev) return
    apply(fn)
    setUndo({ label, prev })
    window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => setUndo(undefined), 6000)
  }
  const restore = () => {
    if (!undo) return
    const cur = getData().active
    if (cur) setActive({ ...undo.prev, rest: cur.rest }, cur)
    setUndo(undefined)
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
        // Repos préconisé après cette série ; entre deux exercices, au moins le repos par défaut.
        const base = set.restSec ?? ex.restSec
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
    const id = finishSession(f ? { type: f.type, id: f.id, name: f.name, items: f.items.map(formatItem) } : undefined)
    if (id) nav.replace({ name: 'session', id })
  }
  const abandon = () => {
    if (!confirmAction('Abandonner la séance ? Rien ne sera enregistré.')) return
    abandonSession()
    nav.pop()
  }

  const curEx = up?.exercise
  const curSet = up ? up.exercise.sets[up.index] : undefined
  const step = (patch: { reps?: number; weight?: number; durationSec?: number }) => up && apply((a) => patchSet(a, up.exercise.id, up.index, patch))

  return (
    <>
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
            cardRef={(el) => (el ? cards.current.set(ex.id, el) : cards.current.delete(ex.id))}
            ex={ex}
            current={up?.exercise.id === ex.id ? up.index : -1}
            onCheck={(i) => onCheck(ex, i)}
            onPatch={(i, patch) => apply((a) => patchSet(a, ex.id, i, patch))}
            onAddSet={() => apply((a) => addSet(a, ex.id))}
            onRemoveSet={(i) => removeWithUndo('Série retirée', (a) => removeSet(a, ex.id, i))}
            onRemove={() => removeWithUndo(`${ex.name} retiré`, (a) => ({ ...a, exercises: a.exercises.filter((e) => e.id !== ex.id) }))}
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

      {finishing && <FinisherSheet finishers={finishersOf(data)} lastByType={data.lastFinisher} onClose={() => setFinishing(false)} onDone={complete} />}
    </div>

    {(undo || (curEx && curSet)) && (
      <div className="dock">
        {undo && (
          <div className="undo">
            <span className="grow ellipsis">{undo.label}</span>
            <button className="btn sm" onClick={restore}>Annuler</button>
          </div>
        )}
        {curEx && curSet && up && (
          <>
            <div className="dock-steppers">
              {curSet.durationSec != null ? (
                <Stepper label="durée" value={curSet.durationSec} unit="s" step={curSet.durationSec >= 180 ? 60 : 5} onChange={(v) => step({ durationSec: v })} />
              ) : (
                <Stepper label={curSet.unit ?? (curEx.parCote ? 'reps / côté' : 'reps')} value={curSet.reps} step={1} onChange={(v) => step({ reps: v })} />
              )}
              {curEx.usesLoad !== false && !isCardio(curEx) && <Stepper label="kg" value={curSet.weight} step={2.5} onChange={(v) => step({ weight: v })} />}
            </div>
            <button className="btn primary block big" onClick={() => onCheck(curEx, up.index)}>
              <IconCheck /> <span className="ellipsis">Valider · {setLabels(curEx.sets)[up.index]}</span>
            </button>
          </>
        )}
      </div>
    )}
    </>
  )
}

/** Réglage au pouce : − valeur + (sans ouvrir le clavier). */
function Stepper({ label, value, unit, step, onChange }: { label: string; value?: number; unit?: string; step: number; onChange: (v: number) => void }) {
  const v = value ?? 0
  const set = (n: number) => onChange(Math.max(0, Math.round(n * 100) / 100))
  return (
    <div className="stepper">
      <button className="icon-btn" aria-label={`Moins (${label})`} onClick={() => set(v - step)}><IconMinus /></button>
      <div className="val">
        <b>{value == null ? '—' : v}{unit ? ` ${unit}` : ''}</b>
        <span>{label}</span>
      </div>
      <button className="icon-btn" aria-label={`Plus (${label})`} onClick={() => set(v + step)}><IconPlus /></button>
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
          <div className="eyebrow" style={{ color: over ? 'var(--success)' : undefined }}>{over ? 'C’est reparti !' : 'Repos'}</div>
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
  cardRef,
  ex,
  current,
  onCheck,
  onPatch,
  onAddSet,
  onRemoveSet,
  onRemove,
}: {
  cardRef: (el: HTMLDivElement | null) => void
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
  const [open, setOpen] = useState(false)
  const labels = setLabels(ex.sets)
  // Exercice terminé : replié sur une ligne, un appui le rouvre.
  if (allDone && !open && !editing) {
    return (
      <div ref={cardRef} className="card tight clickable row" style={{ opacity: 0.75 }} onClick={() => setOpen(true)}>
        <IconCheck style={{ width: 18, color: 'var(--success)', flex: 'none' }} />
        <span className="grow ellipsis" style={{ fontWeight: 600 }}>{ex.name}</span>
        <span className="small muted">{ex.sets.length} série{ex.sets.length > 1 ? 's' : ''}</span>
        <IconChevron style={{ width: 18, color: 'var(--faint)' }} />
      </div>
    )
  }
  return (
    <div ref={cardRef} className={`card${current >= 0 ? ' accent' : ''}`} style={{ opacity: allDone ? 0.75 : 1, scrollMarginTop: 120 }}>
      <div className="row" style={{ marginBottom: 6 }}>
        <div className="grow">
          <h3>
            {ex.name} {allDone && <IconCheck style={{ width: 16, color: 'var(--success)', verticalAlign: -2 }} />}
          </h3>
          <div className="small muted">
            {groupLabel(ex.group)}
            {ex.parCote ? ' · par côté' : ''}
            {ex.usesLoad === false ? ' · poids du corps' : ex.workLoad ? ` · travail ${ex.workLoad} kg` : ''}
          </div>
        </div>
        <button className={`btn sm${editing ? ' primary' : ' ghost'}`} onClick={() => setEditing(!editing)}>{editing ? 'OK' : 'Modifier'}</button>
      </div>
      {ex.note && <div className="small faint" style={{ marginBottom: 6 }}>{ex.note}</div>}
      {ex.sets.map((set, i) => {
        const timed = set.durationSec != null
        const inSeconds = timed && set.durationSec! < 180
        const rest = set.restSec ?? ex.restSec
        return (
          <div key={i} className={`set-row${set.done ? ' done' : ''}${i === current ? ' current' : ''}`}>
            <div style={{ minWidth: 0 }}>
              <div className="lbl ellipsis">{labels[i]}</div>
              <div className="hint ellipsis">
                {set.pct != null && ex.usesLoad !== false ? `${set.pct} % · ` : ''}
                {set.toFailure ? 'jusqu’à l’échec · ' : ''}
                {rest ? `repos ${formatDuration(rest)}` : ''}
              </div>
            </div>
            {timed ? (
              <span className="row" style={{ gap: 2 }}>
                <NumInput
                  value={inSeconds ? set.durationSec : set.durationSec! / 60}
                  width={56}
                  onChange={(v) => onPatch(i, { durationSec: Math.round((v ?? 0) * (inSeconds ? 1 : 60)) })}
                />
                <span className="unit">{inSeconds ? 's' : 'min'}</span>
              </span>
            ) : (
              <span className="row" style={{ gap: 2 }}>
                <NumInput value={set.reps} width={48} placeholder={set.toFailure ? 'max' : '—'} onChange={(v) => onPatch(i, { reps: v })} />
                <span className="unit">{set.unit ?? (ex.parCote ? '/côté' : 'rép')}</span>
              </span>
            )}
            {(timed || isCardio(ex)) && ex.usesLoad === false ? (
              <span />
            ) : (
              <span className="row" style={{ gap: 2 }}>
                <NumInput value={set.weight} width={58} placeholder={ex.usesLoad === false ? 'PDC' : '—'} onChange={(v) => onPatch(i, { weight: v })} />
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

function FinisherSheet({ finishers, lastByType, onClose, onDone }: { finishers: Finisher[]; lastByType: Partial<Record<FinisherType, string>>; onClose: () => void; onDone: (f?: Finisher) => void }) {
  const [drawn, setDrawn] = useState<Finisher>()
  return (
    <Sheet open onClose={onClose} title={drawn ? drawn.name : 'Un finisher pour finir ?'}>
      {!drawn ? (
        <div className="stack">
          <p className="muted small" style={{ margin: 0 }}>Un seul tour, à fond. Choisis le type, je tire un finisher au hasard (jamais le même que la dernière fois).</p>
          <div className="list">
            {FINISHER_TYPES.filter((t) => drawFinisher(t.type, undefined, finishers)).map((t) => (
              <button key={t.type} className="list-item clickable" style={{ cursor: 'pointer' }} onClick={() => setDrawn(drawFinisher(t.type, lastByType[t.type], finishers))}>
                <IconFlame style={{ width: 22, color: 'var(--khaki)' }} />
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
              {drawn.items.map((it, i) => <li key={i}>{formatItem(it)}</li>)}
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

