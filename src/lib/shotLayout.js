import { uid } from './store.jsx'

/* How a shot list is laid out, the same idea as the call sheet's Customise: which columns, in
   what order, under what name, on screen, on paper and on the share link; the pick lists for
   size, angle, movement, gear and lens; default setup and shoot minutes; a few looks.
   One per project (project.shotLayout), company default in settings.shotLayout. */

export const SHOT_SIZES = ['EWS', 'WS', 'FS', 'MWS', 'MS', 'MCU', 'CU', 'ECU', 'Insert', 'OTS', 'POV', 'Two shot', 'Establishing']
export const ANGLES = ['Eye level', 'Low', 'High', 'Dutch', 'Overhead', 'Worm', 'Profile', 'Frontal', 'Three-quarter']
export const MOVEMENTS = ['Static', 'Pan', 'Tilt', 'Push in', 'Pull out', 'Dolly', 'Track', 'Steadicam', 'Handheld', 'Crane', 'Drone', 'Zoom', 'Whip pan', 'Rack focus']
export const GEAR = ['Tripod', 'Slider', 'Dolly', 'Steadicam', 'Gimbal', 'Handheld', 'Crane', 'Jib', 'Drone', 'Car mount', 'Underwater', 'Probe lens']

// [key, name, on screen, on paper, on the link]
export const COLUMNS = [
  ['number', 'Shot', 1, 1, 1],
  ['frame', 'Frame', 0, 0, 0],
  ['size', 'Size', 1, 1, 1],
  ['angle', 'Angle', 1, 1, 1],
  ['movement', 'Move', 1, 1, 1],
  ['gear', 'Gear', 1, 1, 1],
  ['lens', 'Lens', 1, 1, 1],
  ['camera', 'Cam', 0, 0, 0],
  ['fps', 'FPS', 0, 0, 0],
  ['subject', 'Subject', 0, 0, 0],
  ['description', 'Description', 1, 1, 1],
  ['audio', 'Audio', 0, 0, 0],
  ['setup', 'Setup', 0, 0, 0],
  ['shoot', 'Shoot', 0, 0, 0],
  ['duration', 'Dur.', 1, 1, 0],
  ['notes', 'Notes', 0, 0, 0],
  ['status', 'Status', 1, 0, 1],
]

export const LISTS = [
  ['size', 'Sizes', SHOT_SIZES],
  ['angle', 'Angles', ANGLES],
  ['movement', 'Movements', MOVEMENTS],
  ['gear', 'Gear', GEAR],
  ['lens', 'Lenses (mm)', []],
]

export const LOOK_DEFAULTS = { colour: '', custom: '#c8503f', printSize: 'normal', linkTheme: 'light', linkSize: 'normal' }
export const TIMING_DEFAULTS = { setup: 10, shoot: 10 }

export function normalizeShotLayout(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const known = new Map(COLUMNS.map((c) => [c[0], c]))
  const seen = new Set()
  const columns = []
  for (const c of Array.isArray(src.columns) ? src.columns : []) {
    if (!c || !c.key || seen.has(c.key)) continue
    const def = known.get(c.key)
    if (!def && !c.custom) continue
    seen.add(c.key)
    columns.push({
      key: c.key,
      title: c.title || '',
      screen: c.screen !== undefined ? !!c.screen : def ? !!def[2] : true,
      print: c.print !== undefined ? !!c.print : def ? !!def[3] : true,
      link: c.link !== undefined ? !!c.link : def ? !!def[4] : true,
      ...(c.custom ? { custom: true } : {}),
    })
  }
  // columns added to the app later land at the end of a saved layout, switched as by default
  for (const [key, , screen, print, link] of COLUMNS) if (!seen.has(key)) columns.push({ key, title: '', screen: !!screen, print: !!print, link: !!link })
  const lists = {}
  for (const [k, , def] of LISTS) {
    const v = src.lists?.[k]
    lists[k] = Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [...def]
  }
  return {
    columns,
    lists,
    look: { ...LOOK_DEFAULTS, ...(src.look || {}) },
    timing: { ...TIMING_DEFAULTS, ...(src.timing || {}) },
  }
}

export const shotLayoutOf = (project, state) => normalizeShotLayout(project.shotLayout || state.settings?.shotLayout)

export const colTitle = (c) => c.title || (c.custom ? 'Untitled' : COLUMNS.find(([k]) => k === c.key)?.[1] || c.key)
export const newCustomColumn = () => ({ key: `f_${uid()}`, title: 'New column', screen: true, print: true, link: true, custom: true })
export const accentOf = (layout, project) => (layout.look.colour === 'project' ? project.color || '' : layout.look.colour === 'custom' ? layout.look.custom : '')

/* A pick list with the shot's own value kept in it, so a value typed before the list changed
   never disappears from the select. */
export const optionsWith = (list, value) => (value && !list.includes(value) ? [value, ...list] : list)

/* Minutes a shot takes on the day: its own setup and shoot minutes, else the defaults. */
export const shotMinutes = (shot, layout) => {
  const n = (v, d) => (v === '' || v == null || Number.isNaN(Number(v)) ? d : Number(v))
  return n(shot.setupMin, Number(layout.timing.setup) || 0) + n(shot.shootMin, Number(layout.timing.shoot) || 0)
}

/* What one cell says, as plain text (print, link, CSV all use it). */
export function cellText(shot, key) {
  if (key.startsWith('f_')) return shot.custom?.[key] || ''
  switch (key) {
    case 'lens': return shot.lens ? `${shot.lens}${/^\d+$/.test(String(shot.lens)) ? 'mm' : ''}` : ''
    case 'camera': return shot.camera ? `Cam ${shot.camera}` : ''
    case 'fps': return shot.fps ? `${shot.fps}fps` : ''
    case 'setup': return shot.setupMin !== undefined && shot.setupMin !== '' ? `${shot.setupMin}′` : ''
    case 'shoot': return shot.shootMin !== undefined && shot.shootMin !== '' ? `${shot.shootMin}′` : ''
    case 'frame': return ''
    default: return shot[key] == null ? '' : String(shot[key])
  }
}

/* Clock helpers for the day plan. Minutes since midnight in, "HH:MM" out, past midnight wraps. */
export const toMin = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}
export const toHHMM = (min) => {
  const t = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

/* The order a day is shot in: what was saved (shots and breaks), minus shots no longer on the
   day, plus shots added to the day since, at the end in scene order. */
export function dayPlan(day, shots, scenes) {
  const order = new Map((day.sceneIds || []).map((id, i) => [id, i]))
  const onDay = shots.filter((s) => order.has(s.sceneId))
  const sorted = [...onDay].sort((a, b) => order.get(a.sceneId) - order.get(b.sceneId) || shots.indexOf(a) - shots.indexOf(b))
  const byId = new Map(onDay.map((s) => [s.id, s]))
  const out = []
  const used = new Set()
  for (const it of Array.isArray(day.shotPlan) ? day.shotPlan : []) {
    if (it.shotId) {
      if (!byId.has(it.shotId) || used.has(it.shotId)) continue
      used.add(it.shotId)
      out.push({ id: it.id, shotId: it.shotId })
    } else out.push({ id: it.id, label: it.label || 'Break', min: Number(it.min) || 0 })
  }
  for (const s of sorted) if (!used.has(s.id)) out.push({ id: `p_${s.id}`, shotId: s.id })
  const sceneOf = new Map((scenes || []).map((s) => [s.id, s]))
  return out.map((it) => (it.shotId ? { ...it, shot: byId.get(it.shotId), scene: sceneOf.get(byId.get(it.shotId).sceneId) } : it))
}

/* Planned start and end of every item from the first call, and how far ahead or behind the day
   is: the last shot marked done, its real time against its planned end. */
export function timeline(plan, startHHMM, layout) {
  let t = toMin(startHHMM) ?? 8 * 60
  const rows = plan.map((it) => {
    const len = it.shot ? shotMinutes(it.shot, layout) : it.min
    const row = { ...it, start: t, end: t + len, len }
    t += len
    return row
  })
  let drift = null
  for (const r of rows) {
    if (!r.shot || !r.shot.doneAt) continue
    let real = toMin(r.shot.doneAt)
    if (real == null) continue
    // a shot finished after midnight on a night shoot is still the same day
    while (real < r.end - 720) real += 1440
    drift = real - r.end
  }
  return { rows, end: t, drift }
}

export const newBreak = (label = 'Lunch', min = 60) => ({ id: uid(), label, min })
