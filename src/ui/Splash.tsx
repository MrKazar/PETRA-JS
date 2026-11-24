import { useEffect, useState } from 'react'
import { getData } from '../data/store'
import type { AppData } from '../data/types'
import { programFor } from '../logic/planner'
import { dateKey } from '../logic/util'
import { preloadAnims } from './engine3d'
import { Emblem } from './kit'

const MIN_MS = 900 // assez pour voir l'emblème, pas assez pour agacer
const MAX_MS = 5000 // un téléphone lent ne reste jamais bloqué ici

/** Exercices à préparer au démarrage : séance en cours, sinon séance du jour, sinon le début de chaque programme. */
export function idsToWarm(data: AppData): string[] {
  const ids = (list?: { catalogId?: string; parts?: { catalogId?: string }[] }[]) => (list ?? []).flatMap((e) => [e.catalogId, ...(e.parts ?? []).map((p) => p.catalogId)]).filter((x): x is string => !!x)
  if (data.active) return ids(data.active.exercises)
  const today = programFor(data, dateKey())
  if (today) return ids(today.exercises)
  return data.programs.flatMap((p) => ids(p.exercises).slice(0, 3)).slice(0, 12)
}

/** Écran d'attente au lancement : emblème et devise pendant que les animations du jour se préparent. */
export function Splash() {
  const [step, setStep] = useState<{ done: number; total: number }>({ done: 0, total: 0 })
  const [phase, setPhase] = useState<'on' | 'out' | 'gone'>('on')

  useEffect(() => {
    const t0 = performance.now()
    let ended = false
    const end = () => {
      if (ended) return
      ended = true
      const wait = Math.max(0, MIN_MS - (performance.now() - t0))
      window.setTimeout(() => {
        setPhase('out')
        window.setTimeout(() => setPhase('gone'), 420)
      }, wait)
    }
    const timer = window.setTimeout(end, MAX_MS)
    preloadAnims(idsToWarm(getData()), (done, total) => setStep({ done, total }))
      .catch((e) => console.warn('3D', e))
      .finally(end)
    return () => window.clearTimeout(timer)
  }, [])

  if (phase === 'gone') return null
  const pct = step.total ? (step.done / step.total) * 100 : 0
  return (
    <div className={`splash${phase === 'out' ? ' out' : ''}`} aria-busy={phase === 'on'} aria-label="Chargement de PETRA">
      <Emblem size={112} />
      <div className="word">PETRA</div>
      <div className="motto">Plus fort aujourd’hui, plus utile demain.</div>
      <div className="bar" aria-hidden="true"><div style={{ width: `${step.total ? pct : 8}%` }} /></div>
      <div className="what">{step.total ? `Échauffement des exercices · ${step.done}/${step.total}` : 'Échauffement'}</div>
    </div>
  )
}

const SHOW_AFTER_MS = 120 // déjà prêt : rien ne s'affiche
const LOADER_MIN_MS = 450 // une fois affiché, pas de clignotement
const LOADER_MAX_MS = 4000

/** Animations visibles à l'écran qui n'ont pas encore dessiné leur première image. */
function visibleNotReady(): number {
  const h = window.innerHeight
  return [...document.querySelectorAll<HTMLElement>('.ex3d')].filter((el) => {
    if (el.classList.contains('ready')) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.bottom > 0 && r.top < h
  }).length
}

/**
 * Mini écran de chargement à l'ouverture d'un écran (programme, séance, fiche) : il reste devant tant que les
 * animations des exercices ne sont pas prêtes et que celles visibles n'ont pas dessiné leur première image.
 */
export function ScreenLoader({ ids, label }: { ids: (string | undefined)[]; label: string }) {
  const [shown, setShown] = useState(false)
  const [step, setStep] = useState<{ done: number; total: number }>({ done: 0, total: 0 })
  const [phase, setPhase] = useState<'on' | 'out' | 'gone'>('on')
  const key = ids.join(',')

  useEffect(() => {
    let alive = true
    let shownAt = 0
    const t0 = performance.now()
    const showTimer = window.setTimeout(() => { if (alive) { shownAt = performance.now(); setShown(true) } }, SHOW_AFTER_MS)
    const finish = () => {
      if (!alive) return
      window.clearTimeout(showTimer)
      if (!shownAt) { setPhase('gone'); return }
      const wait = Math.max(0, LOADER_MIN_MS - (performance.now() - shownAt))
      window.setTimeout(() => {
        if (!alive) return
        setPhase('out')
        window.setTimeout(() => alive && setPhase('gone'), 300)
      }, wait)
    }
    const waitFrames = () => {
      if (!alive) return
      if (!visibleNotReady() || performance.now() - t0 > LOADER_MAX_MS) finish()
      else window.setTimeout(waitFrames, 80)
    }
    preloadAnims(key.split(','), (done, total) => alive && setStep({ done, total }))
      .catch((e) => console.warn('3D', e))
      .finally(() => window.setTimeout(waitFrames, 0))
    return () => { alive = false; window.clearTimeout(showTimer) }
  }, [key])

  if (phase === 'gone' || !shown) return null
  const pct = step.total ? (step.done / step.total) * 100 : 10
  return (
    <div className={`splash mini${phase === 'out' ? ' out' : ''}`} aria-busy={phase === 'on'} aria-label={`Préparation de ${label}`}>
      <Emblem size={64} />
      <div className="word">{label}</div>
      <div className="bar" aria-hidden="true"><div style={{ width: `${pct}%` }} /></div>
      <div className="what">{step.total && step.done < step.total ? `Préparation des exercices · ${step.done}/${step.total}` : 'Mise en place'}</div>
    </div>
  )
}
