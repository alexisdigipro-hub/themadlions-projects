// A person's settings, built like RoarMe's (prefs.js there): the look (theme, light/dark, accent, font, corners,
// spacing, text size, effects), language, the defaults for new lists and shots, the list's columns, PDF printing and
// behaviour. Kept in this browser / app, and in the account when signed in. Everything is applied as data-* attributes
// and CSS variables on <html>, the way RoarMe does it.

import { reapply } from './hubTheme'
export type Settings = {
  theme: 'ember' | 'prism'      // Simba, Pumba: RoarMe's public themes
  mode: 'dark' | 'light' | 'auto'
  accent: string                 // '' = the theme's own, or a key of ACCENTS
  font: string                   // key of FONTS
  radius: number                 // 4 to 16
  density: 'relaxed' | 'standard' | 'tight'
  textSize: number               // index into TEXT_SIZES
  motion: boolean                // smooth animations
  focusRings: boolean            // bold focus rings
  glass: boolean                 // glass look for main buttons
  lite: boolean                  // power saving: no blur, no animation
  language: 'system' | 'el' | 'en'
  aspect: string                 // for new shot lists
  lens: string                   // for the first shot of a new list
  columns: Record<string, boolean> // false hides that column in the list
  paper: 'A4' | 'Letter'
  pdfFrames: boolean             // frames in the list PDF
  confirmDelete: boolean         // ask before deleting a shot
}

export const THEMES: [Settings['theme'], string, string, string][] = [
  ['ember', 'Simba', '#ff6b57', 'linear-gradient(180deg,#3a4049,#1b1e23)'],
  ['prism', 'Pumba', '#ff5d4a', 'linear-gradient(180deg,#555963,#2c2e34)'],
]
// RoarMe's accents, the same keys and colours
export const ACCENTS: [string, string][] = [
  ['red', '#d40000'], ['coral', '#ff6b57'], ['orange', '#f97316'], ['yellow', '#facc15'], ['green', '#22c55e'],
  ['cyan', '#22d3ee'], ['blue', '#3b82f6'], ['violet', '#8b5cf6'], ['magenta', '#d946ef'], ['white', '#ffffff'],
]
export const FONTS: [string, string, string][] = [
  ['system', 'SF Pro / System', "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif"],
  ['inter', 'Inter', "'Inter', -apple-system, sans-serif"],
  ['manrope', 'Manrope', "'Manrope', -apple-system, sans-serif"],
  ['dm', 'DM Sans', "'DM Sans', -apple-system, sans-serif"],
  ['grotesk', 'Space Grotesk', "'Space Grotesk', -apple-system, sans-serif"],
  ['jost', 'Jost', "Jost, Futura, 'Century Gothic', sans-serif"],
  ['serif', 'Serif', "Georgia, 'Times New Roman', serif"],
  ['mono', 'Mono', "'JetBrains Mono', ui-monospace, Menlo, monospace"],
]
export const TEXT_SIZES = [12.5, 13.5, 14, 15, 16.5]
export const COLUMNS = ['frame', 'size', 'angle', 'move', 'lens', 'cast', 'duration', 'notes'] as const

export const DEFAULTS: Settings = {
  theme: 'ember', mode: 'dark', accent: 'red', font: 'system', radius: 12, density: 'standard', textSize: 2,
  motion: true, focusRings: false, glass: true, lite: false,
  language: 'system', aspect: '16:9', lens: '', columns: {}, paper: 'A4', pdfFrames: true, confirmDelete: false,
}

const KEY = 'roarlist-settings'

export function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    // settings from 0.3.0: mode 'system', textSize as a word
    if (raw.mode === 'system') raw.mode = 'auto'
    if (typeof raw.textSize === 'string') raw.textSize = { small: 1, standard: 2, large: 3 }[raw.textSize as string] ?? 2
    return { ...DEFAULTS, ...raw }
  } catch { return { ...DEFAULTS } }
}

let current = load()
const subs = new Set<(s: Settings) => void>()
let remote: ((s: Settings) => void) | null = null

export const get = () => current
export const shown = (col: string) => current.columns[col] !== false
export function subscribe(fn: (s: Settings) => void) { subs.add(fn); return () => { subs.delete(fn) } }
// the web app sends changes to the account
export function onChange(fn: ((s: Settings) => void) | null) { remote = fn }

export function set(patch: Partial<Settings> | null, fromAccount = false) {
  const langBefore = current.language
  // null: back to the defaults, keeping the language (RoarMe's Reset All Settings)
  current = patch === null ? { ...DEFAULTS, language: current.language } : { ...current, ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(current)) } catch { /* private window */ }
  apply()
  subs.forEach((f) => f(current))
  if (!fromAccount && remote) remote(current)
  // the words are picked when the app starts
  if (current.language !== langBefore) setTimeout(() => location.reload(), 150)
}

const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : null
const inkOn = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 160 ? '#111111' : '#ffffff'
}
const GOOGLE = { inter: 'Inter:wght@400;500;600;700', manrope: 'Manrope:wght@400;500;600;700', dm: 'DM+Sans:wght@400;500;600;700', grotesk: 'Space+Grotesk:wght@400;500;600;700', mono: 'JetBrains+Mono:wght@400;500;700' } as Record<string, string>

// a chosen web font is fetched the first time it is used (the desktop app falls back to the system font offline)
function loadFont(key: string) {
  const fam = GOOGLE[key]
  if (!fam || document.getElementById(`font-${key}`)) return
  const l = document.createElement('link')
  l.id = `font-${key}`; l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${fam}&display=swap`
  document.head.appendChild(l)
}

export function apply() {
  const r = document.documentElement
  const s = current
  r.dataset.theme = s.theme
  r.dataset.mode = s.mode === 'auto' ? (media?.matches ? 'light' : 'dark') : s.mode
  r.dataset.density = s.density
  r.style.setProperty('--fs', `${TEXT_SIZES[s.textSize] ?? 14}px`)
  const hex = ACCENTS.find(([k]) => k === s.accent)?.[1]
  if (hex) { r.style.setProperty('--accent', hex); r.style.setProperty('--accent-ink', inkOn(hex)) }
  else { r.style.removeProperty('--accent'); r.style.removeProperty('--accent-ink') }
  const f = FONTS.find(([k]) => k === s.font)
  if (f && s.font !== 'system') { loadFont(s.font); r.style.setProperty('--font', f[2]); r.dataset.font = s.font }
  else { r.style.removeProperty('--font'); delete r.dataset.font }
  r.style.setProperty('--r', `${Math.min(16, Math.max(4, Number(s.radius) || 12))}px`)
  if (s.motion === false) r.dataset.still = '1'; else delete r.dataset.still
  if (s.focusRings) r.dataset.focus = 'bold'; else delete r.dataset.focus
  if (s.lite) r.dataset.lite = '1'; else delete r.dataset.lite
  r.dataset.buttons = s.glass ? 'glass' : 'solid'
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', r.dataset.mode === 'light' ? '#eceef1' : '#2b3038')
  reapply() // in the hub, the hub's theme goes back on top
}
media?.addEventListener('change', () => { if (current.mode === 'auto') apply() })

// RoarMe's calm(): no flourishes when animations are off, power saving is on or the system asks for less motion
export const calm = () => current.lite || !current.motion || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)

// the circle wipe from the click point when the theme or light/dark changes (RoarMe's revealFrom)
export function revealFrom(e: { clientX: number; clientY: number } | null, change: () => void) {
  const doc = document as any
  if (!e || calm() || !doc.startViewTransition) return change()
  const r = document.documentElement
  r.style.setProperty('--vx', `${e.clientX}px`)
  r.style.setProperty('--vy', `${e.clientY}px`)
  r.classList.add('vt-reveal')
  const vt = doc.startViewTransition(change)
  vt.finished.finally(() => r.classList.remove('vt-reveal'))
}
