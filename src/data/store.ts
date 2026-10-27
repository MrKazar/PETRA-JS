import { useSyncExternalStore } from 'react'
import type { AppData, Settings } from './types'

const KEY = 'petra.data.v1'

export const DEFAULT_SETTINGS: Settings = {
  defaultRestSec: 90,
  finishersEnabled: false,
  vibrate: true,
  keepAwake: true,
  name: '',
}

export function emptyData(): AppData {
  return {
    version: 1,
    programs: [],
    sessions: [],
    routines: [],
    routineLog: {},
    weekPlan: {},
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
