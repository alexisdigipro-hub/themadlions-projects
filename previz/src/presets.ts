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
]

type K = { u: number; pos: Vec3; target?: Vec3; lens?: number; ease?: Ease; look?: Label | null }

/**
 * Builds the keyframes of a preset round a figure. Returns the new keys; may give the figure a path (tracking).
 * Front of the figure is where it faces at the start of the shot.
 */
export function applyPreset(p: Project, id: string, f: Figure): void {
  const dur = p.shot.duration
  const a = aspectRatio(p.shot.aspect)
  const lens = p.shot.lens
  if (id === 'tracking' && !f.path) {
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
      roll: 0,
      lens: k.lens || lens,
      ease: k.ease || 'linear',
      look: k.look || null,
    }),
  )
}
