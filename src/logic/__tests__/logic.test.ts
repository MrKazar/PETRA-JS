import { describe, expect, it } from 'vitest'
import { DEFAULT_FINISHERS as FINISHERS, drawFinisher, finishersOf, formatItem } from '../../data/finishers'
import { CATALOG, buildCycle, cardioPlanOf, cardioSets, cardioSummary, exerciseFromCatalog, migrateCardio, migrateExercise, parseReps, pdcPlanOf, pdcSets, setLabels, withWorkLoad } from '../../data/catalog'
import { programFor, recursOn, routinesFor, weekLetter } from '../planner'
import { addSet, completeSet, estimateDuration, formatEstimate, extendRest, finalize, nextPending, personalRecords, startFrom, startRest, statsOf } from '../session'
import { addDays, weekday } from '../util'
import { isNewer } from '../updates'
import { exerciseHistory, exerciseKey, overloadIncrement, overloadSuggestion } from '../progress'
import { THEMES, activeTheme, themeOf, themesFor } from '../../ui/theme'
import { ZONES, kindOf, muscleOf } from '../../data/muscles'
import type { Program, Routine } from '../../data/types'
import { DEFAULT_SETTINGS } from '../../data/store'
import { backupName, backupsToPrune, parseBackup } from '../backup'
import { MAX_QR_CHARS, applyShare, decodeShare, encodeShare, shareProgram, shareWeeksAB } from '../share'
import { emptyData } from '../../data/store'
const DATA0 = () => emptyData()

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
    for (const e of CATALOG.filter((x) => !x.cardio && !x.pdc)) {
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
  it('fait le poids du corps en séries simples, comme les finishers', () => {
    const pdc = CATALOG.filter((e) => e.pdc)
    expect(pdc.length).toBeGreaterThan(80)
    for (const e of pdc) expect(buildCycle(e).every((s) => s.phase === 'serie')).toBe(true)
    const pull = exerciseFromCatalog(CATALOG.find((e) => e.id === 'traction_pronation')!)
    expect(pull.sets).toHaveLength(4)
    expect(pull.sets[0]).toMatchObject({ reps: 8, restSec: 120 })
    expect(setLabels(pull.sets)).toEqual(['Série 1', 'Série 2', 'Série 3', 'Série 4'])
    expect(buildCycle(CATALOG.find((e) => e.id === 'planche')!)[0]).toMatchObject({ durationSec: 45 })
    expect(buildCycle(CATALOG.find((e) => e.id === 'suspension_barre')!)[0]).toMatchObject({ toFailure: true })
    for (const p of [{ mode: 'reps', series: 4, reps: 12, repos_sec: 60 }, { mode: 'temps', series: 3, duree_sec: 40, repos_sec: 30 }, { mode: 'echec', series: 3, repos_sec: 90 }] as const) {
      expect(pdcPlanOf(pdcSets(p))).toEqual(p)
    }
  })
  it('convertit les anciens exercices au poids du corps', () => {
    const old = { id: 'x', catalogId: 'pompes', name: 'Pompes', group: 'pectoraux', parCote: false, usesLoad: false, restSec: 75, sets: [
      { phase: 'chauffe' as const, reps: 10 }, { phase: 'travail' as const, reps: 15 }, { phase: 'travail' as const, reps: 15 }, { phase: 'hypertrophie' as const, reps: 20 },
    ] }
    expect(migrateExercise(old).sets.every((s) => s.phase === 'serie')).toBe(true)
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
    expect(isNewer('v1.2.3.1', '1.2.3')).toBe(true)
    expect(isNewer('v1.2.4', '1.2.3.1')).toBe(true)
    expect(isNewer('v1.2.3', '1.2.3.1')).toBe(false)
  })
})

describe('thèmes', () => {
  it('propose 6 thèmes, militaire par défaut', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['militaire', 'police', 'gendarmerie', 'forces', 'minimal', 'vantablack', 'pompier', 'neon'])
    expect(themeOf(undefined).id).toBe('militaire')
    expect(themeOf('forces').emblem).toBe('emblem-forces.webp')
    expect(themesFor('').some((t) => t.id === 'neon')).toBe(false)
    expect(themesFor(' neodyme ').some((t) => t.id === 'neon')).toBe(true)
    expect(activeTheme({ theme: 'neon', name: 'NéoDyme' }).id).toBe('neon')
    expect(activeTheme({ theme: 'neon', name: 'Kazar' }).id).toBe('militaire')
  })
})

describe('progression', () => {
  const squat = exerciseFromCatalog(CATALOG.find((e) => e.id === 'squat_barre') ?? CATALOG.find((e) => e.profil === 'poly_lourd' && e.groupe_musculaire === 'quadriceps')!, 100)
  const bench = exerciseFromCatalog(CATALOG.find((e) => e.profil === 'poly_lourd' && e.groupe_musculaire === 'pectoraux')!, 80)
  const session = (day: number, ex: typeof squat, weight: number, reps: number, programId = 'p') => ({
    id: `s${day}${ex.name}`, programId, programName: 'A', startedAt: Date.UTC(2026, 9, day), endedAt: Date.UTC(2026, 9, day) + 3600e3,
    exercises: [{ ...ex, id: `e${day}`, sets: ex.sets.map((x) => ({ ...x, done: true, ...(x.phase === 'travail' ? { weight, reps } : {}) })) }],
  })
  it('suit la charge de travail max séance après séance', () => {
    const sessions = [session(3, squat, 105, 6), session(1, squat, 100, 6), session(2, squat, 102.5, 6, 'autre')]
    const h = exerciseHistory(sessions, 'p', exerciseKey(squat))
    expect(h.map((p) => p.weight)).toEqual([100, 105])
    expect(h[0].reps).toBe(12)
  })
  it('propose d’augmenter après 2 séances réussies', () => {
    const target = squat.sets.find((x) => x.phase === 'travail')!.reps!
    expect(overloadSuggestion(squat, [session(1, squat, 100, target)], 'p')).toBeUndefined()
    const s = overloadSuggestion(squat, [session(1, squat, 100, target), session(2, squat, 100, target)], 'p')
    expect(s).toMatchObject({ from: 100, to: 105 })
    expect(overloadSuggestion(squat, [session(1, squat, 100, target), session(2, squat, 100, target - 1)], 'p')).toBeUndefined()
    expect(overloadSuggestion(squat, [session(1, squat, 100, target), session(2, squat, 95, target)], 'p')).toBeUndefined()
  })
  it('augmente de 2,5 kg le haut du corps et 5 kg les jambes', () => {
    expect(overloadIncrement(bench)).toBe(2.5)
    expect(overloadIncrement(squat)).toBe(5)
  })
})

describe('recherche par muscle', () => {
  const byName = (n: string) => CATALOG.find((e) => e.nom === n)!
  it('range chaque exercice dans un muscle d’une zone', () => {
    const ids = new Set(ZONES.flatMap((z) => z.muscles.map((m) => m.id)))
    for (const e of CATALOG) expect(ids.has(muscleOf(e) ?? '')).toBe(true)
  })
  it('distingue les parties d’un muscle', () => {
    expect(muscleOf(byName('Développé incliné à la barre'))).toBe('pec_haut')
    expect(muscleOf(byName('Développé couché à la barre'))).toBe('pec_milieu')
    expect(muscleOf(byName('Pompes inclinées (mains surélevées)'))).toBe('pec_bas')
    expect(muscleOf(byName('Tractions pronation'))).toBe('dos_largeur')
    expect(muscleOf(byName('Rowing barre penché'))).toBe('dos_epaisseur')
    expect(muscleOf(byName('Soulevé de terre'))).toBe('dos_chaine')
    expect(muscleOf(byName('Face pull'))).toBe('epaule_arriere')
    expect(muscleOf(byName('Élévations latérales à la poulie'))).toBe('epaule_cote')
    expect(muscleOf(byName('Gainage planche'))).toBe('gainage')
  })
  it('classe le matériel', () => {
    expect(kindOf(byName('Développé couché à la barre'))).toBe('libre')
    expect(kindOf(byName('Presse à cuisses'))).toBe('machine')
    expect(kindOf(byName('Tractions pronation'))).toBe('pdc')
  })
})

describe('durée estimée', () => {
  it('additionne séries et repos, sans repos après la dernière série', () => {
    const p = { exercises: [
      { id: 'a', name: 'A', group: 'pectoraux', restSec: 60, sets: [{ phase: 'travail', reps: 10, restSec: 60 }, { phase: 'travail', reps: 10, restSec: 60 }] },
      { id: 'b', name: 'B', group: 'cardio', restSec: 0, sets: [{ phase: 'cardio', durationSec: 600 }] },
    ] } as unknown as Program
    // 40 + 60 + 40 + max(60, 90) + 600
    expect(estimateDuration(p, 90)).toBe(830)
    expect(formatEstimate(830)).toBe('~15 min')
    expect(formatEstimate(4200)).toBe('~1 h 10')
    expect(formatEstimate(3600)).toBe('~1 h')
  })
})

describe('sauvegarde automatique', () => {
  it('nomme les fichiers par date et garde les 10 plus récents', () => {
    expect(backupName(new Date(2026, 9, 28, 20, 41, 5))).toBe('petra-2026-10-28-204105.json')
    const names = Array.from({ length: 12 }, (_, i) => `petra-2026-10-${String(i + 10)}-120000.json`).concat('notes.txt')
    expect(backupsToPrune(names)).toEqual(['petra-2026-10-10-120000.json', 'petra-2026-10-11-120000.json'])
    expect(backupsToPrune(names.slice(0, 5))).toEqual([])
  })
  it('refuse un fichier qui n’est pas une sauvegarde', () => {
    expect(() => parseBackup('{"a":1}')).toThrow()
    expect(parseBackup('{"programs":[]}').programs).toEqual([])
  })
})

describe('partage par QR code', () => {
  const prog = (name: string, from: number): Program => ({
    id: name, name, createdAt: 0,
    exercises: CATALOG.filter((c) => c.charge && !c.cardio).slice(from, from + 8).map((c) => exerciseFromCatalog(c, 60)),
  })
  it('retrouve une séance après encodage', async () => {
    const p = prog('Push', 0)
    const back = await decodeShare(await encodeShare(shareProgram(p)))
    const { data } = applyShare({ ...DATA0(), programs: [] }, back)
    expect(data.programs[0].name).toBe('Push')
    expect(data.programs[0].exercises.map((e) => [e.name, e.sets])).toEqual(p.exercises.map((e) => [e.name, e.sets]))
  })
  it('tient dans un QR code pour 6 séances de 8 exercices en semaines A / B', async () => {
    const programs = [0, 8, 16, 24, 32, 40].map((n, i) => prog(`S${i}`, n))
    const d = { ...DATA0(), programs, weekPlan: { 0: 'S0', 2: 'S1', 4: 'S2' }, weekPlanB: { 0: 'S3', 2: 'S4', 4: 'S5' } }
    const text = await encodeShare(shareWeeksAB(d))
    expect(text.length).toBeLessThan(MAX_QR_CHARS)
    const { data } = applyShare({ ...DATA0(), programs: [] }, await decodeShare(text))
    expect(data.settings.abWeeks).toBe(true)
    expect(data.programs.find((x) => x.id === data.weekPlanB[2])?.name).toBe('S4')
    expect(data.weekPlan[1]).toBeUndefined()
  })
  it('refuse un QR code étranger', async () => {
    await expect(decodeShare('https://exemple.fr')).rejects.toThrow()
  })
})
