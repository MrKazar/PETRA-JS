import type { Level, RegionId } from '../logic/body'

/**
 * Corps humain stylisé, face et dos. Chaque forme est dessinée pour la moitié gauche de l'image
 * puis reflétée autour de x = 100.
 */

type Shape = { id: RegionId; d: string }

const SILHOUETTE =
  'M100 56 L91 58 Q78 63 66 68 Q51 73 48 90 Q45 112 45 132 Q39 158 38 184 L35 212 Q41 218 48 210 L52 188 Q60 162 62 138 Q65 124 66 112 L68 142 Q66 170 69 192 Q64 240 70 298 Q64 340 70 382 L68 402 Q79 408 87 400 L86 382 Q92 340 90 300 Q96 252 98 208 L100 208 Z'

const FRONT: Shape[] = [
  { id: 'trap_sup', d: 'M91 60 L77 68 L92 67 Z' },
  { id: 'pec_haut', d: 'M98 71 L77 72 Q70 76 68 84 L98 84 Z' },
  { id: 'pec_milieu', d: 'M98 86 L68 86 Q66 92 68 97 L98 97 Z' },
  { id: 'pec_bas', d: 'M98 99 L69 99 Q78 108 98 105 Z' },
  { id: 'delt_ant', d: 'M75 69 Q61 69 55 80 Q56 90 60 99 Q63 86 75 73 Z' },
  { id: 'delt_lat', d: 'M54 83 Q48 92 50 106 L58 102 Q55 93 54 83 Z' },
  { id: 'dentele', d: 'M68 104 L77 107 L76 110 L68 108 Z' },
  { id: 'dentele', d: 'M68 111 L78 114 L77 117 L69 115 Z' },
  { id: 'dentele', d: 'M70 118 L79 121 L78 124 L71 122 Z' },
  { id: 'biceps', d: 'M58 106 Q50 118 51 132 Q56 138 61 132 Q64 119 63 106 Z' },
  { id: 'brachial', d: 'M50 120 Q47 129 48 138 L53 138 Q50 130 51 121 Z' },
  { id: 'brachio_radial', d: 'M48 141 L52 141 Q47 162 44 184 L41 183 Q42 160 48 141 Z' },
  { id: 'flechisseurs_ab', d: 'M54 141 L60 141 Q57 164 49 186 L45 185 Q48 164 54 141 Z' },
  { id: 'grand_droit', d: 'M98 110 L87 111 L87 129 L98 129 Z' },
  { id: 'grand_droit', d: 'M98 131 L87 131 L87 150 L98 150 Z' },
  { id: 'grand_droit', d: 'M98 152 L87 152 Q87 170 89 176 L98 184 Z' },
  { id: 'obliques', d: 'M84 120 Q76 121 73 127 Q74 152 84 172 Q82 146 84 120 Z' },
  { id: 'flechisseurs_hanche', d: 'M91 186 L81 192 Q83 200 87 204 L93 195 Z' },
  { id: 'moyen_fessier', d: 'M73 194 Q68 200 69 212 L76 202 Q76 196 73 194 Z' },
  { id: 'vaste_externe', d: 'M83 206 Q74 205 72 216 Q68 250 75 284 L80 286 Q79 240 83 206 Z' },
  { id: 'droit_femoral', d: 'M93 207 Q87 203 85 211 Q81 246 82 286 L88 288 Q94 250 93 207 Z' },
  { id: 'vaste_interne', d: 'M95 256 Q90 272 89 290 L95 290 Q97 272 95 256 Z' },
  { id: 'adducteurs', d: 'M99 205 L95 208 Q95 232 95 252 Q99 236 99 210 Z' },
  { id: 'tibial', d: 'M76 304 Q72 326 75 362 L79 362 Q79 330 81 304 Z' },
  { id: 'gastrocnemiens', d: 'M85 308 Q89 330 86 354 L83 356 Q83 334 85 308 Z' },
  { id: 'soleaire', d: 'M83 358 L86 356 Q86 368 84 378 L81 378 Q81 368 83 358 Z' },
]

const BACK: Shape[] = [
  { id: 'trap_sup', d: 'M98 57 L86 62 L72 72 L84 75 L98 76 Z' },
  { id: 'trap_moyen', d: 'M98 76 L74 75 Q78 84 86 92 L98 96 Z' },
  { id: 'trap_inf', d: 'M98 96 L86 92 Q90 108 98 128 Z' },
  { id: 'rhomboides', d: 'M94 80 L86 83 L87 99 L94 104 Z' },
  { id: 'coiffe', d: 'M81 86 Q74 88 72 96 Q76 104 84 104 Q86 94 84 88 Z' },
  { id: 'grand_rond', d: 'M72 99 Q66 102 64 108 L71 110 Q75 105 76 101 Z' },
  { id: 'grand_dorsal', d: 'M84 106 L92 126 L91 156 Q80 150 70 130 Q66 116 72 106 Q78 109 84 106 Z' },
  { id: 'delt_post', d: 'M72 72 Q59 70 53 83 Q53 95 58 102 Q64 88 74 77 Z' },
  { id: 'delt_lat', d: 'M52 86 Q47 94 50 106 L57 104 Q52 96 52 86 Z' },
  { id: 'triceps_lat', d: 'M53 107 Q47 120 49 136 L55 137 Q54 120 57 106 Z' },
  { id: 'triceps_long', d: 'M58 106 Q55 122 56 138 L60 138 Q64 120 62 105 Z' },
  { id: 'extenseurs_ab', d: 'M48 140 Q42 160 41 184 L49 186 Q57 164 60 140 Z' },
  { id: 'erecteurs', d: 'M98 128 L92 128 Q88 160 88 190 L98 191 Z' },
  { id: 'moyen_fessier', d: 'M88 190 Q74 188 70 199 Q71 205 74 208 Q80 197 90 195 Z' },
  { id: 'grand_fessier', d: 'M98 196 Q80 193 75 207 Q72 228 86 234 Q98 230 98 212 Z' },
  { id: 'adducteurs', d: 'M99 236 L96 238 Q97 252 96 266 Q99 252 99 240 Z' },
  { id: 'biceps_femoral', d: 'M86 238 Q76 236 73 250 Q72 272 78 292 L84 292 Q82 264 86 238 Z' },
  { id: 'semi_tendineux', d: 'M95 238 Q88 238 87 250 Q85 272 86 293 L91 293 Q96 266 95 238 Z' },
  { id: 'gastrocnemiens', d: 'M80 304 Q68 318 71 344 L80 354 Q79 326 82 304 Z' },
  { id: 'gastrocnemiens', d: 'M84 304 Q91 318 88 344 L83 358 Q82 330 84 304 Z' },
  { id: 'soleaire', d: 'M72 347 Q72 362 76 374 L84 374 Q86 364 87 350 L83 360 L80 356 Z' },
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
