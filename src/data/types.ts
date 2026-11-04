import type { Finisher } from './finishers'

/** effort et retour : anciennes phases de cardio (avant la 1.2.1), gardées pour l'historique. */
export type Phase = 'chauffe' | 'travail' | 'hypertrophie' | 'serie' | 'cardio' | 'effort' | 'retour'

export const PHASE_LABEL: Record<Phase, string> = {
  chauffe: 'Chauffe',
  travail: 'Travail',
  hypertrophie: 'Hypertrophie',
  serie: 'Série',
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
  /** Série à faire jusqu'à l'échec (nombre de répétitions libre). */
  toFailure?: boolean
  /** Charge en % de la charge de travail (chauffe, hypertrophie). Les séries de travail sont à 100 %. */
  pct?: number
  /** Repos après la série ; à défaut, celui de l'exercice. */
  restSec?: number
  /** Superset : répétitions / charge de chaque exercice du combiné pour ce tour (même ordre que parts). */
  parts?: PartSet[]
}

export interface PartSet {
  reps?: number
  weight?: number
  durationSec?: number
}

/** Exercice d'un superset (combiné A + B + C enchaînés, un seul Valider par tour). */
export interface SupersetPart {
  catalogId?: string
  name: string
  group: string
  parCote: boolean
  usesLoad?: boolean
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
  /** Faux pour un exercice au poids du corps (lest facultatif). */
  usesLoad?: boolean
  /** Charge des séries de travail, en kg ; les autres séries en découlent. */
  workLoad?: number
  restSec: number
  sets: PlannedSet[]
  note?: string
  /** Présent pour un superset : les exercices du combiné ; chaque série est un tour. */
  parts?: SupersetPart[]
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

/** Étape du minuteur d'intervalles : préparation, travail (une série en durée) ou repos. */
export interface IntervalStep {
  kind: 'prep' | 'work' | 'rest'
  sec: number
  /** Exercice et série validés à la fin d'une étape de travail. */
  exId?: string
  index?: number
  name: string
}

/** Minuteur façon HIIT : les étapes s'enchaînent seules à partir de startedAt (pauses déduites). */
export interface IntervalTimer {
  steps: IntervalStep[]
  startedAt: number
  pausedMs: number
  pausedAt?: number
}

export interface ActiveSession extends Session {
  rest?: Rest
  timer?: IntervalTimer
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

export type ThemeId = 'militaire' | 'police' | 'gendarmerie' | 'forces' | 'minimal' | 'vantablack' | 'pompier' | 'neon'

export interface Settings {
  defaultRestSec: number
  /** Alternance semaine A / semaine B. */
  abWeeks: boolean
  /** Un lundi (AAAA-MM-JJ) d'une semaine A : les semaines alternent à partir de là. */
  weekAAnchor: string
  finishersEnabled: boolean
  vibrate: boolean
  /** Bips du minuteur d'intervalles (décompte et changement d'étape). */
  timerSound: boolean
  keepAwake: boolean
  name: string
  /** Thème graphique : couleurs, polices et logo. */
  theme: ThemeId
  /** Notifications de séance. */
  notifRestEnd: boolean
  notifOngoing: boolean
  notifIntervals: boolean
  /** Les notifications font vibrer le téléphone. */
  notifVibrate: boolean
  /** Rappel quotidien de séance, à l'heure notifDailyTime (HH:MM). */
  notifDaily: boolean
  notifDailyTime: string
  /** Rappel seulement les jours où une séance est prévue au planning. */
  notifDailyPlannedOnly: boolean
  /** Rappel des tâches qui ont une heure fixe. */
  notifRoutines: boolean
  /** Date de la dernière sauvegarde automatique (fichier dans Documents/PETRA). */
  lastBackupAt?: number
  /** Appli PC associée (synchro par le Wi-Fi local). Propre à cet appareil, jamais synchronisé. */
  pc?: PcLink
}

/** Appli PC associée en scannant son QR code. */
export interface PcLink {
  /** Adresses IP du PC sur le réseau local, la dernière qui a marché en premier. */
  hosts: string[]
  port: number
  token: string
  /** Nom du PC, pour l'affichage. */
  name: string
  lastAt?: number
  /** Message de la dernière synchro ratée (effacé à la suivante réussie). */
  lastError?: string
}

/**
 * Suivi des modifications pour la synchro avec l'appli PC : date de dernière modification et de
 * suppression de chaque élément (« p:<id> » programme, « s:<id> » séance, « r:<id> » routine,
 * « log:<date> », « ov:<date> », « f:<champ> », « set:<réglage> »).
 */
export interface SyncMeta {
  stamps: Record<string, number>
  gone: Record<string, number>
}

/**
 * Version du format des données. À augmenter quand la forme des données change, avec une migration
 * dans store.ts (MIGRATIONS). La synchro avec PCTRA la compare pour prévenir si une appli est en retard.
 */
export const DATA_VERSION = 2

export interface AppData {
  /** Version du format (DATA_VERSION de l'appli qui les a écrites). */
  version: number
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
  /** Dates de modification pour fusionner avec l'appli PC (absent tant que rien n'a changé). */
  sync?: SyncMeta
}
