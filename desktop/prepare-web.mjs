// Copie l'appli web construite (../dist, « npm run build » à la racine) dans desktop/web.
import { cpSync, existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../dist', import.meta.url))
const web = fileURLToPath(new URL('./web', import.meta.url))
if (!existsSync(`${dist}/index.html`)) {
  console.error('dist/ introuvable : lance « npm run build » à la racine du dépôt avant.')
  process.exit(1)
}
rmSync(web, { recursive: true, force: true })
cpSync(dist, web, { recursive: true })
console.log('Appli web copiée dans desktop/web')
