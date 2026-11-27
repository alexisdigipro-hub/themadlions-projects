import type { Ease, Figure, Keyframe, Label, Project, Vec3 } from './state'
import { vfov, aspectRatio } from './camera'
import { figAt, POSE_HEIGHT } from './motion'
import { DEG, uid } from './util'

export interface Preset { id: string; gr: string; note: string }
export const PRESETS: Preset[] = [
  { id: 'dollyIn', gr: 'Dolly in', note: 'πλησιάζει' },
  { id: 'dollyOut', gr: 'Dolly out', note: 'απομακρύνεται' },
  { id: 'truckL', gr: 'Truck αριστερά', note: 'πλάγια' },
  { id: 'truckR', gr: 'Truck δεξιά', note: 'πλάγια' },
  { id: 'orbit90', gr: 'Orbit 90°', note: 'τόξο' },
  { id: 'orbit180', gr: 'Orbit 180°', note: 'μισός κύκλος' },
  { id: 'orbit360', gr: 'Orbit 360°', note: 'πλήρης κύκλος' },
  { id: 'craneUp', gr: 'Crane up', note: 'ανεβαίνει' },
  { id: 'craneDown', gr: 'Crane down', note: 'κατεβαίνει' },
  { id: 'pushTilt', gr: 'Push-in με tilt up', note: 'χαμηλά και κοντά' },
  { id: 'pullReveal', gr: 'Pull-back reveal', note: 'αποκάλυψη' },
  { id: 'whip', gr: 'Whip pan', note: 'απότομο pan' },
  { id: 'vertigo', gr: 'Vertigo', note: 'dolly zoom' },
  { id: 'tracking', gr: 'Tracking', note: 'δίπλα σε όποιον περπατάει' },
  { id: 'overhead', gr: 'Overhead', note: 'κάθετα από πάνω' },
  { id: 'follow', gr: 'Follow', note: 'από πίσω του καθώς περπατάει' },
  { id: 'lead', gr: 'Leading', note: 'μπροστά του, πηγαίνει πίσω' },
  { id: 'ots', gr: 'Over the shoulder', note: 'από τον ώμο προς τον άλλον' },
  { id: 'spiral', gr: 'Spiral in', note: 'orbit 180 που κλείνει' },
  { id: 'hero', gr: 'Hero low angle', note: 'χαμηλά, αργό push' },
  { id: 'crash', gr: 'Crash zoom', note: 'απότομο zoom in' },
  { id: 'zoomIn', gr: 'Αργό zoom in', note: '35 σε 85mm' },
  { id: 'zoomOut', gr: 'Αργό zoom out', note: '85 σε 35mm' },
  { id: 'panReveal', gr: 'Pan αποκάλυψη', note: 'αργό pan πάνω του' },
  { id: 'tiltUp', gr: 'Tilt up', note: 'από τα πόδια στο πρόσωπο' },
  { id: 'dutch', gr: 'Dutch push', note: 'πλησιάζει και γέρνει' },
  { id: 'topSpin', gr: 'Overhead spin', note: 'από πάνω με περιστροφή' },
  { id: 'lockWide', gr: 'Σταθερό wide', note: 'ακίνητη κάμερα' },
  { id: 'lockMed', gr: 'Σταθερό medium', note: 'ακίνητη κάμερα' },
  { id: 'lockClose', gr: 'Σταθερό κοντινό', note: 'ακίνητη κάμερα' },
]

type K = { u: number; pos: Vec3; target?: Vec3; lens?: number; ease?: Ease; look?: Label | null; roll?: number; cut?: boolean }

/**
 * Builds the keyframes of a preset round a figure. Returns the new keys; may give the figure a path (tracking).
 * Front of the figure is where it faces at the start of the shot.
 */
export function applyPreset(p: Project, id: string, f: Figure): void {
  const dur = p.shot.duration
  const a = aspectRatio(p.shot.aspect)
  const lens = p.shot.lens
  if (['tracking', 'follow', 'lead'].includes(id) && !f.path) {
    const r = f.rot * DEG
    const len = Math.min(14, 1.25 * dur)
    f.path = { x: +(f.x + Math.sin(r) * len).toFixed(2), z: +(f.z + Math.cos(r) * len).toFixed(2), t0: 0, t1: dur }
    if (f.pose !== 'run') f.pose = 'walk'
  }
  const st = figAt(f, 0)
  const h = f.height * POSE_HEIGHT[st.pose === 'walk' || st.pose === 'run' ? 'stand' : st.pose]
  const face = (f.path ? figAt(f, (f.path.t0 + f.path.t1) / 2).rot : st.rot) * DEG
  const aimY = h * 0.8
  /** distance at which the lens shows `k` times the figure's height */
  const dist = (k: number, l = lens) => Math.max(0.45, (k * h) / (2 * Math.tan((vfov(l, a) * DEG) / 2)))
  /** a point round the figure: azimuth from its front (degrees, positive to the camera's right), distance, height */
  const at = (az: number, d: number, y: number): Vec3 => [
    +(st.x + Math.sin(face + az * DEG) * d).toFixed(3),
    +y.toFixed(3),
    +(st.z + Math.cos(face + az * DEG) * d).toFixed(3),
  ]
  const aim: Vec3 = [st.x, +aimY.toFixed(3), st.z]
  const L = f.label
  let ks: K[] = []
  const orbit = (deg: number) => {
    const n = Math.round(deg / 45)
    const r = dist(1.15)
    for (let i = 0; i <= n; i++)
      ks.push({ u: i / n, pos: at((deg === 360 ? 0 : -deg / 2) + (deg * i) / n, r, aimY + 0.1), look: L, ease: i === 0 ? 'in' : i === n - 1 ? 'out' : 'linear' })
  }
  switch (id) {
    case 'dollyIn':
      ks = [{ u: 0, pos: at(0, dist(1.7), aimY), look: L, ease: 'inout' }, { u: 1, pos: at(0, dist(0.5), aimY), look: L }]
      break
    case 'dollyOut':
      ks = [{ u: 0, pos: at(0, dist(0.5), aimY), look: L, ease: 'inout' }, { u: 1, pos: at(0, dist(1.7), aimY), look: L }]
      break
    case 'truckL':
    case 'truckR': {
      const d = dist(1.2)
      const sgn = id === 'truckR' ? 1 : -1
      const off = (s: number): [Vec3, Vec3] => {
        const px = Math.cos(face) * s * sgn
        const pz = -Math.sin(face) * s * sgn
        const c = at(0, d, aimY)
        return [[+(c[0] + px).toFixed(3), c[1], +(c[2] + pz).toFixed(3)], [+(st.x + px).toFixed(3), aim[1], +(st.z + pz).toFixed(3)]]
      }
      const [p0, t0] = off(-2)
      const [p1, t1] = off(2)
      ks = [{ u: 0, pos: p0, target: t0, ease: 'inout' }, { u: 1, pos: p1, target: t1 }]
      break
    }
    case 'orbit90':
      orbit(90)
      break
    case 'orbit180':
      orbit(180)
      break
    case 'orbit360':
      orbit(360)
      break
    case 'craneUp':
      ks = [{ u: 0, pos: at(0, dist(1.3), 0.45), look: L, ease: 'inout' }, { u: 1, pos: at(0, dist(1.3) * 0.9, h + 2), look: L }]
      break
    case 'craneDown':
      ks = [{ u: 0, pos: at(0, dist(1.3) * 0.9, h + 2), look: L, ease: 'inout' }, { u: 1, pos: at(0, dist(1.3), 0.45), look: L }]
      break
    case 'pushTilt':
      ks = [
        { u: 0, pos: at(0, dist(1.5), h * 0.75), target: [st.x, +(h * 0.55).toFixed(3), st.z], ease: 'inout' },
        { u: 1, pos: at(0, Math.max(0.8, dist(0.45)), h * 0.35), target: [st.x, +(h * 0.92).toFixed(3), st.z] },
      ]
      break
    case 'pullReveal':
      ks = [
        { u: 0, pos: at(0, dist(0.28), h * 0.92), target: [st.x, +(h * 0.92).toFixed(3), st.z], ease: 'in' },
        { u: 0.5, pos: at(8, dist(1.2), h * 0.95), target: aim, ease: 'out' },
        { u: 1, pos: at(14, dist(3), h + 0.9), target: aim },
      ]
      break
    case 'whip': {
      const cam = at(0, dist(1.2), aimY)
      const d = dist(1.2)
      // looks 80 degrees off to the side, then snaps onto the figure
      const side: Vec3 = [+(cam[0] - Math.sin(face - 80 * DEG) * d).toFixed(3), aim[1], +(cam[2] - Math.cos(face - 80 * DEG) * d).toFixed(3)]
      ks = [
        { u: 0, pos: cam, target: side },
        { u: 0.45, pos: cam, target: side, ease: 'inout' },
        { u: 0.5, pos: cam, target: aim },
        { u: 1, pos: cam, target: aim },
      ]
      break
    }
    case 'vertigo':
      ks = [85, 62, 45, 32, 24].map((l, i) => ({ u: i / 4, pos: at(0, dist(1.05, l), aimY), look: L, lens: l, ease: (i === 0 ? 'in' : i === 3 ? 'out' : 'linear') as Ease }))
      break
    case 'tracking': {
      const pa = f.path as NonNullable<Figure['path']>
      const d = dist(1.25)
      const sx = Math.cos(face) * d
      const sz = -Math.sin(face) * d
      ks = [
        { u: pa.t0 / dur, pos: [+(f.x + sx).toFixed(3), +aimY.toFixed(3), +(f.z + sz).toFixed(3)], look: L },
        { u: pa.t1 / dur, pos: [+(pa.x + sx).toFixed(3), +aimY.toFixed(3), +(pa.z + sz).toFixed(3)], look: L },
      ]
      break
    }
    case 'follow':
    case 'lead': {
      const pa = f.path as NonNullable<Figure['path']>
      const d = dist(1.2)
      const sgn = id === 'follow' ? -1 : 1
      const sx = Math.sin(face) * d * sgn
      const sz = Math.cos(face) * d * sgn
      ks = [
        { u: pa.t0 / dur, pos: [+(f.x + sx).toFixed(3), +aimY.toFixed(3), +(f.z + sz).toFixed(3)], look: L },
        { u: pa.t1 / dur, pos: [+(pa.x + sx).toFixed(3), +aimY.toFixed(3), +(pa.z + sz).toFixed(3)], look: L },
      ]
      break
    }
    case 'ots': {
      // over this figure's shoulder onto the nearest other one (or onto the space in front of it)
      const o = p.figures.filter((x) => x !== f).sort((a, b) => Math.hypot(a.x - st.x, a.z - st.z) - Math.hypot(b.x - st.x, b.z - st.z))[0]
      const to = o ? Math.atan2(o.x - st.x, o.z - st.z) : face
      const tgt: Vec3 = o ? [o.x, +(o.height * 0.85).toFixed(3), o.z] : [+(st.x + Math.sin(face) * 3).toFixed(3), +aimY.toFixed(3), +(st.z + Math.cos(face) * 3).toFixed(3)]
      const sh = (az: number, d: number): Vec3 => [+(st.x + Math.sin(to + az * DEG) * d).toFixed(3), +(h * 0.93).toFixed(3), +(st.z + Math.cos(to + az * DEG) * d).toFixed(3)]
      ks = [
        { u: 0, pos: sh(154, 1.7), target: tgt, lens: 50, look: o ? o.label : null, ease: 'inout' },
        { u: 1, pos: sh(150, 1.2), target: tgt, lens: 50, look: o ? o.label : null },
      ]
      break
    }
    case 'spiral':
      for (let i = 0; i <= 4; i++)
        ks.push({ u: i / 4, pos: at(-90 + 45 * i, dist(1.7) + ((dist(0.55) - dist(1.7)) * i) / 4, aimY + 0.05 * i), look: L, ease: i === 0 ? 'in' : i === 3 ? 'out' : 'linear' })
      break
    case 'hero':
      ks = [
        { u: 0, pos: at(0, dist(1.15), 0.35), target: [st.x, +(h * 0.8).toFixed(3), st.z], ease: 'inout' },
        { u: 1, pos: at(0, dist(0.7), 0.5), target: [st.x, +(h * 0.9).toFixed(3), st.z] },
      ]
      break
    case 'crash': {
      const c = at(0, dist(2.2, 24), aimY)
      ks = [
        { u: 0, pos: c, look: L, lens: 24 },
        { u: 0.46, pos: c, look: L, lens: 24, ease: 'in' },
        { u: 0.5, pos: c, look: L, lens: 85 },
        { u: 1, pos: c, look: L, lens: 85 },
      ]
      break
    }
    case 'zoomIn':
    case 'zoomOut': {
      const c = at(0, dist(1.6, 35), aimY)
      const [l0, l1] = id === 'zoomIn' ? [35, 85] : [85, 35]
      ks = [{ u: 0, pos: c, look: L, lens: l0, ease: 'inout' }, { u: 1, pos: c, look: L, lens: l1 }]
      break
    }
    case 'panReveal': {
      const cam = at(0, dist(1.3), aimY)
      const d = dist(1.3)
      const side: Vec3 = [+(cam[0] - Math.sin(face + 65 * DEG) * d).toFixed(3), aim[1], +(cam[2] - Math.cos(face + 65 * DEG) * d).toFixed(3)]
      ks = [{ u: 0, pos: cam, target: side, ease: 'inout' }, { u: 1, pos: cam, target: aim }]
      break
    }
    case 'tiltUp': {
      const cam = at(0, dist(0.5), h * 0.5)
      ks = [{ u: 0, pos: cam, target: [st.x, 0.12, st.z], ease: 'inout' }, { u: 1, pos: cam, target: [st.x, +(h * 0.93).toFixed(3), st.z] }]
      break
    }
    case 'dutch':
      ks = [{ u: 0, pos: at(0, dist(1.4), aimY), look: L, ease: 'inout' }, { u: 1, pos: at(0, dist(0.5), aimY), look: L, roll: 18 }]
      break
    case 'topSpin':
      ks = [0, 1, 2, 3].map((i) => ({ u: i / 3, pos: [st.x, 6.5 - i * 0.5, st.z + 0.02] as Vec3, target: [st.x, 0, st.z] as Vec3, roll: i * 40, ease: (i === 0 ? 'in' : i === 2 ? 'out' : 'linear') as Ease }))
      break
    case 'lockWide':
    case 'lockMed':
    case 'lockClose': {
      const k = id === 'lockWide' ? 2.3 : id === 'lockMed' ? 0.58 : 0.2
      const ty = id === 'lockClose' ? h * 0.93 : aimY
      const tgt: Vec3 = [st.x, +ty.toFixed(3), st.z]
      const cam = at(id === 'lockWide' ? 12 : 0, dist(k), ty)
      ks = [{ u: 0, pos: cam, target: tgt }, { u: 1, pos: cam, target: tgt }]
      break
    }
    case 'overhead':
      ks = [
        { u: 0, pos: [st.x, 7, st.z + 0.02], target: [st.x, 0, st.z], ease: 'inout' },
        { u: 1, pos: [st.x, 4.6, st.z + 0.02], target: [st.x, 0, st.z] },
      ]
      break
  }
  p.keys = ks.map(
    (k): Keyframe => ({
      id: uid(),
      t: Math.round(k.u * dur * p.shot.fps) / p.shot.fps,
      pos: k.pos,
      target: k.target || aim,
      roll: k.roll || 0,
      lens: k.lens || lens,
      ease: k.ease || 'linear',
      look: k.look || null,
      cut: !!k.cut,
    }),
  )
}

/** Does a wall or a prop stand on the floor line from the camera to what it looks at? */
function blocked(p: Project, cx: number, cz: number, tx: number, tz: number): boolean {
  const cross = (ax: number, az: number, bx: number, bz: number) => ax * bz - az * bx
  for (const pr of p.props) {
    if (pr.kind === 'wall') {
      const r = pr.rot * DEG
      const x1 = pr.x - Math.cos(r) * 2.1
      const z1 = pr.z + Math.sin(r) * 2.1
      const x2 = pr.x + Math.cos(r) * 2.1
      const z2 = pr.z - Math.sin(r) * 2.1
      const d = cross(tx - cx, tz - cz, x2 - x1, z2 - z1)
      if (Math.abs(d) < 1e-6) continue
      const u = cross(x1 - cx, z1 - cz, x2 - x1, z2 - z1) / d
      const v = cross(x1 - cx, z1 - cz, tx - cx, tz - cz) / d
      if (u > 0 && u < 0.97 && v > 0 && v < 1) return true
    } else if (pr.kind !== 'mic' && pr.kind !== 'chair' && pr.kind !== 'box') {
      // distance from the prop to the line of sight, short of the figure itself
      const lx = tx - cx
      const lz = tz - cz
      const len2 = lx * lx + lz * lz || 1
      const u = Math.max(0, Math.min(0.85, ((pr.x - cx) * lx + (pr.z - cz) * lz) / len2))
      const reach = pr.kind === 'car' ? 1.6 : pr.kind === 'tree' || pr.kind === 'column' ? 0.5 : 0.9
      if (Math.hypot(cx + lx * u - pr.x, cz + lz * u - pr.z) < reach) return true
    }
  }
  return false
}

/** Ready-made edits: several shots with hard cuts round a figure (and the one it plays against). */
export const CUTS: Preset[] = [
  { id: 'punch', gr: 'Wide, medium, κοντινό', note: '3 πλάνα που κλείνουν' },
  { id: 'reverse', gr: 'Πλάνο και κόντρα πλάνο', note: 'over the shoulder, 4 cuts' },
  { id: 'coverage', gr: 'Κάλυψη διαλόγου', note: 'master, OTS, κοντινά' },
  { id: 'action', gr: 'Action montage', note: '5 γρήγορα πλάνα με κίνηση' },
  { id: 'mv', gr: 'Music video cuts', note: '6 πλάνα, γωνίες και μεγέθη' },
  { id: 'reveal', gr: 'Λεπτομέρεια σε wide', note: 'πολύ κοντινό, medium, γενικό' },
  { id: 'around', gr: 'Γύρω γύρω', note: '4 πλευρές, ίδιο μέγεθος' },
  { id: 'angles', gr: 'Ύψη κάμερας', note: 'χαμηλά, μάτια, ψηλά, overhead' },
]

export function applyCuts(p: Project, id: string, f: Figure): void {
  const dur = p.shot.duration
  const a = aspectRatio(p.shot.aspect)
  const fps = p.shot.fps
  const st = figAt(f, 0)
  const h = f.height * POSE_HEIGHT[st.pose === 'walk' || st.pose === 'run' ? 'stand' : st.pose]
  const dist = (k: number, l: number, hh = h) => Math.max(0.45, (k * hh) / (2 * Math.tan((vfov(l, a) * DEG) / 2)))
  const o = p.figures.filter((x) => x !== f).sort((x, y) => Math.hypot(x.x - st.x, x.z - st.z) - Math.hypot(y.x - st.x, y.z - st.z))[0]
  const keys: Keyframe[] = []
  /**
   * One shot on a figure from u0 to u1 (shares of the duration): azimuth from its front, size as a share of its height,
   * camera height as a share of its height. `to` gives the end of a move inside the shot.
   */
  type S = { az: number; k: number; y: number; lens: number; aim?: number; roll?: number }
  const shot = (u0: number, u1: number, who: Figure, from: S, to?: Partial<S>, look?: Figure) => {
    // if a wall or a prop stands between the camera and the figure, take the mirrored side
    const sight = (az: number) => {
      const w = figAt(who, u0 * dur)
      const ang = (w.rot + az) * DEG
      const d = dist(from.k, from.lens, who.height)
      return blocked(p, w.x + Math.sin(ang) * d, w.z + Math.cos(ang) * d, w.x, w.z)
    }
    const flip = from.y <= 3.2 && sight(from.az) && !sight(-from.az) ? -1 : 1
    const key = (t: number, s: S, cut: boolean, ease: Ease): Keyframe => {
      const w = figAt(who, t)
      const wh = who.height * POSE_HEIGHT[w.pose]
      const ang = (w.rot + s.az * flip) * DEG
      const d = s.y > 3.2 ? 0.05 : dist(s.k, s.lens, wh)
      const lf = look || who
      const lw = figAt(lf, t)
      return {
        id: uid(), t: Math.round(t * fps) / fps, cut, ease, roll: s.roll || 0, lens: s.lens,
        pos: [+(w.x + Math.sin(ang) * d).toFixed(3), +(s.y > 3.2 ? s.y * wh * 0.55 + 2 : s.y * wh).toFixed(3), +(w.z + Math.cos(ang) * d).toFixed(3)],
        target: [lw.x, +(lf.height * POSE_HEIGHT[lw.pose] * (s.aim ?? 0.8)).toFixed(3), lw.z],
        // a lock keeps a walking figure in frame; close shots aim by hand at the face
        look: s.aim === undefined && s.y <= 3.2 ? lf.label : null,
      }
    }
    const t0 = u0 * dur
    const t1 = u1 * dur - 1 / fps
    keys.push(key(t0, from, keys.length > 0, to ? 'inout' : 'linear'))
    if (to) keys.push(key(t1, { ...from, ...to }, false, 'linear'))
  }
  // over `who`'s shoulder onto `on`
  const ots = (u0: number, u1: number, who: Figure, on: Figure, side: 1 | -1) => {
    const w = figAt(who, u0 * dur)
    const x = figAt(on, u0 * dur)
    const to = Math.atan2(x.x - w.x, x.z - w.z)
    const wh = who.height * POSE_HEIGHT[w.pose]
    const at = (az: number, d: number): Vec3 => [+(w.x + Math.sin(to + az * DEG) * d).toFixed(3), +(wh * 0.93).toFixed(3), +(w.z + Math.cos(to + az * DEG) * d).toFixed(3)]
    const tgt: Vec3 = [x.x, +(on.height * POSE_HEIGHT[x.pose] * 0.86).toFixed(3), x.z]
    const mk = (t: number, pos: Vec3, cut: boolean, ease: Ease): Keyframe => ({ id: uid(), t: Math.round(t * fps) / fps, cut, ease, roll: 0, lens: 50, pos, target: tgt, look: null })
    keys.push(mk(u0 * dur, at(152 * side, 1.45), keys.length > 0, 'inout'), mk(u1 * dur - 1 / fps, at(150 * side, 1.25), false, 'linear'))
  }
  const B = o || f
  switch (id) {
    case 'punch':
      shot(0, 0.4, f, { az: 8, k: 2.3, y: 0.82, lens: 24 }, { k: 1.8 })
      shot(0.4, 0.72, f, { az: -14, k: 0.62, y: 0.82, lens: 35 }, { k: 0.5 })
      shot(0.72, 1, f, { az: 6, k: 0.21, y: 0.92, lens: 85, aim: 0.93 }, { k: 0.16 })
      break
    case 'reverse':
      ots(0, 0.28, f, B === f ? f : B, 1)
      if (o) {
        ots(0.28, 0.52, o, f, -1)
        ots(0.52, 0.76, f, o, 1)
        shot(0.76, 1, o, { az: -12, k: 0.22, y: 0.92, lens: 85, aim: 0.93 }, { k: 0.19 }, o)
      } else shot(0.28, 1, f, { az: 10, k: 0.3, y: 0.9, lens: 50, aim: 0.92 })
      break
    case 'coverage':
      if (o) {
        // the master: both of them, square to the line between them, from the side nothing blocks
        const mx = (st.x + o.x) / 2
        const mz = (st.z + o.z) / 2
        const sep = Math.hypot(o.x - st.x, o.z - st.z)
        const n = Math.atan2(o.x - st.x, o.z - st.z) + Math.PI / 2
        const d = Math.max(dist(1.5, 35), sep * 1.25)
        const side = blocked(p, mx + Math.sin(n) * d, mz + Math.cos(n) * d, mx, mz) && !blocked(p, mx - Math.sin(n) * d, mz - Math.cos(n) * d, mx, mz) ? -1 : 1
        const pos = (dd: number): Vec3 => [+(mx + Math.sin(n) * dd * side).toFixed(3), +(h * 0.75).toFixed(3), +(mz + Math.cos(n) * dd * side).toFixed(3)]
        const tgt: Vec3 = [+mx.toFixed(3), +(h * 0.72).toFixed(3), +mz.toFixed(3)]
        keys.push(
          { id: uid(), t: 0, cut: false, ease: 'inout', roll: 0, lens: 35, pos: pos(d), target: tgt, look: null },
          { id: uid(), t: Math.round((0.26 * dur - 1 / fps) * fps) / fps, cut: false, ease: 'linear', roll: 0, lens: 35, pos: pos(d * 0.88), target: tgt, look: null },
        )
      } else shot(0, 0.26, f, { az: 20, k: 1.9, y: 0.75, lens: 35 }, { k: 1.7 })
      if (o) {
        ots(0.26, 0.44, f, o, 1)
        ots(0.44, 0.62, o, f, -1)
        shot(0.62, 0.81, o, { az: -14, k: 0.24, y: 0.92, lens: 85, aim: 0.93 })
      } else shot(0.26, 0.62, f, { az: -20, k: 0.6, y: 0.82, lens: 50 })
      shot(o ? 0.81 : 0.62, 1, f, { az: 14, k: 0.24, y: 0.92, lens: 85, aim: 0.93 }, { k: 0.2 })
      break
    case 'action':
      shot(0, 0.22, f, { az: 15, k: 1.9, y: 0.18, lens: 18 }, { k: 1.5 })
      shot(0.22, 0.42, f, { az: 90, k: 0.9, y: 0.75, lens: 35 }, { az: 70 })
      shot(0.42, 0.58, f, { az: 0, k: 0.2, y: 0.92, lens: 85, aim: 0.93 })
      shot(0.58, 0.78, f, { az: 0, k: 1, y: 4, lens: 24 }, { roll: 25 })
      shot(0.78, 1, f, { az: 180, k: 1.2, y: 0.9, lens: 24 }, { k: 0.8 })
      break
    case 'mv':
      shot(0, 0.2, f, { az: -30, k: 1.6, y: 0.2, lens: 18 }, { az: 0 })
      shot(0.2, 0.34, f, { az: 10, k: 0.2, y: 0.92, lens: 85, aim: 0.93 })
      shot(0.34, 0.5, f, { az: 90, k: 0.6, y: 0.82, lens: 50 }, { k: 0.5 })
      shot(0.5, 0.64, f, { az: 0, k: 1, y: 4, lens: 24 }, { roll: 40 })
      shot(0.64, 0.8, f, { az: 200, k: 0.9, y: 0.95, lens: 35 }, { az: 160 })
      shot(0.8, 1, f, { az: -8, k: 0.33, y: 0.86, lens: 50, aim: 0.9, roll: -8 }, { k: 0.26, roll: 0 })
      break
    case 'reveal':
      shot(0, 0.3, f, { az: 12, k: 0.1, y: 0.93, lens: 135, aim: 0.93 })
      shot(0.3, 0.6, f, { az: -15, k: 0.6, y: 0.82, lens: 50 }, { k: 0.66 })
      shot(0.6, 1, f, { az: 20, k: 3.6, y: 1.5, lens: 24 }, { k: 4.4, y: 2 })
      break
    case 'around':
      ;[0, 90, 180, -90].forEach((az, i) => shot(i / 4, (i + 1) / 4, f, { az: az + 10, k: 1.0, y: 0.82, lens: 35 }, { az: az - 10 }))
      break
    case 'angles':
      shot(0, 0.25, f, { az: 10, k: 1.3, y: 0.15, lens: 24 })
      shot(0.25, 0.5, f, { az: -10, k: 0.9, y: 0.88, lens: 35 })
      shot(0.5, 0.75, f, { az: 20, k: 1.5, y: 2, lens: 35 })
      shot(0.75, 1, f, { az: 0, k: 1, y: 4, lens: 24 })
      break
  }
  p.keys = keys
}
