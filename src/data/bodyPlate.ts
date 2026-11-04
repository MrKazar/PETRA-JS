import type { FineId } from './anatomy'

/**
 * Planche anatomique du schéma du corps (PCTRA) : uniquement des données, aucun dessin dans le
 * composant. Repère commun aux deux vues : viewBox 0 0 200 420, axe du corps en x = 100.
 *
 * Chaque muscle est décrit pour la moitié gauche de l'image par une liste de points de repère ; la
 * courbe passe par ces points (spline de Catmull-Rom, donc des contours souples), puis elle est
 * reflétée pour l'autre côté. Pour retoucher un muscle, on déplace ses points ; pour en ajouter un,
 * on ajoute une ligne (l'id doit exister dans MUSCLES_FINE). L'ordre est l'ordre de dessin, du plus
 * profond au plus superficiel.
 */

type Pt = readonly [number, number]
type Piece = readonly [FineId, readonly Pt[]]
export type Side = 'front' | 'back'

const FRONT: readonly Piece[] = [
  ['cou', [[89.5,45],[91.5,50],[94.5,59],[97.6,68.5],[95.5,70.5],[92,66],[89,56],[88,49]]],
  ['trap_sup', [[89,55],[86,62],[78,67.5],[68,71],[71,73.2],[80,72],[88,69.5],[92.5,66]]],
  ['obliques', [[87.4,124],[87.4,142],[87.6,160],[89,176],[91,188],[85,186],[77,179],[71,170],[68.6,158],[68.4,146],[70,136],[76,132],[82,127]]],
  ['dentele', [[66.6,105],[72,106],[79,110.5],[77,114],[70,113],[66.4,110.5]]],
  ['dentele', [[66.4,114],[72,115],[80,119.5],[78,123],[70.5,121.6],[66.6,119.4]]],
  ['dentele', [[66.8,122.6],[73,124],[81,128.5],[79,132],[71,130.4],[67,128]]],
  ['dentele', [[67.6,131],[74,132.6],[81.5,137],[79,140],[72,138.4],[68,136]]],
  ['grand_droit', [[98,113.5],[92,113.6],[88.6,116.5],[88.2,123],[89,128.6],[98,128.6]]],
  ['grand_droit', [[98,130.4],[89.2,130.4],[88.2,137],[88.2,143.5],[89.2,146.4],[98,146.4]]],
  ['grand_droit', [[98,148.2],[89.3,148.2],[88.3,155],[88.3,161.5],[89.4,164.4],[98,164.4]]],
  ['grand_droit', [[98,166.2],[89.5,166.2],[88.8,176],[90.2,186],[93.8,194],[98,199]]],
  ['flechisseurs_hanche', [[92.5,197],[88,195.5],[84,198],[82.5,204],[85.5,210],[90,211.5],[93,205.5]]],
  ['tfl', [[73,181],[69.6,189],[68.4,199],[69.6,209],[72.6,216],[76,207],[77.4,195],[76.6,186]]],
  ['adducteurs', [[98.4,212],[93,212.5],[89.6,218],[91,232],[94,247],[97,256],[99,240],[99,224]]],
  ['vaste_externe', [[76.6,206],[72,214],[68.4,232],[67.4,252],[68.4,272],[72,288],[78,298],[81,294],[79.4,276],[78.4,252],[79.4,228],[80.6,212]]],
  ['droit_femoral', [[80.6,205],[79.4,228],[78.4,252],[79.4,276],[82,294],[86,298],[89,288],[90.4,272],[89.4,250],[86.8,232],[84.6,216],[83,207]]],
  ['couturier', [[78,182.6],[81.2,181.6],[84.4,192],[88.8,214],[93.6,238],[96.2,256],[97.6,272],[95.4,274],[92.4,258],[88.4,240],[83.6,216],[79.4,195]]],
  ['vaste_interne', [[88.6,250],[87.2,266],[86.2,282],[87.4,294],[91.4,300.5],[95.6,296],[97.6,284],[97.4,268],[94.6,256]]],
  ['fibulaires', [[73.4,316],[70.2,322],[67.8,336],[67.8,352],[69.6,368],[72.6,380],[74.6,376],[73.2,362],[72,346],[72.4,330],[75,319]]],
  ['tibial', [[80,313.6],[76,320],[73.8,334],[73.8,350],[75.4,366],[78,380],[80.6,386],[82,370],[82,348],[81.6,330]]],
  ['gastrocnemiens', [[86.4,312],[90.2,320],[92.2,336],[91.4,350],[88.4,360],[86.4,364],[86,340]]],
  ['soleaire', [[86.4,364.4],[88.6,360.6],[91.4,352.4],[91.8,366],[90.4,378],[88.4,386],[86.6,386]]],
  ['pec_bas', [[98,101],[84,101],[74,101],[66.4,101.6],[69,106.5],[77,111.6],[87,114.2],[98,114.4]]],
  ['pec_milieu', [[98,87],[90,87],[80,89],[70.6,93.6],[63.6,98.4],[66.4,101.6],[74,101],[84,101],[98,101]]],
  ['pec_haut', [[97.6,73.4],[88,73],[78.4,74],[72.4,81],[67.6,90.6],[63.6,98.4],[70.6,93.6],[80,89],[90,87],[98,87]]],
  ['delt_lat', [[62,75],[55.4,78],[50.4,86],[48.6,96],[50,106],[54.6,112.4],[59.4,110],[57.6,101],[56.4,92],[57.2,82]]],
  ['delt_ant', [[78.4,73.6],[70,73.2],[62,75],[57.2,82],[56.4,92],[57.6,101],[59.4,110],[62.8,100.4],[66.6,90.6],[72.4,81.6]]],
  ['brachial', [[54.4,112],[50.8,122],[49.2,134],[50.2,146],[53.2,152],[55.2,143],[53.4,134],[53.8,124]]],
  ['biceps', [[60.4,108],[56.4,114],[53.8,124],[53.4,134],[55.2,143],[58.2,150.4],[61.4,146],[62.8,134],[62.8,120]]],
  ['brachio_radial', [[50.2,146.4],[46.4,154],[43.4,166],[41.4,180],[40.4,194],[42.8,196.4],[45.4,182],[48.4,166],[52.4,154],[53.4,150]]],
  ['flechisseurs_ab', [[53.4,150],[52.4,154],[48.4,166],[45.4,182],[42.8,196.4],[45.8,199],[49.4,186],[53.4,170],[56.4,156],[58.4,150.4]]]
]

const BACK: readonly Piece[] = [
  ['trap_sup', [[98,52],[94,54],[92,60],[88,66],[78,70],[68.4,73.2],[74,76],[84,78],[92,79.4],[98,80]]],
  ['trap_moyen', [[98,80],[92,79.4],[84,78],[74,76],[68.4,73.2],[70,77.6],[74,82],[81,86.4],[88,90.4],[94,95.6],[98,98]]],
  ['trap_inf', [[98,98],[94,95.6],[88,90.4],[86.4,96],[89,108],[93,122],[98,136]]],
  ['rhomboides', [[96.6,88],[91,90],[86.8,94],[86.6,103],[89,109],[93.4,104],[96.6,97]]],
  ['coiffe', [[85.4,89.6],[78,88],[72,91],[69,98],[71,105],[77,109.6],[84,110],[87.2,102]]],
  ['grand_rond', [[70.6,105.4],[66.4,108],[64.4,113],[67.4,117],[73.4,117],[78,113.4],[77,110]]],
  ['grand_dorsal', [[86.6,110],[80,113.4],[73.4,117],[67.4,119],[66.2,130],[68.2,144],[73,156],[80,166],[88,174],[93.6,178],[93.6,160],[92,138],[89.4,118]]],
  ['erecteurs', [[98,137],[94.6,138],[92.6,148],[91.6,164],[92,180],[93.6,192],[98,196]]],
  ['delt_lat', [[56,79],[51,84.4],[48.4,93],[48.6,103],[51.6,110],[55,107],[52.4,97],[52.4,87]]],
  ['delt_post', [[70.4,76.6],[62,75],[56,79],[52.4,87],[52.4,97],[55,107],[58.2,112],[61.2,104],[64.4,94],[68,86]]],
  ['triceps_lat', [[55,110.4],[50.6,118],[48.6,130],[49,142],[52,150],[54.6,142],[54.6,128],[56.6,116]]],
  ['triceps_long', [[58.4,110],[56.6,116],[54.6,128],[54.6,142],[56.2,150],[60,148],[62.6,136],[62.6,122],[61,112]]],
  ['extenseurs_ab', [[50.4,152],[46.4,160],[43.4,172],[41.4,186],[40.6,196],[44,198.4],[48,184],[52,170],[55,160],[57.4,152.4]]],
  ['moyen_fessier', [[92.4,180],[84,178],[76,180],[70.2,186],[68.4,194],[70.4,202],[75,204.4],[81,198],[88,192],[94,190]]],
  ['grand_fessier', [[98,192],[92,190.4],[84,193],[77,201],[73.4,212],[75.4,224],[81,231],[90,234.4],[97,233.4],[98.4,214]]],
  ['adducteurs', [[98.4,234],[96.4,240],[96.4,256],[97.4,270],[99,262],[99.2,244]]],
  ['biceps_femoral', [[84.6,236],[77,240],[71,250],[68.6,264],[69,280],[72,292],[77,300],[80.4,296],[80.4,280],[82,260],[85,244]]],
  ['semi_tendineux', [[95.4,236],[89,238],[85,244],[82,260],[80.4,280],[80.4,296],[84,302],[89,298],[93,286],[96,268],[97,250]]],
  ['fibulaires', [[71,322],[68,334],[67.8,350],[69.6,364],[72,358],[71.2,344],[72,330]]],
  ['soleaire', [[71,346],[72,360],[75,371],[78.6,379],[86.4,379],[90,371],[91.4,358],[91.2,348],[86.6,360],[82.4,361.4],[77,357]]],
  ['gastrocnemiens', [[80.4,306],[74.4,312],[70.8,324],[70.2,338],[72,350],[77,357.6],[82.4,360],[83.2,342],[83.2,322],[82.2,308]]],
  ['gastrocnemiens', [[85.8,306],[84,308],[83.2,322],[83.2,342],[82.4,360],[86.6,362],[91.2,354],[93.2,340],[93.2,324],[90.4,312]]]
]

/**
 * Silhouette (moitié gauche, de haut en bas), en trois morceaux autour de la main et du pied, qui
 * sont dessinés à part (voir plus bas). Elle est remplie comme du tissu musculaire de fond.
 */
const BODY_ARM_OUT: readonly Pt[] = [[93.4,51],[90.4,57],[88.8,64],[80,67],[68,70.4],[58,74],[51,82],[48.6,94],[47,110],[46,128],[43,148],[40,168],[38.4,188]]
const BODY_ARM_IN_LEG_OUT: readonly Pt[] = [[49.4,190],[53,170],[57,148],[60,128],[63,112],[65,110],[66.4,130],[68.6,154],[67.6,176],[66,192],[65,214],[65,245],[67,275],[69,296],[68,312],[66,334],[67,356],[70,376]]
const BODY_LEG_IN: readonly Pt[] = [[89,382],[91,364],[92,340],[91,318],[94,300],[96,280],[98,250],[98,224]]
const HEAD: readonly Pt[] = [[100,9],[109.5,11.5],[114.5,21],[114,35],[108.5,45.5],[100,49.6],[91.5,45.5],[86,35],[85.5,21],[90.5,11.5]]

/**
 * Main droite en position anatomique (paume vers l'avant, pouce vers l'extérieur), décrite dans le
 * repère du poignet : v en travers (négatif = côté pouce), u le long de l'avant-bras vers le bas.
 * On voit la même silhouette de face (paume) et de dos (dos de la main).
 */
const HAND_LOCAL: readonly Pt[] = [
  [-4.6, 0], [-5.6, 4], [-7, 9], [-8.3, 13.6], [-9.2, 17.6], [-8.8, 20.2], [-7.4, 20.6], [-6.4, 18], [-5.8, 14.6], // pouce
  [-5.8, 18.5], [-5.6, 25], [-5.1, 29.6], [-4.1, 31], [-3.1, 29.8], [-2.8, 20.4], // index
  [-2.7, 25], [-2.4, 31.4], [-1.3, 32.8], [-0.2, 31.4], [0.1, 20.2], // majeur
  [0.3, 25], [0.6, 30.4], [1.6, 31.8], [2.6, 30.4], [2.9, 19.8], // annulaire
  [3.2, 22.6], [3.6, 27.4], [4.5, 28.6], [5.4, 27.2], [5.6, 20.4], // auriculaire
  [5.8, 14], [5.6, 6], [4.6, 0],
]
/** Plis de la main : base du pouce et départ des doigts. */
const HAND_LINES: readonly (readonly Pt[])[] = [
  [[-5.4, 4.6], [-3.8, 10], [-3.4, 15]],
  [[-2.8, 20.4], [-2.8, 17.6]],
  [[0.1, 20.2], [0.1, 17.4]],
  [[2.9, 19.8], [2.9, 17.2]],
]
/** Taille de la main (1 = taille du dessin ci-dessus). */
const HAND_SCALE = 1.14
const WRIST: Pt = [42.9, 189.6]
const FOREARM_DIR: Pt = [-0.15, 0.989]
const handPt = ([v0, u0]: Pt): Pt => {
  const [v, u] = [v0 * HAND_SCALE, u0 * HAND_SCALE]
  return [WRIST[0] + u * FOREARM_DIR[0] + v * FOREARM_DIR[1], WRIST[1] + u * FOREARM_DIR[1] - v * FOREARM_DIR[0]]
}
const HAND = HAND_LOCAL.slice(0, -1).map(handPt)
/** Main de la peau : elle remonte sous les muscles de l'avant-bras pour ne pas laisser de bord net au poignet. */
const HAND_SKIN = [handPt([4.4, -7]), ...HAND_LOCAL.slice(1, -1).map(handPt), handPt([-4.4, -7])]

/** Pied gauche de l'image vu de face : malléoles (l'externe plus basse), dos du pied qui s'élargit. */
const FOOT_FRONT: readonly Pt[] = [
  [70.4, 378], [71.2, 385], [70.4, 389.6], [69.6, 393.4], [68.8, 397.4], [67.8, 401.6], [68.2, 405.4], [72, 406.8], [80, 407.6],
  [88, 408], [92.2, 406.6], [92.6, 402], [91.6, 397], [90.6, 393], [91, 389.4], [90.6, 385], [89.6, 379],
]
/** Orteils vus de face, du gros orteil (côté intérieur) au petit : [centre x, bas y, demi-largeur, hauteur]. */
const TOES: readonly (readonly [number, number, number, number])[] = [
  [88, 412.4, 3.2, 6.4], [82.8, 411.6, 1.9, 5.4], [78.8, 410.8, 1.8, 5], [75, 409.8, 1.7, 4.6], [71.4, 408.6, 1.6, 4.2],
]
const toe = ([cx, by, hw, h]: (typeof TOES)[number]): Pt[] => [
  [cx - hw, by - h], [cx - hw * 1.05, by - h * 0.45], [cx - hw * 0.6, by - h * 0.06], [cx, by], [cx + hw * 0.6, by - h * 0.06], [cx + hw * 1.05, by - h * 0.45], [cx + hw, by - h],
]
/** Le même pied vu de dos : talon au centre, bord de l'avant-pied qui dépasse de chaque côté. */
const FOOT_BACK: readonly Pt[] = [
  [70.4, 378], [71.2, 385], [71, 392], [70, 398], [69, 403.6], [70, 407.6], [73.6, 409.4], [77, 411.8], [82, 412.4],
  [86.4, 411], [89.6, 408.4], [91.6, 404.4], [91.4, 398], [90.6, 392], [90.6, 385], [89.6, 379],
]
const FOOT_LINES: Record<Side, readonly (readonly Pt[])[]> = {
  front: [[[90.6, 393], [87.4, 398.4], [86.6, 404]], [[70.4, 389.6], [74, 396], [76.4, 403]]],
  back: [[[75.6, 401], [76.6, 408], [81, 410.2], [85.4, 407.8], [86.4, 401]]],
}
/** Contour du pied pour la silhouette : de face il englobe les orteils. */
const FOOT_OUTLINE: Record<Side, readonly Pt[]> = {
  front: [[71.6, 386], [70.4, 389.6], [69.6, 393.4], [68.8, 397.4], [67.8, 401.6], [68.4, 405.6], [70, 408.4], [73.4, 409.6], [77, 410.8], [81, 411.8], [86, 412.6], [90.4, 412.2], [92.6, 409], [92.6, 402], [91.6, 397], [90.6, 393], [91, 389.4], [90.8, 386]],
  back: FOOT_BACK,
}

/** Peau et tendons non cliquables : genoux, crête du tibia, tendon d'Achille, coude. */
const SKIN: Record<Side, readonly (readonly Pt[])[]> = {
  front: [
    [[84.4,296],[79.6,300.4],[79,307],[82,313],[86.6,312.4],[89.6,306.4],[88.6,299.4]],
    [[83,315],[82.6,340],[83,366],[84.6,386],[86.2,386],[86.4,366],[86,340],[85.4,315]],
  ],
  back: [
    [[52.6,150],[53,155.4],[57.4,155.4],[57.6,150.6]],
  ],
}

/** Repères osseux (non cliquables) : clavicule, ligne blanche, colonne, épine de l'omoplate. */
const LINES: Record<Side, readonly (readonly Pt[])[]> = {
  front: [[[97.6,72.6],[88,72.3],[78,72.8],[66,73.6]], [[100,74],[100,199]], [[72.4,172],[78,183],[85,194],[92,203.4],[96.4,208]]],
  back: [[[100,54],[100,196]], [[70.4,77.6],[79,84],[88,90.4]], [[69.4,182],[76,177.4],[84,176.4],[92,178.6]]],
}

/**
 * Carrure : le dessin de base est déformé à la volée pour un physique plus athlétique. On élargit
 * les épaules et le haut du dos, et on gonfle bras, cuisses et mollets vers l'extérieur. Comme
 * tous les tracés (silhouette, muscles, peau) passent par la même déformation, ils restent
 * jointifs. Mettre un coefficient à 0 rend le dessin de base.
 */
const MASS = { shoulders: 0.09, waist: 0.17, hips: 0.06, arm: 0.38, forearm: 0.32, thigh: 0.17, calfOut: 0.24, calfIn: 0.2 }

const bump = (y: number, c: number, w: number) => Math.exp(-(((y - c) / w) ** 2))
const lerp = (y: number, y0: number, x0: number, y1: number, x1: number) => x0 + ((x1 - x0) * (y - y0)) / (y1 - y0)

function warp([x0, y]: Pt): Pt {
  let x = x0
  // Bras (côté extérieur seulement : l'intérieur touche le buste) : deltoïde, biceps, avant-bras.
  if (y > 80 && y < 200 && x < 64) {
    const c = y < 150 ? lerp(y, 80, 60, 150, 54.4) : lerp(y, 150, 54.4, 200, 44)
    const k = MASS.arm * (0.75 * bump(y, 98, 13) + bump(y, 128, 13)) + MASS.forearm * bump(y, 162, 12)
    if (x < c) x = c - (c - x) * (1 + k)
  }
  // Cuisse : galbe du vaste externe.
  if (y > 200 && y < 305 && x > 60 && x < 81) x = 81 - (81 - x) * (1 + MASS.thigh * bump(y, 240, 32))
  // Mollet : losange des gastrocnémiens, des deux côtés.
  if (y > 306 && y < 384 && x > 60) {
    if (x < 80) x = 80 - (80 - x) * (1 + MASS.calfOut * bump(y, 336, 18))
    else x = 80 + (x - 80) * (1 + MASS.calfIn * bump(y, 334, 16))
  }
  // Taille plus fine au-dessus des hanches, puis hanches qui ressortent : on voit le cadre des
  // fessiers et la fin du V des abdominaux. Seulement le buste (les bras pendent à côté).
  if (x > 60) x = 100 - (100 - x) * (1 - MASS.waist * bump(y, 180, 15) + MASS.hips * bump(y, 214, 11))
  // Carrure : épaules et haut du buste plus larges, taille inchangée.
  const s = y < 70 ? 0 : y < 96 ? (y - 70) / 26 : y < 128 ? 1 : y < 176 ? 1 - (y - 128) / 48 : 0
  x = 100 - (100 - x) * (1 + MASS.shoulders * s)
  return [x, y]
}
const W = (pts: readonly Pt[]) => pts.map(warp)

const r2 = (v: number) => Math.round(v * 100) / 100

/** Courbe lisse (Catmull-Rom → Bézier cubiques) qui passe par tous les points. */
export function spline(pts: readonly Pt[], closed = true, t = 0.5): string {
  const n = pts.length
  const P = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
  let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)]
    d += ` C${r2(p1[0] + ((p2[0] - p0[0]) * t) / 3)} ${r2(p1[1] + ((p2[1] - p0[1]) * t) / 3)} ${r2(p2[0] - ((p3[0] - p1[0]) * t) / 3)} ${r2(p2[1] - ((p3[1] - p1[1]) * t) / 3)} ${r2(p2[0])} ${r2(p2[1])}`
  }
  return d + (closed ? ' Z' : '')
}

const mirror = (pts: readonly Pt[]): Pt[] => pts.map(([x, y]) => [200 - x, y] as const)
/** Tracé du côté gauche de l'image et de son reflet. */
const both = (pts: readonly Pt[], closed = true, t = 0.5) => [spline(W(pts), closed, t), spline(mirror(W(pts)), closed, t)]

export interface PlateMuscle {
  id: FineId
  /** Les deux côtés du corps. */
  paths: [string, string]
}

const muscles = (list: readonly Piece[]): PlateMuscle[] => list.map(([id, pts]) => ({ id, paths: both(pts) as [string, string] }))
/** Tendon d'Achille, vu de dos : il part sous le mollet et finit sur le talon. */
const ACHILLES: readonly Pt[] = [[80.4, 366], [80.6, 380], [80.8, 392], [82, 396], [83.4, 392], [83.8, 380], [85.2, 366]]
const FOOT_SKIN: Record<Side, readonly (readonly Pt[])[]> = { front: [FOOT_FRONT], back: [FOOT_BACK, ACHILLES] }
const halfBody = (side: Side): Pt[] => W([...BODY_ARM_OUT, ...HAND, ...BODY_ARM_IN_LEG_OUT, ...FOOT_OUTLINE[side], ...BODY_LEG_IN])
const body = (side: Side) => spline([[100, 49], ...halfBody(side), [100, 213], ...mirror(halfBody(side).reverse())], true, 0.45)

const view = (side: Side, list: readonly Piece[]) => ({
  body: body(side),
  /** Mains et pieds, dessinés sous les muscles : le haut se glisse sous l'avant-bras et la cheville. */
  under: [HAND_SKIN, ...FOOT_SKIN[side], ...(side === 'front' ? TOES.map(toe) : [])].flatMap((p, i, all) => {
    // Remplissage fermé, mais contour ouvert : pas de trait en haut, là où la peau passe sous les
    // muscles (ou, pour un orteil, sous le dos du pied).
    const toeShape = side === 'front' && i >= all.length - TOES.length
    const [fill, fillM] = both(p)
    const [edge, edgeM] = both(toeShape ? p : p.slice(1, -1), false)
    return [{ fill, edge, fade: !toeShape }, { fill: fillM, edge: edgeM, fade: !toeShape }]
  }),
  muscles: muscles(list),
  skin: SKIN[side].flatMap((p) => both(p)),
  lines: [...LINES[side], ...HAND_LINES.map((l) => l.map(handPt)), ...FOOT_LINES[side]].flatMap((l) => both(l, false)),
})

export const PLATE = {
  viewBox: '22 4 156 412',
  head: spline(HEAD),
  views: { front: view('front', FRONT), back: view('back', BACK) },
} as const
