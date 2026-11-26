import { useEffect, useRef, useState } from 'react'

// The glass lens and the slide that TML Chat's folders started (Alex, 9 Oct), shared by Home's
// category chips and a project's tabs.

export const stillMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// A small glass lens lifts off `from`, slides to `to` and melts into it. `track` (the row holding both,
// position: relative) carries data-lens=`hide` while the lens travels, so the CSS can keep the newly
// chosen item clear until the lens arrives.
export function glassLens(track, from, to, { hide = 'on' } = {}) {
  if (!track || !from || !to || from === to || typeof track.animate !== 'function') return
  track.querySelectorAll(':scope > .glass-lens').forEach((n) => n.remove())
  const lens = document.createElement('span')
  lens.className = 'glass-lens'
  lens.setAttribute('aria-hidden', 'true')
  if (getComputedStyle(track).position === 'static') {
    track.style.position = 'relative'
    setTimeout(() => { if (!track.querySelector(':scope > .glass-lens')) track.style.position = '' }, 700)
  }
  const radius = (b) => { const r = getComputedStyle(b).borderTopLeftRadius; return parseFloat(r) > 0 ? r : '10px' }
  lens.style.borderRadius = radius(to)
  track.appendChild(lens)
  track.dataset.lens = hide
  track.dataset.lensed = '1'
  /* GLASS TRAVEL, RoarMe's signature motion (Alex, 26 Nov: "the buttons as RoarMe's menu, with its glass and its
     animation"), in two beats: 150 ms on cubic-bezier(.3, .7, .4, 1) the lens lifts into clearer glass (scale 1.03 by
     1.16), stretches from the old choice across to the new one and its colours split at the rim (red left, blue right,
     green above, yellow below); then 300 ms on cubic-bezier(.25, 1.45, .45, 1) it draws in onto the new choice and
     settles with one small overshoot, the split fading. Only transform, width, height and box-shadow move. */
  const x = (b) => b.offsetLeft, y = (b) => b.offsetTop
  const left = Math.min(x(from), x(to)), right = Math.max(x(from) + from.offsetWidth, x(to) + to.offsetWidth)
  const top = Math.min(y(from), y(to))
  const base = '0 6px 18px rgba(0, 0, 0, .22)'
  const split = '-2px 0 0 rgba(255, 70, 70, .38), 2px 0 0 rgba(70, 130, 255, .38), 0 -1px 0 rgba(80, 255, 140, .26), 0 1.5px 0 rgba(255, 220, 70, .3), 0 10px 26px rgba(0, 0, 0, .26)'
  const run = lens.animate([
    { transform: `translate(${x(from)}px, ${y(from)}px) scale(1, 1)`, width: `${from.offsetWidth}px`, height: `${from.offsetHeight}px`, boxShadow: base, easing: 'cubic-bezier(.3, .7, .4, 1)' },
    { offset: 1 / 3, transform: `translate(${left}px, ${top}px) scale(1.03, 1.16)`, width: `${right - left}px`, height: `${to.offsetHeight}px`, boxShadow: split, easing: 'cubic-bezier(.25, 1.45, .45, 1)' },
    { transform: `translate(${x(to)}px, ${y(to)}px) scale(1, 1)`, width: `${to.offsetWidth}px`, height: `${to.offsetHeight}px`, boxShadow: base },
  ], { duration: 450, fill: 'both' })
  setTimeout(() => { delete track.dataset.lens }, 440)
  run.onfinish = () => {
    const out = lens.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'both' })
    out.onfinish = () => lens.remove()
  }
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
// the Calendar's type pills too (Alex, 11 Oct); every other row of tabs or a switch in the hub (Alex, 26 Nov: "these buttons
// everywhere, with RoarMe's glass and motion")
const ROWS = '.tabs, .segmented, .chips, .cal-legend, .db-tabs, .est-seg, .est-tabs, .share-tabs, .pseg, .pjh-seg, .fin-bd-tabs, .ab-menu-pills, .ab-gap-tabs, .ptabs-chips, .rem-pills'
export function installGlassTabs() {
  if (typeof document === 'undefined' || installGlassTabs.done) return
  installGlassTabs.done = true
  document.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || stillMotion()) return
    const item = e.target instanceof Element ? e.target.closest('button, a') : null
    const row = item?.parentElement
    if (!row || !row.matches(ROWS) || row.closest('[data-glide]') || item.disabled || item.hasAttribute('data-noglide')) return
    const on = [...row.children].filter((n) => n.classList.contains('on') || n.classList.contains('active'))
    if (on.length !== 1 || on[0] === item) return
    glassLens(row, on[0], item)
  }, true)
}
