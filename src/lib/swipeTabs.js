/* A sideways swipe on a phone goes to the next or the previous tab, depending on where you are
   (Alex, 14 Oct): inside a project its own tabs (Project.jsx puts a handler in swipeTabs.project
   while it is open), anywhere else the tabs of the bar at the foot (Layout.jsx). Swipe left for the
   next tab, right for the one before.
   Magnetic (Alex, 16 Oct): the page follows the finger. Let go early and it snaps back into place;
   past a fifth of the screen, or with a quick flick, it changes.
   The look (Alex, 16 Oct: "δεν φαίνεται ωραίο το slide"): the page no longer slides off and leaves an
   empty band beside it. It moves only a little under the finger and shrinks a touch, like a card; on the
   change it fades out the way it was going while the next page fades in from the other side.
   Left alone: a swipe that starts in a field, a row that slides sideways itself (chips, tables, the
   bar), a chat row (it has its own swipe), the whiteboard, a picture being framed, an open
   conversation or window, and the screen's own edges (Safari's back and forward). */
import { stillMotion } from './glide.js'

export const swipeTabs = { project: null }

const NO = 'input, textarea, select, [contenteditable="true"], canvas, video, iframe, [data-noswipe], .chat-swipe, .wb, .cover-adj-frame, .tabbar, .ptabs-m'
const SPRING = 'cubic-bezier(.3, 1.25, .5, 1)'
const OUT = 'cubic-bezier(.4, 0, 1, 1)'
const IN = 'cubic-bezier(.2, .8, .2, 1)'
const SHIFT = 34 // how far a page moves sideways on the change

function fromHere(target) {
  if (!(target instanceof Element) || !target.closest('.content')) return false
  if (target.closest(NO)) return false
  const root = document.documentElement
  if (root.classList.contains('chat-open') || document.querySelector('.modal-backdrop')) return false
  for (let el = target; el && !el.classList?.contains('content'); el = el.parentElement) {
    const ox = getComputedStyle(el).overflowX
    if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 4) return false
  }
  return true
}

const pageEl = () => document.querySelector('.content')
// the page at x px sideways, shrunk to scale, at opacity op; ms 0 = at once
function moveTo(el, x, { ms = 0, ease = SPRING, scale = 1, op = 1 } = {}) {
  if (!el) return
  el.style.transition = ms ? `transform ${ms}ms ${ease}, opacity ${ms}ms ${ease === SPRING ? IN : ease}` : 'none'
  el.style.transform = x || scale !== 1 ? `translate3d(${x}px, 0, 0) scale(${scale})` : ''
  el.style.opacity = op === 1 ? '' : String(op)
}
function settle(el) {
  if (!el) return
  delete el.dataset.magnet
  el.style.transition = ''
  el.style.transform = ''
  el.style.opacity = ''
  el.style.willChange = ''
  el.style.transformOrigin = ''
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
        if (el) { el.style.willChange = 'transform, opacity'; el.style.transformOrigin = `50% ${window.innerHeight / 2 - el.getBoundingClientRect().top}px` } // shrinks around the middle of the screen
      } else { lock = 'y'; return }
    }
    if (lock !== 'x') return
    if (e.cancelable) e.preventDefault()
    const way = mx < 0 ? 'next' : 'prev'
    // a little under the finger and a touch smaller, harder and harder; with nothing that way, barely
    const free = can[way] ? 0.32 : 0.08
    const a = Math.abs(mx) * free
    const cap = 44
    dx = Math.sign(mx) * (a < cap ? a : cap + (a - cap) * 0.15)
    const k = Math.min(1, Math.abs(dx) / 60)
    if (!stillMotion()) moveTo(pageEl(), dx, { scale: 1 - k * 0.04, op: 1 - k * 0.15 })
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
    // the page fades out the way it was going, the next one fades in from the other side
    const side = way === 'next' ? -1 : 1
    moveTo(el, side * SHIFT, { ms: 110, ease: OUT, scale: 0.96, op: 0 })
    setTimeout(() => {
      onSwipe(way, 'magnet')
      moveTo(el, -side * SHIFT, { scale: 0.98, op: 0 })
      requestAnimationFrame(() => requestAnimationFrame(() => {
        moveTo(el, 0, { ms: 280, ease: IN })
        setTimeout(() => settle(el), 300)
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
