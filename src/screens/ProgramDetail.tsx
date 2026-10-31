import { useState } from 'react'
import { useData } from '../data/store'
import { useNav } from '../nav'
import type { Phase, PlannedSet, Program, ProgramExercise } from '../data/types'
import { PHASE_LABEL } from '../data/types'
import { beginSession, deleteProgram, saveProgram } from '../logic/actions'
import { cardioPlanOf, cardioSets, groupLabel, isCardio, isPdc, pdcPlanOf, pdcSets, withWorkLoad, type CardioPlan, type PdcPlan } from '../data/catalog'
import { formatDuration, uid } from '../logic/util'
import { describePart, estimateDuration, formatEstimate } from '../logic/session'
import { SupersetEditor } from '../ui/SupersetEditor'
import { ExercisePicker } from '../ui/ExercisePicker'
import { ShareSheet } from '../ui/Share'
import { shareProgram } from '../logic/share'
import { overloadSuggestion } from '../logic/progress'
import { OverloadCard } from '../ui/Overload'
import { Empty, NumInput, Sheet, TopBar, confirmAction, toast } from '../ui/kit'
import { IconQr, IconCopy, IconDown, IconDumbbell, IconEdit, IconHistory, IconPlay, IconPlus, IconTrash, IconUp, IconX } from '../ui/icons'

export function ProgramDetailScreen({ id }: { id: string }) {
  const data = useData()
  const nav = useNav()
  const program = data.programs.find((p) => p.id === id)
  const [picking, setPicking] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [editingEx, setEditingEx] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [superset, setSuperset] = useState<'new' | null>(null)

  if (!program) {
    return (
      <div className="screen">
        <div className="screen-inner">
          <TopBar title="Programme" onBack={nav.pop} />
          <Empty>Ce programme n’existe plus.</Empty>
        </div>
      </div>
    )
  }

  const save = (p: Partial<Program>) => saveProgram({ ...program, ...p })
  const setExercises = (exercises: ProgramExercise[]) => save({ exercises })
  const move = (i: number, d: number) => {
    const ex = [...program.exercises]
    const j = i + d
    if (j < 0 || j >= ex.length) return
    ;[ex[i], ex[j]] = [ex[j], ex[i]]
    setExercises(ex)
  }
  const editing = program.exercises.find((e) => e.id === editingEx)

  const start = () => {
    if (data.active && !confirmAction('Une séance est déjà en cours. La remplacer par celle-ci ? (la séance en cours sera perdue)')) {
      return
    }
    beginSession(program)
    nav.push({ name: 'workout' })
  }

  const duplicate = () => {
    const copy: Program = { ...program, id: uid(), name: `${program.name} (copie)`, createdAt: Date.now(), exercises: program.exercises.map((e) => ({ ...e, id: uid() })) }
    saveProgram(copy)
    nav.replace({ name: 'program', id: copy.id })
    toast('Programme dupliqué')
  }

  const remove = () => {
    if (!confirmAction(`Supprimer « ${program.name} » ? L’historique des séances est conservé.`)) return
    deleteProgram(program.id)
    nav.pop()
  }

  return (
    <div className="screen">
      <div className="screen-inner">
        <TopBar
          title={program.name}
          onBack={nav.pop}
          right={
            <button className="icon-btn" aria-label="Renommer" onClick={() => setRenaming(true)}>
              <IconEdit />
            </button>
          }
        />
        <button className="btn primary block big" disabled={!program.exercises.length} onClick={start}>
          <IconPlay /> Lancer cette séance
        </button>
        {program.exercises.length > 0 && (
          <div className="small muted" style={{ textAlign: 'center', marginTop: -4 }}>
            Durée estimée {formatEstimate(estimateDuration(program, data.settings.defaultRestSec))} · {program.exercises.reduce((n, e) => n + e.sets.length, 0)} séries
          </div>
        )}
        {program.exercises.length > 0 && (
          <button className="btn block" onClick={() => nav.push({ name: 'progress', id: program.id })}>
            <IconHistory /> Progression ({data.sessions.filter((s) => s.programId === program.id).length} séance{data.sessions.filter((s) => s.programId === program.id).length > 1 ? 's' : ''})
          </button>
        )}

        {program.exercises.length ? (
          <div className="list">
            {program.exercises.map((e, i) => (
              <div key={e.id} className="card tight">
                <div className="row">
                  <div className="grow" onClick={() => setEditingEx(e.id)} style={{ cursor: 'pointer' }}>
                    <div style={{ fontWeight: 600 }}>{e.parts && <span className="ss-tag">Superset</span>}{e.name}</div>
                    {e.parts ? (
                      <>
                        <div className="small muted">{e.sets.length} tour{e.sets.length > 1 ? 's' : ''} · repos {formatDuration(e.restSec)} entre les tours</div>
                        <ol className="ss-parts">
                          {e.parts.map((p, k) => <li key={k}><span className="ellipsis">{p.name}</span><b>{describePart(e.sets[0]?.parts?.[k] ?? p)}</b></li>)}
                        </ol>
                      </>
                    ) : (
                    <div className="small muted">
                      {groupLabel(e.group)} · {e.sets.length} série{e.sets.length > 1 ? 's' : ''}{totalOf(e)}
                      {e.usesLoad === false ? ' · poids du corps' : ''}
                    </div>
                    )}
                    {hasLoad(e) && (
                      <div className="row" style={{ marginTop: 8, gap: 6 }} onClick={(ev) => ev.stopPropagation()}>
                        <span className="small" style={{ color: 'var(--khaki)' }}>Charge de travail</span>
                        <NumInput value={e.workLoad} placeholder="kg" width={70} onChange={(v) => setExercises(program.exercises.map((x) => (x.id === e.id ? withWorkLoad(x, v) : x)))} />
                        <span className="small faint">kg</span>
                      </div>
                    )}
                    {(() => {
                      const sug = overloadSuggestion(e, data.sessions, program.id)
                      return sug ? <div style={{ marginTop: 8 }} onClick={(ev) => ev.stopPropagation()}><OverloadCard programId={program.id} s={sug} /></div> : null
                    })()}
                  </div>
                  <div className="stack" style={{ gap: 0 }}>
                    <button className="icon-btn" style={{ height: 32 }} aria-label="Monter" disabled={i === 0} onClick={() => move(i, -1)}>
                      <IconUp />
                    </button>
                    <button className="icon-btn" style={{ height: 32 }} aria-label="Descendre" disabled={i === program.exercises.length - 1} onClick={() => move(i, 1)}>
                      <IconDown />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty icon={<IconDumbbell />}>Ajoute des exercices depuis le catalogue (260 exercices) ou crée les tiens.</Empty>
        )}

        <div className="row">
          <button className="btn grow" onClick={() => setPicking(true)}>
            <IconPlus /> Exercice
          </button>
          <button className="btn grow" onClick={() => setSuperset('new')}>
            <IconPlus /> Superset
          </button>
        </div>

        <label className="field">
          <span>Notes</span>
          <textarea className="input" placeholder="Objectif, consignes…" value={program.notes ?? ''} onChange={(e) => save({ notes: e.target.value })} />
        </label>

        {program.exercises.length > 0 && (
          <button className="btn block" onClick={() => setSharing(true)}>
            <IconQr /> Partager cette séance (QR code)
          </button>
        )}
        <div className="row">
          <button className="btn grow" onClick={duplicate}>
            <IconCopy /> Dupliquer
          </button>
          <button className="btn danger grow" onClick={remove}>
            <IconTrash /> Supprimer
          </button>
        </div>
      </div>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        defaultRest={data.settings.defaultRestSec}
        onPick={(ex) => {
          setExercises([...program.exercises, ex])
          setPicking(false)
          toast(`${ex.name} ajouté`)
        }}
      />

      {(superset === 'new' || editing?.parts) && (
        <SupersetEditor
          initial={superset === 'new' ? undefined : editing}
          defaultRest={data.settings.defaultRestSec}
          onClose={() => {
            setSuperset(null)
            setEditingEx(null)
          }}
          onSave={(ex) => {
            setExercises(program.exercises.some((x) => x.id === ex.id) ? program.exercises.map((x) => (x.id === ex.id ? ex : x)) : [...program.exercises, ex])
            setSuperset(null)
            setEditingEx(null)
          }}
          onDelete={editing ? () => {
            setExercises(program.exercises.filter((x) => x.id !== editing.id))
            setEditingEx(null)
          } : undefined}
        />
      )}

      {editing && !editing.parts && (
        <ExerciseEditor
          exercise={editing}
          onClose={() => setEditingEx(null)}
          onChange={(ex) => setExercises(program.exercises.map((x) => (x.id === ex.id ? ex : x)))}
          onDelete={() => {
            setExercises(program.exercises.filter((x) => x.id !== editing.id))
            setEditingEx(null)
          }}
        />
      )}

      {sharing && <ShareSheet payload={shareProgram(program)} title={`Partager « ${program.name} »`} onClose={() => setSharing(false)} />}
      <RenameSheet open={renaming} initial={program.name} onClose={() => setRenaming(false)} onSave={(name) => save({ name })} />
    </div>
  )
}

const hasLoad = (e: ProgramExercise) => !e.parts && e.usesLoad !== false && e.sets.some((s) => s.durationSec == null)

/** Volume total d'un exercice : répétitions cumulées, ou durée cumulée pour les séries en temps. */
function totalOf(e: ProgramExercise): string {
  const reps = e.sets.reduce((n, s) => n + (s.durationSec == null && !s.toFailure ? s.reps ?? 0 : 0), 0)
  const sec = e.sets.reduce((n, s) => n + (s.durationSec ?? 0), 0)
  const parts = [reps ? `${reps} reps${e.parCote ? ' par côté' : ''}` : '', sec ? formatDuration(sec) : ''].filter(Boolean)
  return parts.length ? ` · ${parts.join(' + ')}` : ''
}

function RenameSheet({ open, initial, onClose, onSave }: { open: boolean; initial: string; onClose: () => void; onSave: (n: string) => void }) {
  const [name, setName] = useState(initial)
  return (
    <Sheet open={open} onClose={onClose} title="Renommer">
      <div className="stack">
        <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn primary block" disabled={!name.trim()} onClick={() => { onSave(name.trim()); onClose() }}>Enregistrer</button>
      </div>
    </Sheet>
  )
}

const PHASES: Phase[] = ['chauffe', 'travail', 'hypertrophie']

export function ExerciseEditor({ exercise, onChange, onClose, onDelete }: { exercise: ProgramExercise; onChange: (e: ProgramExercise) => void; onClose: () => void; onDelete: () => void }) {
  const e = exercise
  const setSet = (i: number, patch: Partial<PlannedSet>) => onChange({ ...e, sets: e.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) })
  const timed = e.sets.length > 0 && e.sets.every((s) => s.durationSec != null)
  const addSet = () => {
    const last = e.sets[e.sets.length - 1] ?? { phase: 'travail', reps: 10 }
    onChange({ ...e, sets: [...e.sets, { ...last }] })
  }
  const switchMode = () =>
    onChange({
      ...e,
      sets: e.sets.map((s) => (timed ? { phase: s.phase, reps: 10 } : { phase: s.phase, durationSec: 60 })),
    })

  return (
    <Sheet open onClose={onClose} title={e.name}>
      <div className="stack">
        <label className="field">
          <span>Nom</span>
          <input className="input" value={e.name} onChange={(ev) => onChange({ ...e, name: ev.target.value })} />
        </label>
        {hasLoad(e) && (
          <div className="row between">
            <div>
              <div style={{ fontWeight: 600 }}>Charge de travail</div>
              <div className="small muted">Recalcule les charges de chauffe et d’hypertrophie.</div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <NumInput value={e.workLoad} placeholder="kg" width={70} onChange={(v) => onChange(withWorkLoad(e, v))} />
              <span className="small faint">kg</span>
            </div>
          </div>
        )}
        {isCardio(e) ? (
          <CardioFields plan={cardioPlanOf(e.sets)} onChange={(p) => onChange({ ...e, sets: cardioSets(p), restSec: p.mode === 'duree' ? 0 : p.repos_sec })} />
        ) : isPdc(e) ? (
          <PdcFields plan={pdcPlanOf(e.sets)} parCote={e.parCote} onChange={(p) => onChange({ ...e, sets: pdcSets(p), restSec: p.repos_sec })} />
        ) : (
          <>
        <div className="row between">
          <span className="small muted">Séries en {timed ? 'durée' : 'répétitions'} · reps × kg · repos</span>
          <button className="btn sm" onClick={switchMode}>Passer en {timed ? 'répétitions' : 'durée'}</button>
        </div>
        <div>
          {e.sets.map((s, i) => (
            <div key={i} className="row" style={{ gap: 6, padding: '6px 0', borderTop: i ? '1px solid var(--line)' : undefined }}>
              <select className="input" style={{ minHeight: 40, padding: '6px 8px', flex: 1, minWidth: 0 }} value={s.phase} onChange={(ev) => setSet(i, { phase: ev.target.value as Phase })}>
                {PHASES.map((p) => <option key={p} value={p}>{PHASE_LABEL[p]}</option>)}
              </select>
              {timed ? (
                <>
                  <NumInput value={s.durationSec != null ? s.durationSec / 60 : undefined} onChange={(v) => setSet(i, { durationSec: Math.round((v ?? 0) * 60) })} width={56} />
                  <span className="small faint">min</span>
                </>
              ) : (
                <>
                  <NumInput value={s.reps} onChange={(v) => setSet(i, { reps: v })} width={50} placeholder="reps" />
                  <span className="small faint">×</span>
                  <NumInput value={s.weight} onChange={(v) => setSet(i, { weight: v })} width={58} placeholder="kg" />
                </>
              )}
              <NumInput value={s.restSec ?? e.restSec} width={50} onChange={(v) => setSet(i, { restSec: Math.max(0, Math.round(v ?? 0)) })} />
              <span className="small faint">s</span>
              <button className="icon-btn" style={{ width: 34 }} aria-label="Retirer la série" onClick={() => onChange({ ...e, sets: e.sets.filter((_, j) => j !== i) })}>
                <IconX />
              </button>
            </div>
          ))}
        </div>
        <button className="btn block" onClick={addSet}>
          <IconPlus /> Ajouter une série
        </button>
          </>
        )}
        {e.note && <p className="small muted">{e.note}</p>}
        <div className="row">
          <button className="btn danger grow" onClick={onDelete}>
            <IconTrash /> Retirer l’exercice
          </button>
          <button className="btn primary grow" onClick={onClose}>OK</button>
        </div>
      </div>
    </Sheet>
  )
}

const CARDIO_MODES: { mode: CardioPlan['mode']; label: string; init: CardioPlan }[] = [
  { mode: 'duree', label: 'Durée', init: { mode: 'duree', duree_min: 20 } },
  { mode: 'intervalles', label: 'Fractionné', init: { mode: 'intervalles', tours: 8, effort_sec: 30, repos_sec: 30 } },
  { mode: 'reps', label: 'Répétitions', init: { mode: 'reps', tours: 5, reps: 20, repos_sec: 30 } },
]

/** Réglage d'un cardio : un temps total, du fractionné (tours × durée) ou des tours de répétitions. */
function CardioFields({ plan, onChange }: { plan: CardioPlan; onChange: (p: CardioPlan) => void }) {
  const field = (label: string, unit: string, value: number, set: (v: number) => void, width = 64) => (
    <div className="row between">
      <span>{label}</span>
      <span className="row" style={{ gap: 6 }}>
        <NumInput value={value} width={width} onChange={(v) => set(Math.max(0, v ?? 0))} />
        <span className="small faint" style={{ minWidth: 28 }}>{unit}</span>
      </span>
    </div>
  )
  return (
    <div className="stack">
      <div className="seg">
        {CARDIO_MODES.map((m) => (
          <button key={m.mode} className={plan.mode === m.mode ? 'on' : ''} onClick={() => plan.mode !== m.mode && onChange(m.init)}>{m.label}</button>
        ))}
      </div>
      {plan.mode === 'duree' && (
        <>
          {field('Temps total', 'min', plan.duree_min, (v) => onChange({ ...plan, duree_min: v }))}
          <div className="chips">
            {[10, 15, 20, 30, 45, 60].map((m) => (
              <button key={m} className={`chip${plan.duree_min === m ? ' on' : ''}`} onClick={() => onChange({ ...plan, duree_min: m })}>{m} min</button>
            ))}
          </div>
        </>
      )}
      {plan.mode === 'intervalles' && (
        <>
          {field('Tours', '', plan.tours, (v) => onChange({ ...plan, tours: Math.max(1, Math.round(v)) }))}
          {field('Effort', 's', plan.effort_sec, (v) => onChange({ ...plan, effort_sec: Math.round(v) }))}
          {field('Récupération', 's', plan.repos_sec, (v) => onChange({ ...plan, repos_sec: Math.round(v) }))}
        </>
      )}
      {plan.mode === 'reps' && (
        <>
          {field('Tours', '', plan.tours, (v) => onChange({ ...plan, tours: Math.max(1, Math.round(v)) }))}
          <div className="row between">
            <span>Répétitions</span>
            <span className="row" style={{ gap: 6 }}>
              <NumInput value={plan.reps} width={64} onChange={(v) => onChange({ ...plan, reps: Math.max(0, Math.round(v ?? 0)) })} />
              <input className="input" style={{ width: 70, minHeight: 40, padding: '6px 8px' }} placeholder="rép." value={plan.unite ?? ''} onChange={(ev) => onChange({ ...plan, unite: ev.target.value.trim() ? ev.target.value : undefined })} />
            </span>
          </div>
          {field('Récupération', 's', plan.repos_sec, (v) => onChange({ ...plan, repos_sec: Math.round(v) }))}
        </>
      )}
      <div className="small muted">
        {plan.mode === 'duree'
          ? 'Un seul bloc, sans chauffe ni hypertrophie. Le temps reste modifiable pendant la séance.'
          : `Total ≈ ${formatDuration(plan.tours * ((plan.mode === 'intervalles' ? plan.effort_sec : 0) + plan.repos_sec))}${plan.mode === 'reps' ? ' de récupération' : ''}. Le minuteur de repos se lance entre deux tours.`}
      </div>
    </div>
  )
}

const PDC_MODES: { mode: PdcPlan['mode']; label: string }[] = [
  { mode: 'reps', label: 'Rép.' },
  { mode: 'temps', label: 'Temps' },
  { mode: 'echec', label: 'Échec' },
]

/** Poids du corps : comme un finisher, des séries de répétitions, de temps tenu ou jusqu'à l'échec. */
function PdcFields({ plan, parCote, onChange }: { plan: PdcPlan; parCote: boolean; onChange: (p: PdcPlan) => void }) {
  const row = (label: string, unit: string, value: number | undefined, set: (v: number) => void) => (
    <div className="row between">
      <span>{label}</span>
      <span className="row" style={{ gap: 6 }}>
        <NumInput value={value} width={64} onChange={(v) => set(Math.max(0, Math.round(v ?? 0)))} />
        <span className="small faint" style={{ minWidth: 36 }}>{unit}</span>
      </span>
    </div>
  )
  return (
    <div className="stack">
      <div className="seg">
        {PDC_MODES.map((m) => (
          <button
            key={m.mode}
            className={plan.mode === m.mode ? 'on' : ''}
            onClick={() => plan.mode !== m.mode && onChange({ ...plan, mode: m.mode, reps: m.mode === 'reps' ? plan.reps ?? 12 : undefined, duree_sec: m.mode === 'temps' ? plan.duree_sec ?? 30 : undefined })}
          >
            {m.label}
          </button>
        ))}
      </div>
      {row('Séries', '', plan.series, (v) => onChange({ ...plan, series: Math.max(1, v) }))}
      {plan.mode === 'reps' && row('Répétitions', parCote ? '/ côté' : 'rép.', plan.reps, (v) => onChange({ ...plan, reps: v }))}
      {plan.mode === 'temps' && row('Temps tenu', 's', plan.duree_sec, (v) => onChange({ ...plan, duree_sec: v }))}
      {row('Repos entre séries', 's', plan.repos_sec, (v) => onChange({ ...plan, repos_sec: v }))}
      <div className="small muted">
        {plan.mode === 'echec'
          ? 'Chaque série jusqu’à l’échec : tu notes en séance le nombre de répétitions faites.'
          : 'Pas de chauffe ni d’hypertrophie au poids du corps. Tu peux ajouter un lest en séance.'}
      </div>
    </div>
  )
}
