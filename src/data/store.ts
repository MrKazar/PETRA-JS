import { useSyncExternalStore } from 'react'
import type { AppData, Settings } from './types'
import { addDays, dateKey, weekday } from '../logic/util'
import { migrateExercise } from './catalog'

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

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return normalize(JSON.parse(raw))
  } catch {
    // stockage indisponible ou corrompu : on repart de zéro
  }
  return emptyData()
}

let state: AppData = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // quota dépassé : on garde l'état en mémoire
  }
}

export function getData(): AppData {
  return state
}

export function setData(next: AppData) {
  state = next
  persist()
  listeners.forEach((l) => l())
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
