import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = (props: P) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

export const IconHome = (p: P) => (<svg {...base(p)}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>)
export const IconCalendar = (p: P) => (<svg {...base(p)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>)
export const IconDumbbell = (p: P) => (<svg {...base(p)}><path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12" /></svg>)
export const IconCheckList = (p: P) => (<svg {...base(p)}><path d="M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17M11 6h9M11 12h9M11 18h9" /></svg>)
export const IconUser = (p: P) => (<svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>)
export const IconPlus = (p: P) => (<svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>)
export const IconBack = (p: P) => (<svg {...base(p)}><path d="M15 5l-7 7 7 7" /></svg>)
export const IconCheck = (p: P) => (<svg {...base({ strokeWidth: 3, ...p })}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>)
export const IconX = (p: P) => (<svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>)
export const IconTrash = (p: P) => (<svg {...base(p)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>)
export const IconPlay = (p: P) => (<svg {...base(p)}><path d="M7 4.5v15l13-7.5z" fill="currentColor" /></svg>)
export const IconClock = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>)
export const IconHistory = (p: P) => (<svg {...base(p)}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 8v4l3 2" /></svg>)
export const IconTrophy = (p: P) => (<svg {...base(p)}><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 13v4M8 21h8M9 17h6v4H9z" /></svg>)
export const IconSkip = (p: P) => (<svg {...base(p)}><path d="M5 5l9 7-9 7zM18 5v14" /></svg>)
export const IconArrowRight = (p: P) => (<svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>)
export const IconChevron = (p: P) => (<svg {...base(p)}><path d="M9 6l6 6-6 6" /></svg>)
export const IconUp = (p: P) => (<svg {...base(p)}><path d="M6 15l6-6 6 6" /></svg>)
export const IconDown = (p: P) => (<svg {...base(p)}><path d="M6 9l6 6 6-6" /></svg>)
export const IconEdit = (p: P) => (<svg {...base(p)}><path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" /></svg>)
export const IconFlame = (p: P) => (<svg {...base(p)}><path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.5 3 2.5 3-1-3 0-6 0-8z" /></svg>)
export const IconSearch = (p: P) => (<svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>)
export const IconCopy = (p: P) => (<svg {...base(p)}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V4H4v12h4" /></svg>)
export const IconPostpone = (p: P) => (<svg {...base(p)}><path d="M4 12h12M12 6l6 6-6 6M20 5v14" /></svg>)

export function Helmet(props: P) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <defs>
        <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2c06d" />
          <stop offset="1" stopColor="#9c7a2e" />
        </linearGradient>
      </defs>
      <path d="M6 58l14-20 8 9 10-16 20 27z" fill="#3a3229" />
      <path d="M32 2c5 0 9 2.4 11 6H21c2-3.6 6-6 11-6z" fill="#b8462f" />
      <path d="M32 8c-10.5 0-18 7.6-18 18v13l7 4v9h7V36h-5v-6h18v6h-5v16h7v-9l7-4V26C50 15.6 42.5 8 32 8z" fill="url(#hg)" />
      <path d="M28 36h8v16h-8z" fill="#15120e" />
    </svg>
  )
}
