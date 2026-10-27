// RoarList wears the hub's theme (Alex, 27 Oct 2026: "make RoarList follow the site's theme"), as Roardino does
// (roardino/app.js hubTheme): framed in the hub (?embed=hub, same address) it reads the page around it (the hub's
// computed --bg, --text, --muted, --accent, --line, --font, the glass skins' --gl-fill / --gl-edge / --gl-input /
// --gl-active, the html/body backdrop) and sets RoarList's own tokens from them, plus light or dark. It follows a
// change in the hub's Settings > Display live. RoarList's own Appearance settings (theme, accent, font) give way.
import { embedded } from './hub'

let hubDoc: Document | null = null
try { hubDoc = window.parent !== window ? window.parent.document : null } catch { hubDoc = null }

export const followsHub = () => embedded && !!hubDoc

function apply() {
  if (!hubDoc) return
  const root = document.documentElement
  const cs = hubDoc.defaultView!.getComputedStyle(hubDoc.documentElement)
  const v = (k: string) => cs.getPropertyValue(k).trim()
  const light = hubDoc.documentElement.dataset.theme === 'light'
  const text = v('--text') || '#eef0f3'
  const panel = v('--panel') || '#2c3139'
  const set = (k: string, val: string) => { if (val) root.style.setProperty(k, val) }
  root.dataset.theme = 'ember'
  root.dataset.mode = light ? 'light' : 'dark'
  set('--bg', v('--bg'))
  set('--text', text)
  set('--muted', v('--muted'))
  set('--accent', v('--accent'))
  set('--accent-ink', v('--accent-ink'))
  set('--panel', v('--gl-fill') || `color-mix(in srgb, ${panel} 82%, transparent)`)
  set('--side', v('--gl-fill') || `color-mix(in srgb, ${panel} 70%, transparent)`)
  set('--float', `color-mix(in srgb, ${panel} 96%, transparent)`)
  set('--glass', `color-mix(in srgb, ${text} 6%, transparent)`)
  set('--glass-2', `color-mix(in srgb, ${text} 10%, transparent)`)
  set('--field', v('--gl-input') || `color-mix(in srgb, ${text} ${light ? 4 : 6}%, transparent)`)
  set('--well', light ? `color-mix(in srgb, ${text} 5%, transparent)` : 'rgba(0, 0, 0, .25)')
  set('--edge', v('--gl-edge') || v('--line-soft') || v('--line'))
  set('--edge-2', v('--line') || v('--gl-edge'))
  set('--font', v('--font'))
  const r = parseFloat(v('--radius'))
  if (r) set('--r', `${Math.min(16, Math.max(6, r))}px`)
  root.style.colorScheme = light ? 'light' : 'dark'
  // the backdrop: the hub's own (a skin's gradient), else its plain background
  const bs = hubDoc.defaultView!.getComputedStyle(hubDoc.body)
  const img = [cs, bs].map((x) => x.backgroundImage).find((x) => x && x !== 'none')
  const col = [bs, cs].map((x) => x.backgroundColor).find((x) => x && !/rgba\(0, 0, 0, 0\)|transparent/.test(x))
  root.style.setProperty('--hub-backdrop', img ? `${img}, ${col || v('--bg')}` : (col || v('--bg')))
  root.classList.add('hub-theme')
  // the hub's typeface: its Google Fonts sheets, once each
  hubDoc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href*="fonts.googleapis.com"]').forEach((l) => {
    if (!document.querySelector(`link[href="${CSS.escape(l.href)}"]`)) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: l.href }))
  })
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', v('--bg') || '#1f2328')
}

export function hubTheme() {
  if (!followsHub() || !hubDoc) return
  apply()
  // the hub writes a few sizes on its root while the page scrolls: look again at most once a frame, and only
  // redo the look when something it reads has changed
  let queued = false
  const sig = () => { const cs = hubDoc!.defaultView!.getComputedStyle(hubDoc!.documentElement); const d = hubDoc!.documentElement.dataset; return [d.theme, d.skin, d.accent, cs.getPropertyValue('--accent'), cs.getPropertyValue('--bg'), cs.getPropertyValue('--text'), cs.getPropertyValue('--font'), cs.getPropertyValue('--gl-fill')].join('|') }
  let last = sig()
  const watch = new hubDoc.defaultView!.MutationObserver(() => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => { queued = false; const now = sig(); if (now !== last) { last = now; apply() } })
  })
  watch.observe(hubDoc.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-skin', 'data-accent', 'style'] })
}
// RoarList's own settings (settings.ts apply) write the theme, mode, accent and font: the hub's are put back after
export const reapply = () => { if (followsHub()) apply() }
