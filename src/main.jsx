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

// An iPhone home-screen app drawn under the clock (black-translucent) can be laid out shorter than
// the screen by the clock's height, leaving a band at the foot (Alex, 9 Oct). Measure that band
// with the keyboard down and hand it to the CSS as --ios-gap, which stretches the backdrop, the chat
// and the tab bar over it. Only when the page really starts under the clock (safe area on top);
// 0 everywhere else, so a browser tab or an icon added before 9 Oct are left as they are.
try {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  if (standalone) {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100dvh;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);box-sizing:content-box'
    document.body.appendChild(probe)
    const typing = () => { const el = document.activeElement; return !!el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable) }
    const measure = () => {
      if (typing()) return // the keyboard shrinks the window: not a band
      const inset = parseFloat(getComputedStyle(probe).paddingTop) || 0
      // 100dvh is the whole screen there; the page (innerHeight, html at 100%) is the short one
      const gap = Math.round(parseFloat(getComputedStyle(probe).height) - window.innerHeight)
      document.documentElement.style.setProperty('--ios-gap', `${inset > 0 && gap > 0 && gap <= inset + 4 ? gap : 0}px`)
    }
    measure()
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
