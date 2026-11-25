import { describe, expect, it } from 'vitest'
import { CATALOG } from '../../data/catalog'
import { EQUIPMENT, PRESETS, canDo, missingFor, needsOf, ownedSet } from '../equipment'

describe('matériel', () => {
  it('ne cite que des exercices du catalogue, sans doublon d’identifiant', () => {
    const ids = new Set(CATALOG.map((e) => e.id))
    for (const x of EQUIPMENT) for (const id of x.ids) expect(ids.has(id), `${x.label} → ${id}`).toBe(true)
    expect(new Set(EQUIPMENT.map((x) => x.id)).size).toBe(EQUIPMENT.length)
  })

  it('poids du corps : seuls les exercices sans matériel (ou mur / marche)', () => {
    const owned = ownedSet(PRESETS.find((p) => p.id === 'rien')!.items)
    expect(canDo('pompes', owned)).toBe(true)
    expect(canDo('dev_couche_barre', owned)).toBe(false)
    expect(missingFor('dev_couche_barre', owned).map((x) => x.id)).toEqual(expect.arrayContaining(['barre_olympique_disques', 'banc_plat']))
  })

  it('une paire d’haltères vaut aussi un haltère seul, un banc inclinable un banc plat', () => {
    const owned = ownedSet(['halteres', 'banc_inclinable'])
    expect(owned.has('haltere_seul')).toBe(true)
    expect(canDo('rowing_haltere', owned)).toBe(true)
    expect(canDo('dev_couche_halteres', owned)).toBe(true)
  })

  it('salle complète : tout le catalogue est faisable', () => {
    const owned = ownedSet(PRESETS.find((p) => p.id === 'salle')!.items)
    expect(CATALOG.every((e) => canDo(e.id, owned))).toBe(true)
    expect(needsOf('dev_couche_barre').length).toBeGreaterThan(0)
  })
})
