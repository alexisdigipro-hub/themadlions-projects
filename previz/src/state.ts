import { uid, clamp } from './util'

export type Vec3 = [number, number, number]
export const LABELS = ['A', 'B', 'C', 'D'] as const
export type Label = (typeof LABELS)[number]
export type Pose = 'stand' | 'sit' | 'walk' | 'run' | 'kneel'
export type Ease = 'linear' | 'in' | 'out' | 'inout'
export type PropKind = 'box' | 'table' | 'chair' | 'door' | 'wall'
export type Aspect = '16:9' | '9:16' | '2.39:1' | '1:1'

export interface Figure { id: string; label: Label; x: number; z: number; rot: number; height: number; pose: Pose }
export interface Prop { id: string; kind: PropKind; x: number; z: number; rot: number }
export interface Keyframe { id: string; t: number; pos: Vec3; target: Vec3; roll: number; lens: number; ease: Ease }
export interface Shot { aspect: Aspect; duration: number; fps: 24 | 25; lens: number }
export interface Project { v: 1; figures: Figure[]; props: Prop[]; keys: Keyframe[]; shot: Shot }

export const FIG_COLORS: Record<Label, string> = { A: '#ff6a45', B: '#33c3ff', C: '#ffd02e', D: '#c47bff' }
export const LENSES = [14, 18, 24, 35, 50, 85, 135]
export const ASPECTS: Aspect[] = ['16:9', '9:16', '2.39:1', '1:1']
export const POSES: { id: Pose; gr: string }[] = [
  { id: 'stand', gr: 'Όρθιος' },
  { id: 'sit', gr: 'Καθιστός' },
  { id: 'walk', gr: 'Περπατάει' },
  { id: 'run', gr: 'Τρέχει' },
  { id: 'kneel', gr: 'Γονατιστός' },
]
export const EASES: { id: Ease; gr: string }[] = [
  { id: 'linear', gr: 'Γραμμικό' },
  { id: 'in', gr: 'Ease in' },
  { id: 'out', gr: 'Ease out' },
  { id: 'inout', gr: 'In-out' },
]
export const PROPS: { id: PropKind; gr: string }[] = [
  { id: 'box', gr: 'Κουτί' },
  { id: 'table', gr: 'Τραπέζι' },
  { id: 'chair', gr: 'Καρέκλα' },
  { id: 'door', gr: 'Πόρτα' },
  { id: 'wall', gr: 'Τοίχος' },
]

/** The example the tool opens with: two figures and an orbit of 180 degrees around A. */
export function exampleProject(): Project {
  const r = 3.2
  const y = 1.6
  const keys: Keyframe[] = [-90, -45, 0, 45, 90].map((az, i) => ({
    id: uid(),
    t: i * 2,
    pos: [r * Math.sin((az * Math.PI) / 180), y, r * Math.cos((az * Math.PI) / 180)] as Vec3,
    target: [0, 1.45, 0] as Vec3,
    roll: 0,
    lens: 35,
    ease: (i === 0 ? 'in' : i === 3 ? 'out' : 'linear') as Ease,
  }))
  return {
    v: 1,
    figures: [
      { id: uid(), label: 'A', x: 0, z: 0, rot: 0, height: 1.8, pose: 'stand' },
      { id: uid(), label: 'B', x: -1.7, z: -1.6, rot: 40, height: 1.68, pose: 'stand' },
    ],
    props: [
      { id: uid(), kind: 'wall', x: 0, z: -4.2, rot: 0 },
      { id: uid(), kind: 'door', x: 2.6, z: -4.1, rot: 0 },
      { id: uid(), kind: 'table', x: 2.4, z: -1.2, rot: 15 },
      { id: uid(), kind: 'chair', x: 1.6, z: -1.0, rot: -70 },
      { id: uid(), kind: 'box', x: -3.2, z: 1.4, rot: 20 },
    ],
    keys,
    shot: { aspect: '16:9', duration: 8, fps: 24, lens: 35 },
  }
}

export function normalize(p: Project): void {
  p.shot.duration = clamp(p.shot.duration, 4, 15)
  for (const k of p.keys) k.t = clamp(k.t, 0, p.shot.duration)
  p.keys.sort((a, b) => a.t - b.t)
}

/** Accept a stored project only if its shape is sound; otherwise start from the example. */
export function migrate(raw: unknown): Project | null {
  const p = raw as Project
  if (!p || p.v !== 1 || !Array.isArray(p.figures) || !Array.isArray(p.keys) || !p.shot) return null
  p.props = Array.isArray(p.props) ? p.props : []
  normalize(p)
  return p
}

type Listener = (reason: string) => void
const KEY = 'tml_previz_v1'

/** The project, with undo / redo by snapshots and an autosave to localStorage. */
export class Store {
  p: Project
  private past: string[] = []
  private future: string[] = []
  private liveBase: string | null = null
  private listeners = new Set<Listener>()
  private saveTimer = 0

  constructor() {
    let p: Project | null = null
    try {
      const s = localStorage.getItem(KEY)
      if (s) p = migrate(JSON.parse(s))
    } catch {
      p = null
    }
    this.p = p || exampleProject()
  }

  on(fn: Listener): void {
    this.listeners.add(fn)
  }

  private emit(reason: string): void {
    for (const fn of this.listeners) fn(reason)
    clearTimeout(this.saveTimer)
    this.saveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.p))
      } catch {
        /* storage full or blocked: the work stays in the page */
      }
    }, 400)
  }

  commit(fn: (p: Project) => void, reason = 'edit'): void {
    const before = JSON.stringify(this.p)
    fn(this.p)
    normalize(this.p)
    if (JSON.stringify(this.p) === before) return
    this.past.push(before)
    if (this.past.length > 150) this.past.shift()
    this.future = []
    this.emit(reason)
  }

  /** Changes while a finger drags: shown at once, one undo step when it ends. */
  live(fn: (p: Project) => void): void {
    if (this.liveBase === null) this.liveBase = JSON.stringify(this.p)
    fn(this.p)
    this.emit('live')
  }

  end(): void {
    if (this.liveBase === null) return
    normalize(this.p)
    if (JSON.stringify(this.p) !== this.liveBase) {
      this.past.push(this.liveBase)
      this.future = []
    }
    this.liveBase = null
    this.emit('edit')
  }

  replace(p: Project): void {
    this.commit((cur) => Object.assign(cur, p), 'replace')
  }

  canUndo(): boolean {
    return this.past.length > 0
  }
  canRedo(): boolean {
    return this.future.length > 0
  }
  undo(): void {
    const prev = this.past.pop()
    if (!prev) return
    this.future.push(JSON.stringify(this.p))
    this.p = JSON.parse(prev)
    this.emit('undo')
  }
  redo(): void {
    const next = this.future.pop()
    if (!next) return
    this.past.push(JSON.stringify(this.p))
    this.p = JSON.parse(next)
    this.emit('undo')
  }
}
