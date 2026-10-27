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

/* The hub's look for RoarMe in the frame (Alex, 27 Oct: "it looks foreign"): the theme or skin's colours, light or
   dark, its backdrop and typeface, read off this page as Roardino does (roardino/app.js hubTheme). RoarMe sits at
   another address and cannot read them itself, so they go to it as a message, again whenever they change. */
function hubLook() {
  const html = document.documentElement
  const cs = window.getComputedStyle(html), bs = window.getComputedStyle(document.body)
  const v = (k) => cs.getPropertyValue(k).trim()
  const img = [cs, bs].map((x) => x.backgroundImage).find((x) => x && x !== 'none' && !x.includes('url('))
  const col = [bs, cs].map((x) => x.backgroundColor).find((x) => x && !/rgba\(0, 0, 0, 0\)|transparent/.test(x))
  return {
    light: html.dataset.theme === 'light',
    bg: v('--bg'), panel: v('--panel'), raised: v('--raised'), text: v('--text'), muted: v('--muted'),
    accent: v('--accent'), accentInk: v('--accent-ink'), danger: v('--danger'), ok: v('--ok'),
    glFill: v('--gl-fill'), glFill2: v('--gl-fill-2'), glEdge: v('--gl-edge'),
    font: v('--font'),
    fonts: [...document.querySelectorAll('link[rel="stylesheet"][href^="https://fonts.googleapis.com/"]')].map((l) => l.href),
    backdrop: img ? `${img}, ${col || v('--bg')}` : col || v('--bg'),
  }
}

export default function RoarMePage({ full = false }) {
  const me = useCurrentUser()
  const frame = useRef(null)

  useEffect(() => {
    const send = (msg) => frame.current?.contentWindow?.postMessage(msg, ROARME_ORIGIN)
    const onMsg = async (e) => {
      if (e.origin !== ROARME_ORIGIN || !frame.current || e.source !== frame.current.contentWindow) return
      const m = e.data
      if (m?.type === 'roarme:want-look') { send({ type: 'roarme:hub-look', look: hubLook() }); return }
      if (m?.type === 'roarme:ready') { if (me?.id) send({ type: 'roarme:hub-member', id: me.id }); send({ type: 'roarme:hub-look', look: hubLook() }); return }
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

  // Settings > Display changed (theme, skin, accent, typeface): send the new look. The hub writes a few sizes on its
  // root while it scrolls, so look at most once a frame and send only when the look itself changed.
  useEffect(() => {
    let last = JSON.stringify(hubLook()), queued = false
    const watch = new window.MutationObserver(() => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        const look = hubLook(), now = JSON.stringify(look)
        if (now === last) return
        last = now
        frame.current?.contentWindow?.postMessage({ type: 'roarme:hub-look', look }, ROARME_ORIGIN)
      })
    })
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-skin', 'data-accent', 'style', 'class'] })
    watch.observe(document.head, { childList: true })
    return () => watch.disconnect()
  }, [])

  if (!supabase) return <p className="muted">RoarMe needs the online database.</p>
  return (
    <div className={`roarme-page${full ? ' full' : ''}`}>
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
