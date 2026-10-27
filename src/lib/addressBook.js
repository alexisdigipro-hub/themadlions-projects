import { supabase } from './supabase.js'
import { uid } from './store.jsx'

/* Contacts, the administrator's own address book (Alex, 27 Oct 2026): imported from a phone's or a mail program's
   file, seen by administrators only. A contact moved to Crew or Cast (Database) becomes a library entry there, and
   that is where the people with the Crew & cast permission see it.
   Kept in its own table, address_book (supabase/address_book.sql), never in the library, which every member reads;
   the database refuses it to anyone but an administrator. In local mode (no Supabase) it lives in this browser. */

const LOCAL = 'tml_address_book'
const localRead = () => { try { return JSON.parse(localStorage.getItem(LOCAL) || '[]') } catch { return [] } }
const localWrite = (rows) => { try { localStorage.setItem(LOCAL, JSON.stringify(rows)) } catch { /* full */ } }

export const emptyContact = () => ({ id: uid(), name: '', phone: '', phone2: '', email: '', company: '', title: '', notes: '' })
const clean = (c) => ({ ...emptyContact(), ...c, id: c.id || uid() })

export async function loadContacts() {
  if (!supabase) return localRead()
  const all = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('address_book').select('id, data').order('id').range(from, from + 999)
    if (error) throw new Error(error.code === '42P01' ? 'Run supabase/address_book.sql in the Supabase SQL Editor to switch Contacts on.' : error.message)
    all.push(...data.map((r) => clean({ ...r.data, id: r.id })))
    if (data.length < 1000) break
  }
  return all
}

export async function saveContacts(list) {
  if (!list.length) return
  if (!supabase) { const m = new Map(localRead().map((c) => [c.id, c])); list.forEach((c) => m.set(c.id, c)); return localWrite([...m.values()]) }
  for (let i = 0; i < list.length; i += 500) {
    const { error } = await supabase.from('address_book').upsert(list.slice(i, i + 500).map((c) => ({ id: c.id, data: c })))
    if (error) throw new Error(error.message)
  }
}

export async function removeContacts(ids) {
  if (!ids.length) return
  if (!supabase) return localWrite(localRead().filter((c) => !ids.includes(c.id)))
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await supabase.from('address_book').delete().in('id', ids.slice(i, i + 200))
    if (error) throw new Error(error.message)
  }
}

/* ---------- reading a contacts file ---------- */

// vCard (.vcf, from an iPhone, a Mac's Contacts, Google or Outlook): one card per BEGIN:VCARD … END:VCARD
function decodeQP(s, charset) {
  const bytes = []
  s.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})|([^=])/gi, (_, hex, ch) => { if (hex) bytes.push(parseInt(hex, 16)); else bytes.push(...new TextEncoder().encode(ch)); return '' })
  try { return new TextDecoder(charset || 'utf-8').decode(new Uint8Array(bytes)) } catch { return new TextDecoder().decode(new Uint8Array(bytes)) }
}
const unescape = (s) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim()

export function parseVcf(text) {
  // folded lines (a line starting with a space or tab goes on the line before)
  const lines = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n')
  const out = []
  let c = null
  for (const line of lines) {
    if (/^BEGIN:VCARD/i.test(line)) { c = { name: '', phones: [], emails: [], company: '', title: '', notes: '', first: '', last: '' }; continue }
    if (/^END:VCARD/i.test(line)) {
      if (c) {
        const name = c.name || [c.first, c.last].filter(Boolean).join(' ') || c.company || c.emails[0] || c.phones[0] || ''
        if (name) out.push({ name, phone: c.phones[0] || '', phone2: c.phones[1] || '', email: c.emails[0] || '', company: c.company, title: c.title, notes: c.notes })
      }
      c = null; continue
    }
    if (!c) continue
    const i = line.indexOf(':')
    if (i < 0) continue
    const head = line.slice(0, i), raw = line.slice(i + 1)
    const key = head.split(';')[0].replace(/^item\d+\./i, '').toUpperCase()
    const qp = /ENCODING=QUOTED-PRINTABLE/i.test(head)
    const charset = (head.match(/CHARSET=([^;:]+)/i) || [])[1]
    const val = unescape(qp ? decodeQP(raw, charset) : raw)
    if (key === 'FN') c.name = val
    else if (key === 'N') { const [last, first] = val.split(';'); c.last = (last || '').trim(); c.first = (first || '').trim() }
    else if (key === 'TEL' && val) c.phones.push(val)
    else if (key === 'EMAIL' && val) c.emails.push(val)
    else if (key === 'ORG') c.company = val.split(';').filter(Boolean).join(' · ')
    else if (key === 'TITLE') c.title = val
    else if (key === 'NOTE') c.notes = val
  }
  return out
}

// CSV (Google Contacts, Outlook, a spreadsheet): the columns are found by their names
function csvRows(text) {
  const rows = []
  let row = [], cell = '', q = false
  const sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ','
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += ch }
    else if (ch === '"') q = true
    else if (ch === sep) { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += ch
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((x) => x.trim()))
}

export function parseCsv(text) {
  const rows = csvRows(text.replace(/^﻿/, ''))
  if (rows.length < 2) return []
  const head = rows[0].map((h) => h.trim().toLowerCase())
  const col = (...res) => head.findIndex((h) => res.some((re) => re.test(h)))
  const cols = (...res) => head.map((h, i) => (res.some((re) => re.test(h)) ? i : -1)).filter((i) => i >= 0)
  const full = col(/^(display )?name$/, /^full name$/, /^όνομα$/, /^ονοματεπώνυμο$/)
  const first = col(/^first name$/, /^given name$/, /^όνομα$/)
  const middle = col(/^middle name$/, /^additional name$/)
  const last = col(/^last name$/, /^family name$/, /^surname$/, /^επώνυμο$/)
  const phones = cols(/phone.*value/, /phone$/, /^mobile/, /^τηλ/, /κινητό/, /^tel/)
  const emails = cols(/e-?mail.*value/, /e-?mail( address)?$/, /^email/)
  const company = col(/organi[sz]ation.*name/, /^company$/, /^organi[sz]ation$/, /^εταιρεία$/)
  const title = col(/organi[sz]ation.*title/, /^job title$/, /^title$/, /^θέση$/)
  const notes = col(/^notes?$/, /^σημειώσεις$/)
  const at = (r, i) => (i >= 0 ? (r[i] || '').trim() : '')
  return rows.slice(1).map((r) => {
    const ph = phones.flatMap((i) => at(r, i).split(':::').map((x) => x.trim())).filter(Boolean)
    const em = emails.flatMap((i) => at(r, i).split(':::').map((x) => x.trim())).filter(Boolean)
    const name = at(r, full) || [at(r, first), at(r, middle), at(r, last)].filter(Boolean).join(' ') || at(r, company) || em[0] || ph[0] || ''
    return { name, phone: ph[0] || '', phone2: ph[1] || '', email: em[0] || '', company: at(r, company), title: at(r, title), notes: at(r, notes) }
  }).filter((c) => c.name)
}

export function parseContactsFile(text, fileName = '') {
  if (/BEGIN:VCARD/i.test(text) || /\.vcf$/i.test(fileName)) return parseVcf(text)
  return parseCsv(text)
}

// the same person twice (by email, else phone, else name) is kept once
const digits = (s) => String(s || '').replace(/\D/g, '').slice(-9)
export const sameKey = (c) => (c.email ? 'e:' + c.email.toLowerCase() : digits(c.phone) ? 't:' + digits(c.phone) : 'n:' + c.name.trim().toLowerCase())
