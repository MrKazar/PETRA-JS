import { describe, expect, it } from 'vitest'
import { emptyData } from '../../data/store'
import type { ActiveSession, AppData, Session, SupersetPart } from '../../data/types'
import { AMRAP_PREP_SEC, addRound, amrapHistory, amrapKey, bestOf, commitAmrap, elapsedSec, formatScore, leadOnRecord, makeAmrap, pauseAmrap, resumeAmrap, scoreOf, startAmrap, stopAmrap, undoRound } from '../amrap'
import { estimateDuration, finalize, nextPending, statsOf, toSessionExercise } from '../session'
import { evaluate } from '../achievements'
import { applyShare, decodeShare, encodeShare, shareProgram } from '../share'

const parts: SupersetPart[] = [
  { catalogId: 'traction_pronation', name: 'Tractions pronation', group: 'dos', parCote: false, usesLoad: false, reps: 5 },
  { catalogId: 'pompes', name: 'Pompes', group: 'pectoraux', parCote: false, usesLoad: false, reps: 10 },
  { name: 'Squats', group: 'jambes', parCote: false, usesLoad: false, reps: 15 },
]
const cindy = makeAmrap('Cindy', parts, 20 * 60)
const T0 = 1_700_000_000_000
const S = 1000

function run(rounds: number[], partial: number[], startedAt = T0): Session {
  let s: ActiveSession = { id: `s${startedAt}`, programName: 'Cardio', startedAt, exercises: [toSessionExercise(cindy)] }
  const id = s.exercises[0].id
  s = startAmrap(s, id, startedAt)
  const go = startedAt + AMRAP_PREP_SEC * S
  for (const t of rounds) s = addRound(s, id, go + t * S)
  s = stopAmrap(s, id, go + 20 * 60 * S)
  s = commitAmrap(s, id, partial, go + 20 * 60 * S)
  return finalize(s, go + 21 * 60 * S)
}

describe('AMRAP', () => {
  it('un bloc AMRAP : un tour type au programme, durée estimée = durée + décompte', () => {
    expect(cindy.sets).toHaveLength(1)
    expect(cindy.sets[0].parts).toEqual([{ reps: 5 }, { reps: 10 }, { reps: 15 }])
    expect(estimateDuration({ exercises: [cindy] }, 90)).toBe(20 * 60 + AMRAP_PREP_SEC)
  })

  it('+1 tour pendant l’effort seulement, pauses déduites, annuler le dernier', () => {
    let s: ActiveSession = { id: 's', programName: 'p', startedAt: T0, exercises: [toSessionExercise(cindy)] }
    const id = s.exercises[0].id
    expect(nextPending(s)?.exercise.id).toBe(id)
    s = startAmrap(s, id, T0)
    const go = T0 + AMRAP_PREP_SEC * S
    s = addRound(s, id, go - 2 * S) // pendant le décompte : ignoré
    expect(s.exercises[0].amrap!.run!.marks).toEqual([])
    s = addRound(s, id, go + 190 * S)
    s = pauseAmrap(s, id, go + 200 * S)
    s = addRound(s, id, go + 250 * S) // en pause : ignoré
    s = resumeAmrap(s, id, go + 260 * S)
    expect(elapsedSec(s.exercises[0].amrap!.run!, 1200, go + 300 * S)).toBe(240)
    s = addRound(s, id, go + 440 * S)
    expect(s.exercises[0].amrap!.run!.marks).toEqual([190, 380])
    s = undoRound(s, id)
    expect(s.exercises[0].amrap!.run!.marks).toEqual([190])
  })

  it('enregistre chaque tour comme une série faite, plus le tour entamé', () => {
    const done = run([192, 380, 577, 782, 996, 1180], [5, 6, 0])
    const ex = done.exercises[0]
    expect(ex.sets).toHaveLength(7)
    expect(ex.sets.every((x) => x.done)).toBe(true)
    expect(ex.sets[6].parts).toEqual([{ reps: 5 }, { reps: 6 }, { reps: 0 }])
    expect(ex.amrap).toMatchObject({ capSec: 1200, rounds: 6, partial: [5, 6, 0] })
    expect(ex.amrap!.roundSec).toEqual([192, 188, 197, 205, 214, 184])
    expect(ex.amrap!.run).toBeUndefined()
    const sc = scoreOf(ex)!
    expect(sc).toEqual({ rounds: 6, extra: 11, reps: 6 * 30 + 11 })
    expect(formatScore(sc)).toBe('6 tours + 11 rép.')
    expect(statsOf(done).setsDone).toBe(7)
  })

  it('un AMRAP encore au chrono en fin de séance garde ses tours complets', () => {
    let s: ActiveSession = { id: 's', programName: 'p', startedAt: T0, exercises: [toSessionExercise(cindy)] }
    const id = s.exercises[0].id
    s = startAmrap(s, id, T0)
    s = addRound(s, id, T0 + (AMRAP_PREP_SEC + 200) * S)
    const done = finalize(s, T0 + 300 * S)
    expect(done.exercises[0].amrap!.rounds).toBe(1)
    expect(done.exercises[0].sets).toHaveLength(1)
  })

  it('records, avance sur le record et succès', () => {
    const a = run([200, 400, 600, 800, 1000], [5, 2, 0], T0)
    const b = run([190, 380, 570, 760, 950, 1150], [0, 0, 0], T0 + 7 * 86400000)
    const hist = amrapHistory([b, a], amrapKey(cindy))
    expect(hist.map((h) => h.rounds)).toEqual([5, 6])
    expect(bestOf(hist)?.sessionId).toBe(b.id)
    expect(leadOnRecord([180, 370], bestOf(hist))).toBe(10)
    expect(leadOnRecord([200], bestOf(hist))).toBe(-10)
    const data: AppData = { ...emptyData(), sessions: [b, a] }
    const ev = evaluate(data)
    expect(ev.facts.amraps).toBe(2)
    expect(ev.facts.amrapRecords).toBe(1)
    expect(ev.list.find((x) => x.def.id === 'un_de_plus')?.reached).toBe(1)
    expect(ev.list.find((x) => x.def.id === 'amrap')?.reached).toBe(1)
  })

  it('voyage par QR code avec sa durée', async () => {
    const back = await decodeShare(await encodeShare(shareProgram({ id: 'p', name: 'Samedi', exercises: [cindy], createdAt: 0 })))
    const { data } = applyShare(emptyData(), back)
    const ex = data.programs[data.programs.length - 1].exercises[0]
    expect(ex.amrap).toEqual({ capSec: 1200 })
    expect(ex.parts).toHaveLength(3)
  })
})
