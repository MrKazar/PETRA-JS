import type { Finisher } from './finishers'

/** effort et retour : anciennes phases de cardio (avant la 1.2.1), gardées pour l'historique. */
export type Phase = 'chauffe' | 'travail' | 'hypertrophie' | 'cardio' | 'effort' | 'retour'

export const PHASE_LABEL: Record<Phase, string> = {
  chauffe: 'Chauffe',
  travail: 'Travail',
  hypertrophie: 'Hypertrophie',
  cardio: 'Cardio',
  effort: 'Effort',
  retour: 'Retour au calme',
}

/** Série prévue dans un programme. Une série « durée » a durationSec, sinon reps (+ charge éventuelle). */
export interface PlannedSet {
  phase: Phase
  reps?: number
  weight?: number
  durationSec?: number
  /** Unité des répétitions quand ce ne sont pas des répétitions classiques (sauts, m). */
  unit?: string
  /** Charge en % de la charge de travail (chauffe, hypertrophie). Les séries de travail sont à 100 %. */
  pct?: number
  /** Repos après la série ; à défaut, celui de l'exercice. */
  restSec?: number
}

export interface ProgramExercise {
  id: string
  catalogId?: string
  name: string
  group: string
  parCote: boolean
  /** Faux pour un exercice au poids du corps (lest facultatif). */
  usesLoad?: boolean
  /** Charge des séries de travail, en kg ; les autres séries en découlent. */
  workLoad?: number
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

export type ThemeId = 'militaire' | 'police' | 'gendarmerie' | 'forces'

export interface Settings {
  defaultRestSec: number
  /** Alternance semaine A / semaine B. */
  abWeeks: boolean
  /** Un lundi (AAAA-MM-JJ) d'une semaine A : les semaines alternent à partir de là. */
  weekAAnchor: string
  finishersEnabled: boolean
  vibrate: boolean
  keepAwake: boolean
  name: string
  /** Thème graphique : couleurs, polices et logo. */
  theme: ThemeId
}

export interface AppData {
  version: 1
  programs: Program[]
  sessions: Session[]
  active?: ActiveSession
  routines: Routine[]
  /** date (AAAA-MM-JJ) → id de routine → statut */
  routineLog: Record<string, Record<string, TaskStatus>>
  /** jour de la semaine (0 = lundi) → id de programme, pour la semaine A */
  weekPlan: Record<number, string | undefined>
  /** Idem pour la semaine B (utilisée seulement si l'alternance A/B est activée). */
  weekPlanB: Record<number, string | undefined>
  /** date → id de programme, ou null pour « repos » ce jour-là */
  planOverrides: Record<string, string | null>
  lastFinisher: Partial<Record<FinisherType, string>>
  /** Finishers personnalisés ; absent tant que l'utilisateur garde ceux par défaut. */
  finishers?: Finisher[]
  settings: Settings
}
