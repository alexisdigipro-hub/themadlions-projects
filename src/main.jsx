import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { applyFont, currentFont } from './lib/fonts.js'
import { applyThemeChoice } from './lib/skin.js'

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
  applyThemeChoice(localStorage.getItem('tml_theme') || 'light')
  document.documentElement.dataset.accent = localStorage.getItem('tml_accent') || 'amber'
  applyFont(currentFont())
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
