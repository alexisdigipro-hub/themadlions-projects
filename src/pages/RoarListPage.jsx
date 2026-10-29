import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

/* RoarList in the hub (Alex, 27 Oct 2026): the shot list app of themadlions.com/roarlist, copied to roarlist/ and
   working on the hub's database (supabase/roarlist.sql) and its projects. It replaces the project's Shotlist tab.
   Like Roardino it runs in a frame on the hub's own address, so it is signed in as this member and needs nothing
   handed over; it fades in once it has drawn (it says so with a 'roarlist:ready' message), never half-drawn. */
export default function RoarListPage({ inOffice = false }) {
  const [drawn, setDrawn] = useState(false)
  const frame = useRef(null)
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
      <iframe ref={frame} className={`roarme-frame roardino-frame${drawn ? ' on' : ''}`} src={`${import.meta.env.BASE_URL}roarlist/?embed=hub`} title="RoarList" allow="clipboard-write; clipboard-read" />
    </div>
  )
}
