import './style.css'
import * as THREE from 'three'
import { Store, exampleProject, FIG_COLORS, LABELS, LENSES, ASPECTS, POSES, EASES, PROPS, type Figure, type Prop, type Keyframe, type Vec3 } from './state'
import { World, type Rect } from './scene'
import { applyCam, aspectRatio, evalCamera, vfov } from './camera'
import { buildPrompt } from './prompt'
import { I } from './icons'
import { clamp, esc, gr, timecode, uid } from './util'

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
const app = $('app')
const stage = $('stage')
const dirView = $('dirView')
const shotView = $('shotView')
const pip = $('pip')
const inspector = $('inspector')
const track = $('track')
const modal = $('modal')

const store = new Store()
const world = new World($<HTMLCanvasElement>('gl'), dirView)
const mq = window.matchMedia('(max-width: 820px)')

type Sel = { kind: 'figure' | 'prop' | 'key'; id: string } | null
const ui = {
  time: 0,
  playing: false,
  loop: true,
  sel: null as Sel,
  view: 'director' as 'director' | 'shot',
  frame: false,
  camPanel: false,
}
let dirty = true
const P = () => store.p
const aspect = () => aspectRatio(P().shot.aspect)
const snap = (t: number) => clamp(Math.round(t * P().shot.fps) / P().shot.fps, 0, P().shot.duration)
const fig = (id: string) => P().figures.find((f) => f.id === id)
const prop = (id: string) => P().props.find((f) => f.id === id)
const key = (id: string) => P().keys.find((k) => k.id === id)

// ---------- static labels ----------
function fill(sel: string, html: string) {
  document.querySelectorAll<HTMLElement>(sel).forEach((el) => (el.innerHTML = html))
}
fill('[data-a="undo"]', I.undo)
fill('[data-a="redo"]', I.redo)
fill('[data-a="loop"]', I.loop)
fill('[data-a="add-prop"]', `${I.cube}<span>Αντικείμενο</span>`)
$('promptBtn').innerHTML = `${I.text}<span>Prompt</span>`
$('addKey').innerHTML = `${I.key}<span>Keyframe</span>`

// ---------- refresh ----------
function refresh(reason = 'edit') {
  const p = P()
  if (ui.sel && !(ui.sel.kind === 'figure' ? fig(ui.sel.id) : ui.sel.kind === 'prop' ? prop(ui.sel.id) : key(ui.sel.id))) ui.sel = null
  ui.time = clamp(ui.time, 0, p.shot.duration)
  world.syncScene(p, ui.sel && ui.sel.kind !== 'key' ? ui.sel.id : null)
  world.syncPath(p, aspect(), ui.sel?.kind === 'key' ? ui.sel.id : null)
  renderTimeline()
  if (reason !== 'live') renderInspector()
  renderBars()
  dirty = true
}
store.on((r) => refresh(r))

function renderBars() {
  const p = P()
  app.className = `view-${ui.view}${ui.frame ? ' framing' : ''}${showInspector() ? ' ins-open' : ''}`
  document.querySelectorAll<HTMLButtonElement>('[data-a="undo"]').forEach((b) => (b.disabled = !store.canUndo()))
  document.querySelectorAll<HTMLButtonElement>('[data-a="redo"]').forEach((b) => (b.disabled = !store.canRedo()))
  document.querySelectorAll<HTMLElement>('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === ui.view))
  $('shotPill').innerHTML = `${I.sliders}<span>${p.shot.aspect} · ${gr(p.shot.duration, p.shot.duration % 1 ? 1 : 0)}s · ${p.shot.fps}fps</span>`
  $('playBtn').innerHTML = ui.playing ? I.pause : I.play
  $('loopBtn').classList.toggle('on', ui.loop)
  const add = $<HTMLButtonElement>('addFig')
  add.innerHTML = `${I.person}<span>Φιγούρα</span>`
  add.disabled = p.figures.length >= 4
  const k = ui.sel?.kind === 'key' ? key(ui.sel.id) : null
  $('lensBtn').innerHTML = `${I.lens}<span>${k ? k.lens : p.shot.lens}mm</span>`
  $('lensBtn').classList.toggle('on', !ui.sel && ui.camPanel)
  $('frameBtn').innerHTML = `${I.frame}<span>Κάδρο φακού</span>`
  $('frameBtn').classList.toggle('on', ui.frame)
  $('tc').textContent = timecode(ui.time, p.shot.fps)
  pip.style.aspectRatio = String(aspect())
  pip.style.width = aspect() < 1 ? '24%' : aspect() > 2 ? '46%' : '40%'
  const cam = evalCamera(p.keys, ui.time)
  $('shotInfo').textContent = `${Math.round(cam.lens)}mm · ${p.shot.aspect}`
  $('dirInfo').textContent = ui.frame ? `μέσα από τον φακό · ${lensNow()}mm` : 'ελεύθερη κάμερα'
}

const showInspector = () => !mq.matches || !!ui.sel || ui.camPanel
const lensNow = () => {
  const k = ui.sel?.kind === 'key' ? key(ui.sel.id) : null
  return k ? k.lens : P().shot.lens
}

// ---------- timeline ----------
function renderTimeline() {
  const p = P()
  const d = p.shot.duration
  const step = track.clientWidth < 360 ? 2 : 1
  let r = ''
  for (let s = 0; s <= d + 1e-6; s += step) r += `<i style="left:${(s / d) * 100}%"><b>${s}</b></i>`
  $('ruler').innerHTML = r
  $('keys').innerHTML = p.keys
    .map((k, i) => `<button class="kf${ui.sel?.kind === 'key' && ui.sel.id === k.id ? ' on' : ''}" data-key="${k.id}" style="left:${(k.t / d) * 100}%" aria-label="Keyframe ${i + 1}"></button>`)
    .join('')
  const sp = $('span')
  if (p.keys.length > 1) {
    sp.style.left = `${(p.keys[0].t / d) * 100}%`
    sp.style.width = `${((p.keys[p.keys.length - 1].t - p.keys[0].t) / d) * 100}%`
    sp.hidden = false
  } else sp.hidden = true
  placeHead()
}
function placeHead() {
  $('head').style.left = `${(ui.time / P().shot.duration) * 100}%`
  $('tc').textContent = timecode(ui.time, P().shot.fps)
}
function timeAt(clientX: number) {
  const r = track.getBoundingClientRect()
  return snap(((clientX - r.left) / r.width) * P().shot.duration)
}
let tDrag: { id: string | null; x: number; moved: boolean } | null = null
track.addEventListener('pointerdown', (e) => {
  const kb = (e.target as HTMLElement).closest<HTMLElement>('[data-key]')
  track.setPointerCapture(e.pointerId)
  ui.playing = false
  if (kb) {
    tDrag = { id: kb.dataset.key as string, x: e.clientX, moved: false }
    select({ kind: 'key', id: tDrag.id as string })
  } else {
    tDrag = { id: null, x: e.clientX, moved: true }
    setTime(timeAt(e.clientX))
  }
  renderBars()
})
track.addEventListener('pointermove', (e) => {
  if (!tDrag) return
  if (!tDrag.id) return setTime(timeAt(e.clientX))
  if (!tDrag.moved && Math.abs(e.clientX - tDrag.x) < 5) return
  tDrag.moved = true
  const t = timeAt(e.clientX)
  const id = tDrag.id
  store.live((p) => {
    const k = p.keys.find((k) => k.id === id)
    if (k) k.t = t
  })
  setTime(t)
})
const endTrack = () => {
  if (!tDrag) return
  if (tDrag.id) {
    if (tDrag.moved) store.end()
    else {
      const k = key(tDrag.id)
      if (k) setTime(k.t)
    }
  }
  tDrag = null
}
track.addEventListener('pointerup', endTrack)
track.addEventListener('pointercancel', endTrack)

function setTime(t: number) {
  ui.time = clamp(t, 0, P().shot.duration)
  placeHead()
  const cam = evalCamera(P().keys, ui.time)
  $('shotInfo').textContent = `${Math.round(cam.lens)}mm · ${P().shot.aspect}`
  dirty = true
}

// ---------- inspector ----------
const chips = (action: string, items: { v: string | number; t: string }[], cur: string | number) =>
  `<div class="chips">${items.map((i) => `<button class="chip${String(i.v) === String(cur) ? ' on' : ''}" data-a="${action}" data-v="${i.v}">${esc(i.t)}</button>`).join('')}</div>`
const lensChips = (action: string, cur: number) => chips(action, LENSES.map((l) => ({ v: l, t: `${l}` })), cur)
const head = (title: string, dot?: string) =>
  `<div class="ins-head">${dot ? `<span class="dot" style="background:${dot}"></span>` : ''}<b>${title}</b><button class="ico sm" data-a="close" aria-label="Κλείσιμο">${I.close}</button></div>`

function renderInspector() {
  const s = ui.sel
  let h = ''
  if (s?.kind === 'figure') {
    const f = fig(s.id) as Figure
    h =
      head(`Φιγούρα ${f.label}`, FIG_COLORS[f.label]) +
      `<div class="fld"><span>Στάση</span>${chips('pose', POSES.map((p) => ({ v: p.id, t: p.gr })), f.pose)}</div>` +
      rotField(f.rot) +
      `<div class="fld"><span>Ύψος <em id="hv">${gr(f.height, 2)} m</em></span><input type="range" min="1.5" max="2" step="0.01" value="${f.height}" data-k="height"></div>` +
      `<div class="row"><button class="pill" data-a="center">${I.target}<span>Κέντρο εδώ</span></button><div class="grow"></div><button class="pill danger" data-a="del">${I.trash}<span>Διαγραφή</span></button></div>`
  } else if (s?.kind === 'prop') {
    const pr = prop(s.id) as Prop
    const name = PROPS.find((x) => x.id === pr.kind)?.gr || ''
    h =
      head(name) +
      rotField(pr.rot) +
      `<div class="row"><button class="pill" data-a="center">${I.target}<span>Κέντρο εδώ</span></button><div class="grow"></div><button class="pill danger" data-a="del">${I.trash}<span>Διαγραφή</span></button></div>`
  } else if (s?.kind === 'key') {
    const k = key(s.id) as Keyframe
    const i = P().keys.indexOf(k)
    const last = i === P().keys.length - 1
    h =
      head(`Keyframe ${i + 1} / ${P().keys.length} · ${gr(k.t, 2)} s`) +
      `<div class="fld"><span>Φακός (mm)</span>${lensChips('klens', k.lens)}</div>` +
      (last ? '' : `<div class="fld"><span>Μετάβαση ως το επόμενο</span>${chips('kease', EASES.map((e) => ({ v: e.id, t: e.gr })), k.ease)}</div>`) +
      `<div class="fld"><span>Roll <em id="rv">${Math.round(k.roll)}°</em></span><input type="range" min="-45" max="45" step="1" value="${k.roll}" data-k="roll"></div>` +
      `<div class="row wrap"><button class="pill" data-a="goto">${I.eye}<span>Δες από εδώ</span></button><button class="pill" data-a="kupdate">${I.refresh}<span>Ενημέρωσε από την τρέχουσα θέση</span></button></div>` +
      `<div class="row"><div class="grow"></div><button class="pill danger" data-a="del">${I.trash}<span>Διαγραφή</span></button></div>`
  } else {
    const keys = P().keys
    h =
      head('Κάμερα') +
      `<div class="fld"><span>Φακός για νέο keyframe (mm)</span>${lensChips('lens', P().shot.lens)}</div>` +
      `<p class="hint">Στήσε τη Director view όπως θες το κάδρο, διάλεξε χρόνο στο timeline και πάτα Keyframe. Με το Κάδρο φακού βλέπεις ακριβώς ό,τι γράφει η κάμερα.</p>` +
      `<button class="pill main wide" data-a="add-key">${I.key}<span>Πρόσθεσε keyframe από την τρέχουσα θέση</span></button>` +
      (keys.length
        ? `<div class="fld"><span>Keyframes</span><div class="chips">${keys.map((k, i) => `<button class="chip" data-a="pick-key" data-v="${k.id}">${i + 1} · ${gr(k.t, 1)}s · ${k.lens}mm</button>`).join('')}</div></div>`
        : '')
  }
  inspector.innerHTML = h
}
const rotField = (rot: number) =>
  `<div class="fld"><span>Περιστροφή <em id="rotv">${Math.round(rot)}°</em></span><div class="row"><button class="ico" data-a="rot" data-v="-45" aria-label="45° αριστερά">${I.rotL}</button><input type="range" min="-180" max="180" step="5" value="${rot}" data-k="rot"><button class="ico" data-a="rot" data-v="45" aria-label="45° δεξιά">${I.rotR}</button></div></div>`

inspector.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement
  const k = el.dataset.k
  const s = ui.sel
  if (!k || !s) return
  const v = Number(el.value)
  store.live((p) => {
    const o: { rot?: number; height?: number; roll?: number } | undefined =
      s.kind === 'figure' ? p.figures.find((f) => f.id === s.id) : s.kind === 'prop' ? p.props.find((f) => f.id === s.id) : p.keys.find((f) => f.id === s.id)
    if (!o) return
    if (k === 'rot') o.rot = v
    if (k === 'height') o.height = v
    if (k === 'roll') o.roll = v
  })
  const lab = k === 'rot' ? 'rotv' : k === 'height' ? 'hv' : 'rv'
  $(lab).textContent = k === 'height' ? `${gr(v, 2)} m` : `${Math.round(v)}°`
})
inspector.addEventListener('change', (e) => {
  if ((e.target as HTMLElement).dataset.k) store.end()
})

// ---------- actions ----------
function select(s: Sel) {
  ui.sel = s
  if (s) ui.camPanel = false
  refresh('sel')
}

function centerOn(x: number, y: number, z: number) {
  const c = world.controls
  const d = new THREE.Vector3(x, y, z).sub(c.target)
  c.target.add(d)
  world.dirCam.position.add(d)
  c.update()
  dirty = true
}

function viewCenterFloor(): THREE.Vector3 {
  const t = world.controls.target
  return new THREE.Vector3(t.x, 0, t.z)
}

function freeSpot(): THREE.Vector3 {
  const c = viewCenterFloor()
  const taken = [...P().figures.map((f) => [f.x, f.z]), ...P().props.map((p) => [p.x, p.z])]
  for (let r = 0; r < 12; r++) {
    for (let a = 0; a < 8; a++) {
      const x = c.x + (r ? Math.cos((a / 8) * Math.PI * 2) * r * 0.9 : 0)
      const z = c.z + (r ? Math.sin((a / 8) * Math.PI * 2) * r * 0.9 : 0)
      if (taken.every(([tx, tz]) => Math.hypot(tx - x, tz - z) > 0.9)) return new THREE.Vector3(x, 0, z)
      if (!r) break
    }
  }
  return c
}

function addKey() {
  const p = P()
  const t = snap(ui.time)
  const pos = world.dirCam.position.toArray().map((n) => +n.toFixed(3)) as Vec3
  const target = world.controls.target.toArray().map((n) => +n.toFixed(3)) as Vec3
  const near = p.keys.find((k) => Math.abs(k.t - t) < 0.5 / p.shot.fps)
  let id = near?.id || uid()
  store.commit((p) => {
    const k = p.keys.find((k) => k.id === id)
    if (k) Object.assign(k, { pos, target })
    else p.keys.push({ id, t, pos, target, roll: 0, lens: p.shot.lens, ease: 'linear' })
  })
  select({ kind: 'key', id })
  toast(near ? 'Το keyframe ενημερώθηκε' : 'Νέο keyframe')
}

function act(a: string, v: string | undefined) {
  const s = ui.sel
  switch (a) {
    case 'undo':
      return store.undo()
    case 'redo':
      return store.redo()
    case 'view':
      ui.view = v as 'director' | 'shot'
      return refresh('sel')
    case 'play':
      if (!ui.playing && ui.time >= P().shot.duration - 1e-3) ui.time = 0
      ui.playing = !ui.playing
      return renderBars()
    case 'loop':
      ui.loop = !ui.loop
      return renderBars()
    case 'frame':
      ui.frame = !ui.frame
      dirty = true
      return renderBars()
    case 'camera':
      if (mq.matches && !ui.sel && ui.camPanel) {
        ui.camPanel = false
        return refresh('sel')
      }
      ui.sel = null
      ui.camPanel = true
      return refresh('sel')
    case 'close':
      ui.sel = null
      ui.camPanel = false
      return refresh('sel')
    case 'add-key':
      return addKey()
    case 'pick-key': {
      const k = key(v as string)
      if (k) setTime(k.t)
      return select({ kind: 'key', id: v as string })
    }
    case 'add-fig': {
      const used = new Set(P().figures.map((f) => f.label))
      const label = LABELS.find((l) => !used.has(l))
      if (!label) return
      const at = freeSpot()
      const id = uid()
      store.commit((p) => p.figures.push({ id, label, x: +at.x.toFixed(2), z: +at.z.toFixed(2), rot: 0, height: 1.75, pose: 'stand' }))
      return select({ kind: 'figure', id })
    }
    case 'add-prop':
      return openModal(
        `<h2>Πρόσθεσε αντικείμενο</h2><div class="grid">${PROPS.map((p) => `<button class="pill" data-a="new-prop" data-v="${p.id}">${I.cube}<span>${p.gr}</span></button>`).join('')}</div><div class="foot"><button class="pill" data-a="modal-close">Κλείσιμο</button></div>`,
      )
    case 'new-prop': {
      closeModal()
      const at = freeSpot()
      const id = uid()
      store.commit((p) => p.props.push({ id, kind: v as Prop['kind'], x: +at.x.toFixed(2), z: +at.z.toFixed(2), rot: 0 }))
      return select({ kind: 'prop', id })
    }
    case 'pose':
      return store.commit((p) => {
        const f = p.figures.find((f) => f.id === s?.id)
        if (f) f.pose = v as Figure['pose']
      })
    case 'rot':
      return store.commit((p) => {
        const o = s?.kind === 'figure' ? p.figures.find((f) => f.id === s.id) : p.props.find((f) => f.id === s?.id)
        if (o) o.rot = ((((o.rot + Number(v) + 180) % 360) + 360) % 360) - 180
      })
    case 'center': {
      const o = s?.kind === 'figure' ? fig(s.id) : s ? prop(s.id) : null
      if (o) centerOn(o.x, 'height' in o ? o.height * 0.55 : 0.6, o.z)
      return
    }
    case 'del':
      if (!s) return
      store.commit((p) => {
        if (s.kind === 'figure') p.figures = p.figures.filter((f) => f.id !== s.id)
        if (s.kind === 'prop') p.props = p.props.filter((f) => f.id !== s.id)
        if (s.kind === 'key') p.keys = p.keys.filter((f) => f.id !== s.id)
      })
      return select(null)
    case 'lens':
      return store.commit((p) => (p.shot.lens = Number(v)))
    case 'klens':
      return store.commit((p) => {
        const k = p.keys.find((k) => k.id === s?.id)
        if (k) k.lens = Number(v)
      })
    case 'kease':
      return store.commit((p) => {
        const k = p.keys.find((k) => k.id === s?.id)
        if (k) k.ease = v as Keyframe['ease']
      })
    case 'goto': {
      const k = s?.kind === 'key' ? key(s.id) : null
      if (!k) return
      world.dirCam.position.set(...k.pos)
      world.controls.target.set(...k.target)
      world.controls.update()
      ui.frame = true
      setTime(k.t)
      return renderBars()
    }
    case 'kupdate': {
      const id = s?.kind === 'key' ? s.id : ''
      store.commit((p) => {
        const k = p.keys.find((k) => k.id === id)
        if (!k) return
        k.pos = world.dirCam.position.toArray().map((n) => +n.toFixed(3)) as Vec3
        k.target = world.controls.target.toArray().map((n) => +n.toFixed(3)) as Vec3
      })
      return toast('Το keyframe ενημερώθηκε')
    }
    case 'settings':
      return openSettings()
    case 'aspect':
      store.commit((p) => (p.shot.aspect = v as typeof p.shot.aspect))
      return openSettings()
    case 'fps':
      store.commit((p) => (p.shot.fps = Number(v) as 24 | 25))
      return openSettings()
    case 'clear-keys':
      store.commit((p) => (p.keys = []))
      closeModal()
      return toast('Τα keyframes καθάρισαν')
    case 'example':
      store.replace(exampleProject())
      ui.time = 0
      closeModal()
      return select(null)
    case 'prompt':
      return openPrompt()
    case 'copy':
      return copyPrompt()
    case 'modal-close':
      return closeModal()
  }
}

document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')
  if (!b || (b as HTMLButtonElement).disabled) return
  act(b.dataset.a as string, b.dataset.v)
})

// ---------- modals ----------
function openModal(html: string) {
  modal.innerHTML = `<div class="card">${html}</div>`
  modal.hidden = false
}
function closeModal() {
  modal.hidden = true
  modal.innerHTML = ''
}
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal()
})

function openSettings() {
  const s = P().shot
  openModal(
    `<h2>Πλάνο</h2>` +
      `<div class="fld"><span>Aspect</span>${chips('aspect', ASPECTS.map((a) => ({ v: a, t: a })), s.aspect)}</div>` +
      `<div class="fld"><span>Διάρκεια <em id="dv">${gr(s.duration, 1)} s</em></span><input type="range" min="4" max="15" step="0.5" value="${s.duration}" id="durIn"></div>` +
      `<div class="fld"><span>Καρέ το δευτερόλεπτο</span>${chips('fps', [24, 25].map((f) => ({ v: f, t: `${f} fps` })), s.fps)}</div>` +
      `<p class="hint">Αλλάζοντας τη διάρκεια, τα keyframes απλώνονται ή μαζεύονται αναλογικά.</p>` +
      `<div class="foot"><button class="pill" data-a="clear-keys">${I.trash}<span>Κενό πλάνο</span></button><button class="pill" data-a="example">${I.refresh}<span>Το παράδειγμα</span></button><div class="grow"></div><button class="pill main" data-a="modal-close">Έτοιμο</button></div>`,
  )
  const inp = modal.querySelector<HTMLInputElement>('#durIn') as HTMLInputElement
  inp.addEventListener('input', () => ($('dv').textContent = `${gr(Number(inp.value), 1)} s`))
  inp.addEventListener('change', () => {
    const nd = Number(inp.value)
    store.commit((p) => {
      const f = nd / p.shot.duration
      for (const k of p.keys) k.t = Math.round(k.t * f * p.shot.fps) / p.shot.fps
      p.shot.duration = nd
    })
    ui.time = clamp(ui.time * 1, 0, nd)
  })
}

function openPrompt() {
  const text = buildPrompt(P())
  openModal(
    `<h2>Prompt</h2><p class="hint">Ανέβασε το βίντεο reference ως @Video1 και επικόλλησε αυτό το κείμενο.</p>` +
      `<textarea id="promptText" readonly spellcheck="false">${esc(text)}</textarea>` +
      `<div class="foot"><div class="grow"></div><button class="pill" data-a="modal-close">Κλείσιμο</button><button class="pill main" data-a="copy" id="copyBtn">${I.copy}<span>Αντιγραφή</span></button></div>`,
  )
}
async function copyPrompt() {
  const ta = modal.querySelector<HTMLTextAreaElement>('#promptText')
  if (!ta) return
  try {
    await navigator.clipboard.writeText(ta.value)
  } catch {
    ta.select()
    document.execCommand('copy')
  }
  const b = $('copyBtn')
  b.innerHTML = `${I.copy}<span>Αντιγράφηκε</span>`
  setTimeout(() => (b.innerHTML = `${I.copy}<span>Αντιγραφή</span>`), 1600)
}

let toastTimer = 0
function toast(t: string) {
  let el = document.getElementById('toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'toast'
    document.body.appendChild(el)
  }
  el.textContent = t
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => el?.classList.remove('show'), 1400)
}

// ---------- dragging figures and props in the Director view ----------
let drag: { kind: 'figure' | 'prop'; id: string; dx: number; dz: number; pid: number } | null = null
let tap: { x: number; y: number; t: number; pid: number } | null = null
let pointers = 0
stage.addEventListener(
  'pointerdown',
  (e) => {
    if (!dirView.contains(e.target as Node) || e.target === pip) return
    pointers++
    if (pointers > 1) {
      tap = null
      return
    }
    const hit = world.pick(e.clientX, e.clientY)
    if (hit) {
      const o = hit.kind === 'figure' ? fig(hit.id) : prop(hit.id)
      const fp = world.floorPoint(e.clientX, e.clientY)
      if (!o || !fp) return
      world.controls.enabled = false
      drag = { kind: hit.kind, id: hit.id, dx: o.x - fp.x, dz: o.z - fp.z, pid: e.pointerId }
      dirView.setPointerCapture(e.pointerId)
      if (ui.sel?.id !== hit.id) select(hit)
    } else tap = { x: e.clientX, y: e.clientY, t: performance.now(), pid: e.pointerId }
  },
  true,
)
dirView.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.pid) return
  const fp = world.floorPoint(e.clientX, e.clientY)
  if (!fp) return
  const d = drag
  store.live((p) => {
    const o = d.kind === 'figure' ? p.figures.find((f) => f.id === d.id) : p.props.find((f) => f.id === d.id)
    if (!o) return
    o.x = +clamp(fp.x + d.dx, -19, 19).toFixed(2)
    o.z = +clamp(fp.z + d.dz, -19, 19).toFixed(2)
  })
})
const endPointer = (e: PointerEvent) => {
  pointers = Math.max(0, pointers - 1)
  if (drag && e.pointerId === drag.pid) {
    drag = null
    world.controls.enabled = true
    store.end()
  }
  if (tap && e.pointerId === tap.pid) {
    if (e.type === 'pointerup' && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 6 && performance.now() - tap.t < 350 && ui.sel) select(null)
    tap = null
  }
}
window.addEventListener('pointerup', endPointer)
window.addEventListener('pointercancel', endPointer)
pip.addEventListener('click', () => act('view', 'shot'))

// ---------- keyboard on a computer ----------
window.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  const mod = e.metaKey || e.ctrlKey
  if (mod && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    return e.shiftKey ? store.redo() : store.undo()
  }
  if (mod && e.key.toLowerCase() === 'y') return store.redo()
  if (e.key === ' ') {
    e.preventDefault()
    return act('play', undefined)
  }
  if (e.key.toLowerCase() === 'k') return addKey()
  if (e.key === 'Escape') return modal.hidden ? select(null) : closeModal()
  if ((e.key === 'Delete' || e.key === 'Backspace') && ui.sel) return act('del', undefined)
})

// ---------- render loop ----------
function rel(el: HTMLElement, base: DOMRect): Rect {
  const r = el.getBoundingClientRect()
  return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }
}
function fit(r: Rect, a: number): Rect {
  let w = r.w
  let h = w / a
  if (h > r.h) {
    h = r.h
    w = h * a
  }
  return { x: r.x + (r.w - w) / 2, y: r.y + (r.h - h) / 2, w, h }
}
const visible = (el: HTMLElement) => el.offsetParent !== null && el.clientWidth > 0

let lastW = 0
let lastH = 0
let lastT = performance.now()
function render() {
  const base = stage.getBoundingClientRect()
  const W = Math.round(base.width)
  const H = Math.round(base.height)
  if (W !== lastW || H !== lastH) {
    world.setSize(W, H)
    lastW = W
    lastH = H
    renderTimeline()
  }
  world.clearAll(W, H)
  const a = aspect()
  const cam = evalCamera(P().keys, ui.time)
  applyCam(world.shotCam, cam, a)
  world.syncCurrent(cam, a)

  if (visible(dirView)) {
    const r = rel(dirView, base)
    const dc = world.dirCam
    if (ui.frame) {
      const f = fit(r, a)
      world.draw(dc, r, H, true)
      dc.fov = vfov(lensNow(), a)
      dc.aspect = a
      dc.updateProjectionMatrix()
      world.helpersOn(false)
      world.draw(dc, f, H)
      world.dirRect = { x: f.x + base.left, y: f.y + base.top, w: f.w, h: f.h }
    } else {
      dc.fov = 50
      dc.aspect = r.w / Math.max(1, r.h)
      dc.updateProjectionMatrix()
      world.helpersOn(true)
      world.draw(dc, r, H)
      world.dirRect = { x: r.x + base.left, y: r.y + base.top, w: r.w, h: r.h }
    }
  }
  if (visible(shotView)) {
    const r = rel(shotView, base)
    world.draw(world.shotCam, r, H, true)
    world.draw(world.shotCam, fit(r, a), H)
  }
  if (visible(pip) && mq.matches) {
    const r = rel(pip, base)
    world.draw(world.shotCam, r, H, true)
    world.draw(world.shotCam, fit(r, a), H)
  }
}

function loop(now: number) {
  const dt = Math.min(0.1, (now - lastT) / 1000)
  lastT = now
  if (ui.playing) {
    let t = ui.time + dt
    const d = P().shot.duration
    if (t >= d) {
      if (ui.loop) t = t % d
      else {
        t = d
        ui.playing = false
        renderBars()
      }
    }
    ui.time = t
    placeHead()
    $('shotInfo').textContent = `${Math.round(evalCamera(P().keys, t).lens)}mm · ${P().shot.aspect}`
    dirty = true
  }
  if (world.controls.update()) dirty = true
  if (dirty) {
    dirty = false
    render()
  }
  requestAnimationFrame(loop)
}

world.controls.addEventListener('change', () => (dirty = true))
window.addEventListener('resize', () => {
  dirty = true
  refresh('sel')
})
mq.addEventListener('change', () => refresh('sel'))

// open on the example's first keyframe from a little behind, so the path and the figures read at once
refresh('init')
requestAnimationFrame(loop)

// for tests
;(window as unknown as { previz: unknown }).previz = { store, ui, world, buildPrompt: () => buildPrompt(P()) }
