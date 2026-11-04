import { describe, expect, it } from 'vitest'
import type { Goal, Session, SessionSet } from '../../data/types'
import { WEEK, e1rm, liftHistory, liftOptions, liftsOf, project, summarize, weeklyTonnage } from '../stats'
import { weekStart } from '../body'

const DAY = 86400000
const NOW = new Date(2026, 10, 4, 12).getTime() // mercredi 4 novembre 2026

const sets = (n: number, weight: number, reps: number, phase: SessionSet['phase'] = 'travail', done = true): SessionSet[] =>
  Array.from({ length: n }, () => ({ phase, reps, weight, done }))

const bench = (at: number, weight: number, reps = 5, extra: SessionSet[] = []): Session => ({
  id: `s${at}`,
  programId: 'A',
  programName: 'A',
  startedAt: at,
  endedAt: at + 3600000,
  exercises: [{ id: 'e', catalogId: 'dev_couche_barre', name: 'Développé couché', group: 'pectoraux', parCote: false, restSec: 90, sets: [...sets(1, 40, 10, 'chauffe'), ...sets(3, weight, reps), ...extra] }],
})

describe('statistiques PCTRA', () => {
  it('séries retenues : sans chauffe ni séries non faites, × 2 côté par côté, parts de superset', () => {
    const s = bench(NOW, 100, 5, sets(1, 100, 5, 'travail', false))
    expect(liftsOf(s)).toHaveLength(3)
    expect(liftsOf(s)[0].tonnage).toBe(500)
    const uni: Session = { ...s, exercises: [{ ...s.exercises[0], parCote: true }] }
    expect(liftsOf(uni)[0].tonnage).toBe(1000)
    const sup: Session = {
      ...s,
      exercises: [{
        id: 'x', name: 'Superset', group: 'biceps', parCote: false, restSec: 60,
        parts: [{ catalogId: 'curl_barre', name: 'Curl', group: 'biceps', parCote: false }, { name: 'Barre au front', group: 'triceps', parCote: false }],
        sets: [{ phase: 'travail', done: true, parts: [{ reps: 10, weight: 30 }, { reps: 12, weight: 25 }] }],
      }],
    }
    expect(liftsOf(sup).map((l) => [l.name, l.tonnage])).toEqual([['Curl', 300], ['Barre au front', 300]])
  })

  it('1RM estimé d’Epley, rien au-delà de 12 répétitions', () => {
    expect(e1rm(100, 1)).toBe(100)
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 1)
    expect(e1rm(100, 15)).toBeUndefined()
    expect(e1rm(0, 5)).toBeUndefined()
  })

  it('tonnage par semaine, total et par muscle (1 principal, 0,5 secondaire)', () => {
    const s = [bench(NOW - DAY, 100), bench(NOW - 8 * DAY, 80), bench(NOW - 30 * WEEK, 50)]
    const w = weeklyTonnage(s, 4, NOW)
    expect(w).toHaveLength(4)
    expect(w[3].start).toBe(weekStart(NOW))
    expect(w[3].tonnage).toBe(1500)
    expect(w[2].tonnage).toBe(1200)
    expect(w[3].sessions).toBe(1)
    expect(weeklyTonnage(s, 4, NOW, 'pec_milieu')[3].tonnage).toBe(1500)
    expect(weeklyTonnage(s, 4, NOW, 'delt_ant')[3].tonnage).toBe(750)
    expect(weeklyTonnage(s, 4, NOW, 'quadriceps' as never)[3].tonnage).toBe(0)
  })

  it('historique d’un exercice et liste des exercices chargés', () => {
    const s = [bench(NOW - 14 * DAY, 90, 5), bench(NOW - 7 * DAY, 95, 3), bench(NOW, 80, 15)]
    const h = liftHistory(s, 'dev_couche_barre')
    expect(h.map((p) => p.max)).toEqual([90, 95, 80])
    expect(h[0].e1rm).toBeCloseTo(105)
    expect(h[2].e1rm).toBeUndefined()
    expect(liftOptions(s)).toEqual([{ key: 'dev_couche_barre', name: 'Développé couché', sessions: 3, last: NOW }])
  })

  it('résumé d’une période', () => {
    const r = summarize([bench(NOW, 100), bench(NOW - DAY, 100)])
    expect(r.sessions).toBe(2)
    expect(r.sets).toBe(6)
    expect(r.tonnage).toBe(3000)
    expect(r.durationSec).toBe(7200)
    expect(r.work.pec_milieu.sets).toBe(6)
    expect(r.best.get('dev_couche_barre')!.e1rm).toBeCloseTo(116.67, 1)
  })

  it('objectif : projection au rythme actuel', () => {
    // +2,5 kg par semaine pendant 6 semaines, 1RM estimé = charge × 7/6 (5 répétitions).
    const s = Array.from({ length: 6 }, (_, i) => bench(NOW - (5 - i) * WEEK, 80 + 2.5 * i))
    const goal: Goal = { id: 'g', key: 'dev_couche_barre', name: 'DC', kind: 'max', target: 100, createdAt: NOW - 6 * WEEK }
    const p = project(goal, s, NOW)
    expect(p.reached).toBe(false)
    expect(p.current).toBe(92.5)
    expect(p.start).toBe(80)
    expect(p.perWeek).toBeCloseTo(2.5, 5)
    expect((p.eta! - NOW) / WEEK).toBeCloseTo(3, 5)

    expect(project({ ...goal, target: 90 }, s, NOW).reached).toBe(true)
    expect(project({ ...goal, kind: 'e1rm', target: 120 }, s, NOW).eta).toBeGreaterThan(NOW)

    const flat = Array.from({ length: 4 }, (_, i) => bench(NOW - i * WEEK, 80))
    const f = project(goal, flat, NOW)
    expect(f.eta).toBeUndefined()
    expect(f.tooFew).toBe(false)
    expect(project(goal, [bench(NOW, 80)], NOW).tooFew).toBe(true)
    expect(project({ ...goal, key: 'autre' }, s, NOW)).toEqual({ reached: false, tooFew: true })
  })
})
