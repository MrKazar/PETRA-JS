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

/** Médaille propre à chaque succès secret : couleurs et symbole uniques. */
interface SecretStyle {
  hi: string
  lo: string
  field: string
  ink: string
  /** Traits (viewBox 24), pleins (fill) ou texte. */
  d?: string
  fill?: string
  text?: string
}

export const SECRET_STYLES: Record<string, SecretStyle> = {
  mot_de_passe: { hi: '#f6d0ff', lo: '#5a1a7a', field: '#9b3fd0', ink: '#2a0838', d: 'M8 15a4 4 0 1 0 .1 0zM11 12l8-8M16 7l2 2M14 9l2 2' },
  curiosite: { hi: '#c9f3ff', lo: '#1d5468', field: '#3d9bb8', ink: '#08252f', d: 'M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6zM12 9.5a2.5 2.5 0 1 0 .1 0z' },
  defile: { hi: '#e8eefc', lo: '#253a78', field: '#4d6bc0', ink: '#0c1533', d: 'M6 21V3M6 4h11l-2.5 3.5L17 11H6' },
  sainte_barbe: { hi: '#ffd2a8', lo: '#7a1d0f', field: '#c2402a', ink: '#300a04', d: 'M7 21V8h10v13zM7 8V5h2v2h2V5h2v2h2V5h2v3M10.5 21v-4a1.5 1.5 0 0 1 3 0v4M10 12h4' },
  resolution: { hi: '#fff3c4', lo: '#7a5a10', field: '#d8a832', ink: '#2e2004', d: 'M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3', fill: 'M12 9.5a2.5 2.5 0 1 0 .1 0z' },
  hors_treve: { hi: '#d5f5d0', lo: '#1c4a22', field: '#3c8a46', ink: '#0a200d', d: 'M12 3l5 6h-3l4 5h-3l4 5H5l4-5H6l4-5H7zM12 19v2.5', fill: 'M12 1.6l.6 1.2 1.3.2-1 .9.3 1.3-1.2-.7-1.2.7.3-1.3-1-.9 1.3-.2z' },
  valentin: { hi: '#ffd0dc', lo: '#7a1030', field: '#d23a62', ink: '#33040f', d: 'M3 21l7-7M3 21v-3M3 21h3', fill: 'M14 19s-6-3.8-6-8.5A3.5 3.5 0 0 1 14 8.3a3.5 3.5 0 0 1 6 2.2c0 4.7-6 8.5-6 8.5z' },
  citrouilles: { hi: '#ffd9a0', lo: '#7a3a06', field: '#e07a1a', ink: '#2e1302', d: 'M12 6c-5 0-8 3-8 7s3 7 8 7 8-3 8-7-3-7-8-7zM12 6v14M8 7c-2 3-2 9 0 12.5M16 7c2 3 2 9 0 12.5M12 6c0-2 1-3 3-3.5' },
  vendredi13: { hi: '#d8d8d8', lo: '#141414', field: '#2b2b2b', ink: '#e8e8e8', text: '13' },
  solstice: { hi: '#fff7b0', lo: '#a85a00', field: '#f2b31a', ink: '#3d1f00', d: 'M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1M12 7a5 5 0 1 0 .1 0z' },
  loup_garou: { hi: '#e6ecff', lo: '#1a2350', field: '#36457f', ink: '#f2f4ff', d: 'M9 9.5a1 1 0 1 0 .1 0zM14.5 13a1.5 1.5 0 1 0 .1 0zM10 16a.8.8 0 1 0 .1 0z', fill: '' },
  garde_nuit: { hi: '#c6d0f5', lo: '#0f1638', field: '#222d63', ink: '#f2e6a8', d: 'M15 4a8 8 0 1 0 5 13A7 7 0 0 1 15 4zM18 6l.5 1.5L20 8l-1.5.5L18 10l-.5-1.5L16 8l1.5-.5z' },
  heure_miroir: { hi: '#e6fbff', lo: '#2b5a66', field: '#6fb3c4', ink: '#0d2a31', d: 'M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9M10 18h4' },
  anniversaire: { hi: '#ffe0f0', lo: '#7a2a58', field: '#cc5c9a', ink: '#2e0a1f', d: 'M4 21h16M5 21v-7h14v7M5 17c2 1 3-1 4.5 0s3 1 4.5 0 3-1 5 0M12 14v-4M12 7.5c-1-1 0-2.5 0-3.5 0 1 1 2.5 0 3.5z' },
  compte_bon: { hi: '#ffe1d6', lo: '#6e1a10', field: '#d0462e', ink: '#fff2ea', d: 'M12 3a9 9 0 1 0 .1 0zM12 7a5 5 0 1 0 .1 0z', fill: 'M12 10.5a1.5 1.5 0 1 0 .1 0z' },
  thermopyles: { hi: '#f2c58c', lo: '#5a2208', field: '#8e2a1e', ink: '#f6dcb4', d: 'M4 20L20 4M20 4l-1 4M20 4l-4 1M20 20L4 4M4 4l1 4M4 4l4 1M9 15l-3 3M15 15l3 3' },
  sans_retraite: { hi: '#f3d7a6', lo: '#5c3212', field: '#a86a2c', ink: '#2a1606', d: 'M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6zM12 7.5l-3 4.5h6zM12 12v5' },
  retour_flamme: { hi: '#ffe0a0', lo: '#8a1e06', field: '#e0561a', ink: '#2e0800', d: 'M12 4c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4 .3 1.5 1 2 2 2-.8-2.5 0-4.5 0-6zM8 13C5 12 3 9 3 6c2 2 4 2.5 5.5 3M16 13c3-1 5-4 5-7-2 2-4 2.5-5.5 3' },
  changement_tenue: { hi: '#f5e6ff', lo: '#3a2a5a', field: '#7a62b0', ink: '#1a1030', d: 'M12 3a9 9 0 0 0 0 18c1.5 0 2-1 1.5-2-.6-1.2.4-2.5 1.8-2.5H18a3 3 0 0 0 3-3c0-5.5-4-10.5-9-10.5z', fill: 'M7.5 11a1.3 1.3 0 1 0 .1 0zM10 7a1.3 1.3 0 1 0 .1 0zM14.5 7a1.3 1.3 0 1 0 .1 0zM17 10.5a1.3 1.3 0 1 0 .1 0z' },
  utile_demain: { hi: '#fff0c8', lo: '#7a4a10', field: '#e09a2e', ink: '#2e1a02', d: 'M2 18h20M6 18a6 6 0 0 1 12 0M12 9V3M9 6l3-3 3 3M4 13l1.5 1M20 13l-1.5 1' },
  premier_platine: { hi: '#ffffff', lo: '#6f98ab', field: '#d8eef5', ink: '#1a3340', d: 'M6 4h12l4 5-10 12L2 9zM2 9h20M9 4l3 17M15 4l-3 17M6 4l3 5M18 4l-3 5' },
  legende: { hi: '#fff6c8', lo: '#7a5c08', field: '#e8c040', ink: '#2e2002', d: 'M7 20c-4-3-5-9-2-14M17 20c4-3 5-9 2-14M5 9c-1.5-.5-2.5-1.5-2.5-3M4.5 13c-1.5 0-2.8-.8-3.3-2.3M6.5 16.5c-1.4.4-2.8 0-3.6-1M19 9c1.5-.5 2.5-1.5 2.5-3M19.5 13c1.5 0 2.8-.8 3.3-2.3M17.5 16.5c1.4.4 2.8 0 3.6-1M12 8l1.2 2.5 2.8.4-2 1.9.5 2.7-2.5-1.3-2.5 1.3.5-2.7-2-1.9 2.8-.4z' },
}

export function Medal({ metal, icon, size = 64, locked, secret, label, secretId }: { metal: Metal; icon: Icon; size?: number; locked?: boolean; secret?: boolean; label?: string; secretId?: string }) {
  const id = useId().replace(/:/g, '')
  const custom = secretId && !secret && !locked ? SECRET_STYLES[secretId] : undefined
  const m = custom ?? METALS[secret ? 'secret' : locked ? 'locked' : metal]
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
      ) : custom ? (
        custom.text ? (
          <text x="50" y="61" textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight="700" fontSize="30" fill={custom.ink}>{custom.text}</text>
        ) : (
          <g transform="translate(29 29) scale(1.75)" stroke={custom.ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {secretId === 'loup_garou' && <circle cx="12" cy="12" r="8.5" fill="#f2f4ff" opacity="0.9" stroke="none" />}
            {custom.fill ? <path d={custom.fill} fill={custom.ink} stroke="none" /> : null}
            {custom.d && <path d={custom.d} fill={secretId === 'loup_garou' ? '#9aa4cc' : 'none'} stroke={secretId === 'loup_garou' ? 'none' : custom.ink} />}
          </g>
        )
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
