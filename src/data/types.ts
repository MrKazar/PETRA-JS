export type Phase = 'chauffe' | 'travail' | 'hypertrophie' | 'effort' | 'retour'

export const PHASE_LABEL: Record<Phase, string> = {
  chauffe: 'Échauffement',
  travail: 'Travail',
  hypertrophie: 'Hypertrophie',
  effort: 'Effort',
  retour: 'Retour au calme',
}

/** Série prévue dans un programme. Une série « durée » a durationSec, sinon reps (+ charge éventuelle). */
export interface PlannedSet {
  phase: Phase
  reps?: number
  weight?: number
  durationSec?: number
}

export interface ProgramExercise {
  id: string
  catalogId?: string
  name: string
  group: string
  parCote: boolean
  restSec: number
  sets: PlannedSet[]
  note?: string
}

export interface Program {
  id: string
  name: string
  notes?: string
  exercises: ProgramExercise[]
  createdAt: number
}

export interface SessionSet extends PlannedSet {
  done: boolean
  doneAt?: number
}

export interface SessionExercise extends Omit<ProgramExercise, 'sets'> {
  sets: SessionSet[]
}

export interface DoneFinisher {
  type: FinisherType
  id: string
  name: string
  items: string[]
}

export interface Session {
  id: string
  programId?: string
  programName: string
  startedAt: number
  endedAt?: number
  exercises: SessionExercise[]
  notes?: string
  finisher?: DoneFinisher
}

export interface Rest {
  startedAt: number
  endsAt: number
  label: string
}

export interface ActiveSession extends Session {
  rest?: Rest
}

export type Recurrence =
  | { kind: 'once'; date: string }
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: number[] } // 0 = lundi … 6 = dimanche

export interface Routine {
  id: string
  name: string
  time?: string // HH:MM
  recurrence: Recurrence
  createdAt: number
}

export type TaskStatus = 'fait' | 'reporte' | 'saute'

export type FinisherType = 'abdos' | 'dos' | 'pecs' | 'jambes' | 'epaules_bras'

export interface Settings {
  defaultRestSec: number
  finishersEnabled: boolean
  vibrate: boolean
  keepAwake: boolean
  name: string
}

export interface AppData {
  version: 1
  programs: Program[]
  sessions: Session[]
  active?: ActiveSession
  routines: Routine[]
  /** date (AAAA-MM-JJ) → id de routine → statut */
  routineLog: Record<string, Record<string, TaskStatus>>
  /** jour de la semaine (0 = lundi) → id de programme */
  weekPlan: Record<number, string | undefined>
  /** date → id de programme, ou null pour « repos » ce jour-là */
  planOverrides: Record<string, string | null>
  lastFinisher: Partial<Record<FinisherType, string>>
  settings: Settings
}
