import { useEffect, useMemo, useRef, useState } from 'react'
import type { Level, RegionId } from '../logic/body'
import { LEVELS } from '../logic/body'
import { MUSCLES_FINE } from '../data/anatomy'
import { BODY_THEME } from './bodyTheme'
import { BodyFigure } from './BodyMap'
import { loadEngine, type BodyHandle } from './engine3d'

/**
 * Schéma du corps en 3D (PCTRA) : le mannequin des animations, debout, qui tourne lentement sur lui-même.
 * Ses muscles prennent la couleur de leur niveau ; un muscle pas travaillé garde la teinte du mannequin.
 * On le fait tourner à la souris et on clique sur un muscle pour le choisir. Si la 3D ne se charge pas,
 * la planche face / dos reprend sa place.
 */
export function Body3D({
  levelOf,
  selected,
  onSelect,
  labelOf,
  compact = false,
}: {
  levelOf: (id: RegionId) => Level
  selected?: RegionId
  onSelect: (id: RegionId) => void
  labelOf: (id: RegionId) => string
  compact?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const handle = useRef<BodyHandle | null>(null)
  const pickRef = useRef(onSelect)
  pickRef.current = onSelect
  const [hover, setHover] = useState<RegionId>()
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const colors = useMemo(() => {
    const out: Record<string, string> = {}
    for (const l of LEVELS) if (l.level > 0) out[`lv${l.level}`] = BODY_THEME.levels3d[l.level]
    return out
  }, [])
  // Couleur de chaque muscle d'après son niveau (recalculée quand les données changent).
  const byMuscle = useMemo(() => {
    const out: Record<string, string> = {}
    for (const id of MUSCLE_IDS) {
      const lv = levelOf(id)
      if (lv > 0) out[id] = colors[`lv${lv}`]
    }
    return out
  }, [levelOf, colors])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let alive = true
    loadEngine()
      .then((e) => {
        if (!alive) return
        handle.current = e.body(el, {
          colors: byMuscle,
          selected,
          onPick: (id) => pickRef.current(id as RegionId),
          onHover: (id) => setHover(id as RegionId | undefined),
          onReady: () => alive && setReady(true),
        })
      })
      .catch((err) => { console.warn('3D corps', err); if (alive) setFailed(true) })
    return () => { alive = false; handle.current?.destroy(); handle.current = null }
    // le mannequin est construit une fois ; couleurs et sélection passent par set()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { handle.current?.set({ colors: byMuscle, selected }) }, [byMuscle, selected])

  if (failed)
    return (
      <>
        <BodyFigure side="front" levelOf={levelOf} selected={selected} onSelect={onSelect} labelOf={labelOf} />
        <BodyFigure side="back" levelOf={levelOf} selected={selected} onSelect={onSelect} labelOf={labelOf} />
      </>
    )
  const shown = hover ?? selected
  return (
    <div ref={ref} className={`body3d${compact ? ' compact' : ''}${ready ? ' ready' : ''}`} role="img" aria-label="Mannequin 3D, muscles colorés selon le travail fait">
      {shown && <span className="body3d-tip">{labelOf(shown)}</span>}
      {!compact && <span className="body3d-hint">Glisse pour le tourner · clique sur un muscle</span>}
    </div>
  )
}

const MUSCLE_IDS = MUSCLES_FINE.map((m) => m.id as RegionId)
