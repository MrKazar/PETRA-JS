import { describe, expect, it } from 'vitest'
import { emptyData } from '../../data/store'
import type { AppData, Program, Session } from '../../data/types'
import { decodePairing, encodePairing, isPairingCode, merge, revOf, toWire, track } from '../sync'

const prog = (id: string, name = id): Program => ({ id, name, createdAt: 0, exercises: [] })
const sess = (id: string, startedAt: number): Session => ({ id, programName: 'X', startedAt, endedAt: startedAt + 1, exercises: [] })

/** Applique une modification en notant la date, comme le fait le store. */
function edit(d: AppData, fn: (d: AppData) => AppData, now: number): AppData {
  const next = fn(d)
  return { ...next, sync: track(d, next, now) }
}

describe('synchro PC : suivi des modifications', () => {
  it('date les éléments ajoutés ou modifiés, et note les suppressions', () => {
    let d = emptyData()
    d = edit(d, (x) => ({ ...x, programs: [prog('a'), prog('b')] }), 10)
    expect(d.sync?.stamps).toMatchObject({ 'p:a': 10, 'p:b': 10 })
    d = edit(d, (x) => ({ ...x, programs: [x.programs[0], { ...x.programs[1], name: 'B2' }] }), 20)
    expect(d.sync?.stamps['p:a']).toBe(10)
    expect(d.sync?.stamps['p:b']).toBe(20)
    d = edit(d, (x) => ({ ...x, programs: [x.programs[1]] }), 30)
    expect(d.sync?.gone['p:a']).toBe(30)
    expect(d.sync?.stamps['p:a']).toBeUndefined()
  })

  it('ne touche à rien quand seule la séance en cours change', () => {
    const d = edit(emptyData(), (x) => ({ ...x, programs: [prog('a')] }), 10)
    const meta = d.sync
    const d2 = edit(d, (x) => ({ ...x, active: { ...sess('z', 1), rest: undefined } as AppData['active'] }), 99)
    expect(d2.sync).toBe(meta)
  })

  it('suit les réglages communs mais pas ceux propres à l’appareil', () => {
    const d = edit(emptyData(), (x) => ({ ...x, settings: { ...x.settings, name: 'Léo', keepAwake: false } }), 5)
    expect(d.sync?.stamps['set:name']).toBe(5)
    expect(d.sync?.stamps['set:keepAwake']).toBeUndefined()
  })
})

describe('synchro PC : fusion', () => {
  it('première synchro : le PC vide reçoit tout le téléphone', () => {
    const phone = { ...emptyData(), programs: [prog('a')], sessions: [sess('s1', 100)] }
    const pc = emptyData()
    const m = merge(pc, phone, 1000)
    expect(m.programs.map((p) => p.id)).toEqual(['a'])
    expect(m.sessions.map((s) => s.id)).toEqual(['s1'])
  })

  it('première synchro : le planning et le prénom du téléphone, jamais modifiés depuis, arrivent sur le PC', () => {
    // Données d'avant la synchro : rien n'est daté.
    const phone = { ...emptyData(), weekPlan: { 0: 'p1' }, weekPlanB: { 2: 'p2' }, settings: { ...emptyData().settings, name: 'Léo', weekAAnchor: '2026-10-05', abWeeks: true } }
    const pc = { ...emptyData(), settings: { ...emptyData().settings, weekAAnchor: '2026-11-02' } }
    const onPc = merge(pc, phone, 1000, { preferRemote: true })
    expect(onPc.weekPlan).toEqual({ 0: 'p1' })
    expect(onPc.weekPlanB).toEqual({ 2: 'p2' })
    expect(onPc.settings).toMatchObject({ name: 'Léo', weekAAnchor: '2026-10-05', abWeeks: true })
    // Le téléphone garde le sien en recevant la réponse.
    expect(merge(phone, onPc, 1000).weekPlan).toEqual({ 0: 'p1' })
  })

  it('la version modifiée le plus récemment gagne, dans les deux sens', () => {
    const base = edit(emptyData(), (x) => ({ ...x, programs: [prog('a', 'A'), prog('b', 'B')] }), 10)
    const phone = edit(base, (x) => ({ ...x, programs: [{ ...x.programs[0], name: 'A tel' }, x.programs[1]] }), 20)
    const pc = edit(base, (x) => ({ ...x, programs: [x.programs[0], { ...x.programs[1], name: 'B pc' }] }), 30)
    const onPc = merge(pc, phone, 1000)
    const onPhone = merge(phone, pc, 1000)
    expect(onPc.programs.map((p) => p.name)).toEqual(['A tel', 'B pc'])
    expect(onPhone.programs.map((p) => p.name)).toEqual(['A tel', 'B pc'])
    expect(onPc.sync).toEqual(onPhone.sync)
  })

  it('après une synchro, le téléphone et le PC ont la même révision', () => {
    const base = edit(emptyData(), (x) => ({ ...x, programs: [prog('a'), prog('b')] }), 10)
    const phone = edit(base, (x) => ({ ...x, programs: [x.programs[0]] }), 40)
    const pc = edit(base, (x) => ({ ...x, settings: { ...x.settings, theme: 'pompier' } }), 30)
    const onPc = merge(pc, phone, 1000, { preferRemote: true })
    const onPhone = merge(phone, toWire(onPc), 1000)
    expect(revOf(onPc)).toBe(40)
    expect(revOf(onPhone)).toBe(revOf(onPc))
    expect(onPhone.settings.theme).toBe('pompier')
    expect(revOf(edit(onPc, (x) => ({ ...x, settings: { ...x.settings, theme: 'neon' } }), 50))).toBe(50)
  })

  it('une suppression se propage, sauf si l’autre côté a modifié après', () => {
    const base = edit(emptyData(), (x) => ({ ...x, programs: [prog('a'), prog('b')] }), 10)
    const phone = edit(base, (x) => ({ ...x, programs: [] }), 20)
    const pc = edit(base, (x) => ({ ...x, programs: [x.programs[0], { ...x.programs[1], name: 'B modifié' }] }), 30)
    const m = merge(pc, phone, 1000)
    expect(m.programs.map((p) => p.id)).toEqual(['b'])
    expect(m.sync?.gone['p:a']).toBe(20)
    // et la suppression ne revient pas à la synchro suivante
    expect(merge(phone, m, 1000).programs.map((p) => p.id)).toEqual(['b'])
  })

  it('séances des deux côtés : réunies et triées de la plus récente à la plus ancienne', () => {
    const phone = edit(emptyData(), (x) => ({ ...x, sessions: [sess('s3', 300), sess('s1', 100)] }), 10)
    const pc = edit(emptyData(), (x) => ({ ...x, sessions: [sess('s2', 200)] }), 10)
    expect(merge(phone, pc, 1000).sessions.map((s) => s.id)).toEqual(['s3', 's2', 's1'])
  })

  it('le suivi des routines se fusionne jour par jour', () => {
    const phone = edit(emptyData(), (x) => ({ ...x, routineLog: { '2026-11-01': { r1: 'fait' } } }), 10)
    const pc = edit(emptyData(), (x) => ({ ...x, routineLog: { '2026-11-02': { r1: 'saute' } } }), 10)
    expect(Object.keys(merge(phone, pc, 1000).routineLog).sort()).toEqual(['2026-11-01', '2026-11-02'])
  })

  it('garde la séance en cours et les réglages propres à l’appareil local', () => {
    const phone = { ...emptyData(), active: { ...sess('live', 1) } as AppData['active'], settings: { ...emptyData().settings, keepAwake: true } }
    const pc = edit(emptyData(), (x) => ({ ...x, settings: { ...x.settings, keepAwake: false, name: 'PC' } }), 50)
    const m = merge(phone, pc, 1000)
    expect(m.active?.id).toBe('live')
    expect(m.settings.keepAwake).toBe(true)
    expect(m.settings.name).toBe('PC')
  })

  it('n’envoie ni la séance en cours ni l’association au PC', () => {
    const d = { ...emptyData(), active: sess('live', 1) as AppData['active'], settings: { ...emptyData().settings, pc: { hosts: ['1.2.3.4'], port: 1, token: 'secret', name: 'PC' } } }
    const w = toWire(d)
    expect(w.active).toBeUndefined()
    expect(w.settings.pc).toBeUndefined()
  })
})

describe('synchro PC : QR code d’association', () => {
  it('encode et relit les adresses, le port, le jeton et le nom (accents compris)', () => {
    const code = encodePairing({ hosts: ['192.168.1.20', '10.0.0.5'], port: 47123, token: 'abc', name: 'PC de Léo' })
    expect(isPairingCode(code)).toBe(true)
    expect(decodePairing(code)).toEqual({ hosts: ['192.168.1.20', '10.0.0.5'], port: 47123, token: 'abc', name: 'PC de Léo' })
  })

  it('refuse un autre code', () => {
    expect(isPairingCode('PETRA1:xyz')).toBe(false)
    expect(() => decodePairing('PETRA1:xyz')).toThrow()
    expect(() => decodePairing('PETRA-PC:@@@')).toThrow()
  })
})
