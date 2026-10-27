import type { AppData, Program, Recurrence, Routine, Settings, TaskStatus } from '../data/types'
import { addDays, parseKey, weekday } from './util'

export function recursOn(rec: Recurrence, key: string): boolean {
  switch (rec.kind) {
    case 'once':
      return rec.date === key
    case 'daily':
      return true
    case 'weekdays':
      return rec.days.includes(weekday(key))
  }
}

export function describeRecurrence(rec: Recurrence): string {
  switch (rec.kind) {
    case 'once':
      return 'Une fois'
    case 'daily':
      return 'Tous les jours'
    case 'weekdays': {
      const names = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']
      if (rec.days.length === 7) return 'Tous les jours'
      return [...rec.days].sort().map((d) => names[d]).join(', ')
    }
  }
}

export interface DayRoutine {
  routine: Routine
  status?: TaskStatus
  /** Reportée depuis la veille. */
  carried: boolean
}

/** Routines du jour : celles prévues ce jour-là, plus celles reportées la veille. */
export function routinesFor(data: Pick<AppData, 'routines' | 'routineLog'>, key: string): DayRoutine[] {
  const log = data.routineLog[key] ?? {}
  const yesterday = data.routineLog[addDays(key, -1)] ?? {}
  const out: DayRoutine[] = []
  for (const r of data.routines) {
    const scheduled = recursOn(r.recurrence, key)
    const carried = !scheduled && yesterday[r.id] === 'reporte'
    if (scheduled || carried || log[r.id]) out.push({ routine: r, status: log[r.id], carried })
  }
  return out.sort((a, b) => (a.routine.time ?? '99').localeCompare(b.routine.time ?? '99'))
}

export type WeekLetter = 'A' | 'B'

/** Semaine A ou B d'une date : les semaines alternent à partir du lundi de référence. */
export function weekLetter(settings: Pick<Settings, 'abWeeks' | 'weekAAnchor'>, key: string): WeekLetter {
  if (!settings.abWeeks) return 'A'
  const monday = addDays(key, -weekday(key))
  const weeks = Math.round((parseKey(monday).getTime() - parseKey(settings.weekAAnchor).getTime()) / (7 * 86400000))
  return ((weeks % 2) + 2) % 2 === 0 ? 'A' : 'B'
}

type PlanData = Pick<AppData, 'programs' | 'weekPlan' | 'weekPlanB' | 'planOverrides' | 'settings'>

/** Id du programme de la semaine type (A ou B) pour ce jour. */
export function templateFor(data: PlanData, key: string): string | undefined {
  const plan = weekLetter(data.settings, key) === 'B' ? data.weekPlanB : data.weekPlan
  return plan[weekday(key)]
}

/** Programme prévu ce jour-là : exception datée d'abord, sinon semaine type. null = repos. */
export function programFor(data: PlanData, key: string): Program | null {
  const id = key in data.planOverrides ? data.planOverrides[key] : templateFor(data, key)
  return (id && data.programs.find((p) => p.id === id)) || null
}
