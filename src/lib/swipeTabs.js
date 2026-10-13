/* A sideways swipe on a phone goes to the next or the previous tab, depending on where you are
   (Alex, 14 Oct): inside a project its own tabs (Project.jsx puts a handler in swipeTabs.project
   while it is open, so the page slides like a tapped tab), anywhere else the tabs of the bar at the
   foot (Layout.jsx). Swipe left for the next tab, right for the one before.
   Left alone: a swipe that starts in a field, a row that slides sideways itself (chips, tables, the
   bar), a chat row (it has its own swipe), the whiteboard, a picture being framed, an open
   conversation or window, and the screen's own edges (Safari's back and forward). */
export const swipeTabs = { project: null }

const NO = 'input, textarea, select, [contenteditable="true"], canvas, video, iframe, [data-noswipe], .chat-swipe, .wb, .cover-adj-frame, .tabbar, .ptabs-m'

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

// onSwipe('next' | 'prev'); returns the function that removes the listeners
export function listenSwipes(onSwipe) {
  let start = null
  const down = (e) => {
    const t = e.touches[0]
    start = e.touches.length === 1 && t.clientX > 24 && t.clientX < window.innerWidth - 24 && fromHere(e.target)
      ? { x: t.clientX, y: t.clientY, at: Date.now() } : null
  }
  const up = (e) => {
    if (!start) return
    const t = e.changedTouches[0], dx = t.clientX - start.x, dy = t.clientY - start.y, quick = Date.now() - start.at < 700
    start = null
    if (!quick || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return
    if (String(window.getSelection?.() || '').trim()) return
    onSwipe(dx < 0 ? 'next' : 'prev')
  }
  const cancel = () => { start = null }
  document.addEventListener('touchstart', down, { passive: true })
  document.addEventListener('touchend', up, { passive: true })
  document.addEventListener('touchcancel', cancel, { passive: true })
  return () => {
    document.removeEventListener('touchstart', down)
    document.removeEventListener('touchend', up)
    document.removeEventListener('touchcancel', cancel)
  }
}
