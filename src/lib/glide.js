import { useEffect, useRef, useState } from 'react'

// The glass lens and the slide that TML Chat's folders started (Alex, 9 Oct), shared by Home's
// category chips and a project's tabs.

export const stillMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// A small glass lens lifts off `from`, slides to `to` and melts into it. `track` (the row holding both,
// position: relative) carries data-lens=`hide` while the lens travels, so the CSS can keep the newly
// chosen item clear until the lens arrives.
export function glassLens(track, from, to, { hide = 'on', scale = 1.12 } = {}) {
  if (!track || !from || !to || from === to || typeof track.animate !== 'function') return
  track.querySelectorAll(':scope > .glass-lens').forEach((n) => n.remove())
  const lens = document.createElement('span')
  lens.className = 'glass-lens'
  lens.setAttribute('aria-hidden', 'true')
  if (getComputedStyle(track).position === 'static') {
    track.style.position = 'relative'
    setTimeout(() => { if (!track.querySelector(':scope > .glass-lens')) track.style.position = '' }, 600)
  }
  const radius = (b) => { const r = getComputedStyle(b).borderTopLeftRadius; return parseFloat(r) > 0 ? r : '10px' }
  lens.style.borderRadius = radius(to)
  track.appendChild(lens)
  track.dataset.lens = hide
  track.dataset.lensed = '1'
  const at = (b) => `translate(${b.offsetLeft}px, ${b.offsetTop}px)`
  const box = (b) => ({ width: `${b.offsetWidth}px`, height: `${b.offsetHeight}px` })
  const run = lens.animate([
    { transform: `${at(from)} scale(1)`, ...box(from), opacity: 0 },
    { offset: 0.15, transform: `${at(from)} scale(${scale})`, ...box(from), opacity: 1 },
    { offset: 0.75, transform: `${at(to)} scale(${scale})`, ...box(to), opacity: 1 },
    { transform: `${at(to)} scale(1)`, ...box(to), opacity: 0 },
  ], { duration: 560, easing: 'cubic-bezier(.3, .7, .2, 1)', fill: 'both' })
  setTimeout(() => { delete track.dataset.lens }, 380)
  run.onfinish = () => lens.remove()
}

// The page under the row slides over: `box` (.glide-box) holds the current page in a .glide-in; a copy of
// it slides out `dir` ('next' to the left, 'prev' to the right) while the page that replaces it, keyed
// so it mounts fresh with .glide-in.in-<dir>, slides in. Players and frames are left out of the copy.
export function slideOut(box, dir) {
  const old = box?.querySelector(':scope > .glide-in')
  if (!old) return false
  box.querySelectorAll(':scope > .glide-ghost').forEach((n) => n.remove())
  const ghost = old.cloneNode(true)
  ghost.querySelectorAll('iframe, video, audio, canvas, object, embed').forEach((n) => n.remove())
  ghost.classList.remove('glide-in', 'in-next', 'in-prev')
  ghost.classList.add('glide-ghost', `out-${dir}`)
  ghost.setAttribute('aria-hidden', 'true')
  ghost.setAttribute('inert', '')
  box.appendChild(ghost)
  box.classList.add('sliding')
  setTimeout(() => { ghost.remove(); box.classList.remove('sliding') }, 320)
  return true
}

// The page under a row of tabs slides over when another tab is picked. Put `boxRef` on the page's box
// (.glide-box) and `inClass` on the page inside it (keyed by the tab when the tab swaps the page); call
// slideTo('next' | 'prev') just before the tab changes. The direction is cleared once the slide is
// over, so a page reached any other way (Back, a link) just appears.
export function useSlide() {
  const boxRef = useRef(null)
  const [slide, setSlide] = useState('')
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const slideTo = (dir) => {
    if (stillMotion() || !slideOut(boxRef.current, dir)) return
    setSlide(dir)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setSlide(''), 360)
  }
  return { boxRef, slideTo, inClass: `glide-in${slide ? ` in-${slide}` : ''}` }
}

// The direction from the item chosen now to the one clicked, by their order in the row.
export function dirIn(row, to) {
  const items = [...(row?.children || [])].filter((n) => !n.classList.contains('glass-lens'))
  const from = items.find((n) => n.classList.contains('on') || n.classList.contains('active'))
  return items.indexOf(to) >= items.indexOf(from) ? 'next' : 'prev'
}

// A row of route tabs (a project's, the Database's): spread `go` as each tab's onClick.
export function useGlide() {
  const slide = useSlide()
  const go = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const to = e.currentTarget
    if (to.classList.contains('active')) return
    slide.slideTo(dirIn(to.parentNode, to))
  }
  return { ...slide, go }
}

// Every row of tabs, chips or a segmented switch in the app (Alex, 9 Oct: "wherever there are tabs like
// these"): a click on another item sends the glass lens from the chosen one to it. Rows where more than
// one item can be on (data-glide="off"), or that run their own lens (data-glide="own"), are left alone.
const ROWS = '.tabs, .segmented, .chips'
export function installGlassTabs() {
  if (typeof document === 'undefined' || installGlassTabs.done) return
  installGlassTabs.done = true
  document.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || stillMotion()) return
    const item = e.target instanceof Element ? e.target.closest('button, a') : null
    const row = item?.parentElement
    if (!row || !row.matches(ROWS) || row.closest('[data-glide]') || item.disabled) return
    const on = [...row.children].filter((n) => n.classList.contains('on') || n.classList.contains('active'))
    if (on.length !== 1 || on[0] === item) return
    glassLens(row, on[0], item, { scale: row.matches('.tabs') ? 1.04 : 1.08 })
  }, true)
}
