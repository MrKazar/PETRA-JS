import { useEffect, useState, type ReactNode } from 'react'
import { IconBack, Helmet } from './icons'

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

export function Brand() {
  return (
    <div className="brand">
      <Helmet />
      <div>
        <div className="name">PETRA</div>
        <div className="motto">Discipline · Progrès · Objectif</div>
      </div>
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

export function Empty({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <div>{children}</div>
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
