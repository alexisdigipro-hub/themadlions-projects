import { useEffect, useRef, useState } from 'react'
import { Button, useToast } from './ui.jsx'
import { supabase } from '../lib/supabase.js'
import { SUPABASE_KEY, SUPABASE_URL } from '../lib/supabaseConfig.js'

/* Settings > My profile > RoarMe (Alex, 20 Oct: phase 1 of moving the chat onto RoarMe).
   Each member links their own RoarMe account. Connect opens RoarMe in a small window; the person signs in there
   and presses Approve; RoarMe hands back a one-time code (never a sign-in token), and the "roarme-link" Edge
   Function redeems it with RoarMe's server. See supabase/roarme_link.sql and supabase/functions/roarme-link. */

const ROARME_ORIGIN = 'https://alexisdigipro-hub.github.io'
const ROARME_APP = `${ROARME_ORIGIN}/roarme/`

async function call(action, body = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Sign in again.')
  const res = await fetch(`${SUPABASE_URL}/functions/v1/roarme-link`, {
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
