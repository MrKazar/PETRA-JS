import { useMemo, useState } from 'react'
import { useData } from '../data/store'
import type { AppData } from '../data/types'
import { useNav } from '../nav'
import { FAMILIES, METAL_LABEL, closest, evaluate, gainsOf, metalOf, tierLabel, type Achievement, type Evaluation } from '../logic/achievements'
import { Progress, Sheet, TopBar } from '../ui/kit'
import { LevelBadge, Medal } from '../ui/Medal'
import { IconCheck, IconChevron } from '../ui/icons'

/** Évaluation mémorisée tant que les données ne changent pas. */
export function useAchievements(): Evaluation {
  const data = useData()
  return useMemo(() => evaluate(data), [data])
}

export const achievementsOn = (d: Pick<AppData, 'settings'>) => d.settings.achievements !== false

const metalNow = (a: Achievement) => (a.def.family === 'secrets' ? 'or' : metalOf(Math.max(0, a.reached - 1), a.def.tiers.length))

const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR')

function MedalOf({ a, size }: { a: Achievement; size?: number }) {
  const secret = a.def.family === 'secrets' && !a.reached
  return <Medal metal={metalNow(a)} icon={a.def.icon} size={size} locked={!a.reached} secret={secret} label={a.def.name} />
}

/** Carte de niveau : écusson, titre et barre d'XP. */
export function LevelCard({ onOpen }: { onOpen?: () => void }) {
  const ev = useAchievements()
  const { level } = ev
  const next = closest(ev.list)
  const done = ev.list.filter((a) => a.reached).length
  return (
    <button className="card level-card" onClick={onOpen}>
      <LevelBadge level={level.level} size={60} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="eyebrow">Niveau {level.level} · {level.title}</div>
        <div className="xp-bar"><Progress value={level.need ? level.into / level.need : 1} /></div>
        <div className="small muted">
          {level.need ? `${fmt(level.into)} / ${fmt(level.need)} XP` : `${fmt(level.xp)} XP`} · {done} succès sur {ev.list.length}
        </div>
        {next && (
          <div className="small faint ellipsis" style={{ marginTop: 2 }}>
            Prochain : {next.def.name} · {tierLabel(next.def, next.value)} / {tierLabel(next.def, next.next!)}
          </div>
        )}
      </div>
      {onOpen && <IconChevron style={{ width: 18, color: 'var(--faint)', flex: 'none' }} />}
    </button>
  )
}

export function AchievementsScreen() {
  const nav = useNav()
  const ev = useAchievements()
  const [open, setOpen] = useState<Achievement | null>(null)
  return (
    <div className="screen">
      <div className="screen-inner">
        <TopBar title="Succès" onBack={nav.pop} />
        <LevelCard />
        <div className="small muted" style={{ marginTop: -4 }}>
          {fmt(ev.activityXp)} XP d’activité (séances, records, finishers, semaines tenues) + {fmt(ev.medalXp)} XP de médailles.
        </div>
        {FAMILIES.map((f) => {
          const items = ev.list.filter((a) => a.def.family === f.id)
          if (!items.length) return null
          const got = items.filter((a) => a.reached).length
          return (
            <section key={f.id} className="stack" style={{ gap: 8 }}>
              <div className="section-title"><span className="grow">{f.label}</span><span className="small faint">{got} / {items.length}</span></div>
              <div className="medal-grid">
                {items.map((a) => {
                  const secret = a.def.family === 'secrets' && !a.reached
                  const prev = a.reached ? a.def.tiers[a.reached - 1] : 0
                  const pct = a.next != null ? (a.value - prev) / (a.next - prev) : 1
                  return (
                    <button key={a.def.id} className={`medal-cell${a.reached ? '' : ' locked'}`} onClick={() => setOpen(a)}>
                      <MedalOf a={a} size={58} />
                      <div className="n">{secret ? '???' : a.def.name}</div>
                      {a.def.family !== 'secrets' && a.def.tiers.length > 1 && (
                        <div className="pips">
                          {a.def.tiers.map((_, i) => <i key={i} className={i < a.reached ? `on ${metalOf(i, a.def.tiers.length)}` : ''} />)}
                        </div>
                      )}
                      {a.def.family !== 'secrets' && a.next != null && <div className="mini-bar"><div style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }} /></div>}
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open && (open.def.family === 'secrets' && !open.reached ? 'Succès secret' : open.def.name)}>
        {open && <Detail a={open} />}
      </Sheet>
    </div>
  )
}

function Detail({ a }: { a: Achievement }) {
  const secret = a.def.family === 'secrets'
  return (
    <div className="stack" style={{ gap: 12, alignItems: 'center', textAlign: 'center' }}>
      <MedalOf a={a} size={96} />
      {secret ? (
        a.reached ? <div>{a.def.desc}<div className="small muted" style={{ marginTop: 4 }}>Trouvé · +150 XP</div></div> : <div className="muted">Indice : « {a.def.hint} »</div>
      ) : (
        <>
          <div>{a.def.desc}</div>
          <div className="small muted">Actuellement : {tierLabel(a.def, a.value)}</div>
          <div className="tier-list">
            {a.def.tiers.map((t, i) => {
              const metal = metalOf(i, a.def.tiers.length)
              const ok = i < a.reached
              return (
                <div key={i} className={`tier-row${ok ? ' ok' : ''}`}>
                  <span className={`dot ${metal}`} />
                  <span className="grow">{tierLabel(a.def, t)}</span>
                  <span className="small faint">{METAL_LABEL[metal]}</span>
                  {ok && <IconCheck style={{ width: 16, color: 'var(--success)' }} />}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/** Résumé de fin de séance : XP gagnée, passage de niveau et nouvelles médailles. */
export function SessionGains({ sessionId }: { sessionId: string }) {
  const data = useData()
  const nav = useNav()
  const g = useMemo(() => gainsOf(data, sessionId), [data, sessionId])
  if (g.xp <= 0 && !g.gains.length) return null
  const up = g.after.level > g.before.level
  return (
    <button className="card accent gains" onClick={() => nav.push({ name: 'achievements' })}>
      <div className="row">
        <LevelBadge level={g.after.level} size={52} />
        <div className="grow" style={{ textAlign: 'left' }}>
          <div className="xp-gain">+{fmt(g.xp)} XP</div>
          <div className="small muted">{up ? `Niveau ${g.after.level} atteint · ${g.after.title}` : `Niveau ${g.after.level} · ${fmt(g.after.into)} / ${fmt(g.after.need)} XP`}</div>
        </div>
      </div>
      {g.gains.length > 0 && (
        <div className="gain-list">
          {g.gains.map((x) => (
            <div key={`${x.achievement.def.id}:${x.tier}`} className="gain">
              <Medal metal={x.metal} icon={x.achievement.def.icon} size={44} label={x.achievement.def.name} />
              <div className="n">{x.achievement.def.name}</div>
              <div className="small faint">{x.achievement.def.family === 'secrets' ? 'Secret' : tierLabel(x.achievement.def, x.achievement.def.tiers[x.tier])}</div>
            </div>
          ))}
        </div>
      )}
    </button>
  )
}
