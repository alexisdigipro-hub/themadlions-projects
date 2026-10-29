import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Act, useIsMobile } from '../components/ui.jsx'
import { supabase } from '../lib/supabase.js'

/* RoarList in the hub (Alex, 27 Oct 2026): the shot list app of themadlions.com/roarlist, copied to roarlist/ and
   working on the hub's database (supabase/roarlist.sql) and its projects. It replaces the project's Shotlist tab.
   Like Roardino it runs in a frame on the hub's own address, so it is signed in as this member and needs nothing
   handed over; it fades in once it has drawn (it says so with a 'roarlist:ready' message), never half-drawn. */
export default function RoarListPage({ inOffice = false, slot = null }) {
  const [drawn, setDrawn] = useState(false)
  const frame = useRef(null)
  // a tab of Office on a computer (Alex, 29 Oct: "laid out like the other tabs"): the search and New list on Office's
  // tabs row, as Tasks and Notes; the frame says what to show ('roarlist:home'), what is typed or pressed goes back
  const mobile = useIsMobile()
  const hosted = inOffice && !mobile
  const [home, setHome] = useState(null)
  const [q, setQ] = useState('')
  const tell = (msg) => { try { frame.current?.contentWindow?.postMessage({ type: 'roarlist:do', ...msg }, window.location.origin) } catch { /* the frame is not there */ } }
  useEffect(() => {
    if (!hosted) return undefined
    const on = (e) => { if (e.origin === window.location.origin && e.source === frame.current?.contentWindow && e.data?.type === 'roarlist:home') { setHome(e.data); if (typeof e.data.search === 'string') setQ(e.data.search) } }
    window.addEventListener('message', on)
    return () => window.removeEventListener('message', on)
  }, [hosted])
  useEffect(() => {
    const on = (e) => { if (e.origin === window.location.origin && e.source === frame.current?.contentWindow && e.data?.type === 'roarlist:ready') setDrawn(true) }
    window.addEventListener('message', on)
    const t = setTimeout(() => setDrawn(true), 4000)
    return () => { window.removeEventListener('message', on); clearTimeout(t) }
  }, [])
  if (!supabase) return <p className="muted">RoarList needs the online database.</p>
  return (
    <div className={`roarme-page roardino-page roarlist-page${inOffice ? ' in-office' : ''}`}>
      {!drawn && <span className="roardino-wait" aria-label="Loading RoarList" />}
      {hosted && slot && createPortal(
        <div className="toolbar db-bar notes-bar">
          <div className="rem-search-wrap">
            <span className="rem-search-ico" aria-hidden="true">⌕</span>
            <input className="rem-search" type="search" placeholder="Search" value={q} onChange={(e) => { setQ(e.target.value); tell({ search: e.target.value }) }} />
          </div>
          {home?.canEdit && <Act icon="plus" label="New list" main onClick={() => tell({ create: true })} />}
        </div>, slot)}
      <iframe ref={frame} className={`roarme-frame roardino-frame${drawn ? ' on' : ''}`} src={`${import.meta.env.BASE_URL}roarlist/?embed=hub${hosted ? '&in=office' : ''}`} title="RoarList" allow="clipboard-write; clipboard-read" />
    </div>
  )
}
