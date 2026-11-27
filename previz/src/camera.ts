import * as THREE from 'three'
import type { Aspect, Ease, Keyframe } from './state'
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

/** Where the shot camera is at time t. Keys must be sorted by time. */
export function evalCamera(keys: Keyframe[], t: number): CamState {
  if (!keys.length) return DEFAULT_CAM()
  if (keys.length === 1 || t <= keys[0].t) {
    const k = keys[0]
    return { pos: v(k.pos), target: v(k.target), roll: k.roll, lens: k.lens }
  }
  const last = keys[keys.length - 1]
  if (t >= last.t) return { pos: v(last.pos), target: v(last.target), roll: last.roll, lens: last.lens }
  let i = 0
  while (i < keys.length - 2 && t >= keys[i + 1].t) i++
  const a = keys[i]
  const b = keys[i + 1]
  const span = b.t - a.t
  const u = span > 1e-6 ? ease(a.ease, (t - a.t) / span) : 1
  const pos = spline(keys.map((k) => v(k.pos)), i, u)
  const target = spline(keys.map((k) => v(k.target)), i, u)
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
