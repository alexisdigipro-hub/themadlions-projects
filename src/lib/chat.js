// Chat rooms, Telegram-style. Pure helpers: no React, no network, so they run in node for tests.
//
// A room is addressed by a text id:
//   'team'           everyone, where every message written before rooms existed lives
//   'p:<projectId>'  the project's own room (switched on per project, Edit details > Tabs > Chat)
//   'd:<a>:<b>'      a direct conversation between two people, ids sorted so both sides build the same id
//   anything else    a group: a row in state.chats with a name and a member list
// Groups and direct conversations are rows in state.chats; team and project rooms are derived,
// nothing to create. The database checks membership with can_read_chat() (supabase/chat_rooms.sql).

import { canAccessProject, visibleProjects } from './store.jsx'
import { tabHidden } from './tabs.js'

export const TEAM = 'team'
export const projectRoom = (projectId) => `p:${projectId}`
export const directRoom = (a, b) => `d:${[a, b].sort().join(':')}`
/* Storage folder for a room's attachments: chat/<room id with ':' as '_'>/… (see chat_of_path in SQL). */
export const roomFolder = (roomId) => `chat/${String(roomId).replace(/:/g, '_')}`
export const roomKind = (id) => (!id || id === TEAM ? 'team' : id.startsWith('p:') ? 'project' : id.startsWith('d:') ? 'direct' : 'group')

export const READ_KEY = 'tml_chat_read_v2'
const LEGACY_READ_KEY = 'tml_chat_read'

/* When each room was last read, in this browser. The old single-room key becomes the team room's. */
export function loadRead() {
  try {
    const raw = localStorage.getItem(READ_KEY)
    if (raw) return JSON.parse(raw) || {}
    const legacy = localStorage.getItem(LEGACY_READ_KEY)
    return legacy ? { [TEAM]: legacy } : {}
  } catch {
    return {}
  }
}
export function markRead(roomId, iso) {
  const map = loadRead()
  if (!iso || (map[roomId] || '') >= iso) return map
  map[roomId] = iso
  try { localStorage.setItem(READ_KEY, JSON.stringify(map)) } catch {}
  window.dispatchEvent(new Event('tml-chat-read'))
  return map
}

const initialsOf = (n) => (n || '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()

/* Taken out of a project's conversation by an administrator (project.chatExcluded). Administrators never are. */
export const chatExcluded = (project, user) => !!user && user.role !== 'admin' && Array.isArray(project?.chatExcluded) && project.chatExcluded.includes(user.id)

/* Every room this person belongs to, as the list shows them. Order: team, projects, groups, people. */
export function roomsFor(state, user) {
  if (!user) return []
  const users = state.users || []
  // the whole-team room carries the company name from Settings > Company (THEMADLIONS)
  const teamName = (state.workspace?.name || '').trim() || 'Team'
  const out = [{ id: TEAM, kind: 'team', name: teamName, sub: `${users.filter((u) => u.active !== false).length} people`, initials: initialsOf(teamName) }]
  for (const p of visibleProjects(state, user)) {
    if (tabHidden(p, 'chat') || chatExcluded(p, user)) continue
    // the project's cover is the room's picture, its colour the fallback behind the initials
    out.push({ id: projectRoom(p.id), kind: 'project', name: p.title, sub: p.category, projectId: p.id, color: p.color, photo: p.coverThumb || '', initials: initialsOf(p.title) })
  }
  for (const c of state.chats || []) {
    if (!Array.isArray(c.members) || !c.members.includes(user.id)) continue
    if (c.kind === 'group') out.push({ id: c.id, kind: 'group', name: c.name || 'Group', sub: `${c.members.length} members`, members: c.members, initials: initialsOf(c.name) })
    else if (c.kind === 'direct') {
      const otherId = c.members.find((m) => m !== user.id) || user.id
      const other = users.find((u) => u.id === otherId)
      out.push({ id: c.id, kind: 'direct', name: other?.name || 'Former member', sub: other?.profile?.position || '', members: c.members, otherId, photo: other?.profile?.thumb || '', initials: initialsOf(other?.name) })
    }
  }
  return out
}

/* One room by id, even one that has no row yet (a direct conversation not started). */
export function roomOf(state, user, id) {
  const found = roomsFor(state, user).find((r) => r.id === id)
  if (found) return found
  if (roomKind(id) === 'direct' && user) {
    const ids = id.slice(2).split(':')
    if (!ids.includes(user.id)) return null
    const otherId = ids.find((x) => x !== user.id) || user.id
    const other = (state.users || []).find((u) => u.id === otherId)
    if (!other) return null
    return { id, kind: 'direct', name: other.name, sub: other.profile?.position || '', members: ids, otherId, photo: other.profile?.thumb || '', initials: initialsOf(other.name), unsaved: true }
  }
  return null
}

/* Who gets told about a message in a room: everyone in it but the writer. */
export function roomRecipients(state, room, senderId) {
  const active = (state.users || []).filter((u) => u.active !== false && u.id !== senderId)
  if (!room || room.kind === 'team') return active.map((u) => u.id)
  if (room.kind === 'project') {
    const project = (state.projects || []).find((p) => p.id === room.projectId)
    return active.filter((u) => canAccessProject(u, room.projectId) && !chatExcluded(project, u)).map((u) => u.id)
  }
  return active.filter((u) => (room.members || []).includes(u.id)).map((u) => u.id)
}

export const messageRoom = (m) => m.chatId || TEAM
export function messagesIn(chat, roomId) {
  return (chat || []).filter((m) => messageRoom(m) === roomId).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
}

/* Unread per room: messages by someone else, newer than the room's last read time. */
export function unreadByRoom(state, user, readMap, rooms = roomsFor(state, user)) {
  const ids = new Set(rooms.map((r) => r.id))
  const out = {}
  for (const m of state.chat || []) {
    const r = messageRoom(m)
    if (!ids.has(r) || !m.userId || m.userId === user?.id) continue
    if ((m.createdAt || '') > (readMap?.[r] || '')) out[r] = (out[r] || 0) + 1
  }
  return out
}
export const totalUnread = (counts) => Object.values(counts || {}).reduce((a, b) => a + b, 0)

/* Folders: the built-in four plus the person's own (profile.chatFolders = [{ id, name, rooms }]). */
export const BUILTIN_FOLDERS = [
  { id: 'all', name: 'All' },
  { id: 'projects', name: 'Projects', kind: 'project' },
  { id: 'groups', name: 'Groups', kind: 'group' },
  { id: 'direct', name: 'People', kind: 'direct' },
]
export function foldersFor(user) {
  const own = Array.isArray(user?.profile?.chatFolders) ? user.profile.chatFolders : []
  return [...BUILTIN_FOLDERS, ...own.filter((f) => f && f.id && f.name).map((f) => ({ id: f.id, name: f.name, rooms: Array.isArray(f.rooms) ? f.rooms : [], custom: true }))]
}
export function roomsInFolder(folder, rooms) {
  if (!folder || folder.id === 'all') return rooms
  if (folder.kind) return rooms.filter((r) => r.kind === folder.kind)
  const set = new Set(folder.rooms || [])
  return rooms.filter((r) => set.has(r.id))
}

/* Rooms sorted the way a chat list reads: the one with the newest message first. */
export function sortRooms(rooms, chat) {
  const last = {}
  for (const m of chat || []) {
    const r = messageRoom(m)
    if ((m.createdAt || '') > (last[r] || '')) last[r] = m.createdAt
  }
  return [...rooms].sort((a, b) => (last[b.id] || '').localeCompare(last[a.id] || ''))
}
export function lastMessage(chat, roomId) {
  let best = null
  for (const m of chat || []) if (messageRoom(m) === roomId && (!best || (m.createdAt || '') > (best.createdAt || ''))) best = m
  return best
}

/* @mentions: "@Alex", "@Alex Konstantinidis" or "@alex", matched against the team's names. Longest
   names first so "@Alex K" cannot be swallowed by another Alex. */
export function parseMentions(text, users) {
  const t = (text || '').toLowerCase()
  if (!t.includes('@')) return []
  const out = []
  const list = (users || []).filter((u) => u.active !== false && u.name).sort((a, b) => b.name.length - a.name.length)
  for (const u of list) {
    const full = u.name.trim().toLowerCase()
    const first = full.split(/\s+/)[0]
    const hit = (n) => new RegExp(`@${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu').test(t)
    if (hit(full) || (first.length > 1 && hit(first))) out.push(u.id)
  }
  return [...new Set(out)]
}

/* What the person is typing after the last "@" on the caret's word, for the picker. */
export function mentionQuery(text, caret) {
  const before = (text || '').slice(0, caret ?? text?.length ?? 0)
  const at = before.lastIndexOf('@')
  if (at < 0) return null
  if (at > 0 && !/\s/.test(before[at - 1])) return null
  const q = before.slice(at + 1)
  if (/\n/.test(q) || q.length > 30) return null
  return { at, q }
}
