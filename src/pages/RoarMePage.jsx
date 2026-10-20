import { useEffect, useRef } from 'react'
import { useCurrentUser } from '../lib/store.jsx'
import { supabase } from '../lib/supabase.js'
import { SUPABASE_KEY, SUPABASE_URL } from '../lib/supabaseConfig.js'

/* RoarMe inside the hub (Alex, 20 Oct: phase 4 of moving the chat onto RoarMe). The whole RoarMe app in the page,
   signed in as this member with no click: RoarMe in the frame asks for a one-time code ("roarme:need-signin" with its
   own state); this page gets one from the Edge Function roarme-signin for the signed-in member and hands it only to
   the frame, only at RoarMe's address. It also tells the frame which member this is, so a frame left signed in as
   someone else signs out and starts again (RoarMe's src/hubLink.jsx). */

const ROARME_ORIGIN = 'https://alexisdigipro-hub.github.io'
const ROARME_EMBED = `${ROARME_ORIGIN}/roarme/?embed=hub`
const STATE = /^[A-Za-z0-9_-]{24,64}$/

export default function RoarMePage() {
  const me = useCurrentUser()
  const frame = useRef(null)

  useEffect(() => {
    const send = (msg) => frame.current?.contentWindow?.postMessage(msg, ROARME_ORIGIN)
    const onMsg = async (e) => {
      if (e.origin !== ROARME_ORIGIN || !frame.current || e.source !== frame.current.contentWindow) return
      const m = e.data
      if (m?.type === 'roarme:ready') { if (me?.id) send({ type: 'roarme:hub-member', id: me.id }); return }
      if (m?.type !== 'roarme:need-signin' || !STATE.test(String(m.state || ''))) return
      try {
        const { data } = await supabase.auth.getSession()
        const token = data?.session?.access_token
        if (!token) throw new Error('Sign in to the hub again.')
        const res = await fetch(`${SUPABASE_URL}/functions/v1/roarme-signin`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'code', state: m.state }),
        })
        const out = await res.json().catch(() => null)
        if (!res.ok || !out?.code) throw new Error(out?.error || 'Could not sign you in to RoarMe.')
        send({ type: 'roarme:hub-code', state: m.state, code: out.code })
      } catch (err) {
        send({ type: 'roarme:hub-code', state: m.state, error: err.message })
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [me?.id])

  if (!supabase) return <p className="muted">RoarMe needs the online database.</p>
  return (
    <div className="roarme-page">
      <iframe
        ref={frame}
        className="roarme-frame"
        src={ROARME_EMBED}
        title="RoarMe"
        allow="camera; microphone; display-capture; clipboard-read; clipboard-write; fullscreen; autoplay"
      />
    </div>
  )
}
