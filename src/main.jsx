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
  applyThemeChoice(localStorage.getItem('tml_theme') || DEFAULT_THEME)
  document.documentElement.dataset.accent = localStorage.getItem('tml_accent') || 'amber'
  applyFont(currentFont())
  applyIconSet(localStorage.getItem('tml_icons') || SKIN_ICONS[DEFAULT_THEME] || 'classic')
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
