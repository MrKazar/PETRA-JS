import { describe, expect, it } from 'vitest'
import type { ActiveSession, SessionExercise } from '../../data/types'
import { PREP_SEC, buildIntervals, pauseTimer, resumeTimer, skipStep, startTimer, syncTimer, timerPosition } from '../session'

const ex = (id: string, n: number, sec: number | undefined, rest: number): SessionExercise => ({
  id, name: id, group: 'cardio', parCote: false, restSec: rest,
  sets: Array.from({ length: n }, () => ({ phase: 'cardio' as const, durationSec: sec, reps: sec == null ? 10 : undefined, restSec: rest, done: false })),
})
const session = (...exercises: SessionExercise[]): ActiveSession => ({ id: 's', programName: 'p', startedAt: 0, exercises })

describe('minuteur d’intervalles', () => {
  it('enchaîne plusieurs exercices chronométrés et s’arrête à une série en répétitions', () => {
    const steps = buildIntervals(session(ex('Step', 2, 30, 15), ex('Burpees', 2, 30, 15), ex('Pompes', 3, undefined, 60)))
    expect(steps.map((x) => `${x.kind}:${x.name}:${x.sec}`)).toEqual([
      `prep:Step:${PREP_SEC}`, 'work:Step:30', 'rest:Step:15', 'work:Step:30', 'rest:Burpees:15', 'work:Burpees:30', 'rest:Burpees:15', 'work:Burpees:30',
    ])
  })

  it('rien à chronométrer quand la prochaine série est en répétitions', () => {
    expect(buildIntervals(session(ex('Pompes', 3, undefined, 60), ex('Step', 4, 30, 15)))).toEqual([])
  })

  it('valide les séries au fil du temps, gère pause et passer', () => {
    let s = startTimer(session(ex('Step', 3, 30, 10)), 0)
    expect(timerPosition(s.timer!, 5000)).toMatchObject({ index: 0 })
    s = syncTimer(s, (PREP_SEC + 31) * 1000)
    expect(s.exercises[0].sets.map((x) => x.done)).toEqual([true, false, false])
    s = pauseTimer(s, 45_000)
    expect(timerPosition(s.timer!, 100_000).index).toBe(timerPosition(s.timer!, 45_000).index)
    s = resumeTimer(s, 100_000)
    s = skipStep(s, 100_000) // repos passé
    s = skipStep(s, 100_000) // 2e série validée
    expect(s.exercises[0].sets.map((x) => x.done)).toEqual([true, true, false])
    s = syncTimer(s, 1_000_000)
    expect(s.timer).toBeUndefined()
    expect(s.exercises[0].sets.every((x) => x.done)).toBe(true)
  })
})

describe('minuteur sur des séries en répétitions', () => {
  it('passe un circuit au poids du corps en temps puis lance le minuteur', async () => {
    const { repCircuit, toTimed } = await import('../session')
    const bw = (id: string) => ({ ...ex(id, 3, undefined, 60), usesLoad: false })
    const s = session(bw('Burpees'), bw('Pompes'), { ...ex('Squat', 3, undefined, 90), usesLoad: true })
    expect(repCircuit(s, true).map((e) => e.name)).toEqual(['Burpees', 'Pompes'])
    expect(repCircuit(s, false).map((e) => e.name)).toEqual(['Burpees'])
    const t = startTimer(toTimed(s, ['Burpees', 'Pompes'], 30, 15), 0)
    expect(t.timer!.steps.filter((x) => x.kind === 'work')).toHaveLength(6)
    expect(t.timer!.steps.filter((x) => x.kind === 'rest').every((x) => x.sec === 15)).toBe(true)
  })
})
