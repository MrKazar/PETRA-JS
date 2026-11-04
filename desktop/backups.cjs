// Copies de sécurité de PCTRA : un fichier horodaté après chaque synchro, les 5 derniers gardés.
const path = require('node:path')
const fs = require('node:fs')

const KEEP = 5
/** Ancien fichier unique (PCTRA 1.0.0 à 1.0.4), écrasé à chaque synchro. */
const LEGACY = 'petra-pc.json'
const PATTERN = /^petra-pc-\d{8}-\d{6}-\d{3}\.json$/

const pad = (n, w = 2) => String(n).padStart(w, '0')
/** petra-pc-20261104-023715-123.json : les noms se trient par date. */
function copyName(at = new Date()) {
  return `petra-pc-${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}-${pad(at.getMilliseconds(), 3)}.json`
}

/** Copies horodatées, de la plus récente à la plus ancienne. */
const copies = (names) => names.filter((n) => PATTERN.test(n)).sort().reverse()
/** Copies à supprimer pour n'en garder que `keep`. */
const toPrune = (names, keep = KEEP) => copies(names).slice(keep)

function writeCopy(dir, json, at = new Date()) {
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, copyName(at)), json)
  for (const old of toPrune(fs.readdirSync(dir))) {
    try {
      fs.unlinkSync(path.join(dir, old))
    } catch {
      /* fichier verrouillé : on réessaiera à la prochaine copie */
    }
  }
}

/** Contenu des copies, la plus récente en premier (l'ancien fichier unique en dernier). */
function readCopies(dir) {
  let names
  try {
    names = fs.readdirSync(dir)
  } catch {
    return []
  }
  const ordered = [...copies(names), ...(names.includes(LEGACY) ? [LEGACY] : [])]
  const out = []
  for (const n of ordered) {
    try {
      out.push(fs.readFileSync(path.join(dir, n), 'utf8'))
    } catch {
      /* illisible : on passe */
    }
  }
  return out
}

module.exports = { KEEP, copyName, copies, toPrune, writeCopy, readCopies }
