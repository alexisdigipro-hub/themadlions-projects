import { useEffect, useState } from 'react'
import { useCurrentUser, useStore } from '../lib/store.jsx'
import { supabase } from '../lib/supabase.js'
import { fromOldOrdino, roardinoSrc, withLibrary } from '../lib/roardino.js'

/* Roardino in the hub (Alex, 23 Oct 2026): the ordino maker of themadlions.com/roardino, copied to roardino/ and
   working on the hub's database (supabase/roardino.sql) and its projects. It runs in a frame on the same address as
   the hub, so it is signed in as this member and needs nothing handed over. The side menu's Roardino shows every
   ordino; a project's Ordino tab (`project`) only that project's; the Overview's Ordino button (`see`) the project's
   ordino as the crew get it.

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
