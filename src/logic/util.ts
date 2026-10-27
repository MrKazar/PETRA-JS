export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Clé de date locale AAAA-MM-JJ. */
export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

/** 0 = lundi … 6 = dimanche. */
export function weekday(key: string): number {
  return (parseKey(key).getDay() + 6) % 7
}

export const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
export const WEEKDAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function formatDay(key: string): string {
  return parseKey(key).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function formatShortDay(key: string): string {
  return parseKey(key).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** 75 → « 1:15 » ; 3725 → « 1:02:05 ». */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

/** 90 → « 1 min 30 » ; 45 → « 45 s ». */
export function formatDuration(totalSec: number): string {
  const s = Math.round(totalSec)
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m >= 60) return `${Math.floor(m / 60)} h ${pad(m % 60)}`
  return r ? `${m} min ${pad(r)}` : `${m} min`
}
