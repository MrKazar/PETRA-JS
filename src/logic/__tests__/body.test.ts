import { describe, expect, it } from 'vitest'
import type { AppData, Session } from '../../data/types'
import { emptyData } from '../../data/store'
import { CATALOG } from '../../data/catalog'
import { REGIONS, bestProgramFor, doneWork, levelOf, plannedWork, scaleWork, suggestFor, targetsOf } from '../body'

const set = (phase: 'chauffe' | 'travail' | 'hypertrophie', done = true) => ({ phase, reps: 8, weight: 60, done })

describe('schéma du corps', () => {
  it('muscles principaux et secondaires d’après le catalogue', () => {
    expect(targetsOf({ catalogId: 'dev_couche_barre', name: 'x', group: 'pectoraux' })).toEqual({ primary: ['pec_milieu'], secondary: ['triceps_lat', 'triceps_long', 'delt_ant'] })
    expect(targetsOf({ catalogId: 'dev_incline_barre', name: 'x', group: 'pectoraux' }).primary).toEqual(['pec_haut'])
    expect(targetsOf({ catalogId: 'pompes', name: 'x', group: 'pectoraux' }).secondary).toContain('dentele')
    expect(targetsOf({ catalogId: 'pompes_scapulaires', name: 'x', group: 'pectoraux' }).primary).toEqual(['dentele'])
    expect(targetsOf({ catalogId: 'releves_pointes', name: 'x', group: 'mollets' }).primary).toEqual(['tibial'])
    expect(targetsOf({ catalogId: 'mollets_assis', name: 'x', group: 'mollets' })).toEqual({ primary: ['soleaire'], secondary: ['gastrocnemiens'] })
    expect(targetsOf({ name: 'Tractions pronation', group: 'dos' }).primary).toEqual(['grand_dorsal', 'grand_rond'])
    expect(targetsOf({ name: 'Rowing barre', group: 'dos' }).primary).toEqual(['rhomboides', 'trap_moyen', 'grand_dorsal'])
    expect(targetsOf({ catalogId: 'shrugs_barre', name: 'x', group: 'trapezes' }).primary).toEqual(['trap_sup'])
    expect(targetsOf({ catalogId: 'y_raise_incline', name: 'x', group: 'trapezes' }).primary).toEqual(['trap_inf'])
    expect(targetsOf({ catalogId: 'curl_marteau', name: 'x', group: 'biceps' }).primary).toEqual(['brachial', 'brachio_radial'])
    expect(targetsOf({ catalogId: 'extension_nuque_haltere', name: 'x', group: 'triceps' }).primary).toEqual(['triceps_long'])
    expect(targetsOf({ catalogId: 'squat_barre', name: 'x', group: 'quadriceps' }).primary).toEqual(['droit_femoral', 'vaste_externe', 'vaste_interne'])
    expect(targetsOf({ catalogId: 'face_pull', name: 'x', group: 'epaules' }).primary).toEqual(['delt_post', 'trap_moyen'])
    expect(targetsOf({ name: 'Abducteurs machine', group: 'fessiers' }).primary).toEqual(['moyen_fessier', 'tfl'])
    expect(targetsOf({ catalogId: 'flexion_cou_disque', name: 'x', group: 'trapezes' }).primary).toEqual(['cou'])
    expect(targetsOf({ catalogId: 'dev_couche_barre', name: 'x', group: 'pectoraux' }).primary).not.toContain('cou')
    expect(targetsOf({ catalogId: 'flexion_hanche_poulie', name: 'x', group: 'quadriceps' }).primary).toEqual(['flechisseurs_hanche', 'couturier'])
    expect(targetsOf({ catalogId: 'eversion_cheville_elastique', name: 'x', group: 'mollets' }).primary).toEqual(['fibulaires'])
    expect(targetsOf({ name: 'Élévation latérale poulie', group: 'epaules' }).primary).toEqual(['delt_lat'])
    expect(targetsOf({ name: 'Vélo', group: 'cardio' }).primary).toEqual([])
  })

  it('tous les muscles du schéma ont au moins un exercice qui les cible en principal', () => {
    const hit = new Set(CATALOG.flatMap((e) => targetsOf({ catalogId: e.id, name: e.nom, group: e.groupe_musculaire }).primary))
    expect(REGIONS.filter((r) => !hit.has(r.id)).map((r) => r.id)).toEqual([])
  })

  it('compte les séries faites hors chauffe, moitié en secondaire', () => {
    const s: Session = {
      id: 's', programName: 'p', startedAt: 1000,
      exercises: [{ id: 'e', catalogId: 'dev_couche_barre', name: 'DC', group: 'pectoraux', parCote: false, restSec: 90, sets: [set('chauffe'), set('travail'), set('travail'), set('hypertrophie'), set('travail', false)] }],
    }
    const w = doneWork([s], 0, 2000)
    expect(w.pec_milieu.sets).toBe(3)
    expect(w.triceps_lat.sets).toBe(1.5)
    expect(w.triceps_lat.exercises[0]).toMatchObject({ name: 'DC', sets: 3, primary: false, lastAt: 1000 })
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
    expect(plannedWork(d).triceps_lat.sets).toBe(4.5)
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
    const s = suggestFor('delt_post', d)
    expect(s.program?.id).toBe('pull')
    expect(s.exercises.length).toBeGreaterThanOrEqual(3)
    expect(s.exercises.every((e) => targetsOf({ catalogId: e.id, name: e.nom, group: e.groupe_musculaire }).primary.includes('delt_post'))).toBe(true)
    expect(suggestFor('biceps_femoral', d).program?.id).toBe('legs')
    expect(suggestFor('delt_lat', d).program?.id).toBe('push')
    expect(bestProgramFor('biceps', d.programs)?.id).toBe('pull')
    expect(bestProgramFor('grand_droit', d.programs)?.id).toBe('legs')
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
    expect(w.triceps_lat.sets).toBe(1.5)
    expect([0, 1, 3, 6, 10].map(sessionLevelOf)).toEqual([0, 1, 2, 3, 4])
    const d = emptyData()
    d.weekPlan = { 0: 'x', 3: 'x' }
    d.weekPlanB = { 0: 'x' }
    expect(timesPerWeek(d, 'x')).toBe(2)
    d.settings = { ...d.settings, abWeeks: true }
    expect(timesPerWeek(d, 'x')).toBe(1.5)
  })
})
