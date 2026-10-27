import { describe, expect, it } from 'vitest'
import { FINISHERS, drawFinisher } from '../../data/finishers'
import { CATALOG, buildSets, parseReps } from '../../data/catalog'
import { programFor, recursOn, routinesFor } from '../planner'
import { addSet, completeSet, extendRest, finalize, nextPending, personalRecords, startFrom, startRest, statsOf } from '../session'
import { addDays, weekday } from '../util'
import { isNewer } from '../updates'
import type { Program, Routine } from '../../data/types'

const program: Program = {
  id: 'p1',
  name: 'Push',
  createdAt: 0,
  exercises: [
    { id: 'e1', name: 'Développé couché', group: 'pectoraux', parCote: false, restSec: 120, sets: [{ phase: 'travail', reps: 5, weight: 80 }, { phase: 'travail', reps: 5 }] },
    { id: 'e2', name: 'Fentes', group: 'quadriceps', parCote: true, restSec: 60, sets: [{ phase: 'hypertrophie', reps: 10, weight: 20 }] },
  ],
}

describe('finishers', () => {
  it('a 4 finishers par type et 3 pour épaules / bras', () => {
    const count = (t: string) => FINISHERS.filter((f) => f.type === t).length
    expect([count('abdos'), count('dos'), count('pecs'), count('jambes'), count('epaules_bras')]).toEqual([4, 4, 4, 4, 3])
  })
  it('ne tire jamais le même que la dernière fois', () => {
    for (let i = 0; i < 200; i++) {
      const f = drawFinisher('pecs', 'pecs_2')
      expect(f.type).toBe('pecs')
      expect(f.id).not.toBe('pecs_2')
    }
  })
  it('peut tirer chacun des autres', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 300; i++) seen.add(drawFinisher('dos', 'dos_1').id)
    expect([...seen].sort()).toEqual(['dos_2', 'dos_3', 'dos_4'])
  })
})

describe('catalogue', () => {
  it('se charge', () => {
    expect(CATALOG.length).toBeGreaterThan(100)
  })
  it('lit les fourchettes de répétitions', () => {
    expect(parseReps('3-6')).toBe(6)
    expect(parseReps('10-12 puis 5-6 en montant la charge')).toBe(12)
    expect(parseReps('15')).toBe(15)
    expect(parseReps('max')).toBeUndefined()
  })
  it('construit échauffement + travail', () => {
    const bench = CATALOG.find((e) => e.id === 'dev_couche_barre')!
    const { sets, restSec } = buildSets(bench, 'force', true)
    expect(sets.filter((s) => s.phase === 'chauffe')).toHaveLength(3)
    expect(sets.filter((s) => s.phase === 'travail')).toHaveLength(4)
    expect(restSec).toBe(180)
  })
  it('construit les phases de cardio en durée', () => {
    const rope = CATALOG.find((e) => e.id === 'corde_a_sauter')!
    const { sets } = buildSets(rope, 'force', true)
    expect(sets.map((s) => s.phase)).toEqual(['chauffe', 'effort', 'retour'])
    expect(sets[1].durationSec).toBe(15 * 60)
  })
})

describe('planning', () => {
  it('calcule le jour de la semaine (lundi = 0)', () => {
    expect(weekday('2026-10-26')).toBe(0)
    expect(weekday('2026-11-01')).toBe(6)
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
  })
  it('gère les récurrences', () => {
    expect(recursOn({ kind: 'weekdays', days: [0, 2] }, '2026-10-28')).toBe(true)
    expect(recursOn({ kind: 'weekdays', days: [0, 2] }, '2026-10-29')).toBe(false)
    expect(recursOn({ kind: 'once', date: '2026-10-29' }, '2026-10-29')).toBe(true)
  })
  it('reporte une routine au lendemain', () => {
    const r: Routine = { id: 'r', name: 'Étirements', recurrence: { kind: 'once', date: '2026-10-27' }, createdAt: 0 }
    const data = { routines: [r], routineLog: { '2026-10-27': { r: 'reporte' as const } } }
    expect(routinesFor(data, '2026-10-28')).toMatchObject([{ carried: true }])
    expect(routinesFor(data, '2026-10-29')).toEqual([])
  })
  it('donne la priorité aux exceptions datées', () => {
    const data = { programs: [program], weekPlan: { 0: 'p1' }, planOverrides: { '2026-11-02': null } }
    expect(programFor(data, '2026-10-26')?.id).toBe('p1')
    expect(programFor(data, '2026-11-02')).toBeNull()
    expect(programFor(data, '2026-10-27')).toBeNull()
  })
})

describe('séance', () => {
  it('valide une série, reporte la charge et gère le repos', () => {
    let s = startFrom(program, 0)
    const ex = s.exercises[0]
    s = completeSet(s, ex.id, 0, 1000)
    expect(s.exercises[0].sets[1].weight).toBe(80)
    expect(nextPending(s)?.index).toBe(1)
    s = startRest(s, 120, 'x', 1000)
    expect(s.rest?.endsAt).toBe(121000)
    s = extendRest(s, 15, 2000)
    expect(s.rest?.endsAt).toBe(136000)
  })
  it('calcule les stats et ne garde que les séries faites', () => {
    let s = startFrom(program, 0)
    s = completeSet(s, s.exercises[0].id, 0)
    s = completeSet(s, s.exercises[1].id, 0)
    s = addSet(s, s.exercises[1].id)
    const done = finalize(s, 60_000)
    const st = statsOf(done)
    expect(st.setsDone).toBe(2)
    expect(st.volumeKg).toBe(5 * 80 + 10 * 20 * 2)
    expect(done.exercises[1].sets).toHaveLength(1)
    expect(st.durationSec).toBe(60)
  })
  it('trouve les records', () => {
    let s = startFrom(program, 0)
    s = completeSet(s, s.exercises[0].id, 0)
    const prs = personalRecords([finalize(s)])
    expect(prs[0]).toMatchObject({ name: 'Développé couché', bestWeight: 80, repsAtBest: 5 })
  })
})

describe('mises à jour', () => {
  it('compare les versions', () => {
    expect(isNewer('v1.0.1', '1.0.0')).toBe(true)
    expect(isNewer('1.0.0', '1.0.0')).toBe(false)
    expect(isNewer('v1.10.0', '1.9.9')).toBe(true)
  })
})
