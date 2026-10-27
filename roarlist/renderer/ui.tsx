// RoarMe's small UI pieces (roarme/src/ui.jsx): the lens that springs to the chosen button,
// and the scrollbars that show only while something scrolls.
import { useLayoutEffect, useRef } from 'react'
import { subscribe } from './settings'

export function useLens<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const put = () => {
      const on = el.querySelector<HTMLElement>(':scope > .on')
      if (!on) { el.classList.remove('lens-on'); return }
      el.style.setProperty('--lx', `${on.offsetLeft}px`)
      el.style.setProperty('--ly', `${on.offsetTop}px`)
      el.style.setProperty('--lw', `${on.offsetWidth}px`)
      el.style.setProperty('--lh', `${on.offsetHeight}px`)
      el.classList.add('lens-on')
    }
    put()
    const ro = new ResizeObserver(put)
    ro.observe(el)
    ;[...el.children].forEach((c) => ro.observe(c))
    // a new font or text size moves the buttons
    const off = subscribe(() => requestAnimationFrame(() => requestAnimationFrame(put)))
    return () => { ro.disconnect(); off() }
  }, [dep])
  return ref
}

export function Lens({ as: Tag = 'div', className = '', dep, children }: { as?: any; className?: string; dep: unknown; children: React.ReactNode }) {
  const ref = useLens<HTMLElement>(dep)
  return <Tag ref={ref} className={`${className} lens`}>{children}</Tag>
}

export function scrollbarsWhileScrolling() {
  const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>()
  document.addEventListener('scroll', (e) => {
    const el = e.target instanceof Element ? e.target : document.scrollingElement
    if (!el) return
    el.classList.add('is-scrolling')
    clearTimeout(timers.get(el))
    timers.set(el, setTimeout(() => el.classList.remove('is-scrolling'), 900))
  }, { capture: true, passive: true })
}
