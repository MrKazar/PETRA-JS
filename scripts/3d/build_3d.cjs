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
const js = '// Généré par scripts/3d/build_3d.cjs, ne pas modifier à la main.\n// Chargé par une balise <script> (marche aussi en file:// dans PCTRA) : T = three, PLATE = planche + muscles.\nwindow.PETRA3D_FACTORY = function (T, PLATE) {\n' +
  noyau + '\nconst __mannequin0 = mannequin, __depth0 = depth\n' + tools.filter((t) => !local(t)).map(src).join('\n') + '\n' +
  scenes.map(wrap).join('\n') + '\n' + fs.readFileSync(path.join(__dirname, 'rendu-appli.js'), 'utf8') + '\n}\n'
fs.mkdirSync(path.join(ROOT, 'public/3d'), { recursive: true })
fs.writeFileSync(path.join(ROOT, 'public/3d/moteur.js'), js)
const meta = Object.fromEntries(scenes.map(({ h }) => [h.id, h.conseil]))
fs.writeFileSync(path.join(ROOT, 'src/data/anim3d.ts'), '// Généré par scripts/3d/build_3d.cjs : exercices animés en 3D et leur consigne.\nexport const ANIM_CUES: Record<string, string> = ' + JSON.stringify(meta, null, 1) + '\n')
console.log(`${scenes.length} scènes, moteur ${(js.length / 1024).toFixed(0)} Ko`, [...catalog].filter((id) => !meta[id]))
