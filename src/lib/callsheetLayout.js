import { uid } from './store.jsx'

/* How a call sheet is laid out: which sections, in what order, under what name, on the printed
   sheet and on the share link, plus a few looks. One per project (project.callsheetLayout), with
   the company default in Settings (settings.callsheet.layout) for projects that have none.
   What is written on a given day (times, notes, who is called) lives on the day, not here. */

export const BLOCKS = [
  ['note', 'Note'],
  ['groupcalls', 'Calls by group'],
  ['location', 'Location'],
  ['program', 'Program'],
]
// Cast, crew, production, scenes (run of show) and department requirements left the ordino (Alex,
// 11 Oct: "I don't need them anywhere"); normalizeLayout drops them from saved layouts.
const LINK_OFF = new Set()

export const DETAILS = [
  ['cover', 'Cover picture'],
  ['tagline', 'Line under the call time'],
  ['weather', 'Weather'],
  ['sun', 'Sunrise and sunset'],
  ['parking', 'Parking'],
  ['hospital', 'Nearest hospital'],
  ['lunch', 'Lunch / break time'],
  ['wrap', 'Est. wrap time'],
]
// Details that start switched off, also in layouts saved before they existed: lunch and the wrap on
// the link (Alex took that row out of the link). The Shooting call is gone altogether (Alex, 11 Oct).
const DETAIL_OFF = { lunch: { link: true }, wrap: { link: true } }

export const LABELS = [
  ['call', 'General crew call'],
  ['lunch', 'Lunch'],
  ['wrap', 'Est. wrap'],
]

export const LOOK_DEFAULTS = { header: 'columns', colour: '', custom: '#c8503f', size: 'normal', linkTheme: 'light', linkSize: 'normal' }
export const SIZES = [['small', 'Smaller'], ['normal', 'Normal'], ['large', 'Larger']]
export const ZOOM = { small: 0.9, normal: 1, large: 1.12 }

const blockName = (key) => BLOCKS.find(([k]) => k === key)?.[1] || key

/* Whatever was saved, made whole: blocks added since are appended, unknown ones dropped. */
export function normalizeLayout(raw, { event = false } = {}) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const known = new Set(BLOCKS.map(([k]) => k))
  const seen = new Set()
  const blocks = []
  for (const b of Array.isArray(src.blocks) ? src.blocks : []) {
    if (!b || !b.key || seen.has(b.key)) continue
    if (!b.custom && !known.has(b.key)) continue
    seen.add(b.key)
    blocks.push({ key: b.key, title: b.title || '', sheet: b.sheet !== false, link: b.link !== undefined ? !!b.link : !LINK_OFF.has(b.key), ...(b.custom ? { custom: true, text: b.text || '' } : {}) })
  }
  // A section added to the app later lands right after the one it follows in BLOCKS (Program
  // after Scenes), not at the bottom of a layout saved before it existed.
  BLOCKS.forEach(([k], idx) => {
    if (seen.has(k)) return
    const fresh = { key: k, title: '', sheet: true, link: !LINK_OFF.has(k) }
    const before = idx > 0 ? blocks.findIndex((b) => b.key === BLOCKS[idx - 1][0]) : -1
    if (before >= 0) blocks.splice(before + 1, 0, fresh)
    else blocks.push(fresh)
    seen.add(k)
  })
  const details = {}
  for (const [k] of DETAILS) {
    const d = src.details?.[k] || {}
    details[k] = {
      sheet: d.sheet !== undefined ? d.sheet !== false : !DETAIL_OFF[k]?.sheet,
      link: d.link !== undefined ? d.link !== false : !DETAIL_OFF[k]?.link,
    }
  }
  const labels = {}
  for (const [k] of LABELS) labels[k] = String(src.labels?.[k] || '')
  return { blocks, details, labels, look: { ...LOOK_DEFAULTS, ...(src.look || {}) }, event }
}

/* The layout as it is saved: without the project-type flag normalizeLayout adds for the names. */
export const storedLayout = (l) => {
  const out = { ...l }
  delete out.event
  return out
}

export const layoutOf = (project, state) => normalizeLayout(project.callsheetLayout || state.settings?.callsheet?.layout, { event: project.category === 'Event' })

export const titleOf = (layout, b) => b.title || (b.custom ? 'Untitled section' : blockName(b.key, layout.event))
export const labelOf = (layout, k) => layout.labels[k] || LABELS.find(([x]) => x === k)?.[1] || k

export const newCustomBlock = () => ({ key: `c_${uid()}`, custom: true, title: 'New section', text: '', sheet: true, link: true })

/* The colour headings and the call time take: none (black), the project's, or one picked. */
export const accentOf = (layout, project) => (layout.look.colour === 'project' ? project.color || '' : layout.look.colour === 'custom' ? layout.look.custom : '')

/* What a share link needs to draw itself the same way; stored in the snapshot. */
export function linkLayout(layout, project, customText) {
  return {
    blocks: layout.blocks.filter((b) => b.link).map((b) => ({ key: b.key, title: titleOf(layout, b), ...(b.custom ? { custom: true, text: customText(b) } : {}) })),
    details: Object.fromEntries(Object.entries(layout.details).map(([k, v]) => [k, v.link])),
    labels: Object.fromEntries(LABELS.map(([k]) => [k, labelOf(layout, k)])),
    theme: layout.look.linkTheme,
    size: layout.look.linkSize,
    accent: accentOf(layout, project),
  }
}
