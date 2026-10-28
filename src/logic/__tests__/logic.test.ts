import { describe, expect, it } from 'vitest'
import { DEFAULT_FINISHERS as FINISHERS, drawFinisher, finishersOf, formatItem } from '../../data/finishers'
import { CATALOG, buildCycle, cardioPlanOf, cardioSets, cardioSummary, exerciseFromCatalog, migrateCardio, parseReps, setLabels, withWorkLoad } from '../../data/catalog'
import { programFor, recursOn, routinesFor, weekLetter } from '../planner'
import { addSet, completeSet, extendRest, finalize, nextPending, personalRecords, startFrom, startRest, statsOf } from '../session'
import { addDays, weekday } from '../util'
import { isNewer } from '../updates'
import type { Program, Routine } from '../../data/types'
import { DEFAULT_SETTINGS } from '../../data/store'

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
      const f = drawFinisher('pecs', 'pecs_2')!
      expect(f.type).toBe('pecs')
      expect(f.id).not.toBe('pecs_2')
    }
  })
  it('peut tirer chacun des autres', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 300; i++) seen.add(drawFinisher('dos', 'dos_1')!.id)
    expect([...seen].sort()).toEqual(['dos_2', 'dos_3', 'dos_4'])
  })
  it('tire dans les finishers personnalisés', () => {
    const mine = [{ id: 'm1', type: 'abdos' as const, name: 'Perso', items: [{ name: 'crunchs', kind: 'reps' as const, value: 50 }] }]
    expect(drawFinisher('abdos', 'm1', mine)?.id).toBe('m1')
    expect(drawFinisher('dos', undefined, mine)).toBeUndefined()
    expect(finishersOf({})).toBe(FINISHERS)
    expect(finishersOf({ finishers: mine })).toBe(mine)
  })
  it('écrit les exercices en clair', () => {
    expect(formatItem({ name: 'squats', kind: 'reps', value: 20 })).toBe('20 squats')
    expect(formatItem({ name: 'gainage', kind: 'temps', value: 60 })).toBe('Gainage 1 min')
    expect(formatItem({ name: 'chaise contre le mur', kind: 'temps', value: 45 })).toBe('Chaise contre le mur 45 s')
    expect(formatItem({ name: 'suspension à la barre', kind: 'echec' })).toBe('Suspension à la barre jusqu’à l’échec')
  })
})

describe('catalogue', () => {
  it('se charge, sans doublon, avec beaucoup plus d’exercices', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(250)
    expect(new Set(CATALOG.map((e) => e.id)).size).toBe(CATALOG.length)
  })
  it('lit les fourchettes de répétitions et les durées', () => {
    expect(parseReps('3-6')).toEqual({ reps: 6 })
    expect(parseReps('15')).toEqual({ reps: 15 })
    expect(parseReps('45 s')).toEqual({ durationSec: 45 })
    expect(parseReps('max')).toEqual({})
  })
  it('suit le cycle 1 chauffe, 2 travail, 1 hypertrophie pour toute la musculation', () => {
    for (const e of CATALOG.filter((x) => !x.cardio)) {
      expect(buildCycle(e).map((s) => s.phase)).toEqual(['chauffe', 'travail', 'travail', 'hypertrophie'])
      expect(buildCycle(e).every((s) => (s.restSec ?? 0) > 0)).toBe(true)
    }
  })
  it('calcule les charges depuis la charge de travail', () => {
    const bench = CATALOG.find((e) => e.id === 'dev_couche_barre')!
    const ex = exerciseFromCatalog(bench, 81)
    expect(ex.sets.map((s) => s.weight)).toEqual([40.5, 81, 81, 61])
    expect(ex.sets.map((s) => s.reps)).toEqual([10, 6, 6, 10])
    expect(ex.sets.map((s) => s.restSec)).toEqual([90, 180, 180, 120])
    expect(withWorkLoad(ex, 100).sets.map((s) => s.weight)).toEqual([50, 100, 100, 75])
    expect(setLabels(ex.sets)).toEqual(['Chauffe', 'Travail 1', 'Travail 2', 'Hypertrophie'])
  })
  it('ne met pas de charge sur le poids du corps', () => {
    const pushups = CATALOG.find((e) => e.id === 'pompes')!
    expect(exerciseFromCatalog(pushups, 50).sets.every((s) => s.weight == null)).toBe(true)
  })
  it('ne met jamais de chauffe / travail / hypertrophie sur le cardio', () => {
    for (const e of CATALOG.filter((x) => x.cardio)) expect(buildCycle(e).every((s) => s.phase === 'cardio')).toBe(true)
  })
  it('construit un cardio en durée, en fractionné ou en répétitions', () => {
    const run = buildCycle(CATALOG.find((e) => e.id === 'course_exterieur')!)
    expect(run).toEqual([{ phase: 'cardio', durationSec: 30 * 60, restSec: 0 }])
    expect(setLabels(run)).toEqual(['Durée'])
    const hiit = buildCycle(CATALOG.find((e) => e.id === 'air_bike')!)
    expect(hiit).toHaveLength(10)
    expect(hiit[0]).toMatchObject({ durationSec: 20, restSec: 40 })
    const rope = buildCycle(CATALOG.find((e) => e.id === 'corde_a_sauter')!)
    expect(rope[0]).toMatchObject({ reps: 100, unit: 'sauts', restSec: 45 })
    expect(cardioSummary(cardioPlanOf(rope))).toBe('10 × 100 sauts · récup 45 s')
  })
  it('retrouve le réglage d’un cardio depuis ses séries', () => {
    for (const p of [
      { mode: 'duree', duree_min: 25 },
      { mode: 'intervalles', tours: 6, effort_sec: 45, repos_sec: 15 },
      { mode: 'reps', tours: 4, reps: 250, unite: 'm', repos_sec: 60 },
    ] as const) expect(cardioPlanOf(cardioSets(p))).toEqual(p)
  })
  it('convertit les anciens cardios en 3 phases', () => {
    const old = { id: 'x', catalogId: 'course_exterieur', name: 'Course', group: 'cardio', parCote: false, restSec: 0, sets: [
      { phase: 'chauffe' as const, durationSec: 300 }, { phase: 'effort' as const, durationSec: 2400 }, { phase: 'retour' as const, durationSec: 300 },
    ] }
    expect(migrateCardio(old).sets).toEqual([{ phase: 'cardio', durationSec: 2400, restSec: 0 }])
    expect(migrateCardio({ ...old, catalogId: 'air_bike' }).sets).toHaveLength(10)
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
    const settings = { ...DEFAULT_SETTINGS, abWeeks: false, weekAAnchor: '2026-10-26' }
    const data = { programs: [program], weekPlan: { 0: 'p1' }, weekPlanB: {}, planOverrides: { '2026-11-02': null }, settings }
    expect(programFor(data, '2026-10-26')?.id).toBe('p1')
    expect(programFor(data, '2026-11-02')).toBeNull()
    expect(programFor(data, '2026-10-27')).toBeNull()
  })
})

describe('semaines A / B', () => {
  const settings = { ...DEFAULT_SETTINGS, abWeeks: true, weekAAnchor: '2026-10-26' }
  it('alterne à partir du lundi de référence', () => {
    expect(weekLetter(settings, '2026-10-26')).toBe('A')
    expect(weekLetter(settings, '2026-11-01')).toBe('A')
    expect(weekLetter(settings, '2026-11-02')).toBe('B')
    expect(weekLetter(settings, '2026-11-09')).toBe('A')
    expect(weekLetter(settings, '2026-10-19')).toBe('B')
    expect(weekLetter({ ...settings, abWeeks: false }, '2026-11-02')).toBe('A')
  })
  it('prend le programme de la bonne semaine', () => {
    const b: Program = { ...program, id: 'p2', name: 'Haut du corps' }
    const data = { programs: [program, b], weekPlan: { 0: 'p1' }, weekPlanB: { 0: 'p2' }, planOverrides: {}, settings }
    expect(programFor(data, '2026-10-26')?.id).toBe('p1')
    expect(programFor(data, '2026-11-02')?.id).toBe('p2')
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
