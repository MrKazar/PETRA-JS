import { useEffect, useState } from 'react'
import { EXECUTION_CREDIT, executionImages } from '../data/execution'
import { Sheet } from './kit'

/** Durée d'affichage de chaque position, en ms. */
const STEP_MS = 1100

/**
 * Démonstration d'exécution : alterne la position de départ et la position d'arrivée.
 * Un appui met en pause (ou relance) l'animation.
 */
export function ExecutionDemo({ catalogId }: { catalogId?: string }) {
  const images = executionImages(catalogId)
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)
  const [broken, setBroken] = useState(false)

  const first = images?.[0]
  useEffect(() => {
    if (!first || paused) return
    const t = window.setInterval(() => setStep((s) => 1 - s), STEP_MS)
    return () => window.clearInterval(t)
  }, [first, paused])

  if (!images || broken) return null
  return (
    <figure className="exec-demo" onClick={() => setPaused((p) => !p)} aria-label="Démonstration de l'exécution">
      <div className="exec-frame">
        {images.map((src, i) => (
          <img key={src} src={src} alt={i === 0 ? 'Position de départ' : 'Position d’arrivée'} className={i === step ? 'on' : ''} draggable={false} onError={() => setBroken(true)} />
        ))}
        <span className="exec-step">{step === 0 ? 'Départ' : 'Arrivée'}{paused ? ' · pause' : ''}</span>
      </div>
      <figcaption className="small faint">{EXECUTION_CREDIT} · appuie pour mettre en pause</figcaption>
    </figure>
  )
}

/** Bouton « Exécution » qui ouvre la démonstration dans un panneau (pendant la séance). */
export function ExecutionButton({ catalogId, name }: { catalogId?: string; name: string }) {
  const [open, setOpen] = useState(false)
  if (!executionImages(catalogId)) return null
  return (
    <>
      <button className="btn sm ghost" onClick={() => setOpen(true)} aria-label={`Voir l’exécution de ${name}`}>Exécution</button>
      <Sheet open={open} onClose={() => setOpen(false)} title={name}>
        {open && <ExecutionDemo catalogId={catalogId} />}
      </Sheet>
    </>
  )
}
