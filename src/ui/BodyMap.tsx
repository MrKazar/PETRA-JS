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
  { id: 'pec_haut', d: 'M98 71 L77 72 Q70 76 68 84 L98 84 Z' },
  { id: 'pec_milieu', d: 'M98 86 L68 86 Q66 92 68 97 L98 97 Z' },
  { id: 'pec_bas', d: 'M98 99 L69 99 Q78 108 98 105 Z' },
  { id: 'epaule_avant', d: 'M75 69 Q61 69 55 80 Q56 90 60 99 Q63 86 75 73 Z' },
  { id: 'epaule_cote', d: 'M54 83 Q48 92 50 106 L58 102 Q55 93 54 83 Z' },
  { id: 'biceps', d: 'M57 106 Q49 118 49 134 Q55 141 61 134 Q65 120 63 106 Z' },
  { id: 'avant_bras', d: 'M48 140 Q42 160 41 184 L49 186 Q57 164 60 140 Z' },
  { id: 'abdominaux', d: 'M98 110 L87 111 L87 129 L98 129 Z' },
  { id: 'abdominaux', d: 'M98 131 L87 131 L87 150 L98 150 Z' },
  { id: 'abdominaux', d: 'M98 152 L87 152 Q87 170 89 176 L98 184 Z' },
  { id: 'obliques', d: 'M84 110 Q72 113 70 121 Q72 150 84 172 Q82 140 84 110 Z' },
  { id: 'moyen_fessier', d: 'M73 194 Q68 200 69 212 L76 202 Q76 196 73 194 Z' },
  { id: 'quadriceps', d: 'M83 204 Q74 204 72 216 Q68 250 75 284 L80 286 Q79 240 83 204 Z' },
  { id: 'quadriceps', d: 'M94 206 Q87 202 85 210 Q81 246 82 286 L89 288 Q95 250 94 206 Z' },
  { id: 'quadriceps', d: 'M96 256 Q91 272 90 290 L96 290 Q98 272 96 256 Z' },
  { id: 'adducteurs', d: 'M98 204 L96 206 Q96 230 95 250 Q99 234 99 210 Z' },
  { id: 'mollets', d: 'M77 306 Q71 330 74 364 L80 366 Q81 334 82 306 Z' },
  { id: 'mollets', d: 'M85 308 Q89 330 86 360 L83 362 Q83 334 85 308 Z' },
]

const BACK: Shape[] = [
  { id: 'trapezes', d: 'M98 57 L86 62 L72 72 L98 80 Z' },
  { id: 'dos_epaisseur', d: 'M98 82 L75 76 Q78 90 85 99 L98 126 Z' },
  { id: 'dos_largeur', d: 'M84 101 L97 128 L96 156 Q82 150 70 130 Q66 104 76 81 Q78 93 84 101 Z' },
  { id: 'epaule_arriere', d: 'M72 72 Q59 70 53 83 Q53 95 58 102 Q64 88 74 77 Z' },
  { id: 'epaule_cote', d: 'M52 86 Q47 94 50 106 L57 104 Q52 96 52 86 Z' },
  { id: 'triceps', d: 'M53 107 Q47 120 49 136 L55 137 Q54 120 57 106 Z' },
  { id: 'triceps', d: 'M58 106 Q55 122 56 138 L60 138 Q64 120 62 105 Z' },
  { id: 'avant_bras', d: 'M48 140 Q42 160 41 184 L49 186 Q57 164 60 140 Z' },
  { id: 'lombaires', d: 'M98 158 L89 156 Q86 172 88 190 L98 191 Z' },
  { id: 'moyen_fessier', d: 'M88 190 Q74 188 70 199 Q71 205 74 208 Q80 197 90 195 Z' },
  { id: 'fessiers', d: 'M98 196 Q80 193 75 207 Q72 228 86 234 Q98 230 98 212 Z' },
  { id: 'ischio_jambiers', d: 'M86 238 Q76 236 73 250 Q72 272 78 292 L84 292 Q82 264 86 238 Z' },
  { id: 'ischio_jambiers', d: 'M95 238 Q88 238 87 250 Q85 272 86 293 L91 293 Q97 266 95 238 Z' },
  { id: 'mollets', d: 'M80 304 Q68 318 71 344 L80 354 Q79 326 82 304 Z' },
  { id: 'mollets', d: 'M84 304 Q91 318 88 344 L83 358 Q82 330 84 304 Z' },
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
  neglected?: Set<RegionId>
  onSelect: (id: RegionId) => void
  labelOf: (id: RegionId) => string
}) {
  const shapes = side === 'front' ? FRONT : BACK
  const shape = (s: Shape, i: number, mirror: boolean) => (
    <path
      key={`${i}-${mirror}`}
      d={s.d}
      transform={mirror ? 'matrix(-1 0 0 1 200 0)' : undefined}
      className={`bm-muscle lv${levelOf(s.id)}${selected === s.id ? ' sel' : ''}${neglected?.has(s.id) ? ' neg' : ''}`}
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
        {shapes.map((s, i) => shape(s, i, false))}
        {shapes.map((s, i) => shape(s, i, true))}
      </svg>
      <figcaption>{side === 'front' ? 'Face' : 'Dos'}</figcaption>
    </figure>
  )
}
