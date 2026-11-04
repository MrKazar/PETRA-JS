import { describe, expect, it } from 'vitest'
import type { AppData, Session } from '../../data/types'
import { emptyData } from '../../data/store'
import { doneWork, levelOf, plannedWork, scaleWork, targetsOf } from '../body'

const set = (phase: 'chauffe' | 'travail' | 'hypertrophie', done = true) => ({ phase, reps: 8, weight: 60, done })

describe('schéma du corps', () => {
  it('muscle principal et secondaires d’après le catalogue', () => {
    expect(targetsOf({ catalogId: 'dev_couche_barre', name: 'x', group: 'pectoraux' })).toEqual({ primary: 'pectoraux', secondary: ['triceps', 'epaule_avant'] })
    expect(targetsOf({ name: 'Élévation latérale poulie', group: 'epaules' }).primary).toBe('epaule_cote')
    expect(targetsOf({ name: 'Oiseau poulie', group: 'epaules' }).primary).toBe('epaule_arriere')
    expect(targetsOf({ name: 'Vélo', group: 'cardio' }).primary).toBeUndefined()
  })

  it('compte les séries faites hors chauffe, moitié en secondaire', () => {
    const s: Session = {
      id: 's', programName: 'p', startedAt: 1000,
      exercises: [{ id: 'e', catalogId: 'dev_couche_barre', name: 'DC', group: 'pectoraux', parCote: false, restSec: 90, sets: [set('chauffe'), set('travail'), set('travail'), set('hypertrophie'), set('travail', false)] }],
    }
    const w = doneWork([s], 0, 2000)
    expect(w.pectoraux.sets).toBe(3)
    expect(w.triceps.sets).toBe(1.5)
    expect(w.triceps.exercises[0]).toMatchObject({ name: 'DC', sets: 3, primary: false, lastAt: 1000 })
    expect(doneWork([s], 2000, 3000).pectoraux.sets).toBe(0)
    expect(scaleWork(w, 3).pectoraux.sets).toBe(1)
  })

  it('semaine type du planning, moyenne A/B, supersets comptés pour chaque exercice', () => {
    const d: AppData = emptyData()
    d.programs = [{
      id: 'p', name: 'P', createdAt: 0,
      exercises: [{ id: 'ss', name: 'SS', group: 'superset', parCote: false, restSec: 60, parts: [{ name: 'Curl', group: 'biceps', parCote: false }, { name: 'Extension', group: 'triceps', parCote: false }], sets: [{ phase: 'serie' }, { phase: 'serie' }, { phase: 'serie' }] }],
    }]
    d.weekPlan = { 0: 'p', 2: 'p' }
    expect(plannedWork(d).biceps.sets).toBe(6)
    d.settings = { ...d.settings, abWeeks: true }
    d.weekPlanB = { 0: 'p' }
    expect(plannedWork(d).triceps.sets).toBe(4.5)
  })

  it('niveaux', () => {
    expect([0, 2, 6, 15, 25].map(levelOf)).toEqual([0, 1, 2, 3, 4])
  })
})
