/* A sideways swipe on a phone goes to the next or the previous tab, depending on where you are
   (Alex, 14 Oct): inside a project its own tabs (Project.jsx puts a handler in swipeTabs.project
   while it is open), anywhere else the tabs of the bar at the foot (Layout.jsx). Swipe left for the
   next tab, right for the one before.
   Magnetic (Alex, 16 Oct): the page follows the finger. Let go early and it snaps back into place;
   past a fifth of the screen, or with a quick flick, it is pulled over and the next page snaps in.
   With nothing further that way, the page barely gives and snaps back.
   Tighter (Alex, 16 Oct: "πιο σφιχτό το μαγνητικό"): more pull against the finger, a shorter way to
   go, a quicker and stiffer snap both back and over.
   Left alone: a swipe that starts in a field, a row that slides sideways itself (chips, tables, the
   bar), a chat row (it has its own swipe), the whiteboard, a picture being framed, an open
   conversation or window, and the screen's own edges (Safari's back and forward). */
import { stillMotion } from './glide.js'

export const swipeTabs = { project: null }

const NO = 'input, textarea, select, [contenteditable="true"], canvas, video, iframe, [data-noswipe], .chat-swipe, .wb, .cover-adj-frame, .tabbar, .ptabs-m'
const SPRING = 'cubic-bezier(.3, 1.25, .5, 1)'

function fromHere(target) {
  if (!(target instanceof Element) || !target.closest('.content')) return false
  if (target.closest(NO)) return false
  const root = document.documentElement
  if (root.classList.contains('chat-open') || document.querySelector('.modal-backdrop, .ptabs-m.open')) return false
  for (let el = target; el && !el.classList?.contains('content'); el = el.parentElement) {
    const ox = getComputedStyle(el).overflowX
    if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 4) return false
  }
  return true
}

const pageEl = () => document.querySelector('.content')
function moveTo(el, x, { ms = 0, ease = SPRING, fade = true } = {}) {
  if (!el) return
  const w = window.innerWidth
  el.style.transition = ms ? `transform ${ms}ms ${ease}, opacity ${ms}ms ease` : 'none'
  el.style.transform = x ? `translate3d(${x}px, 0, 0)` : ''
  el.style.opacity = fade && x ? String(Math.max(0.35, 1 - (Math.abs(x) / w) * 0.9)) : ''
}
function settle(el) {
  if (!el) return
  delete el.dataset.magnet
  el.style.transition = ''
  el.style.transform = ''
  el.style.opacity = ''
  el.style.willChange = ''
}

// onSwipe('next' | 'prev', mode): mode 'dry' only asks whether there is a page that way (true/false),
// 'magnet' goes there without the tab's own slide (the swipe animates the page itself)
export function listenSwipes(onSwipe) {
  let start = null
  let lock = '' // '' undecided · 'x' sideways (ours) · 'y' up and down (the page scrolls)
  let dx = 0
  let can = { next: false, prev: false }
  const down = (e) => {
    const t = e.touches[0]
    start = e.touches.length === 1 && t.clientX > 24 && t.clientX < window.innerWidth - 24 && fromHere(e.target)
      ? { x: t.clientX, y: t.clientY, at: Date.now() } : null
    lock = ''
    dx = 0
  }
  const move = (e) => {
    if (!start || e.touches.length !== 1) return
    const t = e.touches[0]
    const mx = t.clientX - start.x
    const my = t.clientY - start.y
    if (!lock) {
      if (Math.abs(mx) < 10 && Math.abs(my) < 10) return
      if (Math.abs(mx) > Math.abs(my) * 1.3 && !String(window.getSelection?.() || '').trim()) {
        lock = 'x'
        can = { next: !!onSwipe('next', 'dry'), prev: !!onSwipe('prev', 'dry') }
        const el = pageEl()
        if (el) el.style.willChange = 'transform'
      } else { lock = 'y'; return }
    }
    if (lock !== 'x') return
    if (e.cancelable) e.preventDefault()
    const w = window.innerWidth
    const way = mx < 0 ? 'next' : 'prev'
    // follows the finger with a pull against it, much harder past 30% of the screen; with nothing that way, barely
    const free = can[way] ? 0.8 : 0.18
    const a = Math.abs(mx) * free
    const cap = w * 0.3
    dx = Math.sign(mx) * (a < cap ? a : cap + (a - cap) * 0.2)
    if (!stillMotion()) moveTo(pageEl(), dx)
  }
  const up = (e) => {
    if (!start) return
    const t = e.changedTouches[0]
    const mx = t.clientX - start.x
    const my = t.clientY - start.y
    const ms = Date.now() - start.at
    const was = lock
    start = null
    lock = ''
    const el = pageEl()
    const way = mx < 0 ? 'next' : 'prev'
    const w = window.innerWidth
    const flick = Math.abs(mx) / Math.max(ms, 1) > 0.35 && Math.abs(mx) > 36
    const far = Math.abs(mx) > w * 0.22
    const go = was === 'x' && can[way] && (far || flick) && Math.abs(mx) > Math.abs(my) * 1.3
    if (!go) {
      // not far enough: back into place, like a magnet
      if (was === 'x' && el) { moveTo(el, 0, { ms: 260 }); setTimeout(() => settle(el), 280) }
      return
    }
    if (stillMotion() || !el) { onSwipe(way, 'magnet'); settle(el); return }
    navigator.vibrate?.(6)
    el.dataset.magnet = '1' // the page's own entrance (Layout) is skipped: the swipe brings it in
    // pulled over: out the way it was going, then the next page comes in from the other side
    const out = way === 'next' ? -w * 0.45 : w * 0.45
    moveTo(el, out, { ms: 110, ease: 'cubic-bezier(.5, 0, 1, 1)' })
    setTimeout(() => {
      onSwipe(way, 'magnet')
      moveTo(el, -out * 0.5, { fade: true })
      requestAnimationFrame(() => requestAnimationFrame(() => {
        moveTo(el, 0, { ms: 320 })
        setTimeout(() => settle(el), 340)
      }))
    }, 110)
  }
  const cancel = () => {
    if (lock === 'x') { const el = pageEl(); moveTo(el, 0, { ms: 240 }); setTimeout(() => settle(el), 260) }
    start = null
    lock = ''
  }
  document.addEventListener('touchstart', down, { passive: true })
  document.addEventListener('touchmove', move, { passive: false })
  document.addEventListener('touchend', up, { passive: true })
  document.addEventListener('touchcancel', cancel, { passive: true })
  return () => {
    document.removeEventListener('touchstart', down)
    document.removeEventListener('touchmove', move)
    document.removeEventListener('touchend', up)
    document.removeEventListener('touchcancel', cancel)
  }
}
