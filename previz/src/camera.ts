import * as THREE from 'three'
import type { Aspect, Ease, Keyframe, Project } from './state'
import { aimAt } from './motion'
import { DEG } from './util'

export function aspectRatio(a: Aspect): number {
  return a === '16:9' ? 16 / 9 : a === '9:16' ? 9 / 16 : a === '2.39:1' ? 2.39 : 1
}

/**
 * Vertical field of view of a lens on full frame (36 x 24 mm).
 * The frame is the largest one of that aspect that fits the sensor; portrait frames use the sensor on its side.
 */
export function vfov(lens: number, aspect: number): number {
  const h = aspect >= 1 ? Math.min(36, 24 * aspect) / aspect : Math.min(36, 24 / aspect)
  return (2 * Math.atan(h / 2 / lens)) / DEG
}

export function hfov(lens: number, aspect: number): number {
  const v = vfov(lens, aspect) * DEG
  return (2 * Math.atan(Math.tan(v / 2) * aspect)) / DEG
}

/** Easing that joins linear neighbours without a jolt: ease in ends at linear speed, ease out starts at it. */
export function ease(e: Ease, u: number): number {
  switch (e) {
    case 'in':
      return 2 * u * u - u * u * u
    case 'out':
      return u + u * u - u * u * u
    case 'inout':
      return u * u * (3 - 2 * u)
    default:
      return u
  }
}

export interface CamState {
  pos: THREE.Vector3
  target: THREE.Vector3
  roll: number
  lens: number
}

export const DEFAULT_CAM = (): CamState => ({
  pos: new THREE.Vector3(0, 1.6, 5),
  target: new THREE.Vector3(0, 1.4, 0),
  roll: 0,
  lens: 35,
})

const v = (a: [number, number, number]) => new THREE.Vector3(a[0], a[1], a[2])

/** Centripetal Catmull-Rom between p1 and p2. */
function catmull(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, u: number): THREE.Vector3 {
  const d12 = p1.distanceTo(p2)
  if (d12 < 1e-6) return p1.clone()
  const eps = 1e-4
  const t0 = 0
  const t1 = t0 + Math.max(eps, Math.sqrt(p0.distanceTo(p1)))
  const t2 = t1 + Math.sqrt(d12)
  const t3 = t2 + Math.max(eps, Math.sqrt(p2.distanceTo(p3)))
  const t = t1 + (t2 - t1) * u
  const lerp = (a: THREE.Vector3, b: THREE.Vector3, ta: number, tb: number) =>
    a.clone().multiplyScalar((tb - t) / (tb - ta)).add(b.clone().multiplyScalar((t - ta) / (tb - ta)))
  const a1 = lerp(p0, p1, t0, t1)
  const a2 = lerp(p1, p2, t1, t2)
  const a3 = lerp(p2, p3, t2, t3)
  const b1 = lerp(a1, a2, t0, t2)
  const b2 = lerp(a2, a3, t1, t3)
  return lerp(b1, b2, t1, t2)
}

function spline(pts: THREE.Vector3[], i: number, u: number): THREE.Vector3 {
  const p1 = pts[i]
  const p2 = pts[i + 1]
  const p0 = i > 0 ? pts[i - 1] : p1.clone().multiplyScalar(2).sub(p2)
  const p3 = i + 2 < pts.length ? pts[i + 2] : p2.clone().multiplyScalar(2).sub(p1)
  return catmull(p0, p1, p2, p3, u)
}

/** Where a keyframe looks at time t: its own point, or the figure it is locked on (which may be walking). */
export function keyTarget(p: Project, k: Keyframe, t: number): THREE.Vector3 {
  const f = k.look ? p.figures.find((f) => f.label === k.look) : null
  return f ? aimAt(f, t) : v(k.target)
}

/** Smooth noise in -1..1 for the handheld shake: a few sines that never line up. */
function noise(t: number, seed: number): number {
  return (
    Math.sin(t * 1.9 + seed * 12.9) * 0.5 +
    Math.sin(t * 4.3 + seed * 78.2) * 0.3 +
    Math.sin(t * 9.1 + seed * 37.7) * 0.14 +
    Math.sin(t * 17.3 + seed * 5.1) * 0.06
  )
}

/** Where the shot camera is at time t. Keys must be sorted by time. With shake, the handheld of the shot is added. */
export function camAt(p: Project, t: number, shake = false): CamState {
  const s = base(p, t)
  const amt = shake ? (p.shot.shake || 0) / 100 : 0
  if (amt > 0) {
    const dir = s.target.clone().sub(s.pos)
    const dist = dir.length() || 1
    dir.normalize()
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0))
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0)
    right.normalize()
    const up = new THREE.Vector3().crossVectors(right, dir)
    const ang = 1.5 * DEG * amt
    s.target.addScaledVector(right, Math.tan(noise(t, 1) * ang) * dist).addScaledVector(up, Math.tan(noise(t, 2) * ang) * dist)
    s.pos.addScaledVector(right, noise(t * 0.8, 3) * 0.035 * amt).addScaledVector(up, noise(t * 0.8, 4) * 0.03 * amt)
    s.roll += noise(t * 0.9, 5) * 1.1 * amt
  }
  return s
}

/** The shots of the timeline: a keyframe marked cut starts a new one, and the camera jumps to it. */
export function shotsOf(keys: Keyframe[]): Keyframe[][] {
  const out: Keyframe[][] = []
  for (const k of keys) {
    if (k.cut && out.length) out.push([k])
    else if (out.length) out[out.length - 1].push(k)
    else out.push([k])
  }
  return out
}

function base(p: Project, t: number): CamState {
  // the shot playing at t: the last one that has started (a shot holds its last keyframe until the next cut)
  const groups = shotsOf(p.keys)
  let keys = groups[0] || []
  for (const g of groups) if (g[0].t <= t + 1e-6) keys = g
  if (!keys.length) return DEFAULT_CAM()
  if (keys.length === 1 || t <= keys[0].t) {
    const k = keys[0]
    return { pos: v(k.pos), target: keyTarget(p, k, t), roll: k.roll, lens: k.lens }
  }
  const last = keys[keys.length - 1]
  if (t >= last.t) return { pos: v(last.pos), target: keyTarget(p, last, t), roll: last.roll, lens: last.lens }
  let i = 0
  while (i < keys.length - 2 && t >= keys[i + 1].t) i++
  const a = keys[i]
  const b = keys[i + 1]
  const span = b.t - a.t
  const u = span > 1e-6 ? ease(a.ease, (t - a.t) / span) : 1
  const pos = spline(keys.map((k) => v(k.pos)), i, u)
  const target =
    a.look || b.look
      ? keyTarget(p, a, t).lerp(keyTarget(p, b, t), u * u * (3 - 2 * u))
      : spline(keys.map((k) => v(k.target)), i, u)
  return { pos, target, roll: a.roll + (b.roll - a.roll) * u, lens: a.lens + (b.lens - a.lens) * u }
}

/** Point a camera from a state. Roll is in degrees, positive turns the camera clockwise. */
export function applyCam(cam: THREE.PerspectiveCamera, s: CamState, aspect: number): void {
  cam.position.copy(s.pos)
  const dir = s.target.clone().sub(s.pos).normalize()
  // looking straight down or up: give lookAt an up that is not parallel to the view
  if (Math.abs(dir.y) > 0.999) cam.up.set(0, 0, -1)
  else cam.up.set(0, 1, 0)
  cam.lookAt(s.target)
  if (s.roll) cam.rotateZ(-s.roll * DEG)
  cam.fov = vfov(s.lens, aspect)
  cam.aspect = aspect
  cam.updateProjectionMatrix()
}
