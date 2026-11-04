import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATALOG } from '../../data/catalog'
import { EXECUTION_SOURCE, executionImages } from '../../data/execution'

const PUBLIC = resolve(__dirname, '../../../public')

describe('démonstrations d’exécution', () => {
  it('ne relie que des exercices du catalogue', () => {
    const ids = new Set(CATALOG.map((e) => e.id))
    const unknown = Object.keys(EXECUTION_SOURCE).filter((id) => !ids.has(id))
    expect(unknown).toEqual([])
  })

  it('livre les deux images de chaque démonstration', () => {
    const missing = Object.keys(EXECUTION_SOURCE)
      .flatMap((id) => executionImages(id)!)
      .filter((url) => !existsSync(resolve(PUBLIC, url.replace(/^\//, ''))))
    expect(missing).toEqual([])
  })

  it('couvre la majorité du catalogue', () => {
    expect(Object.keys(EXECUTION_SOURCE).length).toBeGreaterThan(200)
  })

  it('ne renvoie rien pour un exercice sans démonstration ou perso', () => {
    expect(executionImages(undefined)).toBeUndefined()
    expect(executionImages('exercice_perso')).toBeUndefined()
    expect(executionImages('burpees')).toBeUndefined()
  })
})
