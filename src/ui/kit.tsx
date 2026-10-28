import { useEffect, useState, type ReactNode } from 'react'
import { IconBack } from './icons'
import { useData } from '../data/store'
import { activeTheme } from './theme'

export function TopBar({ title, onBack, right }: { title: ReactNode; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="topbar">
      {onBack && (
        <button className="icon-btn" onClick={onBack} aria-label="Retour">
          <IconBack />
        </button>
      )}
      <h1 className="ellipsis">{title}</h1>
      {right}
    </div>
  )
}

const IMG = `${import.meta.env.BASE_URL}img/`

export const imgUrl = (file: string) => `${IMG}${file}`

const useTheme = () => activeTheme(useData().settings)

export const Emblem = ({ size = 40 }: { size?: number }) => <img className="emblem" src={imgUrl(useTheme().emblem)} width={size} height={size} alt="" />

/** Logo complet : l'image d'origine pour le thème militaire, sinon emblème + PETRA dans la police du thème. */
export function LogoFull() {
  const t = useTheme()
  if (t.logo) return <img className="logo-full" src={imgUrl(t.logo)} alt="PETRA — Discipline, progrès, objectif" />
  return (
    <div className="logo-compose" role="img" aria-label="PETRA — Discipline, progrès, objectif">
      <img src={imgUrl(t.emblem)} alt="" />
      <div className="word">PETRA</div>
      <div className="rule"><i /><Stripe width={64} /><i /></div>
      <div className="motto">Discipline · Progrès · Objectif</div>
    </div>
  )
}

export function Stripe({ width = 36 }: { width?: number }) {
  return (
    <span className="stripe" style={{ width }}>
      <i />
      <i />
      <i />
    </span>
  )
}

/** En-tête d'écran PETRA : emblème + titre en capitales + liseré tricolore + sous-titre. */
export function Header({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="header">
      <Emblem />
      <div className="grow">
        <h1 className="ellipsis">{title}</h1>
        <Stripe />
        {sub && <div className="sub">{sub}</div>}
      </div>
      {right}
    </div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="section-title">
      <span className="grow">{children}</span>
      {right}
    </div>
  )
}

/** Anneau de progression. */
export function Ring({ value, size = 76 }: { value: number; size?: number }) {
  const r = 32
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="7" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={v >= 1 ? 'var(--success)' : 'var(--olive-light)'} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} />
      </svg>
      <span>{Math.round(v * 100)} %</span>
    </div>
  )
}

export function Progress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className={`progress${v >= 1 ? ' full' : ''}`}>
      <div style={{ width: `${v * 100}%` }} />
    </div>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const h = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    window.addEventListener('petra:back', h)
    return () => window.removeEventListener('petra:back', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="grabber" />
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <button className={`toggle${on ? ' on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
}

/** Champ numérique qui accepte la virgule et laisse vide = non renseigné. */
export function NumInput({ value, onChange, step = 1, placeholder, width }: { value?: number; onChange: (v: number | undefined) => void; step?: number; placeholder?: string; width?: number }) {
  const [text, setText] = useState(value == null ? '' : String(value))
  useEffect(() => {
    setText((t) => (parse(t) === value ? t : value == null ? '' : String(value)))
  }, [value])
  return (
    <input
      className="num"
      style={width ? { width } : undefined}
      inputMode="decimal"
      step={step}
      placeholder={placeholder}
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        setText(e.target.value)
        onChange(parse(e.target.value))
      }}
    />
  )
}

function parse(t: string): number | undefined {
  const n = parseFloat(t.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title?: ReactNode; children?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      {title && <div className="t">{title}</div>}
      {children && <div className="small">{children}</div>}
    </div>
  )
}

let toastTimer: number | undefined
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent('petra:toast', { detail: message }))
}

export function ToastHost() {
  const [msg, setMsg] = useState<string>()
  useEffect(() => {
    const h = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail)
      window.clearTimeout(toastTimer)
      toastTimer = window.setTimeout(() => setMsg(undefined), 2200)
    }
    window.addEventListener('petra:toast', h)
    return () => window.removeEventListener('petra:toast', h)
  }, [])
  return msg ? <div className="toast">{msg}</div> : null
}

export function confirmAction(message: string): boolean {
  return window.confirm(message)
}
