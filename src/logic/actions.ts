import { writeBackup } from './backup'
import { getData, update } from '../data/store'
import { finishersOf, type Finisher } from '../data/finishers'
import type { ActiveSession, DoneFinisher, Program, Settings, TaskStatus } from '../data/types'
import { cancelIntervals, cancelRestEnd, hideOngoing, scheduleIntervals, scheduleRestEnd, setKeepAwake, showOngoing } from './native'
import { describeSet, finalize, nextPending, startFrom, statsOf, timerSchedule } from './session'
import { withWorkLoad } from '../data/catalog'
import type { OverloadSuggestion } from './progress'
import { formatDuration } from './util'

export function saveSettings(patch: Partial<Settings>) {
  update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
}

/** Enregistre (ou ajoute) un finisher ; la première modification copie la liste par défaut. */
export function saveFinisher(f: Finisher) {
  update((d) => {
    const list = finishersOf(d)
    return { ...d, finishers: list.some((x) => x.id === f.id) ? list.map((x) => (x.id === f.id ? f : x)) : [...list, f] }
  })
}

export function deleteFinisher(id: string) {
  update((d) => ({ ...d, finishers: finishersOf(d).filter((f) => f.id !== id) }))
}

export function resetFinishers() {
  update((d) => ({ ...d, finishers: undefined }))
}

/** Surcharge progressive acceptée : nouvelle charge de travail (chauffe et hypertrophie suivent). */
export function applyOverload(programId: string, s: OverloadSuggestion) {
  update((d) => ({
    ...d,
    programs: d.programs.map((p) => (p.id !== programId ? p : { ...p, exercises: p.exercises.map((e) => (e.id === s.exerciseId ? withWorkLoad(e, s.to) : e)) })),
  }))
}

export function saveProgram(p: Program) {
  update((d) => {
    const exists = d.programs.some((x) => x.id === p.id)
    return { ...d, programs: exists ? d.programs.map((x) => (x.id === p.id ? p : x)) : [...d.programs, p] }
  })
}

export function deleteProgram(id: string) {
  update((d) => {
    const weekPlan = { ...d.weekPlan }
    for (const k of Object.keys(weekPlan)) if (weekPlan[+k] === id) delete weekPlan[+k]
    const planOverrides = { ...d.planOverrides }
    for (const k of Object.keys(planOverrides)) if (planOverrides[k] === id) delete planOverrides[k]
    return { ...d, programs: d.programs.filter((p) => p.id !== id), weekPlan, planOverrides }
  })
}

export function setRoutineStatus(date: string, routineId: string, status: TaskStatus | undefined) {
  update((d) => {
    const day = { ...(d.routineLog[date] ?? {}) }
    if (status) day[routineId] = status
    else delete day[routineId]
    return { ...d, routineLog: { ...d.routineLog, [date]: day } }
  })
}

/* ---------- Séance active ---------- */

export function beginSession(program: Program | null) {
  const s = startFrom(program)
  update((d) => ({ ...d, active: s }))
  if (getData().settings.keepAwake) setKeepAwake(true)
  refreshOngoing(s)
}

/** Remplace la séance active et synchronise les notifications avec son état. */
export function setActive(next: ActiveSession, prev?: ActiveSession) {
  update((d) => ({ ...d, active: next }))
  const restChanged = prev?.rest?.endsAt !== next.rest?.endsAt
  if (restChanged) {
    if (next.rest && next.rest.endsAt > Date.now()) {
      const up = nextPending(next)
      scheduleRestEnd(next.rest.endsAt, up ? `À toi : ${up.exercise.name} · ${describeSet(up.exercise.sets[up.index], up.exercise.parCote)}` : 'Série suivante !')
    } else cancelRestEnd()
  }
  const t = next.timer
  const p = prev?.timer
  if (t?.startedAt !== p?.startedAt || t?.pausedMs !== p?.pausedMs || t?.pausedAt !== p?.pausedAt) {
    if (t && !t.pausedAt) {
      scheduleIntervals(
        timerSchedule(t).slice(1).map(({ at, step, i }) => {
          const after = t.steps[i + 1]
          if (step.kind === 'work') return { at, title: `GO · ${step.name}`, body: `${formatDuration(step.sec)} de travail${after?.kind === 'rest' ? `, puis ${formatDuration(after.sec)} de repos` : ''}` }
          return { at, title: `Repos · ${formatDuration(step.sec)}`, body: `Ensuite : ${step.name}` }
        }).concat([{ at: timerSchedule(t).at(-1)!.at + t.steps.at(-1)!.sec * 1000, title: 'Minuteur terminé', body: 'Bien joué !' }]),
      )
    } else cancelIntervals()
  }
  refreshOngoing(next)
}

function refreshOngoing(s: ActiveSession) {
  const st = statsOf(s)
  const up = nextPending(s)
  const body = up ? `Suivant : ${up.exercise.name} (série ${up.index + 1}/${up.exercise.sets.length})` : 'Toutes les séries sont faites'
  showOngoing(`${s.programName} · ${st.setsDone}/${st.setsTotal} séries`, body)
}

export function finishSession(finisher?: DoneFinisher): string | undefined {
  const d = getData()
  if (!d.active) return
  const done = finalize({ ...d.active, finisher })
  update((x) => ({
    ...x,
    active: undefined,
    sessions: [done, ...x.sessions],
    lastFinisher: finisher ? { ...x.lastFinisher, [finisher.type]: finisher.id } : x.lastFinisher,
  }))
  hideOngoing()
  setKeepAwake(false)
  void writeBackup()
  return done.id
}

export function abandonSession() {
  update((d) => ({ ...d, active: undefined }))
  hideOngoing()
  setKeepAwake(false)
}

export function deleteSession(id: string) {
  update((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }))
}
