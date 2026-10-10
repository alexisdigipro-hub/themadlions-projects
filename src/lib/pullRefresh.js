/* Pull down to refresh, in the apps on a phone (Alex, 10 Oct): the home-screen app and TML Chat have
   no browser bar, so nothing reloads them. Pull the page down from its very top: a round arrow comes
   down with the finger, turns once it has come far enough, and letting go there reloads the app
   (which also brings in a new version). A window, an open conversation, a task being dragged and a
   sideways slide are left alone. */

const PULL = 80 // how far to pull before letting go reloads
const MAX = 130

const standalone = () =>
  (typeof window !== 'undefined') && (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    !!window.Capacitor
  )

// the nearest box under the finger that scrolls up and down, or the page itself
function scrollerOf(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.scrollHeight > n.clientHeight + 1) {
      const oy = getComputedStyle(n).overflowY
      if (oy === 'auto' || oy === 'scroll') return n
    }
  }
  return document.scrollingElement || document.documentElement
}

const blocked = (el) =>
  !!el?.closest?.('.modal-backdrop, .chat-scroll, .chat-box, .call-screen, .lightbox, .pdeck-viewer, input, textarea, select, [contenteditable="true"]') ||
  document.documentElement.classList.contains('chat-open') ||
  !!document.querySelector('.rem-swipe.lifted, .modal-backdrop')

export function installPullToRefresh() {
  if (!standalone() || typeof document === 'undefined') return
  const ring = document.createElement('div')
  ring.className = 'ptr'
  ring.setAttribute('aria-hidden', 'true')
  ring.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>'
  document.body.appendChild(ring)

  let s = null // { x, y, scroller, dy, on }
  const show = (dy) => {
    const d = Math.min(MAX, dy)
    ring.style.opacity = String(Math.min(1, d / 40))
    ring.style.transform = `translate(-50%, ${d - 56}px) rotate(${d * 3}deg)`
    ring.classList.toggle('ready', d >= PULL)
  }
  const hide = () => {
    ring.classList.remove('ready', 'pulling')
    ring.style.opacity = '0'
    ring.style.transform = 'translate(-50%, -56px)'
  }

  document.addEventListener('touchstart', (e) => {
    s = null
    if (e.touches.length !== 1 || blocked(e.target)) return
    const scroller = scrollerOf(e.target)
    if (scroller.scrollTop > 0) return
    const t = e.touches[0]
    s = { x: t.clientX, y: t.clientY, scroller, dy: 0, on: false }
  }, { passive: true })

  document.addEventListener('touchmove', (e) => {
    if (!s) return
    const t = e.touches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (!s.on) {
      // only a clear downward pull from the very top; anything sideways or upwards is not ours
      if (Math.abs(dx) > Math.abs(dy) || dy < 0 || s.scroller.scrollTop > 0 || blocked(e.target)) { if (Math.abs(dx) > 10 || dy < -6) s = null; return }
      if (dy < 12) return
      s.on = true
      ring.classList.add('pulling')
    }
    s.dy = (dy - 12) * 0.6
    show(s.dy)
  }, { passive: true })

  const end = () => {
    if (!s) return
    const go = s.on && s.dy >= PULL && !blocked(null)
    s = null
    if (go) {
      ring.classList.add('spin')
      ring.style.transform = `translate(-50%, ${PULL - 56}px)`
      setTimeout(() => window.location.reload(), 250)
    } else hide()
  }
  document.addEventListener('touchend', end, { passive: true })
  document.addEventListener('touchcancel', () => { s = null; hide() }, { passive: true })
}
