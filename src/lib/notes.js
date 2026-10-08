// Notes: each person's own, like Apple Notes. Kept outside the shared store on purpose: the
// workspace document is shared and these are private. Online they live in the `notes` table
// (supabase/notes.sql, readable only by their owner); in local mode in this browser.
import { remote, supabase } from './supabase.js'

const LOCAL = 'tml_notes'
const readLocal = () => { try { return JSON.parse(localStorage.getItem(LOCAL) || '[]') } catch { return [] } }
const writeLocal = (rows) => { try { localStorage.setItem(LOCAL, JSON.stringify(rows)) } catch { /* full or blocked */ } }

const fromRow = (r) => ({ id: r.id, kind: r.kind, folderId: r.folder_id || '', title: r.title || '', body: r.body || '', pinned: !!r.pinned, createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at || '' })
const toRow = (n) => ({ id: n.id, kind: n.kind, folder_id: n.folderId || null, title: n.title || '', body: n.body || '', pinned: !!n.pinned, created_at: n.createdAt, updated_at: n.updatedAt, deleted_at: n.deletedAt || null })
const missing = (e) => (/relation .*notes|notes.* does not exist|42P01/.test(`${e?.code} ${e?.message}`) ? new Error('Run supabase/notes.sql in the SQL editor to switch Notes on.') : new Error(e?.message || 'Notes could not be saved.'))

export async function loadNotes() {
  if (!remote) return readLocal()
  const { data, error } = await supabase.from('notes').select('*').order('updated_at', { ascending: false })
  if (error) throw missing(error)
  return (data || []).map(fromRow)
}

export async function saveNote(n) {
  if (!remote) {
    const rows = readLocal()
    const i = rows.findIndex((x) => x.id === n.id)
    if (i >= 0) rows[i] = n
    else rows.push(n)
    writeLocal(rows)
    return
  }
  const { error } = await supabase.from('notes').upsert(toRow(n))
  if (error) throw missing(error)
}

export async function deleteNotes(ids) {
  if (!ids.length) return
  if (!remote) { writeLocal(readLocal().filter((x) => !ids.includes(x.id))); return }
  const { error } = await supabase.from('notes').delete().in('id', ids)
  if (error) throw missing(error)
}

/* The note's text, a line per block: the first line is its title, the next its preview. */
export function noteText(html) {
  const s = String(html || '')
    .replace(/<(br|\/p|\/h[1-6]|\/li|\/div|\/blockquote|\/tr)\s*\/?>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' ')
    .replace(/<li[^>]*data-checked="true"[^>]*>/gi, '☑ ')
    .replace(/<li[^>]*data-checked="false"[^>]*>/gi, '☐ ')
    .replace(/<img[^>]*>/gi, '\n📷\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  return s.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
}
