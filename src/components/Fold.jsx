import { createContext, useContext, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/* Every box on a project's Overview folds (Alex, 18 Nov: "a little arrow on the side of each box, so it gathers into a
   small bar and opens whenever you want; in every box, even the music"). Folded, the box is a slim glass bar with its
   name; open, a round chevron sits on its side. What is folded is kept per device, by the box's kind (key), so Tasks
   folded stays folded in every project. The open box's arrow sits in its own head row, last after its buttons (Alex,
   18 Nov: "the arrows spill out elsewhere"), put there through a portal into the box's first .toolbar-actions or head.
   The content stays mounted while folded (the song keeps playing). A Fold
   with no .panel inside (a section with nothing in it yet) shows nothing of its own (styles.css, Fold). */
const KEY = 'tml_folds'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {} } catch { return {} } }
const write = (k, v) => { try { const m = read(); if (v) m[k] = 1; else delete m[k]; localStorage.setItem(KEY, JSON.stringify(m)) } catch { /* private window */ } }

const CHEV = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>

const GRIP = <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6.5" r="1.6" /><circle cx="15" cy="6.5" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="17.5" r="1.6" /><circle cx="15" cy="17.5" r="1.6" /></svg>

/* The boxes' order (Alex, 18 Nov: "next to the arrows the little grip, to move them up and down; all but the top one
   with the 15%"). Every box of the Overview carries data-box; the order is CSS `order` on the page's column, kept per
   device by kind (tml_ov_order). A box never ordered keeps its place after the box it follows on the page. */
const ORDER = 'tml_ov_order'
const readOrder = () => { try { const v = JSON.parse(localStorage.getItem(ORDER) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }
const writeOrder = (seq) => { try { localStorage.setItem(ORDER, JSON.stringify(seq)) } catch { /* private window */ } }
export const BoxOrderCtx = createContext(null)
function itemsOf(root) {
  const out = []
  const walk = (el) => { for (const c of el.children) { if (getComputedStyle(c).display === 'contents') walk(c); else if (c.dataset?.box) out.push(c) } }
  if (root) walk(root)
  return out
}
function sequence(keys) {
  const seq = readOrder().filter((k) => keys.includes(k))
  keys.forEach((k, i) => {
    if (seq.includes(k)) return
    let at = 0
    for (let j = i - 1; j >= 0; j--) { const p = seq.indexOf(keys[j]); if (p >= 0) { at = p + 1; break } }
    seq.splice(at, 0, k)
  })
  return seq
}
export function useBoxOrder(ref) {
  const apply = () => {
    const items = itemsOf(ref.current)
    const seq = sequence(items.map((e) => e.dataset.box))
    items.forEach((e) => { e.style.order = String(seq.indexOf(e.dataset.box) + 1) })
    return { items, seq }
  }
  useLayoutEffect(() => { apply() })
  const startDrag = (key, ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    const grip = ev.currentTarget
    try { grip.setPointerCapture(ev.pointerId) } catch { /* not a pointer */ }
    let { items, seq } = apply()
    const el = items.find((e) => e.dataset.box === key)
    if (!el) return
    el.classList.add('box-lifted')
    document.documentElement.classList.add('box-dragging')
    let y = ev.clientY
    let raf = 0
    const scroll = () => {
      const edge = 90
      const d = y < edge ? -(edge - y) / 4 : y > innerHeight - edge ? (y - (innerHeight - edge)) / 4 : 0
      if (d) { window.scrollBy(0, d); check() }
      raf = requestAnimationFrame(scroll)
    }
    const check = () => {
      // only boxes on screen count (a box with nothing in it yet is hidden)
      const shown = (k) => { const e = items.find((x) => x.dataset.box === k); return e && e.getClientRects().length ? e : null }
      const at = seq.indexOf(key)
      let pi = at - 1; while (pi >= 0 && !shown(seq[pi])) pi--
      let ni = at + 1; while (ni < seq.length && !shown(seq[ni])) ni++
      const prev = pi >= 0 ? shown(seq[pi]) : null
      const next = ni < seq.length ? shown(seq[ni]) : null
      const mid = (e) => { const r = e.getBoundingClientRect(); return r.top + r.height / 2 }
      let to = -1
      if (prev && y < mid(prev)) to = pi
      else if (next && y > mid(next)) to = ni
      if (to < 0) return
      seq.splice(at, 1)
      seq.splice(to, 0, key)
      writeOrder(seq)
      ;({ items, seq } = apply())
    }
    const move = (e) => { y = e.clientY; check() }
    const up = () => {
      cancelAnimationFrame(raf)
      el.classList.remove('box-lifted')
      document.documentElement.classList.remove('box-dragging')
      grip.removeEventListener('pointermove', move)
      grip.removeEventListener('pointerup', up)
      grip.removeEventListener('pointercancel', up)
    }
    grip.addEventListener('pointermove', move)
    grip.addEventListener('pointerup', up)
    grip.addEventListener('pointercancel', up)
    raf = requestAnimationFrame(scroll)
  }
  return { startDrag }
}
export function Grip({ box, title }) {
  const order = useContext(BoxOrderCtx)
  if (!order || !box) return null
  return <button type="button" className="ov-round box-grip" onPointerDown={(e) => order.startDrag(box, e)} onClick={(e) => e.stopPropagation()} aria-label={`Move ${title}`} title="Hold and drag to move">{GRIP}</button>
}

const HEAD = '.panel .toolbar, .panel .panel-head'
const headOf = (body) => {
  const h = body?.querySelector(HEAD)
  if (!h) return null
  return h.querySelector(':scope > .toolbar-actions, :scope > .row-actions, :scope > .panel-actions') || h
}

export default function Fold({ k, box, title, off = false, children }) {
  const id = box || k
  const [folded, setFolded] = useState(() => !off && !!read()[k])
  const set = (v) => { setFolded(v); write(k, v) }
  const body = useRef(null)
  const [head, setHead] = useState(null)
  // after every render: the head may have arrived (a first task) or changed (a script uploaded)
  useLayoutEffect(() => { const h = folded ? null : headOf(body.current); if (h !== head) setHead(h) })
  if (off) return children
  const btn = (
    <span className={`fold-tools${head ? '' : ' loose'}`}>
      <Grip box={id} title={title} />
      <button type="button" className="ov-round fold-btn" onClick={() => set(true)} aria-expanded="true" aria-label={`Fold ${title}`} title={`Fold ${title}`}>{CHEV}</button>
    </span>
  )
  return (
    <div className={`fold${folded ? ' folded' : ''}`} data-box={id}>
      {folded && (
        <div role="button" tabIndex={0} className="panel fold-bar" onClick={() => set(false)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(false) } }} aria-expanded="false">
          <strong>{title}</strong>
          <span className="fold-tools"><Grip box={id} title={title} /><span className="fold-chev" aria-hidden="true">{CHEV}</span></span>
        </div>
      )}
      <div className="fold-body" ref={body}>{children}</div>
      {!folded && (head ? createPortal(btn, head) : btn)}
    </div>
  )
}
