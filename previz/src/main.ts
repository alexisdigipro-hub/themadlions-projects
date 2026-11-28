import './style.css'
import * as THREE from 'three'
import { Store, exampleProject, migrate, FIG_COLORS, LABELS, LENSES, ASPECTS, POSES, EASES, PROPS, type Figure, type Prop, type Keyframe, type Vec3 } from './state'
import { World, type Rect } from './scene'
import { applyCam, aspectRatio, camAt, keyTarget, shotsOf, vfov } from './camera'
import { figAt, pathLength } from './motion'
import { CUTS, PRESETS, applyCuts, applyPreset } from './presets'
import { SCENES } from './scenes'
import { exportFrames, exportVideo, frameCount, frameSize, videoSupport } from './export'
import { getKey, sceneFromText, setKey, toProject } from './ai'
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
fill('[data-a="presets"]', `${I.wand}<span>Έτοιμα</span>`)
fill('[data-a="help"]', I.help)
fill('#aiBtn', `${I.spark}<span>Σκηνή με AI</span>`)
$('promptBtn').innerHTML = `${I.text}<span>Prompt</span>`
$('exportBtn').innerHTML = `${I.down}<span>Export</span>`
$('addKey').innerHTML = `${I.key}<span>Keyframe</span>`

// ---------- refresh ----------
function refresh(reason = 'edit') {
  const p = P()
  if (ui.sel && !(ui.sel.kind === 'figure' ? fig(ui.sel.id) : ui.sel.kind === 'prop' ? prop(ui.sel.id) : key(ui.sel.id))) ui.sel = null
  ui.time = clamp(ui.time, 0, p.shot.duration)
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
  $('lensBtn').innerHTML = `${I.lens}<span>Κάμερα · ${k ? k.lens : p.shot.lens}mm</span>`
  $('lensBtn').classList.toggle('on', !ui.sel && ui.camPanel)
  $('frameBtn').innerHTML = `${I.frame}<span>Κάδρο φακού</span>`
  $('frameBtn').classList.toggle('on', ui.frame)
  $('tc').textContent = timecode(ui.time, p.shot.fps)
  pip.style.aspectRatio = String(aspect())
  pip.style.width = aspect() < 1 ? '24%' : aspect() > 2 ? '46%' : '40%'
  const cam = camAt(p, ui.time)
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
  const narrow = track.clientWidth < 360
  const step = d > 20 ? (narrow ? 5 : 2) : d > 10 && narrow ? 2 : narrow ? 2 : 1
  let r = ''
  for (let s = 0; s <= d + 1e-6; s += step) r += `<i style="left:${(s / d) * 100}%"><b>${s}</b></i>`
  $('ruler').innerHTML = r
  $('keys').innerHTML = p.keys
    .map((k, i) => `<button class="kf${ui.sel?.kind === 'key' && ui.sel.id === k.id ? ' on' : ''}${k.cut ? ' cut' : ''}" data-key="${k.id}" style="left:${(k.t / d) * 100}%" aria-label="Keyframe ${i + 1}"></button>`)
    .join('')
  // one bar per shot: its move, then a thinner hold until the next cut
  const shots = shotsOf(p.keys)
  $('span').innerHTML = shots
    .map((g, i) => {
      const t0 = g[0].t
      const t1 = g[g.length - 1].t
      const end = shots[i + 1] ? shots[i + 1][0].t : shots.length > 1 ? d : t1
      return `<i style="left:${(t0 / d) * 100}%;width:${((t1 - t0) / d) * 100}%"></i><i class="hold" style="left:${(t1 / d) * 100}%;width:${((end - t1) / d) * 100}%"></i>`
    })
    .join('')
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
  const cam = camAt(P(), ui.time)
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
      head(`Φιγούρα ${f.label}${f.name ? ` · ${esc(f.name)}` : ''}`, FIG_COLORS[f.label]) +
      `<div class="fld"><span>Στάση</span>${chips('pose', POSES.map((p) => ({ v: p.id, t: p.gr })), f.pose)}</div>` +
      rotField(f.rot) +
      `<div class="fld"><span>Ύψος <em id="hv">${gr(f.height, 2)} m</em></span><input type="range" min="1.5" max="2" step="0.01" value="${f.height}" data-k="height"></div>` +
      pathField(f) +
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
      (i === 0 ? '' : `<div class="fld"><span>Πώς φτάνει εδώ η κάμερα</span>${chips('kcut', [{ v: '0', t: 'Με κίνηση' }, { v: '1', t: 'Με cut (νέο πλάνο)' }], k.cut ? '1' : '0')}</div>`) +
      `<div class="fld"><span>Η κάμερα κοιτάει</span>${chips('klook', [{ v: '', t: 'Ελεύθερα' }, ...P().figures.map((f) => ({ v: f.label, t: `Κλειδωμένη στο ${f.label}` }))], k.look || '')}</div>` +
      `<div class="fld"><span>Roll <em id="rv">${Math.round(k.roll)}°</em></span><input type="range" min="-45" max="45" step="1" value="${k.roll}" data-k="roll"></div>` +
      `<div class="row wrap"><button class="pill" data-a="goto">${I.eye}<span>Δες από εδώ</span></button><button class="pill" data-a="kupdate">${I.refresh}<span>Ενημέρωσε από την τρέχουσα θέση</span></button></div>` +
      `<div class="row"><div class="grow"></div><button class="pill danger" data-a="del">${I.trash}<span>Διαγραφή</span></button></div>`
  } else {
    const keys = P().keys
    h =
      head('Κάμερα') +
      `<div class="fld"><span>Φακός για νέο keyframe (mm)</span>${lensChips('lens', P().shot.lens)}</div>` +
      `<div class="fld"><span>Handheld <em id="shv">${shakeName(P().shot.shake)}</em></span><input type="range" min="0" max="100" step="5" value="${P().shot.shake}" data-k="shake"></div>` +
      `<button class="pill wide" data-a="presets">${I.wand}<span>Έτοιμες κινήσεις και σκηνές</span></button>` +
      `<p class="hint">Στήσε τη Director view όπως θες το κάδρο, διάλεξε χρόνο στο timeline και πάτα Keyframe. Με το Κάδρο φακού βλέπεις ακριβώς ό,τι γράφει η κάμερα.</p>` +
      `<button class="pill main wide" data-a="add-key">${I.key}<span>Πρόσθεσε keyframe από την τρέχουσα θέση</span></button>` +
      (keys.length
        ? `<div class="fld"><span>Keyframes</span><div class="chips">${keys.map((k, i) => `<button class="chip" data-a="pick-key" data-v="${k.id}">${i + 1} · ${gr(k.t, 1)}s · ${k.lens}mm</button>`).join('')}</div></div>`
        : '')
  }
  inspector.innerHTML = h
}
const shakeName = (n: number) => (n <= 0 ? 'κλειστό' : `${n} · ${n < 34 ? 'ελαφρύ' : n < 67 ? 'φυσικό' : 'έντονο'}`)
function pathField(f: Figure): string {
  const d = P().shot.duration
  if (!f.path)
    return `<div class="fld"><span>Κίνηση</span><button class="pill wide" data-a="path-add">${I.walk}<span>Να περπατήσει ως ένα σημείο</span></button></div>`
  const speed = pathLength(f) / Math.max(0.1, f.path.t1 - f.path.t0)
  return (
    `<div class="fld"><span>Κίνηση <em id="pinfo">${gr(pathLength(f), 1)} m · ${gr(speed, 1)} m/s</em></span>${chips('gait', [{ v: 'walk', t: 'Περπάτημα' }, { v: 'run', t: 'Τρέξιμο' }], f.pose === 'run' ? 'run' : 'walk')}` +
    `<p class="hint">Σύρε τη σημαία στη Director για να ορίσεις πού φτάνει.</p></div>` +
    `<div class="fld"><span>Ξεκινά <em id="p0v">${gr(f.path.t0, 1)} s</em></span><input type="range" min="0" max="${d}" step="0.25" value="${f.path.t0}" data-k="pt0"></div>` +
    `<div class="fld"><span>Φτάνει <em id="p1v">${gr(f.path.t1, 1)} s</em></span><input type="range" min="0" max="${d}" step="0.25" value="${f.path.t1}" data-k="pt1"></div>` +
    `<button class="pill" data-a="path-del">${I.close}<span>Χωρίς κίνηση</span></button>`
  )
}
const rotField = (rot: number) =>
  `<div class="fld"><span>Περιστροφή <em id="rotv">${Math.round(rot)}°</em></span><div class="row"><button class="ico" data-a="rot" data-v="-45" aria-label="45° αριστερά">${I.rotL}</button><input type="range" min="-180" max="180" step="5" value="${rot}" data-k="rot"><button class="ico" data-a="rot" data-v="45" aria-label="45° δεξιά">${I.rotR}</button></div></div>`

inspector.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement
  const k = el.dataset.k
  const s = ui.sel
  if (!k) return
  const v = Number(el.value)
  if (k === 'shake') {
    store.live((p) => (p.shot.shake = v))
    $('shv').textContent = shakeName(v)
    return
  }
  if (!s) return
  store.live((p) => {
    if (s.kind === 'key') {
      const o = p.keys.find((f) => f.id === s.id)
      if (o && k === 'roll') o.roll = v
      return
    }
    if (s.kind === 'prop') {
      const o = p.props.find((f) => f.id === s.id)
      if (o && k === 'rot') o.rot = v
      return
    }
    const o = p.figures.find((f) => f.id === s.id)
    if (!o) return
    if (k === 'rot') o.rot = v
    if (k === 'height') o.height = v
    if (o.path && k === 'pt0') o.path.t0 = Math.min(v, o.path.t1 - 0.25)
    if (o.path && k === 'pt1') o.path.t1 = Math.max(v, o.path.t0 + 0.25)
  })
  const lab = { rot: 'rotv', height: 'hv', roll: 'rv', pt0: 'p0v', pt1: 'p1v' }[k] as string
  $(lab).textContent = k === 'height' ? `${gr(v, 2)} m` : k === 'pt0' || k === 'pt1' ? `${gr(v, 1)} s` : `${Math.round(v)}°`
  if (k === 'pt0' || k === 'pt1') setTime(v)
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

async function act(a: string, v: string | undefined) {
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
    case 'presets':
      return openPresets()
    case 'ready-tab':
      readyTab = v as typeof readyTab
      return openPresets()
    case 'ready-scene': {
      const sc = SCENES.find((x) => x.id === v)
      if (!sc) return
      const project = toProject(sc.scene, P())
      store.replace(project)
      closeModal()
      ui.sel = null
      ui.frame = false
      ui.time = 0
      ui.playing = true
      centerOn(0, 0.9, 0)
      refresh('sel')
      return toast(`${sc.gr}. Δεν σου κάνει; Αναίρεση.`)
    }
    case 'preset-fig':
      presetFig = v as string
      return openPresets()
    case 'cuts': {
      const f0 = P().figures.find((f) => f.id === presetFig) || P().figures[0]
      if (!f0) return
      const name = CUTS.find((x) => x.id === v)?.gr
      store.commit((p) => {
        const f = p.figures.find((x) => x.id === f0.id)
        if (f) applyCuts(p, v as string, f)
      })
      closeModal()
      ui.sel = null
      ui.frame = false
      ui.time = 0
      ui.playing = true
      refresh('sel')
      return toast(`${name}: ${shotsOf(P().keys).length} πλάνα. Δεν σου κάνει; Αναίρεση.`)
    }
    case 'kcut':
      return store.commit((p) => {
        const k = p.keys.find((k) => k.id === s?.id)
        if (k) k.cut = v === '1'
      })
    case 'preset': {
      const f0 = P().figures.find((f) => f.id === presetFig) || P().figures[0]
      if (!f0) return
      const name = PRESETS.find((x) => x.id === v)?.gr
      store.commit((p) => {
        const f = p.figures.find((x) => x.id === f0.id)
        if (f) applyPreset(p, v as string, f)
      })
      closeModal()
      ui.sel = null
      ui.frame = false
      ui.time = 0
      ui.playing = true
      refresh('sel')
      return toast(`${name} γύρω από το ${f0.label}. Δεν σου κάνει; Αναίρεση.`)
    }
    case 'help':
      return openHelp()
    case 'export':
      return openExport()
    case 'ex-video':
      return runVideo()
    case 'ex-stop':
      exStop.now = true
      return
    case 'ex-save':
      return exResult && saveBlobs([exResult.blob], [exResult.name])
    case 'ex-frame': {
      const p = P()
      const last = (frameCount(p) - 1) / p.shot.fps
      const shots = shotsOf(p.keys)
      const times = v === 'start' ? [0] : v === 'end' ? [last] : shots.map((g, i) => (i ? g[0].t : 0))
      const names = v === 'start' ? ['previz-start.png'] : v === 'end' ? ['previz-end.png'] : times.map((_, i) => `previz-shot-${i + 1}.png`)
      ui.playing = false
      try {
        const blobs = await exportFrames(world, p, times)
        dirty = true
        await saveBlobs(blobs, names)
      } catch {
        toast('Το καρέ δεν βγήκε. Δοκίμασε ξανά.')
      }
      return
    }
    case 'ex-project':
      return saveBlobs([new Blob([JSON.stringify(P(), null, 1)], { type: 'application/json' })], ['scene.previz.json'])
    case 'ex-open':
      return $('fileIn').click()
    case 'share':
      await copyText(sceneLink())
      closeModal()
      return toast('Το link της σκηνής αντιγράφηκε')
    case 'approve':
      return openApprove()
    case 'approve-copy': {
      const note = (modal.querySelector<HTMLTextAreaElement>('#apText')?.value || '').trim()
      await copyText(`ΣΩΣΤΟ ΠΛΑΝΟ\n${note || '(χωρίς σημείωση)'}\n\n${buildPrompt(P())}\n\n${sceneLink()}`)
      closeModal()
      return toast('Αντιγράφηκε. Επικόλλησέ το στο Claude.')
    }
    case 'ai':
      return openAi()
    case 'ai-run':
      return runAi()
    case 'ai-key':
      setKey('')
      return openAi()
    case 'path-add':
      return store.commit((p) => {
        const f = p.figures.find((f) => f.id === s?.id)
        if (!f) return
        const r = (f.rot * Math.PI) / 180
        f.path = { x: +(f.x + Math.sin(r) * 4).toFixed(2), z: +(f.z + Math.cos(r) * 4).toFixed(2), t0: 0, t1: Math.min(p.shot.duration, 3) }
        if (f.pose !== 'run') f.pose = 'walk'
      })
    case 'path-del':
      return store.commit((p) => {
        const f = p.figures.find((f) => f.id === s?.id)
        if (!f) return
        f.path = null
        f.pose = 'stand'
      })
    case 'gait':
      return store.commit((p) => {
        const f = p.figures.find((f) => f.id === s?.id)
        if (f) f.pose = v as Figure['pose']
      })
    case 'klook':
      return store.commit((p) => {
        const k = p.keys.find((k) => k.id === s?.id)
        if (k) k.look = (v || null) as Keyframe['look']
      })
    case 'pose':
      return store.commit((p) => {
        const f = p.figures.find((f) => f.id === s?.id)
        if (!f) return
        f.pose = v as Figure['pose']
        if (f.path && v !== 'walk' && v !== 'run') f.path = null
      })
    case 'rot':
      return store.commit((p) => {
        const o = s?.kind === 'figure' ? p.figures.find((f) => f.id === s.id) : p.props.find((f) => f.id === s?.id)
        if (o) o.rot = ((((o.rot + Number(v) + 180) % 360) + 360) % 360) - 180
      })
    case 'center': {
      const f = s?.kind === 'figure' ? fig(s.id) : null
      const o = s?.kind === 'prop' ? prop(s.id) : null
      if (f) {
        const st = figAt(f, ui.time)
        centerOn(st.x, f.height * 0.55, st.z)
      } else if (o) centerOn(o.x, 0.6, o.z)
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
      world.controls.target.copy(keyTarget(P(), k, k.t))
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
      `<div class="fld"><span>Διάρκεια <em id="dv">${gr(s.duration, 1)} s</em></span><input type="range" min="4" max="30" step="0.5" value="${s.duration}" id="durIn"></div>` +
      `<div class="fld"><span>Καρέ το δευτερόλεπτο</span>${chips('fps', [24, 25].map((f) => ({ v: f, t: `${f} fps` })), s.fps)}</div>` +
      `<p class="hint">Αλλάζοντας τη διάρκεια, τα keyframes απλώνονται ή μαζεύονται αναλογικά.</p>` +
      `<div class="foot"><button class="pill" data-a="help">${I.help}<span>Οδηγίες</span></button><button class="pill" data-a="share">${I.copy}<span>Link σκηνής</span></button><button class="pill" data-a="export">${I.down}<span>Export</span></button><button class="pill" data-a="clear-keys">${I.trash}<span>Κενό πλάνο</span></button><button class="pill" data-a="example">${I.refresh}<span>Το παράδειγμα</span></button><div class="grow"></div><button class="pill main" data-a="modal-close">Έτοιμο</button></div>`,
  )
  const inp = modal.querySelector<HTMLInputElement>('#durIn') as HTMLInputElement
  inp.addEventListener('input', () => ($('dv').textContent = `${gr(Number(inp.value), 1)} s`))
  inp.addEventListener('change', () => {
    const nd = Number(inp.value)
    store.commit((p) => {
      const f = nd / p.shot.duration
      for (const k of p.keys) k.t = Math.round(k.t * f * p.shot.fps) / p.shot.fps
      for (const g of p.figures) if (g.path) {
        g.path.t0 = Math.round(g.path.t0 * f * 4) / 4
        g.path.t1 = Math.round(g.path.t1 * f * 4) / 4
      }
      p.shot.duration = nd
    })
    ui.time = clamp(ui.time * 1, 0, nd)
  })
}

let presetFig = ''
let readyTab: 'moves' | 'cuts' | 'scenes' = 'moves'
function openPresets() {
  const figs = P().figures
  if (!figs.length) readyTab = 'scenes'
  if (ui.sel?.kind === 'figure' && modal.hidden) presetFig = ui.sel.id
  if (!figs.some((f) => f.id === presetFig)) presetFig = figs[0].id
  openModal(
    `<h2>Έτοιμα</h2>` +
      chips('ready-tab', [{ v: 'moves', t: `Κινήσεις κάμερας · ${PRESETS.length}` }, { v: 'cuts', t: `Μοντάζ με cuts · ${CUTS.length}` }, { v: 'scenes', t: `Ολόκληρες σκηνές · ${SCENES.length}` }], readyTab) +
      `<button class="pill wide ai" data-a="ai">${I.spark}<span>Ή περιέγραψε τη σκηνή με λόγια και στήνεται μόνη της</span></button>` +
      (readyTab === 'moves'
        ? `<div class="fld"><span>Γύρω από</span>${chips('preset-fig', figs.map((f) => ({ v: f.id, t: `Φιγούρα ${f.label}` })), presetFig)}</div>` +
          `<div class="grid">${PRESETS.map((x) => `<button class="pill two" data-a="preset" data-v="${x.id}"><b>${x.gr}</b><small>${x.note}</small></button>`).join('')}</div>` +
          `<p class="hint">Η κίνηση αντικαθιστά τα keyframes του πλάνου, με τον φακό και τη διάρκεια που έχεις ορίσει. Μετά τα πειράζεις όπως θες.</p>`
        : readyTab === 'cuts'
          ? `<div class="fld"><span>Πάνω σε</span>${chips('preset-fig', figs.map((f) => ({ v: f.id, t: `Φιγούρα ${f.label}` })), presetFig)}</div>` +
            `<div class="grid">${CUTS.map((x) => `<button class="pill two" data-a="cuts" data-v="${x.id}"><b>${x.gr}</b><small>${x.note}</small></button>`).join('')}</div>` +
            `<p class="hint">Πολλά πλάνα με cut μέσα στην ίδια διάρκεια. Τα πλάνα διαλόγου παίρνουν και τη φιγούρα που είναι πιο κοντά. Αντικαθιστά τα keyframes.</p>`
          : `<div class="grid">${SCENES.map((x) => `<button class="pill two" data-a="ready-scene" data-v="${x.id}"><b>${x.gr}</b><small>${x.note}</small></button>`).join('')}</div>` +
          `<p class="hint">Η σκηνή αντικαθιστά ό,τι έχεις στήσει: φιγούρες, χώρο και κίνηση κάμερας. Με την Αναίρεση γυρνάς πίσω.</p>`) +
      `<div class="foot"><div class="grow"></div><button class="pill" data-a="modal-close">Κλείσιμο</button></div>`,
  )
}

function openAi(error = '') {
  let last = ''
  try {
    last = localStorage.getItem('tml_previz_ai_text') || ''
  } catch {
    /* private mode */
  }
  const typed = modal.querySelector<HTMLTextAreaElement>('#aiText')?.value
  const has = !!getKey()
  openModal(
    `<h2>Σκηνή με AI</h2>` +
      `<p class="hint">Γράψε τη σκηνή όπως θα την έλεγες στον οπερατέρ: ποιοι είναι, πού στέκονται, τι κάνουν και πώς κινείται η κάμερα. Το Claude στήνει φιγούρες, χώρο και κίνηση, και μετά τα διορθώνεις με το χέρι.</p>` +
      `<textarea id="aiText" class="write" placeholder="Π.χ. Ο Νίκος μπαίνει από την πόρτα και περπατάει ως το τραπέζι όπου κάθεται η Μαρία. Η κάμερα τον ακολουθεί από πίσω και καταλήγει σε over the shoulder πάνω της. 8 δευτερόλεπτα, 35mm.">${esc(typed ?? last)}</textarea>` +
      (has
        ? ''
        : `<div class="fld"><span>Κλειδί Claude API</span><input id="aiKey" class="write" type="password" autocomplete="off" placeholder="sk-ant-..."><p class="hint">Μένει μόνο σε αυτή τη συσκευή. Το φτιάχνεις στο console.anthropic.com, στο API keys.</p></div>`) +
      (error ? `<p class="err">${esc(error)}</p>` : '') +
      `<div class="foot">${has ? `<button class="pill" data-a="ai-key">Άλλαξε κλειδί</button>` : ''}<div class="grow"></div><button class="pill" data-a="modal-close">Κλείσιμο</button><button class="pill main" data-a="ai-run" id="aiRun">${I.spark}<span>Στήσε τη σκηνή</span></button></div>`,
  )
}

async function runAi() {
  const text = (modal.querySelector<HTMLTextAreaElement>('#aiText')?.value || '').trim()
  const typedKey = (modal.querySelector<HTMLInputElement>('#aiKey')?.value || '').trim()
  if (typedKey) setKey(typedKey)
  const k = getKey()
  if (!text) return openAi('Γράψε πρώτα τη σκηνή.')
  if (!k) return openAi('Βάλε το κλειδί Claude API.')
  try {
    localStorage.setItem('tml_previz_ai_text', text)
  } catch {
    /* private mode */
  }
  const b = $<HTMLButtonElement>('aiRun')
  b.disabled = true
  b.innerHTML = `<span class="spin"></span><span>Στήνω τη σκηνή, ως ένα λεπτό…</span>`
  try {
    const { project, notes } = await sceneFromText(k, text, P())
    store.replace(project)
    closeModal()
    ui.sel = null
    ui.frame = false
    ui.time = 0
    ui.playing = true
    const a = project.figures[0]
    centerOn(a.x, 0.9, a.z)
    refresh('sel')
    if (notes) openModal(`<h2>Έτοιμη η σκηνή</h2><p class="note">${esc(notes)}</p><p class="hint">Δεν σου κάνει; Πάτα Αναίρεση και γυρνάς εκεί που ήσουν.</p><div class="foot"><div class="grow"></div><button class="pill" data-a="ai">Γράψ' το αλλιώς</button><button class="pill main" data-a="modal-close">Να το δω</button></div>`)
  } catch (e) {
    if (!modal.hidden) openAi(e instanceof Error ? e.message : 'Κάτι πήγε στραβά. Δοκίμασε ξανά.')
  }
}

function openHelp() {
  const step = (n: number, t: string, d: string) => `<div class="step"><i>${n}</i><div><b>${t}</b><p>${d}</p></div></div>`
  openModal(
    `<h2>Πώς δουλεύει</h2>` +
      step(1, 'Στήσε τη σκηνή', 'Σύρε τις φιγούρες με το δάχτυλο. Πάτα μία για στάση, ύψος, περιστροφή ή για να περπατήσει ως ένα σημείο.') +
      step(2, 'Διάλεξε κάτι έτοιμο', 'Στα Έτοιμα (το ραβδάκι) έχει κινήσεις κάμερας όπως orbit, dolly, crane, vertigo, και ολόκληρες σκηνές όπως διάλογος, walk and talk, καταδίωξη.') +
      step(3, 'Ή φτιάξ\'τη δική σου', 'Γύρνα τη Director view, διάλεξε χρόνο στο timeline και πάτα Keyframe. Με το Κάδρο φακού βλέπεις ό,τι γράφει η κάμερα.') +
      step(4, 'Ή γράψ\'την με λόγια', 'Στο Σκηνή με AI περιγράφεις τη σκηνή και το Claude στήνει φιγούρες, χώρο και κίνηση κάμερας. Θέλει ένα κλειδί Claude API.') +
      step(5, 'Πάρε το prompt', 'Το Prompt γράφει στα αγγλικά την κίνηση της κάμερας και των χαρακτήρων, έτοιμο για Seedance.') +
      `<div class="foot"><div class="grow"></div><button class="pill main" data-a="modal-close">Πάμε</button></div>`,
  )
}

function openPrompt() {
  const text = buildPrompt(P())
  openModal(
    `<h2>Prompt</h2><p class="hint">Ανέβασε το βίντεο reference ως @Video1 και επικόλλησε αυτό το κείμενο.</p>` +
      `<textarea id="promptText" readonly spellcheck="false">${esc(text)}</textarea>` +
      `<div class="foot"><button class="pill" data-a="export">${I.down}<span>Export βίντεο</span></button><button class="pill" data-a="approve">${I.check}<span>Σωστό πλάνο</span></button><div class="grow"></div><button class="pill" data-a="modal-close">Κλείσιμο</button><button class="pill main" data-a="copy" id="copyBtn">${I.copy}<span>Αντιγραφή</span></button></div>`,
  )
}
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}

// ---------- export: video, stills, project file ----------
const exStop = { now: false }
let exResult: { blob: Blob; name: string } | null = null

/** On a phone the share sheet saves to Photos or Files; elsewhere a plain download. */
async function saveBlobs(blobs: Blob[], names: string[]) {
  const files = blobs.map((b, i) => new File([b], names[i], { type: b.type }))
  if (mq.matches && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  for (const f of files) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(f)
    a.download = f.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 20000)
    await new Promise((r) => setTimeout(r, 250))
  }
}

function openExport() {
  const p = P()
  const { w, h } = frameSize(p)
  const shots = shotsOf(p.keys).length
  openModal(
    `<h2>Export</h2>` +
      `<p class="hint">${w} x ${h} · ${gr(p.shot.duration, p.shot.duration % 1 ? 1 : 0)} s · ${p.shot.fps} fps · ${frameCount(p)} καρέ${shots > 1 ? ` · ${shots} πλάνα` : ''}</p>` +
      `<button class="pill main wide" data-a="ex-video">${I.film}<span>Βίντεο reference (MP4)</span></button>` +
      `<p class="hint">Η Shot view καρέ καρέ, χωρίς τίποτα πάνω στο κάδρο. Το ανεβάζεις στο Seedance ως @Video1.</p>` +
      `<div class="fld"><span>Καρέ σε PNG</span><div class="row wrap"><button class="pill" data-a="ex-frame" data-v="start">${I.image}<span>Start frame</span></button><button class="pill" data-a="ex-frame" data-v="end">${I.image}<span>End frame</span></button>${shots > 1 ? `<button class="pill" data-a="ex-frame" data-v="shots">${I.image}<span>Πρώτο καρέ κάθε πλάνου</span></button>` : ''}</div></div>` +
      `<div class="fld"><span>Αρχείο σκηνής</span><div class="row wrap"><button class="pill" data-a="ex-project">${I.down}<span>Αποθήκευση</span></button><button class="pill" data-a="ex-open">${I.folder}<span>Άνοιγμα αρχείου</span></button></div></div>` +
      `<div class="foot"><div class="grow"></div><button class="pill" data-a="modal-close">Κλείσιμο</button></div>`,
  )
}

async function runVideo() {
  const p = P()
  if (!(await videoSupport(p)))
    return openModal(`<h2>Export</h2><p class="big">Αυτός ο browser δεν γράφει MP4.</p><p class="hint">Θέλει Chrome, Edge ή Safari 16.4 και νεότερο. Τα καρέ PNG και το αρχείο σκηνής δουλεύουν παντού.</p><div class="foot"><div class="grow"></div><button class="pill main" data-a="export">Πίσω</button></div>`)
  ui.playing = false
  exStop.now = false
  exResult = null
  renderBars()
  openModal(`<h2>Γράφω το βίντεο</h2><div class="bar"><i id="exBar"></i></div><p class="hint" id="exTxt">Ξεκινάω…</p><p class="hint">Κράτα την οθόνη ανοιχτή μέχρι να τελειώσει.</p><div class="foot"><div class="grow"></div><button class="pill" data-a="ex-stop">Άκυρο</button></div>`)
  const t0 = performance.now()
  try {
    const blob = await exportVideo(
      world,
      p,
      (done, total) => {
        const bar = document.getElementById('exBar')
        if (bar) bar.style.width = `${(done / total) * 100}%`
        const txt = document.getElementById('exTxt')
        if (txt) txt.textContent = `Καρέ ${done} από ${total}`
      },
      exStop,
    )
    exResult = { blob, name: 'previz-reference.mp4' }
    const secs = Math.round((performance.now() - t0) / 1000)
    openModal(
      `<h2>Έτοιμο το βίντεο</h2><video class="preview" src="${URL.createObjectURL(blob)}" controls loop muted playsinline autoplay></video>` +
        `<p class="hint">${frameCount(p)} καρέ · ${gr(blob.size / 1048576, 1)} MB · γράφτηκε σε ${secs} s</p>` +
        `<div class="foot"><div class="grow"></div><button class="pill" data-a="export">Πίσω</button><button class="pill main" data-a="ex-save">${I.down}<span>Αποθήκευση</span></button></div>`,
    )
  } catch (e) {
    const m = (e as Error).message
    if (m === 'stopped') openExport()
    else openModal(`<h2>Export</h2><p class="big">Το βίντεο δεν γράφτηκε.</p><p class="hint">${m === 'order' || m === 'encode' ? 'Ο κωδικοποιητής αυτής της συσκευής έδωσε κάτι που δεν διαβάζεται.' : 'Η συσκευή δεν άντεξε την κωδικοποίηση.'} Δοκίμασε μικρότερη διάρκεια ή από υπολογιστή.</p><div class="foot"><div class="grow"></div><button class="pill main" data-a="export">Πίσω</button></div>`)
  }
  dirty = true
}

$<HTMLInputElement>('fileIn').addEventListener('change', async (e) => {
  const inp = e.target as HTMLInputElement
  const file = inp.files?.[0]
  inp.value = ''
  if (!file) return
  try {
    const raw = JSON.parse(await file.text())
    // a saved project, or a scene as Claude writes it
    const project = raw && raw.v === 1 ? migrate(raw) : toProject(raw, P())
    if (!project) throw new Error('bad')
    store.replace(project)
    closeModal()
    ui.sel = null
    ui.time = 0
    refresh('sel')
    toast('Άνοιξε η σκηνή. Η Αναίρεση φέρνει την προηγούμενη.')
  } catch {
    toast('Αυτό το αρχείο δεν είναι σκηνή του Previz')
  }
})

// ---------- a scene in a link ----------
function b64e(text: string): string {
  let bin = ''
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64d(code: string): string {
  const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}
const sceneLink = () => `${location.origin}${location.pathname}#p=${b64e(JSON.stringify(P()))}`

/** #p= is a whole project (Link σκηνής), #ai= a scene as Claude writes it (previz/tools/link.mjs). */
function loadFromHash(): boolean {
  const m = /^#(p|ai)=(.+)$/.exec(location.hash)
  if (!m) return false
  history.replaceState(null, '', location.pathname + location.search)
  try {
    const raw = JSON.parse(b64d(m[2]))
    const project = m[1] === 'p' ? migrate(raw) : toProject(raw, P())
    if (!project) throw new Error('bad')
    store.replace(project)
    ui.sel = null
    ui.frame = false
    ui.time = 0
    ui.playing = true
    const a = project.figures[0]
    if (a) centerOn(a.x, 0.9, a.z)
    refresh('sel')
    const notes = m[1] === 'ai' && typeof raw.notes === 'string' ? raw.notes : 'Άνοιξε η σκηνή από το link.'
    openModal(`<h2>Νέα σκηνή</h2><p class="note">${esc(notes)}</p><p class="hint">Θες αυτό που είχες πριν; Πάτα Αναίρεση.</p><div class="foot"><div class="grow"></div><button class="pill main" data-a="modal-close">Να το δω</button></div>`)
  } catch {
    toast('Το link της σκηνής δεν διαβάζεται')
  }
  return true
}
window.addEventListener('hashchange', loadFromHash)

function openApprove() {
  let last = ''
  try {
    last = localStorage.getItem('tml_previz_ai_text') || ''
  } catch {
    /* private mode */
  }
  openModal(
    `<h2>Σωστό πλάνο</h2><p class="hint">Γράψε με δυο λόγια τι είναι το πλάνο και τι σου αρέσει σε αυτό. Αντιγράφεται μαζί με τη σκηνή, το επικολλάς στο Claude και γίνεται παράδειγμα για τις επόμενες σκηνές.</p>` +
      `<textarea id="apText" class="write" placeholder="Π.χ. Έτσι θέλω το over the shoulder: 50mm, κοντά στον ώμο, η κάμερα λίγο πιο χαμηλά από τα μάτια.">${esc(last)}</textarea>` +
      `<div class="foot"><div class="grow"></div><button class="pill" data-a="modal-close">Κλείσιμο</button><button class="pill main" data-a="approve-copy">${I.copy}<span>Αντιγραφή για το Claude</span></button></div>`,
  )
}

async function copyPrompt() {
  const ta = modal.querySelector<HTMLTextAreaElement>('#promptText')
  if (!ta) return
  await copyText(ta.value)
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
let drag: { kind: 'figure' | 'prop' | 'dest'; id: string; fx: number; fz: number; ox: number; oz: number; pid: number } | null = null
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
      const f = hit.kind === 'prop' ? null : fig(hit.id)
      const o = hit.kind === 'prop' ? prop(hit.id) : hit.kind === 'dest' ? f?.path : f
      const fp = world.floorPoint(e.clientX, e.clientY)
      if (!o || !fp) return
      world.controls.enabled = false
      drag = { kind: hit.kind, id: hit.id, fx: fp.x, fz: fp.z, ox: o.x, oz: o.z, pid: e.pointerId }
      dirView.setPointerCapture(e.pointerId)
      const sel: Sel = { kind: hit.kind === 'prop' ? 'prop' : 'figure', id: hit.id }
      if (ui.sel?.id !== hit.id) select(sel)
    } else tap = { x: e.clientX, y: e.clientY, t: performance.now(), pid: e.pointerId }
  },
  true,
)
dirView.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.pid) return
  const fp = world.floorPoint(e.clientX, e.clientY)
  if (!fp) return
  const d = drag
  const x = +clamp(d.ox + fp.x - d.fx, -19, 19).toFixed(2)
  const z = +clamp(d.oz + fp.z - d.fz, -19, 19).toFixed(2)
  store.live((p) => {
    const f = d.kind === 'prop' ? null : p.figures.find((f) => f.id === d.id)
    const o = d.kind === 'prop' ? p.props.find((f) => f.id === d.id) : d.kind === 'dest' ? f?.path : f
    if (!o) return
    o.x = x
    o.z = z
  })
  const f = d.kind === 'prop' ? null : fig(d.id)
  const info = document.getElementById('pinfo')
  if (f?.path && info) info.textContent = `${gr(pathLength(f), 1)} m · ${gr(pathLength(f) / Math.max(0.1, f.path.t1 - f.path.t0), 1)} m/s`
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
  world.syncScene(P(), ui.sel && ui.sel.kind !== 'key' ? ui.sel.id : null, ui.time)
  const cam = camAt(P(), ui.time, true)
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
    $('shotInfo').textContent = `${Math.round(camAt(P(), t).lens)}mm · ${P().shot.aspect}`
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

refresh('init')
const fromLink = loadFromHash()
try {
  if (!fromLink && !localStorage.getItem('tml_previz_seen')) {
    localStorage.setItem('tml_previz_seen', '1')
    openHelp()
  }
} catch {
  /* private mode: no guide memory */
}
requestAnimationFrame(loop)

// for tests
;(window as unknown as { previz: unknown }).previz = { store, ui, world, buildPrompt: () => buildPrompt(P()) }

// works with no signal after one visit (previz-sw.js keeps the last good copy)
if ('serviceWorker' in navigator && location.protocol === 'https:' || location.hostname === 'localhost') {
  navigator.serviceWorker
    ?.register('../previz-sw.js', { scope: './' })
    .then(() => navigator.serviceWorker.ready)
    .then((reg) => {
      const own = performance
        .getEntriesByType('resource')
        .map((r) => r.name)
        .filter((u) => u.startsWith(location.origin))
      reg.active?.postMessage({ cache: [location.href, ...own] })
    })
    .catch(() => {})
}
