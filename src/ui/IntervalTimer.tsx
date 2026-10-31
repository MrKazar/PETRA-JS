import { useEffect, useRef } from 'react'
import type { IntervalTimer } from '../data/types'
import { timerPosition } from '../logic/session'
import { beep, buzzStep } from '../logic/native'
import { formatClock, formatDuration } from '../logic/util'
import { IconSkip, IconX } from './icons'

const KIND_LABEL = { prep: 'Prépare-toi', work: 'Travail', rest: 'Repos' }

/** Minuteur plein écran façon HIIT : couleur par étape, gros décompte, bips sur les 3 dernières secondes. */
export function IntervalTimerView({
  timer,
  now,
  sound,
  vibrate,
  onPause,
  onResume,
  onSkip,
  onStop,
}: {
  timer: IntervalTimer
  now: number
  sound: boolean
  vibrate: boolean
  onPause: () => void
  onResume: () => void
  onSkip: () => void
  onStop: () => void
}) {
  const pos = timerPosition(timer, now)
  const step = timer.steps[Math.min(pos.index, timer.steps.length - 1)]
  const secs = Math.ceil(pos.left)
  const paused = !!timer.pausedAt

  const works = timer.steps.filter((x) => x.kind === 'work')
  const round = timer.steps.slice(0, pos.index + 1).filter((x) => x.kind === 'work').length
  const after = timer.steps.slice(pos.index + 1)
  const nextWork = step.kind === 'work' ? after.find((x) => x.kind === 'work') : undefined
  const following = after[0]

  // Bips 3-2-1 puis bip long et vibration au changement d'étape.
  const last = useRef<{ index: number; secs: number }>({ index: pos.index, secs })
  useEffect(() => {
    const prev = last.current
    last.current = { index: pos.index, secs }
    if (paused) return
    if (pos.index !== prev.index) {
      if (sound) beep(true)
      if (vibrate) buzzStep()
    } else if (secs !== prev.secs && secs <= 3 && secs >= 1) {
      if (sound) beep()
    }
  }, [pos.index, secs, paused, sound, vibrate])

  const progress = step.sec ? Math.min(100, (1 - pos.left / step.sec) * 100) : 0

  return (
    <div className={`hiit k-${step.kind}${paused ? ' paused' : ''}`}>
      <div className="hiit-top">
        <span className="hiit-round">
          {round > 0 ? `Tour ${round}/${works.length}` : `${works.length} tours`}
        </span>
        <span className="hiit-total">reste {formatClock(Math.ceil(pos.totalLeft))}</span>
        <button className="icon-btn" aria-label="Arrêter le minuteur" onClick={onStop}><IconX /></button>
      </div>

      <div className="hiit-main" onClick={paused ? onResume : onPause}>
        <div className="hiit-kind">{paused ? 'Pause' : KIND_LABEL[step.kind]}</div>
        <div className="hiit-clock">{formatClock(secs)}</div>
        <div className="hiit-name">{step.kind === 'rest' ? `Ensuite : ${step.name}` : step.name}</div>
        <div className="hiit-bar"><div style={{ width: `${progress}%` }} /></div>
        <div className="hiit-next">
          {step.kind === 'rest' && following
            ? `${formatDuration(following.sec)} de travail`
            : following
            ? following.kind === 'rest'
              ? `Puis ${formatDuration(following.sec)} de repos${nextWork ? ` · ${nextWork.name}` : ''}`
              : `Puis : ${following.name} · ${formatDuration(following.sec)}`
            : 'Dernière ligne droite !'}
        </div>
      </div>

      <div className="hiit-actions">
        <button className="btn big grow" onClick={paused ? onResume : onPause}>{paused ? 'Reprendre' : 'Pause'}</button>
        <button className="btn big grow" onClick={onSkip}><IconSkip style={{ width: 18 }} /> Passer</button>
      </div>
    </div>
  )
}
