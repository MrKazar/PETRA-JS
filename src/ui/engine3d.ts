import { PLATE } from '../data/bodyPlate'
import { anatomyOf, MUSCLES_FINE } from '../data/anatomy'
import { CATALOG } from '../data/catalog'
import { ANIM_CUES } from '../data/anim3d'

/** Moteur des animations 3D (public/3d/moteur.js, généré par scripts/3d/build_3d.cjs). */
export interface Engine3D {
  attach: (el: HTMLElement, id: string, opts?: { big?: boolean; onPhase?: (label: string) => void }) => { setView: (v: View3D) => void; destroy: () => void } | null
  has: (id: string) => boolean
}
export type View3D = 'iso' | 'side' | 'front'

export const hasAnim = (id?: string): id is string => !!id && id in ANIM_CUES
export const cueOf = (id?: string) => (id ? ANIM_CUES[id] : undefined)

let engine: Promise<Engine3D> | undefined

/** Balise <script> plutôt que fetch : fetch ne lit pas les fichiers locaux de l'appli PC (file://). */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => { s.remove(); reject(new Error(`moteur 3D introuvable : ${src}`)) }
    document.head.append(s)
  })
}

/** Charge three et le moteur au premier usage (rien n'est chargé tant qu'aucune animation n'est affichée). */
export function loadEngine(): Promise<Engine3D> {
  engine ??= (async () => {
    const [THREE] = await Promise.all([import('three'), loadScript(`${import.meta.env.BASE_URL}3d/moteur.js`)])
    const factory = (window as unknown as { PETRA3D_FACTORY?: (T: unknown, plate: unknown) => Engine3D }).PETRA3D_FACTORY
    if (!factory) throw new Error('moteur 3D absent')
    const ex = Object.fromEntries(CATALOG.filter((e) => hasAnim(e.id)).map((e) => [e.id, anatomyOf({ catalogId: e.id, name: '', group: '' })]))
    const labels = Object.fromEntries(MUSCLES_FINE.map((m) => [m.id, m.label]))
    const plate = { head: PLATE.head, front: PLATE.views.front, back: PLATE.views.back, ex, labels }
    return factory(THREE, plate)
  })()
  engine.catch(() => { engine = undefined })
  return engine
}
