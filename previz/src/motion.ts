import * as THREE from 'three'
import type { Figure, Pose } from './state'
import { clamp } from './util'

/** How tall the figure stands in each pose, as a share of its height. */
export const POSE_HEIGHT: Record<Pose, number> = { stand: 1, walk: 0.99, run: 0.95, sit: 0.73, kneel: 0.72 }

export interface FigState { x: number; z: number; rot: number; pose: Pose; moving: boolean; phase: number }

/** Length of the figure's path in metres (0 without one). */
export function pathLength(f: Figure): number {
  return f.path ? Math.hypot(f.path.x - f.x, f.path.z - f.z) : 0
}

/** Where a figure is and what it does at time t. With a path it walks or runs from its place to the destination. */
export function figAt(f: Figure, t: number): FigState {
  const len = pathLength(f)
  if (!f.path || len < 0.05) return { x: f.x, z: f.z, rot: f.rot, pose: f.pose, moving: false, phase: 0 }
  const { t0, t1 } = f.path
  const u = clamp((t - t0) / Math.max(0.01, t1 - t0), 0, 1)
  const run = f.pose === 'run'
  const moving = t > t0 && t < t1
  const rest: Pose = f.pose === 'walk' || f.pose === 'run' ? 'stand' : f.pose
  return {
    x: f.x + (f.path.x - f.x) * u,
    z: f.z + (f.path.z - f.z) * u,
    rot: (Math.atan2(f.path.x - f.x, f.path.z - f.z) * 180) / Math.PI,
    pose: moving ? (run ? 'run' : 'walk') : rest,
    moving,
    phase: ((u * len) / (run ? 2.6 : 1.45)) * Math.PI * 2,
  }
}

/** The point a camera locked on the figure looks at: upper chest. */
export function aimAt(f: Figure, t: number): THREE.Vector3 {
  const s = figAt(f, t)
  return new THREE.Vector3(s.x, f.height * POSE_HEIGHT[s.pose] * 0.8, s.z)
}
