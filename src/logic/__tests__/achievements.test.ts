import { describe, expect, it } from 'vitest'
import { emptyData } from '../../data/store'
import type { AppData, Session, SessionSet } from '../../data/types'
import { DEFS, evaluate, gainsOf, levelCost, levelFor, metalOf, moonAge, titleOf, type Achievement } from '../achievements'
import { finalize, syncTimer, startTimer } from '../session'
import { merge, toWire } from '../sync'

const DAY = 86400000
const T0 = new Date(2026, 0, 5, 18).getTime() // lundi 5 janvier 2026, 18 h

const sets = (n: number, weight: number, reps: number): SessionSet[] => Array.from({ length: n }, () => ({ phase: 'travail', reps, weight, done: true }))

const bench = (i: number, weight: number, at = T0 + i * DAY): Session => ({
  id: `s${i}`,
  programId: 'p',
  programName: 'Pecs',
  startedAt: at,
  endedAt: at + 50 * 60000,
  planned: 3,
  exercises: [{ id: 'e', catalogId: 'dev_couche_barre', name: 'Développé couché', group: 'pectoraux', parCote: false, restSec: 90, sets: sets(3, weight, 5) }],
})

const withSessions = (sessions: Session[], patch: Partial<AppData> = {}): AppData => ({ ...emptyData(), sessions: [...sessions].reverse(), ...patch })
const get = (list: Achievement[], id: string) => list.find((a) => a.def.id === id)!

describe('succès', () => {
  it('aucun succès sans historique, niveau 1', () => {
    const ev = evaluate(emptyData())
    expect(ev.list.every((a) => a.reached === 0)).toBe(true)
    expect(ev.xp).toBe(0)
    expect(ev.level).toMatchObject({ level: 1, title: 'Recrue', into: 0, need: 100 })
    expect(new Set(DEFS.map((d) => d.id)).size).toBe(DEFS.length)
    expect(DEFS.filter((d) => d.family !== 'secrets')).toHaveLength(48)
    expect(DEFS.filter((d) => d.family === 'secrets')).toHaveLength(22)
  })

  it('rétroactif : séances, records, clubs, tonnage', () => {
    const data = withSessions([bench(0, 60), bench(2, 70), bench(4, 80), bench(6, 85)])
    const ev = evaluate(data)
    expect(get(ev.list, 'en_service')).toMatchObject({ value: 4, reached: 1, next: 10 })
    expect(get(ev.list, 'records').value).toBe(3)
    expect(get(ev.list, 'echelon').value).toBe(3)
    // 85 × (1 + 5/30) = 99,2 → palier 80 kg
    expect(get(ev.list, 'club_couche')).toMatchObject({ value: 99, reached: 2 })
    expect(get(ev.list, 'tonnage').value).toBe(3 * 5 * (60 + 70 + 80 + 85))
    expect(get(ev.list, 'parfaite').value).toBe(4)
    expect(get(ev.list, 'progression').value).toBe(41)
  })

  it('XP : une séance comptée par jour, plus les médailles', () => {
    const one = evaluate(withSessions([bench(0, 60)]))
    const twoSameDay = evaluate(withSessions([bench(0, 60), { ...bench(1, 60, T0 + 3600e3), id: 'x' }]))
    expect(twoSameDay.activityXp - one.activityXp).toBe(25) // séance parfaite seulement, pas les 50 XP de séance
  })

  it('médailles : bronze, argent, or, platine selon le nombre de paliers', () => {
    expect([0].map((i) => metalOf(i, 1))).toEqual(['or'])
    expect([0, 1].map((i) => metalOf(i, 2))).toEqual(['bronze', 'or'])
    expect([0, 1, 2].map((i) => metalOf(i, 3))).toEqual(['bronze', 'argent', 'or'])
    expect([0, 1, 2, 3].map((i) => metalOf(i, 4))).toEqual(['bronze', 'argent', 'or', 'platine'])
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => metalOf(i, 7))).toEqual(['bronze', 'bronze', 'argent', 'argent', 'or', 'or', 'platine'])
  })

  it('niveaux : 50 × n + 50 XP par niveau, titre tous les 10 niveaux', () => {
    expect(levelCost(1)).toBe(100)
    expect(levelCost(99)).toBe(5000)
    expect(levelFor(99).level).toBe(1)
    expect(levelFor(100)).toMatchObject({ level: 2, into: 0, need: 150 })
    expect(levelFor(252450).level).toBe(100)
    expect(levelFor(10 ** 9).level).toBe(100)
    expect(titleOf(23)).toBe('Hoplite')
    expect(titleOf(100)).toBe('Immortel')
  })

  it('secrets : dates, 100 kg × 10, pleine lune', () => {
    const at = new Date(2026, 6, 14, 10).getTime()
    const s: Session = { ...bench(0, 100, at), exercises: [{ ...bench(0, 100).exercises[0], sets: [{ phase: 'travail', weight: 100, reps: 10, done: true }] }] }
    const ev = evaluate(withSessions([s]))
    expect(get(ev.list, 'defile').reached).toBe(1)
    expect(get(ev.list, 'compte_bon').reached).toBe(1)
    expect(get(ev.list, 'resolution').reached).toBe(0)
    // Pleine lune du 3 mars 2026 (vers 12 h UTC)
    expect(moonAge(Date.UTC(2026, 2, 3, 12))).toBeGreaterThan(13.8)
    expect(moonAge(Date.UTC(2026, 2, 3, 12))).toBeLessThan(15.8)
  })

  it('régularité : semaine tenue d’après le planning', () => {
    const program = { id: 'p', name: 'Pecs', exercises: [], createdAt: 0 }
    const data = withSessions([bench(0, 60), bench(2, 60)], { programs: [program], weekPlan: { 0: 'p', 2: 'p' } })
    expect(get(evaluate(data).list, 'semaine_tenue').value).toBeGreaterThanOrEqual(1)
  })

  it('gains d’une séance : XP et nouvelles médailles', () => {
    const data = withSessions([bench(0, 60), bench(2, 70)])
    const g = gainsOf(data, 's2')
    expect(g.xp).toBeGreaterThan(0)
    expect(g.gains.map((x) => x.achievement.def.id)).toContain('records')
  })

  it('la séance garde le nombre de séries prévues, le minuteur marque ses séries', () => {
    const s = {
      id: 'a', programName: 'HIIT', startedAt: 0,
      exercises: [{ id: 'e', name: 'Burpees', group: 'corps_entier', parCote: false, restSec: 10, sets: [{ phase: 'serie' as const, durationSec: 20, done: false }, { phase: 'serie' as const, durationSec: 20, done: false }] }],
    }
    const timed = syncTimer(startTimer(s, 0), 10_000 + 20_000 + 1)
    expect(timed.exercises[0].sets[0]).toMatchObject({ done: true, timer: true })
    expect(finalize(timed, 60_000).planned).toBe(2)
  })
})

describe('mêmes chiffres sur le téléphone et le PC (1.4.0.5)', () => {
  it('après synchro, le PC trouve la même XP, le même niveau et les mêmes succès', () => {
    const phone = emptyData()
    phone.settings.pc = { hosts: ['1.2.3.4'], port: 47123, token: 't', name: 'PC' } as typeof phone.settings.pc
    phone.settings.feats = { logoTaps: 7, shares: 1 }
    const pc = merge(emptyData(), toWire(phone), 1, { preferRemote: true })
    const a = evaluate(phone)
    const b = evaluate(pc)
    expect(b.xp).toBe(a.xp)
    expect(b.list.filter((x) => x.reached).length).toBe(a.list.filter((x) => x.reached).length)
  })
})
