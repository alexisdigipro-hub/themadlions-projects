// Vault: each person's own passwords (Alex, 28 Oct). Encrypted in the browser before anything leaves it, with a
// key made from a master password only the person knows; the database (supabase/vault.sql, one row per person,
// readable only by its owner) and anyone who reads it, administrators and Supabase included, see only ciphertext.
//
// How the keys sit:
//   data key   random 256-bit AES-GCM key that encrypts the vault (all entries and folders as one JSON)
//   wrapped    the data key encrypted with a key derived from the master password (PBKDF2-SHA256, 600 000 rounds)
//   r_wrapped  the data key encrypted with a key derived from the recovery key (shown once at set-up)
// Forgetting the master password and losing the recovery key loses the vault: there is no way round it, by design.
import { remote, supabase } from './supabase.js'

const LOCAL = 'tml_vault'
export const ITER = 600000
const R_ITER = 100000 // the recovery key is 160 random bits, it needs no slow stretching
const enc = new TextEncoder()
const dec = new TextDecoder()
const rand = (n) => crypto.getRandomValues(new Uint8Array(n))
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s) }
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function derive(secret, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', enc.encode(secret.normalize('NFKC')), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
async function seal(key, bytes) {
  const iv = rand(12)
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes))
  return `${b64(iv)}.${b64(ct)}`
}
async function unseal(key, s) {
  const [iv, ct] = String(s).split('.')
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ct)))
}
const dataKey = (raw) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])

/* The recovery key: 32 letters and digits in groups of four, without the ones easy to misread (0 O 1 I L). */
const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function newRecovery() {
  const out = []
  while (out.length < 32) { const b = rand(1)[0]; if (b < ABC.length * 8) out.push(ABC[b % ABC.length]) }
  return out.join('').match(/.{4}/g).join('-')
}
const cleanRecovery = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

export const emptyVault = () => ({ v: 1, items: [], folders: [] })

/* ---- the row ---- */
const readLocal = () => { try { return JSON.parse(localStorage.getItem(LOCAL) || 'null') } catch { return null } }
const writeLocal = (row) => { try { localStorage.setItem(LOCAL, JSON.stringify(row)) } catch { /* full or blocked */ } }
const missing = (e) => (/relation .*vaults|vaults.* does not exist|42P01|PGRST205/.test(`${e?.code} ${e?.message}`) ? new Error('Run supabase/vault.sql in the SQL editor to switch the Vault on.') : new Error(e?.message || 'The Vault could not be reached.'))

export async function loadRow() {
  if (!remote) return readLocal()
  const { data, error } = await supabase.from('vaults').select('*').maybeSingle()
  if (error) throw missing(error)
  return data || null
}
async function insertRow(row) {
  if (!remote) { writeLocal(row); return row }
  const { data, error } = await supabase.from('vaults').insert(row).select('*').single()
  if (error) throw missing(error)
  return data
}
/* writes only if nobody (another device) saved since we read it; null when someone did */
async function updateRow(rev, patch) {
  if (!remote) {
    const cur = readLocal()
    if (!cur || cur.rev !== rev) return null
    const next = { ...cur, ...patch, rev: rev + 1, updated_at: new Date().toISOString() }
    writeLocal(next)
    return next
  }
  const { data, error } = await supabase.from('vaults').update({ ...patch, rev: rev + 1, updated_at: new Date().toISOString() }).eq('rev', rev).select('*')
  if (error) throw missing(error)
  return data?.[0] || null
}

/* ---- the session: the data key in memory, nowhere else ---- */
async function openWith(row, raw) {
  const key = await dataKey(raw)
  const vault = row.data ? JSON.parse(dec.decode(await unseal(key, row.data))) : emptyVault()
  return { session: { key, raw, rev: row.rev }, vault: { ...emptyVault(), ...vault } }
}

export async function createVault(master) {
  const raw = rand(32)
  const recovery = newRecovery()
  const salt = rand(16)
  const rSalt = rand(16)
  const key = await dataKey(raw)
  const row = await insertRow({
    iter: ITER,
    salt: b64(salt),
    wrapped: await seal(await derive(master, salt, ITER), raw),
    r_salt: b64(rSalt),
    r_wrapped: await seal(await derive(cleanRecovery(recovery), rSalt, R_ITER), raw),
    data: await seal(key, enc.encode(JSON.stringify(emptyVault()))),
    rev: 1,
  })
  return { recovery, ...(await openWith(row, raw)) }
}

export async function unlock(row, master) {
  let raw
  try { raw = await unseal(await derive(master, unb64(row.salt), row.iter || ITER), row.wrapped) } catch { throw new Error('That is not the master password.') }
  return openWith(row, raw)
}

/* forgot the master password: the recovery key opens it and a new master password is set */
export async function unlockWithRecovery(row, code, newMaster) {
  let raw
  try { raw = await unseal(await derive(cleanRecovery(code), unb64(row.r_salt), R_ITER), row.r_wrapped) } catch { throw new Error('That recovery key does not open this vault.') }
  const salt = rand(16)
  await rewrite({ raw, rev: row.rev }, { iter: ITER, salt: b64(salt), wrapped: await seal(await derive(newMaster, salt, ITER), raw) })
  return openWith(await loadRow(), raw)
}

export async function changeMaster(session, newMaster) {
  const salt = rand(16)
  const patch = { iter: ITER, salt: b64(salt), wrapped: await seal(await derive(newMaster, salt, ITER), session.raw) }
  return rewrite(session, patch)
}
export async function newRecoveryKey(session) {
  const recovery = newRecovery()
  const rSalt = rand(16)
  await rewrite(session, { r_salt: b64(rSalt), r_wrapped: await seal(await derive(cleanRecovery(recovery), rSalt, R_ITER), session.raw) })
  return recovery
}
async function rewrite(session, patch) {
  let row = await updateRow(session.rev, patch)
  if (!row) { const cur = await loadRow(); row = await updateRow(cur.rev, patch) }
  if (!row) throw new Error('Could not save, try again.')
  session.rev = row.rev
  return row
}

/* Two copies of the vault (this device's and one saved meanwhile elsewhere): per entry and folder the newer one wins;
   a deleted one stays as a marker for 30 days so the other device learns of it. */
export function mergeVaults(a, b) {
  const pick = (x = [], y = []) => {
    const by = new Map()
    for (const it of [...x, ...y]) { const old = by.get(it.id); if (!old || (it.updatedAt || '') > (old.updatedAt || '')) by.set(it.id, it) }
    const cut = new Date(Date.now() - 30 * 864e5).toISOString()
    return [...by.values()].filter((it) => !it.deletedAt || it.deletedAt > cut)
  }
  return { v: 1, items: pick(a.items, b.items), folders: pick(a.folders, b.folders) }
}

/* Saves the whole vault; if another device saved since, both are merged and saved again. Returns what is now saved. */
export async function saveVault(session, vault) {
  for (let i = 0; i < 3; i++) {
    const row = await updateRow(session.rev, { data: await seal(session.key, enc.encode(JSON.stringify(vault))) })
    if (row) { session.rev = row.rev; return vault }
    const cur = await loadRow()
    const theirs = cur.data ? JSON.parse(dec.decode(await unseal(session.key, cur.data))) : emptyVault()
    session.rev = cur.rev
    vault = mergeVaults(vault, theirs)
  }
  throw new Error('Could not save, try again.')
}

/* ---- a strong password ---- */
const SETS = { lower: 'abcdefghijkmnopqrstuvwxyz', upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ', digits: '23456789', symbols: '!@#$%&*?-_=+' }
export function generate(length = 20, { digits = true, symbols = true } = {}) {
  const pools = [SETS.lower, SETS.upper, digits && SETS.digits, symbols && SETS.symbols].filter(Boolean)
  const all = pools.join('')
  const pickFrom = (s) => { const lim = 256 - (256 % s.length); for (;;) { const b = rand(1)[0]; if (b < lim) return s[b % s.length] } }
  for (;;) {
    const out = Array.from({ length }, () => pickFrom(all)).join('')
    if (pools.every((p) => [...out].some((c) => p.includes(c)))) return out // one of each kind it was asked for
  }
}
/* 0..4, rough: length and the kinds of characters */
export function strength(pw = '') {
  if (!pw) return 0
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length
  const bits = pw.length * Math.log2([0, 26, 52, 62, 90][kinds] || 26)
  return bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4
}

/* ---- import: the CSV that Apple Passwords, Chrome, Firefox, Bitwarden or 1Password export ---- */
export function parseCsv(text) {
  const rows = []
  let row = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((x) => x.trim()))
}
export function importCsv(text) {
  const rows = parseCsv(text.replace(/^﻿/, ''))
  if (rows.length < 2) return { items: [], folders: [] }
  const head = rows[0].map((h) => h.trim().toLowerCase())
  const col = (...names) => head.findIndex((h) => names.includes(h))
  const ix = {
    title: col('title', 'name'),
    url: col('url', 'login_uri', 'website', 'web site'),
    username: col('username', 'login_username', 'login', 'email'),
    password: col('password', 'login_password'),
    notes: col('notes', 'note', 'extra'),
    folder: col('folder', 'grouping', 'group'),
  }
  if (ix.password < 0) throw new Error('This file has no Password column. Export your passwords as CSV and try again.')
  const now = new Date().toISOString()
  const folders = new Map()
  const items = rows.slice(1).map((r) => {
    const get = (k) => (ix[k] >= 0 ? (r[ix[k]] || '').trim() : '')
    const url = get('url')
    let title = get('title')
    if (!title && url) { try { title = new URL(/^\w+:\/\//.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '') } catch { title = url } }
    let folderId = ''
    const fname = get('folder')
    if (fname) { if (!folders.has(fname)) folders.set(fname, { id: crypto.randomUUID(), name: fname, color: '#007aff', icon: '🗂', createdAt: now, updatedAt: now }); folderId = folders.get(fname).id }
    return { id: crypto.randomUUID(), title: title || get('username') || 'Login', username: get('username'), password: r[ix.password] || '', url, notes: get('notes'), folderId, createdAt: now, updatedAt: now }
  }).filter((it) => it.password || it.username)
  return { items, folders: [...folders.values()] }
}
