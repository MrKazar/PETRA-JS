import { describe, expect, it } from 'vitest'
import { emptyData } from '../../data/store'
import { computeReminders } from '../reminders'

describe('rappels', () => {
  const base = () => {
    const d = emptyData()
    d.programs = [{ id: 'p', name: 'Haut du corps', exercises: [], createdAt: 0 }]
    d.weekPlan = { 0: 'p', 3: 'p' } // lundi et jeudi
    return d
  }
  const now = new Date(2026, 10, 2, 8, 0).getTime() // lundi 2 novembre 2026, 8 h

  it('rien quand tout est coupé', () => {
    expect(computeReminders(base(), now)).toEqual([])
  })

  it('rappel quotidien seulement les jours de séance, à l’heure choisie', () => {
    const d = base()
    d.settings = { ...d.settings, notifDaily: true, notifDailyTime: '18:30' }
    const r = computeReminders(d, now)
    expect(r).toHaveLength(4)
    expect(new Date(r[0].at).getHours()).toBe(18)
    expect(new Date(r[0].at).getMinutes()).toBe(30)
    expect(r[0].title).toContain('Haut du corps')
  })

  it('pas de rappel aujourd’hui si la séance est déjà faite ; tous les jours si demandé', () => {
    const d = base()
    d.settings = { ...d.settings, notifDaily: true, notifDailyPlannedOnly: false }
    d.sessions = [{ id: 's', programName: 'x', startedAt: now - 3600_000, exercises: [] }]
    expect(computeReminders(d, now)).toHaveLength(13)
  })

  it('tâches à heure fixe', () => {
    const d = base()
    d.settings = { ...d.settings, notifRoutines: true }
    d.routines = [{ id: 'r', name: 'Étirements', time: '07:00', recurrence: { kind: 'daily' }, createdAt: 0 }, { id: 'n', name: 'Sans heure', recurrence: { kind: 'daily' }, createdAt: 0 }]
    const r = computeReminders(d, now)
    expect(r).toHaveLength(6) // 7 h aujourd'hui déjà passé
    expect(r[0].title).toBe('Étirements')
  })
})
