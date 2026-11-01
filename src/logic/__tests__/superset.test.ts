import { describe, expect, it } from 'vitest'
import type { ActiveSession, SupersetPart } from '../../data/types'
import { completeSet, describeSet, estimateDuration, nextPending, statsOf, supersetSets, toSessionExercise } from '../session'
import { decodeShare, encodeShare, shareProgram } from '../share'

const parts: SupersetPart[] = [
  { name: 'Élévation latérale poulie', group: 'epaules', parCote: false, reps: 10, weight: 5 },
  { name: 'Élévation frontale poulie', group: 'epaules', parCote: false, reps: 10, weight: 7.5 },
  { name: 'Oiseau poulie', group: 'epaules', parCote: false, reps: 12 },
]
const ss = { id: 'ss', name: 'Épaules poulie', group: 'superset', parCote: false, restSec: 90, parts, sets: supersetSets(parts, 3, 90) }

describe('superset combiné', () => {
  it('un tour = A + B + C, un seul Valider par tour', () => {
    let s: ActiveSession = { id: 's', programName: 'p', startedAt: 0, exercises: [toSessionExercise(ss)] }
    expect(s.exercises[0].sets).toHaveLength(3)
    expect(describeSet(s.exercises[0].sets[0])).toBe('10 × 5 kg + 10 × 7.5 kg + 12')
    s = completeSet(s, s.exercises[0].id, 0)
    expect(nextPending(s)).toMatchObject({ index: 1 })
    expect(statsOf(s).volumeKg).toBe(10 * 5 + 10 * 7.5)
  })

  it('reporte la charge saisie au tour suivant', () => {
    let s: ActiveSession = { id: 's', programName: 'p', startedAt: 0, exercises: [toSessionExercise(ss)] }
    const id = s.exercises[0].id
    s = { ...s, exercises: s.exercises.map((e) => ({ ...e, sets: e.sets.map((x, i) => (i === 0 ? { ...x, parts: x.parts!.map((p, k) => (k === 2 ? { ...p, weight: 4 } : p)) } : x)) })) }
    s = completeSet(s, id, 0)
    expect(s.exercises[0].sets[1].parts![2].weight).toBe(4)
  })

  it('durée estimée : les 3 exercices de chaque tour plus les repos', () => {
    expect(estimateDuration({ exercises: [ss] }, 90)).toBe(3 * (32 * 4) + 2 * 90)
  })

  it('passe dans un QR code', async () => {
    const back = await decodeShare(await encodeShare(shareProgram({ id: 'p', name: 'Épaules', exercises: [ss], createdAt: 0 })))
    expect(JSON.stringify(back)).toContain('Oiseau poulie')
  })
})

describe('QR sans charges', () => {
  it('ne transporte ni la charge de travail, ni les charges des séries et des supersets', async () => {
    const ex = { id: 'e', name: 'Squat', group: 'quadriceps', parCote: false, restSec: 120, workLoad: 100, sets: [{ phase: 'travail' as const, reps: 8, weight: 100, restSec: 120 }] }
    const text = JSON.stringify(await decodeShare(await encodeShare(shareProgram({ id: 'p', name: 'Jambes', exercises: [ex, ss], createdAt: 0 }))))
    expect(text).not.toContain('"weight"')
    expect(text).not.toContain('"workLoad"')
    expect(text).toContain('Oiseau poulie')
  })
})
