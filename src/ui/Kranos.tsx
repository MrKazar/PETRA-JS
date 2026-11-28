import { useId, type ReactNode } from 'react'

/**
 * Kranos, la mascotte guide de PETRA : le casque chalcidien du logo, yeux lumineux en forme de fente.
 * Les couleurs viennent des variables CSS --kr-* (une palette par thème dans index.css).
 * Dessins validés : /mnt/project-files/petra-js/apercus/mascotte/ (16-kranos-expressions-final.png).
 */
export type KranosMood =
  | 'neutre'
  | 'content'
  | 'clin'
  | 'surpris'
  | 'motive'
  | 'concentre'
  | 'inquiet'
  | 'fatigue'
  | 'reflechit'
  | 'triomphe'
  | 'salut'
  | 'alerte'

const OUTLINE = 'M100,26 L132,30 L150,46 L157,76 L157,96 L145,98 L142,110 L154,120 L150,140 L138,152 L100,152 L62,152 L50,140 L46,120 L58,110 L55,98 L43,96 L43,76 L50,46 L68,30 L100,26 Z'
const OPENING = 'M100,79 L141,79 L141,95 L126,102 L112,107 L108,152 L100,152 L92,152 L88,107 L74,102 L59,95 L59,79 L100,79 Z'
const CREST = 'M84,32 L86,2 L100,-10 L114,2 L116,32 Z'
const NASAL = 'M95,58 L105,58 L105,104 L100,112 L95,104 Z'
const RIDGE = 'M95,26 L105,26 L105,58 L95,58 Z'

/** Œil gauche : la fente du casque réduite (52 % en largeur, 40 % en hauteur) autour de (76, 91). */
const SLIT = [[60, 80], [92, 80], [92, 104], [74, 101.5], [60, 95]]
const eye = (sc = 1) => SLIT.map(([x, y], i) => `${i ? 'L' : 'M'}${(76 + (x - 76) * 0.52 * sc).toFixed(1)},${(91 + (y - 91) * 0.4 * sc).toFixed(1)}`).join(' ') + ' Z'
const ARC_L = 'M68,93 Q76,85 84,93'
const ARC_R = 'M116,93 Q124,85 132,93'
const circle = (cx: number) => `M${cx - 5.5},91 a5.5,5.5 0 1,0 11,0 a5.5,5.5 0 1,0 -11,0`
const star = (cx: number, cy: number, r: number) => {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`
  }
  return d + 'Z'
}
const sparkle = (x: number, y: number, r: number) =>
  `M${x},${y - r} L${x + r * 0.25},${y - r * 0.25} L${x + r},${y} L${x + r * 0.25},${y + r * 0.25} L${x},${y + r} L${x - r * 0.25},${y + r * 0.25} L${x - r},${y} L${x - r * 0.25},${y - r * 0.25}Z`

const GLOW = 'var(--kr-glow)'
const HAND = { fill: 'var(--kr-c1)', stroke: 'var(--kr-st)', strokeWidth: 2.2, strokeLinejoin: 'round' as const }

export function Kranos({ mood = 'neutre', size = 64, className = '' }: { mood?: KranosMood; size?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  const blur = `url(#kb${id})`

  /** Forme pleine lumineuse (halo flou + forme nette). */
  const fill = (d: string, transform?: string, opacity = 1) => (
    <g transform={transform} opacity={opacity}>
      <path d={d} fill={GLOW} stroke={GLOW} strokeWidth={2} strokeLinejoin="round" filter={blur} />
      <path d={d} fill={GLOW} stroke={GLOW} strokeWidth={2} strokeLinejoin="round" />
    </g>
  )
  /** Trait lumineux (yeux fermés, rieurs…). */
  const line = (d: string, w = 4, opacity = 1) => (
    <g opacity={opacity}>
      <path d={d} stroke={GLOW} strokeWidth={w + 1.5} fill="none" strokeLinecap="round" filter={blur} />
      <path d={d} stroke={GLOW} strokeWidth={w} fill="none" strokeLinecap="round" />
    </g>
  )
  const left = (rot = 0, sc = 1, op = 1) => fill(eye(sc), `rotate(${rot} 76 91)`, op)
  const right = (rot = 0, sc = 1, op = 1) => fill(eye(sc), `translate(200,0) scale(-1,1) rotate(${rot} 76 91)`, op)
  const both = (rot = 0, sc = 1, op = 1) => (
    <>
      {left(rot, sc, op)}
      {right(rot, sc, op)}
    </>
  )

  let eyes: ReactNode
  let extra: ReactNode = null
  let hands: ReactNode = null
  let tilt = 0
  switch (mood) {
    case 'content':
      eyes = line(`${ARC_L} ${ARC_R}`)
      break
    case 'clin':
      eyes = (
        <>
          {left()}
          {line(ARC_R)}
        </>
      )
      hands = <Thumb x={176} y={120} s={1.05} flip />
      break
    case 'surpris':
      eyes = fill(`${circle(76)} ${circle(124)}`)
      break
    case 'motive':
      eyes = (
        <>
          {both(14, 1.1)}
          {both(14, 1.1, 0.5)}
        </>
      )
      extra = <path d="M150,40 l10,-10 M156,54 l14,-4 M146,28 l4,-14" stroke={GLOW} strokeWidth={4} strokeLinecap="round" />
      hands = (
        <>
          <Fist x={22} y={98} r={-10} s={1.1} />
          <Fist x={178} y={98} r={10} s={1.1} flip />
        </>
      )
      break
    case 'concentre':
      eyes = line('M69,92 L83,92 M117,92 L131,92', 3.5)
      break
    case 'inquiet':
      eyes = both(-14)
      extra = <path d="M160,54 Q152,66 156,72 Q160,78 166,72 Q169,64 160,54 Z" fill="#8cc8ff" stroke="#3a6a9a" strokeWidth={1.5} />
      break
    case 'fatigue':
      eyes = line('M68,90 Q76,96 84,90 M116,90 Q124,96 132,90', 3.5, 0.55)
      extra = (
        <g fill={GLOW} fontFamily="Cinzel, Georgia, serif" fontWeight={700}>
          <text x={150} y={40} fontSize={22} opacity={0.8}>z</text>
          <text x={166} y={22} fontSize={16} opacity={0.6}>z</text>
          <text x={178} y={8} fontSize={11} opacity={0.45}>z</text>
        </g>
      )
      break
    case 'reflechit':
      tilt = 6
      eyes = <g transform="translate(4,-3)">{both(0, 0.85)}</g>
      extra = (
        <g fill={GLOW}>
          <circle cx={150} cy={44} r={3.5} opacity={0.7} />
          <circle cx={160} cy={32} r={5} opacity={0.8} />
          <ellipse cx={176} cy={12} rx={17} ry={12} />
          <g fill="var(--kr-dark)">
            <circle cx={169} cy={12} r={2.4} />
            <circle cx={176} cy={12} r={2.4} />
            <circle cx={183} cy={12} r={2.4} />
          </g>
        </g>
      )
      break
    case 'triomphe':
      eyes = fill(`${star(76, 91, 9)} ${star(124, 91, 9)}`)
      extra = <path d={[sparkle(36, 30, 10), sparkle(166, 40, 8), sparkle(28, 120, 6), sparkle(174, 118, 9)].join(' ')} fill={GLOW} />
      hands = (
        <>
          <Fist x={22} y={58} r={-15} s={1.1} />
          <Fist x={178} y={58} r={15} s={1.1} flip />
        </>
      )
      break
    case 'salut':
      eyes = both()
      hands = (
        <g transform="translate(160,70) rotate(-62) scale(1.3)">
          <path d="M-8,9 L-8,-6 Q-8,-15 0,-15 Q8,-15 8,-6 L8,9 Q8,13 0,13 Q-8,13 -8,9Z" {...HAND} />
          <path d="M-2.7,-14 L-2.7,-6 M2.7,-14 L2.7,-6" stroke="var(--kr-st)" strokeWidth={1.6} />
        </g>
      )
      break
    case 'alerte':
      eyes = fill(`${circle(76)} ${circle(124)}`)
      extra = (
        <g>
          <circle cx={160} cy={28} r={15} fill="#c0392b" stroke="#5a160e" strokeWidth={2} />
          <text x={160} y={36} textAnchor="middle" fontFamily="Barlow, sans-serif" fontWeight={700} fontSize={22} fill="#fff">!</text>
        </g>
      )
      break
    default:
      eyes = both()
  }

  return (
    <svg className={`kranos ${className}`} viewBox="0 -16 200 190" width={size} height={(size * 190) / 200} aria-hidden="true">
      <defs>
        <linearGradient id={`kh${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--kr-c1)' }} />
          <stop offset="1" style={{ stopColor: 'var(--kr-c2)' }} />
        </linearGradient>
        <linearGradient id={`kv${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--kr-c2)' }} />
          <stop offset=".45" style={{ stopColor: 'var(--kr-c1)' }} />
          <stop offset="1" style={{ stopColor: 'var(--kr-c2)' }} />
        </linearGradient>
        <linearGradient id={`kc${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--kr-cr2)' }} />
          <stop offset=".5" style={{ stopColor: 'var(--kr-cr)' }} />
          <stop offset="1" style={{ stopColor: 'var(--kr-cr2)' }} />
        </linearGradient>
        <filter id={`kb${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={4} />
        </filter>
      </defs>
      {/* Axes de construction : visibles seulement avec le thème Architecte (Kranos « Plan »). */}
      <g className="kr-guides" fill="none" stroke="#5fb0ff" strokeWidth={1}>
        <path d="M100,-14 L100,170" strokeDasharray="6 4" opacity={0.7} />
        <path d="M30,91 L170,91" strokeDasharray="6 4" opacity={0.5} />
        <circle cx={100} cy={91} r={74} strokeDasharray="3 5" opacity={0.45} />
      </g>
      <g transform={tilt ? `rotate(${tilt} 100 90)` : undefined}>
        <path d={CREST} fill={`url(#kc${id})`} stroke="var(--kr-cr2)" strokeWidth={2} strokeLinejoin="round" />
        <path d="M93,30 L93,0 M100,30 L100,-8 M107,30 L107,0" stroke="var(--kr-cr2)" strokeWidth={1.8} opacity={0.6} />
        <path d={OUTLINE} fill={`url(#kh${id})`} stroke="var(--kr-st)" strokeWidth={3} strokeLinejoin="round" />
        <path d={RIDGE} fill={`url(#kv${id})`} stroke="var(--kr-st)" strokeWidth={2} />
        <path d={OPENING} fill="var(--kr-dark)" />
        {eyes}
        <path d={NASAL} fill={`url(#kv${id})`} stroke="var(--kr-st)" strokeWidth={2} strokeLinejoin="round" />
      </g>
      {extra}
      {hands}
    </svg>
  )
}

const handTransform = (x: number, y: number, r: number, s: number, flip?: boolean) => {
  const k = s * 1.25
  return `translate(${x},${y}) rotate(${r}) scale(${flip ? -k : k},${k})`
}

function Fist({ x, y, r = 0, s = 1, flip }: { x: number; y: number; r?: number; s?: number; flip?: boolean }) {
  return (
    <g transform={handTransform(x, y, r, s, flip)}>
      <rect x={-9} y={-9} width={18} height={17} rx={6} {...HAND} />
      <path d="M-3,-9 L-3,-3 M3,-9 L3,-3" stroke="var(--kr-st)" strokeWidth={1.6} />
      <path d="M-9,1 Q-2,5 5,0" stroke="var(--kr-st)" strokeWidth={2} fill="none" />
    </g>
  )
}

function Thumb({ x, y, r = 0, s = 1, flip }: { x: number; y: number; r?: number; s?: number; flip?: boolean }) {
  return (
    <g transform={handTransform(x, y, r, s, flip)}>
      <rect x={-10} y={-20} width={8} height={15} rx={4} {...HAND} />
      <rect x={-10} y={-8} width={19} height={19} rx={6} {...HAND} />
      <path d="M-1,-2 L9,-2 M-1,4 L9,4" stroke="var(--kr-st)" strokeWidth={1.6} />
    </g>
  )
}
