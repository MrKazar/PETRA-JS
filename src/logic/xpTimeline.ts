import type { AppData } from '../data/types'
import { evaluate, metalOf, reachedKeys, type Icon, type Metal } from './achievements'
import { dateKey } from './util'

/** Médaille débloquée à un moment de l'historique. */
export interface Unlock {
  id: string
  name: string
  tier: number
  metal: Metal
  icon: Icon
  secret: boolean
}

export interface XpPoint {
  t: number
  xp: number
  level: number
  /** Séance qui a fait gagner cette XP (absente pour le point « aujourd'hui »). */
  sessionId?: string
  /** Numéro de la séance (1 = première). */
  n?: number
  name?: string
  gained: number
  unlocks: Unlock[]
}

export interface XpTimeline {
  /** Jour 1 : premier programme créé ou première séance. */
  start: number
  points: XpPoint[]
}

/**
 * Courbe d'XP depuis le jour 1 : l'historique est rejoué séance par séance (XP et médailles telles
 * qu'elles étaient juste après chaque séance), puis un dernier point aujourd'hui.
 */
export function xpTimeline(data: AppData, now = Date.now()): XpTimeline {
  const sessions = data.sessions.filter((s) => s.endedAt).sort((a, b) => a.startedAt - b.startedAt)
  const created = [...data.programs.map((p) => p.createdAt), ...sessions.map((s) => s.startedAt)].filter((t) => t > 0)
  const start = created.length ? Math.min(...created) : now
  const points: XpPoint[] = []
  const had = new Set<string>()
  let xp = 0
  const step = (t: number, ev: ReturnType<typeof evaluate>, extra: Partial<XpPoint>) => {
    const keys = reachedKeys(ev.list)
    const unlocks: Unlock[] = []
    for (const k of keys) {
      if (had.has(k)) continue
      const [id, i] = k.split(':')
      const a = ev.list.find((x) => x.def.id === id)!
      const secret = a.def.family === 'secrets'
      unlocks.push({ id, name: a.def.name, tier: +i, metal: secret ? 'or' : metalOf(+i, a.def.tiers.length), icon: a.def.icon, secret })
    }
    points.push({ t, xp: ev.xp, level: ev.level.level, gained: ev.xp - xp, unlocks, ...extra })
    for (const k of keys) had.add(k)
    xp = ev.xp
  }
  points.push({ t: start, xp: 0, level: 1, gained: 0, unlocks: [] })
  sessions.forEach((s, i) => {
    const t = s.endedAt ?? s.startedAt
    const day = dateKey(new Date(s.startedAt))
    const routineLog = Object.fromEntries(Object.entries(data.routineLog).filter(([d]) => d <= day))
    // Seulement les programmes qui existaient déjà : un programme créé plus tard ne compte pas avant.
    const programs = data.programs.filter((p) => !(p.createdAt > t))
    const past: AppData = { ...data, sessions: sessions.slice(0, i + 1), programs, routineLog }
    step(t, evaluate(past, t), { sessionId: s.id, n: i + 1, name: s.programName })
  })
  step(Math.max(now, points[points.length - 1].t), evaluate(data, now), {})
  return { start, points }
}
