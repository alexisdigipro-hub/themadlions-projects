import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

try {
  document.documentElement.dataset.textSize = localStorage.getItem('tml_text_size') || 'normal'
  document.documentElement.dataset.theme = localStorage.getItem('tml_theme') || 'light'
  document.documentElement.dataset.accent = localStorage.getItem('tml_accent') || 'amber'
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
