import { useId, type KeyboardEvent } from 'react'
import type { Level, RegionId } from '../logic/body'
import { PLATE, type PlateMuscle, type Side } from '../data/bodyPlate'
import { BODY_THEME } from './bodyTheme'

/**
 * Planche anatomique, face ou dos. Ce composant ne fait que dessiner : les tracés viennent de
 * data/bodyPlate.ts et les couleurs de ui/bodyTheme.ts. Chaque muscle est un groupe <g> avec un id
 * unique (les deux côtés du corps dedans), cliquable et atteignable au clavier.
 */

/** Regroupe les morceaux d'un même muscle (dentelé, grand droit…) en gardant l'ordre de dessin. */
function byMuscle(list: readonly PlateMuscle[]): { id: RegionId; paths: string[] }[] {
  const out: { id: RegionId; paths: string[] }[] = []
  for (const m of list) {
    const last = out[out.length - 1]
    if (last?.id === m.id) last.paths.push(...m.paths)
    else out.push({ id: m.id, paths: [...m.paths] })
  }
  return out
}

const VIEWS = { front: byMuscle(PLATE.views.front.muscles), back: byMuscle(PLATE.views.back.muscles) }

export function BodyFigure({
  side,
  levelOf,
  selected,
  neglected,
  onSelect,
  labelOf,
}: {
  side: Side
  levelOf: (id: RegionId) => Level
  selected?: RegionId
  neglected?: Set<RegionId>
  onSelect: (id: RegionId) => void
  labelOf: (id: RegionId) => string
}) {
  const view = PLATE.views[side]
  const shine = `bm-shine${useId().replace(/:/g, '')}`
  const key = (id: RegionId) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(id)
    }
  }
  return (
    <figure className="bm-fig">
      <svg viewBox={PLATE.viewBox} className={`bm-svg${selected ? ' has-sel' : ''}`} role="img" aria-label={side === 'front' ? 'Corps vu de face' : 'Corps vu de dos'}>
        <defs>
          {/* Volume : lumière en haut à gauche, bords du muscle dans l'ombre. */}
          <radialGradient id={shine} cx="0.42" cy="0.32" r="0.78">
            <stop offset="0" stopColor="#fff" stopOpacity={BODY_THEME.shine} />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.8" stopColor="#000" stopOpacity={BODY_THEME.shade * 0.45} />
            <stop offset="1" stopColor="#000" stopOpacity={BODY_THEME.shade} />
          </radialGradient>
          <radialGradient id={`${shine}-floor`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#000" stopOpacity="0.55" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="100" cy="411" rx="44" ry="4.5" fill={`url(#${shine}-floor)`} />
        <g id={`corps-${side}`} className="bm-body">
          <path d={PLATE.body} className="bm-rim" />
          <path d={PLATE.head} className="bm-rim" />
          <path d={PLATE.body} className="bm-tissue" />
          <path d={PLATE.head} className="bm-skin" />
        </g>
        {VIEWS[side].map((m) => {
          const lv = levelOf(m.id)
          const cls = `bm-muscle lv${lv}${selected === m.id ? ' sel' : ''}${neglected?.has(m.id) ? ' neg' : ''}`
          return (
            <g
              key={m.id}
              data-sel={selected === m.id || undefined}
              id={`${side === 'front' ? 'face' : 'dos'}-${m.id}`}
              data-muscle={m.id}
              className="bm-hit"
              tabIndex={0}
              role="button"
              aria-label={labelOf(m.id)}
              aria-pressed={selected === m.id}
              onClick={() => onSelect(m.id)}
              onKeyDown={key(m.id)}
            >
              <title>{labelOf(m.id)}</title>
              {m.paths.map((d, i) => (
                <g key={i}>
                  <path d={d} className={cls} />
                  <path d={d} fill={`url(#${shine})`} className="bm-shine" />
                </g>
              ))}
            </g>
          )
        })}
        <g className="bm-skin-layer">
          {view.skin.map((d, i) => (
            <path key={i} d={d} className="bm-skin" />
          ))}
        </g>
        <g className="bm-lines">
          {view.lines.map((d, i) => (
            <g key={i}>
              <path d={d} />
              <path d={d} transform="matrix(-1 0 0 1 200 0)" />
            </g>
          ))}
        </g>
      </svg>
      <figcaption>{side === 'front' ? 'Face' : 'Dos'}</figcaption>
    </figure>
  )
}
