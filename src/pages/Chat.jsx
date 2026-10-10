import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Confirm, Field, Input, Modal, useIsMobile, useToast } from '../components/ui.jsx'
import { canAccessProject, canSendNotices, today as todayISO, uid, useCurrentUser, useStore, whenMs } from '../lib/store.jsx'
import { addDays, fmtDate } from '../lib/dates.js'
import { SendNoticeModal, SentNotices, sendAutoNotice } from '../components/Notices.jsx'
import { deleteFile, fileIcon, fileUrl, fmtBytes, uploadFile } from '../lib/files.js'
import { compress } from '../lib/photos.js'
import { canCompressVideo, compressVideo, isVideoFile, mediaSize, prepareVideo, releaseVideo } from '../lib/videoCompress.js'
import { pcloudBlob, pcloudOn } from '../lib/pcloud.js'
import { remote, supabase } from '../lib/supabase.js'
import { chimeFor, loadChatPrefs, loadMuted, textSizeOf, toggleMuted } from '../lib/chatPrefs.js'
import ChatSettings from '../components/ChatSettings.jsx'
import { NotoEmoji, emojiParts } from '../components/NotoEmoji.jsx'
import Profile from './Profile.jsx'
import { useCalls } from '../lib/calls.jsx'
import * as C from '../lib/chat.js'

/*
  Chat, Telegram-style. Left: the rooms (team, one per project that switched it on, groups made
  by administrators, direct conversations), under folder tabs the person makes for themselves.
  Right: the room, with replies, edits, photos and files, and @mentions. On a phone the two are
  separate screens. The same room component is the Chat tab inside a project.
*/

const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const dayOf = (iso) => (iso || '').slice(0, 10)
const dayLabel = (d) => {
  const t0 = todayISO()
  return d === t0 ? 'Today' : d === addDays(t0, -1) ? 'Yesterday' : fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })
}
const listTime = (iso) => {
  if (!iso) return ''
  const d = dayOf(iso)
  return d === todayISO() ? timeOf(iso) : fmtDate(d, { day: 'numeric', month: 'short' })
}
const isImage = (a) => (a?.type || '').startsWith('image/')
const isVideo = (a) => (a?.type || '').startsWith('video/')
const MAX_BYTES = 50 * 1024 * 1024
// a video is shrunk before it goes up, so a bigger one may be picked (it must end up under 50 MB)
const MAX_VIDEO_PICK = 2 * 1024 * 1024 * 1024
const isAudio = (a) => (a?.type || '').startsWith('audio/')
const isMedia = (a) => isImage(a) || isVideo(a)
// Telegram's reaction bar; 🎥 first, Alex's camera instead of the heart (double tap gives it)
// the emoji button beside the box on a computer (a phone has them on its keyboard)
const EMOJIS = ['😀', '😂', '🥹', '😍', '🥰', '😘', '😎', '🤩', '🤔', '🙄', '😴', '😭', '😡', '🤯', '🥳', '😇', '🙏', '👍', '👎', '👏', '🙌', '💪', '🤝', '👌', '✌️', '🤞', '❤️', '🔥', '✨', '🎉', '💯', '✅', '❌', '⚠️', '🎬', '🎥', '📸', '🎞️', '🎤', '🎧', '💡', '📍', '⏰', '🍕', '☕', '🍻', '🚗', '✈️']
const REACTIONS = ['🎥', '❤️', '👍', '🔥', '🏆', '👏', '😂']
/* A message's reactions, with the old 🎥 likes (before chat_reactions.sql) counted as 🎥. */
const reactionsOf = (m) => {
  const r = {}
  Object.entries(m.reactions || {}).forEach(([k, v]) => { if (Array.isArray(v) && v.length) r[k] = [...v] })
  const legacy = (m.likes || []).filter((id) => !Object.values(r).some((v) => v.includes(id)))
  if (legacy.length) r['🎥'] = [...(r['🎥'] || []), ...legacy]
  return r
}
/* One to three emoji and nothing else: shown large, without a bubble (Telegram's Large Emoji). */
const isEmojiOnly = (t) => {
  const x = (t || '').trim()
  if (!x || x.length > 40 || !/^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\u200d|\ufe0f|\s)+$/u.test(x) || /^[\d#*\s]+$/.test(x)) return false
  const n = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter().segment(x.replace(/\s+/g, ''))].length : x.replace(/\s+/g, '').length / 2
  return n >= 1 && n <= 3
}
const myReaction = (m, me) => Object.entries(reactionsOf(m)).find(([, v]) => v.includes(me))?.[0] || ''
const attLabel = (a) => (isImage(a) ? 'Photo' : isVideo(a) ? 'Video' : isAudio(a) ? 'Voice message' : a.name)
/* A colour per sender for their name inside group bubbles, stable for the same person. */
const SENDER_HUES = [14, 36, 95, 160, 200, 230, 275, 320]
const senderHue = (id) => { let h = 0; for (const c of String(id || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return SENDER_HUES[h % SENDER_HUES.length] }
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/* A new conversation with one person is written to the database with its first message, but a
   photo or video goes up before the message, and the upload checks that you belong to the
   conversation: so it is written first (Alex, 8 Oct: "You cannot upload there." on a first video). */
async function saveDirectRoom(state, room, userId) {
  if (!remote || !room.unsaved) return
  const { error } = await supabase.from('chats').upsert({ id: room.id, workspace_id: state.workspace.id, kind: 'direct', name: '', members: room.members, created_by: userId || null }, { ignoreDuplicates: true })
  if (error) throw new Error(error.message)
}

/* pCloud folder for a room's files: a project's room under the project, the rest under Chat. */
function chatFolder(state, room) {
  if (room.kind === 'project') return [state.projects.find((p) => p.id === room.projectId)?.title || room.name, 'Chat']
  if (room.kind === 'team') return ['Chat', room.name]
  if (room.kind === 'group') return ['Chat', room.name]
  const names = (room.members || []).map((id) => state.users.find((u) => u.id === id)?.name || '?').sort()
  return ['Chat', 'Direct', names.join(' & ')]
}

/* Settings > Chat, live: the page re-reads them when Settings saves. */
function useChatPrefs() {
  const [prefs, setPrefs] = useState(loadChatPrefs)
  useEffect(() => {
    const h = () => setPrefs(loadChatPrefs())
    window.addEventListener('tml-chat-prefs', h)
    return () => window.removeEventListener('tml-chat-prefs', h)
  }, [])
  return prefs
}

/* Signed links for attachments, remembered for the session so a long thread does not ask the server once per picture. */
const urlCache = new Map()
function useAttachmentUrl(a) {
  const [url, setUrl] = useState(() => urlCache.get(a?.id)?.url || '')
  const [failed, setFailed] = useState(false)
  const [round, setRound] = useState(0)
  useEffect(() => {
    if (!a) return undefined
    const hit = urlCache.get(a.id)
    if (hit && hit.until > Date.now()) { setUrl(hit.url); return undefined }
    let on = true
    let timer = null
    setFailed(false)
    // a pCloud link is refused until the message row that names the file is written, which can
    // be a while after the bubble appears on a slow phone line: ask again, a little later each
    // time, for about a minute, then offer a tap to try again (Alex, 8 Oct: a video stayed "…")
    const ask = (n) => fileUrl(a).then((u) => {
      if (!on) return
      if (u) { urlCache.set(a.id, { url: u, until: Date.now() + 50 * 60 * 1000 }); setUrl(u) }
      else if (a.fileid && n < 8) timer = setTimeout(() => ask(n + 1), Math.min(1500 * (n + 1), 10000))
      else { setUrl(''); setFailed(true) }
    })
    ask(0)
    return () => { on = false; clearTimeout(timer) }
  }, [a?.id, round])
  return [url, failed, () => setRound((r) => r + 1)]
}

/* Line icons for the phone's chat, Telegram-like. */
const svgProps = { viewBox: '0 0 24 24', width: 24, height: 24, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
/* A conversation on a phone slides left under the finger to show Mute / Delete / Archive behind it,
   like Telegram (Alex, 9 Oct). Past half the actions it stays open; a tap anywhere else, or a slide
   back, closes it. Only one row is open at a time (openId lives in the list). The row's own tap
   still opens the conversation, unless the finger was sliding. */
const SWIPE_W = 228
function SwipeRow({ id, openId, setOpenId, actions, children }) {
  const [dx, setDx] = useState(0)
  const [drag, setDrag] = useState(false)
  const t = useRef(null) // { x, y, base, dir }
  const slid = useRef(false)
  const open = openId === id
  useEffect(() => { if (!open && !drag) setDx(0) }, [open, drag])
  const start = (e) => {
    const p = e.touches[0]
    t.current = { x: p.clientX, y: p.clientY, base: open ? -SWIPE_W : 0, dir: '' }
    slid.current = false
  }
  const move = (e) => {
    const s = t.current
    if (!s) return
    const p = e.touches[0]
    const mx = p.clientX - s.x
    const my = p.clientY - s.y
    if (!s.dir) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return
      s.dir = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
      if (s.dir === 'x') { setDrag(true); slid.current = true; if (openId && !open) setOpenId(null) }
    }
    if (s.dir !== 'x') return
    setDx(Math.max(-SWIPE_W - 30, Math.min(0, s.base + mx)))
  }
  const end = () => {
    const s = t.current
    t.current = null
    if (!s || s.dir !== 'x') return
    setDrag(false)
    const stay = dx < -SWIPE_W / 2
    setDx(stay ? -SWIPE_W : 0)
    setOpenId(stay ? id : null)
  }
  // a slide is not a tap; and while another row is open, a tap only closes it
  const clickCapture = (e) => {
    if (slid.current || (openId && !e.target.closest('.chat-swipe-acts'))) {
      e.preventDefault()
      e.stopPropagation()
      slid.current = false
      if (openId) setOpenId(null)
    }
  }
  return (
    <div className={`chat-swipe${drag ? ' dragging' : ''}${open ? ' open' : ''}`} onTouchStart={start} onTouchMove={move} onTouchEnd={end} onTouchCancel={end} onClickCapture={clickCapture}>
      {/* the actions fill exactly the room the row leaves, so nothing shows through a see-through row */}
      <div className="chat-swipe-acts" style={{ width: Math.max(0, -dx) }} aria-hidden={!open}>
        {actions.map((a) => (
          <button key={a.label} type="button" className={`chat-swipe-act ${a.tone}`} tabIndex={open ? 0 : -1} onClick={() => { setOpenId(null); a.run() }}>
            <span className="chat-swipe-ico">{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>
      <div className="chat-swipe-row" style={{ transform: dx ? `translateX(${dx}px)` : undefined }}>{children}</div>
    </div>
  )
}

const TgIcon = {
  back: () => <svg {...svgProps}><path d="M15 5l-7 7 7 7" /></svg>,
  phone: () => <svg {...svgProps}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" /></svg>,
  video: () => <svg {...svgProps}><path d="m22 8-6 4 6 4V8Z" /><rect x="2" y="6" width="14" height="12" rx="2" /></svg>,
  clip: () => <svg {...svgProps}><path d="M21 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.9-8.9a3.7 3.7 0 0 1 5.2 5.2l-8.9 8.9a1.8 1.8 0 0 1-2.6-2.6l8.2-8.2" /></svg>,
  project: () => <svg {...svgProps}><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 10h18M8 5V3M16 5V3" /></svg>,
  person: () => <svg {...svgProps}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>,
  reply: () => <svg {...svgProps}><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>,
  edit: () => <svg {...svgProps}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
  trash: () => <svg {...svgProps}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>,
  folder: () => <svg {...svgProps}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>,
  folderPlus: () => <svg {...svgProps}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M12 10.5v5M9.5 13h5" /></svg>,
  plus: () => <svg {...svgProps}><path d="M12 5v14M5 12h14" /></svg>,
  image: () => <svg {...svgProps}><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></svg>,
  camera: () => <svg {...svgProps}><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13.5" r="3.5" /></svg>,
  file: () => <svg {...svgProps}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /></svg>,
  expand: () => <svg {...svgProps}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>,
  copy: () => <svg {...svgProps}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>,
  download: () => <svg {...svgProps}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>,
  pin: () => <svg {...svgProps}><path d="M9 4h6l-1 6 3 3v1H7v-1l3-3-1-6ZM12 14v6" /></svg>,
  forward: () => <svg {...svgProps}><path d="M15 5l6 6-6 6" /><path d="M21 11H11a7 7 0 0 0-7 7v1" /></svg>,
  select: () => <svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" /></svg>,
  popout: () => <svg {...svgProps}><rect x="3" y="7" width="14" height="14" rx="2" /><path d="M10 3h11v11M21 3l-9 9" /></svg>,
  chats: () => <svg {...svgProps}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></svg>,
  gear: () => <svg {...svgProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>,
  search: () => <svg {...svgProps}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>,
  more: () => <svg {...svgProps}><circle cx="5" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="19" cy="12" r="1.3" fill="currentColor" /></svg>,
  mic: () => <svg {...svgProps}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>,
  smile: () => <svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" /></svg>,
  sticker: () => <svg {...svgProps}><path d="M21 12a9 9 0 1 0-9 9" /><path d="M21 12c-5 0-9 4-9 9" /></svg>,
  bell: () => <svg {...svgProps}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>,
  media: () => <svg {...svgProps}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  translate: () => <svg {...svgProps}><path d="M4 5h9M8.5 3v2M6 5c.5 3 2.5 5.5 5 7M11 5c-.7 3.4-3 6.4-7 8" /><path d="M13 21l4.5-10L22 21M14.5 17.5h6" /></svg>,
  link: () => <svg {...svgProps}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>,
  replies: () => <svg {...svgProps}><path d="M9 14L4 9l5-5" /><path d="M4 9h9a7 7 0 0 1 7 7v3" /></svg>,
  close: () => <svg {...svgProps}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  people: () => <svg {...svgProps}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.1.8 3.5 2.8 3.5 5.7" /></svg>,
}

/* My profile at the top of TML Chat's Settings, as in Settings in the app (Alex, 10 Oct): your photo,
   name and position; a tap folds the profile form open under it, a second tap folds it away. */
function MyProfileRow() {
  const user = useCurrentUser()
  const [open, setOpen] = useState(false)
  if (!user) return null
  const p = user.profile || {}
  return (
    <section className="cset-group chat-me">
      <h3>My profile</h3>
      <div className="cset-card">
        <button type="button" className="chat-me-row" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <RoomAvatar room={{ kind: 'direct', photo: p.thumb || p.photo || '', initials: (user.name || '?').split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase() }} size={48} />
          <span className="chat-rmain"><strong>{user.name}</strong><span className="chat-rprev">{p.position || user.email}</span></span>
          <span className="chat-me-go" aria-hidden="true">{open ? '⌄' : '›'}</span>
        </button>
      </div>
      {open && <div className="chat-me-form"><Profile mine embedded /></div>}
    </section>
  )
}

function RoomAvatar({ room, size = 42 }) {
  const style = { width: size, height: size, ...(room.color ? { '--rc': room.color } : {}) }
  return (
    <span className={`chat-ravatar ${room.kind}${room.logo && room.photo ? ' logo' : ''}`} style={style}>
      {room.photo ? <img src={room.photo} alt="" /> : room.initials || '?'}
    </span>
  )
}

/* A tiny picture of a photo or of a video's first frame, kept in the message as a data URL
   (a few hundred bytes) and shown blurred under a spinner while the real file loads. */
async function tinyThumb(file) {
  let url = ''
  try {
    let src
    if (file.type.startsWith('image/')) src = await createImageBitmap(file)
    else {
      url = URL.createObjectURL(file)
      const v = document.createElement('video')
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url
      await new Promise((resolve, reject) => { v.onloadeddata = resolve; v.onerror = reject; setTimeout(reject, 3000) })
      src = v
    }
    const w = src.videoWidth || src.width
    const h = src.videoHeight || src.height
    if (!w || !h) return ''
    const k = 24 / Math.max(w, h)
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k))
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.6)
  } catch {
    return ''
  } finally {
    if (url) URL.revokeObjectURL(url)
  }
}

/* A message picked in the list's search: the room opens and scrolls to it. */
let pendingJump = ''
let linkJumped = ''
/* Android's own "Install app" prompt, kept for the chat window's Install button. */
let installPrompt = null
if (typeof window !== 'undefined') window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e })
const isStandalone = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)
// chat.html: the page TML Chat is added to the home screen from, and opens on (see chat.html)
const onChatPage = () => typeof window !== 'undefined' && /chat\.html$/.test(window.location.pathname)
const chatPageUrl = (q = '') => `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}chat.html${q}#/chat-window`

/* Where the chat lives: /chat inside the app, /chat-window when it has a window of its own. */
const ChatBase = createContext('/chat')
const useChatBase = () => useContext(ChatBase)
const roomPath = (base, id) => `${base}/${encodeURIComponent(id)}`

/* The chat alone in a window of its own (the ⧉ button on the list), like Telegram's app: no side
   menu, the list with Chats / People / Settings at its foot, the conversation beside it. */
export function ChatWindow() {
  const { state } = useStore()
  const user = useCurrentUser()
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('chat-window')
    const title = document.title
    document.title = `Chat · ${state.workspace?.name || 'THE MAD LIONS'}`
    // added to a phone's home screen from here, it is an app of its own that opens straight on the chat
    const link = document.querySelector('link[rel="manifest"]')
    const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    const touch = document.querySelector('link[rel="apple-touch-icon"]')
    const was = [link?.getAttribute('href'), meta?.getAttribute('content'), touch?.getAttribute('href')]
    link?.setAttribute('href', './manifest-chat.webmanifest')
    meta?.setAttribute('content', 'TML Chat')
    // TML Chat's own icon: the logo inside a chat bubble, in Glass dark's colours (Alex, 9 Oct)
    touch?.setAttribute('href', './icons/chat-apple-touch-icon.png')
    // an install offer caught on the main app's page is for the main app, not for TML Chat
    if (!onChatPage()) installPrompt = null
    return () => {
      root.classList.remove('chat-window'); document.title = title
      if (link && was[0]) link.setAttribute('href', was[0])
      if (meta && was[1]) meta.setAttribute('content', was[1])
      if (touch && was[2]) touch.setAttribute('href', was[2])
    }
  }, [])
  // the same tone the app plays, as this window may be the only one open
  const seen = useRef(null)
  useEffect(() => {
    const list = state.chat || []
    const latest = list.reduce((a, m) => Math.max(a, whenMs(m.createdAt)), 0)
    if (seen.current === null) { seen.current = latest; return }
    if (latest > seen.current) {
      const fresh = list.filter((m) => whenMs(m.createdAt) > seen.current && m.userId && m.userId !== user?.id)
      const openRoom = decodeURIComponent((window.location.hash.match(/#\/chat-window\/([^?]+)/) || [])[1] || 'team')
      chimeFor(fresh, openRoom)
    }
    seen.current = latest
  }, [state.chat])
  return (
    <ChatBase.Provider value="/chat-window">
      <div className="chat-win"><Chat windowed /></div>
    </ChatBase.Provider>
  )
}

/* ---------- the page ---------- */
export default function Chat({ windowed = false }) {
  const { room: roomParam } = useParams()
  const prefs = useChatPrefs()
  // a message link (Copy Message Link): #/chat/<room>?m=<message>
  const mParam = new URLSearchParams(useLocation().search).get('m')
  if (mParam && linkJumped !== mParam) { linkJumped = mParam; pendingJump = mParam }
  const { state } = useStore()
  const user = useCurrentUser()
  const mobile = useIsMobile()
  const nav = useNavigate()
  const base = useChatBase()
  const active = roomParam || (mobile ? '' : C.TEAM)
  const room = active ? C.roomOf(state, user, active) : null
  useEffect(() => { if (roomParam && !room) nav(base, { replace: true }) }, [roomParam, !!room])
  return (
    <div className={`chat-page chat2 ${active ? 'has-room' : ''}${windowed ? ' windowed' : ''}`} data-chat-theme={prefs.theme && prefs.theme !== 'accent' ? prefs.theme : undefined}>
      {(!mobile || !active) && <RoomList activeId={active} windowed={windowed} />}
      {(!mobile || active) && (room ? <ChatRoom key={room.id} room={room} onBack={mobile ? () => nav(base) : undefined} /> : <div className="chat-box chat-none muted">Pick a conversation</div>)}
    </div>
  )
}

/* On a phone, in the chat's own window: how to keep it on the home screen as an app of its own
   (Alex, 8 Oct). The first time the steps to add it; once it is there (the browser said so, or he
   tapped "I added it") a reminder that the icon opens it: neither iPhone nor Android lets a web
   page start an app on the home screen, so the pop button cannot jump into it. Inside the main
   app on the home screen there is no Share button, so the steps start with opening Safari. */
const APP_KEY = 'tml_chat_app'
const chatAppAdded = () => { try { return localStorage.getItem(APP_KEY) === '1' } catch { return false } }
const markChatApp = (on) => { try { if (on) localStorage.setItem(APP_KEY, '1'); else localStorage.removeItem(APP_KEY) } catch {} }
if (typeof window !== 'undefined') window.addEventListener('appinstalled', () => { if (window.location.hash.includes('/chat-window')) markChatApp(true) })

function InstallHint() {
  const [open, setOpen] = useState(() => {
    try {
      // opened in Safari from the main home-screen app ("Open in Safari"): show the steps here, and
      // take the mark off the address so the icon added from this page does not show them again
      if (window.location.search.includes('install=chat')) {
        if (!isStandalone()) sessionStorage.setItem('tml_install_hint', '1')
        window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      }
      return !!sessionStorage.getItem('tml_install_hint')
    } catch { return false }
  })
  const [added, setAdded] = useState(chatAppAdded)
  const toast = useToast()
  // the TML Chat app itself, opened from its icon, starts with a fresh sessionStorage: nothing shown
  if (!open) return null
  const close = () => { try { sessionStorage.removeItem('tml_install_hint') } catch {} setOpen(false) }
  const done = () => { markChatApp(true); close() }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /macintosh/i.test(navigator.userAgent))
  const inApp = isStandalone() // inside the main app on the home screen
  const link = chatPageUrl('?install=chat')
  const install = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const r = await installPrompt.userChoice.catch(() => null)
    installPrompt = null
    if (r?.outcome === 'accepted') done()
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast('Link copied', 'ok') } catch { toast(link, 'info') }
  }
  let body
  if (added) {
    body = (
      <>
        <strong>TML Chat is on your home screen</strong>
        <p>Open it from its icon. {ios ? 'The iPhone' : 'The phone'} does not let a page open an app, so this button shows the chat here instead.</p>
        <div className="chat-install-acts">
          <Button size="sm" variant="primary" onClick={close}>OK</Button>
          <Button size="sm" variant="ghost" onClick={() => { markChatApp(false); setAdded(false) }}>It is not there</Button>
        </div>
      </>
    )
  } else if (inApp) {
    body = (
      <>
        <strong>Make TML Chat an app of its own</strong>
        <p>Apps on the home screen are added from {ios ? 'Safari' : 'Chrome'}. Open the chat there, then follow the steps it shows.</p>
        <div className="chat-install-acts">
          {ios && <a className="btn btn-primary btn-sm" href={`x-safari-${link}`} onClick={() => { try { sessionStorage.removeItem('tml_install_hint') } catch {} }}>Open in Safari</a>}
          <Button size="sm" variant={ios ? 'ghost' : 'primary'} onClick={copy}>Copy the link</Button>
        </div>
      </>
    )
  } else if (!ios && installPrompt) {
    body = (
      <>
        <strong>Make TML Chat an app of its own</strong>
        <p>An icon on your home screen that opens straight on the chat, without the rest of the app.</p>
        <div className="chat-install-acts"><Button size="sm" variant="primary" onClick={install}>Add to home screen</Button></div>
      </>
    )
  } else {
    body = (
      <>
        <strong>Make TML Chat an app of its own</strong>
        {ios ? (
          <ol>
            <li>Tap <b>Share</b> <span className="chat-install-ico">⬆︎</span> in Safari (on newer iPhones it is under <b>⋯</b> at the bottom).</li>
            <li>Tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>
          </ol>
        ) : (
          <ol>
            <li>Open the browser's menu <b>⋮</b>.</li>
            <li>Tap <b>Add to Home screen</b> or <b>Install app</b>.</li>
          </ol>
        )}
        <p className="chat-install-after">From then on the <b>TML Chat</b> icon opens straight on the chat.</p>
        <div className="chat-install-acts"><Button size="sm" variant="primary" onClick={done}>I added it</Button></div>
      </>
    )
  }
  return (
    <div className="chat-install">
      <button type="button" className="chat-install-x" onClick={close} aria-label="Close">{TgIcon.close()}</button>
      {body}
    </div>
  )
}

/* ---------- Calls, the tab at the foot of the list (Alex, 8 Oct) ----------
   Everyone in the team with a voice and a video button, and the recent calls, read from the lines
   lib/calls.jsx writes into one-to-one conversations ("📞 Voice call · 3:12", "📞 Missed voice
   call"): outgoing when you wrote it, incoming otherwise. A tap on a recent call calls back. */
const CALL_LINE = /^(📞|🎥) /
function CallsPanel() {
  const { state } = useStore()
  const user = useCurrentUser()
  const calls = useCalls()
  const mobile = useIsMobile()
  const [q, setQ] = useState('')
  if (!user) return null
  const needle = q.trim().toLowerCase()
  const people = (state.users || [])
    .filter((u) => u.active !== false && u.id !== user.id && (!needle || (u.name || '').toLowerCase().includes(needle)))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  const roomWith = (otherId) => C.roomOf(state, user, C.directRoom(user.id, otherId))
  const recent = needle ? [] : (state.chat || [])
    .filter((m) => (m.chatId || '').startsWith('d:') && m.chatId.slice(2).split(':').includes(user.id) && CALL_LINE.test(m.text || ''))
    .sort((a, b) => whenMs(b.createdAt) - whenMs(a.createdAt))
    .slice(0, 30)
  const size = mobile ? 50 : 44
  const callBtns = (room) => (
    <span className="chat-call-acts">
      <button type="button" className="icon-btn chat-head-ico" onClick={() => calls.start(room, false)} disabled={calls.busy} aria-label={`Voice call ${room.name}`} title="Voice call">{TgIcon.phone()}</button>
      <button type="button" className="icon-btn chat-head-ico" onClick={() => calls.start(room, true)} disabled={calls.busy} aria-label={`Video call ${room.name}`} title="Video call">{TgIcon.video()}</button>
    </span>
  )
  return (
    <div className="chat-win-settings chat-calls">
      <h2>Calls</h2>
      <div className="chat-search"><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" name="call-search" autoComplete="off" /></div>
      {recent.length > 0 && (
        <>
          <p className="chat-hits-title">Recent</p>
          {recent.map((m) => {
            const otherId = m.chatId.slice(2).split(':').find((x) => x !== user.id) || user.id
            const room = roomWith(otherId)
            if (!room) return null
            const out = m.userId === user.id
            const missed = /Missed/.test(m.text)
            const video = m.text.startsWith('🎥')
            const what = missed ? (out ? 'No answer' : 'Missed') : (m.text.split('·')[1] || '').trim()
            return (
              <div key={m.id} className="chat-call-row">
                <RoomAvatar room={room} size={size} />
                <span className="chat-rmain">
                  <strong className={missed && !out ? 'missed' : ''}>{room.name}</strong>
                  <small>{out ? '↗' : '↙'} {video ? 'Video' : 'Voice'}{what ? ` · ${what}` : ''} · {listTime(m.createdAt)}</small>
                </span>
                <span className="chat-call-acts">
                  <button type="button" className="icon-btn chat-head-ico" onClick={() => calls.start(room, video)} disabled={calls.busy} aria-label={`Call ${room.name} back`} title="Call back">{video ? TgIcon.video() : TgIcon.phone()}</button>
                </span>
              </div>
            )
          })}
        </>
      )}
      <p className="chat-hits-title">{needle ? 'People' : 'Everyone'}</p>
      {!people.length && <p className="muted small">Nobody found.</p>}
      {people.map((u) => {
        const room = roomWith(u.id)
        if (!room) return null
        return (
          <div key={u.id} className="chat-call-row">
            <RoomAvatar room={room} size={size} />
            <span className="chat-rmain"><strong>{u.name}</strong>{u.profile?.position && <small>{u.profile.position}</small>}</span>
            {callBtns(room)}
          </div>
        )
      })}
    </div>
  )
}

/* ---------- the list ---------- */
function RoomList({ activeId, windowed }) {
  const { state, update } = useStore()
  const prefs = useChatPrefs()
  const user = useCurrentUser()
  const nav = useNavigate()
  const base = useChatBase()
  const mobile = useIsMobile()
  const isAdmin = user?.role === 'admin'
  const [tab, setTab] = useState('chats') // the window's foot: chats | settings
  const [installCard, setInstallCard] = useState(0) // the TML Chat card, shown in the list (main home-screen app)
  const toast = useToast()
  const searchRef = useRef(null)
  // ⌘K / Ctrl+K: the search above the list, as in Telegram
  useEffect(() => {
    if (mobile) return undefined
    const k = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setTab('chats'); requestAnimationFrame(() => searchRef.current?.focus()) } }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [mobile])
  const popOut = () => {
    // on a phone: the chat on its own, ready to be added to the home screen as an app
    // on a phone: chat.html, the chat's own page, so that Add to Home Screen adds TML Chat and not
    // the whole app (the iPhone reads the page's app name and manifest when it loads)
    // Inside the main app on the home screen the card shows right here: chat.html would open inside
    // that app with no way back to the rest of it, and Add to Home Screen is only in Safari there.
    if (mobile) {
      try { sessionStorage.setItem('tml_install_hint', '1') } catch {}
      if (isStandalone()) setInstallCard((n) => n + 1)
      else window.location.assign(chatPageUrl())
      return
    }
    const url = `${window.location.origin}${window.location.pathname}#${roomPath('/chat-window', activeId || C.TEAM)}`
    const w = window.open(url, 'tml-chat', 'popup,width=1180,height=820')
    if (!w) window.location.hash = roomPath('/chat-window', activeId || C.TEAM)
  }
  const canNotice = canSendNotices(state, user)
  const [folderId, setFolderId] = useState(() => { try { return localStorage.getItem('tml_chat_folder') || 'all' } catch { return 'all' } })
  const [q, setQ] = useState('')
  const [readMap, setReadMap] = useState(C.loadRead)
  const [group, setGroup] = useState(null) // null | 'new' | chat row
  const [direct, setDirect] = useState(false)
  const [folders, setFolders] = useState(false) // false | true | 'new' (a new empty folder ready to name)
  const [notice, setNotice] = useState(false)
  // TML Chat's + (phone): opens into New folder / New group / New message; a tap anywhere else closes it
  const [plus, setPlus] = useState(false)
  const plusRef = useRef(null)
  useEffect(() => {
    if (!plus) return undefined
    const away = (e) => { if (plusRef.current && !plusRef.current.contains(e.target)) setPlus(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [plus])
  const [sent, setSent] = useState(false)
  useEffect(() => {
    const h = () => setReadMap(C.loadRead())
    window.addEventListener('tml-chat-read', h)
    return () => window.removeEventListener('tml-chat-read', h)
  }, [])
  useEffect(() => { try { localStorage.setItem('tml_chat_folder', folderId) } catch {} }, [folderId])
  // Phone: a tap on another folder slides the list over, left or right by where that folder sits
  // (Alex, 9 Oct). The old list is copied into a frame that slides out while the new one slides in.
  const roomsRef = useRef(null)
  const [slide, setSlide] = useState('')
  const pickFolder = (id) => {
    if (id === folderId) return
    const from = allFolders.findIndex((f) => f.id === folder.id)
    const to = allFolders.findIndex((f) => f.id === id)
    const dir = to > from ? 'next' : 'prev'
    const el = roomsRef.current
    const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (el && !still && el.parentNode) {
      const frame = document.createElement('div')
      frame.className = 'chat-rooms-ghost'
      frame.setAttribute('aria-hidden', 'true')
      const copy = el.cloneNode(true)
      frame.appendChild(copy)
      el.parentNode.appendChild(frame)
      const at = el.getBoundingClientRect()
      const here = frame.getBoundingClientRect()
      Object.assign(frame.style, { top: `${at.top - here.top}px`, left: `${at.left - here.left}px`, width: `${at.width}px`, height: `${at.height}px` })
      copy.scrollTop = el.scrollTop
      copy.classList.add(dir === 'next' ? 'out-next' : 'out-prev')
      setTimeout(() => frame.remove(), 320)
      setSlide(dir)
    }
    if (!still) glassTo(id)
    setFolderId(id)
  }
  // TML Chat on a phone: a small glass lens lifts off the chosen folder, slides to the new one and
  // melts into its pill, like iOS's Liquid Glass tabs (Alex, 9 Oct).
  const tabsRef = useRef(null)
  const glassTo = (id) => {
    const track = tabsRef.current
    const from = track?.querySelector('button.on')
    const to = track?.querySelector(`button[data-folder="${CSS.escape(id)}"]`)
    if (!from || !to || typeof track.animate !== 'function') return
    track.querySelectorAll('.chat-lens').forEach((n) => n.remove())
    const lens = document.createElement('span')
    lens.className = 'chat-lens'
    lens.setAttribute('aria-hidden', 'true')
    track.appendChild(lens)
    track.classList.add('lensing')
    const at = (b) => `translate(${b.offsetLeft}px, ${b.offsetTop}px)`
    const run = lens.animate([
      { transform: `${at(from)} scale(1)`, width: `${from.offsetWidth}px`, height: `${from.offsetHeight}px`, opacity: 0 },
      { offset: 0.15, transform: `${at(from)} scale(1.12)`, width: `${from.offsetWidth}px`, height: `${from.offsetHeight}px`, opacity: 1 },
      { offset: 0.75, transform: `${at(to)} scale(1.12)`, width: `${to.offsetWidth}px`, height: `${to.offsetHeight}px`, opacity: 1 },
      { transform: `${at(to)} scale(1)`, width: `${to.offsetWidth}px`, height: `${to.offsetHeight}px`, opacity: 0 },
    ], { duration: 560, easing: 'cubic-bezier(.3, .7, .2, 1)', fill: 'both' })
    setTimeout(() => track.classList.remove('lensing'), 380)
    run.onfinish = () => lens.remove()
  }

  const rooms = useMemo(() => C.roomsFor(state, user), [state.users, state.projects, state.chats, user])
  const unread = useMemo(() => C.unreadByRoom(state, user, readMap, rooms), [state.chat, rooms, readMap, user])
  const allFolders = C.foldersFor(user)
  const folder = allFolders.find((f) => f.id === folderId) || allFolders[0]
  // Edit > Delete takes a conversation off this person's list (profile.chatHidden: { room: when });
  // a message newer than that brings it back, as in Telegram. Nothing is deleted for anyone else.
  const hiddenMap = user?.profile?.chatHidden || {}
  const shown = useMemo(() => {
    const inFolder = C.roomsInFolder(folder, rooms).filter((r) => !hiddenMap[r.id] || (C.lastMessage(state.chat, r.id)?.createdAt || '') > hiddenMap[r.id])
    const needle = q.trim().toLowerCase()
    return C.sortRooms(needle ? inFolder.filter((r) => r.name.toLowerCase().includes(needle)) : inFolder, state.chat)
  }, [folder, rooms, q, state.chat, hiddenMap])
  // Edit (TML Chat on a phone): pick conversations and act on them together
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState([])
  const [folderPick, setFolderPick] = useState(false)
  const togglePick = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const endPick = () => { setPicking(false); setPicked([]); setFolderPick(false) }
  const writeProfile = (fn) => update((s) => {
    const u = s.users.find((x) => x.id === user?.id)
    if (u) u.profile = fn({ ...(u.profile || {}) })
    return s
  })
  const pickedRooms = rooms.filter((r) => picked.includes(r.id))
  const allArchived = pickedRooms.length > 0 && pickedRooms.every((r) => r.archived)
  const bulkRead = () => {
    pickedRooms.forEach((r) => { const last = C.lastMessage(state.chat, r.id); if (last) C.markRead(r.id, last.createdAt) })
    toast(`${pickedRooms.length} marked as read`, 'ok'); endPick()
  }
  const bulkArchive = () => {
    const ids = pickedRooms.map((r) => r.id)
    writeProfile((p) => {
      const cur = new Set(Array.isArray(p.chatArchived) ? p.chatArchived : [])
      ids.forEach((id) => (allArchived ? cur.delete(id) : cur.add(id)))
      return { ...p, chatArchived: [...cur] }
    })
    toast(allArchived ? `${ids.length} back from Archived` : `${ids.length} moved to Archived`, 'ok'); endPick()
  }
  const bulkFolder = (f) => {
    const ids = pickedRooms.map((r) => r.id)
    writeProfile((p) => ({ ...p, chatFolders: (Array.isArray(p.chatFolders) ? p.chatFolders : []).map((x) => (x.id === f.id ? { ...x, rooms: [...new Set([...(x.rooms || []), ...ids])] } : x)) }))
    toast(`${ids.length} added to ${f.name}`, 'ok'); endPick()
  }
  // one conversation at a time, from its row slid left on a phone (SwipeRow)
  const [swipeOpen, setSwipeOpen] = useState(null)
  const [mutedRooms, setMutedRooms] = useState(() => loadMuted())
  useEffect(() => {
    const on = () => setMutedRooms(loadMuted())
    window.addEventListener('tml-chat-prefs', on)
    return () => window.removeEventListener('tml-chat-prefs', on)
  }, [])
  const muteOne = (r) => {
    const next = toggleMuted(r.id)
    setMutedRooms(next)
    toast(next.includes(r.id) ? `${r.name} muted` : `${r.name} unmuted`, 'ok')
  }
  const archiveOne = (r) => {
    writeProfile((p) => {
      const cur = new Set(Array.isArray(p.chatArchived) ? p.chatArchived : [])
      if (r.archived) cur.delete(r.id)
      else cur.add(r.id)
      return { ...p, chatArchived: [...cur] }
    })
    toast(r.archived ? `${r.name} back from Archived` : `${r.name} moved to Archived`, 'ok')
  }
  const deleteOne = (r) => {
    if (!confirm(`Delete "${r.name}" from your list? Nothing is deleted for the others, and a new message brings it back.`)) return
    const now = new Date().toISOString()
    writeProfile((p) => ({ ...p, chatHidden: { ...(p.chatHidden || {}), [r.id]: now } }))
    toast(`${r.name} deleted from your list`, 'ok')
  }
  const bulkDelete = () => {
    if (!confirm(`Delete ${pickedRooms.length} conversation${pickedRooms.length === 1 ? '' : 's'} from your list? Nothing is deleted for the others, and a new message brings it back.`)) return
    const now = new Date().toISOString()
    writeProfile((p) => ({ ...p, chatHidden: { ...(p.chatHidden || {}), ...Object.fromEntries(pickedRooms.map((r) => [r.id, now])) } }))
    toast(`${pickedRooms.length} deleted from your list`, 'ok'); endPick()
  }
  // the list's search also finds words inside messages (Alex), newest first
  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (needle.length < 2) return []
    const ids = new Set(rooms.map((r) => r.id))
    return (state.chat || []).filter((m) => ids.has(m.chatId || 'team') && (m.text || '').toLowerCase().includes(needle))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 60)
  }, [q, rooms, state.chat])
  const openHit = (m) => { pendingJump = m.id; nav(roomPath(base, m.chatId || 'team')) }
  const snippet = (text) => {
    const needle = q.trim().toLowerCase()
    const at = text.toLowerCase().indexOf(needle)
    const from = Math.max(0, at - 24)
    return <>{from > 0 && '…'}{text.slice(from, at)}<mark>{text.slice(at, at + needle.length)}</mark>{text.slice(at + needle.length, at + needle.length + 80)}</>
  }
  // Show Folder Tags: the built-in folder a room belongs to, then the person's own folders holding it
  const folderTagsOf = (r) => [
    ...(r.archived ? ['Archived'] : r.kind === 'project' ? ['Projects'] : r.kind === 'group' ? ['Groups'] : r.kind === 'direct' ? ['People'] : []),
    ...allFolders.filter((f) => f.custom && (f.rooms || []).includes(r.id)).map((f) => f.name),
  ]
  const folderUnread = (f) => C.totalUnread(Object.fromEntries(C.roomsInFolder(f, rooms).map((r) => [r.id, unread[r.id] || 0])))
  const legacy = state.chatRooms === false
  // TML Chat on a phone (the home-screen app) is laid out like Telegram for iPhone (Alex, 9 Oct):
  // Edit · Chats · (+ group, new message) on top, the search, the folders as a pill track, and a
  // floating bar at the foot with the unread count on Chats
  const allUnread = C.totalUnread(unread)
  // the folder tabs: above the search, or in TML Chat on a phone at the foot, right over
  // Chats / Calls / Notices / Settings where the thumb is (Alex, 9 Oct)
  const folderTabs = (
    <div ref={tabsRef} className="chat-folders" role="tablist">
      {allFolders.map((f) => {
        const n = folderUnread(f)
        return (
          <button key={f.id} type="button" role="tab" data-folder={f.id} aria-selected={f.id === folder.id} className={f.id === folder.id ? 'on' : ''} onClick={() => pickFolder(f.id)}>
            {f.name}{n > 0 && <span className="chat-fbadge">{n}</span>}
          </button>
        )
      })}
      <button type="button" className="chat-folders-edit" onClick={() => setFolders(true)} title="Your folders">Folders…</button>
    </div>
  )
  // the list's foot, Telegram's, in Alex's order: chats, calls, notices (administrators), settings
  // (People left, Alex: the new-message button is already above the list)
  const footTabs = (
    picking ? (
      <nav className="chat-win-tabs tg-tabs tg-bulk">
        <button type="button" disabled={!picked.length} onClick={bulkRead}>{TgIcon.chats()}<span>Read</span></button>
        <button type="button" disabled={!picked.length} onClick={bulkArchive}>{TgIcon.folder()}<span>{allArchived ? 'Unarchive' : 'Archive'}</span></button>
        <button type="button" disabled={!picked.length} onClick={() => setFolderPick(true)}>{TgIcon.folder()}<span>Folder</span></button>
        <button type="button" className="tg-del" disabled={!picked.length} onClick={bulkDelete}><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg><span>Delete</span></button>
      </nav>
    ) : (
    <nav className="chat-win-tabs tg-tabs">
      <button type="button" className={tab === 'chats' ? 'on' : ''} onClick={() => setTab('chats')}><span className="tg-tab-ico">{TgIcon.chats()}{allUnread > 0 && <i className="tg-tab-badge">{allUnread > 99 ? '99+' : allUnread}</i>}</span><span>Chats</span></button>
      {remote && <button type="button" className={tab === 'calls' ? 'on' : ''} onClick={() => setTab('calls')}>{TgIcon.phone()}<span>Calls</span></button>}
      {canNotice && <button type="button" className={tab === 'notices' ? 'on' : ''} onClick={() => setTab('notices')}>{TgIcon.bell()}<span>Notices</span></button>}
      <button type="button" className={tab === 'settings' ? 'on' : ''} onClick={() => setTab('settings')}>{TgIcon.gear()}<span>Settings</span></button>
    </nav>
    )
  )

  return (
    // TML Chat's list on a phone, everywhere the chat is (Alex, 9 Oct): the app's chat on a phone and
    // on a computer, and the chat window, get the same head, Edit, + menu, slim search and folders dock
    <aside className="chat-list tgui">
      <div className={`chat-list-head tg-head${plus ? ' plus-open' : ''}`}>
        {/* Edit alone on the left; on the right one + that opens, in glass, New folder / New group / New message (Alex, 9 Oct) */}
        <span className="tg-pill tg-pill-left">
          <button type="button" className="tg-edit" onClick={() => { setPlus(false); picking ? endPick() : setPicking(true) }}>{picking ? 'Done' : 'Edit'}</button>
        </span>
        {/* the company's name, MAD set heavier (Alex, 9 Oct); while picking, how many are picked */}
        <h1>{picking ? (picked.length ? `${picked.length} selected` : 'Select chats') : <span className="tg-brand">THE<b>MAD</b>LIONS</span>}</h1>
        {picking ? (
          <button type="button" className="tg-pill tg-all" onClick={() => setPicked(picked.length === shown.length ? [] : shown.map((r) => r.id))}>{picked.length === shown.length && shown.length ? 'None' : 'All'}</button>
        ) : (
          <>
          {/* notices on a phone in the app: a bell up here, like the chat app's Notices (Alex, 10 Oct),
              instead of the two buttons that sat under the list; tap again for the chats */}
          {canNotice && mobile && !windowed && (
            <button type="button" className={`tg-pill tg-notice${tab === 'notices' ? ' on' : ''}`} onClick={() => { setPlus(false); setTab(tab === 'notices' ? 'chats' : 'notices') }} title={tab === 'notices' ? 'Back to the chats' : 'Notices'} aria-label={tab === 'notices' ? 'Back to the chats' : 'Notices'} aria-pressed={tab === 'notices'}>{TgIcon.bell()}</button>
          )}
          <span ref={plusRef} className={`tg-pill tg-plus${plus ? ' open' : ''}`} style={{ '--n': 2 + (isAdmin ? 1 : 0) + (windowed ? 0 : 1) }}>
            <span className="tg-plus-items" aria-hidden={!plus}>
              <button type="button" tabIndex={plus ? 0 : -1} onClick={() => { setPlus(false); setFolders('new') }} title="New folder" aria-label="New folder">{TgIcon.folderPlus()}</button>
              {isAdmin && <button type="button" tabIndex={plus ? 0 : -1} onClick={() => { setPlus(false); setGroup('new') }} title="New group" aria-label="New group">{TgIcon.people()}</button>}
              <button type="button" tabIndex={plus ? 0 : -1} onClick={() => { setPlus(false); setDirect(true) }} title="New message" aria-label="New message">{TgIcon.edit()}</button>
              {!windowed && <button type="button" tabIndex={plus ? 0 : -1} onClick={() => { setPlus(false); popOut() }} title="Open the chat in its own window" aria-label="Open the chat in its own window">{TgIcon.popout()}</button>}
            </span>
            <button type="button" className="tg-plus-btn" onClick={() => setPlus((o) => !o)} aria-expanded={plus} title={plus ? 'Close' : 'New'} aria-label={plus ? 'Close' : 'New folder, group or message'}>{TgIcon.plus()}</button>
          </span>
          </>
        )}
      </div>
      {tab === 'settings' || tab === 'notices' || tab === 'calls' ? (tab === 'settings' ? (
        <div className="chat-win-settings">
          <MyProfileRow />
          <h2>Chat settings</h2>
          <ChatSettings toast={toast} />
        </div>
      ) : tab === 'calls' ? <CallsPanel /> : null) : (<>
      {legacy && <p className="chat-legacy">Rooms are not switched on yet: run supabase/chat_rooms.sql in the SQL editor. Until then only the team room works.</p>}
      {mobile && !windowed && installCard > 0 && <InstallHint key={installCard} />}
      <div className="chat-search"><input ref={searchRef} className="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); e.currentTarget.blur() } }} placeholder={mobile ? 'Search' : 'Search (⌘K)'} name="chat-search" autoComplete="off" /></div>
      <div ref={roomsRef} key={folder.id} className={`chat-rooms${slide ? ` in-${slide}` : ''}`} onAnimationEnd={() => setSlide('')}>
        {!shown.length && !hits.length && <p className="muted small chat-rooms-empty">{q.trim() ? 'Nothing found.' : folder.custom ? 'This folder is empty. Add conversations to it under Folders.' : 'Nothing here yet.'}</p>}
        {shown.map((r) => {
          const last = C.lastMessage(state.chat, r.id)
          // never the last message (Alex): the company room shows its name alone, a project room its
          // category, a group its member count, a person their position
          const preview = r.kind === 'team' ? '' : r.sub
          const n = unread[r.id] || 0
          const row = (
            <button key={r.id} type="button" className={`chat-room-item ${r.id === activeId ? 'active' : ''}${picking ? ' picking' : ''}${picked.includes(r.id) ? ' picked' : ''}`} onClick={() => (picking ? togglePick(r.id) : nav(roomPath(base, r.id)))} disabled={legacy && r.kind !== 'team'}>
              {picking && <span className="tg-check" aria-hidden="true" />}
              <RoomAvatar room={r} size={mobile ? 54 : 48} />
              <span className="chat-rmain">
                <span className="chat-rtop"><strong>{r.name}{mobile && mutedRooms.includes(r.id) && <span className="chat-rmuted" title="Muted" aria-label="Muted"> 🔕</span>}</strong><small>{listTime(last?.createdAt)}</small></span>
                {(preview || n > 0) && <span className="chat-rbottom"><span className="chat-rprev">{preview}</span>{n > 0 && <span className="chat-rbadge">{n}</span>}</span>}
                {prefs.folderTags && <span className="chat-rtags">{folderTagsOf(r).map((t) => <span key={t} className="chat-rtag">{t}</span>)}</span>}
              </span>
            </button>
          )
          // on a phone (not while picking) the row slides left for Mute / Delete / Archive
          if (!mobile || picking || legacy) return row
          const isMuted = mutedRooms.includes(r.id)
          return (
            <SwipeRow key={r.id} id={r.id} openId={swipeOpen} setOpenId={setSwipeOpen} actions={[
              { label: isMuted ? 'Unmute' : 'Mute', tone: 'mute', icon: TgIcon.bell(), run: () => muteOne(r) },
              { label: 'Delete', tone: 'del', icon: TgIcon.trash(), run: () => deleteOne(r) },
              { label: r.archived ? 'Unarchive' : 'Archive', tone: 'arch', icon: TgIcon.folder(), run: () => archiveOne(r) },
            ]}>{row}</SwipeRow>
          )
        })}
        {hits.length > 0 && (
          <>
            <p className="chat-hits-title">Messages</p>
            {hits.map((m) => {
              const r = rooms.find((x) => x.id === (m.chatId || 'team'))
              return (
                <button key={m.id} type="button" className="chat-room-item chat-hit" onClick={() => openHit(m)}>
                  {r && <RoomAvatar room={r} size={mobile ? 54 : 48} />}
                  <span className="chat-rmain">
                    <span className="chat-rtop"><strong>{r?.name || 'Chat'}</strong><small>{listTime(m.createdAt)}</small></span>
                    <span className="chat-rbottom"><span className="chat-rprev"><b>{m.userId === user?.id ? 'You' : m.userName}:</b> {snippet(m.text)}</span></span>
                  </span>
                </button>
              )
            })}
          </>
        )}
      </div>
      </>)}
      {tab === 'notices' && canNotice && (
        <div className="chat-win-settings">
          <h2>Notices</h2>
          <p className="muted small">A notice pops up on the screen of the people you pick, until they read it.</p>
          <Button variant="primary" onClick={() => setNotice(true)}>Send a notice</Button>
          <div className="chat-notices-sent"><SentNotices /></div>
        </div>
      )}
      {windowed && mobile && <InstallHint />}
      {/* the folders and, where the chat has its own foot (its window, a computer), Chats / Calls /
          Notices / Settings; in the app on a phone the app's own tab bar is under it (Alex, 9 Oct) */}
      <div className="tg-dock">
        {tab === 'chats' && folderTabs}
        {(windowed || !mobile || picking) && footTabs}
      </div>
      <Modal open={folderPick} title="Add to a folder" onClose={() => setFolderPick(false)}>
        {folderPick && (allFolders.filter((f) => f.custom).length ? (
          <div className="tg-folder-pick">
            {allFolders.filter((f) => f.custom).map((f) => <button key={f.id} type="button" className="chat-room-item" onClick={() => bulkFolder(f)}>{TgIcon.folder()}<strong>{f.name}</strong></button>)}
          </div>
        ) : (
          <div className="stack"><p className="muted">You have no folders of your own yet.</p><Button variant="primary" onClick={() => { setFolderPick(false); setFolders('new') }}>Make a folder</Button></div>
        ))}
      </Modal>
      <GroupModal open={!!group} group={group === 'new' ? null : group} onClose={() => setGroup(null)} onSaved={(id) => { setGroup(null); nav(roomPath(base, id)) }} />
      <DirectModal open={direct} onClose={() => setDirect(false)} onPick={(id) => { setDirect(false); nav(roomPath(base, id)) }} />
      <FoldersModal open={!!folders} fresh={folders === 'new'} onClose={() => setFolders(false)} rooms={rooms} />
      <SendNoticeModal open={notice} onClose={() => setNotice(false)} />
      <Modal open={sent} title="Sent notices" onClose={() => setSent(false)} wide>{sent && <SentNotices />}</Modal>
    </aside>
  )
}

/* Administrators make a group: a name and the people in it. The maker is always a member.
   A new group starts with the administrators and the usual people, Mariza and Elias (Alex, 10 Oct),
   kept in settings.chatGroupStart once an administrator saves them with "Start every new group with
   these"; before that they are found by name. Then anyone in the group can add people to it; only an
   administrator takes someone out, renames or deletes it (supabase/chat_group_add.sql). */
const STARTERS = ['mariza', 'μαρίζα', 'μαριζα', 'elias', 'ηλίας', 'ηλιας']
function GroupModal({ open, group, onClose, onSaved }) {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const [name, setName] = useState('')
  const [members, setMembers] = useState([])
  const isAdmin = user?.role === 'admin'
  const people = state.users.filter((u) => u.active !== false)
  const saved = state.settings?.chatGroupStart
  const starters = Array.isArray(saved) ? saved : people.filter((u) => STARTERS.includes((u.name || '').trim().split(/\s+/)[0].toLowerCase())).map((u) => u.id)
  const startWith = () => [...new Set([user?.id, ...people.filter((u) => u.role === 'admin').map((u) => u.id), ...starters.filter((id) => people.some((u) => u.id === id))].filter(Boolean))]
  useEffect(() => { if (open) { setName(group?.name || ''); setMembers(group?.members || startWith()) } }, [open, group?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  // someone who is not an administrator only adds: who was already in stays in
  const fixed = (id) => id === user?.id || (!isAdmin && (group?.members || []).includes(id))
  const toggle = (id) => setMembers((m) => (fixed(id) ? m : m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))
  const keepStart = () => {
    const ids = members.filter((id) => !people.some((u) => u.id === id && u.role === 'admin'))
    update((s) => { s.settings = { ...s.settings, chatGroupStart: ids }; return s })
    toast('New groups will start with these people', 'ok')
  }
  const save = () => {
    const n = name.trim()
    if (!n) return toast('Give the group a name.', 'error')
    if (members.length < 2) return toast('Pick at least one other person.', 'error')
    const id = group?.id || uid()
    update((s) => {
      const list = s.chats || []
      const i = list.findIndex((c) => c.id === id)
      const row = { id, kind: 'group', name: n, members, createdBy: group?.createdBy || user?.id || '', createdAt: group?.createdAt || new Date().toISOString() }
      s.chats = i >= 0 ? list.map((c) => (c.id === id ? row : c)) : [...list, row]
      return s
    })
    toast(group ? 'Group updated' : 'Group created', 'ok')
    onSaved(id)
  }
  const remove = () => {
    update((s) => { s.chats = (s.chats || []).filter((c) => c.id !== group.id); s.chat = (s.chat || []).filter((m) => C.messageRoom(m) !== group.id); return s })
    toast('Group deleted', 'ok')
    onClose()
  }
  return (
    <Modal open={open} title={group ? (isAdmin ? 'Edit group' : 'Add people') : 'New group'} onClose={onClose} footer={<>{group && isAdmin && <Confirm onConfirm={remove} label="Delete group">Delete group</Confirm>}<span className="grow" /><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{group ? 'Save' : 'Create'}</Button></>}>
      <div className="stack">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Camera crew" autoFocus={!group} readOnly={!isAdmin} /></Field>
        <div className="field">
          <span className="field-label">Members</span>
          <div className="chips-static">
            {people.map((p) => <button key={p.id} type="button" className={`chip ${members.includes(p.id) ? 'on' : ''}`} onClick={() => toggle(p.id)} disabled={fixed(p.id)}>{p.name}{p.id === user?.id ? <small>you</small> : null}</button>)}
          </div>
          {!group && isAdmin && <button type="button" className="link small" onClick={keepStart}>Start every new group with these</button>}
          {group && !isAdmin && <p className="small muted">Tap someone to add them. Only an administrator can take someone out.</p>}
        </div>
      </div>
    </Modal>
  )
}

/* One person to write to. The conversation row is made when the first message is sent. */
function DirectModal({ open, onClose, onPick }) {
  const { state } = useStore()
  const user = useCurrentUser()
  const [q, setQ] = useState('')
  useEffect(() => { if (open) setQ('') }, [open])
  const people = state.users.filter((u) => u.active !== false && u.id !== user?.id && (!q.trim() || (u.name || '').toLowerCase().includes(q.trim().toLowerCase())))
  return (
    <Modal open={open} title="New message" onClose={onClose}>
      <div className="stack">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the team" autoFocus />
        {!people.length && <p className="muted small">Nobody else in the team yet.</p>}
        <ul className="plain chat-people">
          {people.map((p) => (
            <li key={p.id}>
              <button type="button" className="chat-room-item" onClick={() => onPick(C.directRoom(user.id, p.id))}>
                <RoomAvatar room={{ kind: 'direct', photo: p.profile?.thumb || '', initials: (p.name || '?').split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase() }} size={36} />
                <span className="chat-rmain"><strong>{p.name}</strong><span className="chat-rprev">{p.profile?.position || p.profile?.dept || ''}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}

/* The person's own folders: a name and the conversations inside. Saved in their profile, so they follow them to any device. */
function FoldersModal({ open, fresh, onClose, rooms }) {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const [list, setList] = useState([])
  // fresh: opened from TML Chat's + > New folder, so an empty folder waits at the end to be named
  useEffect(() => { if (open) setList([...(Array.isArray(user?.profile?.chatFolders) ? user.profile.chatFolders : []).map((f) => ({ ...f, rooms: [...(f.rooms || [])] })), ...(fresh ? [{ id: uid(), name: '', rooms: [] }] : [])]) }, [open])
  const patch = (id, fn) => setList((l) => l.map((f) => (f.id === id ? fn({ ...f }) : f)))
  const toggle = (id, roomId) => patch(id, (f) => ({ ...f, rooms: f.rooms.includes(roomId) ? f.rooms.filter((r) => r !== roomId) : [...f.rooms, roomId] }))
  const save = () => {
    const clean = list.map((f) => ({ id: f.id, name: (f.name || '').trim(), rooms: f.rooms })).filter((f) => f.name)
    update((s) => {
      const u = s.users.find((x) => x.id === user?.id)
      if (u) u.profile = { ...(u.profile || {}), chatFolders: clean }
      return s
    })
    toast('Folders saved', 'ok')
    onClose()
  }
  return (
    <Modal open={open} title="Your folders" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <div className="stack">
        <p className="small muted">All, Projects, Groups, People and Archived are always there. Your own folders are yours alone: pick a name and the conversations that go in it.</p>
        {list.map((f) => (
          <div key={f.id} className="chat-folder-edit">
            <div className="row-actions">
              <Input value={f.name} onChange={(e) => patch(f.id, (x) => ({ ...x, name: e.target.value }))} placeholder="Folder name" />
              <Button size="sm" variant="ghost" onClick={() => setList((l) => l.filter((x) => x.id !== f.id))} title="Remove folder">×</Button>
            </div>
            <div className="chips-static">
              {rooms.map((r) => <button key={r.id} type="button" className={`chip ${f.rooms.includes(r.id) ? 'on' : ''}`} onClick={() => toggle(f.id, r.id)}>{r.name}</button>)}
            </div>
          </div>
        ))}
        <Button variant="ghost" onClick={() => setList((l) => [...l, { id: uid(), name: '', rooms: [] }])}>+ Add folder</Button>
      </div>
    </Modal>
  )
}

/* Who is in a project's conversation: everyone with access to the project, minus the people an
   administrator took out (project.chatExcluded). Administrators are always in. */
function ProjectMembersModal({ open, projectId, onClose }) {
  const { state, updateProject } = useStore()
  const project = state.projects.find((p) => p.id === projectId)
  if (!project) return null
  const excluded = Array.isArray(project.chatExcluded) ? project.chatExcluded : []
  const people = state.users.filter((u) => u.active !== false && canAccessProject(u, projectId))
  const toggle = (id) => updateProject(projectId, (p) => { const cur = Array.isArray(p.chatExcluded) ? p.chatExcluded : []; p.chatExcluded = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] })
  return (
    <Modal open={open} title={`Members · ${project.title}`} onClose={onClose} footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      <div className="stack">
        <p className="small muted">Everyone who can see the project is in its conversation. Take someone out and the room disappears from their Chat and from the project's tabs; the database stops handing them its messages. Put them back any time. Administrators are always in.</p>
        <ul className="plain chat-people">
          {people.map((p) => {
            const out = excluded.includes(p.id) && p.role !== 'admin'
            return (
              <li key={p.id} className={`chat-member ${out ? 'out' : ''}`}>
                <RoomAvatar room={{ kind: 'direct', photo: p.profile?.thumb || '', initials: (p.name || '?').split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase() }} size={36} />
                <span className="chat-rmain"><strong>{p.name}</strong><span className="chat-rprev">{p.role === 'admin' ? 'Administrator, always in' : out ? 'Not in this conversation' : p.profile?.position || 'In the conversation'}</span></span>
                {p.role !== 'admin' && <Button size="sm" variant={out ? 'primary' : 'ghost'} onClick={() => toggle(p.id)}>{out ? 'Put back' : 'Remove'}</Button>}
              </li>
            )
          })}
        </ul>
      </div>
    </Modal>
  )
}

/* ---------- one room ---------- */
function ChatRoom({ room, onBack }) {
  // On a phone the room looks and behaves like Telegram (Alex, 8 Oct): Telegram bubbles on a
  // wallpaper whatever Settings > Chat says for the computer, the sender's face at the foot of
  // their run, and Reply / Edit / Delete only for the message you tap, not beside every bubble.
  const mobile = useIsMobile()
  const [picked, setPicked] = useState('')
  const [burst, setBurst] = useState('') // the message a double tap just liked, for the big 🎥
  const tapRef = useRef({ id: '', at: 0, timer: null })
  // Telegram has no tab bar inside a conversation, and the bar must not ride up with the keyboard
  // (Alex): the room takes the whole screen while it is open, and follows the visible part of
  // the screen when the keyboard opens (visualViewport), so the box you type in sits on top of it.
  useEffect(() => {
    if (!mobile) return undefined
    const root = document.documentElement
    root.classList.add('chat-open')
    const vv = window.visualViewport
    // the tallest the screen has been, keyboard down; window.innerHeight shrinks with the keyboard in
    // an iPhone home-screen app, so it cannot tell on its own (Alex, 8 Oct: a gap under the box)
    let full = 0
    let wide = 0
    const typing = () => {
      const el = document.activeElement
      return !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(file|checkbox|radio|range|button|submit)$/.test(el.type)) || el.isContentEditable)
    }
    const fit = () => {
      if (!vv) { root.classList.toggle('kb-open', typing()); return }
      if (vv.width !== wide) { wide = vv.width; full = 0 } // turned sideways: measure again
      full = Math.max(full, vv.height, typing() ? 0 : window.innerHeight)
      root.style.setProperty('--chat-vh', `${vv.height}px`)
      root.style.setProperty('--chat-vt', `${vv.offsetTop}px`)
      // keyboard up: the strip kept for the iPhone's home bar is not needed under the box (Alex)
      root.classList.toggle('kb-open', typing() || full - vv.height > 120)
    }
    const later = () => setTimeout(fit, 60) // focus moves before the keyboard has finished
    fit()
    vv?.addEventListener('resize', fit)
    vv?.addEventListener('scroll', fit)
    document.addEventListener('focusin', fit)
    document.addEventListener('focusout', later)
    return () => {
      root.classList.remove('chat-open', 'kb-open')
      root.style.removeProperty('--chat-vh')
      root.style.removeProperty('--chat-vt')
      vv?.removeEventListener('resize', fit)
      vv?.removeEventListener('scroll', fit)
      document.removeEventListener('focusin', fit)
      document.removeEventListener('focusout', later)
    }
  }, [mobile])
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const isAdmin = user?.role === 'admin'
  const nav = useNavigate()
  const calls = useCalls()
  // calls with the app connected to the database: one to one, or a group call in any other room
  // (lib/calls.jsx); a group call already going on here shows a bar to Join it
  const canCall = remote && (room.kind === 'direct' ? !!room.otherId && room.otherId !== user?.id : true)
  const liveCall = room.kind !== 'direct' ? calls.live?.[room.id] : null
  const liveOthers = liveCall ? liveCall.inCall.filter((x) => x !== user?.id).length : 0
  const roomId = room.id
  const prefs = useChatPrefs()
  const msgs = useMemo(() => C.messagesIn(state.chat, roomId), [state.chat, roomId])
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [editing, setEditing] = useState(null)
  const [pending, setPending] = useState([]) // files chosen, not sent yet
  const [viewer, setViewer] = useState(null) // { items, i }: photos and videos full screen
  const [sel, setSel] = useState(null) // ids picked with Select, or null when not selecting
  const [fwd, setFwd] = useState(null) // messages to forward, while choosing where
  const pressRef = useRef(null) // long press on a message opens its menu (Telegram)
  const [find, setFind] = useState(null) // words searched in this conversation, or null when closed
  const [findAt, setFindAt] = useState(0)
  const [roomMenu, setRoomMenu] = useState(false) // the ⋯ in the header
  const [shared, setShared] = useState(false) // Photos, videos & files of this conversation
  const [muted, setMuted] = useState(() => loadMuted().includes(room.id))
  const [emoji, setEmoji] = useState(false)
  const [rec, setRec] = useState(null) // a voice message being recorded
  const [recSecs, setRecSecs] = useState(0)
  const [sheet, setSheet] = useState(false) // the sheet to pick photos, videos and files (Telegram's)
  // photos and videos are shrunk like WhatsApp unless this is switched off in the sheet
  const [compressMedia, setCompressMedia] = useState(true)
  const [busy, setBusy] = useState('')
  /* Photos, videos and files on their way (Alex, 11 Oct, from Telegram): the message shows in the
     conversation at once, from the phone, with a turning ring and a cross to stop it, instead of
     names over the box and an "Uploading" bar. Kept here until it is sent. */
  const [outbox, setOutbox] = useState([])
  const stopped = useRef(new Set())
  const [caret, setCaret] = useState(0)
  const [editGroup, setEditGroup] = useState(false)
  const [editMembers, setEditMembers] = useState(false)
  const endRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  // newest first, as Telegram steps through results from the bottom up
  const found = useMemo(() => {
    const q = (find || '').trim().toLowerCase()
    return q ? msgs.filter((x) => (x.text || '').toLowerCase().includes(q)).map((x) => x.id).reverse() : []
  }, [find, msgs])
  const pinnedMsg = useMemo(() => msgs.filter((x) => x.pinnedAt).sort((a, b) => (b.pinnedAt > a.pinnedAt ? 1 : -1))[0] || null, [msgs])
  const byId = useMemo(() => Object.fromEntries((state.chat || []).map((m) => [m.id, m])), [state.chat])
  const photoOf = (userId) => state.users.find((u) => u.id === userId)?.profile?.thumb || ''
  const nameRe = useMemo(() => {
    const names = state.users.filter((u) => u.active !== false && u.name).flatMap((u) => [u.name.trim(), u.name.trim().split(/\s+/)[0]]).filter((n) => n.length > 1)
    const uniq = [...new Set(names)].sort((a, b) => b.length - a.length).map(escapeRe)
    return uniq.length ? new RegExp(`(@(?:${uniq.join('|')}))(?![\\p{L}\\p{N}])`, 'giu') : null
  }, [state.users])

  const groups = useMemo(() => {
    const out = []
    let last = null
    for (const m of msgs) {
      const d = dayOf(m.createdAt)
      if (!last || last.day !== d) { last = { day: d, items: [] }; out.push(last) }
      last.items.push(m)
    }
    return out
  }, [msgs])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
    const latest = msgs.reduce((a, m) => (m.createdAt > a ? m.createdAt : a), '')
    if (latest) C.markRead(roomId, latest)
  }, [msgs.length, roomId])
  useEffect(() => { if (outbox.length) endRef.current?.scrollIntoView({ block: 'end' }) }, [outbox.length])
  // Seen (Telegram): how far each person has read a room is kept in their profile (chatRead), at
  // most every few seconds, so the sender can see who read a message and gets ✓✓
  useEffect(() => {
    const latest = msgs.reduce((a, m) => (m.createdAt > a ? m.createdAt : a), '')
    if (!latest || !user?.id || document.hidden) return undefined
    if ((user.profile?.chatRead?.[roomId] || '') >= latest) return undefined
    const t = setTimeout(() => {
      update((s) => {
        const u = s.users.find((x) => x.id === user.id)
        if (!u) return s
        const cr = u.profile?.chatRead || {}
        if ((cr[roomId] || '') >= latest) return s
        u.profile = { ...(u.profile || {}), chatRead: { ...cr, [roomId]: latest } }
        return s
      })
    }, 2500)
    return () => clearTimeout(t)
  }, [msgs.length, roomId])
  const seenBy = (m) => state.users.filter((u) => u.id !== m.userId && u.active !== false && (u.profile?.chatRead?.[roomId] || '') >= m.createdAt && (room.kind === 'team' || membersOf.some((x) => x.id === u.id)))
  const repliesTo = (m) => msgs.filter((x) => x.replyTo === m.id)
  const [seenOpen, setSeenOpen] = useState('')
  const [repliesOf, setRepliesOf] = useState(null)
  const copyLink = (m) => {
    setPicked('')
    const url = `${window.location.origin}${window.location.pathname}#/chat/${encodeURIComponent(roomId)}?m=${encodeURIComponent(m.id)}`
    navigator.clipboard?.writeText(url).then(() => toast('Link copied', 'ok')).catch(() => toast('Could not copy', 'error'))
  }
  const translate = (m) => {
    setPicked('')
    // Greek letters in it: to English, otherwise to Greek
    const to = /[\u0370-\u03ff\u1f00-\u1fff]/.test(m.text) ? 'en' : 'el'
    window.open(`https://translate.google.com/?sl=auto&tl=${to}&text=${encodeURIComponent(m.text)}&op=translate`, '_blank', 'noopener')
  }

  const mention = C.mentionQuery(text, caret)
  const mentionHits = mention ? state.users.filter((u) => u.active !== false && u.id !== user?.id && (u.name || '').toLowerCase().includes(mention.q.toLowerCase())).slice(0, 6) : []
  const pickMention = (u) => {
    const before = text.slice(0, mention.at)
    const after = text.slice(caret)
    const next = `${before}@${u.name} ${after}`
    setText(next)
    const pos = before.length + u.name.length + 2
    setCaret(pos)
    requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.setSelectionRange(pos, pos) })
  }

  const addFiles = (list) => {
    const vids = canCompressVideo()
    const arr = Array.from(list || []).filter((f) => f.size <= (vids && isVideoFile(f) ? MAX_VIDEO_PICK : MAX_BYTES))
    if (arr.length < (list?.length || 0)) toast('Files over 50 MB were left out.', 'error')
    setPending((p) => [...p, ...arr])
  }

  // voice: a recorded note is sent on its own, without the text box or the files picked
  const send = async (voice = null) => {
    const files = voice ? [voice.file] : pending
    const t = voice ? '' : text.trim()
    if (editing && !voice) {
      if (!t) return
      update((s) => {
        const m = (s.chat || []).find((x) => x.id === editing.id)
        if (m && m.text !== t) { m.text = t; m.editedAt = new Date().toISOString(); m.mentions = C.parseMentions(t, s.users) }
        return s
      })
      setEditing(null); setText(''); return
    }
    if (!t && !files.length) return
    const id = uid()
    const attachments = []
    // videos are readied here, inside the tap, before anything waits: Safari only lets them play then
    const prepared = files.map((f) => (compressMedia && !voice ? prepareVideo(f) : null))
    setSheet(false)
    const replyId = replyTo?.id || ''
    // photos, videos and files go into the conversation at once, and the box is free again
    const outgoing = files.length > 0 && !voice
    const step = (stage, progress) => setOutbox((o) => o.map((x) => (x.id === id ? { ...x, stage, progress } : x)))
    const gone = () => stopped.current.has(id)
    if (outgoing) {
      const previews = files.map((f) => {
        const pid = uid()
        if (/^(image|video)\//.test(f.type)) urlCache.set(pid, { url: URL.createObjectURL(f), until: Date.now() + 3600 * 1000 })
        return { id: pid, name: f.name, type: f.type, bytes: f.size }
      })
      setOutbox((o) => [...o, { id, roomId, text: t, atts: previews, at: new Date().toISOString(), stage: 'Processing…', progress: 0 }])
      // the real shape of each picture, so the bubble does not jump when it is sent
      files.forEach((f, i) => {
        if (!/^(image|video)\//.test(f.type)) return
        mediaSize(f).then((d) => { if (d) setOutbox((o) => o.map((x) => (x.id === id ? { ...x, atts: x.atts.map((a, j) => (j === i ? { ...a, w: d.w, h: d.h } : a)) } : x))) }).catch(() => {})
      })
      setText(''); setPending([]); setReplyTo(null); setCaret(0)
    }
    if (files.length) {
      if (!outgoing) setBusy('Uploading…')
      try {
        await saveDirectRoom(state, room, user?.id)
        for (let i = 0; i < files.length; i++) {
          if (gone()) break
          let f = files[i]
          const of = files.length > 1 ? ` ${i + 1}/${files.length}` : ''
          const part = (x) => (i + x) / files.length
          if (outgoing) step(i ? `Uploading${of}` : 'Processing…', part(0.05)); else setBusy(`Uploading${of}…`)
          let w, h, dur
          if (voice) dur = voice.dur
          if (!compressMedia && /^(image|video)\//.test(f.type)) {
            // original quality: sent as it is, only its size is read for the bubble's shape
            const d = await mediaSize(f)
            if (d) { w = d.w; h = d.h; if (d.duration) dur = Math.round(d.duration) }
          } else if (f.type.startsWith('image/') && !/gif$/i.test(f.type)) {
            const c = await compress(f, prefs.hdPhotos ? { max: 2560, quality: 0.88 } : { max: 1600, quality: 0.82 })
            w = c.w; h = c.h
            f = new File([c.blob], f.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
          } else if (prepared[i]) {
            if (outgoing) step(`Compressing${of}`, part(0.05)); else setBusy(`Compressing video${of}… keep this page open`)
            const c = await compressVideo(prepared[i], (p) => (outgoing ? step(`Compressing${of} ${Math.round(p * 100)}%`, part(0.05 + p * 0.55)) : setBusy(`Compressing video${of}… ${Math.round(p * 100)}%, keep this page open`)))
            if (c) { f = c.file; w = c.w; h = c.h; dur = Math.round(c.duration) }
            if (!outgoing) setBusy(`Uploading${of}…`)
          }
          if (f.size > MAX_BYTES) throw new Error(`${f.name} is over 50 MB${isVideoFile(f) ? (compressMedia ? ' even after compressing. Send a shorter clip.' : '. Switch Compress back on, or send a shorter clip.') : '.'}`)
          const attId = uid()
          const pcloud = pcloudOn(state.settings) ? { folder: chatFolder(state, room), scope: { kind: 'chat', id: roomId } } : null
          if (gone()) break
          if (outgoing) step(`Uploading${of}`, part(0.6))
          const { path, fileid, scope } = await uploadFile({ projectId: C.roomFolder(roomId), id: attId, file: f, pcloud })
          if (outgoing) step(i + 1 < files.length ? `Uploading ${i + 2}/${files.length}` : 'Sending…', part(1))
          // a 24 px picture kept in the message, shown blurred while the real one loads (Telegram)
          const thumb = /^(image|video)\//.test(f.type) ? await tinyThumb(f) : ''
          // the sender sees their own photo or video at once, from the phone, not after a round trip
          if (/^(image|video|audio)\//.test(f.type)) urlCache.set(attId, { url: URL.createObjectURL(f), until: Date.now() + 12 * 3600 * 1000 })
          attachments.push({ id: attId, name: f.name, type: f.type, bytes: f.size, path, ...(fileid ? { fileid, scope } : {}), ...(w ? { w, h } : {}), ...(dur ? { dur } : {}), ...(thumb ? { thumb } : {}) })
        }
      } catch (e) {
        prepared.forEach(releaseVideo)
        setBusy('')
        if (outgoing) {
          // nothing is lost: the files go back over the box to try again
          setOutbox((o) => o.filter((x) => x.id !== id))
          if (!gone()) { setPending((p) => [...files, ...p]); if (t) setText((x) => x || t) }
        }
        return toast(e.message, 'error')
      }
      setBusy('')
      if (outgoing) {
        setOutbox((o) => o.filter((x) => x.id !== id))
        // stopped with the cross: whatever was already uploaded is left out of the chat
        if (gone()) { stopped.current.delete(id); prepared.forEach(releaseVideo); return }
      }
    }
    const mentions = C.parseMentions(t, state.users).filter((x) => x !== user?.id)
    const m = { id, chatId: roomId, userId: user?.id || '', userName: user?.name || 'Someone', text: t, source: 'app', createdAt: new Date().toISOString(), replyTo: replyId, editedAt: '', attachments, mentions }
    update((s) => {
      if (room.unsaved && !(s.chats || []).some((c) => c.id === roomId)) s.chats = [...(s.chats || []), { id: roomId, kind: 'direct', name: '', members: room.members, createdBy: user?.id || '', createdAt: new Date().toISOString() }]
      s.chat = [...(s.chat || []), m]
      return s
    })
    const recipients = C.roomRecipients(state, room, user?.id)
    const where = room.kind === 'team' ? '' : ` in ${room.name}`
    const body = t || (attachments.length ? (isImage(attachments[0]) ? 'Sent a photo' : isVideo(attachments[0]) ? 'Sent a video' : isAudio(attachments[0]) ? 'Sent a voice message' : `Sent ${attachments[0].name}`) : '')
    // One pop-up per sender and room, counting up, so a busy shooting day does not become a wall of modals.
    sendAutoNotice(update, { kind: 'chatMessage', key: `chat:${roomId}:${user?.id || ''}`, count: true, fromId: user?.id, fromName: user?.name, to: recipients.filter((r) => !mentions.includes(r)), title: `Message from ${user?.name || 'the team'}${where}`, body: body.slice(0, 200) })
    // A mention always reaches the person named, even when they switched chat pop-ups off.
    if (mentions.length) sendAutoNotice(update, { kind: 'chatMention', key: `mention:${id}`, fromId: user?.id, fromName: user?.name, to: mentions.filter((x) => recipients.includes(x)), title: `${user?.name || 'Someone'} mentioned you${where}`, body: body.slice(0, 200) })
    if (outgoing) return // the box was emptied when it went out, and may hold the next message by now
    if (!voice) { setText(''); setPending([]) }
    setReplyTo(null); setCaret(0)
  }
  const stopSending = (oid) => { stopped.current.add(oid); setOutbox((o) => o.filter((x) => x.id !== oid)) }

  const remove = (m) => {
    // a forwarded copy points at the same file: the file goes only when no other message uses it
    const shared = (a) => (state.chat || []).some((x) => x.id !== m.id && (x.attachments || []).some((b) => (a.fileid && b.fileid === a.fileid) || (a.path && b.path === a.path)))
    ;(m.attachments || []).forEach((a) => { if (!shared(a)) deleteFile(a).catch(() => {}) })
    update((s) => { s.chat = (s.chat || []).filter((x) => x.id !== m.id); return s })
  }
  /* One reaction per person: the same emoji again takes it off, another one replaces it. */
  const react = (m, emoji) => {
    const me = user?.id
    if (!me) return
    const current = myReaction(m, me)
    if (current !== emoji && emoji === (prefs.quickReaction || '🎥')) { setBurst(m.id); setTimeout(() => setBurst((b) => (b === m.id ? '' : b)), 800) }
    update((s) => {
      const x = (s.chat || []).find((y) => y.id === m.id)
      if (!x) return s
      const r = {}
      Object.entries(x.reactions || {}).forEach(([k, v]) => { const l = (v || []).filter((i) => i !== me); if (l.length) r[k] = l })
      if (current !== emoji) r[emoji] = [...(r[emoji] || []), me]
      x.reactions = r
      if ((x.likes || []).includes(me)) x.likes = x.likes.filter((i) => i !== me)
      return s
    })
  }
  const togglePin = (m) => {
    setPicked('')
    update((s) => { const x = (s.chat || []).find((y) => y.id === m.id); if (x) x.pinnedAt = x.pinnedAt ? '' : new Date().toISOString(); return s })
  }
  const copyText = (m) => {
    setPicked('')
    navigator.clipboard?.writeText(m.text).then(() => toast('Copied', 'ok')).catch(() => toast('Could not copy', 'error'))
  }
  /* Forward: a copy of each message in the conversation picked, with the same files (they now
     belong to that conversation too, so its members can open them). */
  const forwardTo = async (target) => {
    const list = fwd || []
    setFwd(null)
    try { await saveDirectRoom(state, target, user?.id) } catch (e) { return toast(e.message, 'error') }
    const t0 = Date.now()
    update((s) => {
      if (target.unsaved && !(s.chats || []).some((c) => c.id === target.id)) s.chats = [...(s.chats || []), { id: target.id, kind: 'direct', name: '', members: target.members, createdBy: user?.id || '', createdAt: new Date().toISOString() }]
      s.chat = [...(s.chat || []), ...list.map((m, k) => ({
        id: uid(), chatId: target.id, userId: user?.id || '', userName: user?.name || 'Someone', text: m.text, source: 'app', createdAt: new Date(t0 + k).toISOString(), replyTo: '', editedAt: '', mentions: [],
        attachments: (m.attachments || []).map((a) => ({ ...a, id: uid(), ...(a.fileid ? { scope: { kind: 'chat', id: target.id } } : {}) })),
      }))]
      return s
    })
    toast(`Forwarded to ${target.name}`, 'ok')
  }
  const pressStart = (m) => {
    if (sel) return
    clearTimeout(pressRef.current)
    pressRef.current = setTimeout(() => { pressRef.current = 'fired'; navigator.vibrate?.(10); setPicked(m.id) }, 450)
  }
  const pressCancel = () => { if (pressRef.current !== 'fired') { clearTimeout(pressRef.current); pressRef.current = null } }
  // A long press (or a right click, or a click on a computer) opens a message's menu, a tap on a
  // photo or video opens it full screen, two quick taps put a 🎥 on it (or take yours off). The
  // single tap waits a moment so a double tap is not taken for it.
  const onBubbleTap = (e, m, media) => {
    if (pressRef.current === 'fired') { pressRef.current = null; return } // the long press already opened the menu
    if (sel) { setSel((x) => (x.includes(m.id) ? x.filter((y) => y !== m.id) : [...x, m.id])); return }
    // a link, a button or a video that is playing keeps its own tap
    if (e.target.closest('a, button, video[controls]')) return
    if (!mobile && String(window.getSelection?.() || '').trim()) return // selecting text to copy, not a tap
    const tile = e.target.closest('[data-tile]')
    const t = tapRef.current
    const now = Date.now()
    // on a computer the mouse's own double click counts (e.detail), on a phone two taps within 300 ms
    if (t.id === m.id && (mobile ? now - t.at < 300 : e.detail === 2)) {
      clearTimeout(t.timer)
      tapRef.current = { id: '', at: 0, timer: null }
      setPicked('')
      if (prefs.doubleTap === 'reply') startReply(m)
      else react(m, prefs.quickReaction || '🎥')
      return
    }
    clearTimeout(t.timer)
    tapRef.current = { id: m.id, at: now, timer: setTimeout(() => {
      if (picked) setPicked('')
      else if (tile) setViewer({ items: media, i: Number(tile.dataset.tile) || 0 })
      // on a phone the menu is a long press only, as in Telegram (Alex); a click opens it on a computer
      else if (!mobile) setPicked(m.id)
    }, 260) }
  }
  // on a computer a click anywhere else, or Escape, closes the menu (a phone taps the message again)
  useEffect(() => {
    if (mobile || !picked) return
    const away = (e) => { if (!e.target.closest?.(`[data-msg="${picked}"]`)) setPicked('') }
    const esc = (e) => { if (e.key === 'Escape') setPicked('') }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc) }
  }, [picked, mobile])
  useEffect(() => {
    if (!picked) return
    // the whole message with its reactions and menu in view
    const el = scrollRef.current?.querySelector(`[data-msg="${picked}"]`)
    requestAnimationFrame(() => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }, [picked])
  const startEdit = (m) => { setPicked(''); setEditing(m); setReplyTo(null); setText(m.text); requestAnimationFrame(() => inputRef.current?.focus()) }
  const startReply = (m) => { setPicked(''); setReplyTo(m); setEditing(null); requestAnimationFrame(() => inputRef.current?.focus()) }
  const cancelBar = () => { setEditing(null); setReplyTo(null); if (editing) setText('') }
  const jumpTo = (id) => {
    const el = scrollRef.current?.querySelector(`[data-msg="${id}"]`)
    if (!el) return
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200)
  }
  useEffect(() => { if (found[findAt]) jumpTo(found[findAt]) }, [found, findAt])
  // opened from a message found in the list's search: scroll to it once it is on screen
  useEffect(() => {
    const id = pendingJump
    if (!id || !msgs.some((x) => x.id === id)) return undefined
    pendingJump = ''
    const t = setTimeout(() => jumpTo(id), 350)
    return () => clearTimeout(t)
  }, [msgs])
  /* A voice message, Telegram's: the round mic when the box is empty; recording shows the time,
     a bin to drop it and the arrow to send it. MP4 audio where the browser records it (iPhone,
     recent Chrome), WebM otherwise. */
  const canVoice = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported?.(t)) || ''
      const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
      const chunks = []
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
      mr.start(250)
      setRecSecs(0)
      setRec({ mr, stream, chunks, t0: Date.now(), type })
    } catch {
      toast('The microphone is not allowed. Allow it for this site in the browser settings.', 'error')
    }
  }
  useEffect(() => {
    if (!rec) return undefined
    const t = setInterval(() => setRecSecs(Math.floor((Date.now() - rec.t0) / 1000)), 250)
    return () => clearInterval(t)
  }, [rec])
  const stopVoice = (keep) => {
    const r = rec
    if (!r) return
    setRec(null)
    r.mr.onstop = () => {
      r.stream.getTracks().forEach((t) => t.stop())
      if (!keep || !r.chunks.length) return
      const mime = (r.mr.mimeType || r.type || 'audio/webm').split(';')[0]
      const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'
      const stamp = new Date().toTimeString().slice(0, 5).replace(':', '.')
      send({ file: new File(r.chunks, `Voice ${stamp}.${ext}`, { type: mime }), dur: Math.max(1, Math.round((Date.now() - r.t0) / 1000)) })
    }
    try { r.mr.stop() } catch { r.stream.getTracks().forEach((t) => t.stop()) }
  }
  useEffect(() => () => { rec?.stream.getTracks().forEach((t) => t.stop()) }, [rec])
  const addEmoji = (e) => {
    const el = inputRef.current
    const at = el && el.selectionStart != null ? el.selectionStart : text.length
    setText(text.slice(0, at) + e + text.slice(at))
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + e.length, at + e.length) })
  }
  const onKey = (e) => {
    // ↑ in an empty box: edit your last message (Telegram)
    if (e.key === 'ArrowUp' && !text && !editing && !pending.length) {
      const lastMine = [...msgs].reverse().find((x) => x.userId === user?.id && x.text)
      if (lastMine) { e.preventDefault(); startEdit(lastMine); return }
    }
    if (e.key === 'Escape' && (editing || replyTo)) { e.preventDefault(); cancelBar(); return }
    if (e.key !== 'Enter') return
    if (mention && mentionHits.length && !e.shiftKey) { e.preventDefault(); pickMention(mentionHits[0]); return }
    // Settings > Chat: Enter sends (Shift+Enter for a new line), or Enter breaks the line and Cmd/Ctrl+Enter sends
    const sends = prefs.enterSends ? !e.shiftKey : e.metaKey || e.ctrlKey
    if (sends) { e.preventDefault(); send() }
  }
  const renderText = (t) => {
    if (!nameRe || !t.includes('@')) return t
    const parts = t.split(nameRe)
    return parts.map((p, i) => (i % 2 ? <b key={i} className="mention">{p}</b> : p))
  }
  const groupRow = room.kind === 'group' ? (state.chats || []).find((c) => c.id === roomId) : null
  const membersOf = room.kind === 'team' ? state.users.filter((u) => u.active !== false) : room.kind === 'project' ? C.roomRecipients(state, room, '').map((id) => state.users.find((u) => u.id === id)).filter(Boolean) : (room.members || []).map((id) => state.users.find((u) => u.id === id)).filter(Boolean)

  return (
    <div className="chat-box" data-wall={prefs.wallpaper === 'none' ? 'soft' : prefs.wallpaper} data-bubbles="telegram" data-fs={textSizeOf(prefs)} data-density={prefs.density}>
      <div className="chat-head">
        {onBack && <button type="button" className="icon-btn chat-back" onClick={onBack} aria-label="Back">{TgIcon.back()}</button>}
        {/* the name in a pill of its own on a computer (Telegram for Mac); display: contents on a phone */}
        <div className="chat-head-card">
        <RoomAvatar room={room} size={40} />
        <div className="chat-head-main">
          <strong>{room.name}</strong>
          <span className="small muted" title={membersOf.map((u) => u.name).join(', ')}>
            {room.kind === 'direct' ? room.sub || 'Direct message' : `${membersOf.length} ${membersOf.length === 1 ? 'person' : 'people'}`}
          </span>
        </div>
        </div>
        {room.kind === 'project' && isAdmin && <button type="button" className="icon-btn chat-head-ico" onClick={() => setEditMembers(true)} aria-label="Members" title="Members">{TgIcon.people()}</button>}
        {room.kind === 'project' && <Link className="icon-btn chat-head-ico" to={`/p/${room.projectId}`} aria-label="Open project" title="Open project">{TgIcon.project()}</Link>}
        {/* calls, Telegram's: a voice call and a video call with the other person (lib/calls.jsx) */}
        {canCall && <button type="button" className="icon-btn chat-head-ico chat-call" onClick={() => calls.start(room, false)} disabled={calls.busy} aria-label={room.kind === 'direct' ? 'Voice call' : 'Group voice call'} title={room.kind === 'direct' ? 'Voice call' : 'Group voice call'}>{TgIcon.phone()}</button>}
        {canCall && <button type="button" className="icon-btn chat-head-ico chat-call" onClick={() => calls.start(room, true)} disabled={calls.busy} aria-label={room.kind === 'direct' ? 'Video call' : 'Group video call'} title={room.kind === 'direct' ? 'Video call' : 'Group video call'}>{TgIcon.video()}</button>}
        {room.kind === 'direct' && room.otherId && !mobile && <Link className="icon-btn chat-head-ico" to={`/u/${room.otherId}`} aria-label="Profile" title="Profile">{TgIcon.person()}</Link>}
        {room.kind === 'group' && groupRow && <button type="button" className="icon-btn chat-head-ico" onClick={() => setEditGroup(true)} aria-label={isAdmin ? 'Edit group' : 'Add people'} title={isAdmin ? 'Edit group' : 'Add people'}>{TgIcon.people()}</button>}
        {!mobile && <button type="button" className="icon-btn chat-head-ico" onClick={() => { setFind(''); setFindAt(0) }} aria-label="Search in this conversation" title="Search in this conversation">{TgIcon.search()}</button>}
        <span className="chat-more-wrap">
          <button type="button" className="icon-btn chat-head-ico" onClick={() => setRoomMenu((v) => !v)} aria-label="More" title="More">{TgIcon.more()}</button>
          {roomMenu && (
            <>
              <span className="chat-room-menu-scrim" onClick={() => setRoomMenu(false)} />
              <span className="chat-menu chat-room-menu" role="menu">
                {room.kind === 'direct' && room.otherId && mobile && <button type="button" onClick={() => { setRoomMenu(false); nav(`/u/${room.otherId}`) }}>{TgIcon.person()}<span>Profile</span></button>}
                <button type="button" onClick={() => { setRoomMenu(false); setFind(''); setFindAt(0) }}>{TgIcon.search()}<span>Search</span></button>
                <button type="button" onClick={() => { setRoomMenu(false); setShared(true) }}>{TgIcon.media()}<span>Photos, videos &amp; files</span></button>
                {pinnedMsg && <button type="button" onClick={() => { setRoomMenu(false); jumpTo(pinnedMsg.id) }}>{TgIcon.pin()}<span>Pinned message</span></button>}
                <button type="button" onClick={() => { setMuted(toggleMuted(room.id).includes(room.id)); setRoomMenu(false) }}>{TgIcon.bell()}<span>{muted ? 'Unmute sounds' : 'Mute sounds'}</span></button>
              </span>
            </>
          )}
        </span>
      </div>
      {canCall && liveOthers > 0 && calls.inCall !== room.id && (
        <button type="button" className="chat-livecall" onClick={() => calls.start(room, liveCall.video)} disabled={calls.busy}>
          <span className="chat-livecall-dot" aria-hidden="true" />
          <span className="grow">{liveCall.video ? 'Group video call' : 'Group voice call'} · {liveOthers} in it</span>
          <b>Join</b>
        </button>
      )}
      {find !== null && (
        <div className="chat-findbar">
          {TgIcon.search()}
          <input className="input" autoFocus value={find} onChange={(e) => { setFind(e.target.value); setFindAt(0) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setFindAt((i) => (found.length ? (i + 1) % found.length : 0)) } if (e.key === 'Escape') setFind(null) }} placeholder="Search in this conversation" name="chat-find" autoComplete="off" />
          <span className="chat-findbar-n">{find.trim() ? (found.length ? `${findAt + 1} of ${found.length}` : 'No results') : ''}</span>
          <button type="button" onClick={() => setFindAt((i) => Math.min(found.length - 1, i + 1))} disabled={findAt >= found.length - 1} aria-label="Older">⌃</button>
          <button type="button" onClick={() => setFindAt((i) => Math.max(0, i - 1))} disabled={findAt <= 0} aria-label="Newer">⌄</button>
          <button type="button" onClick={() => setFind(null)} aria-label="Close search">{TgIcon.close()}</button>
        </div>
      )}
      {sel && (
        // Select: the header becomes the bar for the messages picked
        <div className="chat-selbar">
          <button type="button" onClick={() => setSel(null)}>Cancel</button>
          <strong>{sel.length} selected</strong>
          <button type="button" disabled={!sel.length} onClick={() => { setFwd(msgs.filter((x) => sel.includes(x.id))); setSel(null) }}>Forward</button>
          {sel.length > 0 && msgs.filter((x) => sel.includes(x.id)).every((x) => x.userId === user?.id || isAdmin) && (
            <Confirm className="chat-selbar-del" onConfirm={() => { msgs.filter((x) => sel.includes(x.id)).forEach(remove); setSel(null) }} label="Delete">Delete</Confirm>
          )}
        </div>
      )}
      {pinnedMsg && !sel && (
        <div className="chat-pinbar" role="button" onClick={() => jumpTo(pinnedMsg.id)}>
          <span className="chat-pinbar-main"><b>Pinned Message</b><span>{pinnedMsg.text || attLabel((pinnedMsg.attachments || [])[0] || {}) || ''}</span></span>
          <button type="button" className="chat-pinbar-x" onClick={(e) => { e.stopPropagation(); togglePin(pinnedMsg) }} aria-label="Unpin" title="Unpin">{TgIcon.pin()}</button>
        </div>
      )}
      <div className={`chat-scroll${sel ? ' selecting' : ''}`} ref={scrollRef}>
        {/* behind the open menu: the rest of the room blurred, a tap closes it. Inside the scroll,
            next to the messages: on the iPhone the scroll is a layer of its own, and a blur outside
            it covered the held message and its menu too (Alex, 11 Oct) */}
        {picked && <div className="chat-menu-scrim" onClick={() => setPicked('')} />}
        {!msgs.length && <p className="muted chat-empty">{room.kind === 'team' ? 'No messages yet. Say hi to the team.' : room.kind === 'direct' ? `No messages with ${room.name} yet.` : 'No messages yet.'}</p>}
        {groups.map((g) => (
          <div key={g.day} className="chat-day">
            <div className="chat-day-label"><span>{dayLabel(g.day)}</span></div>
            {g.items.map((m, i) => {
              const mine = m.userId && m.userId === user?.id
              // a run: same person, less than five minutes apart. First of a run carries the top tail
              // (WhatsApp), last of a run the bottom tail (Telegram).
              const follows = (a, b) => !!a && a.userId === b.userId && a.userName === b.userName && new Date(b.createdAt) - new Date(a.createdAt) < 5 * 60 * 1000
              const cont = follows(g.items[i - 1], m)
              const last = !g.items[i + 1] || !follows(m, g.items[i + 1])
              const quoted = m.replyTo ? byId[m.replyTo] : null
              const showWho = !cont && !mine && room.kind !== 'direct'
              // photos and videos as Telegram shows them: big, edge to edge, the time on the picture
              const media = (m.attachments || []).filter(isMedia)
              const files = (m.attachments || []).filter((a) => !isMedia(a))
              const mediaOnly = media.length > 0 && !files.length && !m.text && !m.replyTo && !showWho
              const rx = reactionsOf(m)
              const nameOf = (id) => state.users.find((u) => u.id === id)?.name || 'Someone'
              const likesBtn = Object.keys(rx).length > 0 && (
                <span className="chat-rx">
                  {Object.entries(rx).map(([k, ids]) => (
                    <button key={k} type="button" className={`chat-likes ${ids.includes(user?.id) ? 'mine' : ''}`} onClick={() => react(m, k)} title={ids.map(nameOf).join(', ')}>
                      {k}{ids.length > 1 && <b>{ids.length}</b>}
                    </button>
                  ))}
                </span>
              )
              const mineRx = myReaction(m, user?.id)
              const bigEmoji = prefs.bigEmoji && !media.length && !files.length && !m.replyTo && isEmojiOnly(m.text)
              const seen = mine ? seenBy(m) : []
              const nReplies = repliesTo(m).length
              const tick = mine ? <span className={`chat-tick${seen.length ? ' seen' : ''}`} title={seen.length ? `Seen by ${seen.map((u) => u.name).join(', ')}` : 'Sent'}>{seen.length ? '✓✓' : '✓'}</span> : null
              const selected = sel?.includes(m.id)
              return (
                <div key={m.id} data-msg={m.id} className={`chat-msg ${mine ? 'mine' : ''} ${cont ? 'cont' : ''} ${last ? 'last' : ''} ${picked === m.id ? 'picked' : ''} ${selected ? 'selected' : ''} ${found.includes(m.id) ? (found[findAt] === m.id ? 'found now' : 'found') : ''}`} onClick={sel ? (e) => onBubbleTap(e, m, media) : undefined}>
                  {sel && <span className="chat-sel-dot" aria-hidden="true">{selected ? '✓' : ''}</span>}
                  {!mine && room.kind !== 'direct' && prefs.avatars && (
                    <span className="chat-avatar">
                      {(mobile ? last : !cont) && (photoOf(m.userId) ? <img src={photoOf(m.userId)} alt="" /> : (m.userName || '').split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase())}
                    </span>
                  )}
                  <div className="chat-bubble-wrap">
                    {picked === m.id && (
                      <div className="chat-react-bar">
                        {REACTIONS.map((r) => <button key={r} type="button" className={mineRx === r ? 'on' : ''} onClick={() => { setPicked(''); react(m, r) }}>{r}</button>)}
                      </div>
                    )}
                    <div className={`chat-bubble${media.length ? ' has-media' : ''}${mediaOnly ? ' media-only' : ''}${bigEmoji ? ' big-emoji' : ''}`} onClick={sel ? undefined : (e) => onBubbleTap(e, m, media)} onMouseDown={mobile ? undefined : (e) => { if (e.detail > 1) e.preventDefault() }}
                      onTouchStart={() => pressStart(m)} onTouchMove={pressCancel} onTouchEnd={pressCancel} onContextMenu={(e) => { if (sel) return; e.preventDefault(); setPicked(m.id) }}>
                      {burst === m.id && <span className="chat-heart-burst" aria-hidden="true">{prefs.quickReaction || '🎥'}</span>}
                      {showWho && <div className="chat-who" style={{ '--who': `hsl(${senderHue(m.userId)} 55% 42%)` }}>{m.userId ? <Link to={`/u/${m.userId}`}>{m.userName}</Link> : m.userName}</div>}
                      {m.replyTo && (
                        <div className="chat-quote" onClick={() => quoted && jumpTo(quoted.id)} role={quoted ? 'button' : undefined}>
                          {quoted ? <><b>{quoted.userId === user?.id ? 'You' : quoted.userName}</b><span>{quoted.text || (quoted.attachments?.length ? attLabel(quoted.attachments[0]) : '')}</span></> : <span>Message deleted</span>}
                        </div>
                      )}
                      {media.length > 0 && <MediaAlbum items={media} meta={mediaOnly ? <>{likesBtn}<span className="chat-time">{timeOf(m.createdAt)}{tick}</span></> : null} />}
                      {files.map((a) => <Attachment key={a.id} a={a} />)}
                      {m.text && (bigEmoji && prefs.animatedEmoji
                        ? <span className={`chat-text noto-big n${emojiParts(m.text).length}`}>{emojiParts(m.text).map((g, i) => <NotoEmoji key={`${i}${g}`} e={g} />)}</span>
                        : <span className="chat-text">{renderText(m.text)}</span>)}
                      {m.editedAt && <span className="chat-edited">edited</span>}
                      {/* hearts on a line of their own, the time beside them, as Telegram does */}
                      {!mediaOnly && likesBtn && (
                        <>
                          {(m.text || m.editedAt) && <br />}
                          {likesBtn}
                        </>
                      )}
                      {!mediaOnly && <span className="chat-time">{nReplies > 0 && <button type="button" className="chat-nreplies" onClick={() => setRepliesOf(m)} title="View replies">↩ {nReplies}</button>}{timeOf(m.createdAt)}{tick}</span>}
                    </div>
                    {picked === m.id && (
                      // the message's menu, Telegram's: a column of actions under the message
                      <div className="chat-menu" role="menu">
                        <button type="button" onClick={() => startReply(m)}>{TgIcon.reply()}<span>Reply</span></button>
                        {m.text && <button type="button" onClick={() => translate(m)}>{TgIcon.translate()}<span>Translate</span></button>}
                        {m.text && <button type="button" onClick={() => copyText(m)}>{TgIcon.copy()}<span>Copy Text</span></button>}
                        <button type="button" onClick={() => copyLink(m)}>{TgIcon.link()}<span>Copy Message Link</span></button>
                        {media.length > 0 && <button type="button" onClick={() => { setPicked(''); setViewer({ items: media, i: 0 }) }}>{TgIcon.download()}<span>{media.length > 1 ? 'Save' : isVideo(media[0]) ? 'Save Video' : 'Save Image'}</span></button>}
                        <span className="chat-menu-sep" />
                        {nReplies > 0 && <button type="button" onClick={() => { setPicked(''); setRepliesOf(m) }}>{TgIcon.replies()}<span>View {nReplies} {nReplies === 1 ? 'Reply' : 'Replies'}</span></button>}
                        {mine && m.text && <button type="button" onClick={() => startEdit(m)}>{TgIcon.edit()}<span>Edit</span></button>}
                        <button type="button" onClick={() => togglePin(m)}>{TgIcon.pin()}<span>{m.pinnedAt ? 'Unpin' : 'Pin'}</span></button>
                        <button type="button" onClick={() => { setPicked(''); setFwd([m]) }}>{TgIcon.forward()}<span>Forward</span></button>
                        <button type="button" onClick={() => { setPicked(''); setSel([m.id]) }}>{TgIcon.select()}<span>Select</span></button>
                        {mine && (
                          <>
                            <span className="chat-menu-sep" />
                            <button type="button" className="chat-menu-seen" onClick={() => setSeenOpen((v) => (v === m.id ? '' : m.id))} disabled={!seen.length}>
                              <span className="chat-tick seen">✓✓</span><span>{seen.length ? `${seen.length} Seen` : 'Not seen yet'}</span>
                              <span className="chat-menu-faces">{seen.slice(0, 3).map((u) => <span key={u.id} className="chat-menu-face">{photoOf(u.id) ? <img src={photoOf(u.id)} alt="" /> : (u.name || '?')[0]}</span>)}</span>
                            </button>
                            {seenOpen === m.id && <span className="chat-menu-seenlist">{seen.map((u) => <span key={u.id}><span className="chat-menu-face">{photoOf(u.id) ? <img src={photoOf(u.id)} alt="" /> : (u.name || '?')[0]}</span>{u.name}</span>)}</span>}
                          </>
                        )}
                        {(mine || isAdmin) && (
                          <>
                            <span className="chat-menu-sep" />
                            <Confirm className="chat-menu-del" onConfirm={() => { setPicked(''); remove(m) }} label="Delete">{TgIcon.trash()}<span>Delete</span></Confirm>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        {outbox.filter((o) => o.roomId === roomId).map((o) => {
          const pics = o.atts.filter(isMedia)
          const docs = o.atts.filter((a) => !isMedia(a))
          const ring = (
            <button type="button" className="chat-out-ring" onClick={() => stopSending(o.id)} aria-label="Stop sending" title="Stop sending">
              <svg viewBox="0 0 48 48" aria-hidden="true"><circle className="track" cx="24" cy="24" r="20" /><circle className="bar" cx="24" cy="24" r="20" style={{ strokeDasharray: `${Math.max(0.08, o.progress) * 125.7} 125.7` }} /></svg>
              <span>{TgIcon.close()}</span>
            </button>
          )
          const clock = <span className="chat-time">{timeOf(o.at)}<span className="chat-out-clock" aria-label="Sending" /></span>
          return (
            <div key={o.id} className="chat-msg mine last outgoing">
              <div className="chat-bubble-wrap">
                <div className={`chat-bubble${pics.length ? ' has-media' : ''}${pics.length && !docs.length && !o.text ? ' media-only' : ''}`}>
                  {pics.length > 0 && (
                    <div className="chat-out-media">
                      <MediaAlbum items={pics} meta={!docs.length && !o.text ? clock : null} />
                      <span className="chat-out-stage">{o.stage}</span>
                      {ring}
                    </div>
                  )}
                  {docs.map((a) => (
                    <div key={a.id} className="chat-file chat-out-file">
                      {!pics.length && ring}
                      <span className="chat-file-main"><strong>{a.name}</strong><small>{o.stage} · {fmtBytes(a.bytes || 0)}</small></span>
                    </div>
                  ))}
                  {o.text && <span className="chat-text">{o.text}</span>}
                  {(docs.length > 0 || o.text) && clock}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
      {state.chatRooms === false && room.kind !== 'team' ? (
        <p className="chat-legacy">This room needs supabase/chat_rooms.sql to be run in the SQL editor first.</p>
      ) : (
      <div className="chat-compose-wrap">
        {(replyTo || editing) && (
          <div className="chat-bar">
            <span className="grow">{editing ? <>Editing your message</> : <>Replying to <b>{replyTo.userId === user?.id ? 'yourself' : replyTo.userName}</b>: {(replyTo.text || 'attachment').slice(0, 80)}</>}</span>
            <button type="button" className="icon-btn" onClick={cancelBar} aria-label="Cancel">×</button>
          </div>
        )}
        {pending.length > 0 && (
          <div className="chat-pending">
            {pending.map((f, i) => <span key={i} className="chip on">{fileIcon(f.name, f.type)} {f.name} <small>{fmtBytes(f.size)}</small><button type="button" className="chip-x" onClick={() => setPending((p) => p.filter((_, j) => j !== i))} aria-label="Remove">×</button></span>)}
          </div>
        )}
        <div className="chat-compose">
          {mention && mentionHits.length > 0 && (
            <div className="chat-mention-pick">
              {mentionHits.map((u) => <button key={u.id} type="button" onMouseDown={(e) => { e.preventDefault(); pickMention(u) }}>@{u.name}<small>{u.profile?.position || ''}</small></button>)}
            </div>
          )}
          {rec ? (
            // recording a voice message
            <div className="chat-rec">
              <span className="chat-rec-dot" aria-hidden="true" />
              <b>{Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, '0')}</b>
              <span className="grow muted">Recording…</span>
              <button type="button" className="icon-btn chat-rec-bin" onClick={() => stopVoice(false)} aria-label="Delete the recording" title="Delete">{TgIcon.trash()}</button>
              <button type="button" className="chat-send ready" onClick={() => stopVoice(true)} aria-label="Send the voice message" title="Send"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M3.4 20.4l17.4-7.5c.8-.4.8-1.5 0-1.8L3.4 3.6c-.7-.3-1.4.3-1.3 1l1.2 5.7c.1.4.4.7.8.7l9.4 1-9.4 1c-.4 0-.7.3-.8.7L2.1 19.4c-.1.7.6 1.3 1.3 1z" /></svg></button>
            </div>
          ) : (
            <>
              {!editing && <button type="button" className="icon-btn chat-attach" title="Photo, video or file" onClick={() => setSheet(true)} disabled={!!busy}>{TgIcon.clip()}</button>}
              {/* autoComplete off: the iPhone stops offering AutoFill Contact and your own name above the keyboard */}
              <textarea ref={inputRef} className="input" rows={1} name="chat-message" autoComplete="off" autoCorrect={prefs.spell ? 'on' : 'off'} spellCheck={prefs.spell} value={text} onChange={(e) => { setText(e.target.value); setCaret(e.target.selectionStart) }} onKeyUp={(e) => setCaret(e.target.selectionStart)} onClick={(e) => setCaret(e.target.selectionStart)} onKeyDown={onKey} placeholder={mobile ? 'Message' : 'Write a message…'} title={mobile ? undefined : prefs.enterSends ? 'Enter sends, Shift+Enter for a new line. Type @ to mention someone' : 'Enter for a new line, Cmd/Ctrl+Enter sends. Type @ to mention someone'} data-form-type="other" data-lpignore="true" disabled={!!busy} />
              {/* inside the box on its right; on a phone Telegram's sticker mark (Alex, 9 Oct) */}
              <span className="chat-emoji-wrap">
                <button type="button" className="icon-btn chat-emoji-btn" onClick={() => setEmoji((v) => !v)} aria-label="Emoji" title="Emoji">{mobile ? TgIcon.sticker() : TgIcon.smile()}</button>
                {emoji && (
                  <>
                    <span className="chat-room-menu-scrim" onClick={() => setEmoji(false)} />
                    <span className="chat-emoji-pick">{EMOJIS.map((e) => <button key={e} type="button" onClick={() => addEmoji(e)} aria-label={e}>{prefs.animatedEmoji ? <NotoEmoji e={e} animated={false} /> : e}</button>)}</span>
                  </>
                )}
              </span>
              {!text.trim() && !pending.length && !editing && canVoice && !busy ? (
                <button type="button" className="chat-send chat-mic" onClick={startVoice} aria-label="Record a voice message" title="Voice message">{TgIcon.mic()}</button>
              ) : (
                <button type="button" className={`chat-send${text.trim() || pending.length ? ' ready' : ''}`} onClick={() => send()} disabled={!!busy || (!text.trim() && !pending.length)} title={editing ? 'Save (Enter)' : 'Send (Enter)'} aria-label={editing ? 'Save' : 'Send'}>
                  {busy ? '…' : editing ? '✓' : <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M3.4 20.4l17.4-7.5c.8-.4.8-1.5 0-1.8L3.4 3.6c-.7-.3-1.4.3-1.3 1l1.2 5.7c.1.4.4.7.8.7l9.4 1-9.4 1c-.4 0-.7.3-.8.7L2.1 19.4c-.1.7.6 1.3 1.3 1z" /></svg>}
                </button>
              )}
            </>
          )}
        </div>
        {busy && <div className="chat-bar chat-busy">{busy}</div>}
      </div>
      )}
      {repliesOf && (
        <Modal open title="Replies" onClose={() => setRepliesOf(null)}>
          <div className="chat-replies">
            {repliesTo(repliesOf).map((x) => (
              <button key={x.id} type="button" className="chat-replies-row" onClick={() => { setRepliesOf(null); jumpTo(x.id) }}>
                <b>{x.userId === user?.id ? 'You' : x.userName}</b>
                <span>{x.text || attLabel((x.attachments || [])[0] || {})}</span>
                <small>{listTime(x.createdAt)}</small>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {shared && (
        <Modal open wide title="Photos, videos & files" onClose={() => setShared(false)}>
          <SharedMedia msgs={msgs} onOpen={(items, i) => setViewer({ items, i })} />
        </Modal>
      )}
      {fwd && (
        <Modal open title={fwd.length > 1 ? `Forward ${fwd.length} messages` : 'Forward to…'} onClose={() => setFwd(null)}>
          <div className="chat-people">
            {C.sortRooms(C.roomsFor(state, user), state.chat).filter((r) => r.id !== roomId).map((r) => (
              <button key={r.id} type="button" className="chat-room-item" onClick={() => forwardTo(r)}>
                <RoomAvatar room={r} size={42} />
                <span className="chat-rmain"><span className="chat-rtop"><strong>{r.name}</strong></span>{r.sub && <span className="chat-rbottom"><span className="chat-rprev">{r.sub}</span></span>}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {viewer && <MediaViewer items={viewer.items} start={viewer.i} onClose={() => setViewer(null)} />}
      {sheet && <AttachSheet pending={pending} onAdd={addFiles} onRemove={(i) => setPending((p) => p.filter((_, j) => j !== i))} compress={compressMedia} setCompress={setCompressMedia} text={text} setText={setText} onSend={() => send()} onClose={() => setSheet(false)} />}
      {groupRow && <GroupModal open={editGroup} group={groupRow} onClose={() => setEditGroup(false)} onSaved={() => setEditGroup(false)} />}
      {room.kind === 'project' && isAdmin && <ProjectMembersModal open={editMembers} projectId={room.projectId} onClose={() => setEditMembers(false)} />}
    </div>
  )
}

/* Photos and videos of one message, Telegram-like: one fills the bubble at its own shape, several
   wide ones stack, the rest sit two by two as squares (an odd first one spans the row). */
function MediaAlbum({ items, meta }) {
  const n = items.length
  const wide = items.every((a) => a.w && a.h && a.w >= a.h)
  const layout = n === 1 ? 'one' : wide ? 'stack' : 'grid'
  // one tall picture is drawn narrower, as Telegram does, instead of a full-width strip cropped
  const one = items[0]
  const style = layout === 'one' && one.w && one.h && one.h > one.w ? { width: `min(var(--media-w), ${Math.round((300 * one.w) / one.h)}px)` } : undefined
  return (
    <div className={`chat-media chat-media-${layout}${n % 2 ? ' odd' : ''}${items.some(isVideo) ? ' has-video' : ''}`} style={style}>
      {items.map((a, i) => <MediaTile key={a.id} a={a} i={i} shaped={layout !== 'grid'} />)}
      {meta && <span className="chat-media-meta">{meta}</span>}
    </div>
  )
}
/* A pCloud link the phone cannot show: the file comes through the pcloud function instead. */
function useMediaSrc(a) {
  const [link, failed, retry] = useAttachmentUrl(a)
  const [local, setLocal] = useState('')
  const [tried, setTried] = useState(false)
  const viaFunction = () => {
    if (tried || !a.fileid) return
    setTried(true)
    pcloudBlob(a.fileid, a.scope).then((b) => {
      // pCloud may send the file as octet-stream, which an iPhone will not play: give it its real type
      const u = URL.createObjectURL(a.type ? new Blob([b], { type: a.type }) : b)
      urlCache.set(a.id, { url: u, until: Date.now() + 12 * 3600 * 1000 })
      setLocal(u)
    }).catch(() => {})
  }
  return [local || link, failed, retry, viaFunction]
}
/* One picture or video in a message. A tap opens the message's menu (Reply, Open, Edit, Delete),
   like any message; a video plays from its own round play button. The phone's own controls show
   only while it plays: paused, they go and the round button is back in the middle (Alex, 11 Oct). */
function MediaTile({ a, i, shaped }) {
  const [url, failed, retry, viaFunction] = useMediaSrc(a)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const vref = useRef(null)
  // while it loads: the tiny picture kept in the message, blurred, with a spinner (no broken image)
  const style = { ...(shaped && a.w && a.h ? { aspectRatio: `${a.w} / ${a.h}` } : {}), ...(a.thumb ? { '--thumb': `url("${a.thumb}")` } : {}) }
  const cls = `chat-media-tile${loaded ? ' loaded' : ''}${a.thumb ? ' has-thumb' : ''}`
  if (!url && failed) return <button type="button" className={`${cls} chat-media-wait chat-att-retry`} style={style} onClick={retry}>Tap to load</button>
  if (isVideo(a)) {
    return (
      <span className={`${cls} chat-media-vid`} style={style} data-tile={i}>
        {url && <video ref={vref} src={`${url}#t=0.1`} controls={playing} playsInline preload="metadata" title={a.name} onError={viaFunction} onLoadedMetadata={() => setLoaded(true)} onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} />}
        {!loaded && <span className="chat-media-spin" aria-hidden="true" />}
        {loaded && !playing && <button type="button" className="chat-media-play" aria-label="Play" onClick={() => { setPlaying(true); requestAnimationFrame(() => vref.current?.play().catch(() => {})) }}>▶</button>}
        {!playing && a.dur > 0 && <span className="chat-media-dur">{Math.floor(a.dur / 60)}:{String(a.dur % 60).padStart(2, '0')}</span>}
      </span>
    )
  }
  return (
    <span className={cls} style={style} title={a.name} data-tile={i}>
      {url && <img src={url} alt={a.name} loading="lazy" draggable={false} onLoad={() => setLoaded(true)} onError={viaFunction} />}
      {!loaded && <span className="chat-media-spin" aria-hidden="true" />}
    </span>
  )
}
/* Full screen, black, one picture or video at a time; arrows or a swipe for an album. */
function MediaViewer({ items, start, onClose }) {
  const [i, setI] = useState(start || 0)
  const a = items[i]
  const [url] = useMediaSrc(a)
  const touch = useRef(null)
  // Save: on a phone the share sheet (Save Image / Save Video to Photos), else a download. A
  // picture is fetched as soon as it shows, so the share sheet can open right from the tap.
  const [blob, setBlob] = useState(null)
  useEffect(() => {
    setBlob(null)
    if (isVideo(a) || !url) return undefined
    let on = true
    ;(a.fileid ? pcloudBlob(a.fileid, a.scope) : fetch(url).then((r) => r.blob())).then((b) => { if (on) setBlob(b) }).catch(() => {})
    return () => { on = false }
  }, [a.id, url])
  const save = async () => {
    let b = blob
    if (!b) { try { b = a.fileid ? await pcloudBlob(a.fileid, a.scope) : await (await fetch(url)).blob() } catch { b = null } }
    const file = b ? new File([b], a.name || 'file', { type: b.type || a.type }) : null
    if (file && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return } catch (e) { if (e?.name === 'AbortError') return }
    }
    const el = document.createElement('a')
    el.href = b ? URL.createObjectURL(b) : url
    el.download = a.name || 'file'
    el.target = '_blank'
    document.body.appendChild(el); el.click(); el.remove()
  }
  const go = (d) => setI((x) => Math.min(items.length - 1, Math.max(0, x + d)))
  /* Double tap zooms the picture in where you tapped, a finger moves it around, another double tap
     brings it back (Alex, 11 Oct). Zoomed in, swipes move the picture instead of closing it or going
     through the album. */
  const imgRef = useRef(null)
  const lastTap = useRef({ t: 0, x: 0, y: 0 })
  const touchZoomAt = useRef(0) // a phone's double tap also fires a double click: counted once
  const [zoom, setZoom] = useState({ s: 1, x: 0, y: 0, anim: false })
  const zoomed = zoom.s > 1
  useEffect(() => { setZoom({ s: 1, x: 0, y: 0, anim: false }) }, [i])
  // the picture never slides off its own edges
  const clampZoom = (z) => {
    const el = imgRef.current
    if (!el || z.s <= 1) return { s: 1, x: 0, y: 0, anim: z.anim }
    const mx = (el.offsetWidth * (z.s - 1)) / 2
    const my = (el.offsetHeight * (z.s - 1)) / 2
    return { ...z, x: Math.max(-mx, Math.min(mx, z.x)), y: Math.max(-my, Math.min(my, z.y)) }
  }
  const toggleZoom = (px, py) => {
    const el = imgRef.current
    if (!el || isVideo(a)) return
    if (zoomed) { setZoom({ s: 1, x: 0, y: 0, anim: true }); return }
    const r = el.getBoundingClientRect()
    const s = 2.5
    // keeps the tapped point under the finger
    setZoom(clampZoom({ s, x: (r.left + r.width / 2 - px) * (s - 1), y: (r.top + r.height / 2 - py) * (s - 1), anim: true }))
  }
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])
  return createPortal(
    <div className="chat-viewer" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, zx: zoom.x, zy: zoom.y } }}
      onTouchMove={(e) => {
        const p = touch.current
        if (!p || !zoomed || e.touches.length !== 1) return
        setZoom(clampZoom({ s: zoom.s, x: p.zx + e.touches[0].clientX - p.x, y: p.zy + e.touches[0].clientY - p.y, anim: false }))
      }}
      onTouchEnd={(e) => {
        const p = touch.current
        if (!p) return
        const ex = e.changedTouches[0].clientX
        const ey = e.changedTouches[0].clientY
        const dx = ex - p.x
        const dy = ey - p.y
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && e.target === imgRef.current) {
          const now = Date.now()
          const l = lastTap.current
          if (now - l.t < 320 && Math.abs(ex - l.x) < 40 && Math.abs(ey - l.y) < 40) {
            lastTap.current = { t: 0, x: 0, y: 0 }
            touchZoomAt.current = now
            toggleZoom(ex, ey)
          } else lastTap.current = { t: now, x: ex, y: ey }
          return
        }
        if (zoomed) return
        // a swipe down closes it (as in Telegram), sideways goes through the album
        if (dy > 90 && Math.abs(dx) < 70) onClose()
        else if (Math.abs(dx) > 50 && Math.abs(dy) < 80) go(dx < 0 ? 1 : -1)
      }}>
      <button type="button" className="chat-viewer-x" onClick={onClose} aria-label="Close">{TgIcon.close()}<span>Close</span></button>
      {items.length > 1 && <span className="chat-viewer-n">{i + 1} / {items.length}</span>}
      {!url ? <span className="chat-viewer-wait">…</span>
        : isVideo(a) ? <video key={a.id} src={url} controls autoPlay playsInline />
        : <img key={a.id} ref={imgRef} src={url} alt={a.name} draggable={false}
            className={zoomed ? 'zoomed' : ''}
            style={{ transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`, transition: zoom.anim ? 'transform .25s ease' : 'none' }}
            onDoubleClick={(e) => { if (Date.now() - touchZoomAt.current > 700) toggleZoom(e.clientX, e.clientY) }} />}
      {items.length > 1 && i > 0 && <button type="button" className="chat-viewer-nav prev" onClick={() => go(-1)} aria-label="Previous">‹</button>}
      {items.length > 1 && i < items.length - 1 && <button type="button" className="chat-viewer-nav next" onClick={() => go(1)} aria-label="Next">›</button>}
      {url && <button type="button" className="chat-viewer-save" onClick={save}>{TgIcon.download()} Save</button>}
    </div>,
    document.body,
  )
}

/* The sheet the paperclip opens (Alex, 8 Oct, from Telegram's): what you picked in a grid, a
   switch to send photos and videos in original quality, a caption and Send, and Gallery /
   Camera / File below. A web page cannot show the phone's photo library itself, so Gallery opens
   the phone's own picker. */
function AttachSheet({ pending, onAdd, onRemove, compress, setCompress, text, setText, onSend, onClose }) {
  const galleryRef = useRef(null)
  const cameraRef = useRef(null)
  const fileRef = useRef(null)
  const thumbs = useMemo(() => pending.map((f) => (/^(image|video)\//.test(f.type) ? URL.createObjectURL(f) : '')), [pending])
  useEffect(() => () => thumbs.forEach((u) => u && URL.revokeObjectURL(u)), [thumbs])
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  const hasMedia = pending.some((f) => /^(image|video)\//.test(f.type))
  const pick = (ref) => ref.current?.click()
  const take = (e) => { onAdd(e.target.files); e.target.value = '' }
  return createPortal(
    <>
      <div className="chat-sheet-scrim" onClick={onClose} />
      <div className="chat-sheet" role="dialog" aria-label="Send photos, videos or files">
        <div className="chat-sheet-head">
          <button type="button" className="chat-sheet-x" onClick={onClose} aria-label="Close">{TgIcon.close()}</button>
          <strong>{pending.length ? `${pending.length} selected` : 'Send'}</strong>
          <span className="chat-sheet-x-spacer" />
        </div>
        {pending.length > 0 ? (
          <div className="chat-sheet-grid">
            {pending.map((f, i) => (
              <div key={i} className="chat-sheet-tile">
                {thumbs[i] && f.type.startsWith('video/') ? <video src={`${thumbs[i]}#t=0.1`} muted playsInline preload="metadata" />
                  : thumbs[i] ? <img src={thumbs[i]} alt={f.name} />
                  : <span className="chat-sheet-doc"><span className="file-ico">{fileIcon(f.name, f.type)}</span><small>{f.name}</small></span>}
                {f.type.startsWith('video/') && <span className="chat-sheet-play">▶</span>}
                <span className="chat-sheet-size">{fmtBytes(f.size)}</span>
                <button type="button" className="chat-sheet-rm" onClick={() => onRemove(i)} aria-label="Remove">×</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="chat-sheet-empty">Pick photos, videos or files to send.</p>
        )}
        {hasMedia && (
          <button type="button" className="chat-sheet-opt" role="switch" aria-checked={compress} onClick={() => setCompress(!compress)}>
            <span><b>Compress photos and videos</b><small>{compress ? 'Smaller and quicker, like WhatsApp' : 'Off: sent in original quality, up to 50 MB each'}</small></span>
            <span className={`chat-switch ${compress ? 'on' : ''}`} aria-hidden="true" />
          </button>
        )}
        {pending.length > 0 && (
          <div className="chat-sheet-send">
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a caption" autoComplete="off" name="chat-caption" />
            <button type="button" className="chat-send ready" onClick={onSend} aria-label="Send">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M3.4 20.4l17.4-7.5c.8-.4.8-1.5 0-1.8L3.4 3.6c-.7-.3-1.4.3-1.3 1l1.2 5.7c.1.4.4.7.8.7l9.4 1-9.4 1c-.4 0-.7.3-.8.7L2.1 19.4c-.1.7.6 1.3 1.3 1z" /></svg>
            </button>
          </div>
        )}
        <div className="chat-sheet-tabs">
          <button type="button" onClick={() => pick(galleryRef)}>{TgIcon.image()}<span>Gallery</span></button>
          <button type="button" onClick={() => pick(cameraRef)}>{TgIcon.camera()}<span>Camera</span></button>
          <button type="button" onClick={() => pick(fileRef)}>{TgIcon.file()}<span>File</span></button>
        </div>
        <input ref={galleryRef} type="file" accept="image/*,video/*" multiple hidden onChange={take} />
        <input ref={cameraRef} type="file" accept="image/*,video/*" capture="environment" hidden onChange={take} />
        <input ref={fileRef} type="file" multiple hidden onChange={take} />
      </div>
    </>,
    document.body,
  )
}

/* Everything sent in a conversation, newest first: photos and videos in a grid, then files. */
function SharedMedia({ msgs, onOpen }) {
  const all = msgs.slice().reverse().flatMap((m) => m.attachments || [])
  const media = all.filter(isMedia)
  const other = all.filter((a) => !isMedia(a))
  return (
    <div className="chat-shared">
      {media.length ? (
        <div className="chat-shared-grid">{media.map((a, i) => <SharedThumb key={a.id} a={a} onOpen={() => onOpen(media, i)} />)}</div>
      ) : <p className="muted">No photos or videos yet.</p>}
      {other.length > 0 && <div className="chat-shared-files">{other.map((a) => <Attachment key={a.id} a={a} />)}</div>}
    </div>
  )
}
function SharedThumb({ a, onOpen }) {
  const [url] = useMediaSrc(a)
  return (
    <button type="button" className="chat-shared-tile" onClick={onOpen} title={a.name}>
      {url && (isVideo(a) ? <video src={`${url}#t=0.1`} muted playsInline preload="metadata" /> : <img src={url} alt="" loading="lazy" />)}
      {isVideo(a) && <span className="chat-sheet-play">▶</span>}
    </button>
  )
}
/* A voice message's sound, as a file in memory with its real type: pCloud sends .m4a as
   octet-stream, which an iPhone refuses to play (Alex, 8 Oct: the voice message did nothing).
   Voice messages are small, so the whole file comes through the pcloud function at once. */
function useAudioSrc(a) {
  const [src, setSrc] = useState(() => urlCache.get(a.id)?.url || '')
  const [tries, setTries] = useState(0)
  useEffect(() => {
    if (src) return undefined
    let on = true
    const get = a.fileid ? pcloudBlob(a.fileid, a.scope) : fileUrl(a).then((u) => (u ? fetch(u).then((r) => r.blob()) : null))
    get.then((b) => {
      if (!on) return
      if (!b) throw new Error('no file')
      const u = URL.createObjectURL(new Blob([b], { type: a.type || 'audio/mp4' }))
      urlCache.set(a.id, { url: u, until: Date.now() + 12 * 3600 * 1000 })
      setSrc(u)
    }).catch(() => { if (on && tries < 6) setTimeout(() => on && setTries((t) => t + 1), 2000 * (tries + 1)) })
    return () => { on = false }
  }, [a.id, tries, src])
  return src
}
/* A voice message: a round play button, a bar that fills, the time. */
function AudioNote({ a }) {
  const url = useAudioSrc(a)
  const ref = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [d, setD] = useState(a.dur || 0)
  const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`
  const seek = (e) => {
    const el = ref.current
    if (!el || !d) return
    const r = e.currentTarget.getBoundingClientRect()
    el.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * d
  }
  return (
    <span className="chat-voice">
      <button type="button" className={`chat-voice-play${url ? '' : ' wait'}`} onClick={() => { const el = ref.current; if (el) (el.paused ? el.play().catch(() => {}) : el.pause()) }} aria-label={playing ? 'Pause' : 'Play'} title={url ? undefined : 'Loading…'}>{playing ? '❚❚' : '▶'}</button>
      <button type="button" className="chat-voice-bar" onClick={seek} aria-label="Seek"><span style={{ width: `${d ? Math.min(100, (t / d) * 100) : 0}%` }} /></button>
      <span className="chat-voice-time">{fmt(playing || t ? t : d)}</span>
      {url && <audio ref={ref} src={url} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setT(0) }} onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onLoadedMetadata={(e) => { if (Number.isFinite(e.currentTarget.duration)) setD(e.currentTarget.duration) }} />}
    </span>
  )
}

function Attachment({ a }) {
  if (isAudio(a)) return <AudioNote a={a} />
  return <FileRow a={a} />
}
function FileRow({ a }) {
  const [url, failed, retry] = useAttachmentUrl(a)
  const wait = (ratio) => (failed
    ? <button type="button" className="chat-att-img chat-att-wait chat-att-retry" style={ratio} onClick={retry}>Tap to load</button>
    : <span className="chat-att-img chat-att-wait" style={ratio}>…</span>)
  if (isImage(a)) {
    const ratio = a.w && a.h ? { aspectRatio: `${a.w} / ${a.h}` } : undefined
    if (!url) return wait(ratio)
    return (
      <a className="chat-att" href={url} target="_blank" rel="noreferrer" title={a.name}>
        <img className="chat-att-img" src={url} alt={a.name} style={ratio} loading="lazy" />
      </a>
    )
  }
  // a video plays in the bubble, as in WhatsApp
  if (isVideo(a)) {
    const ratio = a.w && a.h ? { aspectRatio: `${a.w} / ${a.h}` } : undefined
    // #t=0.1 makes an iPhone draw the first frame instead of an empty box
    return url
      ? <video className="chat-att-img chat-att-video" src={`${url}#t=0.1`} controls playsInline preload="metadata" style={ratio} title={a.name} />
      : wait(ratio)
  }
  return (
    <a className="chat-file" href={url || undefined} target="_blank" rel="noreferrer">
      <span className="file-ico">{fileIcon(a.name, a.type)}</span>
      <span className="chat-file-main"><strong>{a.name}</strong><small>{fmtBytes(a.bytes || 0)}</small></span>
    </a>
  )
}
