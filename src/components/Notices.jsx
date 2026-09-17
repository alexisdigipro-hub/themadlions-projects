import { useEffect, useMemo, useState } from 'react'
import { Button, Confirm, Field, Input, Modal, Textarea, useToast } from './ui.jsx'
import { uid, useCurrentUser, useStore } from '../lib/store.jsx'
import { fmtDate } from '../lib/dates.js'

const when = (iso) => `${fmtDate((iso || '').slice(0, 10), { day: 'numeric', month: 'short' })} ${new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
export const noticeIsForMe = (n, user) => !!user && n.fromId !== user.id && (n.to === 'all' || (Array.isArray(n.to) && n.to.includes(user.id)))
export const pendingForMe = (notices, user) => (notices || []).filter((n) => noticeIsForMe(n, user) && !n.acks?.[user.id]).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))

/* Shown by the Layout: one unacknowledged notice at a time, oldest first */
export function NoticePopup() {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const pending = pendingForMe(state.notices, user)
  const n = pending[0]
  useEffect(() => { if (n && navigator.vibrate) navigator.vibrate(120) }, [n?.id])
  if (!n) return null
  const ack = () => update((s) => {
    const x = (s.notices || []).find((y) => y.id === n.id)
    if (x) x.acks = { ...(x.acks || {}), [user.id]: new Date().toISOString() }
    return s
  })
  return (
    <Modal open title={n.title || 'Notice'} onClose={ack} footer={<Button variant="primary" onClick={ack}>Got it{pending.length > 1 ? ` (${pending.length - 1} more)` : ''}</Button>}>
      <div className="notice-pop">
        <p className="notice-body">{n.body}</p>
        <p className="muted small">From {n.fromName || 'the team'} · {when(n.createdAt)}</p>
      </div>
    </Modal>
  )
}

export function SendNoticeModal({ open, onClose }) {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const members = state.users.filter((u) => u.active !== false && u.id !== user?.id)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [to, setTo] = useState('all')
  useEffect(() => { if (open) { setTitle(''); setBody(''); setTo('all') } }, [open])
  const toggle = (id) => setTo((t) => (t === 'all' ? [id] : t.includes(id) ? t.filter((x) => x !== id) : [...t, id]))
  const send = () => {
    if (!body.trim()) return toast('Write the message.', 'error')
    if (to !== 'all' && !to.length) return toast('Pick at least one person.', 'error')
    const n = { id: uid(), title: title.trim(), body: body.trim(), fromId: user?.id || '', fromName: user?.name || '', to, acks: {}, createdAt: new Date().toISOString() }
    update((s) => { s.notices = [...(s.notices || []), n]; return s })
    toast(to === 'all' ? 'Sent to the whole team' : `Sent to ${to.length} ${to.length === 1 ? 'person' : 'people'}`, 'ok')
    onClose()
  }
  return (
    <Modal open={open} title="Send a notice" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={send}>Send</Button></>}>
      <div className="stack">
        <p className="small muted">A notice pops up on the screen of the people you pick, the moment they open the app, and stays until they tap "Got it". You see who confirmed.</p>
        <Field label="Title (optional)"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Call time changed" autoFocus /></Field>
        <Field label="Message"><Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tomorrow's call is 06:30 at Boulevart, not 07:00." /></Field>
        <div className="field">
          <span className="field-label">To</span>
          <div className="chips-static notice-to">
            <button type="button" className={`chip ${to === 'all' ? 'on' : ''}`} onClick={() => setTo('all')}>Whole team</button>
            {members.map((m) => <button key={m.id} type="button" className={`chip ${to !== 'all' && to.includes(m.id) ? 'on' : ''}`} onClick={() => toggle(m.id)}>{m.name}</button>)}
          </div>
          {!members.length && <p className="muted small">No other teammates yet. Add them in Team.</p>}
        </div>
      </div>
    </Modal>
  )
}

/* Sent notices with confirmations, for the sender and admins */
export function SentNotices() {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const isAdmin = user?.role === 'admin'
  const list = useMemo(() => (state.notices || []).filter((n) => isAdmin || n.fromId === user?.id).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')), [state.notices, user, isAdmin])
  const nameOf = (id) => state.users.find((u) => u.id === id)?.name || 'Someone'
  const recipients = (n) => (n.to === 'all' ? state.users.filter((u) => u.active !== false && u.id !== n.fromId).map((u) => u.id) : n.to)
  if (!list.length) return <p className="muted small">No notices sent yet.</p>
  return (
    <ul className="plain notice-list">
      {list.map((n) => {
        const rec = recipients(n)
        const done = rec.filter((id) => n.acks?.[id])
        return (
          <li key={n.id} className="notice-row">
            <div className="grow">
              <strong>{n.title || n.body.slice(0, 60)}</strong>
              {n.title && <div className="small">{n.body}</div>}
              <div className="small muted">{n.fromName} · {when(n.createdAt)} · {n.to === 'all' ? 'whole team' : `${rec.length} people`} · <span className={done.length === rec.length && rec.length ? 'under' : ''}>{done.length}/{rec.length} confirmed</span></div>
              <div className="notice-acks">
                {rec.map((id) => <span key={id} className={`ack ${n.acks?.[id] ? 'on' : ''}`} title={n.acks?.[id] ? `Confirmed ${when(n.acks[id])}` : 'Not yet'}>{n.acks?.[id] ? '✓ ' : '· '}{nameOf(id)}</span>)}
              </div>
            </div>
            <Confirm onConfirm={() => update((s) => { s.notices = (s.notices || []).filter((x) => x.id !== n.id); return s })} label="Delete">×</Confirm>
          </li>
        )
      })}
    </ul>
  )
}
