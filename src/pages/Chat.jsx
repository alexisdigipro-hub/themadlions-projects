import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Confirm, Field, Input, Modal, useIsMobile, useToast } from '../components/ui.jsx'
import { canAccessProject, canSendNotices, today as todayISO, uid, useCurrentUser, useStore } from '../lib/store.jsx'
import { addDays, fmtDate } from '../lib/dates.js'
import { SendNoticeModal, SentNotices, sendAutoNotice } from '../components/Notices.jsx'
import { deleteFile, fileIcon, fileUrl, fmtBytes, uploadFile } from '../lib/files.js'
import { compress } from '../lib/photos.js'
import { pcloudOn } from '../lib/pcloud.js'
import { loadChatPrefs } from '../lib/chatPrefs.js'
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
/* A colour per sender for their name inside group bubbles, stable for the same person. */
const SENDER_HUES = [14, 36, 95, 160, 200, 230, 275, 320]
const senderHue = (id) => { let h = 0; for (const c of String(id || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return SENDER_HUES[h % SENDER_HUES.length] }
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

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
  useEffect(() => {
    if (!a) return
    const hit = urlCache.get(a.id)
    if (hit && hit.until > Date.now()) { setUrl(hit.url); return }
    let on = true
    // a pCloud link is refused until the message row that names the file is written, which can
    // be a moment after the bubble appears, so ask again a few times before giving up
    const ask = (left) => fileUrl(a).then((u) => {
      if (!on) return
      if (u) { urlCache.set(a.id, { url: u, until: Date.now() + 50 * 60 * 1000 }); setUrl(u) }
      else if (a.fileid && left > 0) setTimeout(() => ask(left - 1), 1500)
      else setUrl('')
    })
    ask(4)
    return () => { on = false }
  }, [a?.id])
  return url
}

/* Line icons for the phone's chat, Telegram-like. */
const svgProps = { viewBox: '0 0 24 24', width: 24, height: 24, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
const TgIcon = {
  back: () => <svg {...svgProps}><path d="M15 5l-7 7 7 7" /></svg>,
  clip: () => <svg {...svgProps}><path d="M21 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.9-8.9a3.7 3.7 0 0 1 5.2 5.2l-8.9 8.9a1.8 1.8 0 0 1-2.6-2.6l8.2-8.2" /></svg>,
  project: () => <svg {...svgProps}><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 10h18M8 5V3M16 5V3" /></svg>,
  person: () => <svg {...svgProps}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>,
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

/* ---------- the page ---------- */
export default function Chat() {
  const { room: roomParam } = useParams()
  const { state } = useStore()
  const user = useCurrentUser()
  const mobile = useIsMobile()
  const nav = useNavigate()
  const active = roomParam || (mobile ? '' : C.TEAM)
  const room = active ? C.roomOf(state, user, active) : null
  useEffect(() => { if (roomParam && !room) nav('/chat', { replace: true }) }, [roomParam, !!room])
  return (
    <div className={`chat-page chat2 ${active ? 'has-room' : ''}`}>
      {(!mobile || !active) && <RoomList activeId={active} />}
      {(!mobile || active) && (room ? <ChatRoom key={room.id} room={room} onBack={mobile ? () => nav('/chat') : undefined} /> : <div className="chat-box chat-none muted">Pick a conversation</div>)}
    </div>
  )
}

/* ---------- the list ---------- */
function RoomList({ activeId }) {
  const { state } = useStore()
  const user = useCurrentUser()
  const nav = useNavigate()
  const mobile = useIsMobile()
  const isAdmin = user?.role === 'admin'
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
        {!mobile && <Button size="sm" variant="ghost" onClick={() => setDirect(true)} title="Write to one person">+ Message</Button>}
        {isAdmin && <Button size="sm" variant="primary" onClick={() => setGroup('new')} title="A group of chosen people">+ Group</Button>}
      </div>
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
      <div className="chat-search"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" /></div>
      <div className="chat-rooms">
        {!shown.length && <p className="muted small chat-rooms-empty">{folder.custom ? 'This folder is empty. Add conversations to it under Folders.' : 'Nothing here yet.'}</p>}
        {shown.map((r) => {
          const last = C.lastMessage(state.chat, r.id)
          // never the last message (Alex): the company room shows its name alone, a project room its
          // category, a group its member count, a person their position
          const preview = r.kind === 'team' ? '' : r.sub
          const n = unread[r.id] || 0
          return (
            <button key={r.id} type="button" className={`chat-room-item ${r.id === activeId ? 'active' : ''}`} onClick={() => nav(`/chat/${encodeURIComponent(r.id)}`)} disabled={legacy && r.kind !== 'team'}>
              <RoomAvatar room={r} size={mobile ? 54 : 42} />
              <span className="chat-rmain">
                <span className="chat-rtop"><strong>{r.name}</strong><small>{listTime(last?.createdAt)}</small></span>
                {(preview || n > 0) && <span className="chat-rbottom"><span className="chat-rprev">{preview}</span>{n > 0 && <span className="chat-rbadge">{n}</span>}</span>}
              </span>
            </button>
          )
        })}
      </div>
      {/* Telegram's round pencil (phone only): a new message to one person */}
      {mobile && (
        <button type="button" className="chat-fab" onClick={() => setDirect(true)} aria-label="New message" title="New message">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
        </button>
      )}
      {canNotice && (
        <div className="chat-list-foot">
          <Button size="sm" variant="ghost" onClick={() => setSent(true)}>Sent notices</Button>
          <Button size="sm" variant="ghost" onClick={() => setNotice(true)}>Send notice</Button>
        </div>
      )}
      <GroupModal open={!!group} group={group === 'new' ? null : group} onClose={() => setGroup(null)} onSaved={(id) => { setGroup(null); nav(`/chat/${encodeURIComponent(id)}`) }} />
      <DirectModal open={direct} onClose={() => setDirect(false)} onPick={(id) => { setDirect(false); nav(`/chat/${encodeURIComponent(id)}`) }} />
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
  const [burst, setBurst] = useState('') // the message a double tap just hearted, for the big heart
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
    }
    fit()
    vv?.addEventListener('resize', fit)
    vv?.addEventListener('scroll', fit)
    return () => {
      root.classList.remove('chat-open')
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
  const [busy, setBusy] = useState('')
  const [caret, setCaret] = useState(0)
  const [editGroup, setEditGroup] = useState(false)
  const [editMembers, setEditMembers] = useState(false)
  const endRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const fileRef = useRef(null)
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
    const arr = Array.from(list || []).filter((f) => f.size <= 50 * 1024 * 1024)
    if (arr.length < (list?.length || 0)) toast('Files over 50 MB were left out.', 'error')
    setPending((p) => [...p, ...arr])
    if (fileRef.current) fileRef.current.value = ''
  }

  const send = async () => {
    const t = text.trim()
    if (editing) {
      if (!t) return
      update((s) => {
        const m = (s.chat || []).find((x) => x.id === editing.id)
        if (m && m.text !== t) { m.text = t; m.editedAt = new Date().toISOString(); m.mentions = C.parseMentions(t, s.users) }
        return s
      })
      setEditing(null); setText(''); return
    }
    if (!t && !pending.length) return
    const id = uid()
    const attachments = []
    if (pending.length) {
      setBusy('Uploading…')
      try {
        for (let i = 0; i < pending.length; i++) {
          let f = pending[i]
          setBusy(`Uploading ${i + 1}/${pending.length}…`)
          let w, h
          if (f.type.startsWith('image/') && !/gif$/i.test(f.type)) {
            const c = await compress(f, { max: 1600, quality: 0.82 })
            w = c.w; h = c.h
            f = new File([c.blob], f.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
          }
          const attId = uid()
          const pcloud = pcloudOn(state.settings) ? { folder: chatFolder(state, room), scope: { kind: 'chat', id: roomId } } : null
          const { path, fileid, scope } = await uploadFile({ projectId: C.roomFolder(roomId), id: attId, file: f, pcloud })
          attachments.push({ id: attId, name: f.name, type: f.type, bytes: f.size, path, ...(fileid ? { fileid, scope } : {}), ...(w ? { w, h } : {}) })
        }
      } catch (e) {
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
    const body = t || (attachments.length ? (isImage(attachments[0]) ? 'Sent a photo' : `Sent ${attachments[0].name}`) : '')
    // One pop-up per sender and room, counting up, so a busy shooting day does not become a wall of modals.
    sendAutoNotice(update, { kind: 'chatMessage', key: `chat:${roomId}:${user?.id || ''}`, count: true, fromId: user?.id, fromName: user?.name, to: recipients.filter((r) => !mentions.includes(r)), title: `Message from ${user?.name || 'the team'}${where}`, body: body.slice(0, 200) })
    // A mention always reaches the person named, even when they switched chat pop-ups off.
    if (mentions.length) sendAutoNotice(update, { kind: 'chatMention', key: `mention:${id}`, fromId: user?.id, fromName: user?.name, to: mentions.filter((x) => recipients.includes(x)), title: `${user?.name || 'Someone'} mentioned you${where}`, body: body.slice(0, 200) })
    setText(''); setPending([]); setReplyTo(null); setCaret(0)
  }

  const remove = (m) => {
    ;(m.attachments || []).forEach((a) => deleteFile(a).catch(() => {}))
    update((s) => { s.chat = (s.chat || []).filter((x) => x.id !== m.id); return s })
  }
  const toggleLike = (m) => {
    const me = user?.id
    if (!me) return
    update((s) => {
      const x = (s.chat || []).find((y) => y.id === m.id)
      if (x) { const l = x.likes || []; x.likes = l.includes(me) ? l.filter((i) => i !== me) : [...l, me] }
      return s
    })
  }
  // One tap shows Reply / Edit / Delete, two quick taps put a heart on it (or take yours off).
  // The single tap waits a moment so a double tap does not flash the actions first.
  const onBubbleTap = (e, m) => {
    if (e.target.closest('a, button')) return
    const t = tapRef.current
    const now = Date.now()
    if (t.id === m.id && now - t.at < 300) {
      clearTimeout(t.timer)
      tapRef.current = { id: '', at: 0, timer: null }
      if (!(m.likes || []).includes(user?.id)) { setBurst(m.id); setTimeout(() => setBurst((b) => (b === m.id ? '' : b)), 800) }
      setPicked('')
      toggleLike(m)
      return
    }
    clearTimeout(t.timer)
    tapRef.current = { id: m.id, at: now, timer: setTimeout(() => setPicked((p) => (p === m.id ? '' : m.id)), 260) }
  }
  const startEdit = (m) => { setPicked(''); setEditing(m); setReplyTo(null); setText(m.text); requestAnimationFrame(() => inputRef.current?.focus()) }
  const startReply = (m) => { setPicked(''); setReplyTo(m); setEditing(null); requestAnimationFrame(() => inputRef.current?.focus()) }
  const cancelBar = () => { setEditing(null); setReplyTo(null); if (editing) setText('') }
  const jumpTo = (id) => {
    const el = scrollRef.current?.querySelector(`[data-msg="${id}"]`)
    if (!el) return
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200)
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
    <div className="chat-box" data-wall={mobile && prefs.wallpaper === 'none' ? 'soft' : prefs.wallpaper} data-bubbles={mobile ? 'telegram' : prefs.bubbles} data-size={prefs.size} data-density={prefs.density}>
      <div className="chat-head">
        {onBack && <button type="button" className="icon-btn chat-back" onClick={onBack} aria-label="Back">{mobile ? TgIcon.back() : '‹'}</button>}
        <RoomAvatar room={room} size={mobile ? 40 : 36} />
        <div className="chat-head-main">
          <strong>{room.name}</strong>
          <span className="small muted" title={membersOf.map((u) => u.name).join(', ')}>
            {room.kind === 'direct' ? room.sub || 'Direct message' : `${membersOf.length} ${membersOf.length === 1 ? 'person' : 'people'}`}
          </span>
        </div>
        {mobile ? (
          <>
            {room.kind === 'project' && isAdmin && <button type="button" className="icon-btn chat-head-ico" onClick={() => setEditMembers(true)} aria-label="Members" title="Members">{TgIcon.people()}</button>}
            {room.kind === 'project' && <Link className="icon-btn chat-head-ico" to={`/p/${room.projectId}`} aria-label="Open project" title="Open project">{TgIcon.project()}</Link>}
            {room.kind === 'direct' && room.otherId && <Link className="icon-btn chat-head-ico" to={`/u/${room.otherId}`} aria-label="Profile" title="Profile">{TgIcon.person()}</Link>}
            {room.kind === 'group' && isAdmin && groupRow && <button type="button" className="icon-btn chat-head-ico" onClick={() => setEditGroup(true)} aria-label="Edit group" title="Edit group">{TgIcon.people()}</button>}
          </>
        ) : (
          <>
            {room.kind === 'project' && isAdmin && <Button size="sm" variant="ghost" onClick={() => setEditMembers(true)}>Members</Button>}
            {room.kind === 'project' && <Link className="btn btn-ghost btn-sm" to={`/p/${room.projectId}`}>Open project</Link>}
            {room.kind === 'direct' && room.otherId && <Link className="btn btn-ghost btn-sm" to={`/u/${room.otherId}`}>Profile</Link>}
            {room.kind === 'group' && isAdmin && groupRow && <Button size="sm" variant="ghost" onClick={() => setEditGroup(true)}>Edit group</Button>}
          </>
        )}
      </div>
      <div className="chat-scroll" ref={scrollRef}>
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
              return (
                <div key={m.id} data-msg={m.id} className={`chat-msg ${mine ? 'mine' : ''} ${cont ? 'cont' : ''} ${last ? 'last' : ''} ${picked === m.id ? 'picked' : ''}`}>
                  {!mine && room.kind !== 'direct' && prefs.avatars && (
                    <span className="chat-avatar">
                      {(mobile ? last : !cont) && (photoOf(m.userId) ? <img src={photoOf(m.userId)} alt="" /> : (m.userName || '').split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase())}
                    </span>
                  )}
                  <div className="chat-bubble-wrap">
                    <div className="chat-bubble" onClick={mobile ? (e) => onBubbleTap(e, m) : undefined}>
                      {burst === m.id && <span className="chat-heart-burst" aria-hidden="true">❤️</span>}
                      {!cont && !mine && room.kind !== 'direct' && <div className="chat-who" style={{ '--who': `hsl(${senderHue(m.userId)} 55% 42%)` }}>{m.userId ? <Link to={`/u/${m.userId}`}>{m.userName}</Link> : m.userName}</div>}
                      {m.replyTo && (
                        <div className="chat-quote" onClick={() => quoted && jumpTo(quoted.id)} role={quoted ? 'button' : undefined}>
                          {quoted ? <><b>{quoted.userId === user?.id ? 'You' : quoted.userName}</b><span>{quoted.text || (quoted.attachments?.length ? (isImage(quoted.attachments[0]) ? 'Photo' : quoted.attachments[0].name) : '')}</span></> : <span>Message deleted</span>}
                        </div>
                      )}
                      {(m.attachments || []).map((a) => <Attachment key={a.id} a={a} />)}
                      {m.text && <span className="chat-text">{renderText(m.text)}</span>}
                      {m.editedAt && <span className="chat-edited">edited</span>}
                      {/* hearts on a line of their own, the time beside them, as Telegram does */}
                      {mobile && (m.likes || []).length > 0 && (
                        <>
                          {(m.text || m.editedAt) && <br />}
                          <button type="button" className={`chat-likes ${(m.likes || []).includes(user?.id) ? 'mine' : ''}`} onClick={() => toggleLike(m)} title={(m.likes || []).map((id) => state.users.find((u) => u.id === id)?.name || 'Someone').join(', ')}>
                            ❤️{m.likes.length > 1 && <b>{m.likes.length}</b>}
                          </button>
                        </>
                      )}
                      <span className="chat-time">{timeOf(m.createdAt)}</span>
                    </div>
                  </div>
                  <span className="chat-msg-actions">
                    <button type="button" className="icon-btn" title="Reply" onClick={() => startReply(m)}>↩</button>
                    {mine && <button type="button" className="icon-btn" title="Edit" onClick={() => startEdit(m)}>✎</button>}
                    {(mine || isAdmin) && <Confirm onConfirm={() => remove(m)} label="Delete message">×</Confirm>}
                  </span>
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
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          {!editing && <button type="button" className="icon-btn chat-attach" title="Photo or file" onClick={() => fileRef.current?.click()} disabled={!!busy}>{mobile ? TgIcon.clip() : '📎'}</button>}
          <textarea ref={inputRef} className="input" rows={1} value={text} onChange={(e) => { setText(e.target.value); setCaret(e.target.selectionStart) }} onKeyUp={(e) => setCaret(e.target.selectionStart)} onClick={(e) => setCaret(e.target.selectionStart)} onKeyDown={onKey} placeholder="Message" title={prefs.enterSends ? 'Enter sends, Shift+Enter for a new line. @name mentions someone' : 'Enter for a new line, Cmd/Ctrl+Enter sends. @name mentions someone'} disabled={!!busy} />
          <button type="button" className={`chat-send${text.trim() || pending.length ? ' ready' : ''}`} onClick={send} disabled={!!busy || (!text.trim() && !pending.length)} title={editing ? 'Save (Enter)' : 'Send (Enter)'} aria-label={editing ? 'Save' : 'Send'}>
            {busy ? '…' : editing ? '✓' : <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M3.4 20.4l17.4-7.5c.8-.4.8-1.5 0-1.8L3.4 3.6c-.7-.3-1.4.3-1.3 1l1.2 5.7c.1.4.4.7.8.7l9.4 1-9.4 1c-.4 0-.7.3-.8.7L2.1 19.4c-.1.7.6 1.3 1.3 1z" /></svg>}
          </button>
        </div>
        {busy && <div className="chat-bar chat-busy">{busy}</div>}
      </div>
      )}
      {groupRow && <GroupModal open={editGroup} group={groupRow} onClose={() => setEditGroup(false)} onSaved={() => setEditGroup(false)} />}
      {room.kind === 'project' && isAdmin && <ProjectMembersModal open={editMembers} projectId={room.projectId} onClose={() => setEditMembers(false)} />}
    </div>
  )
}

function Attachment({ a }) {
  const url = useAttachmentUrl(a)
  if (isImage(a)) {
    return (
      <a className="chat-att" href={url || undefined} target="_blank" rel="noreferrer" title={a.name}>
        {url ? <img className="chat-att-img" src={url} alt={a.name} style={a.w && a.h ? { aspectRatio: `${a.w} / ${a.h}` } : undefined} loading="lazy" /> : <span className="chat-att-img chat-att-wait">…</span>}
      </a>
    )
  }
  return (
    <a className="chat-file" href={url || undefined} target="_blank" rel="noreferrer">
      <span className="file-ico">{fileIcon(a.name, a.type)}</span>
      <span className="chat-file-main"><strong>{a.name}</strong><small>{fmtBytes(a.bytes || 0)}</small></span>
    </a>
  )
}
