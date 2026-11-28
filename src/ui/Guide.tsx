import { useEffect, useRef, useState } from 'react'
import { getData, useData } from '../data/store'
import { saveSettings } from '../logic/actions'
import { isDesktop } from '../logic/desktop'
import { useNav, type Route } from '../nav'
import { GUIDE_EVENT, TOUR, askGuide, isTab, tipFor, tipKey, type GuideTip } from '../data/guide'
import { Kranos } from './Kranos'

const STEPS = TOUR.filter((s) => !s.pc || isDesktop)

type Shown = { kind: 'tour'; step: number } | { kind: 'tip'; key: string; tip: GuideTip; manual?: boolean }

const markSeen = (key: string) => {
  const seen = getData().settings.guideSeen ?? []
  if (!seen.includes(key)) saveSettings({ guideSeen: [...seen, key] })
}

/** Rejouer la visite guidée (Paramètres). */
export function replayTour() {
  saveSettings({ guide: true, guideSeen: (getData().settings.guideSeen ?? []).filter((k) => k !== 'tour') })
}

/**
 * Kranos, le guide : visite guidée au premier lancement, puis une bulle la première fois qu'on ouvre
 * un écran, et à la demande avec le casque d'aide des en-têtes.
 */
export function GuideHost() {
  const data = useData()
  const nav = useNav()
  const route = nav.route
  const [shown, setShown] = useState<Shown | null>(null)
  const shownRef = useRef(shown)
  shownRef.current = shown
  const on = data.settings.guide !== false
  const seen = data.settings.guideSeen ?? []
  const seenKey = seen.join(',')
  const tourDone = seen.includes('tour')
  const key = tipKey(route)

  // Visite guidée au premier lancement (après l'écran de démarrage), puis bulles des écrans jamais vus.
  useEffect(() => {
    if (!on || shownRef.current) return
    if (!tourDone) {
      if (route.name !== 'today' || data.active) return
      const t = window.setTimeout(() => setShown({ kind: 'tour', step: 0 }), 1800)
      return () => window.clearTimeout(t)
    }
    if (!key || isTab(key) || seen.includes(key)) return
    const tip = tipFor(key)
    if (!tip) return
    const t = window.setTimeout(() => setShown({ kind: 'tip', key, tip }), 600)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, tourDone, key, route.name, !!data.active, seenKey])

  // Une bulle d'écran se ferme quand on quitte l'écran.
  useEffect(() => {
    const s = shownRef.current
    if (s?.kind === 'tip' && s.key !== key) setShown(null)
  }, [key])

  // Casque d'aide : Kranos réexplique l'écran affiché.
  useEffect(() => {
    const open = () => {
      const k = tipKey(nav.route)
      const tip = k && tipFor(k)
      if (tip) setShown({ kind: 'tip', key: k, tip: { ...tip, mood: tip.mood === 'neutre' ? 'reflechit' : tip.mood }, manual: true })
    }
    window.addEventListener(GUIDE_EVENT, open)
    return () => window.removeEventListener(GUIDE_EVENT, open)
  }, [nav.route])

  // Retour Android : ferme la bulle au lieu de quitter l'écran.
  useEffect(() => {
    if (!shown) return
    const back = (e: Event) => {
      e.preventDefault()
      close()
    }
    window.addEventListener('petra:back', back)
    return () => window.removeEventListener('petra:back', back)
  })

  // Pendant la visite : va sur l'onglet de l'étape et le met en valeur dans la barre.
  const step = shown?.kind === 'tour' ? STEPS[shown.step] : undefined
  useEffect(() => {
    if (!step) return
    if (nav.route.name !== step.tab) nav.reset({ name: step.tab })
    const el = document.querySelector(`.tabbar [data-tab="${step.tab}"]`)
    el?.classList.add('guide-focus')
    return () => el?.classList.remove('guide-focus')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  function close() {
    const s = shownRef.current
    if (!s) return
    if (s.kind === 'tour') markSeen('tour')
    else if (!s.manual) markSeen(s.key)
    setShown(null)
  }

  if (!shown) return null
  const tip = step ?? (shown.kind === 'tip' ? shown.tip : undefined)
  if (!tip) return null
  const tour = shown.kind === 'tour' ? shown : undefined
  const last = tour && tour.step === STEPS.length - 1
  return (
    <div className={`guide${route.name === 'workout' ? ' top' : ''}`} role="dialog" aria-label="Kranos, le guide">
      <Kranos mood={tip.mood} size={78} className="float" />
      <div className="guide-bubble">
        <div>{tip.text}</div>
        <div className="guide-actions">
          {tour && !last && (
            <button className="btn ghost sm" onClick={close}>Passer</button>
          )}
          <span className="grow" />
          {tour && <span className="small faint">{tour.step + 1}/{STEPS.length}</span>}
          {tour && !last ? (
            <button className="btn primary sm" onClick={() => setShown({ kind: 'tour', step: tour.step + 1 })}>Suivant</button>
          ) : (
            <button className="btn primary sm" onClick={close}>{tour ? 'C’est parti' : 'Compris'}</button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Petit casque d'aide dans les en-têtes : Kranos réexplique l'écran. */
export function GuideButton({ route }: { route: Route }) {
  const data = useData()
  if (data.settings.guide === false || !tipKey(route)) return null
  return (
    <button className="icon-btn guide-btn" onClick={askGuide} aria-label="Aide de Kranos">
      <Kranos size={30} />
    </button>
  )
}
