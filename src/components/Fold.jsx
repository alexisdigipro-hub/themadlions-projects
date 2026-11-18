import { useState } from 'react'

/* Every box on a project's Overview folds (Alex, 18 Nov: "a little arrow on the side of each box, so it gathers into a
   small bar and opens whenever you want; in every box, even the music"). Folded, the box is a slim glass bar with its
   name; open, a round chevron sits on its side. What is folded is kept per device, by the box's kind (key), so Tasks
   folded stays folded in every project. The content stays mounted while folded (the song keeps playing). A Fold
   with no .panel inside (a section with nothing in it yet) shows nothing of its own (styles.css, Fold). */
const KEY = 'tml_folds'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {} } catch { return {} } }
const write = (k, v) => { try { const m = read(); if (v) m[k] = 1; else delete m[k]; localStorage.setItem(KEY, JSON.stringify(m)) } catch { /* private window */ } }

const CHEV = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>

export default function Fold({ k, title, off = false, children }) {
  const [folded, setFolded] = useState(() => !off && !!read()[k])
  const set = (v) => { setFolded(v); write(k, v) }
  if (off) return children
  return (
    <div className={`fold${folded ? ' folded' : ''}`}>
      {folded && (
        <button type="button" className="panel fold-bar" onClick={() => set(false)} aria-expanded="false">
          <strong>{title}</strong>
          <span className="fold-chev" aria-hidden="true">{CHEV}</span>
        </button>
      )}
      <div className="fold-body">{children}</div>
      {!folded && <button type="button" className="fold-btn" onClick={() => set(true)} aria-expanded="true" aria-label={`Fold ${title}`} title={`Fold ${title}`}>{CHEV}</button>}
    </div>
  )
}
