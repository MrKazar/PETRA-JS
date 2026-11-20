import { useId } from 'react'
import type { Icon, Metal } from '../logic/achievements'

/** Médaille en forme de bouclier rond (aspis) : jante en métal, frise, icône au centre. */

const METALS: Record<Metal | 'locked' | 'secret', { hi: string; lo: string; field: string; ink: string }> = {
  bronze: { hi: '#f0b37a', lo: '#6e3a19', field: '#a3602f', ink: '#3a1d0c' },
  argent: { hi: '#ffffff', lo: '#7c828a', field: '#b9bec5', ink: '#2c3036' },
  or: { hi: '#fff0a8', lo: '#9a6812', field: '#d9a63c', ink: '#4a3005' },
  platine: { hi: '#ffffff', lo: '#7fa6b8', field: '#cfe3ea', ink: '#203540' },
  locked: { hi: '#5a514b', lo: '#221d1a', field: '#36302b', ink: '#7a7068' },
  secret: { hi: '#4d4540', lo: '#1a1614', field: '#2a2420', ink: '#8f8378' },
}

const ICONS: Record<Icon, string> = {
  shield: 'M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  weight: 'M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 13v4M8 20h8',
  fist: 'M7 10V7a1.5 1.5 0 0 1 3 0v3M10 9V6a1.5 1.5 0 0 1 3 0v3M13 9V6.5a1.5 1.5 0 0 1 3 0V10M16 9a1.5 1.5 0 0 1 3 0v4a7 7 0 0 1-7 7h-1a5 5 0 0 1-5-5v-3a2 2 0 0 1 3-1.5',
  body: 'M12 3.5a2 2 0 1 0 0 .1M5 8.5l7 1 7-1M12 9.5v5M9 21l3-6.5 3 6.5',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  compass: 'M12 3a9 9 0 1 0 .1 0zM15.5 8.5l-2 5-5 2 2-5z',
  flame: 'M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.5 3 2.5 3-1-3 0-6 0-8z',
  clock: 'M12 3a9 9 0 1 0 .1 0zM12 7v5l3 2',
  gear: 'M12 9a3 3 0 1 0 .1 0zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  helmet: 'M6 20v-8a6 6 0 0 1 12 0v8h-4v-5h-1.5v5h-1v-5H10v5zM12 6V2.5M9 3h6',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
}

export function Medal({ metal, icon, size = 64, locked, secret, label }: { metal: Metal; icon: Icon; size?: number; locked?: boolean; secret?: boolean; label?: string }) {
  const id = useId().replace(/:/g, '')
  const m = METALS[secret ? 'secret' : locked ? 'locked' : metal]
  // Frise grecque (méandre) tout autour, faite de petits crochets.
  const frieze = Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * Math.PI * 2
    const r1 = 40.5
    const r2 = 36
    const x1 = 50 + Math.cos(a) * r1
    const y1 = 50 + Math.sin(a) * r1
    const x2 = 50 + Math.cos(a) * r2
    const y2 = 50 + Math.sin(a) * r2
    const b = a + (Math.PI * 2) / 40
    const x3 = 50 + Math.cos(b) * r2
    const y3 = 50 + Math.sin(b) * r2
    return `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}L${x3.toFixed(2)} ${y3.toFixed(2)}`
  }).join('')
  return (
    <svg className="medal" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`r${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={m.hi} />
          <stop offset="0.55" stopColor={m.lo} />
          <stop offset="1" stopColor={m.hi} />
        </linearGradient>
        <radialGradient id={`f${id}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor={m.hi} stopOpacity="0.9" />
          <stop offset="0.5" stopColor={m.field} />
          <stop offset="1" stopColor={m.lo} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#r${id})`} />
      <circle cx="50" cy="50" r="43" fill={m.lo} opacity="0.55" />
      <path d={frieze} fill="none" stroke={m.hi} strokeWidth="1.6" opacity={locked || secret ? 0.35 : 0.8} />
      <circle cx="50" cy="50" r="33.5" fill={`url(#f${id})`} stroke={m.lo} strokeWidth="1.5" />
      {secret ? (
        <text x="50" y="62" textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight="700" fontSize="34" fill={m.ink}>?</text>
      ) : (
        <g transform="translate(29 29) scale(1.75)" fill="none" stroke={m.ink} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity={locked ? 0.7 : 1}>
          <path d={ICONS[icon]} />
        </g>
      )}
    </svg>
  )
}

/** Écusson de niveau : bouclier en bronze avec le numéro. */
export function LevelBadge({ level, size = 64 }: { level: number; size?: number }) {
  const id = useId().replace(/:/g, '')
  const metal: Metal = level >= 90 ? 'platine' : level >= 50 ? 'or' : level >= 20 ? 'argent' : 'bronze'
  const m = METALS[metal]
  return (
    <svg className="medal" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Niveau ${level}`}>
      <defs>
        <linearGradient id={`l${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={m.hi} />
          <stop offset="0.55" stopColor={m.lo} />
          <stop offset="1" stopColor={m.hi} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#l${id})`} />
      <circle cx="50" cy="50" r="38" fill="#120e0b" stroke={m.lo} strokeWidth="2" />
      <text x="50" y={level >= 100 ? 60 : 62} textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight="700" fontSize={level >= 100 ? 30 : 36} fill={m.hi}>{level}</text>
    </svg>
  )
}
