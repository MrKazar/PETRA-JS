import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { getData, setData } from '../data/store'
import { MAX_QR_CHARS, applyShare, decodeShare, describeShare, encodeShare, type SharePayload } from '../logic/share'
import { Sheet, confirmAction, toast } from './kit'

/** Affiche le QR code d'un partage, à scanner avec PETRA sur l'autre téléphone. */
export function ShareSheet({ payload, title, onClose }: { payload: SharePayload; title: string; onClose: () => void }) {
  const [img, setImg] = useState<string>()
  const [text, setText] = useState('')
  const [tooBig, setTooBig] = useState(false)
  useEffect(() => {
    let alive = true
    encodeShare(payload).then(async (t) => {
      if (!alive) return
      setText(t)
      if (t.length > MAX_QR_CHARS) return setTooBig(true)
      setImg(await QRCode.toDataURL(t, { errorCorrectionLevel: t.length > 1200 ? 'L' : 'M', margin: 2, width: 720, color: { dark: '#000000', light: '#ffffff' } }))
    })
    return () => {
      alive = false
    }
  }, [payload])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast('Code copié : colle-le dans « Importer » sur l’autre téléphone')
    } catch {
      toast('Copie impossible')
    }
  }
  const { lines } = describeShare(payload)
  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="stack">
        {tooBig ? (
          <p className="small muted" style={{ margin: 0 }}>Trop de contenu pour un seul QR code. Copie le code ci-dessous et envoie-le par message : il s’importe avec « Coller un code ».</p>
        ) : img ? (
          <img src={img} alt="QR code" className="qr-img" />
        ) : (
          <div className="qr-img" />
        )}
        <div className="small muted" style={{ textAlign: 'center' }}>Sur l’autre téléphone : PETRA › Programmes › Scanner un QR code.</div>
        <div className="small faint">{lines.slice(0, 4).join(' · ')}{lines.length > 4 ? '…' : ''}</div>
        <button className="btn block" disabled={!text} onClick={copy}>Copier le code (à envoyer par message)</button>
      </div>
    </Sheet>
  )
}

/** Scanner : caméra, image d'un QR code (capture d'écran reçue) ou code collé, puis aperçu et import. */
export function ScanSheet({ onClose, onImported }: { onClose: () => void; onImported?: (p: SharePayload) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [found, setFound] = useState<SharePayload>()
  const [camError, setCamError] = useState<string>()
  const [paste, setPaste] = useState('')

  const read = async (text: string) => {
    try {
      setFound(await decodeShare(text))
      return true
    } catch (e) {
      toast((e as Error).message || 'QR code illisible')
      return false
    }
  }

  // Caméra arrière, une image analysée toutes les 250 ms jusqu'à trouver un QR code.
  useEffect(() => {
    if (found) return
    let stream: MediaStream | undefined
    let timer = 0
    let stopped = false
    const canvas = document.createElement('canvas')
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop())
        stream = s
        const v = video.current
        if (!v) return
        v.srcObject = s
        void v.play()
        const tick = async () => {
          if (stopped) return
          if (v.videoWidth) {
            canvas.width = v.videoWidth
            canvas.height = v.videoHeight
            const ctx = canvas.getContext('2d', { willReadFrequently: true })!
            ctx.drawImage(v, 0, 0)
            const code = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)
            if (code?.data && (await read(code.data))) return
          }
          timer = window.setTimeout(tick, 250)
        }
        void tick()
      })
      .catch(() => setCamError('Caméra indisponible : autorise-la dans les réglages du téléphone, ou choisis une image du QR code.'))
    if (!navigator.mediaDevices) setCamError('Caméra indisponible sur cet appareil.')
    return () => {
      stopped = true
      window.clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found])

  const fromImage = async (file?: File) => {
    if (!file) return
    const bmp = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const code = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)
    if (code?.data) void read(code.data)
    else toast('Aucun QR code trouvé dans cette image')
  }

  const doImport = () => {
    if (!found) return
    const replacesPlan = found.k === 'semaine' || found.k === 'ab'
    if (replacesPlan && !confirmAction('Ce planning remplace ton planning de la semaine actuel (tes séances existantes sont gardées). Continuer ?')) return
    const { data, message } = applyShare(getData(), found)
    setData(data)
    toast(message)
    onImported?.(found)
    onClose()
  }

  if (found) {
    const { title, lines } = describeShare(found)
    return (
      <Sheet open onClose={onClose} title="Importer">
        <div className="stack">
          <div className="card tight">
            <div style={{ fontWeight: 600 }}>{title}</div>
            <ul className="finisher-list small">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </div>
          <button className="btn primary block big" onClick={doImport}>Importer</button>
          <button className="btn ghost block" onClick={() => setFound(undefined)}>Scanner un autre code</button>
        </div>
      </Sheet>
    )
  }
  return (
    <Sheet open onClose={onClose} title="Scanner un QR code">
      <div className="stack">
        {camError ? <div className="small muted">{camError}</div> : <video ref={video} className="qr-video" playsInline muted />}
        <button className="btn block" onClick={() => fileInput.current?.click()}>Choisir une image du QR code</button>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => { void fromImage(e.target.files?.[0]); e.target.value = '' }} />
        <div className="row">
          <input className="input" placeholder="Ou colle un code PETRA1:…" value={paste} onChange={(e) => setPaste(e.target.value)} />
          <button className="btn" disabled={!paste.trim()} onClick={() => void read(paste)}>OK</button>
        </div>
      </div>
    </Sheet>
  )
}
