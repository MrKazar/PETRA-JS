import type { AppData, Session } from '../data/types'
import { findCatalog, isCardio } from '../data/catalog'
import { finishersOf } from '../data/finishers'
import { anatomyOf } from '../data/anatomy'
import { REGIONS, levelOf, weekStart, type RegionId } from './body'
import { programFor, routinesFor } from './planner'
import { e1rm, liftsOf } from './stats'
import { exerciseKey } from './progress'
import { inPlannedOrder } from './session'
import { addDays, dateKey, parseKey } from './util'
import { themesShown } from '../ui/theme'

/**
 * Succès et XP (PETRA 1.3.13). Tout se calcule à partir de l'historique déjà enregistré : les
 * succès sont rétroactifs. Seuls quelques secrets lisent des compteurs locaux (settings.feats).
 * Garde-fous : aucune série de jours qui punit le repos, rien qui récompense le volume brut en XP.
 */

export type Family =
  | 'assiduite'
  | 'regularite'
  | 'volume'
  | 'records'
  | 'clubs'
  | 'pdc'
  | 'cardio'
  | 'explorateur'
  | 'corps'
  | 'finishers'
  | 'outils'
  | 'moments'
  | 'secrets'

export const FAMILIES: { id: Family; label: string }[] = [
  { id: 'assiduite', label: 'Assiduité' },
  { id: 'regularite', label: 'Régularité' },
  { id: 'volume', label: 'Volume' },
  { id: 'records', label: 'Records' },
  { id: 'clubs', label: 'Clubs de force' },
  { id: 'pdc', label: 'Poids du corps' },
  { id: 'cardio', label: 'Cardio et minuteur' },
  { id: 'explorateur', label: 'Explorateur' },
  { id: 'corps', label: 'Carte du corps' },
  { id: 'finishers', label: 'Finishers et supersets' },
  { id: 'moments', label: 'Moments' },
  { id: 'outils', label: 'Outils et routines' },
  { id: 'secrets', label: 'Secrets' },
]

export type Metal = 'bronze' | 'argent' | 'or' | 'platine'
export const METAL_XP: Record<Metal, number> = { bronze: 50, argent: 100, or: 200, platine: 500 }
export const SECRET_XP = 150
export const METAL_LABEL: Record<Metal, string> = { bronze: 'Bronze', argent: 'Argent', or: 'Or', platine: 'Platine' }

export interface AchievementDef {
  id: string
  family: Family
  name: string
  /** Condition, en clair. */
  desc: string
  /** Indice affiché tant qu'un secret n'est pas trouvé. */
  hint?: string
  /** Paliers croissants de `value`. */
  tiers: number[]
  /** Libellé d'un palier (unités, équivalences). */
  label?: (v: number) => string
  /** Icône du centre de la médaille. */
  icon: Icon
}

export type Icon = 'shield' | 'calendar' | 'weight' | 'trophy' | 'fist' | 'body' | 'heart' | 'compass' | 'flame' | 'clock' | 'gear' | 'helmet' | 'star'

export interface Achievement {
  def: AchievementDef
  value: number
  /** Nombre de paliers atteints (0 = verrouillé). */
  reached: number
  /** Prochain seuil, absent quand tout est atteint. */
  next?: number
}

/* ---------- Faits tirés de l'historique ---------- */

const DAY = 86400000
const kg = (v: number) => (v >= 1000 ? `${(Math.floor(v / 100) / 10).toLocaleString('fr-FR')} t` : `${Math.round(v)} kg`)
const TONNAGE_LABEL: Record<number, string> = { 1000: '1 t · une voiture', 6000: '6 t · un éléphant', 12000: '12 t · un bus', 150000: '150 t · une baleine bleue', 575000: '575 t · un A380', 7300000: '7 300 t · la tour Eiffel' }

const BENCH = ['dev_couche_barre']
const SQUAT = ['squat_barre', 'squat_pause']
const DEADLIFT = ['souleve_terre', 'souleve_terre_sumo', 'souleve_terre_trap_bar']
const OHP = ['dev_militaire_barre']
const PULLUPS = ['traction_pronation', 'traction_supination', 'traction_neutre', 'traction_large']
const PUSHUPS = ['pompes', 'pompes_larges', 'pompes_serrees']
const DIPS = ['dips_pecs', 'dips_triceps']
const PLANK = ['planche', 'planche_rkc']
const BURPEES = ['burpees']

const PUSH = new Set(['pectoraux', 'epaules', 'triceps', 'deltoides_anterieurs'])
const PULL = new Set(['dos', 'biceps', 'trapezes'])

/** Zones du schéma du corps (le cou, rarement travaillé à part, n'est pas exigé). */
const ZONES = [...new Set(REGIONS.map((r) => r.zone))].filter((z) => z !== 'Cou')

export interface Facts {
  sessions: Session[]
  /** Séances comptées pour l'XP (une par jour). */
  xpSessions: number
  perfect: number
  /** Séances faites pile dans l'ordre du programme. */
  inOrder: number
  express: number
  hours: number
  weeksHeld: number
  monthsHeld: number
  comebacks: number
  monthStreak: number
  tonnage: number
  sets: number
  reps: number
  bestSessionTonnage: number
  records: number
  bestRecordsInSession: number
  loadIncreases: number
  bestProgressPct: number
  best1RM: Record<string, number>
  bestReps: Record<string, number>
  bestSec: Record<string, number>
  cardioMin: number
  timerMin: number
  catalogIds: number
  kinds: number
  zonesWorked: number
  fullWeeks: number
  specialists: number
  balanced: number
  finishers: number
  finisherTypes: number
  finisherIdsDone: number
  finisherTotal: number
  finisherRun: number
  supersetSessions: number
  circuit: number
  routineDays: number
  early: number
  late: number
  weekend: number
  monthsOfYear: number
  /** Secrets */
  dates: Set<string>
  monthDays: Set<string>
  friday13: boolean
  fullMoon: boolean
  night: boolean
  mirror: boolean
  anniversary: boolean
  hundredTen: boolean
  thermopyles: boolean
  perfectRun: number
  phoenix: boolean
  dayAfterRecord: boolean
}

const hourOf = (t: number) => new Date(t).getHours()

/** Âge de la lune en jours (0 = nouvelle lune, ~14,8 = pleine lune). */
export function moonAge(t: number): number {
  const synodic = 29.530588853
  const ref = Date.UTC(2000, 0, 6, 18, 14)
  const age = ((t - ref) / DAY) % synodic
  return age < 0 ? age + synodic : age
}

const kindOf = (catalogId?: string): string | undefined => {
  const c = findCatalog(catalogId)
  if (!c) return undefined
  if (c.type === 'cardio' || c.cardio) return 'cardio'
  if (!c.charge) return 'pdc'
  if (['machine', 'poulie', 'smith'].includes(c.equipement)) return 'machine'
  return 'libre'
}

/** Séries prévues d'une séance terminée (enregistrées depuis la 1.3.13, sinon le programme actuel). */
function plannedOf(s: Session, data: Pick<AppData, 'programs'>): number | undefined {
  if (s.planned != null) return s.planned
  const p = data.programs.find((x) => x.id === s.programId)
  return p ? p.exercises.reduce((n, e) => n + e.sets.length, 0) : undefined
}

const doneSets = (s: Session) => s.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0)

export function isPerfect(s: Session, data: Pick<AppData, 'programs'>): boolean {
  const planned = plannedOf(s, data)
  return planned != null && planned > 0 && doneSets(s) >= planned
}

export function factsOf(data: AppData, now = Date.now()): Facts {
  const sessions = [...data.sessions].filter((s) => s.endedAt).sort((a, b) => a.startedAt - b.startedAt)
  const f: Facts = {
    sessions, xpSessions: 0, perfect: 0, inOrder: 0, express: 0, hours: 0, weeksHeld: 0, monthsHeld: 0, comebacks: 0, monthStreak: 0,
    tonnage: 0, sets: 0, reps: 0, bestSessionTonnage: 0, records: 0, bestRecordsInSession: 0, loadIncreases: 0, bestProgressPct: 0,
    best1RM: {}, bestReps: {}, bestSec: {}, cardioMin: 0, timerMin: 0, catalogIds: 0, kinds: 0, zonesWorked: 0, fullWeeks: 0,
    specialists: 0, balanced: 0, finishers: 0, finisherTypes: 0, finisherIdsDone: 0, finisherTotal: 0, finisherRun: 0,
    supersetSessions: 0, circuit: 0, routineDays: 0, early: 0, late: 0, weekend: 0, monthsOfYear: 0,
    dates: new Set(), monthDays: new Set(), friday13: false, fullMoon: false, night: false, mirror: false, anniversary: false,
    hundredTen: false, thermopyles: false, perfectRun: 0, phoenix: false, dayAfterRecord: false,
  }
  const xpDays = new Set<string>()
  const catalog = new Set<string>()
  const kinds = new Set<string>()
  const zones = new Set<string>()
  const finTypes = new Set<string>()
  const finIds = new Set<string>()
  const months = new Set<number>()
  const recordDays = new Set<string>()
  const first1RM: Record<string, number> = {}
  const lastMax: Record<string, number> = {}
  let finRun = 0
  let perfectRun = 0
  let prevEnd: number | undefined
  const firstDay = sessions[0] ? dateKey(new Date(sessions[0].startedAt)) : undefined

  for (const s of sessions) {
    const day = dateKey(new Date(s.startedAt))
    const date = new Date(s.startedAt)
    if (!xpDays.has(day)) {
      xpDays.add(day)
      f.xpSessions++
    }
    f.dates.add(day)
    f.monthDays.add(day.slice(5))
    months.add(date.getMonth())
    const dur = ((s.endedAt ?? s.startedAt) - s.startedAt) / 1000
    f.hours += dur / 3600
    const perfect = isPerfect(s, data)
    if (perfect) {
      f.perfect++
      if (dur < 35 * 60) f.express++
      if (inPlannedOrder(s, data.programs)) f.inOrder++
      perfectRun++
    } else perfectRun = 0
    f.perfectRun = Math.max(f.perfectRun, perfectRun)
    const gapDays = prevEnd != null ? (s.startedAt - prevEnd) / DAY : 0
    if (prevEnd != null && gapDays >= 14) f.comebacks++
    prevEnd = s.endedAt ?? s.startedAt

    const h = hourOf(s.startedAt)
    if (h >= 4 && h < 7) f.early++
    if (h >= 21) f.late++
    if (h < 4) f.night = true
    const wd = date.getDay()
    if (wd === 0 || wd === 6) f.weekend++
    if (wd === 5 && date.getDate() === 13) f.friday13 = true
    const age = moonAge(s.startedAt)
    if (age > 13.8 && age < 15.8 && h >= 18) f.fullMoon = true
    if (s.endedAt) {
      const e = new Date(s.endedAt)
      if (e.getHours() === e.getMinutes()) f.mirror = true
    }
    if (firstDay && day > firstDay && day.slice(5) === firstDay.slice(5)) f.anniversary = true

    // Volume
    let sessionTonnage = 0
    let sessionReps = 0
    for (const l of liftsOf(s)) {
      sessionTonnage += l.tonnage
      if (l.weight === 100 && l.reps === 10) f.hundredTen = true
    }
    f.tonnage += sessionTonnage
    f.bestSessionTonnage = Math.max(f.bestSessionTonnage, sessionTonnage)

    // Séries, répétitions, records, catalogue
    let sessionRecords = 0
    const sessionMax: Record<string, number> = {}
    for (const e of s.exercises) {
      if (e.parts?.length) {
        if (e.parts.length >= 4 && e.sets.some((x) => x.done)) f.circuit = 1
        for (const p of e.parts) if (p.catalogId) catalog.add(p.catalogId)
      }
      if (e.catalogId) catalog.add(e.catalogId)
      for (const id of e.parts?.length ? e.parts.map((p) => p.catalogId) : [e.catalogId]) {
        const k = kindOf(id)
        if (k) kinds.add(k)
      }
      const cardio = isCardio(e)
      const key = exerciseKey(e)
      for (const set of e.sets) {
        if (!set.done) continue
        f.sets++
        const reps = set.parts?.reduce((n, p) => n + (p.reps ?? 0), 0) ?? set.reps ?? 0
        if (!set.unit) sessionReps += reps
        if (set.durationSec && (cardio || set.phase === 'cardio' || set.phase === 'effort')) f.cardioMin += set.durationSec / 60
        if (set.timer && set.durationSec) f.timerMin += set.durationSec / 60
        if (e.parts?.length || cardio || set.phase === 'chauffe') continue
        if (set.weight && set.reps) {
          sessionMax[key] = Math.max(sessionMax[key] ?? 0, set.weight)
          const rm = e1rm(set.weight, set.reps)
          if (rm == null) continue
          const prev = f.best1RM[key]
          if (prev != null && rm > prev + 1e-9) {
            sessionRecords++
          }
          if (prev == null || rm > prev) f.best1RM[key] = rm
          first1RM[key] ??= rm
        } else if (!set.weight && set.durationSec) {
          const prev = f.bestSec[key]
          if (prev != null && set.durationSec > prev) sessionRecords++
          if (prev == null || set.durationSec > prev) f.bestSec[key] = set.durationSec
        } else if (!set.weight && set.reps) {
          const prev = f.bestReps[key]
          if (prev != null && set.reps > prev) sessionRecords++
          if (prev == null || set.reps > prev) f.bestReps[key] = set.reps
        }
      }
    }
    if (s.exercises.some((e) => e.parts?.length && e.sets.some((x) => x.done))) f.supersetSessions++
    for (const [k, m] of Object.entries(sessionMax)) {
      if (lastMax[k] != null && m > lastMax[k]) f.loadIncreases++
      lastMax[k] = m
    }
    f.reps += sessionReps
    if (sessionReps >= 300) f.thermopyles = true
    f.records += sessionRecords
    f.bestRecordsInSession = Math.max(f.bestRecordsInSession, sessionRecords)
    if (sessionRecords > 0) {
      if (gapDays >= 30) f.phoenix = true
      recordDays.add(day)
    }
    if (recordDays.has(addDays(day, -1))) f.dayAfterRecord = true

    // Finishers
    if (s.finisher) {
      f.finishers++
      finTypes.add(s.finisher.type)
      finIds.add(s.finisher.id)
      finRun++
    } else finRun = 0
    f.finisherRun = Math.max(f.finisherRun, finRun)

    // Zones travaillées
    for (const e of s.exercises) {
      for (const p of e.parts?.length ? e.parts : [e]) {
        const t = anatomyOf(p)
        for (const r of [...t.primary, ...t.secondary]) zones.add(REGIONS.find((x) => x.id === r)!.zone)
      }
    }
  }

  for (const [k, rm] of Object.entries(f.best1RM)) {
    const first = first1RM[k]
    if (first) f.bestProgressPct = Math.max(f.bestProgressPct, ((rm - first) / first) * 100)
  }
  f.catalogIds = catalog.size
  f.kinds = kinds.size
  f.zonesWorked = ZONES.filter((z) => zones.has(z)).length
  f.finisherTypes = finTypes.size
  const list = finishersOf(data)
  f.finisherTotal = list.length
  f.finisherIdsDone = list.filter((x) => finIds.has(x.id)).length
  f.monthsOfYear = months.size

  Object.assign(f, weeklyFacts(data, sessions, now))

  // Routines : jours où toutes les tâches du jour sont faites.
  for (const day of Object.keys(data.routineLog)) {
    const list = routinesFor(data, day)
    if (list.length && list.every((r) => r.status === 'fait')) f.routineDays++
  }
  return f
}

/** Semaines tenues, mois sans faille, carte du corps semaine par semaine, équilibre pousser / tirer. */
function weeklyFacts(data: AppData, sessions: Session[], now: number) {
  const out = { weeksHeld: 0, monthsHeld: 0, monthStreak: 0, fullWeeks: 0, specialists: 0, balanced: 0 }
  if (!sessions.length) return out
  const start = weekStart(sessions[0].startedAt)
  const heldByMonth = new Map<string, number>()
  const levels: Map<RegionId, number[]> = new Map(REGIONS.map((r) => [r.id, []]))
  const pushPull: [number, number][] = []
  for (let w = start; w <= now; w += 7 * DAY) {
    const weekSessions = sessions.filter((s) => s.startedAt >= w && s.startedAt < w + 7 * DAY)
    const monday = dateKey(new Date(w + DAY / 2))
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
    const planned = days.filter((d) => programFor(data, d)).length
    const trained = new Set(weekSessions.map((s) => dateKey(new Date(s.startedAt)))).size
    const ended = w + 7 * DAY <= now
    if (planned > 0 && trained >= planned && (ended || trained >= planned)) {
      out.weeksHeld++
      const m = monday.slice(0, 7)
      heldByMonth.set(m, (heldByMonth.get(m) ?? 0) + 1)
    }
    // Séries pondérées par muscle cette semaine
    const work = new Map<RegionId, number>()
    let push = 0
    let pull = 0
    for (const s of weekSessions) {
      for (const e of s.exercises) {
        const n = e.sets.filter((x) => x.done && x.phase !== 'chauffe' && x.phase !== 'cardio' && x.phase !== 'effort' && x.phase !== 'retour').length
        if (!n) continue
        for (const p of e.parts?.length ? e.parts : [e]) {
          const t = anatomyOf(p)
          for (const r of t.primary) work.set(r, (work.get(r) ?? 0) + n)
          for (const r of t.secondary) work.set(r, (work.get(r) ?? 0) + n / 2)
          if (PUSH.has(p.group)) push += n
          if (PULL.has(p.group)) pull += n
        }
      }
    }
    for (const r of REGIONS) levels.get(r.id)!.push(levelOf(work.get(r.id) ?? 0))
    if (ended || weekSessions.length) {
      const zoneOk = ZONES.every((z) => REGIONS.some((r) => r.zone === z && (work.get(r.id) ?? 0) >= 10))
      if (zoneOk) out.fullWeeks++
    }
    pushPull.push([push, pull])
  }
  out.monthsHeld = [...heldByMonth.values()].filter((n) => n >= 4).length
  for (const r of REGIONS) {
    let run = 0
    let ok = false
    for (const l of levels.get(r.id)!) {
      run = l >= 4 ? run + 1 : 0
      if (run >= 4) ok = true
    }
    if (ok) out.specialists++
  }
  for (let i = 0; i + 4 <= pushPull.length; i += 4) {
    const push = pushPull.slice(i, i + 4).reduce((n, x) => n + x[0], 0)
    const pull = pushPull.slice(i, i + 4).reduce((n, x) => n + x[1], 0)
    if (push > 0 && pull > 0 && Math.abs(push - pull) <= 0.2 * Math.max(push, pull)) out.balanced++
  }
  // Mois d'affilée avec au moins une séance, jusqu'à aujourd'hui (le mois en cours ne casse pas la série).
  const withSession = new Set(sessions.map((s) => dateKey(new Date(s.startedAt)).slice(0, 7)))
  let m = dateKey(new Date(now)).slice(0, 7)
  if (!withSession.has(m)) m = prevMonth(m)
  while (withSession.has(m)) {
    out.monthStreak++
    m = prevMonth(m)
  }
  return out
}

const prevMonth = (m: string) => {
  const d = parseKey(`${m}-01`)
  d.setMonth(d.getMonth() - 1)
  return dateKey(d).slice(0, 7)
}

const best = (map: Record<string, number>, ids: string[]) => Math.max(0, ...ids.map((id) => map[id] ?? 0))
const min = (v: number) => `${v} min`

/* ---------- Définitions ---------- */

interface Def extends AchievementDef {
  value: (f: Facts, d: AppData) => number
}

const D = (family: Family, icon: Icon, id: string, name: string, desc: string, tiers: number[], value: Def['value'], label?: (v: number) => string): Def => ({ family, icon, id, name, desc, tiers, value, label })
const S = (id: string, name: string, desc: string, hint: string, test: (f: Facts, d: AppData) => boolean): Def => ({ family: 'secrets', icon: 'star', id, name, desc, hint, tiers: [1], value: (f, d) => (test(f, d) ? 1 : 0) })
const md = (f: Facts, mmdd: string) => f.monthDays.has(mmdd)

export const DEFS: Def[] = [
  D('assiduite', 'shield', 'en_service', 'En service', 'Séances terminées', [1, 10, 25, 50, 100, 250, 500], (f) => f.sessions.length),
  D('assiduite', 'shield', 'parfaite', 'Séance parfaite', 'Séances où toutes les séries prévues sont validées', [1, 10, 50, 100], (f) => f.perfect),
  D('assiduite', 'shield', 'psychorigide', 'Psychorigide', 'Séances complètes faites pile dans l’ordre du programme', [1, 10, 25], (f) => f.inOrder),
  D('assiduite', 'clock', 'express', 'Séance express', 'Séances complètes en moins de 35 min', [1, 10], (f) => f.express),
  D('assiduite', 'clock', 'heures', 'Heures au front', 'Heures d’entraînement cumulées', [10, 50, 100, 250], (f) => Math.floor(f.hours), (v) => `${v} h`),
  D('regularite', 'calendar', 'semaine_tenue', 'Semaine tenue', 'Semaines où toutes les séances planifiées sont faites', [1, 4, 12, 26, 52], (f) => f.weeksHeld),
  D('regularite', 'calendar', 'mois_sans_faille', 'Mois sans faille', 'Mois avec 4 semaines tenues', [1, 3, 6, 12], (f) => f.monthsHeld),
  D('regularite', 'flame', 'retour_front', 'Retour au front', 'Reprises après 14 jours ou plus sans séance', [1, 3, 5], (f) => f.comebacks),
  D('regularite', 'helmet', 'veteran', 'Vétéran', 'Mois d’affilée avec au moins une séance', [1, 3, 6, 12, 24], (f) => f.monthStreak, (v) => (v >= 12 ? `${v / 12} an${v >= 24 ? 's' : ''}` : `${v} mois`)),
  D('volume', 'weight', 'tonnage', 'Tonnage', 'Total des kilos soulevés (charge × répétitions)', [1000, 6000, 12000, 150000, 575000, 7300000], (f) => Math.round(f.tonnage), (v) => TONNAGE_LABEL[v] ?? kg(v)),
  D('volume', 'weight', 'series', 'Séries validées', 'Nombre total de séries validées', [100, 500, 1000, 2500, 5000], (f) => f.sets),
  D('volume', 'weight', 'repetitions', 'Répétitions', 'Nombre total de répétitions', [1000, 10000, 50000, 100000], (f) => f.reps),
  D('volume', 'weight', 'grosse_seance', 'Grosse séance', 'Tonnage d’une seule séance', [5000, 10000, 15000], (f) => Math.round(f.bestSessionTonnage), kg),
  D('records', 'trophy', 'records', 'Premier record', 'Records personnels battus', [1, 10, 50, 100], (f) => f.records),
  D('records', 'trophy', 'jour_gloire', 'Jour de gloire', 'Records battus dans une même séance', [3, 5], (f) => f.bestRecordsInSession),
  D('records', 'trophy', 'echelon', 'Échelon supérieur', 'Charge augmentée sur un exercice d’une séance à l’autre', [1, 10, 25, 50], (f) => f.loadIncreases),
  D('records', 'trophy', 'progression', 'Progression', '1RM estimé d’un exercice en hausse depuis la première fois', [10, 25, 50, 100], (f) => Math.floor(f.bestProgressPct), (v) => `+${v} %`),
  D('clubs', 'weight', 'club_couche', 'Club du développé couché', '1RM estimé au développé couché à la barre', [60, 80, 100, 120, 140], (f) => Math.floor(best(f.best1RM, BENCH)), kg),
  D('clubs', 'weight', 'club_squat', 'Club du squat', '1RM estimé au squat barre', [80, 100, 140, 180], (f) => Math.floor(best(f.best1RM, SQUAT)), kg),
  D('clubs', 'weight', 'club_terre', 'Club du soulevé de terre', '1RM estimé au soulevé de terre', [100, 140, 180, 220], (f) => Math.floor(best(f.best1RM, DEADLIFT)), kg),
  D('clubs', 'weight', 'club_militaire', 'Club du développé militaire', '1RM estimé au développé militaire à la barre', [40, 60, 80], (f) => Math.floor(best(f.best1RM, OHP)), kg),
  D('clubs', 'weight', 'club_total', 'Club des 300 / 400 / 500', 'Somme des 1RM estimés : couché + squat + terre', [300, 400, 500], (f) => Math.floor(best(f.best1RM, BENCH) + best(f.best1RM, SQUAT) + best(f.best1RM, DEADLIFT)), kg),
  D('pdc', 'fist', 'tractions', 'Tractions', 'Tractions d’affilée en une série', [1, 5, 10, 15, 20], (f) => best(f.bestReps, PULLUPS)),
  D('pdc', 'fist', 'pompes', 'Pompes', 'Pompes d’affilée en une série', [20, 30, 50, 75], (f) => best(f.bestReps, PUSHUPS)),
  D('pdc', 'fist', 'dips', 'Dips', 'Dips d’affilée en une série', [10, 20, 30], (f) => best(f.bestReps, DIPS)),
  D('pdc', 'fist', 'gainage', 'Gainage', 'Meilleur temps de gainage planche', [60, 120, 180, 300], (f) => best(f.bestSec, PLANK), (v) => min(v / 60)),
  D('pdc', 'fist', 'burpees', 'Burpees', 'Burpees d’affilée en une série', [20, 30, 50], (f) => best(f.bestReps, BURPEES)),
  D('cardio', 'heart', 'endurance', 'Endurance', 'Minutes de cardio cumulées', [60, 300, 1000, 3000], (f) => Math.floor(f.cardioMin), min),
  D('cardio', 'clock', 'chrono', 'Sous le chrono', 'Minutes de travail faites au minuteur', [10, 60, 300], (f) => Math.floor(f.timerMin), min),
  D('explorateur', 'compass', 'curieux', 'Curieux', 'Exercices différents du catalogue faits au moins une fois', [10, 25, 50, 100, 150], (f) => f.catalogIds),
  D('explorateur', 'compass', 'touche_a_tout', 'Touche-à-tout', 'Un exercice de chaque type : charge libre, machine, poids du corps, cardio', [4], (f) => f.kinds, (v) => `${v} types`),
  D('explorateur', 'compass', 'tour_corps', 'Tour du corps', 'Chaque zone du schéma du corps travaillée au moins une fois', [ZONES.length], (f) => f.zonesWorked, (v) => `${v} zones`),
  D('corps', 'body', 'semaine_complete', 'Semaine complète', 'Semaines où chaque zone a au moins un muscle bien travaillé (10 séries ou plus)', [1, 4, 12], (f) => f.fullWeeks),
  D('corps', 'body', 'specialiste', 'Spécialiste', 'Muscles au niveau maximal 4 semaines d’affilée', [1, 3, 5, 10], (f) => f.specialists),
  D('corps', 'body', 'equilibre', 'Équilibre', 'Blocs de 4 semaines où pousser et tirer sont à ±20 %', [1, 3, 6], (f) => f.balanced),
  D('finishers', 'flame', 'finisher', 'Finisher', 'Finishers terminés', [1, 10, 25, 50, 100], (f) => f.finishers),
  D('finishers', 'flame', 'polyvalent', 'Polyvalent', 'Un finisher de chacun des 5 types', [5], (f) => f.finisherTypes, (v) => `${v} types`),
  D('finishers', 'flame', 'collectionneur', 'Collectionneur', 'Tous les finishers de ta liste faits au moins une fois', [1], (f) => (f.finisherTotal && f.finisherIdsDone >= f.finisherTotal ? 1 : 0)),
  D('finishers', 'flame', 'jusquau_bout', 'Jusqu’au bout', 'Finisher fait plusieurs séances d’affilée', [10, 30], (f) => f.finisherRun, (v) => `${v} séances`),
  D('finishers', 'gear', 'enchainement', 'Enchaînement', 'Séances avec un superset, un triset ou un circuit', [1, 10, 50], (f) => f.supersetSessions),
  D('finishers', 'gear', 'circuit', 'Circuit training', 'Un circuit de 4 exercices ou plus terminé', [1], (f) => f.circuit),
  D('moments', 'clock', 'leve_tot', 'Lève-tôt', 'Séances commencées avant 7 h', [1, 10, 50], (f) => f.early),
  D('moments', 'clock', 'oiseau_nuit', 'Oiseau de nuit', 'Séances commencées après 21 h', [1, 10, 50], (f) => f.late),
  D('moments', 'calendar', 'week_end', 'Week-end', 'Séances le samedi ou le dimanche', [10, 50], (f) => f.weekend),
  D('moments', 'calendar', 'toutes_saisons', 'Toutes saisons', 'Au moins une séance dans chacun des 12 mois', [12], (f) => f.monthsOfYear, (v) => `${v} mois`),
  D('outils', 'shield', 'discipline', 'Discipline', 'Jours où toutes les tâches du jour sont faites', [7, 30, 100, 365], (f) => f.routineDays),
  D('outils', 'gear', 'base_arriere', 'Base arrière', 'Appli PC PCTRA associée', [1], (_f, d) => (d.settings.pc || d.settings.feats?.paired ? 1 : 0)),
  D('outils', 'gear', 'maitre_oeuvre', 'Maître d’œuvre', 'Programmes créés', [1, 5], (_f, d) => d.programs.length),
  D('outils', 'gear', 'transmission', 'Transmission', 'Partager un programme ou un finisher par QR code', [1], (_f, d) => Math.min(1, d.settings.feats?.shares ?? 0)),

  S('mot_de_passe', 'Mot de passe', 'Débloquer un thème caché avec un code', 'Un mot qui ouvre des portes', (_f, d) => !!d.settings.feats?.codes?.length),
  S('curiosite', 'Curiosité', 'Appuyer 7 fois sur l’emblème de l’accueil : débloque le bouclier Lambda et son thème', 'Ce bouclier cache quelque chose', (_f, d) => (d.settings.feats?.logoTaps ?? 0) >= 7),
  S('defile', 'Défilé', 'Séance un 14 juillet', 'Jour de fête nationale', (f) => md(f, '07-14')),
  S('sainte_barbe', 'Sainte-Barbe', 'Séance un 4 décembre', 'La patronne des soldats du feu', (f) => md(f, '12-04')),
  S('resolution', 'Bonne résolution', 'Séance un 1er janvier', 'Premier jour', (f) => md(f, '01-01')),
  S('hors_treve', 'Hors trêve', 'Séance un 25 décembre', 'Même les jours de fête', (f) => md(f, '12-25')),
  S('valentin', 'Amoureux de la fonte', 'Séance un 14 février', 'Ton vrai rendez-vous', (f) => md(f, '02-14')),
  S('citrouilles', 'Nuit des citrouilles', 'Séance un 31 octobre : débloque le thème Citrouille', 'Des monstres dans la salle', (f) => md(f, '10-31')),
  S('vendredi13', 'Pas superstitieux', 'Séance un vendredi 13', 'Un jour qui porte malheur', (f) => f.friday13),
  S('solstice', 'Solstice', 'Séance le 21 juin', 'Le jour le plus long', (f) => md(f, '06-21')),
  S('loup_garou', 'Loup-garou', 'Séance un soir de pleine lune : débloque le thème Loup-garou', 'Regarde le ciel', (f) => f.fullMoon),
  S('garde_nuit', 'Garde de nuit', 'Séance commencée entre minuit et 4 h : débloque le thème Garde de nuit', 'Quand tout le monde dort', (f) => f.night),
  S('heure_miroir', 'Heure miroir', 'Séance terminée à une heure miroir (11:11, 22:22…) : débloque le thème Miroir', 'Fais un vœu', (f) => f.mirror),
  S('anniversaire', 'Anniversaire', 'Séance un an jour pour jour après ta première', 'Souffle une bougie', (f) => f.anniversary),
  S('compte_bon', 'Le compte est bon', 'Une série à 100 kg pile pour 10 répétitions pile', 'Des chiffres bien ronds', (f) => f.hundredTen),
  S('thermopyles', 'Thermopyles', '300 répétitions dans une même séance : débloque le thème Les 300', 'Ils étaient trois cents', (f) => f.thermopyles),
  S('sans_retraite', 'Sans retraite', '10 séances complètes d’affilée', 'Ne recule jamais', (f) => f.perfectRun >= 10),
  S('retour_flamme', 'Retour de flamme', 'Battre un record après 30 jours ou plus de pause : débloque le thème Phénix', 'Le phénix renaît', (f) => f.phoenix),
  S('changement_tenue', 'Changement de tenue', 'Essayer tous les thèmes', 'Chaque armure a son style', (_f, d) => {
    const tried = new Set(d.settings.feats?.themes ?? [])
    return themesShown({ ...d.settings, devThemes: false }).every((t) => tried.has(t.id))
  }),
  S('utile_demain', 'Plus utile demain', 'Séance le lendemain d’un record battu', 'La devise, au pied de la lettre', (f) => f.dayAfterRecord),
  // Ces deux-là dépendent des autres succès : calculés à part dans evaluate().
  S('premier_platine', 'Premier platine', 'Obtenir une première médaille de platine', 'Plus précieux que l’or', () => false),
  S('legende', 'Légende', 'Atteindre le niveau 100 : débloque le thème Immortel', 'Au sommet de l’Olympe', () => false),
]

/* ---------- Médailles, XP, niveaux ---------- */

/** Métal d'un palier : bronze, argent, or puis platine pour les derniers ; un succès à palier unique vaut de l'or. */
export function metalOf(tierIndex: number, tierCount: number): Metal {
  if (tierCount === 1) return 'or'
  const order: Metal[] = ['bronze', 'argent', 'or', 'platine']
  if (tierCount === 2) return tierIndex === 0 ? 'bronze' : 'or'
  if (tierCount === 3) return order[tierIndex]
  return order[Math.min(3, Math.floor((tierIndex * 4) / tierCount))]
}

export const ACTIVITY_XP = { session: 50, perfect: 25, record: 30, finisher: 20, week: 100 }

/** XP pour passer du niveau n au niveau n + 1. */
export const levelCost = (n: number) => 50 * n + 50
export const MAX_LEVEL = 100

export const TITLES: [number, string][] = [
  [1, 'Recrue'], [10, 'Guerrier'], [20, 'Hoplite'], [30, 'Vétéran'], [40, 'Champion'], [50, 'Gardien'],
  [60, 'Conquérant'], [70, 'Héros'], [80, 'Titan'], [90, 'Légende'], [100, 'Immortel'],
]
export const titleOf = (level: number) => [...TITLES].reverse().find(([l]) => level >= l)![1]

export interface Level {
  level: number
  title: string
  xp: number
  /** XP gagnée dans le niveau en cours, et nécessaire pour le suivant. */
  into: number
  need: number
}

export function levelFor(xp: number): Level {
  let level = 1
  let rest = xp
  while (level < MAX_LEVEL && rest >= levelCost(level)) {
    rest -= levelCost(level)
    level++
  }
  return { level, title: titleOf(level), xp, into: level < MAX_LEVEL ? rest : 0, need: level < MAX_LEVEL ? levelCost(level) : 0 }
}

export interface Evaluation {
  list: Achievement[]
  xp: number
  level: Level
  /** XP détaillée : activité et médailles. */
  activityXp: number
  medalXp: number
  facts: Facts
}

export function medalXpOf(a: Achievement): number {
  if (a.def.family === 'secrets') return a.reached ? SECRET_XP : 0
  let xp = 0
  for (let i = 0; i < a.reached; i++) xp += METAL_XP[metalOf(i, a.def.tiers.length)]
  return xp
}

/** `now` : date d'évaluation (par défaut maintenant), pour rejouer l'historique à une date passée. */
export function evaluate(data: AppData, now = Date.now()): Evaluation {
  const facts = factsOf(data, now)
  const list: Achievement[] = DEFS.map((def) => {
    const value = def.value(facts, data)
    const reached = def.tiers.filter((t) => value >= t).length
    const { value: _v, ...pub } = def
    void _v
    return { def: pub, value, reached, next: def.tiers[reached] }
  })
  const platinum = list.some((a) => a.def.family !== 'secrets' && a.reached > 0 && Array.from({ length: a.reached }, (_, i) => metalOf(i, a.def.tiers.length)).includes('platine'))
  setSecret(list, 'premier_platine', platinum)
  const activityXp =
    facts.xpSessions * ACTIVITY_XP.session + facts.perfect * ACTIVITY_XP.perfect + facts.records * ACTIVITY_XP.record + facts.finishers * ACTIVITY_XP.finisher + facts.weeksHeld * ACTIVITY_XP.week
  let medalXp = list.reduce((n, a) => n + medalXpOf(a), 0)
  let level = levelFor(activityXp + medalXp)
  if (level.level >= MAX_LEVEL) {
    setSecret(list, 'legende', true)
    medalXp += SECRET_XP
    level = levelFor(activityXp + medalXp)
  }
  return { list, xp: activityXp + medalXp, level, activityXp, medalXp, facts }
}

function setSecret(list: Achievement[], id: string, ok: boolean) {
  const a = list.find((x) => x.def.id === id)
  if (a && ok) {
    a.value = 1
    a.reached = 1
    a.next = undefined
  }
}

/** Libellé d'un seuil. */
export const tierLabel = (def: AchievementDef, v: number) => (def.label ? def.label(v) : v.toLocaleString('fr-FR'))

/** Paliers obtenus : « id:index ». */
export const reachedKeys = (list: Achievement[]) => list.flatMap((a) => Array.from({ length: a.reached }, (_, i) => `${a.def.id}:${i}`))

export interface Gain {
  achievement: Achievement
  tier: number
  metal: Metal
}

/** Médailles et XP gagnées par une séance : comparaison avant / après. */
export function gainsOf(data: AppData, sessionId: string): { gains: Gain[]; xp: number; before: Level; after: Level } {
  const without: AppData = { ...data, sessions: data.sessions.filter((s) => s.id !== sessionId) }
  const a = evaluate(without)
  const b = evaluate(data)
  const had = new Set(reachedKeys(a.list))
  const gains: Gain[] = []
  for (const x of b.list) {
    for (let i = 0; i < x.reached; i++) {
      if (!had.has(`${x.def.id}:${i}`)) gains.push({ achievement: x, tier: i, metal: x.def.family === 'secrets' ? 'or' : metalOf(i, x.def.tiers.length) })
    }
  }
  return { gains, xp: b.xp - a.xp, before: a.level, after: b.level }
}

/** Succès le plus proche d'un nouveau palier (hors secrets), en proportion du chemin restant. */
export function closest(list: Achievement[]): Achievement | undefined {
  let bestA: Achievement | undefined
  let bestP = -1
  for (const a of list) {
    if (a.def.family === 'secrets' || a.next == null) continue
    const prev = a.reached ? a.def.tiers[a.reached - 1] : 0
    const p = (a.value - prev) / (a.next - prev)
    if (p < 1 && p > bestP) {
      bestP = p
      bestA = a
    }
  }
  return bestA
}

