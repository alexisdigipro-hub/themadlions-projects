import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { applyFont, currentFont } from './lib/fonts.js'
import { DEFAULT_THEME, SKIN_ICONS, applyThemeChoice } from './lib/skin.js'
import { applyIconSet } from './components/icons.jsx'

// Back from "Connect pCloud": pCloud puts the token in the address (#access_token=…), which the
// router would swallow. Park it for Settings to show once, then land on Settings.
try {
  const h = window.location.hash || ''
  if (h.startsWith('#access_token=')) {
    const p = new URLSearchParams(h.slice(1))
    sessionStorage.setItem('tml_pcloud_oauth', JSON.stringify({ token: p.get('access_token') || '', locationid: p.get('locationid') || '' }))
    history.replaceState(null, '', window.location.pathname + '#/settings')
  }
} catch {}

// Back from "Connect Google Calendar": Google puts the code in the query string (?code=…), ahead
// of the hash route, since its redirect lands on the bare app URL. Same parking spot, then on to
// Settings to exchange it.
try {
  const q = new URLSearchParams(window.location.search || '')
  if (q.get('code')) {
    sessionStorage.setItem('tml_google_oauth', JSON.stringify({ code: q.get('code') }))
    history.replaceState(null, '', window.location.pathname + '#/settings')
  }
} catch {}

try {
  document.documentElement.dataset.textSize = localStorage.getItem('tml_text_size') || 'normal'
  // Glass dark is everyone's theme from 9 Oct (Alex): once on each device, whatever was picked
  // before, then Settings > Display > Theme changes it as usual. A device that never picked one
  // starts on it too.
  if (localStorage.getItem('tml_theme_default') !== DEFAULT_THEME) {
    localStorage.setItem('tml_theme', DEFAULT_THEME)
    localStorage.setItem('tml_icons', SKIN_ICONS[DEFAULT_THEME] || 'classic')
    localStorage.setItem('tml_theme_default', DEFAULT_THEME)
  }
  // TML Chat (chat.html, the chat's own home-screen app) starts in Glass dark, chat colours
  // included, once per device (Alex, 9 Oct); Settings > Chat changes it as usual afterwards
  if (/chat\.html$/.test(window.location.pathname) && localStorage.getItem('tml_chat_glass_default') !== '1') {
    let prefs = {}
    try { prefs = JSON.parse(localStorage.getItem('tml_chat_prefs') || '{}') || {} } catch {}
    localStorage.setItem('tml_chat_prefs', JSON.stringify({ ...prefs, theme: 'glass' }))
    localStorage.setItem('tml_theme', 'glassdark')
    localStorage.setItem('tml_chat_glass_default', '1')
  }
  applyThemeChoice(localStorage.getItem('tml_theme') || DEFAULT_THEME)
  document.documentElement.dataset.accent = localStorage.getItem('tml_accent') || 'amber'
  applyFont(currentFont())
  applyIconSet(localStorage.getItem('tml_icons') || SKIN_ICONS[DEFAULT_THEME] || 'classic')
} catch {}

// An iPhone home-screen app drawn under the clock (black-translucent) is laid out shorter than the
// screen (Alex, 9 Oct: a band at the foot, and the page's own height, 100dvh and innerHeight do not even
// agree with each other there). So measure against the screen itself: --screen-h is the screen's
// height and --ios-gap how far the bottom of what fixed elements see falls short of it. The CSS sizes
// the app and TML Chat by --screen-h and moves fixed bars down by --ios-gap. Only when the page really
// starts under the clock (a safe area on top); nothing is set in a browser tab or on a computer.
try {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  if (standalone) {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;top:0;bottom:0;left:0;width:0;visibility:hidden;pointer-events:none;box-sizing:border-box;padding-top:env(safe-area-inset-top)'
    document.body.appendChild(probe)
    const typing = () => { const el = document.activeElement; return !!el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable) }
    const root = document.documentElement
    const measure = () => {
      if (typing()) return // the keyboard shrinks the window: not a band
      const inset = parseFloat(getComputedStyle(probe).paddingTop) || 0
      // no safe area: iOS has not settled yet (or the page is not under the clock at all): keep what we have
      if (!(inset > 0)) return
      const tall = window.innerHeight > window.innerWidth
      const screenH = tall ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height)
      // drawn under the clock, the page is always the whole screen; only how far fixed bars must drop
      // varies (Alex, 13:4x: it came up right and then turned to a band before his eyes, when a later
      // reading found no band and the sizes were taken away)
      const gap = Math.min(160, Math.max(0, Math.round(screenH - probe.getBoundingClientRect().height)))
      root.style.setProperty('--screen-h', `${screenH}px`)
      root.style.setProperty('--ios-gap', `${gap}px`)
      if (tall) { try { localStorage.setItem('tml_ios_band', JSON.stringify({ screenH, gap })) } catch {} }
    }
    // the last good numbers for this screen, straight away, so the first frame already reaches the foot
    try {
      const last = JSON.parse(localStorage.getItem('tml_ios_band') || 'null')
      const tall = window.innerHeight > window.innerWidth
      if (tall && last && last.screenH === Math.max(screen.width, screen.height) && last.gap >= 0 && last.gap <= 160) {
        root.style.setProperty('--ios-gap', `${last.gap}px`)
        root.style.setProperty('--screen-h', `${last.screenH}px`)
      }
    } catch {}
    measure()
    // right at launch iOS can report no safe area yet, so the numbers would come out empty and the band
    // come back on the next opening (Alex, 13:4x): measure again as the app settles and whenever it
    // comes back to the screen
    ;[50, 250, 700, 1500, 3000].forEach((ms) => setTimeout(measure, ms))
    window.addEventListener('load', measure)
    window.addEventListener('pageshow', () => setTimeout(measure, 50))
    document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(measure, 50) })
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', () => setTimeout(measure, 300))
    document.addEventListener('focusout', () => setTimeout(measure, 400))
  }
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
