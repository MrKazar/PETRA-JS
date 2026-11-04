import { describe, expect, it } from 'vitest'
import type { AppData, Session } from '../../data/types'
import { emptyData } from '../../data/store'
import { bestProgramFor, doneWork, levelOf, plannedWork, scaleWork, suggestFor, targetsOf } from '../body'

const set = (phase: 'chauffe' | 'travail' | 'hypertrophie', done = true) => ({ phase, reps: 8, weight: 60, done })

describe('schéma du corps', () => {
  it('muscle principal et secondaires d’après le catalogue', () => {
    expect(targetsOf({ catalogId: 'dev_couche_barre', name: 'x', group: 'pectoraux' })).toEqual({ primary: 'pec_milieu', secondary: ['triceps', 'epaule_avant'] })
    expect(targetsOf({ catalogId: 'dev_incline_barre', name: 'x', group: 'pectoraux' }).primary).toBe('pec_haut')
    expect(targetsOf({ name: 'Tractions pronation', group: 'dos' }).primary).toBe('dos_largeur')
    expect(targetsOf({ name: 'Rowing barre', group: 'dos' }).primary).toBe('dos_epaisseur')
    expect(targetsOf({ name: 'Abducteurs machine', group: 'fessiers' }).primary).toBe('moyen_fessier')
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
    expect(w.pec_milieu.sets).toBe(3)
    expect(w.triceps.sets).toBe(1.5)
    expect(w.triceps.exercises[0]).toMatchObject({ name: 'DC', sets: 3, primary: false, lastAt: 1000 })
    expect(doneWork([s], 2000, 3000).pec_milieu.sets).toBe(0)
    expect(scaleWork(w, 3).pec_milieu.sets).toBe(1)
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

  it('propose des exercices et la séance de la même famille', () => {
    const ex = (id: string, name: string, group: string) => ({ id, name, group, parCote: false, restSec: 90, sets: [{ phase: 'travail' as const }] })
    const d: AppData = emptyData()
    d.programs = [
      { id: 'push', name: 'Push', createdAt: 0, exercises: [ex('a', 'Développé couché', 'pectoraux'), ex('b', 'Extension poulie', 'triceps')] },
      { id: 'pull', name: 'Pull', createdAt: 0, exercises: [ex('c', 'Tractions', 'dos'), ex('d', 'Curl barre', 'biceps')] },
      { id: 'legs', name: 'Jambes', createdAt: 0, exercises: [ex('e', 'Squat', 'quadriceps')] },
    ]
    d.weekPlan = { 0: 'push', 2: 'pull', 4: 'legs' }
    const s = suggestFor('epaule_arriere', d)
    expect(s.program?.id).toBe('pull')
    expect(s.exercises.length).toBe(5)
    expect(s.exercises.every((e) => targetsOf({ catalogId: e.id, name: e.nom, group: e.groupe_musculaire }).primary === 'epaule_arriere')).toBe(true)
    expect(suggestFor('ischio_jambiers', d).program?.id).toBe('legs')
    expect(suggestFor('epaule_cote', d).program?.id).toBe('push')
    expect(bestProgramFor('biceps', d.programs)?.id).toBe('pull')
    expect(bestProgramFor('abdominaux', d.programs)?.id).toBe('legs')
  })

  it('niveaux', () => {
    expect([0, 2, 6, 15, 25].map(levelOf)).toEqual([0, 1, 2, 3, 4])
  })
})

import { programWork, sessionLevelOf, timesPerWeek } from '../body'

describe('schéma à côté d’un programme', () => {
  it('séries de la séance et fréquence au planning', () => {
    const p = { exercises: [{ id: 'a', catalogId: 'dev_couche_barre', name: 'DC', group: 'pectoraux', parCote: false, restSec: 90, sets: [{ phase: 'chauffe' as const }, { phase: 'travail' as const }, { phase: 'travail' as const }, { phase: 'hypertrophie' as const }] }] }
    const w = programWork(p)
    expect(w.pec_milieu.sets).toBe(3)
    expect(w.triceps.sets).toBe(1.5)
    expect([0, 1, 3, 6, 10].map(sessionLevelOf)).toEqual([0, 1, 2, 3, 4])
    const d = emptyData()
    d.weekPlan = { 0: 'x', 3: 'x' }
    d.weekPlanB = { 0: 'x' }
    expect(timesPerWeek(d, 'x')).toBe(2)
    d.settings = { ...d.settings, abWeeks: true }
    expect(timesPerWeek(d, 'x')).toBe(1.5)
  })
})
