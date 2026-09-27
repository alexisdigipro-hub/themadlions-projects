import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { applyFont, currentFont } from './lib/fonts.js'

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

try {
  document.documentElement.dataset.textSize = localStorage.getItem('tml_text_size') || 'normal'
  document.documentElement.dataset.theme = localStorage.getItem('tml_theme') || 'light'
  document.documentElement.dataset.accent = localStorage.getItem('tml_accent') || 'amber'
  applyFont(currentFont())
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
