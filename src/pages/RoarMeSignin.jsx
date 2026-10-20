import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useCurrentUser, useStore } from '../lib/store.jsx'
import { supabase } from '../lib/supabase.js'
import { SUPABASE_KEY, SUPABASE_URL } from '../lib/supabaseConfig.js'

/* "Sign in with THEMADLIONS Hub" in RoarMe lands here (Alex, 20 Oct: one account for the team, the hub's email and
   password). RoarMe sends #/roarme-signin?state=…; once signed in to the hub, this page asks the Edge Function
   roarme-signin for a one-time code and goes straight back to RoarMe with it. The code is good for 2 minutes, once,
   and only together with the state that RoarMe tab keeps; RoarMe's server checks it with the hub's server.
   Not signed in yet: the state waits in this tab while the usual sign-in runs (RequireUser brings us back here). */

export const ROARME_SIGNIN_KEY = 'tml-roarme-signin'
const ROARME_APP = 'https://alexisdigipro-hub.github.io/roarme/'
const STATE = /^[A-Za-z0-9_-]{24,64}$/

export const pendingRoarMeSignin = () => { try { const s = sessionStorage.getItem(ROARME_SIGNIN_KEY); return s && STATE.test(s) ? s : '' } catch { return '' } }

export default function RoarMeSignin() {
  const loc = useLocation()
  const user = useCurrentUser()
  const { ready } = useStore()
  const [err, setErr] = useState('')
  const fromUrl = new URLSearchParams(loc.search).get('state') || ''
  if (STATE.test(fromUrl)) { try { sessionStorage.setItem(ROARME_SIGNIN_KEY, fromUrl) } catch { /* private window */ } }
  const state = STATE.test(fromUrl) ? fromUrl : pendingRoarMeSignin()

  useEffect(() => {
    if (!ready || !user || !state || !supabase) return
    let alive = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const token = data?.session?.access_token
        if (!token) throw new Error('Sign in again.')
        const res = await fetch(`${SUPABASE_URL}/functions/v1/roarme-signin`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'code', state }),
        })
        const out = await res.json().catch(() => null)
        if (!res.ok || !out?.code) throw new Error(out?.error || 'Could not sign you in to RoarMe.')
        try { sessionStorage.removeItem(ROARME_SIGNIN_KEY) } catch { /* private window */ }
        // in the address's # part, so it is never sent to any server, not even RoarMe's host
        if (alive) window.location.replace(`${ROARME_APP}#hub_code=${out.code}&state=${encodeURIComponent(state)}`)
      } catch (e) {
        if (alive) setErr(e.message)
      }
    })()
    return () => { alive = false }
  }, [ready, user?.id, state]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!state) return <Navigate to="/" replace />
  if (ready && !user) return <Navigate to="/login" replace />
  return (
    <div className="login boot">
      <strong className="boot-name">THE<b>MAD</b>LIONS</strong>
      <p className="muted">{err || 'Signing you in to RoarMe…'}</p>
      {err && <a className="link" href={ROARME_APP}>Back to RoarMe</a>}
    </div>
  )
}
