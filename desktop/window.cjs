// Réglages de la fenêtre de PCTRA (propres à ce PC, jamais synchronisés) : mode d'affichage,
// taille, zoom, premier plan, lancement au démarrage de Windows.

/** Tailles proposées pour le mode fenêtré. */
const SIZES = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1600, height: 1000 },
  { width: 1920, height: 1080 },
]
const MODES = ['fenetre', 'maximise', 'plein-ecran']
const MIN = { width: 900, height: 600 }

const DEFAULTS = {
  /** fenetre | maximise | plein-ecran */
  mode: 'fenetre',
  width: 1280,
  height: 860,
  /** Position et taille au moment de la fermeture (mode fenêtré), pour rouvrir au même endroit. */
  bounds: null,
  /** Taille du texte et de l'interface : 0,8 à 1,5. */
  zoom: 1,
  onTop: false,
  autoStart: false,
  /** Au démarrage de Windows, ouvrir PCTRA réduit dans la barre des tâches. */
  startMinimized: true,
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/** Complète et corrige des réglages lus sur le disque ou envoyés par la page. */
function normalizePrefs(raw) {
  const p = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) }
  if (!MODES.includes(p.mode)) p.mode = DEFAULTS.mode
  p.width = clamp(Math.round(Number(p.width) || DEFAULTS.width), MIN.width, 7680)
  p.height = clamp(Math.round(Number(p.height) || DEFAULTS.height), MIN.height, 4320)
  p.zoom = clamp(Math.round((Number(p.zoom) || 1) * 20) / 20, 0.8, 1.5)
  p.onTop = !!p.onTop
  p.autoStart = !!p.autoStart
  p.startMinimized = p.startMinimized !== false
  const b = p.bounds
  p.bounds = b && [b.x, b.y, b.width, b.height].every(Number.isFinite) ? { x: b.x, y: b.y, width: b.width, height: b.height } : null
  return p
}

/** La fenêtre enregistrée est-elle encore visible sur un des écrans (écran débranché, résolution changée…) ? */
function boundsVisible(bounds, workAreas) {
  if (!bounds) return false
  return workAreas.some((a) => {
    const w = Math.min(bounds.x + bounds.width, a.x + a.width) - Math.max(bounds.x, a.x)
    const h = Math.min(bounds.y + bounds.height, a.y + a.height) - Math.max(bounds.y, a.y)
    return w >= 200 && h >= 120
  })
}

module.exports = { SIZES, MODES, MIN, DEFAULTS, normalizePrefs, boundsVisible }
