import type { Level, RegionId } from '../logic/body'

/**
 * Corps humain stylisé, face et dos. Chaque forme est dessinée pour la moitié gauche de l'image
 * puis reflétée autour de x = 100.
 */

type Shape = { id: RegionId; d: string }

const SILHOUETTE =
  'M100 56 L91 58 Q78 63 66 68 Q51 73 48 90 Q45 112 45 132 Q39 158 38 184 L35 212 Q41 218 48 210 L52 188 Q60 162 62 138 Q65 124 66 112 L68 142 Q66 170 69 192 Q64 240 70 298 Q64 340 70 382 L68 402 Q79 408 87 400 L86 382 Q92 340 90 300 Q96 252 98 208 L100 208 Z'

const FRONT: Shape[] = [
  { id: 'trapezes', d: 'M91 60 L77 68 L92 67 Z' },
  { id: 'pectoraux', d: 'M98 72 L76 73 Q66 82 67 98 Q80 110 98 105 Z' },
  { id: 'epaule_avant', d: 'M75 70 Q61 70 55 81 Q55 92 59 100 Q64 86 75 73 Z' },
  { id: 'epaule_cote', d: 'M54 83 Q48 92 50 106 L58 102 Q54 93 54 83 Z' },
  { id: 'biceps', d: 'M57 106 Q49 118 49 134 Q55 141 61 134 Q65 120 63 106 Z' },
  { id: 'avant_bras', d: 'M48 140 Q42 160 41 184 L49 186 Q57 164 60 140 Z' },
  { id: 'abdominaux', d: 'M98 110 L86 110 Q84 140 87 174 L98 182 Z' },
  { id: 'obliques', d: 'M83 110 Q72 113 70 121 Q72 150 84 172 Q81 140 83 110 Z' },
  { id: 'quadriceps', d: 'M95 202 Q78 196 72 212 Q68 250 76 288 L90 291 Q96 250 95 202 Z' },
  { id: 'adducteurs', d: 'M98 200 Q97 230 93 262 Q99 238 99 208 Z' },
  { id: 'mollets', d: 'M76 306 Q71 330 74 366 L83 368 Q87 334 88 306 Z' },
]

const BACK: Shape[] = [
  { id: 'trapezes', d: 'M98 58 L80 68 L72 75 L98 116 Z' },
  { id: 'epaule_arriere', d: 'M72 73 Q59 71 53 84 Q53 96 58 103 Q64 88 75 79 Z' },
  { id: 'epaule_cote', d: 'M52 86 Q47 94 50 106 L57 104 Q52 96 52 86 Z' },
  { id: 'dos', d: 'M76 80 Q64 100 70 130 Q82 150 96 156 L97 118 Z' },
  { id: 'triceps', d: 'M53 107 Q47 120 49 136 L59 138 Q63 120 61 105 Z' },
  { id: 'avant_bras', d: 'M48 140 Q42 160 41 184 L49 186 Q57 164 60 140 Z' },
  { id: 'lombaires', d: 'M98 159 L87 155 Q85 172 87 188 L98 190 Z' },
  { id: 'fessiers', d: 'M98 194 Q77 188 71 205 Q70 227 86 233 Q98 229 98 210 Z' },
  { id: 'ischio_jambiers', d: 'M94 238 Q77 235 73 250 Q72 272 78 292 L90 293 Q96 265 94 238 Z' },
  { id: 'mollets', d: 'M76 304 Q66 324 71 350 L84 362 Q90 332 88 304 Z' },
]

export function BodyFigure({
  side,
  levelOf,
  selected,
  neglected,
  onSelect,
  labelOf,
}: {
  side: 'front' | 'back'
  levelOf: (id: RegionId) => Level
  selected?: RegionId
  neglected: Set<RegionId>
  onSelect: (id: RegionId) => void
  labelOf: (id: RegionId) => string
}) {
  const shapes = side === 'front' ? FRONT : BACK
  const shape = (s: Shape, mirror: boolean) => (
    <path
      key={`${s.id}-${mirror}`}
      d={s.d}
      transform={mirror ? 'matrix(-1 0 0 1 200 0)' : undefined}
      className={`bm-muscle lv${levelOf(s.id)}${selected === s.id ? ' sel' : ''}${neglected.has(s.id) ? ' neg' : ''}`}
      onClick={() => onSelect(s.id)}
    >
      <title>{labelOf(s.id)}</title>
    </path>
  )
  return (
    <figure className="bm-fig">
      <svg viewBox="20 0 160 412" className="bm-svg" role="img" aria-label={side === 'front' ? 'Corps vu de face' : 'Corps vu de dos'}>
        <circle cx="100" cy="32" r="19" className="bm-base" />
        <path d={SILHOUETTE} className="bm-base" />
        <path d={SILHOUETTE} className="bm-base" transform="matrix(-1 0 0 1 200 0)" />
        {shapes.map((s) => shape(s, false))}
        {shapes.map((s) => shape(s, true))}
      </svg>
      <figcaption>{side === 'front' ? 'Face' : 'Dos'}</figcaption>
    </figure>
  )
}
