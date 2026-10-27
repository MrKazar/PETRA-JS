import { useState } from 'react'
import { useData } from '../data/store'
import { useNav } from '../nav'
import type { Phase, PlannedSet, Program, ProgramExercise } from '../data/types'
import { PHASE_LABEL } from '../data/types'
import { beginSession, deleteProgram, saveProgram } from '../logic/actions'
import { groupLabel, setLabels, withWorkLoad } from '../data/catalog'
import { uid } from '../logic/util'
import { describeSet } from '../logic/session'
import { ExercisePicker } from '../ui/ExercisePicker'
import { Empty, NumInput, Sheet, TopBar, confirmAction, toast } from '../ui/kit'
import { IconCopy, IconDown, IconDumbbell, IconEdit, IconPlay, IconPlus, IconTrash, IconUp, IconX } from '../ui/icons'

export function ProgramDetailScreen({ id }: { id: string }) {
  const data = useData()
  const nav = useNav()
  const program = data.programs.find((p) => p.id === id)
  const [picking, setPicking] = useState(false)
  const [editingEx, setEditingEx] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)

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

        {program.exercises.length ? (
          <div className="list">
            {program.exercises.map((e, i) => (
              <div key={e.id} className="card tight">
                <div className="row">
                  <div className="grow" onClick={() => setEditingEx(e.id)} style={{ cursor: 'pointer' }}>
                    <div style={{ fontWeight: 600 }}>{e.name}</div>
                    <div className="small muted">
                      {groupLabel(e.group)} · {e.sets.length} série{e.sets.length > 1 ? 's' : ''}
                      {e.usesLoad === false ? ' · poids du corps' : ''}
                    </div>
                    <div className="small faint" style={{ marginTop: 4 }}>{summarize(e)}</div>
                    {hasLoad(e) && (
                      <div className="row" style={{ marginTop: 8, gap: 6 }} onClick={(ev) => ev.stopPropagation()}>
                        <span className="small" style={{ color: 'var(--khaki)' }}>Charge de travail</span>
                        <NumInput value={e.workLoad} placeholder="kg" width={70} onChange={(v) => setExercises(program.exercises.map((x) => (x.id === e.id ? withWorkLoad(x, v) : x)))} />
                        <span className="small faint">kg</span>
                      </div>
                    )}
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

        <button className="btn block" onClick={() => setPicking(true)}>
          <IconPlus /> Ajouter un exercice
        </button>

        <label className="field">
          <span>Notes</span>
          <textarea className="input" placeholder="Objectif, consignes…" value={program.notes ?? ''} onChange={(e) => save({ notes: e.target.value })} />
        </label>

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

      {editing && (
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

      <RenameSheet open={renaming} initial={program.name} onClose={() => setRenaming(false)} onSave={(name) => save({ name })} />
    </div>
  )
}

const hasLoad = (e: ProgramExercise) => e.usesLoad !== false && e.sets.some((s) => s.durationSec == null)

function summarize(e: ProgramExercise): string {
  const labels = setLabels(e.sets)
  return e.sets.map((s, i) => `${labels[i]} ${describeSet(s, e.parCote)}`).join(' · ')
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

const PHASES: Phase[] = ['chauffe', 'travail', 'hypertrophie', 'effort', 'retour']

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
