import type { AppData } from '../data/types'
import { programFor, recursOn } from './planner'
import { addDays, dateKey, parseKey } from './util'

export interface Reminder {
  at: number
  title: string
  body: string
}

const at = (key: string, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  const d = parseKey(key)
  d.setHours(h || 0, m || 0, 0, 0)
  return d.getTime()
}

/** Rappels à venir selon les réglages : séance du jour (14 jours) et tâches à heure fixe (7 jours). */
export function computeReminders(data: AppData, now = Date.now()): Reminder[] {
  const s = data.settings
  const today = dateKey(new Date(now))
  const out: Reminder[] = []
  if (s.notifDaily) {
    for (let i = 0; i < 14; i++) {
      const key = addDays(today, i)
      const p = programFor(data, key)
      if (!p && s.notifDailyPlannedOnly) continue
      // Séance déjà faite aujourd'hui : pas de rappel.
      if (i === 0 && data.sessions.some((x) => dateKey(new Date(x.startedAt)) === key)) continue
      out.push({ at: at(key, s.notifDailyTime), title: p ? `Séance du jour : ${p.name}` : 'PETRA', body: p ? 'Plus fort aujourd’hui, plus utile demain.' : 'Pas de séance prévue : une séance libre ?' })
    }
  }
  if (s.notifRoutines) {
    for (let i = 0; i < 7; i++) {
      const key = addDays(today, i)
      for (const r of data.routines) {
        if (r.time && recursOn(r.recurrence, key)) out.push({ at: at(key, r.time), title: r.name, body: 'Tâche prévue à cette heure' })
      }
    }
  }
  return out.filter((x) => x.at > now).sort((a, b) => a.at - b.at)
}
