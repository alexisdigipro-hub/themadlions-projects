import * as THREE from 'three'
import type { Ease, Figure, Pose, Project } from './state'
import { aspectRatio, evalCamera, vfov, type CamState } from './camera'
import { POSE_HEIGHT } from './scene'
import { DEG, sec } from './util'

const FIRST_LINE =
  'Follow the camera movement of @Video1 exactly; use it for camera motion and blocking only, ignore its look, materials and lighting.'

const POSE_EN: Record<Pose, string> = { stand: 'standing', sit: 'sitting', walk: 'walking', run: 'running', kneel: 'kneeling' }

interface Move { key: string; base: string; ger: string }

const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180
const art = (w: string) => (/^[aeiou]/i.test(w) ? 'an' : 'a')
const roundTo = (v: number, step: number) => Math.max(step, Math.round(v / step) * step)

function fwd(s: CamState): THREE.Vector3 {
  return s.target.clone().sub(s.pos).normalize()
}
function chest(f: Figure): THREE.Vector3 {
  return new THREE.Vector3(f.x, f.height * POSE_HEIGHT[f.pose] * 0.6, f.z)
}

/** The figure the camera is about: the one nearest to where it looks. */
function subjectOf(p: Project, s: CamState): Figure | null {
  let best: Figure | null = null
  let bd = 1.5
  for (const f of p.figures) {
    const d = Math.hypot(s.target.x - f.x, s.target.z - f.z)
    if (d < bd) {
      bd = d
      best = f
    }
  }
  return best
}

export function shotSize(s: CamState, f: Figure, aspect: number): string {
  const h = f.height * POSE_HEIGHT[f.pose]
  const d = s.pos.distanceTo(chest(f))
  const vis = 2 * d * Math.tan((vfov(s.lens, aspect) * DEG) / 2)
  const r = vis / h
  if (r > 3.2) return 'extreme wide shot'
  if (r > 1.7) return 'wide shot'
  if (r > 1.08) return 'full shot'
  if (r > 0.7) return 'medium wide shot'
  if (r > 0.44) return 'medium shot'
  if (r > 0.27) return 'medium close-up'
  if (r > 0.15) return 'close-up'
  return 'extreme close-up'
}

export function heightClass(s: CamState, f: Figure | null): string {
  const eye = f ? f.height * POSE_HEIGHT[f.pose] * 0.93 : 1.6
  const pitch = Math.asin(THREE.MathUtils.clamp(fwd(s).y, -1, 1)) / DEG
  const y = s.pos.y
  if (pitch < -62) return 'overhead'
  if (y > eye + 0.7 || pitch < -20) return 'high angle'
  if (y < eye * 0.6 || (y < eye - 0.45 && pitch > 6)) return 'low angle'
  return 'eye level'
}

interface Analysis {
  moves: Move[]
  sig: string
  subject: Figure | null
  start: CamState
  end: CamState
  lin: number
  ang: number
}

function analyse(p: Project, t0: number, t1: number): Analysis {
  const keys = p.keys
  const n = 32
  const st: CamState[] = []
  for (let i = 0; i <= n; i++) st.push(evalCamera(keys, t0 + ((t1 - t0) * i) / n))
  const start = st[0]
  const end = st[n]
  const dt = Math.max(0.001, t1 - t0)
  const subject = subjectOf(p, st[n >> 1])
  const name = subject ? subject.label : ''

  let path = 0
  let arc = 0
  let pan = 0
  for (let i = 1; i <= n; i++) {
    path += st[i].pos.distanceTo(st[i - 1].pos)
    const fa = fwd(st[i - 1])
    const fb = fwd(st[i])
    pan += wrap(Math.atan2(fb.x, -fb.z) / DEG - Math.atan2(fa.x, -fa.z) / DEG)
    if (subject) {
      const ra = st[i - 1].pos.clone().sub(new THREE.Vector3(subject.x, 0, subject.z))
      const rb = st[i].pos.clone().sub(new THREE.Vector3(subject.x, 0, subject.z))
      if (Math.hypot(ra.x, ra.z) > 0.3 && Math.hypot(rb.x, rb.z) > 0.3)
        arc += wrap(Math.atan2(rb.x, rb.z) / DEG - Math.atan2(ra.x, ra.z) / DEG)
    }
  }
  const f0 = fwd(start)
  const f1 = fwd(end)
  const tilt = (Math.asin(THREE.MathUtils.clamp(f1.y, -1, 1)) - Math.asin(THREE.MathUtils.clamp(f0.y, -1, 1))) / DEG
  const disp = end.pos.clone().sub(start.pos)
  const fh = new THREE.Vector3(f0.x, 0, f0.z)
  if (fh.lengthSq() < 1e-6) fh.set(0, 0, -1)
  fh.normalize()
  const right = new THREE.Vector3().crossVectors(fh, new THREE.Vector3(0, 1, 0)).normalize()
  const lateral = disp.dot(right)
  const ahead = disp.dot(fh)
  const dy = disp.y

  const moves: Move[] = []
  const isArc = !!subject && Math.abs(arc) >= 20
  if (isArc) {
    const dir = arc > 0 ? 'right' : 'left'
    const deg = roundTo(Math.abs(arc), 15)
    moves.push({ key: 'arc-' + dir, base: `arc ${dir} ${deg} degrees around ${name}`, ger: `arcing ${dir} ${deg} degrees around ${name}` })
  }

  let dolly: 'in' | 'out' | null = null
  if (subject) {
    const d0 = start.pos.distanceTo(chest(subject))
    const d1 = end.pos.distanceTo(chest(subject))
    if (d1 < d0 * 0.87 && d0 - d1 > 0.3) dolly = 'in'
    else if (d1 > d0 * 1.15 && d1 - d0 > 0.3) dolly = 'out'
  } else if (Math.abs(ahead) > 0.5 && Math.abs(ahead) > Math.abs(lateral)) dolly = ahead > 0 ? 'in' : 'out'

  const zoomR = end.lens / start.lens
  const zoom: 'in' | 'out' | null = zoomR > 1.12 ? 'in' : zoomR < 0.89 ? 'out' : null
  const lensTxt = `${Math.round(start.lens)}mm to ${Math.round(end.lens)}mm`
  if (dolly && zoom && dolly !== zoom) {
    const how = dolly === 'out' ? 'dollying out while zooming in' : 'dollying in while zooming out'
    const on = name ? ` on ${name}` : ''
    moves.push({ key: 'vertigo', base: `dolly zoom${on} (vertigo effect), ${how} from ${lensTxt}`, ger: `dolly zooming (vertigo effect, ${dolly === 'out' ? 'out while zooming in' : 'in while zooming out'})` })
  } else {
    if (dolly) {
      const on = name && !isArc ? (dolly === 'in' ? ` on ${name}` : ` from ${name}`) : ''
      moves.push({ key: 'dolly-' + dolly, base: `dolly ${dolly}${on}`, ger: `dollying ${dolly}${on}` })
    }
    if (zoom) moves.push({ key: 'zoom-' + zoom, base: `zoom ${zoom} from ${lensTxt}`, ger: `zooming ${zoom} from ${lensTxt}` })
  }

  if (!isArc && Math.abs(lateral) > 0.5 && Math.abs(lateral) > Math.abs(ahead) * 0.6) {
    const dir = lateral > 0 ? 'right' : 'left'
    moves.push({ key: 'truck-' + dir, base: `truck ${dir}`, ger: `trucking ${dir}` })
  }
  if (Math.abs(dy) > 0.45) {
    const dir = dy > 0 ? 'up' : 'down'
    const h0 = heightClass(start, subject)
    const h1 = heightClass(end, subject)
    const to = h1 !== h0 ? ` to ${h1 === 'eye level' ? 'eye level' : art(h1) + ' ' + h1}` : ''
    moves.push({ key: 'crane-' + dir, base: `crane ${dir}${to}`, ger: `craning ${dir}${to}` })
  }
  if (!isArc && Math.abs(pan) > 12) {
    const dir = pan > 0 ? 'right' : 'left'
    const whip = Math.abs(pan) / dt > 220
    const deg = roundTo(Math.abs(pan), 15)
    moves.push(
      whip
        ? { key: 'whip-' + dir, base: `whip pan ${dir}`, ger: `whip panning ${dir}` }
        : { key: 'pan-' + dir, base: `pan ${dir} ${deg} degrees`, ger: `panning ${dir} ${deg} degrees` },
    )
  }
  if (Math.abs(tilt) > 12) {
    const dir = tilt > 0 ? 'up' : 'down'
    moves.push({ key: 'tilt-' + dir, base: `tilt ${dir}`, ger: `tilting ${dir}` })
  }
  const dr = end.roll - start.roll
  if (Math.abs(dr) > 4) {
    const r1 = Math.round(end.roll)
    const txt = Math.abs(r1) < 2 ? 'roll back to level' : `roll ${r1 > 0 ? 'clockwise' : 'counterclockwise'} into a ${Math.abs(r1)} degree dutch angle`
    const ger = Math.abs(r1) < 2 ? 'rolling back to level' : `rolling into a ${Math.abs(r1)} degree dutch angle`
    moves.push({ key: 'roll', base: txt, ger })
  }

  return {
    moves,
    sig: moves.map((m) => m.key).join('+') + '|' + (subject ? subject.id : ''),
    subject,
    start,
    end,
    lin: path / dt,
    ang: Math.max(Math.abs(arc), isArc ? 0 : Math.abs(pan) * 0.6) / dt,
  }
}

function speedWord(a: Analysis): string {
  if (!a.moves.length || a.moves[0].key.startsWith('whip')) return ''
  if (a.lin > 1.5 || a.ang > 70) return 'fast '
  if (a.lin < 0.45 && a.ang < 22) return 'slow '
  return 'steady '
}

function easeWords(first: Ease, last: Ease): string {
  const i = first === 'in' || first === 'inout'
  const o = last === 'out' || last === 'inout'
  return i && o ? ', easing in and out' : i ? ', easing in' : o ? ', easing out to a stop' : ''
}

function line(p: Project, t0: number, t1: number, firstEase: Ease, lastEase: Ease): string {
  const aspect = aspectRatio(p.shot.aspect)
  const a = analyse(p, t0, t1)
  const range = `${sec(t0)}-${sec(t1)}s`
  const subj = a.subject || nearestInFrame(p, a.end, aspect)
  const l0 = Math.round(a.start.lens)
  const l1 = Math.round(a.end.lens)
  const parts: string[] = []
  const zoomed = a.moves.some((m) => m.key.startsWith('zoom') || m.key === 'vertigo')
  parts.push(zoomed ? `${l0}mm to ${l1}mm` : `${l1}mm`)
  if (!a.moves.some((m) => m.key.startsWith('crane'))) {
    const h0 = heightClass(a.start, subj)
    const h1 = heightClass(a.end, subj)
    parts.push(h0 === h1 ? h1 : `${h0} to ${h1}`)
  }
  if (subj) {
    const s0 = shotSize(a.start, subj, aspect)
    const s1 = shotSize(a.end, subj, aspect)
    parts.push(s0 === s1 ? `holding ${art(s1)} ${s1} of ${subj.label}` : `from ${art(s0)} ${s0} to ${art(s1)} ${s1} of ${subj.label}`)
  }
  if (!a.moves.length) {
    const on = a.subject ? ` on ${a.subject.label}` : ''
    return `${range}: static locked-off shot${on}, ${parts.join(', ')}.`
  }
  const [m0, ...rest] = a.moves
  const gers = rest.map((m) => m.ger)
  const tail = gers.length ? ' while ' + (gers.length > 1 ? gers.slice(0, -1).join(', ') + ' and ' + gers[gers.length - 1] : gers[0]) : ''
  return `${range}: ${speedWord(a)}${m0.base}${tail}${easeWords(firstEase, lastEase)}, ${parts.join(', ')}.`
}

function nearestInFrame(p: Project, s: CamState, aspect: number): Figure | null {
  const cam = new THREE.PerspectiveCamera(vfov(s.lens, aspect), aspect, 0.05, 400)
  cam.position.copy(s.pos)
  cam.lookAt(s.target)
  cam.updateMatrixWorld()
  let best: Figure | null = null
  let bd = Infinity
  for (const f of p.figures) {
    const v = chest(f).project(cam)
    if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue
    const d = Math.hypot(v.x, v.y)
    if (d < bd) {
      bd = d
      best = f
    }
  }
  return best
}

function opening(p: Project): string {
  const aspect = aspectRatio(p.shot.aspect)
  const s = evalCamera(p.keys, 0)
  const cam = new THREE.PerspectiveCamera(vfov(s.lens, aspect), aspect, 0.05, 400)
  cam.position.copy(s.pos)
  cam.lookAt(s.target)
  cam.updateMatrixWorld()
  const out: string[] = []
  for (const f of [...p.figures].sort((a, b) => a.label.localeCompare(b.label))) {
    const v = chest(f).project(cam)
    let where: string
    if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.1) where = 'out of frame'
    else where = v.x < -0.33 ? 'frame left' : v.x > 0.33 ? 'frame right' : 'center frame'
    let txt = `${f.label} ${POSE_EN[f.pose]} ${where}`
    if (where !== 'out of frame') {
      const facing = new THREE.Vector3(Math.sin(f.rot * DEG), 0, Math.cos(f.rot * DEG))
      const toCam = new THREE.Vector3(s.pos.x - f.x, 0, s.pos.z - f.z).normalize()
      const ang = Math.acos(THREE.MathUtils.clamp(facing.dot(toCam), -1, 1)) / DEG
      txt += ang < 50 ? ', facing camera' : ang > 130 ? ', facing away' : ', in profile'
    }
    out.push(txt)
  }
  return out.length ? ` Opening frame: ${out.join('; ')}.` : ''
}

/** The English prompt for Seedance / MAGI-2, built from the keyframes. */
export function buildPrompt(p: Project): string {
  const keys = p.keys
  const dur = p.shot.duration
  const lines: string[] = [FIRST_LINE, '', `One continuous ${sec(dur)} second shot, ${p.shot.aspect}, no cuts.${opening(p)}`, '']

  // segments: before the first key, between keys (merged while the move stays the same), after the last key
  const spans: { t0: number; t1: number; ease: Ease }[] = []
  if (keys.length < 2) spans.push({ t0: 0, t1: dur, ease: 'linear' })
  else {
    if (keys[0].t > 0.05) spans.push({ t0: 0, t1: keys[0].t, ease: 'linear' })
    for (let i = 0; i < keys.length - 1; i++) if (keys[i + 1].t - keys[i].t > 0.01) spans.push({ t0: keys[i].t, t1: keys[i + 1].t, ease: keys[i].ease })
    const last = keys[keys.length - 1].t
    if (dur - last > 0.05) spans.push({ t0: last, t1: dur, ease: 'linear' })
  }
  const groups: { t0: number; t1: number; first: Ease; last: Ease; sig: string }[] = []
  for (const s of spans) {
    const sig = analyse(p, s.t0, s.t1).sig
    const g = groups[groups.length - 1]
    if (g && g.sig === sig) {
      g.t1 = s.t1
      g.last = s.ease
    } else groups.push({ t0: s.t0, t1: s.t1, first: s.ease, last: s.ease, sig })
  }
  for (const g of groups) lines.push(line(p, g.t0, g.t1, g.first, g.last))
  lines.push('', 'Keep the motion smooth and continuous, with no cuts and no extra camera moves.')
  return lines.join('\n').replace(/[–—]/g, '-')
}
