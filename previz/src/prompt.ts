import * as THREE from 'three'
import type { Ease, Figure, Pose, Project } from './state'
import { aspectRatio, camAt, vfov, type CamState } from './camera'
import { figAt, pathLength, POSE_HEIGHT } from './motion'
import { DEG, sec } from './util'

const FIRST_LINE =
  'Follow the camera movement of @Video1 exactly; use it for camera motion and blocking only, ignore its look, materials and lighting.'

const POSE_EN: Record<Pose, string> = { stand: 'standing', sit: 'sitting', walk: 'walking', run: 'running', kneel: 'kneeling' }

interface Move { key: string; base: string; ger: string }

const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180
const art = (w: string) => (/^[aeiou]/i.test(w) ? 'an' : 'a')
const roundTo = (v: number, step: number) => Math.max(step, Math.round(v / step) * step)
const metres = (v: number) => {
  const r = Math.max(0.5, Math.round(v * 2) / 2)
  return `${Number.isInteger(r) ? r : r.toFixed(1)} m`
}
const list = (a: string[]) => (a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0] || '')

function fwd(s: CamState): THREE.Vector3 {
  return s.target.clone().sub(s.pos).normalize()
}
function height(f: Figure, t: number): number {
  return f.height * POSE_HEIGHT[figAt(f, t).pose]
}
function chest(f: Figure, t: number): THREE.Vector3 {
  const s = figAt(f, t)
  return new THREE.Vector3(s.x, height(f, t) * 0.6, s.z)
}
function camera(s: CamState, aspect: number): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(vfov(s.lens, aspect), aspect, 0.05, 400)
  cam.position.copy(s.pos)
  if (Math.abs(fwd(s).y) > 0.999) cam.up.set(0, 0, -1)
  cam.lookAt(s.target)
  cam.updateMatrixWorld()
  return cam
}

/** The figure the camera is about: the one nearest to where it looks. */
function subjectOf(p: Project, s: CamState, t: number): Figure | null {
  let best: Figure | null = null
  let bd = 1.5
  for (const f of p.figures) {
    const st = figAt(f, t)
    const d = Math.hypot(s.target.x - st.x, s.target.z - st.z)
    if (d < bd) {
      bd = d
      best = f
    }
  }
  return best
}

export function shotSize(s: CamState, f: Figure, t: number, aspect: number): string {
  const h = height(f, t)
  const d = s.pos.distanceTo(chest(f, t))
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

export function heightClass(s: CamState, f: Figure | null, t: number): string {
  const eye = f ? height(f, t) * 0.93 : 1.6
  const pitch = Math.asin(THREE.MathUtils.clamp(fwd(s).y, -1, 1)) / DEG
  const y = s.pos.y
  if (pitch < -62) return 'overhead'
  if (y > eye + 0.7 || pitch < -20) return 'high angle'
  if (y < eye * 0.6 || (y < eye - 0.45 && pitch > 6)) return 'low angle'
  return 'eye level'
}

/** Which side of the figure the camera sees. */
function viewOf(s: CamState, f: Figure, t: number): string {
  const st = figAt(f, t)
  const facing = new THREE.Vector3(Math.sin(st.rot * DEG), 0, Math.cos(st.rot * DEG))
  const to = new THREE.Vector3(s.pos.x - st.x, 0, s.pos.z - st.z)
  if (to.lengthSq() < 0.04) return 'top view'
  to.normalize()
  const ang = Math.acos(THREE.MathUtils.clamp(facing.dot(to), -1, 1)) / DEG
  // the figure's own left is +X when it faces +Z
  const left = new THREE.Vector3(facing.z, 0, -facing.x).dot(to) > 0
  const side = left ? 'left' : 'right'
  if (ang < 25) return 'front view'
  if (ang < 70) return `three-quarter front view from the ${side}`
  if (ang < 110) return `${side} profile`
  if (ang < 155) return `three-quarter back view from the ${side}`
  return 'back view'
}

interface Analysis {
  moves: Move[]
  sig: string
  subject: Figure | null
  start: CamState
  end: CamState
  lin: number
  ang: number
  path: number
}

function analyse(p: Project, t0: number, t1: number): Analysis {
  const n = 32
  const st: CamState[] = []
  const tt: number[] = []
  for (let i = 0; i <= n; i++) {
    tt.push(t0 + ((t1 - t0) * i) / n)
    st.push(camAt(p, tt[i]))
  }
  const start = st[0]
  const end = st[n]
  const dt = Math.max(0.001, t1 - t0)
  const subject = subjectOf(p, st[n >> 1], tt[n >> 1])
  const name = subject ? subject.label : ''
  const sp = (i: number) => {
    const s = figAt(subject as Figure, tt[i])
    return new THREE.Vector3(s.x, 0, s.z)
  }

  let path = 0
  let arc = 0
  let pan = 0
  for (let i = 1; i <= n; i++) {
    path += st[i].pos.distanceTo(st[i - 1].pos)
    const fa = fwd(st[i - 1])
    const fb = fwd(st[i])
    if (Math.hypot(fa.x, fa.z) > 0.05 && Math.hypot(fb.x, fb.z) > 0.05) pan += wrap(Math.atan2(fb.x, -fb.z) / DEG - Math.atan2(fa.x, -fa.z) / DEG)
    if (subject) {
      const ra = st[i - 1].pos.clone().sub(sp(i - 1))
      const rb = st[i].pos.clone().sub(sp(i))
      if (Math.hypot(ra.x, ra.z) > 0.3 && Math.hypot(rb.x, rb.z) > 0.3) arc += wrap(Math.atan2(rb.x, rb.z) / DEG - Math.atan2(ra.x, ra.z) / DEG)
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

  // the camera travelling with a figure that walks or runs
  let tracking = false
  let subjMoves = false
  if (subject) {
    const sd = sp(n).sub(sp(0))
    subjMoves = sd.length() > 0.8
    const cd = new THREE.Vector3(disp.x, 0, disp.z)
    if (subjMoves && cd.clone().sub(sd).length() < 0.4 * sd.length() + 0.3) {
      tracking = true
      const rel = st[n >> 1].pos.clone().sub(sp(n >> 1)).setY(0).normalize()
      const along = rel.dot(sd.clone().normalize())
      const verb = figAt(subject, tt[n >> 1]).pose === 'run' ? 'runs' : 'walks'
      if (along > 0.6) moves.push({ key: 'lead', base: `leading shot, camera moving backward ahead of ${name} as ${name} ${verb} toward it`, ger: `leading ${name}` })
      else if (along < -0.6) moves.push({ key: 'follow', base: `follow shot, camera moving behind ${name} as ${name} ${verb} away`, ger: `following ${name} from behind` })
      else {
        const side = new THREE.Vector3(sd.z, 0, -sd.x).dot(rel) > 0 ? 'left' : 'right'
        moves.push({ key: 'track-' + side, base: `tracking shot alongside ${name}, camera on ${name}'s ${side} side moving parallel as ${name} ${verb}`, ger: `tracking alongside ${name}` })
      }
    }
  }

  // an arc keeps pointing at the figure, so the view turns with it; a truck slides past without turning
  const isArc = !!subject && Math.abs(arc) >= 20 && (subjMoves || Math.abs(pan) >= 0.5 * Math.abs(arc))
  if (isArc) {
    const dir = arc > 0 ? 'right' : 'left'
    const deg = roundTo(Math.abs(arc), 15)
    moves.push({ key: 'arc-' + dir, base: `arc ${dir} ${deg} degrees around ${name}`, ger: `arcing ${dir} ${deg} degrees around ${name}` })
  }

  let dolly: 'in' | 'out' | null = null
  let dollyBy = 0
  if (subject) {
    const d0 = start.pos.distanceTo(chest(subject, t0))
    const d1 = end.pos.distanceTo(chest(subject, t1))
    dollyBy = Math.abs(d1 - d0)
    if (d1 < d0 * 0.87 && d0 - d1 > 0.3) dolly = 'in'
    else if (d1 > d0 * 1.15 && d1 - d0 > 0.3) dolly = 'out'
    // a figure walking to or from a camera that stays put is not a dolly
    if (dolly && path < 0.3) dolly = null
  } else if (Math.abs(ahead) > 0.5 && Math.abs(ahead) > Math.abs(lateral)) {
    dolly = ahead > 0 ? 'in' : 'out'
    dollyBy = Math.abs(ahead)
  }

  const zoomR = end.lens / start.lens
  const zoom: 'in' | 'out' | null = zoomR > 1.12 ? 'in' : zoomR < 0.89 ? 'out' : null
  const lensTxt = `${Math.round(start.lens)}mm to ${Math.round(end.lens)}mm`
  if (dolly && zoom && dolly !== zoom) {
    const how = dolly === 'out' ? 'camera dollies out while the lens zooms in' : 'camera dollies in while the lens zooms out'
    const on = name ? ` on ${name}` : ''
    moves.push({
      key: 'vertigo',
      base: `dolly zoom${on} (vertigo effect), ${how} from ${lensTxt}, the subject stays the same size while the background ${dolly === 'in' ? 'stretches away' : 'compresses'}`,
      ger: `dolly zooming (vertigo effect, ${dolly === 'out' ? 'out while zooming in' : 'in while zooming out'})`,
    })
  } else {
    if (dolly) {
      const on = name && !isArc ? (dolly === 'in' ? ` on ${name}` : ` from ${name}`) : ''
      const by = dollyBy > 0.7 ? ` about ${metres(dollyBy)}` : ''
      moves.push({ key: 'dolly-' + dolly, base: `dolly ${dolly}${on}${by}`, ger: `dollying ${dolly}${by}` })
    }
    if (zoom) moves.push({ key: 'zoom-' + zoom, base: `zoom ${zoom} from ${lensTxt}`, ger: `zooming ${zoom} from ${lensTxt}` })
  }

  if (!isArc && !tracking && Math.abs(lateral) > 0.5 && Math.abs(lateral) > Math.abs(ahead) * 0.6) {
    const dir = lateral > 0 ? 'right' : 'left'
    moves.push({ key: 'truck-' + dir, base: `truck ${dir} about ${metres(Math.abs(lateral))}`, ger: `trucking ${dir} about ${metres(Math.abs(lateral))}` })
  }
  if (Math.abs(dy) > 0.45) {
    const dir = dy > 0 ? 'up' : 'down'
    const h0 = heightClass(start, subject, t0)
    const h1 = heightClass(end, subject, t1)
    const to = h1 !== h0 ? `, reaching ${h1 === 'eye level' ? 'eye level' : art(h1) + ' ' + h1}` : ''
    const span = ` from about ${metres(start.pos.y)} to ${metres(end.pos.y)} high`
    moves.push({ key: 'crane-' + dir, base: `crane ${dir}${span}${to}`, ger: `craning ${dir}${span}${to}` })
  }
  if (!isArc && !tracking && Math.abs(pan) > 12) {
    const dir = pan > 0 ? 'right' : 'left'
    const whip = Math.abs(pan) / dt > 110
    const deg = roundTo(Math.abs(pan), 15)
    const who = subjMoves && path < 0.5 ? ` following ${name}` : ''
    moves.push(
      whip
        ? { key: 'whip-' + dir, base: `whip pan ${dir} ${deg} degrees with motion blur${name ? `, landing on ${name}` : ''}`, ger: `whip panning ${dir}` }
        : { key: 'pan-' + dir, base: `pan ${dir} ${deg} degrees${who}`, ger: `panning ${dir} ${deg} degrees${who}` },
    )
  }
  if (Math.abs(tilt) > 12 && !moves.some((m) => m.key.startsWith('whip'))) {
    const dir = tilt > 0 ? 'up' : 'down'
    const deg = roundTo(Math.abs(tilt), 5)
    moves.push({ key: 'tilt-' + dir, base: `tilt ${dir} ${deg} degrees`, ger: `tilting ${dir} ${deg} degrees` })
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
    path,
  }
}

function speedWord(a: Analysis): string {
  if (!a.moves.length || a.moves[0].key.startsWith('whip')) return ''
  if (a.moves[0].key.startsWith('arc')) return a.ang > 70 ? 'fast ' : a.ang < 20 ? 'slow ' : 'steady '
  if (a.lin > 1.5 || a.ang > 70) return 'fast '
  if (a.lin < 0.45 && a.ang < 22) return 'slow '
  return 'steady '
}

function easeWords(first: Ease, last: Ease): string {
  const i = first === 'in' || first === 'inout'
  const o = last === 'out' || last === 'inout'
  return i && o ? ', easing in and out' : i ? ', easing in from a standstill' : o ? ', easing out to a stop' : ', at constant speed'
}

function line(p: Project, t0: number, t1: number, firstEase: Ease, lastEase: Ease): string {
  const aspect = aspectRatio(p.shot.aspect)
  const a = analyse(p, t0, t1)
  const range = `${sec(t0)}-${sec(t1)}s`
  const subj = a.subject || nearestInFrame(p, a.end, t1, aspect)
  const l0 = Math.round(a.start.lens)
  const l1 = Math.round(a.end.lens)
  const parts: string[] = []
  const zoomed = a.moves.some((m) => m.key.startsWith('zoom') || m.key === 'vertigo')
  parts.push(zoomed ? `${l0}mm to ${l1}mm` : `${l1}mm`)
  if (!a.moves.some((m) => m.key.startsWith('crane'))) {
    const h0 = heightClass(a.start, subj, t0)
    const h1 = heightClass(a.end, subj, t1)
    const y = `camera about ${metres(a.end.pos.y)} high`
    parts.push(h0 === h1 ? `${h1} (${y})` : `${h0} to ${h1}`)
  } else {
    const h1 = heightClass(a.end, subj, t1)
    if (heightClass(a.start, subj, t0) === h1) parts.push(h1 === 'overhead' ? 'overhead top-down view throughout' : `${h1} throughout`)
  }
  if (subj) {
    const s0 = shotSize(a.start, subj, t0, aspect)
    const s1 = shotSize(a.end, subj, t1, aspect)
    parts.push(s0 === s1 ? `holding ${art(s1)} ${s1} of ${subj.label}` : `from ${art(s0)} ${s0} to ${art(s1)} ${s1} of ${subj.label}`)
    const v0 = viewOf(a.start, subj, t0)
    const v1 = viewOf(a.end, subj, t1)
    parts.push(v0 === v1 ? `seeing ${subj.label} in ${v1}` : `going from ${subj.label}'s ${v0} to ${v1}`)
  }
  if (!a.moves.length) {
    const on = a.subject ? ` on ${a.subject.label}` : ''
    return `${range}: static locked-off shot${on}, ${parts.join(', ')}.`
  }
  const [m0, ...rest] = a.moves
  const tail = rest.length ? ' while ' + list(rest.map((m) => m.ger)) : ''
  return `${range}: ${speedWord(a)}${m0.base}${tail}${easeWords(firstEase, lastEase)}, ${parts.join(', ')}.`
}

function nearestInFrame(p: Project, s: CamState, t: number, aspect: number): Figure | null {
  const cam = camera(s, aspect)
  let best: Figure | null = null
  let bd = Infinity
  for (const f of p.figures) {
    const v = chest(f, t).project(cam)
    if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue
    const d = Math.hypot(v.x, v.y)
    if (d < bd) {
      bd = d
      best = f
    }
  }
  return best
}

/** Where a figure sits in the frame at time t. */
function place(p: Project, f: Figure, t: number): string {
  const aspect = aspectRatio(p.shot.aspect)
  const s = camAt(p, t)
  const cam = camera(s, aspect)
  const st = figAt(f, t)
  const v = new THREE.Vector3(st.x, height(f, t) * 0.85, st.z).project(cam)
  if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.3) return 'out of frame'
  const side = v.x < -0.33 ? 'frame left' : v.x > 0.33 ? 'frame right' : 'center frame'
  const d = s.pos.distanceTo(chest(f, t))
  const others = p.figures.filter((o) => o !== f).map((o) => s.pos.distanceTo(chest(o, t)))
  const depth = others.length ? (others.every((o) => d < o - 0.6) ? ' in the foreground' : others.every((o) => d > o + 0.6) ? ' in the background' : '') : ''
  return side + depth
}
function facingOf(p: Project, f: Figure, t: number): string {
  const v = viewOf(camAt(p, t), f, t)
  return v === 'front view' ? 'facing camera' : v === 'back view' ? 'back to camera' : v.includes('profile') ? 'in profile' : v.includes('front') ? 'turned three-quarters to camera' : 'turned three-quarters away from camera'
}

/** One line per figure: where it starts, what it does, where it ends. */
function blocking(p: Project): string[] {
  const dur = p.shot.duration
  const out: string[] = []
  for (const f of [...p.figures].sort((a, b) => a.label.localeCompare(b.label))) {
    const who = f.name ? `${f.label} (${f.name})` : f.label
    const len = pathLength(f)
    const at0 = place(p, f, 0)
    if (!f.path || len < 0.3) {
      const face = at0 === 'out of frame' ? '' : `, ${facingOf(p, f, 0)}`
      out.push(`${who}: ${POSE_EN[f.pose]} ${at0}${face}, stays in place for the whole shot.`)
      continue
    }
    const { t0, t1 } = f.path
    const run = f.pose === 'run'
    const speed = len / Math.max(0.1, t1 - t0)
    const pace = run ? (speed > 4.5 ? 'sprints' : 'runs') : speed > 1.9 ? 'walks briskly' : speed < 0.7 ? 'walks slowly' : 'walks'
    // direction as the camera sees it halfway through the move
    const tm = (t0 + t1) / 2
    const s = camAt(p, tm)
    const fh = fwd(s).setY(0)
    if (fh.lengthSq() < 1e-6) fh.set(0, 0, -1)
    fh.normalize()
    const right = new THREE.Vector3().crossVectors(fh, new THREE.Vector3(0, 1, 0))
    const d = new THREE.Vector3(f.path.x - f.x, 0, f.path.z - f.z)
    const dx = d.dot(right)
    const dz = d.dot(fh)
    const across = dx > 0 ? 'left to right' : 'right to left'
    const depth = dz < 0 ? 'toward camera' : 'away from camera'
    const dir = Math.abs(dx) > Math.abs(dz) * 1.6 ? `across the frame from ${across}` : Math.abs(dz) > Math.abs(dx) * 1.6 ? depth : `diagonally ${depth}, moving ${across}`
    const before = t0 > 0.2 ? `stands ${at0} until ${sec(t0)}s, then ` : `starts ${at0} and `
    let end = t1 < dur - 0.2 ? `, stops at ${sec(t1)}s ${place(p, f, t1)}` : `, ending ${place(p, f, dur)}`
    const near = p.figures.find((o) => o !== f && Math.hypot(figAt(o, t1).x - f.path!.x, figAt(o, t1).z - f.path!.z) < 1.3)
    if (near) end += `, next to ${near.label}`
    out.push(`${who}: ${before}${pace} about ${metres(len)} ${dir} from ${sec(t0)}s to ${sec(t1)}s${end}.`)
  }
  return out
}

function handheld(n: number): string {
  if (n <= 0) return ' Stabilized camera, no shake.'
  if (n < 34) return ' Subtle handheld camera with a slight natural shake.'
  if (n < 67) return ' Handheld camera with a natural, breathing shake.'
  return ' Rough handheld camera with strong, nervous shake.'
}

/** The English prompt for Seedance / MAGI-2, built from the keyframes and the figures' paths. */
export function buildPrompt(p: Project): string {
  const keys = p.keys
  const dur = p.shot.duration
  const lines: string[] = [FIRST_LINE, '', `One continuous ${sec(dur)} second shot, ${p.shot.aspect}, no cuts.${handheld(p.shot.shake)}`]
  const bl = blocking(p)
  if (bl.length) lines.push('', 'Blocking:', ...bl)
  lines.push('', 'Camera:')

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
