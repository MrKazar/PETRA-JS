// Génère public/3d/moteur.js (mannequin + scènes validées + rendu) et src/data/anim3d.ts (ids, titres, consignes).
// Les scènes viennent du pipeline des rendus 3D (dossier du projet : petra-js/maquettes-3d/pipeline/src).
// Usage : node scripts/3d/build_3d.cjs <dossier src du pipeline>
const fs = require('fs'), path = require('path')
const P = process.argv[2]
if (!P) throw new Error('usage : node scripts/3d/build_3d.cjs <pipeline/src>')
const ROOT = path.join(__dirname, '../..'), SC = path.join(P, 'scenes')
const catalog = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/exercices.json'), 'utf8')).exercices.map((e) => e.id))
const files = fs.readdirSync(SC, { withFileTypes: true }).filter((d) => d.isDirectory())
  .flatMap((d) => fs.readdirSync(path.join(SC, d.name)).filter((f) => f.endsWith('.js') && !f.startsWith('_')).map((f) => d.name + '/' + f)).sort()
const head = (src) => JSON.parse(src.match(/^\/\*@ (.*?) \*\//)[1])
const scenes = files.map((f) => { const src = fs.readFileSync(path.join(SC, f), 'utf8'); return { f, src, h: head(src) } }).filter((s) => catalog.has(s.h.id))
const tools = [...new Set(scenes.flatMap((s) => s.h.outils ?? []))]
const src = (t) => fs.readFileSync(path.join(SC, t), 'utf8').replace(/^\s*const T = window\.THREE\s*$/mg, '// T : three, fourni au moteur'), local = (t) => /(mannequin|depth) = function/.test(src(t))
const wrap = (s) => ';(() => {\n  let mannequin = __mannequin0, depth = __depth0\n' + (s.h.outils ?? []).filter(local).map(src).join('\n') + '\n' + s.src + '\n})()'
let noyau = fs.readFileSync(path.join(P, 'noyau.js'), 'utf8')
const n0 = noyau.length
noyau = noyau.replace(/^\s*const T = window\.THREE\s*$/m, '').replace(/^\s*const PLATE = JSON\.parse\(document\.getElementById\('plate-data'\)\.textContent\)\s*$/m, '')
if (n0 - noyau.length < 60) throw new Error('en-tête de noyau.js inattendu')
let js = '// Généré par scripts/3d/build_3d.cjs, ne pas modifier à la main.\n// Chargé par une balise <script> (marche aussi en file:// dans PCTRA) : T = three, PLATE = planche + muscles.\nwindow.PETRA3D_FACTORY = function (T, PLATE) {\n' +
  noyau + '\nconst __mannequin0 = mannequin, __depth0 = depth\n' + tools.filter((t) => !local(t)).map(src).join('\n') + '\n' +
  scenes.map(wrap).join('\n') + '\n' + fs.readFileSync(path.join(__dirname, 'rendu-appli.js'), 'utf8') + '\n}\n'
// Pièces des muscles précalculées (1.4.0.3) : la triangulation des contours de la planche prenait ~85 % du temps de
// préparation de chaque exercice. Elle est faite ici une fois pour toutes ; au téléphone, chaque scène ne fait plus que poser
// ces pièces sur le corps. Un contour absent de la table (planche modifiée sans régénérer) est encore calculé, une seule fois.
const __pieces = precalc(noyau)
js = js.replace('\nconst __mannequin0 = mannequin', '\n' + __pieces + '\nconst __mannequin0 = mannequin')
fs.mkdirSync(path.join(ROOT, 'public/3d'), { recursive: true })
fs.writeFileSync(path.join(ROOT, 'public/3d/moteur.js'), js)
const meta = Object.fromEntries(scenes.map(({ h }) => [h.id, h.conseil]))
fs.writeFileSync(path.join(ROOT, 'src/data/anim3d.ts'), '// Généré par scripts/3d/build_3d.cjs : exercices animés en 3D et leur consigne.\nexport const ANIM_CUES: Record<string, string> = ' + JSON.stringify(meta, null, 1) + '\n')
console.log(`${scenes.length} scènes, moteur ${(js.length / 1024).toFixed(0)} Ko`, [...catalog].filter((id) => !meta[id]))

function precalc(noyau) {
  const a = noyau.indexOf('  function pathPoints('), b = noyau.indexOf('  // Quelle partie du corps')
  const k = noyau.match(/^ {2}const K = (\d+(\.\d+)?)\s*$/m)
  if (a < 0 || b < a || !k) throw new Error('noyau.js : fonctions des muscles introuvables')
  const musclePiece = new Function('K', noyau.slice(a, b) + '\nreturn musclePiece')(+k[1])
  // TypeScript 7 n'a plus d'API JS : Node (22.13+) retire les types, et les export/import deviennent du code simple.
  const ts = require('module').stripTypeScriptTypes(fs.readFileSync(path.join(ROOT, 'src/data/bodyPlate.ts'), 'utf8'))
  const PLATE = new Function(ts.replace(/^import .*$/mg, '').replace(/^export /mg, '') + '\nreturn PLATE')()
  const r = (x, n) => +x.toFixed(n)
  const table = {}
  for (const v of ['front', 'back']) for (const m of PLATE.views[v].muscles) for (const d of m.paths) {
    if (table[d]) continue
    const pc = musclePiece(d)
    table[d] = [pc.pts.flatMap((p) => [r(p[0], 3), r(p[1], 3)]), pc.tris.flat(), pc.h.map((x) => r(x, 6)), pc.b.map((x) => r(x, 5)), r(pc.cx, 4), r(pc.cy, 4)]
  }
  console.log(`${Object.keys(table).length} pièces de muscles précalculées`)
  return `{ // pièces des muscles précalculées par build_3d.cjs, gardées en mémoire après le premier usage
  const PRE = JSON.parse(${JSON.stringify(JSON.stringify(table))}), calc = musclePiece, memo = new Map()
  const pairs = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o }
  musclePiece = (d) => {
    let p = memo.get(d)
    if (!p) { const q = PRE[d]; p = q ? { pts: pairs(q[0], 2), tris: pairs(q[1], 3), h: q[2], b: q[3], cx: q[4], cy: q[5] } : calc(d); memo.set(d, p) }
    return p
  }
}`
}
