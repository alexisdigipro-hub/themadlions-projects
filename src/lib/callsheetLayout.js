import { uid } from './store.jsx'

/* How an ordino's link is laid out: which sections, in what order, under what name, which details
   show, the word for the call, and a few looks. One per project (project.callsheetLayout), with the
   company default in Settings (settings.callsheet.layout) for projects that have none. What is
   written on a given day lives on the day (day.callSheet), not here.

   Alex, 11 Oct: no printed sheet any more, and no cast, crew, production, scenes (run of show),
   department requirements, emergency numbers, shooting call, break or wrap; saved layouts that still
   name them are cleaned on load by normalizeLayout. */

export const BLOCKS = [
  ['note', 'Note'],
  ['groupcalls', 'Calls by group'],
  ['location', 'Location'],
  ['program', 'Program'],
]

export const DETAILS = [
  ['cover', 'Cover picture'],
  ['weather', 'Weather'],
  ['sun', 'Sunrise and sunset'],
  ['parking', 'Parking'],
]

export const LABELS = [
  ['call', 'General crew call'],
]

export const LOOK_DEFAULTS = { colour: '', custom: '#c8503f', linkTheme: 'glass', linkSize: 'normal' }
export const SIZES = [['small', 'Smaller'], ['normal', 'Normal'], ['large', 'Larger']]
export const ZOOM = { small: 0.9, normal: 1, large: 1.12 }

const blockName = (key) => BLOCKS.find(([k]) => k === key)?.[1] || key

/* Whatever was saved, made whole: sections the app has and the layout lacks are slotted in after
   the one they follow in BLOCKS, unknown ones dropped, own sections kept. */
export function normalizeLayout(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const known = new Set(BLOCKS.map(([k]) => k))
  const seen = new Set()
  const blocks = []
  for (const b of Array.isArray(src.blocks) ? src.blocks : []) {
    if (!b || !b.key || seen.has(b.key)) continue
    if (!b.custom && !known.has(b.key)) continue
    seen.add(b.key)
    blocks.push({ key: b.key, title: b.title || '', link: b.link !== false, ...(b.custom ? { custom: true, text: b.text || '' } : {}) })
  }
  BLOCKS.forEach(([k], idx) => {
    if (seen.has(k)) return
    const fresh = { key: k, title: '', link: true }
    const before = idx > 0 ? blocks.findIndex((b) => b.key === BLOCKS[idx - 1][0]) : -1
    if (before >= 0) blocks.splice(before + 1, 0, fresh)
    else blocks.push(fresh)
    seen.add(k)
  })
  const details = Object.fromEntries(DETAILS.map(([k]) => [k, { link: src.details?.[k]?.link !== false }]))
  const labels = Object.fromEntries(LABELS.map(([k]) => [k, String(src.labels?.[k] || '')]))
  const look = { ...LOOK_DEFAULTS, ...(src.look || {}) }
  // the link's Dark became Glass dark (Alex, 11 Oct), and Glass dark is the look for a new layout
  if (look.linkTheme !== 'light') look.linkTheme = 'glass'
  return { blocks, details, labels, look }
}

export const layoutOf = (project, state) => normalizeLayout(project.callsheetLayout || state.settings?.callsheet?.layout)

export const titleOf = (layout, b) => b.title || (b.custom ? 'Untitled section' : blockName(b.key))
export const labelOf = (layout, k) => layout.labels[k] || LABELS.find(([x]) => x === k)?.[1] || k

export const newCustomBlock = () => ({ key: `c_${uid()}`, custom: true, title: 'New section', text: '', link: true })

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
