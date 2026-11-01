import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { startI18n } from './i18n.js'
import { wearTheme } from './prefs.js'
import { followHubLinks, followHubLook } from './hubLook.js'

/* The hub's chat (Alex, 1 Nov 2026): RoarMe's chat copied into the hub as the hub's own chat, on the hub's database
   and the hub's sign-in. A page of its own (hubchat.html) so its styles never meet the hub's; the hub's Chat page
   (src/pages/HubChatPage.jsx) shows it in a frame on the same address. */

startI18n()
// Simba's styles start coming now if it is the theme chosen (prefs.js wearTheme)
try { wearTheme(JSON.parse(localStorage.getItem('hubchat-prefs') || '{}').theme) } catch { /* no saved look */ }
// the hub's colours from the page around us (hubLook.js), and the chats it asks to open
followHubLook()
followHubLinks()

// while the window is dragged bigger or smaller, the heavy glass effects pause so the new part paints at once
let resizeT = 0
window.addEventListener('resize', () => {
  document.documentElement.classList.add('win-resizing')
  clearTimeout(resizeT)
  resizeT = setTimeout(() => document.documentElement.classList.remove('win-resizing'), 180)
})

// scroll bars show only while something scrolls, then fade: the scrolling box gets .is-scrolling
const scrollTimers = new WeakMap()
if (!window.matchMedia?.('(pointer: coarse)').matches) document.addEventListener('scroll', (e) => {
  const el = e.target === document ? document.documentElement : e.target
  if (!el?.classList) return
  if (!el.classList.contains('is-scrolling')) el.classList.add('is-scrolling')
  clearTimeout(scrollTimers.get(el))
  scrollTimers.set(el, setTimeout(() => el.classList.remove('is-scrolling'), 900))
}, true)

// on a phone, while the keyboard is up, the room kept for the home bar goes (styles.css html.kb)
if (window.matchMedia?.('(pointer: coarse)').matches) {
  const typing = (el) => el?.matches?.('textarea, [contenteditable="true"], input:not([type]), input[type=text], input[type=search], input[type=email], input[type=password], input[type=url], input[type=tel], input[type=number]')
  document.addEventListener('focusin', (e) => {
    if (!typing(e.target)) return
    const c = document.querySelector('meta[name="theme-color"]')?.getAttribute('content')
    if (c) document.documentElement.style.setProperty('--kb-bg', c)
    document.documentElement.classList.add('kb')
  })
  const down = () => { if (!typing(document.activeElement) || !document.activeElement.isConnected) { document.documentElement.classList.remove('kb'); if (window.scrollY) window.scrollTo(0, 0) } }
  document.addEventListener('focusout', () => setTimeout(down, 60))
  window.visualViewport?.addEventListener('resize', () => setTimeout(down, 60))
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
