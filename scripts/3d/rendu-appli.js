  // --- Moteur de rendu de l'appli : un seul contexte WebGL, recopié dans le canevas de chaque vignette ---
  // API : attach(el, id, { big, onPhase, onReady }) → { setView(vue), destroy() } ; has(id) ;
  // warm(ids, onProgress) prépare les scènes à l'avance (géométrie envoyée, shaders compilés) pour qu'elles apparaissent sans attendre.
  const BYID = {}; for (const d of REGISTRY) BYID[d.id] = d
  const VIEWS = { iso: Math.PI / 4, side: Math.PI / 2, front: 0 }
  const PERIOD = 3.4 // secondes par répétition
  const CACHE_MAX = 32
  let R = null, RW = 0, RH = 0
  const tiles = new Set()
  const cache = new Map() // id → { scene, animate } (une scène sert à toutes les vignettes du même exercice)

  function renderer() {
    if (R) return R
    R = new T.WebGLRenderer({ antialias: true, alpha: true })
    R.setPixelRatio(1)
    R.outputEncoding = T.sRGBEncoding
    R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap
    R.setClearColor(0x000000, 0)
    R.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cache.clear() })
    return R
  }

  function built(d) {
    let b = cache.get(d.id)
    if (b) { cache.delete(d.id); cache.set(d.id, b); return b }
    const scene = new T.Scene()
    scene.add(new T.HemisphereLight(0xeae6d8, 0x20241f, 0.8))
    const sun = new T.DirectionalLight(0xfff3ea, 1.0)
    sun.position.set(1.6, 3.2, 1.8); sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.5, far: 8 })
    scene.add(sun)
    const rim = new T.DirectionalLight(0x9fb07a, 0.25); rim.position.set(-2, 1.5, -2); scene.add(rim)
    b = { scene, animate: d.build(scene, PLATE.ex[d.id]) }
    cache.set(d.id, b)
    while (cache.size > CACHE_MAX) {
      const [oldId, old] = cache.entries().next().value
      cache.delete(oldId)
      old.scene.traverse((o) => { if (o.geometry) o.geometry.dispose() }) // trois recharge la géométrie si elle resert
    }
    return b
  }

  const DPR = () => Math.min(2, window.devicePixelRatio || 1)

  function draw(t, time) {
    const dpr = DPR()
    const w = Math.round(t.el.clientWidth * dpr), h = Math.round(t.el.clientHeight * dpr)
    if (!w || !h) return
    const r = renderer()
    const b = built(t.d)
    if (t.cv.width !== w || t.cv.height !== h) { t.cv.width = w; t.cv.height = h }
    if (w > RW || h > RH) { RW = Math.max(RW, w); RH = Math.max(RH, h); r.setSize(RW, RH, false) }
    const label = b.animate((time + t.off) % 1)
    if (t.onPhase && label !== t.label) { t.label = label; t.onPhase(label) }
    t.yaw += (t.yawTarget - t.yaw) * 0.15
    const a = w / h
    const half = t.d.zoom * (t.big ? 1 : 0.92) * (a < 1 ? 1 / a : 1) * (t.big && a > 1.6 ? 0.82 : 1)
    const cam = t.cam
    Object.assign(cam, { left: -half * a, right: half * a, top: half, bottom: -half })
    cam.updateProjectionMatrix()
    const el = Math.atan(1 / Math.SQRT2), dd = 6, tg = t.d.cible
    cam.position.set(tg.x + dd * Math.cos(el) * Math.sin(t.yaw), tg.y + dd * Math.sin(el), tg.z + dd * Math.cos(el) * Math.cos(t.yaw))
    cam.lookAt(tg)
    r.setViewport(0, 0, w, h); r.setScissor(0, 0, w, h); r.setScissorTest(true)
    r.clear()
    r.render(b.scene, cam)
    t.ctx.clearRect(0, 0, w, h)
    t.ctx.drawImage(r.domElement, 0, RH - h, w, h, 0, 0, w, h)
    if (!t.ready) { t.ready = true; t.onReady?.() }
  }

  const pause = () => new Promise((res) => setTimeout(res, 0))
  async function warm(ids, onProgress) {
    const list = [...new Set(ids)].filter((id) => BYID[id]).slice(0, CACHE_MAX - 4)
    const r = renderer()
    const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 20)
    if (RW < 64 || RH < 64) { RW = Math.max(RW, 64); RH = Math.max(RH, 64); r.setSize(RW, RH, false) }
    let done = 0
    for (const id of list) {
      try {
        const d = BYID[id], b = built(d)
        b.animate(0)
        cam.position.set(d.cible.x + 4, d.cible.y + 4, d.cible.z + 4); cam.lookAt(d.cible)
        r.compile(b.scene, cam)
        r.setViewport(0, 0, 64, 64); r.setScissor(0, 0, 64, 64); r.setScissorTest(true)
        r.render(b.scene, cam) // envoie la géométrie et les ombres au GPU
      } catch (e) { console.warn('3D warm', id, e) }
      onProgress?.(++done, list.length)
      await pause()
    }
  }

  let raf = 0, last = 0, acc = 0, n = 0
  function frame(now) {
    raf = 0
    if (!tiles.size) return
    n++
    acc += Math.min(0.05, (now - (last || now)) / 1000) / PERIOD; last = now
    const time = reduce ? 0.5 : acc
    for (const t of tiles) {
      if (!t.on || document.hidden) continue
      if (!t.big && n % 2) continue // vignettes à mi-cadence
      try { draw(t, time % 1) } catch (e) { console.warn('3D', t.d.id, e) }
    }
    raf = requestAnimationFrame(frame)
  }
  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame) } }

  function attach(el, id, opts = {}) {
    const d = BYID[id]
    if (!d) return null
    const cv = document.createElement('canvas'); el.prepend(cv)
    const views = d.vues ?? VIEWS
    const t = { el, cv, ctx: cv.getContext('2d'), d, big: !!opts.big, views, yaw: views.iso, yawTarget: views.iso, on: false, off: opts.big ? 0 : Math.random(), onPhase: opts.onPhase, onReady: opts.onReady, ready: false, label: '', cam: new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 20) }
    const io = new IntersectionObserver((es) => { t.on = es[es.length - 1].isIntersecting; if (t.on) kick() }, { rootMargin: '80px' })
    io.observe(el)
    let x0 = null
    const down = (e) => { if (e.target.closest('button')) return; x0 = e.clientX; el.setPointerCapture?.(e.pointerId) }
    const move = (e) => { if (x0 == null) return; t.yawTarget -= (e.clientX - x0) * 0.012; x0 = e.clientX }
    const up = () => { x0 = null }
    if (t.big) { el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up) }
    tiles.add(t); kick()
    return {
      setView: (v) => { if (t.views[v] != null) t.yawTarget = t.views[v] },
      destroy: () => {
        tiles.delete(t); io.disconnect(); cv.remove()
        el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up)
      },
    }
  }

  return { attach, warm, has: (id) => !!BYID[id] }
