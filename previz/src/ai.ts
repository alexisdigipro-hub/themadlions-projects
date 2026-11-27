import type { Ease, Figure, Keyframe, Label, Pose, Project, Prop, PropKind, Vec3 } from './state'
import { LABELS } from './state'
import { aspectRatio, vfov } from './camera'
import { aimAt, figAt, POSE_HEIGHT } from './motion'
import { clamp, DEG, uid } from './util'
import { EXAMPLES, RULES } from './examples'

/** The scene from a written description: Claude answers with a small JSON, the code turns it into figures, paths and keyframes. */

const MODEL = 'claude-opus-5-5'
const KEY = 'tml_previz_claude_key'
export const getKey = (): string => {
  try {
    return localStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}
export const setKey = (k: string): void => {
  try {
    if (k) localStorage.setItem(KEY, k)
    else localStorage.removeItem(KEY)
  } catch {
    /* private mode */
  }
}

const SYSTEM = `You are a film director's previz assistant. From a scene description (usually in Greek) you design the blocking and the camera work (one continuous move, or several shots with cuts when asked), and answer with a single JSON object and nothing else: no prose, no markdown fences.

WORLD
- Metres. The floor is the XZ plane, Y is up. Keep everything within 8 m of the origin; put the main action near (0, 0).
- "facing" is a compass angle in degrees: 0 looks toward +Z, 90 toward +X, 180 toward -Z, -90 toward -X.
- Up to 4 figures, labels "A", "B", "C", "D" in order of importance. Give each a short "name" taken from the description when it has one.
- A figure that walks or runs gets "path": {"x", "z", "t0", "t1"} (seconds). It moves in a straight line from its x, z to the path point and faces the direction of travel. Walking is about 1.3 m/s, running about 4 m/s; choose distance and times to match. A figure with a path uses pose "walk" or "run".
- Props give the space and the parallax: "box" (0.6 m cube), "table" (1.4 x 0.8 m), "chair", "door" (a door frame 1.1 m wide), "wall" (4 m long, 2.6 m high, 15 cm thick, running along its local X axis; "rot" turns it), "sofa" (1.9 m wide, its back toward -Z), "bed" (1.6 x 2 m), "bar" (a counter 2.4 m long, 1.05 m high), "car" (4.3 m long along its local Z), "mic" (a microphone stand), "tree", "column". Use only what the scene needs, at most 10. Never put a wall between the camera and its subject.

CAMERA
- "camera" is a list of 2 to 14 keyframes sorted by "t". The first is at t = 0 and the last at t = duration. The camera flies a smooth curve through them.
- Each keyframe is placed relative to an anchor: "around" is a figure label, or a floor point [x, z].
- "azimuth" in degrees, measured from the anchor figure's facing at that time: 0 = directly in front of the figure, 90 = at the figure's left side, -90 = at its right side, 180 = directly behind it. For a floor-point anchor it is a compass angle.
- Distance is given by "size", how much of the anchor figure the lens shows: "extreme_wide", "wide", "full", "medium_wide", "medium", "medium_close", "close", "extreme_close". For a floor-point anchor give "distance" in metres instead.
- "height": camera height in metres (1.5 is eye level, 0.4 is low, 3+ is high, 6+ with size "wide" and "look" at the figure is overhead).
- "look": a figure label (the camera stays locked on that figure, even while it walks) or a point [x, y, z]. Default: the anchor.
- "lens": one of 14, 18, 24, 35, 50, 85, 135 (full frame). "ease": "linear", "in", "out" or "inout", for the stretch up to the next keyframe. "roll": degrees, usually 0.
- Cuts: when the description asks for cuts, a montage, a shot list or several shots, add "cut": true to the first keyframe of every shot after the first. The camera jumps to it instead of travelling. A shot is then one keyframe (a static shot, held until the next cut) or two (a move: the second one a frame before the next cut). Change size AND angle between consecutive shots (at least 30 degrees of azimuth), keep the camera on one side of the line between two people talking, and give each shot at least 1.5 seconds. Without such a request, make one continuous shot.
- Recipes. Orbit: keyframes every 45 degrees of azimuth round the same figure, same size. Dolly in or out: same azimuth, size changes. Crane: height changes. Tracking: same azimuth and size at the walker's start and end times, look = the walker. Follow: azimuth 180 on the walker. Leading: azimuth 0 on the walker. Over the shoulder of A onto B: around "A", azimuth 150 or -150, "distance" 1.3, height 1.6, look "B", lens 50. Whip pan: two keyframes 0.4 s apart at the same place with different "look". Dolly zoom: lens 85 to 24 while size stays the same.
- Hold a framing by repeating a keyframe. Give the move a clear start, development and end; do not add moves the description does not ask for.

ANSWER (JSON only)
{"duration": 4 to 30, "handheld": 0 to 100, "figures": [{"label": "A", "name": "", "x": 0, "z": 0, "facing": 0, "pose": "stand|sit|walk|run|kneel", "height": 1.5 to 2.0, "path": null}], "props": [{"kind": "wall", "x": 0, "z": -4, "rot": 0}], "camera": [{"t": 0, "around": "A", "azimuth": 0, "size": "full", "height": 1.5, "look": "A", "lens": 35, "ease": "inout", "roll": 0, "cut": false}], "notes": "one or two sentences in Greek, friendly, saying what you set up and any choice you made that the description left open"}`

/** The director's own rules and approved scenes, added to every request. */
function learned(): string {
  let out = ''
  if (RULES.length) out += `\n\nTHE DIRECTOR'S STANDING PREFERENCES (follow them unless the description says otherwise)\n${RULES.map((r) => `- ${r}`).join('\n')}`
  if (EXAMPLES.length)
    out += `\n\nSCENES THIS DIRECTOR APPROVED (match their taste in distances, lenses and timing; do not copy them when the description differs)\n${EXAMPLES.map((e) => `Description: ${e.text}\nAnswer: ${JSON.stringify(e.scene)}`).join('\n\n')}`
  return out
}

const SIZE: Record<string, number> = { extreme_wide: 4.2, wide: 2.3, full: 1.35, medium_wide: 0.9, medium: 0.58, medium_close: 0.36, close: 0.21, extreme_close: 0.11 }
const POSES: Pose[] = ['stand', 'sit', 'walk', 'run', 'kneel']
const KINDS: PropKind[] = ['box', 'table', 'chair', 'door', 'wall', 'sofa', 'bed', 'bar', 'car', 'mic', 'tree', 'column']
const EASES: Ease[] = ['linear', 'in', 'out', 'inout']
const LENSES = [14, 18, 24, 35, 50, 85, 135]

const num = (v: unknown, d: number) => (typeof v === 'number' && isFinite(v) ? v : d)
const r2 = (v: number) => +v.toFixed(2)

type Raw = Record<string, unknown>

/** Turns Claude's answer into a project, clamping whatever is out of range. */
export function toProject(raw: Raw, cur: Project): Project {
  const dur = Math.round(clamp(num(raw.duration, cur.shot.duration), 4, 30) * 2) / 2
  const figures: Figure[] = []
  for (const g of (Array.isArray(raw.figures) ? raw.figures : []).slice(0, 4) as Raw[]) {
    const label = LABELS[figures.length]
    const pose = POSES.includes(g.pose as Pose) ? (g.pose as Pose) : 'stand'
    const f: Figure = {
      id: uid(), label, name: typeof g.name === 'string' ? g.name.slice(0, 24) : '',
      x: r2(clamp(num(g.x, 0), -15, 15)), z: r2(clamp(num(g.z, 0), -15, 15)),
      rot: Math.round(num(g.facing, 0)), height: r2(clamp(num(g.height, 1.75), 1.5, 2)), pose,
    }
    const pa = g.path as Raw | null
    if (pa && typeof pa === 'object') {
      const t0 = clamp(num(pa.t0, 0), 0, dur - 0.25)
      f.path = { x: r2(clamp(num(pa.x, f.x), -15, 15)), z: r2(clamp(num(pa.z, f.z), -15, 15)), t0, t1: clamp(num(pa.t1, dur), t0 + 0.25, dur) }
      if (pose !== 'run') f.pose = 'walk'
    }
    figures.push(f)
  }
  // the labels Claude used, in case it skipped or reordered them
  const byLabel = new Map<string, Figure>()
  ;((Array.isArray(raw.figures) ? raw.figures : []) as Raw[]).slice(0, 4).forEach((g, i) => byLabel.set(String(g.label || LABELS[i]), figures[i]))
  const fig = (v: unknown) => (typeof v === 'string' ? byLabel.get(v) || null : null)

  const props: Prop[] = ((Array.isArray(raw.props) ? raw.props : []) as Raw[])
    .filter((p) => KINDS.includes(p.kind as PropKind))
    .slice(0, 12)
    .map((p) => ({ id: uid(), kind: p.kind as PropKind, x: r2(clamp(num(p.x, 0), -18, 18)), z: r2(clamp(num(p.z, 0), -18, 18)), rot: Math.round(num(p.rot, 0)) }))

  const a = aspectRatio(cur.shot.aspect)
  const keys: Keyframe[] = []
  for (const c of (Array.isArray(raw.camera) ? raw.camera : []).slice(0, 16) as Raw[]) {
    const t = Math.round(clamp(num(c.t, 0), 0, dur) * cur.shot.fps) / cur.shot.fps
    const lens = LENSES.reduce((b, l) => (Math.abs(l - num(c.lens, 35)) < Math.abs(b - num(c.lens, 35)) ? l : b), 35)
    const anchor = fig(c.around) || (Array.isArray(c.around) ? null : figures[0] || null)
    let ax = 0
    let az = 0
    let face = 0
    let h = 1.75
    if (anchor) {
      const st = figAt(anchor, t)
      ax = st.x
      az = st.z
      face = st.rot
      h = anchor.height * POSE_HEIGHT[st.pose]
    } else if (Array.isArray(c.around)) {
      ax = num(c.around[0], 0)
      az = num(c.around[1], 0)
    }
    const k = SIZE[String(c.size)] || 0
    const dist = clamp(typeof c.distance === 'number' ? c.distance : k ? (k * h) / (2 * Math.tan((vfov(lens, a) * DEG) / 2)) : 4, 0.4, 40)
    const ang = (face + num(c.azimuth, 0)) * DEG
    const y = clamp(num(c.height, h * 0.85), 0.1, 30)

    // from high above, pull the camera in over the figure so "overhead" really looks down
    const flat = y > 5 && !c.distance ? Math.min(dist, 0.6) : dist
    const pos: Vec3 = [r2(ax + Math.sin(ang) * flat), r2(y), r2(az + Math.cos(ang) * flat)]
    const lookFig = fig(c.look) || (c.look === undefined || c.look === null ? anchor : null)
    const target: Vec3 = lookFig
      ? (aimAt(lookFig, t).toArray().map(r2) as Vec3)
      : Array.isArray(c.look)
        ? [num(c.look[0], ax), num(c.look[1], 1.2), num(c.look[2], az)]
        : [r2(ax), 1.2, r2(az)]
    keys.push({
      id: uid(), t, pos, target, roll: clamp(num(c.roll, 0), -45, 45), lens,
      ease: EASES.includes(c.ease as Ease) ? (c.ease as Ease) : 'linear',
      look: lookFig ? (lookFig.label as Label) : null,
      cut: c.cut === true,
    })
  }
  keys.sort((x, y) => x.t - y.t)
  if (!figures.length || keys.length < 1) throw new Error('Η απάντηση δεν είχε φιγούρες ή κάμερα. Δοκίμασε να το περιγράψεις λίγο πιο αναλυτικά.')
  return { v: 1, figures, props, keys, shot: { ...cur.shot, duration: dur, lens: keys[0].lens, shake: Math.round(clamp(num(raw.handheld, 0), 0, 100) / 5) * 5 } }
}

function parseJson(text: string): Raw {
  const a = text.indexOf('{')
  const b = text.lastIndexOf('}')
  if (a < 0 || b <= a) throw new Error('Το Claude δεν απάντησε με σκηνή. Δοκίμασε ξανά.')
  return JSON.parse(text.slice(a, b + 1)) as Raw
}

async function call(key: string, text: string, cur: Project, withFallback: boolean): Promise<Response> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  }
  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM + learned(),
    messages: [{ role: 'user', content: `Frame: ${cur.shot.aspect}. Scene description:\n${text}` }],
  }
  // if the model declines, the API hands the same request to a fallback model inside this call
  if (withFallback) {
    headers['anthropic-beta'] = 'server-side-fallback-2026-07-01'
    body.fallbacks = 'default'
  }
  return fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body) })
}

export async function sceneFromText(key: string, text: string, cur: Project): Promise<{ project: Project; notes: string }> {
  let res: Response
  try {
    res = await call(key, text, cur, true)
    // an account without the fallback beta answers 400: ask again plainly
    if (res.status === 400) res = await call(key, text, cur, false)
  } catch {
    throw new Error('Δεν υπάρχει σύνδεση με το Claude. Έλεγξε το internet και δοκίμασε ξανά.')
  }
  if (!res.ok) {
    let detail = ''
    try {
      detail = ((await res.json()) as { error?: { message?: string } })?.error?.message || ''
    } catch {
      /* no body */
    }
    if (res.status === 401) throw new Error('Το κλειδί δεν είναι σωστό. Έλεγξέ το και δοκίμασε ξανά.')
    if (res.status === 429) throw new Error('Πολλά αιτήματα ή τελείωσε το υπόλοιπο του κλειδιού. Δοκίμασε σε λίγο.')
    if (res.status >= 500) throw new Error('Το Claude είναι φορτωμένο αυτή τη στιγμή. Δοκίμασε ξανά σε λίγο.')
    throw new Error(`Claude ${res.status}${detail ? `: ${detail}` : ''}`)
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[]; stop_reason?: string }
  if (data.stop_reason === 'refusal') throw new Error('Το Claude αρνήθηκε αυτή την περιγραφή. Δοκίμασε να τη γράψεις αλλιώς.')
  const out = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text || '').join('')
  const raw = parseJson(out)
  return { project: toProject(raw, cur), notes: typeof raw.notes === 'string' ? raw.notes : '' }
}
