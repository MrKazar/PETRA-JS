  // --- Moteur de rendu de l'appli : un seul contexte WebGL, recopié dans le canevas de chaque vignette ---
  // API : attach(el, id, { big, onPhase, onReady }) → { setView(vue), destroy() } ; has(id) ; body(el, opts) (mannequin du schéma du corps, plus bas) ;
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


  // --- Mannequin du schéma du corps (PCTRA) : debout, muscles colorés par niveau, tourne lentement sur lui-même ---
  // API : body(el, { colors, selected, onPick, period }) → { set({ colors, selected }), destroy() }
  // colors : id du muscle → couleur (absent : tissu neutre). onPick(id) au clic sur un muscle. period : secondes par tour.
  const bodies = new Set()
  function standing(o) {
    if (o.scap != null) o.pose.scapL = o.pose.scapR = { up: 0, fwd: o.scap }
    const F = o.frames(o.pose)
    for (const sx of [1, -1]) {
      const k = sx > 0 ? 'L' : 'R'
      // bras un peu écartés du corps (on voit l'intérieur des bras et les flancs), mains ouvertes, paumes vers les cuisses
      Object.assign(o.pose, {
        ['hand' + k]: F['shoulder' + k].clone().add(V(sx * 0.16, -0.5, 0.02)), ['handMode' + k]: 'flat',
        ...(o.palmsFwd
          ? { ['fingers' + k]: V(sx * 0.2, -1, 0).normalize(), ['palm' + k]: V(-sx * 0.25, 0, 1).normalize(), ['thumb' + k]: V(sx, 0, 0), ['elbow' + k]: V(sx * 0.3, 0, -1) }
          : { ['fingers' + k]: V(sx * 0.25, -1, 0).normalize(), ['palm' + k]: V(-sx, 0.2, 0).normalize(), ['thumb' + k]: V(0, 0, 1), ['elbow' + k]: V(sx * 0.4, 0, -1) }),
      })
    }
    return o.pose
  }
  const PALMS_FWD = true // paumes vers l'avant (position anatomique) : bras en rotation externe, épaules ouvertes
  const SCAP = -0.03 // omoplates : < 0 = épaules ramenées en arrière
  function body(el, opts = {}) {
    const scene = new T.Scene()
    scene.add(new T.HemisphereLight(0xf2eee4, 0x2a2238, 0.85))
    const sun = new T.DirectionalLight(0xfff3ea, 0.95)
    sun.position.set(1.2, 3.4, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -1.2, right: 1.2, top: 2.2, bottom: -0.2, near: 0.5, far: 8 })
    scene.add(sun)
    const back = new T.DirectionalLight(0xc7b6ff, 0.35); back.position.set(-1.5, 1.8, -2.5); scene.add(back)
    // ombre au sol seulement (pas de sol visible)
    const disc = new T.Mesh(new T.CircleGeometry(0.55, 48).rotateX(-Math.PI / 2), new T.ShadowMaterial({ opacity: 0.35 }))
    disc.receiveShadow = true; scene.add(disc)
    const rig = new T.Group(); scene.add(rig)
    const pose = __mannequin0(rig, { primary: [], secondary: [] })
    const base = { P: V(0, 0.94, 0), u: V(0, 1, 0), f: V(0, 0, 1), ankleL: V(0.12, 0.07, 0), ankleR: V(-0.12, 0.07, 0), toeL: V(0.14, 0.03, 0.15), toeR: V(-0.14, 0.03, 0.15), kneeL: V(0, 0, 1), kneeR: V(0, 0, 1) }
    pose(standing({ frames: pose.frames, pose: base, scap: opts.scap ?? SCAP, palmsFwd: opts.palmsFwd ?? PALMS_FWD }))
    const muscles = []
    rig.traverse((m) => { if (m.isMesh && m.userData.muscle) { muscles.push(m); m.userData.tissue = m.material } })
    const mats = new Map()
    const matFor = (c, sel) => {
      const key = c + (sel ? '*' : '')
      let m = mats.get(key)
      if (!m) { m = mat({ color: c, roughness: 0.5, vertexColors: true, ...(sel ? { emissive: srgb('#ffffff'), emissiveIntensity: 0.28 } : {}) }); mats.set(key, m) }
      return m
    }
    let colors = opts.colors ?? {}, selected = opts.selected
    const paint = () => {
      for (const m of muscles) {
        const id = m.userData.muscle, c = colors[id], sel = id === selected
        m.material = c ? matFor(c, sel) : sel ? matFor(COL.tissue, true) : m.userData.tissue
      }
    }
    paint()

    const cv = document.createElement('canvas'); el.prepend(cv)
    const t = { el, cv, ctx: cv.getContext('2d'), cam: new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 20), yaw: opts.yaw ?? 0.35, on: false, ready: false, hold: 0 }
    const period = opts.period ?? 28
    t.draw = (dt) => {
      const dpr = DPR()
      const w = Math.round(el.clientWidth * dpr), h = Math.round(el.clientHeight * dpr)
      if (!w || !h) return
      const r = renderer()
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h }
      if (w > RW || h > RH) { RW = Math.max(RW, w); RH = Math.max(RH, h); r.setSize(RW, RH, false) }
      if (!reduce && drag == null) { if (t.hold > 0) t.hold -= dt; else t.yaw += (dt / period) * Math.PI * 2 }
      rig.rotation.y = t.yaw
      const a = w / h, half = 1.02 * (a < 0.56 ? 0.56 / a : 1)
      Object.assign(t.cam, { left: -half * a, right: half * a, top: half, bottom: -half })
      t.cam.updateProjectionMatrix()
      const tg = V(0, 0.93, 0), el2 = 0.12
      t.cam.position.set(0, tg.y + 6 * Math.sin(el2), 6 * Math.cos(el2)); t.cam.lookAt(tg)
      r.setViewport(0, 0, w, h); r.setScissor(0, 0, w, h); r.setScissorTest(true)
      r.clear(); r.render(scene, t.cam)
      t.ctx.clearRect(0, 0, w, h)
      t.ctx.drawImage(r.domElement, 0, RH - h, w, h, 0, 0, w, h)
      if (!t.ready) { t.ready = true; opts.onReady?.() }
    }
    // clic sur un muscle : rayon depuis la caméra
    const ray = new T.Raycaster()
    const pick = (e) => {
      const b = el.getBoundingClientRect()
      ray.setFromCamera(new T.Vector2(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1), t.cam)
      const hit = ray.intersectObjects(muscles, false)[0]
      return hit?.object.userData.muscle
    }
    let drag = null, moved = 0
    const down = (e) => { drag = e.clientX; moved = 0; el.setPointerCapture?.(e.pointerId) }
    const move = (e) => {
      if (drag != null) { t.yaw += (e.clientX - drag) * 0.012; moved += Math.abs(e.clientX - drag); drag = e.clientX; kick(); return }
      const id = pick(e); el.style.cursor = id ? 'pointer' : 'grab'; opts.onHover?.(id)
    }
    const up = (e) => {
      if (drag == null) return
      drag = null; t.hold = 2.5 // reprend sa rotation 2,5 s après qu'on l'a lâché
      if (moved < 4) { const id = pick(e); if (id) opts.onPick?.(id) }
    }
    const leave = () => opts.onHover?.(undefined)
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', leave)
    const io = new IntersectionObserver((es) => { t.on = es[es.length - 1].isIntersecting; if (t.on) kick() }, { rootMargin: '80px' })
    io.observe(el)
    bodies.add(t); kick()
    return {
      set: (o) => { if (o.colors) colors = o.colors; if ('selected' in o) selected = o.selected; paint(); kick() },
      destroy: () => {
        bodies.delete(t); io.disconnect(); cv.remove()
        el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('pointerleave', leave)
        scene.traverse((o) => { if (o.geometry) o.geometry.dispose() })
      },
    }
  }

  let raf = 0, last = 0, acc = 0, n = 0
  function frame(now) {
    raf = 0
    if (!tiles.size && !bodies.size) return
    n++
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now
    acc += dt / PERIOD
    const time = reduce ? 0.5 : acc
    for (const t of tiles) {
      if (!t.on || document.hidden) continue
      if (!t.big && n % 2) continue // vignettes à mi-cadence
      try { draw(t, time % 1) } catch (e) { console.warn('3D', t.d.id, e) }
    }
    for (const b of bodies) {
      if (!b.on || document.hidden) continue
      try { b.draw(dt) } catch (e) { console.warn('3D corps', e) }
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

  return { attach, warm, body, has: (id) => !!BYID[id] }
