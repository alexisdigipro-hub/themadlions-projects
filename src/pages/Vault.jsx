import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Act, Button, Field, Input, Modal, Select, Textarea, useIsMobile, useToast } from '../components/ui.jsx'
import { changeMaster, createVault, generate, importCsv, loadRow, mergeVaults, newRecoveryKey, saveVault, strength, unlock, unlockWithRecovery } from '../lib/vault.js'

/* Vault (Alex, 28 Oct): each person's own passwords, in the side menu. Locked by a master password of its own;
   encrypted in this browser before it is saved (lib/vault.js), so the hub's database only holds ciphertext.
   Open, it stays open while the person moves around the hub and locks itself after 5 minutes without a touch or a
   key, on Lock, or when the page reloads (the key lives only in memory). Folders with a colour and an icon, like
   Notes and Tasks. */

const IDLE_MS = 5 * 60 * 1000
const CLEAR_CLIP_MS = 45 * 1000
const COLORS = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#5ac8fa', '#007aff', '#5856d6', '#af52de', '#ff2d55', '#a2845e', '#8e8e93', '#C8503F']
const ICONS = ['🗂', '🔐', '🏦', '💳', '📧', '🌐', '📱', '💻', '🎬', '🎧', '🎤', '📷', '🤖', '🛒', '✈️', '🏠', '💼', '⭐']
const ALL = '__all'
const NONE = '__none'

/* ---- what is open, kept outside the page so it survives moving between pages, and its idle lock ---- */
let held = null // { session, vault }
let idle = 0
const subs = new Set()
const emit = () => subs.forEach((f) => f())
const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }
const poke = () => { if (!held) return; clearTimeout(idle); idle = setTimeout(lockNow, IDLE_MS) }
const EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel']
export function lockNow() {
  held = null
  clearTimeout(idle)
  EVENTS.forEach((e) => window.removeEventListener(e, poke, true))
  emit()
}
function hold(session, vault) {
  const first = !held
  held = { session, vault }
  if (first) EVENTS.forEach((e) => window.addEventListener(e, poke, true))
  poke()
  emit()
}
const useHeld = () => useSyncExternalStore(subscribe, () => held, () => held)

const now = () => new Date().toISOString()
const uid = () => crypto.randomUUID()
const hostOf = (url) => { try { return new URL(/^\w+:\/\//.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '') } catch { return '' } }
const hrefOf = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`)

const svg = (d) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
const I = {
  lock: svg(<><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>),
  key: svg(<><circle cx="8" cy="15" r="4" /><path d="m11 12 8.5-8.5M16 7l2.5 2.5M14 9l2 2" /></>),
  user: svg(<><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" /></>),
  link: svg(<><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>),
  eye: svg(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>),
  eyeOff: svg(<><path d="M3 3l18 18M10.6 6.1A9 9 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3 3.7M6.5 7.6A16 16 0 0 0 2.5 12S6 18 12 18a9 9 0 0 0 4-.9" /><path d="M9.9 10a3 3 0 0 0 4.1 4.1" /></>),
  dice: svg(<><rect x="4" y="4" width="16" height="16" rx="3.5" /><circle cx="9" cy="9" r="1" fill="currentColor" /><circle cx="15" cy="15" r="1" fill="currentColor" /><circle cx="15" cy="9" r="1" fill="currentColor" /><circle cx="9" cy="15" r="1" fill="currentColor" /></>),
  upload: svg(<><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" /><path d="M5 20h14" /></>),
  gear: svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>),
  copy: svg(<><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" /></>),
}
const Round = ({ icon, label, onClick, tone = '', ...p }) => <button type="button" className={`vault-ibtn ${tone}`} title={label} aria-label={label} onClick={onClick} {...p}>{icon}</button>

/* Copy, and a little later take it off the clipboard again if it is still there (where the browser lets us) */
let clipTimer = 0
async function copy(text, toast, what) {
  try {
    await navigator.clipboard.writeText(text)
    toast(`${what} copied`, 'ok')
    clearTimeout(clipTimer)
    clipTimer = setTimeout(async () => {
      try { if ((await navigator.clipboard.readText()) === text) await navigator.clipboard.writeText('') } catch { /* the browser would not let us read it */ }
    }, CLEAR_CLIP_MS)
  } catch { toast('Could not copy. Open it and select the text.', 'error') }
}

function Meter({ pw }) {
  const s = strength(pw)
  return <div className={`vault-meter s${s}`} aria-label={['', 'Weak', 'Fair', 'Good', 'Strong'][s]}><i /><i /><i /><i /><span>{pw ? ['', 'Weak', 'Fair', 'Good', 'Strong'][s] : ''}</span></div>
}

function PasswordInput({ value, onChange, show, setShow, ...p }) {
  return (
    <div className="vault-pw">
      <Input type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete="new-password" spellCheck={false} {...p} />
      <button type="button" className="vault-pw-eye" onClick={() => setShow(!show)} aria-label={show ? 'Hide' : 'Show'} title={show ? 'Hide' : 'Show'}>{show ? I.eyeOff : I.eye}</button>
    </div>
  )
}

/* ---- set-up, the recovery key, locked ---- */
function Gate({ children, title, sub }) {
  return (
    <div className="vault-gate">
      <div className="vault-gate-card">
        <div className="vault-gate-ico">{I.lock}</div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
        {children}
      </div>
    </div>
  )
}

function Setup({ onDone }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const go = async (e) => {
    e.preventDefault()
    if (pw.length < 10) return setErr('At least 10 characters. A short sentence you will remember works best.')
    if (pw !== pw2) return setErr('The two do not match.')
    setBusy(true); setErr('')
    try { const r = await createVault(pw); onDone(r) } catch (x) { setErr(x.message); setBusy(false) }
  }
  return (
    <Gate title="Your Vault" sub="Your passwords, locked with a master password only you know. They are encrypted on this device before they are saved: nobody else can read them, administrators included.">
      <form className="vault-gate-form" onSubmit={go}>
        <Field label="Master password"><PasswordInput autoFocus value={pw} onChange={(e) => setPw(e.target.value)} show={show} setShow={setShow} placeholder="A sentence you will remember" /></Field>
        <Meter pw={pw} />
        <Field label="Again"><PasswordInput value={pw2} onChange={(e) => setPw2(e.target.value)} show={show} setShow={setShow} /></Field>
        {err && <p className="vault-err">{err}</p>}
        <p className="vault-warn">If you forget it, only the recovery key you get next can open the Vault. Without both, the passwords are gone for good.</p>
        <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create Vault'}</Button>
      </form>
    </Gate>
  )
}

function ShowRecovery({ code, onDone, again = false }) {
  const toast = useToast()
  const [ok, setOk] = useState(false)
  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([`THEMADLIONS Vault recovery key\n\n${code}\n\nKeep it somewhere safe, outside the hub. It opens your Vault if you forget your master password.\n`], { type: 'text/plain' }))
    a.download = 'Vault recovery key.txt'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  return (
    <Gate title={again ? 'Your new recovery key' : 'Your recovery key'} sub="Save it now, somewhere outside the hub (Apple Passwords, printed, a safe). It is shown only this once.">
      <div className="vault-recovery">{code}</div>
      <div className="vault-gate-row">
        <Button onClick={() => copy(code, toast, 'Recovery key')}>Copy</Button>
        <Button onClick={download}>Download</Button>
      </div>
      <label className="vault-check"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> I have saved it</label>
      <Button variant="primary" disabled={!ok} onClick={onDone}>Continue</Button>
    </Gate>
  )
}

function Locked({ row, onOpen }) {
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [code, setCode] = useState('')
  const [n1, setN1] = useState('')
  const [n2, setN2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const go = async (e) => {
    e.preventDefault()
    setErr('')
    if (forgot) {
      if (n1.length < 10) return setErr('The new master password needs at least 10 characters.')
      if (n1 !== n2) return setErr('The two new ones do not match.')
    }
    setBusy(true)
    try { onOpen(forgot ? await unlockWithRecovery(row, code, n1) : await unlock(row, pw)) } catch (x) { setErr(x.message); setBusy(false) }
  }
  return (
    <Gate title="Vault is locked" sub={forgot ? 'Type your recovery key and choose a new master password.' : undefined}>
      <form className="vault-gate-form" onSubmit={go}>
        {forgot ? (
          <>
            <Field label="Recovery key"><Input autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX-…" spellCheck={false} autoComplete="off" /></Field>
            <Field label="New master password"><PasswordInput value={n1} onChange={(e) => setN1(e.target.value)} show={show} setShow={setShow} /></Field>
            <Meter pw={n1} />
            <Field label="Again"><PasswordInput value={n2} onChange={(e) => setN2(e.target.value)} show={show} setShow={setShow} /></Field>
          </>
        ) : (
          <Field label="Master password"><PasswordInput autoFocus value={pw} onChange={(e) => setPw(e.target.value)} show={show} setShow={setShow} autoComplete="current-password" /></Field>
        )}
        {err && <p className="vault-err">{err}</p>}
        <Button variant="primary" type="submit" disabled={busy || (forgot ? !code : !pw)}>{busy ? 'Opening…' : 'Unlock'}</Button>
        <button type="button" className="vault-link" onClick={() => { setForgot(!forgot); setErr('') }}>{forgot ? 'Back to the master password' : 'Forgot your master password?'}</button>
      </form>
    </Gate>
  )
}

/* ---- a login, edited ---- */
function ItemForm({ item, folders, onSave, onDelete, onClose }) {
  const toast = useToast()
  const [d, setD] = useState(item)
  const [show, setShow] = useState(!item.password)
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value })
  const save = () => { if (!d.title.trim() && !d.url.trim()) return toast('Give it a name or a website.', 'error'); onSave({ ...d, title: d.title.trim() || hostOf(d.url) || d.url.trim() }) }
  return (
    <Modal open title={item.createdAt ? 'Login' : 'New login'} onClose={onClose} footer={
      <>
        {item.createdAt && <Button variant="ghost" className="vault-del" onClick={() => onDelete(item)}>Delete</Button>}
        <span className="grow" />
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save}>Save</Button>
      </>
    }>
      <div className="vault-form">
        <Field label="Name"><Input autoFocus={!item.createdAt} value={d.title} onChange={set('title')} placeholder="Instagram THEMADLIONS" /></Field>
        <Field label="Username or email">
          <div className="vault-pw"><Input value={d.username} onChange={set('username')} autoComplete="off" spellCheck={false} />{d.username && <button type="button" className="vault-pw-eye" onClick={() => copy(d.username, toast, 'Username')} title="Copy" aria-label="Copy">{I.copy}</button>}</div>
        </Field>
        <Field label="Password">
          <div className="vault-pw-row">
            <PasswordInput value={d.password} onChange={set('password')} show={show} setShow={setShow} />
            <Round icon={I.copy} label="Copy password" onClick={() => d.password && copy(d.password, toast, 'Password')} />
            <Round icon={I.dice} label="New strong password" onClick={() => { setD({ ...d, password: generate(20) }); setShow(true) }} />
          </div>
          <Meter pw={d.password} />
        </Field>
        <Field label="Website"><Input value={d.url} onChange={set('url')} placeholder="instagram.com" inputMode="url" autoComplete="off" spellCheck={false} /></Field>
        <Field label="Folder">
          <Select value={d.folderId || NONE} onChange={(e) => setD({ ...d, folderId: e.target.value === NONE ? '' : e.target.value })}>
            <option value={NONE}>No folder</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{`${f.icon} ${f.name}`}</option>)}
          </Select>
        </Field>
        <Field label="Notes"><Textarea rows={3} value={d.notes} onChange={set('notes')} placeholder="Security questions, PIN, who else uses it…" /></Field>
      </div>
    </Modal>
  )
}

function Generator({ onClose }) {
  const toast = useToast()
  const [len, setLen] = useState(20)
  const [digits, setDigits] = useState(true)
  const [symbols, setSymbols] = useState(true)
  const [pw, setPw] = useState(() => generate(20))
  const again = (o = {}) => setPw(generate(o.len ?? len, { digits: o.digits ?? digits, symbols: o.symbols ?? symbols }))
  return (
    <Modal open title="Strong password" onClose={onClose} footer={<><span className="grow" /><Button onClick={() => again()}>Another</Button><Button variant="primary" onClick={() => copy(pw, toast, 'Password')}>Copy</Button></>}>
      <div className="vault-form">
        <div className="vault-gen">{pw}</div>
        <Meter pw={pw} />
        <label className="vault-range">Length <b>{len}</b><input type="range" min="8" max="48" value={len} onChange={(e) => { const v = +e.target.value; setLen(v); again({ len: v }) }} /></label>
        <label className="vault-check"><input type="checkbox" checked={digits} onChange={(e) => { setDigits(e.target.checked); again({ digits: e.target.checked }) }} /> Numbers</label>
        <label className="vault-check"><input type="checkbox" checked={symbols} onChange={(e) => { setSymbols(e.target.checked); again({ symbols: e.target.checked }) }} /> Symbols</label>
      </div>
    </Modal>
  )
}

function Importer({ onImport, onClose }) {
  const [err, setErr] = useState('')
  const pick = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    try { onImport(importCsv(await f.text())) } catch (x) { setErr(x.message) }
    e.target.value = ''
  }
  return (
    <Modal open title="Import passwords" onClose={onClose}>
      <div className="vault-form">
        <p>Bring them in from a CSV file:</p>
        <ul className="vault-steps">
          <li><b>Apple Passwords</b> (Mac): open Passwords, File &gt; Export All Passwords to File.</li>
          <li><b>Chrome</b>: Settings &gt; Passwords &gt; Settings &gt; Download file.</li>
          <li><b>Bitwarden, 1Password, Firefox</b>: their Export as CSV.</li>
        </ul>
        <label className="btn btn-primary btn-md vault-file">Choose the CSV file<input type="file" accept=".csv,text/csv" onChange={pick} /></label>
        {err && <p className="vault-err">{err}</p>}
        <p className="vault-warn">The file holds your passwords in plain text: delete it (and empty the Trash) once they are in.</p>
      </div>
    </Modal>
  )
}

function FolderForm({ form, setForm, onSave, onDelete, onClose }) {
  return (
    <Modal open title={form.id ? 'Folder settings' : 'New folder'} onClose={onClose} footer={
      <>
        {form.id && <Button variant="ghost" className="vault-del" onClick={onDelete}>Delete folder</Button>}
        <span className="grow" />
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={onSave} disabled={!form.name.trim()}>{form.id ? 'Save' : 'Add folder'}</Button>
      </>
    }>
      <div className="rem-list-form" style={{ '--lc': form.color }}>
        <div className="rem-list-preview">{form.icon}</div>
        <Field label="Name"><Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && form.name.trim() && onSave()} placeholder="Social" /></Field>
        <div className="rem-swatches">{COLORS.map((c) => <button key={c} type="button" className={form.color === c ? 'on' : ''} style={{ background: c }} onClick={() => setForm({ ...form, color: c })} aria-label={c} />)}</div>
        <div className="rem-icons">{ICONS.map((i) => <button key={i} type="button" className={form.icon === i ? 'on' : ''} onClick={() => setForm({ ...form, icon: i })}>{i}</button>)}</div>
      </div>
    </Modal>
  )
}

function VaultSettings({ session, onClose, onRecovery }) {
  const toast = useToast()
  const [n1, setN1] = useState('')
  const [n2, setN2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const change = async () => {
    setErr('')
    if (n1.length < 10) return setErr('At least 10 characters.')
    if (n1 !== n2) return setErr('The two do not match.')
    setBusy(true)
    try { await changeMaster(session, n1); toast('Master password changed', 'ok'); onClose() } catch (x) { setErr(x.message) }
    setBusy(false)
  }
  const recovery = async () => {
    if (!confirm('Make a new recovery key? The old one stops working.')) return
    try { onRecovery(await newRecoveryKey(session)) } catch (x) { setErr(x.message) }
  }
  return (
    <Modal open title="Vault settings" onClose={onClose} footer={<><span className="grow" /><Button variant="ghost" onClick={onClose}>Close</Button></>}>
      <div className="vault-form">
        <h3 className="vault-h">Change master password</h3>
        <Field label="New master password"><PasswordInput value={n1} onChange={(e) => setN1(e.target.value)} show={show} setShow={setShow} /></Field>
        <Meter pw={n1} />
        <Field label="Again"><PasswordInput value={n2} onChange={(e) => setN2(e.target.value)} show={show} setShow={setShow} /></Field>
        <Button variant="primary" onClick={change} disabled={busy || !n1}>{busy ? 'Saving…' : 'Change'}</Button>
        <h3 className="vault-h">Recovery key</h3>
        <p className="muted">Lost the one you saved? Make a new one; the old one stops working.</p>
        <Button onClick={recovery}>New recovery key</Button>
        <p className="muted">The Vault locks itself after 5 minutes without use.</p>
        {err && <p className="vault-err">{err}</p>}
      </div>
    </Modal>
  )
}

/* ---- the open Vault ---- */
function Open({ session, vault }) {
  const toast = useToast()
  const mobile = useIsMobile()
  const [folder, setFolder] = useState(ALL)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const [folderForm, setFolderForm] = useState(null)
  const [gen, setGen] = useState(false)
  const [imp, setImp] = useState(false)
  const [settings, setSettings] = useState(false)
  const [recovery, setRecovery] = useState('')
  const saving = useRef(Promise.resolve())

  // every change is shown at once and saved in order behind it
  const change = (fn) => {
    const next = fn(held.vault)
    hold(session, next)
    saving.current = saving.current.then(async () => {
      try {
        const saved = await saveVault(session, held?.vault || next)
        if (held && saved !== held.vault && held.session === session) hold(session, mergeVaults(held.vault, saved))
      } catch (x) { toast(x.message, 'error') }
    })
  }

  const folders = vault.folders.filter((f) => !f.deletedAt).sort((a, b) => a.name.localeCompare(b.name))
  const live = vault.items.filter((it) => !it.deletedAt)
  const fById = Object.fromEntries(folders.map((f) => [f.id, f]))
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return live
      .filter((it) => (s ? [it.title, it.username, it.url, it.notes].some((x) => (x || '').toLowerCase().includes(s)) : folder === ALL || (folder === NONE ? !fById[it.folderId] : it.folderId === folder)))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [vault, q, folder])

  const saveItem = (d) => { change((v) => ({ ...v, items: [...v.items.filter((x) => x.id !== d.id), { ...d, createdAt: d.createdAt || now(), updatedAt: now() }] })); setEditing(null) }
  const deleteItem = (d) => { if (!confirm(`Delete "${d.title}"?`)) return; change((v) => ({ ...v, items: v.items.map((x) => (x.id === d.id ? { id: x.id, deletedAt: now(), updatedAt: now() } : x)) })); setEditing(null) }
  const saveFolder = () => {
    const f = folderForm
    const rowF = { id: f.id || uid(), name: f.name.trim(), color: f.color, icon: f.icon, createdAt: f.createdAt || now(), updatedAt: now() }
    change((v) => ({ ...v, folders: [...v.folders.filter((x) => x.id !== rowF.id), rowF] }))
    if (!f.id) setFolder(rowF.id)
    setFolderForm(null)
  }
  const deleteFolder = () => {
    const f = folderForm
    const n = live.filter((it) => it.folderId === f.id).length
    if (!confirm(n ? `Delete the folder "${f.name}"? Its ${n} login${n === 1 ? '' : 's'} stay, with no folder.` : `Delete the folder "${f.name}"?`)) return
    const t = now()
    change((v) => ({ ...v, folders: v.folders.map((x) => (x.id === f.id ? { id: x.id, deletedAt: t, updatedAt: t } : x)), items: v.items.map((x) => (x.folderId === f.id ? { ...x, folderId: '', updatedAt: t } : x)) }))
    if (folder === f.id) setFolder(ALL)
    setFolderForm(null)
  }
  const doImport = ({ items, folders: fs }) => {
    if (!items.length) { toast('No passwords found in that file.', 'error'); return }
    // a login already here (same website and username) is updated rather than doubled
    const key = (it) => `${hostOf(it.url) || it.title.toLowerCase()}|${(it.username || '').toLowerCase()}`
    change((v) => {
      const have = new Map(v.items.filter((x) => !x.deletedAt).map((x) => [key(x), x]))
      const byName = new Map(v.folders.filter((x) => !x.deletedAt).map((x) => [x.name.toLowerCase(), x.id]))
      const newFolders = fs.filter((f) => !byName.has(f.name.toLowerCase()))
      const fid = (id) => { const f = fs.find((x) => x.id === id); return f ? byName.get(f.name.toLowerCase()) || f.id : '' }
      const merged = items.map((it) => { const old = have.get(key(it)); return old ? { ...old, password: it.password, notes: old.notes || it.notes, updatedAt: now() } : { ...it, folderId: fid(it.folderId) } })
      const ids = new Set(merged.map((x) => x.id))
      return { ...v, folders: [...v.folders, ...newFolders], items: [...v.items.filter((x) => !ids.has(x.id)), ...merged] }
    })
    setImp(false)
    toast(`${items.length} password${items.length === 1 ? '' : 's'} imported`, 'ok')
  }

  const newItem = () => setEditing({ id: uid(), title: '', username: '', password: generate(20), url: '', notes: '', folderId: fById[folder] ? folder : '' })
  const folderRow = (id, name, icon, count, f) => (
    <div key={id} className={`vault-frow ${folder === id && !q ? 'on' : ''}`} style={f ? { '--lc': f.color } : undefined}>
      <button type="button" className="vault-fpick" onClick={() => { setFolder(id); setQ('') }}>
        <span className="vault-femoji" aria-hidden="true">{icon}</span>
        <span className="grow">{name}</span>
        <span className="vault-count">{count || ''}</span>
      </button>
      {f && <button type="button" className="vault-fedit" title="Folder settings" aria-label="Folder settings" onClick={() => setFolderForm({ ...f })}>✎</button>}
    </div>
  )
  const current = q.trim() ? `Searching for "${q.trim()}"` : folder === ALL ? 'All logins' : folder === NONE ? 'No folder' : fById[folder]?.name || 'All logins'

  return (
    <div className={`vault ${mobile ? 'm' : ''}`}>
      <div className="vault-top">
        <h1>Vault</h1>
        <input className="vault-search" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="vault-acts">
          <Act icon="plus" label="New login" main onClick={newItem} />
          <button type="button" className="act" title="Strong password" aria-label="Strong password" onClick={() => setGen(true)}>{I.dice}<span className="act-t">Generate</span></button>
          <button type="button" className="act" title="Import" aria-label="Import" onClick={() => setImp(true)}>{I.upload}<span className="act-t">Import</span></button>
          <button type="button" className="act" title="Vault settings" aria-label="Vault settings" onClick={() => setSettings(true)}>{I.gear}<span className="act-t">Settings</span></button>
          <button type="button" className="act" title="Lock" aria-label="Lock" onClick={lockNow}>{I.lock}<span className="act-t">Lock</span></button>
        </div>
      </div>
      <div className="vault-body">
        <aside className="vault-side">
          {folderRow(ALL, 'All logins', '🔐', live.length)}
          {folders.map((f) => folderRow(f.id, f.name, f.icon, live.filter((it) => it.folderId === f.id).length, f))}
          {folders.length > 0 && live.some((it) => !fById[it.folderId]) && folderRow(NONE, 'No folder', '·', live.filter((it) => !fById[it.folderId]).length)}
          <button type="button" className="vault-addf" onClick={() => setFolderForm({ name: '', color: COLORS[5], icon: ICONS[1] })}><span>＋</span> New Folder</button>
        </aside>
        <section className="vault-main">
          <div className="vault-main-head"><h2>{current}</h2><span className="muted">{shown.length} login{shown.length === 1 ? '' : 's'}</span></div>
          {shown.length === 0 ? (
            <div className="vault-empty">
              <p>{q.trim() ? 'Nothing matches.' : live.length ? 'No logins in this folder.' : 'No logins yet.'}</p>
              {!q.trim() && !live.length && <div className="vault-gate-row"><Button variant="primary" onClick={newItem}>New login</Button><Button onClick={() => setImp(true)}>Import from Apple Passwords</Button></div>}
            </div>
          ) : (
            <ul className="vault-list">
              {shown.map((it) => {
                const f = fById[it.folderId]
                return (
                  <li key={it.id} className={`vault-item${f ? ' tinted' : ''}`} style={f ? { '--tint': f.color } : undefined} onClick={() => setEditing({ ...it })}>
                    <span className="vault-av" style={{ '--av': f?.color || 'var(--accent)' }}>{f ? f.icon : (it.title || '?').trim()[0]?.toUpperCase()}</span>
                    <span className="vault-item-t">
                      <b>{it.title}</b>
                      <span className="muted">{it.username || hostOf(it.url) || ' '}</span>
                    </span>
                    <span className="vault-item-acts" onClick={(e) => e.stopPropagation()}>
                      {!mobile && it.username && <Round icon={I.user} label="Copy username" onClick={() => copy(it.username, toast, 'Username')} />}
                      {it.password && <Round icon={I.key} label="Copy password" tone="main" onClick={() => copy(it.password, toast, 'Password')} />}
                      {!mobile && it.url && <a className="vault-ibtn" href={hrefOf(it.url)} target="_blank" rel="noopener noreferrer" title="Open website" aria-label="Open website">{I.link}</a>}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
      {editing && <ItemForm item={editing} folders={folders} onSave={saveItem} onDelete={deleteItem} onClose={() => setEditing(null)} />}
      {folderForm && <FolderForm form={folderForm} setForm={setFolderForm} onSave={saveFolder} onDelete={deleteFolder} onClose={() => setFolderForm(null)} />}
      {gen && <Generator onClose={() => setGen(false)} />}
      {imp && <Importer onImport={doImport} onClose={() => setImp(false)} />}
      {settings && <VaultSettings session={session} onClose={() => setSettings(false)} onRecovery={(c) => { setSettings(false); setRecovery(c) }} />}
      {recovery && createRecoveryOverlay(recovery, () => setRecovery(''))}
    </div>
  )
}
const createRecoveryOverlay = (code, done) => <div className="vault-over"><ShowRecovery code={code} again onDone={done} /></div>

export default function Vault() {
  const h = useHeld()
  const [row, setRow] = useState(undefined) // undefined loading, null none yet
  const [err, setErr] = useState('')
  const [fresh, setFresh] = useState(null) // { recovery, session, vault } right after set-up
  useEffect(() => { if (!h) loadRow().then(setRow, (e) => setErr(e.message)) }, [h])

  if (fresh) return <ShowRecovery code={fresh.recovery} onDone={() => { hold(fresh.session, fresh.vault); setFresh(null) }} />
  if (h) return <Open session={h.session} vault={h.vault} />
  if (err) return <Gate title="Vault" sub={err} />
  if (row === undefined) return <div className="vault-gate muted">Loading…</div>
  if (row === null) return <Setup onDone={setFresh} />
  return <Locked row={row} onOpen={({ session, vault }) => hold(session, vault)} />
}
