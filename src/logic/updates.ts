const REPO = 'MrKazar/petra-js'

export interface UpdateInfo {
  version: string
  url: string
}

/** Compare deux versions « 1.2.3 ». */
export function isNewer(remote: string, local: string): boolean {
  const a = remote.replace(/^v/, '').split('.').map(Number)
  const b = local.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}

/** Interroge la dernière release GitHub ; renvoie le lien de l'APK si elle est plus récente. */
export async function checkForUpdate(): Promise<UpdateInfo | undefined> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
  if (res.status === 404) return undefined
  if (!res.ok) throw new Error(`GitHub ${res.status}`)
  const rel = (await res.json()) as { tag_name: string; html_url: string; assets?: { name: string; browser_download_url: string }[] }
  if (!isNewer(rel.tag_name, __APP_VERSION__)) return undefined
  const apk = rel.assets?.find((a) => a.name.endsWith('.apk'))
  return { version: rel.tag_name.replace(/^v/, ''), url: apk?.browser_download_url ?? rel.html_url }
}
