import { describe, expect, it } from 'vitest'
import type { ActiveSession, SessionExercise } from '../../data/types'
import { chainsInSuperset, completeSet, estimateDuration, nextPending, supersetGroups } from '../session'

const ex = (id: string, n: number, linkNext = false): SessionExercise => ({
  id, name: id, group: 'x', parCote: false, restSec: 90, linkNext,
  sets: Array.from({ length: n }, () => ({ phase: 'travail' as const, reps: 10, restSec: 90, done: false })),
})

describe('supersets', () => {
  it('regroupe les exercices liés', () => {
    expect(supersetGroups([ex('A', 1, true), ex('B', 1), ex('C', 1, true), ex('D', 1, true), ex('E', 1)])).toEqual([[0, 1], [2, 3, 4]])
  })

  it('alterne les séries A1, B1, A2, B2 puis passe à la suite', () => {
    let s: ActiveSession = { id: 's', programName: 'p', startedAt: 0, exercises: [ex('A', 2, true), ex('B', 2), ex('C', 1)] }
    const order: string[] = []
    for (let k = 0; k < 5; k++) {
      const up = nextPending(s)!
      order.push(`${up.exercise.id}${up.index + 1}`)
      s = completeSet(s, up.exercise.id, up.index)
    }
    expect(order).toEqual(['A1', 'B1', 'A2', 'B2', 'C1'])
  })

  it('pas de repos entre A et B, repos entre deux tours', () => {
    const list = [ex('A', 2, true), ex('B', 2)]
    expect(chainsInSuperset(list, 'A', 'B')).toBe(true)
    expect(chainsInSuperset(list, 'B', 'A')).toBe(false)
  })

  it('durée estimée sans les repos internes au superset', () => {
    const plain = estimateDuration({ exercises: [ex('A', 2), ex('B', 2)] }, 90)
    const ss = estimateDuration({ exercises: [ex('A', 2, true), ex('B', 2)] }, 90)
    expect(plain - ss).toBe(180)
  })
})
