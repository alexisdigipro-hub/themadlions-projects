import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Confirm, Field, Input, PageHead, useToast } from '../components/ui.jsx'
import { uid, useCurrentUser, useStore } from '../lib/store.jsx'
import { fmtDate } from '../lib/dates.js'
import { SendNoticeModal, SentNotices } from '../components/Notices.jsx'

export const CHAT_READ_KEY = 'tml_chat_read'
const initials = (n) => (n || '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const dayOf = (iso) => (iso || '').slice(0, 10)

export default function Chat() {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const [text, setText] = useState('')
  const [notice, setNotice] = useState(false)
  const [showSent, setShowSent] = useState(false)
  const endRef = useRef(null)
  const chat = state.chat || []
  const isAdmin = user?.role === 'admin'

  const groups = useMemo(() => {
    const out = []
    let last = null
    for (const m of [...chat].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))) {
      const d = dayOf(m.createdAt)
      if (!last || last.day !== d) { last = { day: d, items: [] }; out.push(last) }
      last.items.push(m)
    }
    return out
  }, [chat])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
    const latest = chat.reduce((a, m) => (m.createdAt > a ? m.createdAt : a), '')
    if (latest) localStorage.setItem(CHAT_READ_KEY, latest)
    window.dispatchEvent(new Event('tml-chat-read'))
  }, [chat.length])

  const send = () => {
    const t = text.trim()
    if (!t) return
    const m = { id: uid(), userId: user?.id || '', userName: user?.name || 'Someone', text: t, source: 'app', createdAt: new Date().toISOString() }
    update((s) => { s.chat = [...(s.chat || []), m]; return s })
    setText('')
  }
  const remove = (id) => update((s) => { s.chat = (s.chat || []).filter((m) => m.id !== id); return s })
  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }
  const dayLabel = (d) => {
    const today = new Date().toISOString().slice(0, 10)
    const y = new Date(); y.setDate(y.getDate() - 1)
    return d === today ? 'Today' : d === y.toISOString().slice(0, 10) ? 'Yesterday' : fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })
  }

  return (
    <div className="chat-page">
      <PageHead title="Team chat" sub={`${state.users.filter((u) => u.active !== false).length} in the team`}>
        {isAdmin && <Button variant="ghost" onClick={() => setShowSent((v) => !v)}>{showSent ? 'Hide notices' : 'Sent notices'}</Button>}
        {isAdmin && <Button variant="primary" onClick={() => setNotice(true)}>Send notice</Button>}
      </PageHead>
      <SendNoticeModal open={notice} onClose={() => setNotice(false)} />
      {showSent && isAdmin && <div className="panel chat-tg"><div className="panel-head"><h2>Notices</h2></div><SentNotices /></div>}

      <div className="chat-box">
        <div className="chat-scroll">
          {!chat.length && <p className="muted chat-empty">No messages yet. Say hi to the team.</p>}
          {groups.map((g) => (
            <div key={g.day} className="chat-day">
              <div className="chat-day-label"><span>{dayLabel(g.day)}</span></div>
              {g.items.map((m, i) => {
                const mine = m.userId && m.userId === user?.id
                const prev = g.items[i - 1]
                const cont = prev && prev.userId === m.userId && prev.userName === m.userName && prev.source === m.source && new Date(m.createdAt) - new Date(prev.createdAt) < 5 * 60 * 1000
                return (
                  <div key={m.id} className={`chat-msg ${mine ? 'mine' : ''} ${cont ? 'cont' : ''}`}>
                    {!mine && <span className="chat-avatar">{!cont && initials(m.userName)}</span>}
                    <div className="chat-bubble-wrap">
                      {!cont && !mine && <div className="chat-who">{m.userName}</div>}
                      <div className="chat-bubble">
                        {m.text}
                        <span className="chat-time">{timeOf(m.createdAt)}</span>
                      </div>
                    </div>
                    {(mine || isAdmin) && <Confirm onConfirm={() => remove(m.id)} label="Delete message">×</Confirm>}
                  </div>
                )
              })}
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="chat-compose">
          <textarea className="input" rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} placeholder="Write to the team…" title="Enter to send, Shift+Enter for a new line" />
          <Button variant="primary" onClick={send} disabled={!text.trim()}>Send</Button>
        </div>
      </div>
    </div>
  )
}
