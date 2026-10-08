import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Confirm, Field, Input, Modal, useIsMobile, useToast } from '../components/ui.jsx'
import { canAccessProject, canSendNotices, today as todayISO, uid, useCurrentUser, useStore, whenMs } from '../lib/store.jsx'
import { addDays, fmtDate } from '../lib/dates.js'
import { SendNoticeModal, SentNotices, sendAutoNotice } from '../components/Notices.jsx'
import { deleteFile, fileIcon, fileUrl, fmtBytes, uploadFile } from '../lib/files.js'
import { compress } from '../lib/photos.js'
import { canCompressVideo, compressVideo, isVideoFile, mediaSize, prepareVideo, releaseVideo } from '../lib/videoCompress.js'
import { pcloudBlob, pcloudOn } from '../lib/pcloud.js'
import { remote, supabase } from '../lib/supabase.js'
import { chimeFor, loadChatPrefs, loadMuted, toggleMuted } from '../lib/chatPrefs.js'
import ChatSettings from '../components/ChatSettings.jsx'
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
const TgIcon = {
  back: () => <svg {...svgProps}><path d="M15 5l-7 7 7 7" /></svg>,
  clip: () => <svg {...svgProps}><path d="M21 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.9-8.9a3.7 3.7 0 0 1 5.2 5.2l-8.9 8.9a1.8 1.8 0 0 1-2.6-2.6l8.2-8.2" /></svg>,
  project: () => <svg {...svgProps}><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 10h18M8 5V3M16 5V3" /></svg>,
  person: () => <svg {...svgProps}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>,
  reply: () => <svg {...svgProps}><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>,
  edit: () => <svg {...svgProps}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
  trash: () => <svg {...svgProps}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>,
  folder: () => <svg {...svgProps}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>,
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
  bell: () => <svg {...svgProps}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>,
  media: () => <svg {...svgProps}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  close: () => <svg {...svgProps}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  people: () => <svg {...svgProps}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.1.8 3.5 2.8 3.5 5.7" /></svg>,
}

function RoomAvatar({ room, size = 42 }) {
  const style = { width: size, height: size, ...(room.color ? { '--rc': room.color } : {}) }
  return (
    <span className={`chat-ravatar ${room.kind}`} style={style}>
      {room.photo ? <img src={room.photo} alt="" /> : room.initials || '?'}
    </span>
  )
}

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
    return () => { root.classList.remove('chat-window'); document.title = title }
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
  const { state } = useStore()
  const user = useCurrentUser()
  const mobile = useIsMobile()
  const nav = useNavigate()
  const base = useChatBase()
  const active = roomParam || (mobile ? '' : C.TEAM)
  const room = active ? C.roomOf(state, user, active) : null
  useEffect(() => { if (roomParam && !room) nav(base, { replace: true }) }, [roomParam, !!room])
  return (
    <div className={`chat-page chat2 ${active ? 'has-room' : ''}${windowed ? ' windowed' : ''}`}>
      {(!mobile || !active) && <RoomList activeId={active} windowed={windowed} />}
      {(!mobile || active) && (room ? <ChatRoom key={room.id} room={room} onBack={mobile ? () => nav(base) : undefined} /> : <div className="chat-box chat-none muted">Pick a conversation</div>)}
    </div>
  )
}

/* ---------- the list ---------- */
function RoomList({ activeId, windowed }) {
  const { state } = useStore()
  const user = useCurrentUser()
  const nav = useNavigate()
  const base = useChatBase()
  const mobile = useIsMobile()
  const isAdmin = user?.role === 'admin'
  const [tab, setTab] = useState('chats') // the window's foot: chats | settings
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
  const [folders, setFolders] = useState(false)
  const [notice, setNotice] = useState(false)
  const [sent, setSent] = useState(false)
  useEffect(() => {
    const h = () => setReadMap(C.loadRead())
    window.addEventListener('tml-chat-read', h)
    return () => window.removeEventListener('tml-chat-read', h)
  }, [])
  useEffect(() => { try { localStorage.setItem('tml_chat_folder', folderId) } catch {} }, [folderId])

  const rooms = useMemo(() => C.roomsFor(state, user), [state.users, state.projects, state.chats, user])
  const unread = useMemo(() => C.unreadByRoom(state, user, readMap, rooms), [state.chat, rooms, readMap, user])
  const allFolders = C.foldersFor(user)
  const folder = allFolders.find((f) => f.id === folderId) || allFolders[0]
  const shown = useMemo(() => {
    const inFolder = C.roomsInFolder(folder, rooms)
    const needle = q.trim().toLowerCase()
    return C.sortRooms(needle ? inFolder.filter((r) => r.name.toLowerCase().includes(needle)) : inFolder, state.chat)
  }, [folder, rooms, q, state.chat])
  const folderUnread = (f) => C.totalUnread(Object.fromEntries(C.roomsInFolder(f, rooms).map((r) => [r.id, unread[r.id] || 0])))
  const legacy = state.chatRooms === false

  return (
    <aside className="chat-list">
      <div className="chat-list-head">
        <h1>Chat</h1>
        {!mobile && <button type="button" className="icon-btn chat-head-ico chat-folders-btn" onClick={() => setFolders(true)} title="Your folders" aria-label="Your folders">{TgIcon.folder()}</button>}
        {!mobile && <button type="button" className="icon-btn chat-head-ico chat-new" onClick={() => setDirect(true)} title="New message" aria-label="New message">{TgIcon.edit()}</button>}
        {isAdmin && <button type="button" className="icon-btn chat-head-ico chat-group-new" onClick={() => setGroup('new')} title="New group" aria-label="New group">{TgIcon.people()}</button>}
        {!mobile && !windowed && <button type="button" className="icon-btn chat-head-ico chat-popout" onClick={popOut} title="Open the chat in its own window" aria-label="Open the chat in its own window">{TgIcon.popout()}</button>}
      </div>
      {tab === 'settings' ? (
        <div className="chat-win-settings">
          <h2>Chat settings</h2>
          <ChatSettings toast={toast} />
        </div>
      ) : (<>
      {legacy && <p className="chat-legacy">Rooms are not switched on yet: run supabase/chat_rooms.sql in the SQL editor. Until then only the team room works.</p>}
      <div className="chat-folders" role="tablist">
        {allFolders.map((f) => {
          const n = folderUnread(f)
          return (
            <button key={f.id} type="button" role="tab" aria-selected={f.id === folder.id} className={f.id === folder.id ? 'on' : ''} onClick={() => setFolderId(f.id)}>
              {f.name}{n > 0 && <span className="chat-fbadge">{n}</span>}
            </button>
          )
        })}
        <button type="button" className="chat-folders-edit" onClick={() => setFolders(true)} title="Your folders">Folders…</button>
      </div>
      <div className="chat-search"><input ref={searchRef} className="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); e.currentTarget.blur() } }} placeholder={mobile ? 'Search' : 'Search (⌘K)'} name="chat-search" autoComplete="off" /></div>
      <div className="chat-rooms">
        {!shown.length && <p className="muted small chat-rooms-empty">{folder.custom ? 'This folder is empty. Add conversations to it under Folders.' : 'Nothing here yet.'}</p>}
        {shown.map((r) => {
          const last = C.lastMessage(state.chat, r.id)
          // never the last message (Alex): the company room shows its name alone, a project room its
          // category, a group its member count, a person their position
          const preview = r.kind === 'team' ? '' : r.sub
          const n = unread[r.id] || 0
          return (
            <button key={r.id} type="button" className={`chat-room-item ${r.id === activeId ? 'active' : ''}`} onClick={() => nav(roomPath(base, r.id))} disabled={legacy && r.kind !== 'team'}>
              <RoomAvatar room={r} size={mobile ? 54 : 48} />
              <span className="chat-rmain">
                <span className="chat-rtop"><strong>{r.name}</strong><small>{listTime(last?.createdAt)}</small></span>
                {(preview || n > 0) && <span className="chat-rbottom"><span className="chat-rprev">{preview}</span>{n > 0 && <span className="chat-rbadge">{n}</span>}</span>}
              </span>
            </button>
          )
        })}
      </div>
      </>)}
      {/* Telegram's round pencil (phone only): a new message to one person */}
      {mobile && (
        <button type="button" className="chat-fab" onClick={() => setDirect(true)} aria-label="New message" title="New message">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
        </button>
      )}
      {windowed && !mobile && (
        // the window's foot, Telegram's: people (a new message), chats, settings
        <nav className="chat-win-tabs">
          <button type="button" onClick={() => setDirect(true)} title="Write to someone">{TgIcon.person()}<span>People</span></button>
          <button type="button" className={tab === 'chats' ? 'on' : ''} onClick={() => setTab('chats')}>{TgIcon.chats()}<span>Chats</span></button>
          <button type="button" className={tab === 'settings' ? 'on' : ''} onClick={() => setTab('settings')}>{TgIcon.gear()}<span>Settings</span></button>
        </nav>
      )}
      {canNotice && !windowed && (
        <div className="chat-list-foot">
          <Button size="sm" variant="ghost" onClick={() => setSent(true)}>Sent notices</Button>
          <Button size="sm" variant="ghost" onClick={() => setNotice(true)}>Send notice</Button>
        </div>
      )}
      <GroupModal open={!!group} group={group === 'new' ? null : group} onClose={() => setGroup(null)} onSaved={(id) => { setGroup(null); nav(roomPath(base, id)) }} />
      <DirectModal open={direct} onClose={() => setDirect(false)} onPick={(id) => { setDirect(false); nav(roomPath(base, id)) }} />
      <FoldersModal open={folders} onClose={() => setFolders(false)} rooms={rooms} />
      <SendNoticeModal open={notice} onClose={() => setNotice(false)} />
      <Modal open={sent} title="Sent notices" onClose={() => setSent(false)} wide>{sent && <SentNotices />}</Modal>
    </aside>
  )
}

/* Administrators make a group: a name and the people in it. The maker is always a member. */
function GroupModal({ open, group, onClose, onSaved }) {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const [name, setName] = useState('')
  const [members, setMembers] = useState([])
  useEffect(() => { if (open) { setName(group?.name || ''); setMembers(group?.members || [user?.id].filter(Boolean)) } }, [open, group?.id])
  const people = state.users.filter((u) => u.active !== false)
  const toggle = (id) => setMembers((m) => (id === user?.id ? m : m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))
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
    <Modal open={open} title={group ? 'Edit group' : 'New group'} onClose={onClose} footer={<>{group && <Confirm onConfirm={remove} label="Delete group">Delete group</Confirm>}<span className="grow" /><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{group ? 'Save' : 'Create'}</Button></>}>
      <div className="stack">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Camera crew" autoFocus /></Field>
        <div className="field">
          <span className="field-label">Members</span>
          <div className="chips-static">
            {people.map((p) => <button key={p.id} type="button" className={`chip ${members.includes(p.id) ? 'on' : ''}`} onClick={() => toggle(p.id)} disabled={p.id === user?.id}>{p.name}{p.id === user?.id ? <small>you</small> : null}</button>)}
          </div>
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
function FoldersModal({ open, onClose, rooms }) {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const [list, setList] = useState([])
  useEffect(() => { if (open) setList((Array.isArray(user?.profile?.chatFolders) ? user.profile.chatFolders : []).map((f) => ({ ...f, rooms: [...(f.rooms || [])] }))) }, [open])
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
    const fit = () => {
      if (!vv) return
      root.style.setProperty('--chat-vh', `${vv.height}px`)
      root.style.setProperty('--chat-vt', `${vv.offsetTop}px`)
      // keyboard up: the strip kept for the iPhone's home bar is not needed under the box (Alex)
      root.classList.toggle('kb-open', window.innerHeight - vv.height > 120)
    }
    fit()
    vv?.addEventListener('resize', fit)
    vv?.addEventListener('scroll', fit)
    return () => {
      root.classList.remove('chat-open', 'kb-open')
      root.style.removeProperty('--chat-vh')
      root.style.removeProperty('--chat-vt')
      vv?.removeEventListener('resize', fit)
      vv?.removeEventListener('scroll', fit)
    }
  }, [mobile])
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const isAdmin = user?.role === 'admin'
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
    if (files.length) {
      setBusy('Uploading…')
      try {
        await saveDirectRoom(state, room, user?.id)
        for (let i = 0; i < files.length; i++) {
          let f = files[i]
          const of = files.length > 1 ? ` ${i + 1}/${files.length}` : ''
          setBusy(`Uploading${of}…`)
          let w, h, dur
          if (voice) dur = voice.dur
          if (!compressMedia && /^(image|video)\//.test(f.type)) {
            // original quality: sent as it is, only its size is read for the bubble's shape
            const d = await mediaSize(f)
            if (d) { w = d.w; h = d.h; if (d.duration) dur = Math.round(d.duration) }
          } else if (f.type.startsWith('image/') && !/gif$/i.test(f.type)) {
            const c = await compress(f, { max: 1600, quality: 0.82 })
            w = c.w; h = c.h
            f = new File([c.blob], f.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
          } else if (prepared[i]) {
            setBusy(`Compressing video${of}… keep this page open`)
            const c = await compressVideo(prepared[i], (p) => setBusy(`Compressing video${of}… ${Math.round(p * 100)}%, keep this page open`))
            if (c) { f = c.file; w = c.w; h = c.h; dur = Math.round(c.duration) }
            setBusy(`Uploading${of}…`)
          }
          if (f.size > MAX_BYTES) throw new Error(`${f.name} is over 50 MB${isVideoFile(f) ? (compressMedia ? ' even after compressing. Send a shorter clip.' : '. Switch Compress back on, or send a shorter clip.') : '.'}`)
          const attId = uid()
          const pcloud = pcloudOn(state.settings) ? { folder: chatFolder(state, room), scope: { kind: 'chat', id: roomId } } : null
          const { path, fileid, scope } = await uploadFile({ projectId: C.roomFolder(roomId), id: attId, file: f, pcloud })
          // the sender sees their own photo or video at once, from the phone, not after a round trip
          if (/^(image|video|audio)\//.test(f.type)) urlCache.set(attId, { url: URL.createObjectURL(f), until: Date.now() + 12 * 3600 * 1000 })
          attachments.push({ id: attId, name: f.name, type: f.type, bytes: f.size, path, ...(fileid ? { fileid, scope } : {}), ...(w ? { w, h } : {}), ...(dur ? { dur } : {}) })
        }
      } catch (e) {
        prepared.forEach(releaseVideo)
        setBusy('')
        return toast(e.message, 'error')
      }
      setBusy('')
    }
    const mentions = C.parseMentions(t, state.users).filter((x) => x !== user?.id)
    const m = { id, chatId: roomId, userId: user?.id || '', userName: user?.name || 'Someone', text: t, source: 'app', createdAt: new Date().toISOString(), replyTo: replyTo?.id || '', editedAt: '', attachments, mentions }
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
    if (!voice) { setText(''); setPending([]) }
    setReplyTo(null); setCaret(0)
  }

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
    if (current !== emoji && emoji === '🎥') { setBurst(m.id); setTimeout(() => setBurst((b) => (b === m.id ? '' : b)), 800) }
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
      react(m, '🎥')
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
    <div className="chat-box" data-wall={prefs.wallpaper === 'none' ? 'soft' : prefs.wallpaper} data-bubbles="telegram" data-size={prefs.size} data-density={prefs.density}>
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
        {room.kind === 'direct' && room.otherId && <Link className="icon-btn chat-head-ico" to={`/u/${room.otherId}`} aria-label="Profile" title="Profile">{TgIcon.person()}</Link>}
        {room.kind === 'group' && isAdmin && groupRow && <button type="button" className="icon-btn chat-head-ico" onClick={() => setEditGroup(true)} aria-label="Edit group" title="Edit group">{TgIcon.people()}</button>}
        {!mobile && <button type="button" className="icon-btn chat-head-ico" onClick={() => { setFind(''); setFindAt(0) }} aria-label="Search in this conversation" title="Search in this conversation">{TgIcon.search()}</button>}
        <span className="chat-more-wrap">
          <button type="button" className="icon-btn chat-head-ico" onClick={() => setRoomMenu((v) => !v)} aria-label="More" title="More">{TgIcon.more()}</button>
          {roomMenu && (
            <>
              <span className="chat-room-menu-scrim" onClick={() => setRoomMenu(false)} />
              <span className="chat-menu chat-room-menu" role="menu">
                <button type="button" onClick={() => { setRoomMenu(false); setFind(''); setFindAt(0) }}>{TgIcon.search()}<span>Search</span></button>
                <button type="button" onClick={() => { setRoomMenu(false); setShared(true) }}>{TgIcon.media()}<span>Photos, videos &amp; files</span></button>
                {pinnedMsg && <button type="button" onClick={() => { setRoomMenu(false); jumpTo(pinnedMsg.id) }}>{TgIcon.pin()}<span>Pinned message</span></button>}
                <button type="button" onClick={() => { setMuted(toggleMuted(room.id).includes(room.id)); setRoomMenu(false) }}>{TgIcon.bell()}<span>{muted ? 'Unmute sounds' : 'Mute sounds'}</span></button>
              </span>
            </>
          )}
        </span>
      </div>
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
      {/* behind the open menu: the rest of the room blurred, a tap closes it */}
      {picked && <div className="chat-menu-scrim" onClick={() => setPicked('')} />}
      <div className={`chat-scroll${sel ? ' selecting' : ''}`} ref={scrollRef}>
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
                    <div className={`chat-bubble${media.length ? ' has-media' : ''}${mediaOnly ? ' media-only' : ''}`} onClick={sel ? undefined : (e) => onBubbleTap(e, m, media)} onMouseDown={mobile ? undefined : (e) => { if (e.detail > 1) e.preventDefault() }}
                      onTouchStart={() => pressStart(m)} onTouchMove={pressCancel} onTouchEnd={pressCancel} onContextMenu={(e) => { if (sel) return; e.preventDefault(); setPicked(m.id) }}>
                      {burst === m.id && <span className="chat-heart-burst" aria-hidden="true">🎥</span>}
                      {showWho && <div className="chat-who" style={{ '--who': `hsl(${senderHue(m.userId)} 55% 42%)` }}>{m.userId ? <Link to={`/u/${m.userId}`}>{m.userName}</Link> : m.userName}</div>}
                      {m.replyTo && (
                        <div className="chat-quote" onClick={() => quoted && jumpTo(quoted.id)} role={quoted ? 'button' : undefined}>
                          {quoted ? <><b>{quoted.userId === user?.id ? 'You' : quoted.userName}</b><span>{quoted.text || (quoted.attachments?.length ? attLabel(quoted.attachments[0]) : '')}</span></> : <span>Message deleted</span>}
                        </div>
                      )}
                      {media.length > 0 && <MediaAlbum items={media} meta={mediaOnly ? <>{likesBtn}<span className="chat-time">{timeOf(m.createdAt)}</span></> : null} />}
                      {files.map((a) => <Attachment key={a.id} a={a} />)}
                      {m.text && <span className="chat-text">{renderText(m.text)}</span>}
                      {m.editedAt && <span className="chat-edited">edited</span>}
                      {/* hearts on a line of their own, the time beside them, as Telegram does */}
                      {!mediaOnly && likesBtn && (
                        <>
                          {(m.text || m.editedAt) && <br />}
                          {likesBtn}
                        </>
                      )}
                      {!mediaOnly && <span className="chat-time">{timeOf(m.createdAt)}</span>}
                    </div>
                    {picked === m.id && (
                      // the message's menu, Telegram's: a column of actions under the message
                      <div className="chat-menu" role="menu">
                        <button type="button" onClick={() => startReply(m)}>{TgIcon.reply()}<span>Reply</span></button>
                        {m.text && <button type="button" onClick={() => copyText(m)}>{TgIcon.copy()}<span>Copy</span></button>}
                        {media.length > 0 && <button type="button" onClick={() => { setPicked(''); setViewer({ items: media, i: 0 }) }}>{TgIcon.download()}<span>{media.length > 1 ? 'Save' : isVideo(media[0]) ? 'Save Video' : 'Save Image'}</span></button>}
                        <button type="button" onClick={() => togglePin(m)}>{TgIcon.pin()}<span>{m.pinnedAt ? 'Unpin' : 'Pin'}</span></button>
                        <button type="button" onClick={() => { setPicked(''); setFwd([m]) }}>{TgIcon.forward()}<span>Forward</span></button>
                        {mine && m.text && <button type="button" onClick={() => startEdit(m)}>{TgIcon.edit()}<span>Edit</span></button>}
                        {(mine || isAdmin) && <Confirm className="chat-menu-del" onConfirm={() => { setPicked(''); remove(m) }} label="Delete">{TgIcon.trash()}<span>Delete</span></Confirm>}
                        <span className="chat-menu-sep" />
                        <button type="button" onClick={() => { setPicked(''); setSel([m.id]) }}>{TgIcon.select()}<span>Select</span></button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
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
              <textarea ref={inputRef} className="input" rows={1} name="chat-message" autoComplete="off" autoCorrect="on" value={text} onChange={(e) => { setText(e.target.value); setCaret(e.target.selectionStart) }} onKeyUp={(e) => setCaret(e.target.selectionStart)} onClick={(e) => setCaret(e.target.selectionStart)} onKeyDown={onKey} placeholder="Write a message…" title={prefs.enterSends ? 'Enter sends, Shift+Enter for a new line. @name mentions someone' : 'Enter for a new line, Cmd/Ctrl+Enter sends. @name mentions someone'} disabled={!!busy} />
              {!mobile && (
                <span className="chat-emoji-wrap">
                  <button type="button" className="icon-btn chat-emoji-btn" onClick={() => setEmoji((v) => !v)} aria-label="Emoji" title="Emoji">{TgIcon.smile()}</button>
                  {emoji && (
                    <>
                      <span className="chat-room-menu-scrim" onClick={() => setEmoji(false)} />
                      <span className="chat-emoji-pick">{EMOJIS.map((e) => <button key={e} type="button" onClick={() => addEmoji(e)}>{e}</button>)}</span>
                    </>
                  )}
                </span>
              )}
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
      const u = URL.createObjectURL(b)
      urlCache.set(a.id, { url: u, until: Date.now() + 12 * 3600 * 1000 })
      setLocal(u)
    }).catch(() => {})
  }
  return [local || link, failed, retry, viaFunction]
}
/* One picture or video in a message. A tap opens the message's menu (Reply, Open, Edit, Delete),
   like any message; a video plays from its own round play button. */
function MediaTile({ a, i, shaped }) {
  const [url, failed, retry, viaFunction] = useMediaSrc(a)
  const [playing, setPlaying] = useState(false)
  const vref = useRef(null)
  const style = shaped && a.w && a.h ? { aspectRatio: `${a.w} / ${a.h}` } : undefined
  if (!url) {
    return failed
      ? <button type="button" className="chat-media-tile chat-media-wait chat-att-retry" style={style} onClick={retry}>Tap to load</button>
      : <span className="chat-media-tile chat-media-wait" style={style}>…</span>
  }
  if (isVideo(a)) {
    return (
      <span className="chat-media-tile chat-media-vid" style={style} data-tile={i}>
        <video ref={vref} src={`${url}#t=0.1`} controls={playing} playsInline preload="metadata" title={a.name} onError={viaFunction} onEnded={() => setPlaying(false)} />
        {!playing && <button type="button" className="chat-media-play" aria-label="Play" onClick={() => { setPlaying(true); requestAnimationFrame(() => vref.current?.play().catch(() => {})) }}>▶</button>}
        {!playing && a.dur > 0 && <span className="chat-media-dur">{Math.floor(a.dur / 60)}:{String(a.dur % 60).padStart(2, '0')}</span>}
      </span>
    )
  }
  return <span className="chat-media-tile" style={style} title={a.name} data-tile={i}><img src={url} alt={a.name} loading="lazy" draggable={false} onError={viaFunction} /></span>
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
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])
  return createPortal(
    <div className="chat-viewer" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
      onTouchEnd={(e) => {
        const p = touch.current
        if (!p) return
        const dx = e.changedTouches[0].clientX - p.x
        const dy = e.changedTouches[0].clientY - p.y
        // a swipe down closes it (as in Telegram), sideways goes through the album
        if (dy > 90 && Math.abs(dx) < 70) onClose()
        else if (Math.abs(dx) > 50 && Math.abs(dy) < 80) go(dx < 0 ? 1 : -1)
      }}>
      <button type="button" className="chat-viewer-x" onClick={onClose} aria-label="Close">{TgIcon.close()}<span>Close</span></button>
      {items.length > 1 && <span className="chat-viewer-n">{i + 1} / {items.length}</span>}
      {!url ? <span className="chat-viewer-wait">…</span>
        : isVideo(a) ? <video key={a.id} src={url} controls autoPlay playsInline />
        : <img key={a.id} src={url} alt={a.name} />}
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
/* A voice message: a round play button, a bar that fills, the time. */
function AudioNote({ a }) {
  const [url] = useMediaSrc(a)
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
