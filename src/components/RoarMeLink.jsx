import { useEffect, useRef, useState } from 'react'
import { Button, useToast } from './ui.jsx'
import { useStore } from '../lib/store.jsx'
import { supabase } from '../lib/supabase.js'
import { SUPABASE_KEY, SUPABASE_URL } from '../lib/supabaseConfig.js'

/* Settings > My profile > RoarMe (Alex, 20 Oct: phase 1 of moving the chat onto RoarMe).
   Each member links their own RoarMe account. Connect opens RoarMe in a small window; the person signs in there
   and presses Approve; RoarMe hands back a one-time code (never a sign-in token), and the "roarme-link" Edge
   Function redeems it with RoarMe's server. See supabase/roarme_link.sql and supabase/functions/roarme-link. */

const ROARME_ORIGIN = 'https://alexisdigipro-hub.github.io'
const ROARME_APP = `${ROARME_ORIGIN}/roarme/`

async function call(action, body = {}, fn = 'roarme-link') {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Sign in again.')
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...body }),
  })
  let out = null
  try { out = await res.json() } catch { /* keep null */ }
  if (!res.ok || !out || out.error) throw new Error(out?.error || `The RoarMe link answered ${res.status}.`)
  return out
}

export default function RoarMeLink() {
  const toast = useToast()
  const [link, setLink] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const winRef = useRef(null)
  const stateRef = useRef('')

  useEffect(() => {
    if (!supabase) return
    call('status').then((r) => setLink(r.link || null)).catch(() => setLink(null))
  }, [])

  // RoarMe's answer: only from RoarMe's own address, only from the window we opened, only for the state we started
  useEffect(() => {
    const onMsg = async (e) => {
      if (e.origin !== ROARME_ORIGIN || !winRef.current || e.source !== winRef.current) return
      const m = e.data
      if (!m || m.type !== 'roarme:link' || !stateRef.current || m.state !== stateRef.current) return
      const state = stateRef.current
      stateRef.current = ''
      winRef.current = null
      if (m.cancelled || !m.code) { setBusy(false); return }
      try {
        const r = await call('finish', { state, code: String(m.code) })
        setLink(r.link)
        toast('RoarMe linked', 'ok')
      } catch (err) {
        toast(err.message, 'error')
      } finally {
        setBusy(false)
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [toast])

  const connect = async () => {
    setBusy(true)
    // the window opens at once (a browser blocks a window opened after a wait), then gets its address
    const w = window.open('about:blank', 'roarme-link', 'width=460,height=720')
    if (!w) { setBusy(false); toast('Allow pop-up windows for the hub, then press Connect again.', 'error'); return }
    try {
      const { state } = await call('start')
      stateRef.current = state
      winRef.current = w
      w.location.href = `${ROARME_APP}?link=hub&state=${encodeURIComponent(state)}`
      // if the person closes RoarMe's window without answering, Connect comes back
      const t = setInterval(() => { if (w.closed) { clearInterval(t); if (winRef.current === w) { winRef.current = null; stateRef.current = ''; setBusy(false) } } }, 800)
    } catch (err) {
      w.close()
      setBusy(false)
      toast(err.message, 'error')
    }
  }

  const disconnect = async () => {
    if (!window.confirm('Disconnect your RoarMe account from the hub?')) return
    setBusy(true)
    try { await call('unlink'); setLink(null); toast('RoarMe disconnected', 'ok') } catch (err) { toast(err.message, 'error') } finally { setBusy(false) }
  }

  if (!supabase) return null
  return (
    <section className="panel roarme-link">
      <h2>RoarMe</h2>
      {link === undefined ? (
        <p className="muted small">Checking…</p>
      ) : link ? (
        <>
          <p>Linked to <b>@{link.roar_username}</b>{link.roar_name ? ` (${link.roar_name})` : ''}.</p>
          <p className="fineprint">The hub knows this RoarMe account is yours. It never reads your RoarMe chats and never has your RoarMe password. You can also remove the link in RoarMe: Settings, Privacy and Security, Linked apps.</p>
          <div className="row-actions"><Button variant="ghost" onClick={disconnect} disabled={busy}>Disconnect</Button></div>
        </>
      ) : (
        <>
          <p>Link your RoarMe account to the hub. Soon the team chat moves to RoarMe, and the hub will put you in the chats of your projects.</p>
          <p className="fineprint">RoarMe opens in a small window: sign in there (or make an account) and press Approve. The hub never sees your RoarMe password.</p>
          <div className="row-actions"><Button variant="primary" onClick={connect} disabled={busy}>{busy ? 'Waiting for RoarMe…' : 'Connect RoarMe'}</Button></div>
        </>
      )}
    </section>
  )
}

/* Chat > a project's room > Members, administrators only (Alex, 20 Oct: phase 3, one switch per project).
   On: the project gets a RoarMe group, and the database keeps its members in step on every change that matters
   (supabase/roarme_sync.sql, Edge Function roarme-sync). Only people who linked their RoarMe account can be in it.
   Off, or the project deleted: everyone is taken out of the group. */
export function RoarMeProjectSwitch({ projectId, people }) {
  const { state, updateProject } = useStore()
  const toast = useToast()
  const project = state.projects.find((p) => p.id === projectId)
  const on = project?.roarme === true
  const [group, setGroup] = useState(null)
  const [linked, setLinked] = useState([])
  const [busy, setBusy] = useState(false)
  const load = async () => {
    const [{ data: g }, { data: l }] = await Promise.all([
      supabase.from('roarme_groups').select('*').eq('project_id', projectId).maybeSingle(),
      supabase.from('roarme_links').select('user_id, roar_username'),
    ])
    setGroup(g || null)
    setLinked(l || [])
  }
  useEffect(() => { if (supabase) load() }, [projectId, on]) // eslint-disable-line react-hooks/exhaustive-deps
  // the group is made in the background a moment after the switch is saved: look again shortly after
  useEffect(() => {
    if (!supabase) return undefined
    const t = setTimeout(load, 4000)
    return () => clearTimeout(t)
  }, [on]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!supabase || !project) return null
  const linkedIds = new Set(linked.map((l) => l.user_id))
  const inGroup = people.filter((p) => linkedIds.has(p.id))
  const notLinked = people.filter((p) => !linkedIds.has(p.id))
  const syncNow = async () => {
    setBusy(true)
    try {
      const r = await call('run', {}, 'roarme-sync')
      const mine = (r.projects || []).find((x) => x.project_id === projectId)
      if (mine?.error) toast(mine.error, 'error'); else toast('RoarMe group up to date', 'ok')
      await load()
    } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  return (
    <div className="roarme-switch">
      <div className="roarme-switch-row">
        <span><strong>RoarMe group</strong><span className="small muted">{on ? 'On: this project has a group chat in RoarMe.' : 'Off: no RoarMe group for this project.'}</span></span>
        <Button size="sm" variant={on ? 'ghost' : 'primary'} onClick={() => updateProject(projectId, (p) => { p.roarme = !on })}>{on ? 'Turn off' : 'Turn on'}</Button>
      </div>
      {on && (
        <>
          <p className="small muted">
            In the group: {inGroup.length ? inGroup.map((p) => p.name).join(', ') : 'nobody yet'}.
            {notLinked.length > 0 && ` Not linked to RoarMe yet, so not in it: ${notLinked.map((p) => p.name).join(', ')} (Settings > My profile > RoarMe).`}
          </p>
          {group?.last_error && <p className="small error">Last sync failed: {group.last_error}</p>}
          <div className="row-actions">
            <span className="small muted">{group?.synced_at ? `Synced ${new Date(group.synced_at).toLocaleString()}` : 'Not synced yet'}</span>
            <Button size="sm" variant="ghost" onClick={syncNow} disabled={busy}>{busy ? 'Syncing…' : 'Sync now'}</Button>
          </div>
        </>
      )}
      <p className="fineprint">The people in the RoarMe group follow this list: whoever is taken out here, loses access to the project or leaves the team is taken out of the RoarMe group too.</p>
    </div>
  )
}
