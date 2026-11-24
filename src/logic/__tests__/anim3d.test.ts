import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { CATALOG } from '../../data/catalog'
import { ANIM_CUES } from '../../data/anim3d'
import { PLATE } from '../../data/bodyPlate'
import { anatomyOf, MUSCLES_FINE } from '../../data/anatomy'

describe('animations 3D (1.4.0)', () => {
  it('chaque exercice du catalogue a son animation et sa consigne', () => {
    const missing = CATALOG.filter((e) => !ANIM_CUES[e.id]?.trim()).map((e) => e.id)
    expect(missing).toEqual([])
  })

  it('le moteur généré se charge et connaît toutes les scènes', () => {
    const g = globalThis as unknown as { window?: unknown }
    const had = 'window' in g
    if (!had) g.window = { matchMedia: () => ({ matches: false }), devicePixelRatio: 1 }
    try {
      const code = readFileSync(new URL('../../../public/3d/moteur.js', import.meta.url), 'utf8')
      const ex = Object.fromEntries(CATALOG.map((e) => [e.id, anatomyOf({ catalogId: e.id, name: '', group: '' })]))
      const labels = Object.fromEntries(MUSCLES_FINE.map((m) => [m.id, m.label]))
      new Function('window', code)(g.window)
      const factory = (g.window as { PETRA3D_FACTORY: (t: unknown, p: unknown) => { has: (id: string) => boolean } }).PETRA3D_FACTORY
      const engine = factory(THREE, { head: PLATE.head, front: PLATE.views.front, back: PLATE.views.back, ex, labels })
      expect(CATALOG.filter((e) => !engine.has(e.id)).map((e) => e.id)).toEqual([])
    } finally {
      if (!had) delete g.window
    }
  })

  it('les pièces des muscles de la planche sont précalculées dans le moteur (1.4.0.3)', () => {
    const code = readFileSync(new URL('../../../public/3d/moteur.js', import.meta.url), 'utf8')
    const m = code.match(/const PRE = JSON\.parse\((".*?")\), calc = musclePiece/)
    expect(m).toBeTruthy()
    const table = JSON.parse(JSON.parse(m![1])) as Record<string, unknown>
    const paths = (['front', 'back'] as const).flatMap((v) => PLATE.views[v].muscles.flatMap((x) => x.paths))
    expect(paths.filter((d) => !table[d])).toEqual([])
  })
})

describe('écran d’attente (1.4.0.1)', () => {
  it('prépare la séance en cours en priorité, sinon le début des programmes', async () => {
    const { idsToWarm } = await import('../../ui/Splash')
    const { emptyData } = await import('../../data/store')
    const d = emptyData()
    const ex = (catalogId: string) => ({ id: catalogId, catalogId, name: catalogId, group: 'pectoraux', parCote: false, restSec: 60, sets: [] })
    d.programs = [{ id: 'p', name: 'Push', createdAt: 0, exercises: ['dev_couche_barre', 'pompes', 'dips_pecs', 'pec_deck'].map(ex) }]
    expect(idsToWarm(d)).toEqual(['dev_couche_barre', 'pompes', 'dips_pecs'])
    d.active = { id: 's', programName: 'Push', startedAt: 0, exercises: [ex('squat_barre')] }
    expect(idsToWarm(d)).toEqual(['squat_barre'])
  })
})
