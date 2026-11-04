import { useSyncExternalStore } from 'react'
import type { AppData, Settings } from './types'
import { addDays, dateKey, weekday } from '../logic/util'
import { migrateExercise } from './catalog'
import { track } from '../logic/sync'

const KEY = 'petra.data.v1'

const thisMonday = () => addDays(dateKey(), -weekday(dateKey()))

export const DEFAULT_SETTINGS: Settings = {
  defaultRestSec: 90,
  abWeeks: false,
  weekAAnchor: thisMonday(),
  finishersEnabled: false,
  vibrate: true,
  timerSound: true,
  notifRestEnd: true,
  notifOngoing: true,
  notifIntervals: true,
  notifVibrate: true,
  notifDaily: false,
  notifDailyTime: '18:00',
  notifDailyPlannedOnly: true,
  notifRoutines: false,
  keepAwake: true,
  name: '',
  theme: 'militaire',
}

export function emptyData(): AppData {
  return {
    version: 1,
    programs: [],
    sessions: [],
    routines: [],
    routineLog: {},
    weekPlan: {},
    weekPlanB: {},
    planOverrides: {},
    lastFinisher: {},
    settings: { ...DEFAULT_SETTINGS },
  }
}

/** Complète des données chargées (ancienne sauvegarde, import) avec les valeurs par défaut. */
export function normalize(input: Partial<AppData>): AppData {
  const base = emptyData()
  return {
    ...base,
    ...input,
    version: 1,
    settings: { ...base.settings, ...(input.settings ?? {}) },
    programs: (input.programs ?? base.programs).map((p) => ({ ...p, exercises: p.exercises.map(migrateExercise) })),
  }
}

/** Copie des données illisibles trouvées au démarrage, gardée à part pour ne jamais les écraser. */
export const CORRUPT_KEY = 'petra.data.illisible'

/**
 * Problème de stockage à montrer à l'utilisateur :
 * - `read` : les données enregistrées n'ont pas pu être lues au démarrage (l'appli est partie à vide) ;
 * - `write` : le dernier enregistrement a échoué (mémoire pleine…), les changements risquent d'être perdus.
 */
export type StorageIssue = { kind: 'read' } | { kind: 'write' }

let issue: StorageIssue | undefined
const issueListeners = new Set<() => void>()
function setIssue(next: StorageIssue | undefined) {
  if (next?.kind === issue?.kind) return
  issue = next
  issueListeners.forEach((l) => l())
}
export const getStorageIssue = () => issue
/** L'utilisateur a vu le problème (restauré, ou choisi de continuer). */
export const dismissStorageIssue = () => setIssue(undefined)
export function useStorageIssue(): StorageIssue | undefined {
  return useSyncExternalStore((l) => {
    issueListeners.add(l)
    return () => issueListeners.delete(l)
  }, getStorageIssue)
}

/** Lit les données enregistrées. Renvoie `undefined` si elles existent mais sont illisibles. */
export function parseStored(raw: string | null): AppData | undefined {
  if (!raw) return emptyData()
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.programs)) return undefined
    return normalize(parsed)
  } catch {
    return undefined
  }
}

function load(): AppData {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return emptyData()
  }
  const data = parseStored(raw)
  if (data) return data
  // Données abîmées : on les met de côté (jamais écrasées) et on propose de restaurer une sauvegarde.
  try {
    localStorage.setItem(CORRUPT_KEY, raw!)
  } catch {
    /* pas la place : elles restent au moins jusqu'au premier enregistrement */
  }
  issue = { kind: 'read' }
  return emptyData()
}

let state: AppData = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    if (issue?.kind === 'write') setIssue(undefined)
  } catch {
    // Mémoire pleine ou stockage refusé : l'état reste en mémoire, l'utilisateur est prévenu.
    setIssue({ kind: 'write' })
  }
}

export function getData(): AppData {
  return state
}

/**
 * Remplace les données. Par défaut, note ce qui a changé pour la synchro avec l'appli PC ;
 * `track: false` pour appliquer le résultat d'une synchro (déjà daté).
 */
export function setData(next: AppData, opts: { track?: boolean } = {}) {
  let tracked = false
  if (opts.track !== false) {
    const sync = track(state, next)
    tracked = sync !== state.sync
    if (sync !== next.sync) next = { ...next, sync }
  }
  state = next
  persist()
  listeners.forEach((l) => l())
  if (tracked) localChangeListeners.forEach((l) => l())
}

const localChangeListeners = new Set<() => void>()
/** Prévient quand l'utilisateur modifie des données partagées avec l'autre appareil (pas après une synchro). */
export function onLocalChange(l: () => void) {
  localChangeListeners.add(l)
  return () => {
    localChangeListeners.delete(l)
  }
}

/** Prévient à chaque changement des données, quelle qu'en soit l'origine. */
export function onDataChange(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function update(fn: (d: AppData) => AppData) {
  setData(fn(state))
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useData(): AppData {
  return useSyncExternalStore(subscribe, getData)
}
