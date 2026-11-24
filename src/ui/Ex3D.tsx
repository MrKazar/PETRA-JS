import { useEffect, useRef, useState } from 'react'
import { anatomyOf, MUSCLES_FINE } from '../data/anatomy'
import { cueOf, hasAnim, loadEngine, type View3D } from './engine3d'

const VIEWS: { v: View3D; label: string }[] = [{ v: 'iso', label: '3/4' }, { v: 'side', label: 'Profil' }, { v: 'front', label: 'Face' }]

/**
 * Animation 3D d'un exercice du catalogue. thumb / mini : vignette en boucle ; live / hero : grand format
 * avec la phase du mouvement, les vues 3/4 · profil · face et la rotation au doigt.
 */
export function Ex3D({ id, size = 'thumb', views = false }: { id?: string; size?: 'thumb' | 'mini' | 'live' | 'hero'; views?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const handle = useRef<{ setView: (v: View3D) => void; destroy: () => void } | null>(null)
  const big = size === 'live' || size === 'hero'
  const [phase, setPhase] = useState('')
  const [view, setView] = useState<View3D>('iso')
  const [failed, setFailed] = useState(false)
  const ok = hasAnim(id)

  useEffect(() => {
    if (!ok || !ref.current) return
    let alive = true
    const el = ref.current
    setView('iso')
    loadEngine()
      .then((e) => { if (alive) handle.current = e.attach(el, id, { big, onPhase: big ? setPhase : undefined }) })
      .catch((err) => { console.warn('3D', err); if (alive) setFailed(true) })
    return () => { alive = false; handle.current?.destroy(); handle.current = null }
  }, [id, ok, big])

  if (!ok || failed) return null
  return (
    <div ref={ref} className={`ex3d ${size}`} aria-hidden={!big || undefined} role={big ? 'img' : undefined} aria-label={big ? 'Animation de l’exercice' : undefined}>
      {big && phase && <span className="ex3d-phase">{phase}</span>}
      {views && (
        <div className="ex3d-views">
          {VIEWS.map((x) => (
            <button key={x.v} aria-pressed={view === x.v} onClick={(e) => { e.stopPropagation(); setView(x.v); handle.current?.setView(x.v) }}>{x.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Muscles de l'animation (mêmes couleurs que le mannequin) et consigne du geste. */
export function Ex3DInfo({ id }: { id?: string }) {
  if (!hasAnim(id)) return null
  const a = anatomyOf({ catalogId: id, name: '', group: '' })
  const label = (m: string) => MUSCLES_FINE.find((x) => x.id === m)?.label ?? m
  const cue = cueOf(id)
  return (
    <>
      <div className="ex3d-muscles">
        {a.primary.map((m) => <span key={m} className="m"><i />{label(m)}</span>)}
        {a.secondary.map((m) => <span key={m} className="m sec"><i />{label(m)}</span>)}
      </div>
      {cue && <p className="ex3d-cue">{cue}</p>}
    </>
  )
}
