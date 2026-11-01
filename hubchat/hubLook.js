/* The hub's look for the hub's chat (moved here from RoarMe's src/hubLink.jsx, Alex 1 Nov 2026).
   The chat is a page of the hub (hubchat.html) shown in a frame by the hub's Chat page (src/pages/HubChatPage.jsx).
   That page sends its colours, light or dark, backdrop and typeface (roarme:hub-look, the same message RoarMe's frame
   got) and sends them again when Settings > Display changes; it is the same address as this page, and nothing from
   any other address is listened to. The chat wears them as the 'hub' theme: its plain glass look with the hub's colours
   on top, written as one style sheet so a person's own accent or mode cannot override them. The last look is kept on
   this device, so the next start shows it from the first frame. In Settings > Appearance a person can pick Stone or
   Simba instead (prefs.theme); 'hub' is the default. */

const LOOK_KEY = 'hubchat-hub-look'
const cssOk = (s) => typeof s === 'string' && s.length < 1500 && !/url\(|@import|expression|[;{}<>\\]/i.test(s)
const FONT_CSS = /^https:\/\/fonts\.googleapis\.com\/css2?\?[^"'<>\s]+$/

export const inHubFrame = () => { try { return window.parent !== window } catch { return true } }
const fromHub = (e) => e.origin === window.location.origin && e.source === window.parent
const askHub = (msg) => { try { if (inHubFrame()) window.parent.postMessage(msg, window.location.origin) } catch { /* no hub around us */ } }

let lastLook = null
let wearing = false

function writeLook(l) {
  if (!l || typeof l !== 'object') return
  const v = (k) => (cssOk(l[k]) ? l[k].trim() : '')
  const light = l.light === true
  const text = v('text') || (light ? '#1f2430' : '#eef3fa')
  const accent = v('accent'), panel = v('panel'), mix = (c, p, w = 'transparent') => `color-mix(in srgb, ${c} ${p}%, ${w})`
  const vars = {
    '--bg': v('bg'), '--panel': panel, '--text': text, '--muted': v('muted'),
    '--glass': v('glFill') || mix(text, light ? 5 : 6), '--glass-2': v('glFill2') || mix(text, light ? 9 : 11),
    '--edge': v('glEdge') || mix(text, light ? 12 : 10), '--edge-2': mix(text, 22),
    '--accent': accent, '--accent-2': accent, '--accent-ink': v('accentInk'),
    '--mine': accent && (light ? accent : mix(accent, 55, panel || '#141b27')), '--mine-ink': light ? v('accentInk') : '',
    '--theirs': light ? panel : v('glFill2') || v('raised'),
    '--float': panel && mix(panel, 96), '--danger': v('danger'), '--ok': v('ok'),
  }
  const decl = Object.entries(vars).filter(([, x]) => x).map(([k, x]) => `${k}: ${x} !important;`).join(' ')
  const font = v('font')
  let css = `html[data-theme='hub'] { ${decl} color-scheme: ${light ? 'light' : 'dark'}; }`
  // see-through: the hub's own backdrop shows behind the chat, so it sits on the page like the hub's other pages
  css += ` html[data-theme='hub'], html[data-theme='hub'] body { background: transparent !important; }`
  // the cards in the hub's own glass, as its side menu, and the pop-ups in its panel colour
  css += ` html[data-theme='hub'] :is(.side, .main, .tasks-panel, .auth-card) { background: var(--glass) !important; }`
  css += ` html[data-theme='hub'] :is(.menu, .modal, .menu-list, .rx-pick, .mention-pick, .msg-acts, .toast, .rmd-card, .emoji-pick) { background: var(--float, var(--panel)) !important; }`
  // the hub's way with words: buttons and tabs in sentence case, not capitals
  css += ` html[data-theme='hub'] :is(.btn, .tabs button, .pill-btn) { text-transform: none !important; letter-spacing: 0 !important; font-size: 13.5px; font-weight: 600; }`
  if (font) css += ` html[data-theme='hub'] body, html[data-theme='hub'] :is(button, input, textarea, select) { font-family: ${font} !important; }`
  let tag = document.getElementById('roar-hub-look')
  if (!tag) { tag = document.createElement('style'); tag.id = 'roar-hub-look'; document.head.append(tag) }
  tag.textContent = css
  ;(Array.isArray(l.fonts) ? l.fonts : []).slice(0, 4).forEach((href) => {
    if (!FONT_CSS.test(String(href)) || document.querySelector(`link[href="${CSS.escape(href)}"]`)) return
    document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href }))
  })
  if (wearing) putOn(l)
}

// the root wears the hub's theme, its light or dark and the colour of the band under a phone's clock
function putOn(l) {
  const r = document.documentElement
  const light = l ? l.light === true : r.dataset.hubMode === 'light'
  r.dataset.theme = 'hub'
  r.dataset.hubMode = light ? 'light' : 'dark'
  r.dataset.mode = r.dataset.hubMode
  const bg = l && cssOk(l.bg) ? l.bg.trim() : ''
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || (light ? '#eef1f8' : '#0b1018'))
}

/* on: the hub's look is the chat's theme; off: Stone or Simba (prefs), and the hub's light or dark no longer wins */
export function wearHubLook(on) {
  wearing = !!on
  const r = document.documentElement
  if (on) putOn(lastLook)
  else delete r.dataset.hubMode
}

/* on start: the look kept from last time at once, then the hub page's own, and every change it sends */
export function followHubLook() {
  if (inHubFrame()) document.documentElement.dataset.embed = 'hub'
  try { lastLook = JSON.parse(localStorage.getItem(LOOK_KEY) || 'null'); writeLook(lastLook) } catch { /* nothing kept yet */ }
  window.addEventListener('message', (e) => {
    if (!fromHub(e)) return
    const m = e.data
    if (!m || m.type !== 'roarme:hub-look' || !m.look) return
    lastLook = m.look
    writeLook(m.look)
    try { localStorage.setItem(LOOK_KEY, JSON.stringify(m.look)) } catch { /* private window */ }
  })
  askHub({ type: 'roarme:want-look' })
}

/* a chat link from the hub page around us (#c=<chat>), e.g. a notification opened the hub's Chat page at a chat */
export function followHubLinks() {
  window.addEventListener('message', (e) => {
    if (!fromHub(e)) return
    const m = e.data
    if (m?.type === 'hubchat:open' && /^[0-9a-f-]{36}$/.test(String(m.room || ''))) window.location.hash = `c=${m.room}`
  })
}
