import type { AppData, Program, Recurrence, Routine, TaskStatus } from '../data/types'
import { addDays, weekday } from './util'

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

/** Programme prévu ce jour-là : exception datée d'abord, sinon semaine type. null = repos. */
export function programFor(data: Pick<AppData, 'programs' | 'weekPlan' | 'planOverrides'>, key: string): Program | null {
  const id = key in data.planOverrides ? data.planOverrides[key] : data.weekPlan[weekday(key)]
  return (id && data.programs.find((p) => p.id === id)) || null
}
