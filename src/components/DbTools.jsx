import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Input, Select, useIsMobile } from './ui.jsx'

/* The Database toolbar's filter and Add, shared by Locations, Crew, Cast and Equipment. On a computer
   they are the usual select and button; on a phone (Alex, 10 Oct) they are round glass buttons on one
   line with the search: the filter a funnel (a see-through select lies over it, lit while a filter is
   set) and Add a plus. */
const FUNNEL = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16l-6 7.5V19l-4 1.5v-8z" /></svg>

export function DbFilter({ value, onChange, options, label }) {
  return (
    <span className={`db-filter${value ? ' set' : ''}`} title={label}>
      <span className="db-filter-ico">{FUNNEL}</span>
      <Select value={value} onChange={onChange} options={options} aria-label={label} />
    </span>
  )
}

export function DbAdd({ label, onClick }) {
  return (
    <Button variant="primary" className="db-add" onClick={onClick} aria-label={label} title={label}>
      <span className="db-add-plus" aria-hidden="true">＋</span>
      <span className="db-add-text">{label}</span>
    </Button>
  )
}

/* Search: on a computer the usual box; on a phone a round glass button with a magnifier that opens
   into a search box across its line, with × to close it (Alex, 10 Oct, Office). While it is open the
   line carries .db-search-open, so the other controls on it can step aside. */
const LENS = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
export function DbSearch({ value, onChange, placeholder = 'Search' }) {
  const mobile = useIsMobile()
  const [open, setOpen] = useState(false)
  if (!mobile) return <Input className="input search" placeholder={placeholder} value={value} onChange={onChange} />
  if (!open && !value) {
    return <button type="button" className="db-search-btn" aria-label={placeholder} title={placeholder} onClick={() => setOpen(true)}>{LENS}</button>
  }
  return (
    <span className="db-search-open">
      <Input className="input search" placeholder={placeholder} value={value} onChange={onChange} autoFocus enterKeyHint="search" />
      <button type="button" className="db-search-x" aria-label="Close the search" onClick={() => { onChange({ target: { value: '' } }); setOpen(false) }}>×</button>
    </span>
  )
}

/* A Database tab's search line. On a computer Database.jsx hands each tab a slot on the tabs' own line
   (Alex, 10 Oct: "on the desktop put these in one row") and the line is drawn there; on a phone, or
   without a slot, it stays the tab's own toolbar. Drawn through a portal, so it does not slide along
   with the tab's content when another tab is picked. */
export function DbBar({ slot, children, className = '' }) {
  return slot ? createPortal(<div className={`toolbar db-bar ${className}`}>{children}</div>, slot) : <div className={`toolbar ${className}`}>{children}</div>
}

/* The list's own scroll box on a computer (Alex, 27 Oct: Contacts, then Crew, Cast and Equipment: "the top row as
   it was, only not moving"): the box runs down to the window's foot and scrolls inside, so the top row never moves
   and keeps its look; on a phone the page scrolls as before. Put the ref on a .ab-scroll div. */
export function useFitScroll(ready = true) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      if (window.innerWidth <= 820) { el.style.height = ''; return }
      const top = el.getBoundingClientRect().top + window.scrollY
      let h = Math.max(240, window.innerHeight - top - 16)
      el.style.height = `${h}px`
      // whatever sits under it (the card's and the page's padding) comes off too, so the page itself never scrolls
      const extra = document.documentElement.scrollHeight - window.innerHeight
      if (extra > 0) { h = Math.max(240, h - extra); el.style.height = `${h}px` }
    }
    fit()
    const bar = el.closest('.db-page')?.querySelector('.db-top')
    const ro = new ResizeObserver(fit)
    if (bar) ro.observe(bar)
    window.addEventListener('resize', fit)
    return () => { ro.disconnect(); window.removeEventListener('resize', fit) }
  }, [ready])
  return ref
}

/* The search of a list tab, as Contacts' (Alex, 27 Oct): × empties it, as does Escape */
export function ListSearch({ value, onChange, placeholder }) {
  const set = (v) => onChange({ target: { value: v } })
  return (
    <span className="ab-search">
      <Input className="input search" value={value} onChange={onChange} onKeyDown={(e) => { if (e.key === 'Escape' && value) set('') }} placeholder={placeholder} />
      {value && <button type="button" className="ab-search-x" aria-label="Clear the search" title="Clear" onClick={() => set('')}>×</button>}
    </span>
  )
}
