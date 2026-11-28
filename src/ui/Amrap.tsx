import { useEffect, useRef, useState } from 'react'
import type { ProgramExercise, Session, SessionExercise } from '../data/types'
import { amrapHistory, amrapKey, bestOf, better, commitExercise, elapsedSec, formatScore, leadOnRecord, paceOf, repsPerRound, scoreOf, type AmrapResult } from '../logic/amrap'
import { describePart } from '../logic/session'
import { beep, buzzStep, tap } from '../logic/native'
import { formatClock, formatDuration } from '../logic/util'
import { Kranos } from './Kranos'
import { confirmAction } from './kit'
import { IconCheck, IconMinus, IconPlay, IconPlus, IconTrophy, IconX } from './icons'

/** Circuit d'un tour : « 5 tractions », « 30 s gainage ». */
function Circuit({ ex, big = false }: { ex: Pick<ProgramExercise, 'parts' | 'sets'>; big?: boolean }) {
  return (
    <ul className="ss-parts" style={big ? { fontSize: 15 } : undefined}>
      {(ex.parts ?? []).map((p, k) => (
        <li key={k}><b>{describePart(ex.sets[0]?.parts?.[k] ?? p)}</b><span className="ellipsis">{p.name}</span></li>
      ))}
    </ul>
  )
}

const shortDate = (t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

/** Bloc AMRAP dans la liste d'un programme. */
export function AmrapSummary({ ex, sessions }: { ex: ProgramExercise; sessions: Session[] }) {
  const best = bestOf(amrapHistory(sessions, amrapKey(ex)))
  return (
    <>
      <div className="small muted">{formatDuration(ex.amrap!.capSec)} · autant de tours que possible</div>
      <Circuit ex={ex} />
      {best && <div className="small" style={{ color: 'var(--khaki)', marginTop: 6 }}><IconTrophy style={{ width: 14, verticalAlign: -2 }} /> Record : {formatScore(best)}</div>}
    </>
  )
}

/** Carte de l'AMRAP pendant la séance : avant le départ (objectifs) ou une fois enregistré (score). */
export function AmrapCard({ ex, sessions, before, current, cardRef, onStart, onRemove }: { ex: SessionExercise; sessions: Session[]; before: number; current: boolean; cardRef: (el: HTMLDivElement | null) => void; onStart: () => void; onRemove: () => void }) {
  const hist = amrapHistory(sessions, amrapKey(ex), before)
  const best = bestOf(hist)
  const last = hist[hist.length - 1]
  const score = scoreOf(ex)
  if (score) {
    const record = best && better(score, best)
    return (
      <div ref={cardRef} className="card tight row" style={{ opacity: 0.85 }}>
        <IconCheck style={{ width: 18, color: 'var(--success)', flex: 'none' }} />
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="ellipsis" style={{ fontWeight: 600 }}><span className="ss-tag">AMRAP</span>{ex.name}</div>
          <div className="small muted">{formatScore(score)} en {formatDuration(ex.amrap!.capSec)}</div>
        </div>
        {record && <span className="badge green">Record</span>}
      </div>
    )
  }
  const pace = best && paceOf(best, best.capSec, repsPerRound(ex))
  return (
    <div ref={cardRef} className={`card${current ? ' accent' : ''}`} style={{ scrollMarginTop: 120 }}>
      <div className="row between">
        <h3 className="grow"><span className="ss-tag">AMRAP</span>{ex.name}</h3>
        <span className="badge gold">{formatDuration(ex.amrap!.capSec)}</span>
      </div>
      <Circuit ex={ex} big />
      {best ? (
        <div className="amrap-target">
          <div><div className="small muted">Record</div><div className="amrap-big">{formatScore(best, true)}</div><div className="small faint">tours + rép.</div></div>
          <div><div className="small muted">Dernière fois</div><div className="amrap-big">{formatScore(last!, true)}</div><div className="small faint">{shortDate(last!.at)}</div></div>
          <div><div className="small muted">Rythme record</div><div className="amrap-big">{pace ? formatClock(pace) : '—'}</div><div className="small faint">par tour</div></div>
        </div>
      ) : (
        <p className="small muted" style={{ margin: '10px 0 0' }}>Premier passage : ton score deviendra le record à battre.</p>
      )}
      <button className="btn primary block big" style={{ marginTop: 12 }} onClick={onStart}><IconPlay style={{ width: 16 }} /> Lancer l’AMRAP</button>
      <div className="row" style={{ marginTop: 6 }}>
        <span className="small faint grow">Décompte de 10 s avant le départ</span>
        <button className="btn sm ghost" onClick={onRemove}>Retirer</button>
      </div>
    </div>
  )
}

/**
 * AMRAP en plein écran : décompte, temps restant, numéro du tour et gros bouton « +1 tour ».
 * À la fin du temps, saisie du tour entamé puis enregistrement.
 */
export function AmrapView({
  ex,
  sessions,
  before,
  now,
  sound,
  vibrate,
  showTip,
  onTipSeen,
  onRound,
  onUndo,
  onPause,
  onResume,
  onStop,
  onCancel,
  onSave,
}: {
  ex: SessionExercise
  sessions: Session[]
  before: number
  now: number
  sound: boolean
  vibrate: boolean
  showTip: boolean
  onTipSeen: () => void
  onRound: () => void
  onUndo: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onCancel: () => void
  onSave: (partial: number[]) => void
}) {
  const a = ex.amrap!
  const run = a.run!
  const cap = a.capSec
  const t = elapsedSec(run, cap, now)
  const prep = t < 0
  const left = prep ? -t : cap - t
  const secs = Math.ceil(left)
  const paused = !!run.pausedAt
  const stopped = !!run.stoppedAt
  const record = bestOf(amrapHistory(sessions, amrapKey(ex), before))
  const lead = leadOnRecord(run.marks, record)
  const round = run.marks.length + 1
  const lastRound = run.marks.length ? run.marks[run.marks.length - 1] - (run.marks[run.marks.length - 2] ?? 0) : undefined

  // Fin du temps : le chrono s'arrête tout seul.
  useEffect(() => {
    if (!stopped && !paused && t >= cap) onStop()
  }, [stopped, paused, t, cap, onStop])

  // Bips 3-2-1 avant le départ et avant la fin, bip long et vibration au départ et à la fin.
  const lastTick = useRef({ prep, secs })
  useEffect(() => {
    const prev = lastTick.current
    lastTick.current = { prep, secs }
    if (paused || stopped) return
    if (prev.prep && !prep) {
      if (sound) beep(true)
      if (vibrate) buzzStep()
    } else if (secs !== prev.secs && secs >= 1 && secs <= 3) {
      if (sound) beep()
    }
  }, [prep, secs, paused, stopped, sound, vibrate])
  const ended = useRef(false)
  useEffect(() => {
    if (stopped && !ended.current) {
      ended.current = true
      if (t >= cap) {
        if (sound) beep(true)
        if (vibrate) buzzStep()
      }
    }
  }, [stopped, t, cap, sound, vibrate])

  if (stopped) return <AmrapEnd ex={ex} record={record} onSave={onSave} onCancel={onCancel} />

  const bar = prep ? 0 : Math.min(100, (t / cap) * 100)
  return (
    <div className={`amrap-full${paused ? ' paused' : ''}`} role="dialog" aria-label={`AMRAP ${ex.name}`}>
      <div className="amrap-top">
        <span className="ellipsis">{ex.name}</span>
        <span className="grow" style={{ textAlign: 'right' }}>{prep ? 'départ dans' : paused ? 'pause' : 'reste'}</span>
        <button className="icon-btn" aria-label="Arrêter l’AMRAP" onClick={() => (prep ? onCancel() : confirmAction('Arrêter l’AMRAP maintenant ?') && onStop())}><IconX /></button>
      </div>
      <div className="amrap-clock" aria-live="off">{prep ? secs : formatClock(secs)}</div>
      <div className="amrap-bar"><div style={{ width: `${bar}%` }} /></div>
      <div className="amrap-round">
        <span>{prep ? 'Prépare-toi' : 'Tour'}</span>
        {!prep && <b>{round}</b>}
        <span className="amrap-pace">
          {lead != null ? (
            <>Record au même tour : <span style={{ color: lead >= 0 ? 'var(--success)' : 'var(--error)' }}>{lead >= 0 ? `▲ ${formatDuration(lead)} d’avance` : `▼ ${formatDuration(-lead)} de retard`}</span></>
          ) : record ? (
            `Record à battre : ${formatScore(record)}`
          ) : (
            `${formatDuration(cap)} · autant de tours que possible`
          )}
        </span>
      </div>
      <div className="amrap-list">
        {(ex.parts ?? []).map((p, k) => (
          <div key={k}><b>{describePart(ex.sets[0]?.parts?.[k] ?? p)}</b> <span className="ellipsis">{p.name}</span></div>
        ))}
      </div>
      {showTip && (
        <div className="amrap-tip">
          <Kranos mood="motive" size={70} className="float" />
          <div className="guide-bubble">
            <div>Première fois en AMRAP ! Enchaîne le circuit en boucle et appuie sur « +1 tour » à chaque tour fini. Je compte pour toi.</div>
            <div className="guide-actions"><span className="grow" /><button className="btn primary sm" onClick={onTipSeen}>Compris</button></div>
          </div>
        </div>
      )}
      <button className="amrap-go" disabled={prep || paused} onClick={() => { tap(); onRound() }}>
        <span>+1 tour</span>
        <small>{prep ? 'Ça commence au bip' : `Tour ${round} en cours${lastRound ? ` · dernier tour en ${formatClock(lastRound)}` : ''}`}</small>
      </button>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn big grow" disabled={prep} onClick={paused ? onResume : onPause}>{paused ? 'Reprendre' : 'Pause'}</button>
        <button className="btn big grow" disabled={!run.marks.length} onClick={onUndo}>Annuler le dernier</button>
      </div>
    </div>
  )
}

/** Temps écoulé : répétitions du tour entamé, score et record. */
function AmrapEnd({ ex, record, onSave, onCancel }: { ex: SessionExercise; record?: AmrapResult; onSave: (partial: number[]) => void; onCancel: () => void }) {
  const parts = ex.parts ?? []
  const [partial, setPartial] = useState<number[]>(parts.map(() => 0))
  const run = ex.amrap!.run!
  const preview = commitExercise(ex, partial)
  const score = scoreOf(preview)!
  const perRound = repsPerRound(ex)
  const pace = paceOf(score, ex.amrap!.capSec, perRound)
  const isRecord = record && better(score, record)
  const timeUp = elapsedSec(run, ex.amrap!.capSec) >= ex.amrap!.capSec
  return (
    <div className="amrap-full end" role="dialog" aria-label="Fin de l’AMRAP">
      <div className="amrap-end-title">{timeUp ? 'Temps !' : 'AMRAP arrêté'}</div>
      <p className="muted small" style={{ margin: 0 }}>
        {run.marks.length} tour{run.marks.length > 1 ? 's' : ''} complet{run.marks.length > 1 ? 's' : ''}. Qu’as-tu fait dans le <b>tour {run.marks.length + 1}</b> commencé ?
      </p>
      <div className="list">
        {parts.map((p, k) => {
          const planned = ex.sets[0]?.parts?.[k] ?? p
          const max = planned.durationSec ?? planned.reps
          const unit = planned.durationSec != null ? 's' : ''
          const step = planned.durationSec != null ? 5 : 1
          const set = (v: number) => setPartial(partial.map((x, i) => (i === k ? Math.max(0, max != null ? Math.min(max, v) : v) : x)))
          return (
            <div key={k} className="list-item">
              <span className="ss-dot" />
              <span className="grow ellipsis">{p.name}</span>
              <div className="amrap-stepper">
                <button className="icon-btn" aria-label={`Moins, ${p.name}`} onClick={() => set(partial[k] - step)}><IconMinus /></button>
                <b>{partial[k]}{unit}</b>
                <button className="icon-btn" aria-label={`Plus, ${p.name}`} onClick={() => set(partial[k] + step)}><IconPlus /></button>
              </div>
              <button className="btn sm ghost" style={{ minWidth: 52 }} aria-label={`Tout fait, ${p.name}`} onClick={() => max != null && set(max)}>/{max ?? '—'}{unit}</button>
            </div>
          )
        })}
      </div>
      <div className="amrap-result">
        <div className="small muted">Résultat</div>
        <div className="amrap-score">{formatScore(score)}</div>
        <div className="small muted">{score.reps} répétitions{pace ? ` · ${formatClock(pace)} par tour` : ''}</div>
        {record && (
          <div className="row" style={{ justifyContent: 'center', gap: 6, marginTop: 8 }}>
            {isRecord ? <span className="badge green">Nouveau record{score.reps > record.reps ? ` +${score.reps - record.reps} rép.` : ''}</span> : <span className="badge">Record : {formatScore(record)}</span>}
          </div>
        )}
      </div>
      <button className="btn primary block big" onClick={() => onSave(partial)}><IconCheck /> Enregistrer</button>
      <button className="btn ghost block" onClick={onCancel}>Ne pas compter cet AMRAP</button>
    </div>
  )
}

/** Résultat d'un AMRAP dans le récap de séance : score, temps de chaque tour, progression. */
export function AmrapResultCard({ ex, session, sessions }: { ex: SessionExercise; session: Session; sessions: Session[] }) {
  const score = scoreOf(ex)
  if (!score) return null
  const hist = amrapHistory(sessions, amrapKey(ex))
  const before = bestOf(hist.filter((h) => h.at < session.startedAt))
  const record = before ? better(score, before) : false
  const rounds = ex.amrap!.roundSec ?? []
  const maxSec = Math.max(1, ...rounds)
  const perRound = repsPerRound(ex)
  const first = hist[0]
  return (
    <div className="card tight">
      <div className="row between">
        <div style={{ fontWeight: 700 }} className="grow"><span className="ss-tag">AMRAP</span>{ex.name} · {formatDuration(ex.amrap!.capSec)}</div>
        {record && <span className="badge green">Record</span>}
      </div>
      <div className="small muted" style={{ marginTop: 2 }}>{(ex.parts ?? []).map((p) => p.name).join(' · ')}</div>
      <div className="amrap-score" style={{ textAlign: 'left', marginTop: 8 }}>{formatScore(score)}</div>
      <div className="small muted">{score.reps} répétitions</div>
      {rounds.length > 0 && (
        <>
          <div className="small muted" style={{ marginTop: 10 }}>Temps par tour</div>
          <div className="amrap-bars" role="img" aria-label={`Temps par tour : ${rounds.map((s) => formatClock(s)).join(', ')}`}>
            {rounds.map((s, i) => (
              <div key={i}><div style={{ height: `${Math.max(8, (s / maxSec) * 100)}%` }} /><span>{i + 1}</span>{rounds.length <= 8 && <em>{formatClock(s)}</em>}</div>
            ))}
            {score.extra > 0 && (
              <div className="partial"><div style={{ height: `${Math.max(8, perRound ? (score.extra / perRound) * 100 : 20)}%` }} /><span>{rounds.length + 1}</span>{rounds.length <= 8 && <em>{score.extra} rép.</em>}</div>
            )}
          </div>
        </>
      )}
      {hist.length >= 2 && (
        <>
          <div className="small muted" style={{ marginTop: 10 }}>Progression ({hist.length} fois)</div>
          <ScoreLine points={hist} perRound={perRound} current={session.id} />
          {first && <div className="small faint">De {formatScore(first)} ({shortDate(first.at)}) à {formatScore(score)}</div>}
        </>
      )}
    </div>
  )
}

/** Courbe des scores (en tours, le tour entamé au prorata). */
function ScoreLine({ points, perRound, current }: { points: AmrapResult[]; perRound: number; current: string }) {
  const W = 320
  const H = 110
  const pad = { l: 30, r: 10, t: 10, b: 10 }
  const vals = points.map((p) => p.rounds + (perRound ? p.extra / perRound : 0))
  const lo = Math.floor(Math.min(...vals))
  const hi = Math.max(lo + 1, Math.ceil(Math.max(...vals)))
  const x = (i: number) => pad.l + (points.length === 1 ? 0 : (i / (points.length - 1)) * (W - pad.l - pad.r))
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b)
  const ticks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((_, i, a) => a.length <= 5 || i % Math.ceil(a.length / 5) === 0)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', marginTop: 4 }} aria-hidden="true">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={2} y={y(v) + 3} fontSize="10" fill="var(--faint)">{v} t.</text>
        </g>
      ))}
      <polyline fill="none" stroke="var(--khaki)" strokeWidth="2.5" points={vals.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
      {vals.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="4" fill={points[i].sessionId === current ? 'var(--success)' : 'var(--khaki)'} />)}
    </svg>
  )
}
