// Serveur de synchro de PCTRA sur le réseau local : le téléphone (PETRA) y envoie ses données.
const http = require('node:http')
const crypto = require('node:crypto')
const os = require('node:os')

const SYNC_PATH = '/petra/sync'
const PING_PATH = '/petra/ping'
const MAX_BODY = 50 * 1024 * 1024

/** Adresses IPv4 du PC sur le réseau local (box, Wi-Fi), les plus probables en premier. */
function localAddresses() {
  const out = []
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.family !== 'IPv4' || a.internal) continue
      // Les cartes virtuelles (VirtualBox, WSL, Hyper-V, VPN) passent après.
      const virtual = /virtual|vbox|vmware|wsl|hyper-v|vethernet|docker|tailscale|zerotier|loopback/i.test(name)
      const priv = /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)
      out.push({ address: a.address, score: (virtual ? 0 : 2) + (priv ? 1 : 0) + (a.address.startsWith('192.168.') ? 1 : 0) })
    }
  }
  return out.sort((x, y) => y.score - x.score).map((x) => x.address)
}

function sameToken(a, b) {
  const x = Buffer.from(String(a ?? ''))
  const y = Buffer.from(String(b ?? ''))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Petra-Token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  })
  res.end(body === undefined ? '' : JSON.stringify(body))
}

/**
 * Démarre le serveur. `getToken()` donne le jeton d'association actuel, `handle(payload)` fusionne
 * les données reçues et renvoie `{ data }` (ou `{ error }`).
 */
function startSyncServer({ port, host = '0.0.0.0', getToken, handle, name = os.hostname() }) {
  const server = http.createServer((req, res) => {
    const url = (req.url ?? '').split('?')[0]
    if (req.method === 'OPTIONS') return send(res, 204)
    if (req.method === 'GET' && url === PING_PATH) return send(res, 200, { app: 'PCTRA', name })
    if (req.method !== 'POST' || url !== SYNC_PATH) return send(res, 404, { error: 'introuvable' })
    if (!sameToken(req.headers['x-petra-token'], getToken())) return send(res, 401, { error: 'jeton refusé' })
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) {
        send(res, 413, { error: 'trop gros' })
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', async () => {
      if (res.writableEnded) return
      let payload
      try {
        payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      } catch {
        return send(res, 400, { error: 'JSON illisible' })
      }
      try {
        const out = await handle(payload)
        send(res, out?.data ? 200 : 500, out)
      } catch (e) {
        send(res, 503, { error: String(e?.message ?? e) })
      }
    })
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => resolve(server))
  })
}

module.exports = { startSyncServer, localAddresses, SYNC_PATH, PING_PATH }
