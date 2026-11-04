import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { MIGRATIONS, emptyData, migrate, normalize, parseStored } from '../../data/store'
import { DATA_VERSION, type AppData, type Program } from '../../data/types'
import { newestFirst, parseBackup } from '../backup'
import { merge, toWire, track, versionGap } from '../sync'

const require = createRequire(import.meta.url)
const pcBackups = require('../../../desktop/backups.cjs') as {
  KEEP: number
  copyName(at?: Date): string
  toPrune(names: string[], keep?: number): string[]
  writeCopy(dir: string, json: string, at?: Date): void
  readCopies(dir: string): string[]
}

describe('lecture des données enregistrées', () => {
  it('part à vide quand rien n’est enregistré', () => {
    expect(parseStored(null)).toEqual(emptyData())
  })

  it('relit des données valides', () => {
    const d = { ...emptyData(), programs: [{ id: 'a', name: 'A', createdAt: 0, exercises: [] }] }
    expect(parseStored(JSON.stringify(d))?.programs[0].name).toBe('A')
  })

  it('signale des données abîmées au lieu de repartir à vide en silence', () => {
    expect(parseStored('{"programs":[{"id"')).toBeUndefined()
    expect(parseStored('null')).toBeUndefined()
    expect(parseStored('{"sessions":[]}')).toBeUndefined()
  })
})

describe('restauration d’une sauvegarde', () => {
  it('accepte une sauvegarde complète', () => {
    expect(parseBackup(JSON.stringify(emptyData())).programs).toEqual([])
  })

  it('refuse un fichier qui n’a que l’air d’une sauvegarde', () => {
    expect(() => parseBackup('{"programs":[],"sessions":{}}')).toThrow()
    expect(() => parseBackup('{"programs":[],"settings":null}')).toThrow()
    expect(() => parseBackup('{"programs":[{"id":"a"}]}')).toThrow()
    expect(() => parseBackup('{"programs":[],"weekPlan":[]}')).toThrow()
  })

  it('cherche les sauvegardes de la plus récente à la plus ancienne', () => {
    expect(newestFirst(['petra-2026-11-01-0900.json', 'autre.txt', 'petra-2026-11-03-101500.json', 'petra-2026-10-30-2000.json'])).toEqual([
      'petra-2026-11-03-101500.json',
      'petra-2026-11-01-0900.json',
      'petra-2026-10-30-2000.json',
    ])
  })
})

describe('copies de sécurité de PCTRA', () => {
  it('garde les 5 dernières copies', () => {
    const names = Array.from({ length: 8 }, (_, i) => pcBackups.copyName(new Date(2026, 10, 1 + i, 12)))
    const pruned = pcBackups.toPrune([...names, 'petra-pc.json', 'notes.txt'])
    expect(pruned).toEqual(names.slice(0, 3).reverse())
  })

  it('écrit, élague et relit les copies, la plus récente d’abord', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pctra-'))
    try {
      fs.writeFileSync(path.join(dir, 'petra-pc.json'), '"ancien"')
      for (let i = 0; i < 7; i++) pcBackups.writeCopy(dir, JSON.stringify(i), new Date(2026, 10, 4, 10, 0, i))
      const files = fs.readdirSync(dir).filter((n) => n !== 'petra-pc.json')
      expect(files).toHaveLength(pcBackups.KEEP)
      expect(pcBackups.readCopies(dir)).toEqual(['6', '5', '4', '3', '2', '"ancien"'])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('ne plante pas quand le dossier n’existe pas', () => {
    expect(pcBackups.readCopies(path.join(os.tmpdir(), 'pctra-absent-' + Date.now()))).toEqual([])
  })
})

describe('synchro entre deux versions différentes', () => {
  const prog = (id: string): Program => ({ id, name: id, createdAt: 0, exercises: [] })

  it('une ancienne version qui reçoit des données plus récentes ne perd rien de ce qu’elle connaît', () => {
    // Le téléphone a une version plus récente : champs inconnus de l'ancienne version sur un programme et à la racine.
    const base = emptyData()
    const newer = { ...base, programs: [{ ...prog('a'), futurChamp: { x: 1 } } as Program], pesees: [{ id: 'w1', kg: 80 }] } as unknown as AppData
    const remote = { ...newer, sync: track(base, newer, 10) }
    const out = merge(emptyData(), remote, 20)
    expect(out.programs.map((p) => p.id)).toEqual(['a'])
    // Les champs inconnus d'un élément connu voyagent avec lui.
    expect((out.programs[0] as unknown as { futurChamp: unknown }).futurChamp).toEqual({ x: 1 })
    expect(out.sessions).toEqual([])
    expect(out.settings).toEqual(base.settings)
  })

  it('une version plus récente qui reçoit des données anciennes (sans suivi) les fusionne', () => {
    const local = { ...emptyData(), programs: [prog('a')] }
    const old = { ...emptyData(), programs: [prog('b')] } as AppData
    delete (old as Partial<AppData>).sync
    const out = merge({ ...local, sync: track(emptyData(), local, 5) }, old, 6)
    expect(out.programs.map((p) => p.id).sort()).toEqual(['a', 'b'])
  })
})

describe('version du format des données', () => {
  it('fait passer des données d’avant la 1.3.11 (sans version) à la version actuelle', () => {
    const old = { programs: [{ id: 'a', name: 'A', createdAt: 0, exercises: [] }], sessions: [] }
    const d = normalize(old as unknown as Partial<AppData>)
    expect(d.version).toBe(DATA_VERSION)
    expect(d.programs[0].name).toBe('A')
  })

  it('a une migration pour chaque version jusqu’à la version actuelle', () => {
    for (let v = 1; v < DATA_VERSION; v++) expect(MIGRATIONS[v]).toBeTypeOf('function')
    expect(migrate({ version: 1 } as never).version).toBe(DATA_VERSION)
  })

  it('garde la version et les champs de données plus récentes', () => {
    const d = normalize({ ...emptyData(), version: DATA_VERSION + 1, futur: [1] } as unknown as Partial<AppData>)
    expect(d.version).toBe(DATA_VERSION + 1)
    expect((d as unknown as { futur: number[] }).futur).toEqual([1])
  })

  it('compare la version de l’autre appareil', () => {
    expect(versionGap({ version: DATA_VERSION })).toBe('same')
    expect(versionGap({})).toBe(DATA_VERSION > 1 ? 'older' : 'same')
    expect(versionGap({ version: DATA_VERSION + 1 })).toBe('newer')
    expect(versionGap({ version: 'x' })).toBe(DATA_VERSION > 1 ? 'older' : 'same')
  })

  it('la version voyage avec la synchro', () => {
    expect(toWire(emptyData()).version).toBe(DATA_VERSION)
  })
})
