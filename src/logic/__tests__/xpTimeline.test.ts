import { describe, expect, it } from 'vitest'
import { emptyData } from '../../data/store'
import type { AppData, Session, SessionSet } from '../../data/types'
import { evaluate, reachedKeys } from '../achievements'
import { xpTimeline } from '../xpTimeline'

const DAY = 86400000
const T0 = new Date(2026, 0, 5, 18).getTime()
const sets = (n: number, weight: number): SessionSet[] => Array.from({ length: n }, () => ({ phase: 'travail', reps: 5, weight, done: true }))
const bench = (i: number, weight: number): Session => ({
  id: `s${i}`,
  programId: 'p',
  programName: 'Pecs · A',
  startedAt: T0 + i * DAY,
  endedAt: T0 + i * DAY + 50 * 60000,
  planned: 3,
  exercises: [{ id: 'e', catalogId: 'dev_couche_barre', name: 'Développé couché', group: 'pectoraux', parCote: false, restSec: 90, sets: sets(3, weight) }],
})

describe("courbe d'XP", () => {
  it('part de 0 au jour 1 et finit sur l’XP actuelle, médailles comprises', () => {
    const sessions = [bench(0, 60), bench(2, 70), bench(4, 80), bench(9, 85)]
    const data: AppData = { ...emptyData(), sessions: [...sessions].reverse() }
    const now = T0 + 20 * DAY
    const tl = xpTimeline(data, now)
    expect(tl.start).toBe(T0)
    expect(tl.points[0]).toMatchObject({ t: T0, xp: 0 })
    expect(tl.points.filter((p) => p.n).map((p) => p.sessionId)).toEqual(['s0', 's2', 's4', 's9'])
    const final = evaluate(data, now)
    expect(tl.points[tl.points.length - 1].xp).toBe(final.xp)
    // Chaque médaille obtenue apparaît une fois, à la séance qui l'a débloquée.
    const all = tl.points.flatMap((p) => p.unlocks.map((u) => `${u.id}:${u.tier}`))
    expect(new Set(all).size).toBe(all.length)
    expect(all.sort()).toEqual(reachedKeys(final.list).sort())
    expect(tl.points[1].unlocks.length).toBeGreaterThan(0)
  })

  it('sans historique : un seul jour, 0 XP', () => {
    const tl = xpTimeline(emptyData(), T0)
    expect(tl.points.every((p) => p.xp === 0)).toBe(true)
  })
})
