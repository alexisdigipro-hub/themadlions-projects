import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Figure, Pose, Project, Prop, PropKind } from './state'
import { FIG_COLORS } from './state'
import { applyCam, camAt, hfov, keyTarget, shotsOf, vfov, type CamState } from './camera'
import { figAt, POSE_HEIGHT, type FigState } from './motion'
import { DEG } from './util'

/** Layer 1 holds what only the Director view shows: labels, rings, the camera path and frustums. */
const HELP = 1

const clay = new THREE.MeshStandardMaterial({ color: 0xb8b4ad, roughness: 0.88, metalness: 0 })
const propClay = new THREE.MeshStandardMaterial({ color: 0x9c9993, roughness: 0.9, metalness: 0 })

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, y = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat)
  m.position.y = y
  m.castShadow = true
  m.receiveShadow = true
  return m
}
const cap = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 6, 14)

/** Joint angles in degrees, forward positive. Pelvis height for a 1.80 m figure. */
interface PoseDef {
  hipL: number; hipR: number; kneeL: number; kneeR: number
  shL: number; shR: number; elL: number; elR: number
  lean: number; pelvis: number; seat?: boolean
}
const POSE: Record<Pose, PoseDef> = {
  stand: { hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, shL: 0, shR: 0, elL: 8, elR: 8, lean: 0, pelvis: 0.99 },
  walk: { hipL: 24, hipR: -18, kneeL: 6, kneeR: 28, shL: -22, shR: 24, elL: 18, elR: 22, lean: 3, pelvis: 0.97 },
  run: { hipL: 55, hipR: -28, kneeL: 35, kneeR: 95, shL: -50, shR: 55, elL: 90, elR: 90, lean: 14, pelvis: 0.92 },
  sit: { hipL: 90, hipR: 90, kneeL: 90, kneeR: 90, shL: 18, shR: 18, elL: 55, elR: 55, lean: -4, pelvis: 0.54, seat: true },
  kneel: { hipL: 0, hipR: 90, kneeL: 90, kneeR: 90, shL: 10, shR: 10, elL: 30, elR: 30, lean: 4, pelvis: 0.55 },
}
/** The walk or run cycle at a phase of the stride. */
function cycle(run: boolean, ph: number): PoseDef {
  const sn = Math.sin(ph)
  const c = Math.cos(ph)
  const A = run ? 46 : 26
  const K = run ? 100 : 48
  const B = run ? 52 : 24
  const fw = run ? 10 : 2
  const kb = run ? 18 : 6
  return {
    hipL: A * sn + fw, hipR: -A * sn + fw,
    kneeL: kb + K * Math.max(0, c), kneeR: kb + K * Math.max(0, -c),
    shL: -B * sn, shR: B * sn, elL: run ? 90 : 20, elR: run ? 90 : 20,
    lean: run ? 14 : 3, pelvis: (run ? 0.93 : 0.97) - 0.02 * Math.abs(sn),
  }
}

interface FigObj {
  root: THREE.Group
  body: THREE.Group
  pelvis: THREE.Group
  spine: THREE.Group
  hipL: THREE.Group; hipR: THREE.Group; kneeL: THREE.Group; kneeR: THREE.Group
  shL: THREE.Group; shR: THREE.Group; elL: THREE.Group; elR: THREE.Group
  seat: THREE.Mesh
  ring: THREE.Mesh
  ringMat: THREE.MeshBasicMaterial
  label: THREE.Sprite
  dest: THREE.Group
  destLine: THREE.Line
}

function labelSprite(text: string, color: string): THREE.Sprite {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d') as CanvasRenderingContext2D
  g.fillStyle = color
  g.beginPath()
  g.arc(64, 64, 56, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#111'
  g.font = 'bold 74px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, 64, 68)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }))
  s.scale.set(0.34, 0.34, 1)
  s.renderOrder = 10
  s.layers.set(HELP)
  return s
}

function group(x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group()
  g.position.set(x, y, z)
  return g
}

/** A clay mannequin built from capsules, front facing +Z, 1.80 m before scaling. */
function makeFigure(f: Figure): FigObj {
  const color = FIG_COLORS[f.label]
  const mark = new THREE.MeshStandardMaterial({ color, roughness: 0.55, emissive: color, emissiveIntensity: 0.18 })
  const root = group()
  const body = group()
  root.add(body)
  const pelvis = group(0, 0.99, 0)
  body.add(pelvis)
  const hips = mesh(cap(0.12, 0.1), clay)
  hips.rotation.z = Math.PI / 2
  pelvis.add(hips)

  const spine = group(0, 0.02, 0)
  pelvis.add(spine)
  const torso = mesh(cap(0.15, 0.24), clay, 0.25)
  torso.scale.set(1, 1, 0.72)
  spine.add(torso)
  // the colour marker: a band round the chest
  const band = mesh(new THREE.CylinderGeometry(0.158, 0.158, 0.1, 24), mark, 0.33)
  band.scale.set(1, 1, 0.74)
  spine.add(band)
  spine.add(mesh(cap(0.05, 0.06), clay, 0.5))
  const head = mesh(new THREE.SphereGeometry(0.105, 24, 16), clay, 0.67)
  head.scale.set(0.92, 1.08, 1)
  spine.add(head)
  // a small nose so the facing reads in every view
  const nose = mesh(new THREE.ConeGeometry(0.025, 0.06, 10), clay, 0.665)
  nose.rotation.x = Math.PI / 2
  nose.position.z = 0.105
  spine.add(nose)

  const arm = (side: 1 | -1) => {
    const sh = group(0.2 * side, 0.44, 0)
    sh.rotation.z = 0.1 * side
    sh.add(mesh(cap(0.048, 0.2), clay, -0.14))
    const el = group(0, -0.29, 0)
    sh.add(el)
    el.add(mesh(cap(0.043, 0.18), clay, -0.13))
    el.add(mesh(new THREE.SphereGeometry(0.05, 14, 10), clay, -0.28))
    spine.add(sh)
    return { sh, el }
  }
  const leg = (side: 1 | -1) => {
    const hip = group(0.1 * side, -0.04, 0)
    hip.add(mesh(cap(0.075, 0.3), clay, -0.225))
    const knee = group(0, -0.45, 0)
    hip.add(knee)
    knee.add(mesh(cap(0.06, 0.33), clay, -0.225))
    const foot = mesh(new THREE.BoxGeometry(0.1, 0.06, 0.24), clay, -0.47)
    foot.position.z = 0.06
    knee.add(foot)
    pelvis.add(hip)
    return { hip, knee }
  }
  const L = arm(1)
  const R = arm(-1)
  const LL = leg(1)
  const RL = leg(-1)

  const seat = mesh(new THREE.BoxGeometry(0.46, 0.44, 0.44), propClay, 0.22)
  seat.position.z = -0.06
  body.add(seat)

  const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false })
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.46, 48), ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.012
  ring.layers.set(HELP)
  const tick = new THREE.Mesh(new THREE.CircleGeometry(0.07, 3), ringMat)
  tick.position.set(0, 0.55, 0)
  tick.rotation.z = Math.PI / 2
  ring.add(tick)
  tick.layers.set(HELP)
  root.add(ring)

  const label = labelSprite(f.label, color)
  root.add(label)

  // the destination of the figure's path: a flag to drag, and a line to it
  const dest = group()
  const dring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.34, 40), ringMat)
  dring.rotation.x = -Math.PI / 2
  dring.position.y = 0.014
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 8), new THREE.MeshBasicMaterial({ color }))
  pole.position.y = 0.55
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.02), new THREE.MeshBasicMaterial({ color }))
  flag.position.set(0.17, 1.0, 0)
  const grab = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.2, 12), new THREE.MeshBasicMaterial({ visible: false }))
  grab.position.y = 0.6
  dest.add(dring, pole, flag, grab)
  dest.traverse((o) => o.layers.set(HELP))
  dest.userData = { kind: 'dest', id: f.id }
  const destLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color, dashSize: 0.25, gapSize: 0.15, depthTest: false, transparent: true }))
  destLine.layers.set(HELP)
  destLine.renderOrder = 4

  root.userData = { kind: 'figure', id: f.id }
  return {
    root, body, pelvis, spine, seat, ring, ringMat, label, dest, destLine,
    hipL: LL.hip, hipR: RL.hip, kneeL: LL.knee, kneeR: RL.knee,
    shL: L.sh, shR: R.sh, elL: L.el, elR: R.el,
  }
}

function poseFigure(o: FigObj, f: Figure, st: FigState, selected: boolean): void {
  const d = st.moving ? cycle(st.pose === 'run', st.phase) : POSE[st.pose]
  const s = f.height / 1.8
  o.root.position.set(st.x, 0, st.z)
  o.root.rotation.y = st.rot * DEG
  o.dest.visible = o.destLine.visible = !!f.path
  if (f.path) {
    o.dest.position.set(f.path.x, 0, f.path.z)
    o.destLine.geometry.dispose()
    o.destLine.geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(f.x, 0.02, f.z), new THREE.Vector3(f.path.x, 0.02, f.path.z)])
    o.destLine.computeLineDistances()
  }
  o.body.scale.setScalar(s)
  o.pelvis.position.y = d.pelvis
  o.spine.rotation.x = d.lean * DEG
  o.hipL.rotation.x = -d.hipL * DEG
  o.hipR.rotation.x = -d.hipR * DEG
  o.kneeL.rotation.x = d.kneeL * DEG
  o.kneeR.rotation.x = d.kneeR * DEG
  o.shL.rotation.x = -d.shL * DEG
  o.shR.rotation.x = -d.shR * DEG
  o.elL.rotation.x = -d.elL * DEG
  o.elR.rotation.x = -d.elR * DEG
  o.seat.visible = !!d.seat
  o.label.position.y = f.height * POSE_HEIGHT[st.pose] + 0.28
  o.ringMat.opacity = selected ? 1 : 0.45
  o.ring.scale.setScalar(selected ? 1.12 : 1)
}

/** Footprint of each prop (width, depth) for its selection mark. */
const FOOT: Record<PropKind, [number, number]> = { box: [0.6, 0.6], table: [1.4, 0.8], chair: [0.45, 0.45], door: [1.14, 0.6], wall: [4, 0.15], sofa: [1.9, 0.85], bed: [1.6, 2.05], bar: [2.4, 0.6], car: [1.8, 4.3], mic: [0.4, 0.4], tree: [1.2, 1.2], column: [0.6, 0.6] }

function makeProp(kind: PropKind): THREE.Group {
  const g = new THREE.Group()
  const add = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = mesh(new THREE.BoxGeometry(w, h, d), propClay)
    m.position.set(x, y, z)
    g.add(m)
  }
  if (kind === 'box') add(0.6, 0.6, 0.6, 0, 0.3, 0)
  if (kind === 'table') {
    add(1.4, 0.05, 0.8, 0, 0.74, 0)
    for (const x of [-0.64, 0.64]) for (const z of [-0.34, 0.34]) add(0.05, 0.72, 0.05, x, 0.36, z)
  }
  if (kind === 'chair') {
    add(0.45, 0.05, 0.45, 0, 0.45, 0)
    for (const x of [-0.2, 0.2]) for (const z of [-0.2, 0.2]) add(0.04, 0.44, 0.04, x, 0.22, z)
    add(0.45, 0.5, 0.04, 0, 0.73, -0.21)
  }
  if (kind === 'door') {
    add(0.1, 2.15, 0.14, -0.52, 1.075, 0)
    add(0.1, 2.15, 0.14, 0.52, 1.075, 0)
    add(1.14, 0.1, 0.14, 0, 2.2, 0)
    const leaf = new THREE.Group()
    leaf.position.set(-0.46, 0, 0)
    leaf.rotation.y = -0.5
    const m = mesh(new THREE.BoxGeometry(0.92, 2.08, 0.04), propClay)
    m.position.set(0.46, 1.04, 0)
    leaf.add(m)
    g.add(leaf)
  }
  if (kind === 'wall') add(4, 2.6, 0.15, 0, 1.3, 0)
  const cyl = (r: number, h: number, x: number, y: number, z: number, rz = 0) => {
    const m = mesh(new THREE.CylinderGeometry(r, r, h, 20), propClay)
    m.position.set(x, y, z)
    m.rotation.z = rz
    g.add(m)
  }
  if (kind === 'sofa') {
    add(1.9, 0.42, 0.85, 0, 0.21, 0)
    add(1.9, 0.45, 0.2, 0, 0.64, -0.325)
    for (const x of [-0.85, 0.85]) add(0.2, 0.62, 0.85, x, 0.31, 0)
  }
  if (kind === 'bed') {
    add(1.6, 0.45, 2, 0, 0.225, 0)
    add(1.6, 1, 0.08, 0, 0.5, -1.02)
    add(1.3, 0.12, 0.4, 0, 0.5, -0.7)
  }
  if (kind === 'bar') add(2.4, 1.05, 0.6, 0, 0.525, 0)
  if (kind === 'car') {
    add(1.8, 0.62, 4.3, 0, 0.66, 0)
    add(1.6, 0.52, 2.1, 0, 1.22, -0.2)
    for (const x of [-0.9, 0.9]) for (const z of [-1.4, 1.4]) cyl(0.33, 0.22, x, 0.33, z, Math.PI / 2)
  }
  if (kind === 'mic') {
    cyl(0.16, 0.03, 0, 0.015, 0)
    cyl(0.014, 1.45, 0, 0.74, 0)
    const head = mesh(new THREE.SphereGeometry(0.045, 12, 8), propClay)
    head.position.set(0, 1.5, 0)
    g.add(head)
  }
  if (kind === 'tree') {
    cyl(0.16, 2.3, 0, 1.15, 0)
    const crown = mesh(new THREE.SphereGeometry(1.25, 14, 10), propClay)
    crown.position.set(0, 3.2, 0)
    g.add(crown)
  }
  if (kind === 'column') cyl(0.28, 3.2, 0, 1.6, 0)
  return g
}

/** A camera drawn as lines in its own space, looking down -Z. */
function frustumGeo(lens: number, aspect: number, depth: number): THREE.BufferGeometry {
  const w = Math.tan((hfov(lens, aspect) * DEG) / 2) * depth
  const h = Math.tan((vfov(lens, aspect) * DEG) / 2) * depth
  const c = [
    [-w, -h, -depth], [w, -h, -depth], [w, h, -depth], [-w, h, -depth],
  ]
  const pts: number[] = []
  const seg = (a: number[], b: number[]) => pts.push(...a, ...b)
  for (const p of c) seg([0, 0, 0], p)
  for (let i = 0; i < 4; i++) seg(c[i], c[(i + 1) % 4])
  // a triangle on top tells which way is up
  seg([-w * 0.4, h * 1.08, -depth], [0, h * 1.5, -depth])
  seg([0, h * 1.5, -depth], [w * 0.4, h * 1.08, -depth])
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return g
}

export interface Rect { x: number; y: number; w: number; h: number }
export type Hit = { kind: 'figure' | 'prop' | 'dest'; id: string }

export class World {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  dirCam = new THREE.PerspectiveCamera(50, 1, 0.05, 400)
  shotCam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 400)
  controls: OrbitControls
  private figs = new Map<string, FigObj>()
  private props = new Map<string, THREE.Group>()
  private helpers = new THREE.Group()
  private keyGroup = new THREE.Group()
  private pathLine: THREE.LineSegments
  private cur: THREE.LineSegments
  private targetDot: THREE.Mesh
  private tmpCam = new THREE.PerspectiveCamera()
  private ray = new THREE.Raycaster()
  /** The client-space box the Director view was last drawn into (picking needs it). */
  dirRect: Rect = { x: 0, y: 0, w: 1, h: 1 }

  constructor(canvas: HTMLCanvasElement, dirEl: HTMLElement) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    r.shadowMap.enabled = true
    r.shadowMap.type = THREE.PCFShadowMap
    r.setScissorTest(true)
    this.renderer = r

    const bg = 0x6e7073
    this.scene.background = new THREE.Color(bg)
    this.scene.fog = new THREE.Fog(bg, 22, 70)

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x8b8d90, roughness: 1 }))
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    this.scene.add(floor)
    const grid = new THREE.GridHelper(40, 40, 0x55585c, 0x6c6f73)
    grid.position.y = 0.003
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.8
    this.scene.add(grid)

    this.scene.add(new THREE.HemisphereLight(0xf2f2f0, 0x4a4c50, 1.25))
    const key = new THREE.DirectionalLight(0xfff4e6, 2.6)
    key.position.set(5, 9, 6)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    const sc = key.shadow.camera
    sc.left = sc.bottom = -14
    sc.right = sc.top = 14
    sc.near = 1
    sc.far = 40
    key.shadow.bias = -0.0004
    key.shadow.normalBias = 0.02
    this.scene.add(key)

    this.helpers.layers.set(HELP)
    this.scene.add(this.helpers)
    this.helpers.add(this.keyGroup)
    this.pathLine = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xe8a23a, depthTest: false, transparent: true }))
    this.pathLine.renderOrder = 5
    this.pathLine.layers.set(HELP)
    this.helpers.add(this.pathLine)
    this.cur = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xff4d4d, depthTest: false, transparent: true }))
    this.cur.renderOrder = 6
    this.cur.layers.set(HELP)
    this.helpers.add(this.cur)
    this.targetDot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff4d4d, depthTest: false, transparent: true }))
    this.targetDot.renderOrder = 6
    this.targetDot.layers.set(HELP)
    this.helpers.add(this.targetDot)

    this.dirCam.layers.enable(HELP)
    this.ray.layers.enable(HELP)
    this.dirCam.position.set(4.6, 3.6, 6.2)
    this.controls = new OrbitControls(this.dirCam, dirEl)
    this.controls.target.set(0, 0.9, -0.6)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.12
    this.controls.maxPolarAngle = Math.PI * 0.495
    this.controls.minDistance = 0.4
    this.controls.maxDistance = 60
    this.controls.update()
  }

  setSize(w: number, h: number): void {
    this.renderer.setSize(w, h, false)
  }

  /** Bring figures and props in line with the project. */
  syncScene(p: Project, selId: string | null, t: number): void {
    const seen = new Set<string>()
    for (const f of p.figures) {
      seen.add(f.id)
      let o = this.figs.get(f.id)
      if (o && o.root.userData.label !== f.label) {
        this.scene.remove(o.root, o.dest, o.destLine)
        o = undefined
      }
      if (!o) {
        o = makeFigure(f)
        o.root.userData.label = f.label
        this.figs.set(f.id, o)
        this.scene.add(o.root, o.dest, o.destLine)
      }
      poseFigure(o, f, figAt(f, t), f.id === selId)
    }
    for (const [id, o] of this.figs) if (!seen.has(id)) {
      this.scene.remove(o.root, o.dest, o.destLine)
      this.figs.delete(id)
    }
    const seenP = new Set<string>()
    for (const pr of p.props) {
      seenP.add(pr.id)
      let g = this.props.get(pr.id)
      if (g && g.userData.kindName !== pr.kind) {
        this.scene.remove(g)
        g = undefined
      }
      if (!g) {
        g = makeProp(pr.kind)
        g.userData = { kind: 'prop', id: pr.id, kindName: pr.kind }
        this.props.set(pr.id, g)
        this.scene.add(g)
      }
      this.placeProp(g, pr, pr.id === selId)
    }
    for (const [id, g] of this.props) if (!seenP.has(id)) {
      this.scene.remove(g)
      this.props.delete(id)
    }
  }

  private placeProp(g: THREE.Group, pr: Prop, selected: boolean): void {
    g.position.set(pr.x, 0, pr.z)
    g.rotation.y = pr.rot * DEG
    let ring = g.getObjectByName('sel') as THREE.Mesh | undefined
    if (selected && !ring) {
      const [w, d] = FOOT[pr.kind]
      ring = new THREE.Mesh(
        new THREE.PlaneGeometry(w + 0.24, d + 0.24),
        new THREE.MeshBasicMaterial({ color: 0xe8a23a, transparent: true, opacity: 0.4, depthWrite: false }),
      )
      ring.name = 'sel'
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.012
      ring.layers.set(HELP)
      g.add(ring)
    }
    if (!selected && ring) g.remove(ring)
  }

  /** The path, the keyframe frustums and the shot camera as it is at this moment. */
  syncPath(p: Project, aspect: number, selKey: string | null): void {
    const keys = p.keys
    // path
    const pts: THREE.Vector3[] = []
    // one piece of line per shot: a cut leaves a gap
    for (const g of shotsOf(keys)) {
      if (g.length < 2) continue
      const t0 = g[0].t
      const t1 = g[g.length - 1].t
      const n = Math.max(24, Math.round((t1 - t0) * 40))
      let prev = camAt(p, t0).pos
      for (let i = 1; i <= n; i++) {
        const cur = camAt(p, t0 + ((t1 - t0) * i) / n).pos
        pts.push(prev, cur)
        prev = cur
      }
    }
    this.pathLine.geometry.dispose()
    this.pathLine.geometry = new THREE.BufferGeometry().setFromPoints(pts)

    // frustums at keyframes
    for (const c of [...this.keyGroup.children]) {
      this.keyGroup.remove(c)
      ;(c as THREE.LineSegments).geometry.dispose()
    }
    for (const k of keys) {
      const sel = k.id === selKey
      const l = new THREE.LineSegments(
        frustumGeo(k.lens, aspect, sel ? 0.55 : 0.4),
        new THREE.LineBasicMaterial({ color: sel ? 0xffffff : 0xe8a23a, depthTest: false, transparent: true, opacity: sel ? 1 : 0.85 }),
      )
      l.renderOrder = 5
      l.layers.set(HELP)
      this.placeLike(l, { pos: new THREE.Vector3(...k.pos), target: keyTarget(p, k, k.t), roll: k.roll, lens: k.lens }, aspect)
      this.keyGroup.add(l)
    }
  }

  syncCurrent(cam: CamState, aspect: number): void {
    this.cur.geometry.dispose()
    this.cur.geometry = frustumGeo(cam.lens, aspect, 0.7)
    this.placeLike(this.cur, cam, aspect)
    this.targetDot.position.copy(cam.target)
  }

  private placeLike(o: THREE.Object3D, s: CamState, aspect: number): void {
    applyCam(this.tmpCam, s, aspect)
    o.position.copy(this.tmpCam.position)
    o.quaternion.copy(this.tmpCam.quaternion)
  }

  private ndc(clientX: number, clientY: number): THREE.Vector2 {
    const r = this.dirRect
    return new THREE.Vector2(((clientX - r.x) / r.w) * 2 - 1, -((clientY - r.y) / r.h) * 2 + 1)
  }

  pick(clientX: number, clientY: number): Hit | null {
    this.ray.setFromCamera(this.ndc(clientX, clientY), this.dirCam)
    const objs = [...[...this.figs.values()].flatMap((o) => (o.dest.visible ? [o.dest, o.root] : [o.root])), ...this.props.values()]
    const hits = this.ray.intersectObjects(objs, true)
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object
      while (o && !o.userData.id) o = o.parent
      if (o) return { kind: o.userData.kind, id: o.userData.id }
    }
    return null
  }

  floorPoint(clientX: number, clientY: number): THREE.Vector3 | null {
    this.ray.setFromCamera(this.ndc(clientX, clientY), this.dirCam)
    const out = new THREE.Vector3()
    return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), out) ? out : null
  }

  /** Draw one camera into a box of the canvas (CSS pixels from its top left). */
  /**
   * A second renderer at the size of the reference video. It draws the same scene through the shot camera
   * (which never sees the Director's helpers), with the handheld of the shot.
   */
  exporter(w: number, h: number): { canvas: HTMLCanvasElement; render: (p: Project, t: number, aspect: number) => void; dispose: () => void } {
    const canvas = document.createElement('canvas')
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
    r.setPixelRatio(1)
    r.setSize(w, h, false)
    r.shadowMap.enabled = true
    r.shadowMap.type = THREE.PCFShadowMap
    const cam = new THREE.PerspectiveCamera()
    // the key light's shadow map belongs to the screen renderer: give this one its own for as long as it lives
    const lights: { l: THREE.DirectionalLight; map: THREE.RenderTarget | null }[] = []
    this.scene.traverse((o) => {
      const l = o as THREE.DirectionalLight
      if (l.isDirectionalLight && l.castShadow) lights.push({ l, map: l.shadow.map })
    })
    const mine: (THREE.RenderTarget | null)[] = lights.map(() => null)
    return {
      canvas,
      render: (p, t, aspect) => {
        this.syncScene(p, null, t)
        applyCam(cam, camAt(p, t, true), aspect)
        lights.forEach((x, i) => (x.l.shadow.map = mine[i]))
        r.render(this.scene, cam)
        lights.forEach((x, i) => {
          mine[i] = x.l.shadow.map
          x.l.shadow.map = x.map
        })
      },
      dispose: () => {
        mine.forEach((m) => m?.dispose())
        r.dispose()
        r.forceContextLoss()
      },
    }
  }

  /** Show or hide what only the Director view draws (labels, path, frustums). */
  helpersOn(on: boolean): void {
    if (on) this.dirCam.layers.enable(HELP)
    else this.dirCam.layers.disable(HELP)
  }

  clearAll(w: number, h: number): void {
    this.renderer.setViewport(0, 0, w, h)
    this.renderer.setScissor(0, 0, w, h)
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.clear()
  }

  draw(cam: THREE.Camera, r: Rect, canvasH: number, clearBlack = false): void {
    const y = canvasH - r.y - r.h
    this.renderer.setViewport(r.x, y, r.w, r.h)
    this.renderer.setScissor(r.x, y, r.w, r.h)
    if (clearBlack) {
      this.renderer.setClearColor(0x000000, 1)
      this.renderer.clear()
    } else this.renderer.render(this.scene, cam)
  }
}
