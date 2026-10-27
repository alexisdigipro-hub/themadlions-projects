import { useEffect, useRef, useState } from 'react'
import { useCurrentUser, useStore } from '../lib/store.jsx'
import { supabase } from '../lib/supabase.js'
import { fromOldOrdino, roardinoSrc, withLibrary } from '../lib/roardino.js'

/* Roardino in the hub (Alex, 23 Oct 2026): the ordino maker of themadlions.com/roardino, copied to roardino/ and
   working on the hub's database (supabase/roardino.sql) and its projects. It runs in a frame on the same address as
   the hub, so it is signed in as this member and needs nothing handed over. The side menu's Roardino shows every
   ordino; the Overview's Ordino button (`project` + `see`) the project's ordino as the crew get it, and only when
   the project has one. (`project` alone, one project's ordinos to edit, was the project's Ordino tab until it went.)

   The first time an administrator opens it, the old project ordinos (one per shoot day, in day.callSheet) are
   copied into Roardino, once (settings.roardinoMoved); the old data stays in the projects, unused. */

export async function moveOldOrdinos(state, update) {
  // nothing to move before the projects are in (it would be marked done with none moved)
  if (!supabase || state.settings?.roardinoMoved || !(state.projects || []).length) return 0
  const company = state.workspace?.name || 'THEMADLIONS'
  const rows = []
  for (const p of state.projects || []) {
    const project = withLibrary(p, state.library)
    for (const d of p.shootingDays || []) {
      if (!d.date) continue
      rows.push({ project_id: p.id, legacy_key: `${p.id}:${d.id}`, data: fromOldOrdino(project, d, company) })
    }
  }
  if (rows.length) {
    const { error } = await supabase.from('roardino_ordinos').upsert(rows, { onConflict: 'workspace_id,legacy_key', ignoreDuplicates: true })
    if (error) throw error
  }
  update((s) => { s.settings = { ...s.settings, roardinoMoved: new Date().toISOString() }; return s })
  return rows.length
}

/* the side menu's Roardino (Alex, 25 Oct: "it flickers and is slow to open"): Layout keeps this one frame alive
   from the first visit on and only hides it on the other pages, so going back to Roardino is instant; the frame
   fades in once Roardino has drawn (it says so with a 'roardino:ready' message), never half-drawn */
export function RoardinoFrame({ shown, inShare = false }) {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const admin = user?.role === 'admin'
  const [ready, setReady] = useState(!admin || !!state.settings?.roardinoMoved)
  const [note, setNote] = useState('')
  const [drawn, setDrawn] = useState(false)
  const frame = useRef(null)
  useEffect(() => {
    if (ready) return
    let off = false
    moveOldOrdinos(state, update)
      .catch((e) => { if (!off) setNote(e?.code === '42P01' ? 'Run supabase/roardino.sql in the Supabase SQL Editor to switch Roardino on.' : `The old ordinos were not moved yet: ${e?.message || e}`) })
      .finally(() => { if (!off) setReady(true) })
    return () => { off = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const on = (e) => { if (e.origin === window.location.origin && e.source === frame.current?.contentWindow && e.data?.type === 'roardino:ready') setDrawn(true) }
    window.addEventListener('message', on)
    // a frame that never says so is shown anyway after a moment
    const t = setTimeout(() => setDrawn(true), 4000)
    return () => { window.removeEventListener('message', on); clearTimeout(t) }
  }, [])
  // in Share (Alex, 27 Oct) the frame's home leaves its top row to Share's (roardino/app.js 'roardino:host')
  useEffect(() => {
    if (!drawn) return
    try { frame.current?.contentWindow?.postMessage({ type: 'roardino:host', share: inShare }, window.location.origin) } catch { /* not there yet */ }
  }, [drawn, inShare])
  if (!supabase) return shown ? <p className="muted">Roardino needs the online database.</p> : null
  return (
    <>
      {shown && note && <p className="small muted">{note}</p>}
      <div className={shown ? 'roarme-page roardino-page' : 'roardino-parked'} aria-hidden={!shown}>
        {!drawn && shown && <span className="roardino-wait" aria-label="Loading Roardino" />}
        {ready && <iframe ref={frame} className={`roarme-frame roardino-frame${drawn ? ' on' : ''}`} src={roardinoSrc({})} title="Roardino" allow="clipboard-write; web-share" />}
      </div>
    </>
  )
}
// the route itself draws nothing: Layout shows the frame above
export function RoardinoRoute() { return null }

export default function RoardinoPage({ project = '', see = false, className = '' }) {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const admin = user?.role === 'admin'
  // the frame waits for the move, so the old ordinos are there when it opens
  const [ready, setReady] = useState(!admin || !!state.settings?.roardinoMoved)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (ready) return
    let off = false
    moveOldOrdinos(state, update)
      .catch((e) => { if (!off) setNote(e?.code === '42P01' ? 'Run supabase/roardino.sql in the Supabase SQL Editor to switch Roardino on.' : `The old ordinos were not moved yet: ${e?.message || e}`) })
      .finally(() => { if (!off) setReady(true) })
    return () => { off = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!supabase) return <p className="muted">Roardino needs the online database.</p>
  return (
    <>
      {note && <p className="small muted">{note}</p>}
      <div className={`roarme-page roardino-page ${className}`}>
        {ready && <iframe className="roarme-frame" src={roardinoSrc({ project, see })} title="Roardino" allow="clipboard-write; web-share" />}
      </div>
    </>
  )
}
