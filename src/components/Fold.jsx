import { useLayoutEffect, useRef, useState } from 'react'
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

const HEAD = '.panel .toolbar, .panel .panel-head'
const headOf = (body) => {
  const h = body?.querySelector(HEAD)
  if (!h) return null
  return h.querySelector(':scope > .toolbar-actions, :scope > .row-actions, :scope > .panel-actions') || h
}

export default function Fold({ k, title, off = false, children }) {
  const [folded, setFolded] = useState(() => !off && !!read()[k])
  const set = (v) => { setFolded(v); write(k, v) }
  const body = useRef(null)
  const [head, setHead] = useState(null)
  // after every render: the head may have arrived (a first task) or changed (a script uploaded)
  useLayoutEffect(() => { const h = folded ? null : headOf(body.current); if (h !== head) setHead(h) })
  if (off) return children
  const btn = <button type="button" className={`ov-round fold-btn${head ? '' : ' loose'}`} onClick={() => set(true)} aria-expanded="true" aria-label={`Fold ${title}`} title={`Fold ${title}`}>{CHEV}</button>
  return (
    <div className={`fold${folded ? ' folded' : ''}`}>
      {folded && (
        <button type="button" className="panel fold-bar" onClick={() => set(false)} aria-expanded="false">
          <strong>{title}</strong>
          <span className="fold-chev" aria-hidden="true">{CHEV}</span>
        </button>
      )}
      <div className="fold-body" ref={body}>{children}</div>
      {!folded && (head ? createPortal(btn, head) : btn)}
    </div>
  )
}
