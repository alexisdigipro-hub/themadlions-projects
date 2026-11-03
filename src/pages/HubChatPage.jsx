import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

/* The hub's own chat (Alex, 1 Nov 2026): RoarMe's chat copied into the hub (hubchat/, its page hubchat.html), on the
   hub's database and the hub's sign-in. It runs in this frame on the hub's own address, so it reads the hub's saved
   sign-in and is signed in with no click; nothing is handed over but the hub's look. Its styles stay in its own page,
   apart from the hub's.

   The look: the hub's colours, light or dark, backdrop and typeface, read off this page and sent to the frame
   (the 'roarme:hub-look' message, a name kept from the copied code), again whenever they change. Only the frame
   on this same address hears them, and only messages from it are answered. A chat to open (#/chat?c=<chat>, or a
   message link #/chat?m=<chat>/<message>) goes to the frame in its address. */

const HERE = window.location.origin

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

const ID = /^[0-9a-f-]{36}$/

export default function HubChatPage({ full = false, settings = false, page = '' }) {
  const navigate = useNavigate()
  const frame = useRef(null)
  // the frame stays hidden until the chat wears the hub's look, then fades in: no white flash on the way in (Alex, 1 Nov)
  const [shown, setShown] = useState(false)
  const show = () => requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
  const { room: roomParam } = useParams()
  const [params] = useSearchParams()
  const c = params.get('c') || roomParam || ''
  const m = params.get('m') || ''
  // the frame's address is set once: a later chat to open goes to it as a message, so the frame is not reloaded
  const src = useMemo(() => {
    const [mr, mm] = m.split('/')
    const hash = ID.test(mr || '') && ID.test(mm || '') ? `#m=${mr}/${mm}` : ID.test(c) ? `#c=${c}` : ''
    // Settings > Chat: the chat's settings alone (hubchat/Chat.jsx SET_ONLY), opened at a page if one was asked for
    if (settings) return `./hubchat.html?set=1${/^[\w:-]{1,40}$/.test(page) ? `#set=${page}` : ''}`
    return `./hubchat.html${hash}`
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (ID.test(c)) frame.current?.contentWindow?.postMessage({ type: 'hubchat:open', room: c }, HERE)
  }, [c])

  useEffect(() => {
    const send = (msg) => frame.current?.contentWindow?.postMessage(msg, HERE)
    const onMsg = (e) => {
      if (e.origin !== HERE || !frame.current || e.source !== frame.current.contentWindow) return
      if (e.data?.type === 'roarme:want-look') { send({ type: 'roarme:hub-look', look: hubLook() }); show() }
      // the chat's settings are the hub's Settings > Chat (Alex, 3 Nov): Edit folders, ⌘/ and the like open them there
      if (e.data?.type === 'hubchat:settings') { const pg = String(e.data.page || ''); navigate(`/settings?tab=chat${/^[\w:-]{1,40}$/.test(pg) ? `&page=${pg}` : ''}`) }
    }
    window.addEventListener('message', onMsg)
    // a tapped chat notification (public/hubchat/sw.js) while the hub is open: that chat opens in the frame
    const sw = navigator.serviceWorker
    const onSw = (e) => { if (e.data?.type === 'hubchat:open' && ID.test(String(e.data.room || ''))) send({ type: 'hubchat:open', room: e.data.room }) }
    sw?.addEventListener('message', onSw)
    return () => { window.removeEventListener('message', onMsg); sw?.removeEventListener('message', onSw) }
  }, [])

  // Settings > Display changed (theme, skin, accent, typeface): send the new look, at most once a frame and only when
  // the look itself changed (the hub writes a few sizes on its root while it scrolls)
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
        frame.current?.contentWindow?.postMessage({ type: 'roarme:hub-look', look }, HERE)
      })
    })
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-skin', 'data-accent', 'style', 'class'] })
    watch.observe(document.head, { childList: true })
    return () => watch.disconnect()
  }, [])

  if (!supabase) return <p className="muted">The chat needs the online database.</p>
  return (
    <div className={`roarme-page hubchat-page${full ? ' full' : ''}${settings ? ' hubchat-settings' : ''}`}>
      <iframe
        ref={frame}
        className={`roarme-frame rm-chat${shown ? ' shown' : ''}`}
        src={src}
        title="Chat"
        onLoad={() => { frame.current?.contentWindow?.postMessage({ type: 'roarme:hub-look', look: hubLook() }, HERE); setTimeout(() => setShown(true), 1200) }}
        allow="camera; microphone; display-capture; clipboard-read; clipboard-write; fullscreen; autoplay"
      />
    </div>
  )
}
