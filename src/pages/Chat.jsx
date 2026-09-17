import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Confirm, Field, Input, PageHead, useToast } from '../components/ui.jsx'
import { uid, useCurrentUser, useStore } from '../lib/store.jsx'
import { remote, supabase } from '../lib/supabase.js'
import { fmtDate } from '../lib/dates.js'

export const CHAT_READ_KEY = 'tml_chat_read'
const initials = (n) => (n || '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const dayOf = (iso) => (iso || '').slice(0, 10)

export default function Chat() {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const [text, setText] = useState('')
  const [showTg, setShowTg] = useState(false)
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
      <PageHead title="Team chat" sub={`${state.users.filter((u) => u.active !== false).length} in the team${chat.some((m) => m.source === 'telegram') ? ' · mirrored with Telegram' : ''}`}>
        {isAdmin && <Button variant="ghost" onClick={() => setShowTg((v) => !v)}>{showTg ? 'Hide Telegram' : 'Telegram'}</Button>}
      </PageHead>

      {showTg && isAdmin && <TelegramPanel onDone={() => setShowTg(false)} />}

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
                  <div key={m.id} className={`chat-msg ${mine ? 'mine' : ''} ${cont ? 'cont' : ''} ${m.source === 'telegram' ? 'tg' : ''}`}>
                    {!mine && <span className="chat-avatar">{!cont && initials(m.userName)}</span>}
                    <div className="chat-bubble-wrap">
                      {!cont && !mine && <div className="chat-who">{m.userName}{m.source === 'telegram' && <small>Telegram</small>}</div>}
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
          <textarea className="input" rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} placeholder="Write to the team… Enter to send, Shift+Enter for a new line" />
          <Button variant="primary" onClick={send} disabled={!text.trim()}>Send</Button>
        </div>
      </div>
    </div>
  )
}

function TelegramPanel({ onDone }) {
  const { state } = useStore()
  const toast = useToast()
  const [row, setRow] = useState(null)
  const [token, setToken] = useState('')
  const [chatId, setChatId] = useState('')
  const [busy, setBusy] = useState(false)
  const ws = state.workspace?.id
  const fnUrl = remote ? `${supabase.supabaseUrl}/functions/v1/telegram-webhook` : ''

  useEffect(() => {
    if (!remote || !ws) return
    supabase.from('telegram').select('*').eq('workspace_id', ws).maybeSingle().then(({ data, error }) => {
      if (error && error.code !== '42P01') toast(error.message, 'error')
      if (data) { setRow(data); setToken(data.bot_token); setChatId(data.chat_id) }
    })
  }, [ws])

  if (!remote) return <div className="panel chat-tg"><p className="muted">Telegram mirroring works with the team workspace on Supabase. In this browser-only mode the chat stays inside the app.</p></div>

  const save = async () => {
    if (!token.trim() || !chatId.trim()) return toast('Bot token and group chat id are both needed.', 'error')
    setBusy(true)
    const { data, error } = await supabase.from('telegram').upsert({ workspace_id: ws, bot_token: token.trim(), chat_id: chatId.trim(), updated_at: new Date().toISOString() }).select().single()
    setBusy(false)
    if (error) return toast(error.code === '42P01' ? 'Run supabase/chat.sql in the Supabase SQL editor first.' : error.message, 'error')
    setRow(data)
    toast('Telegram connected. Messages from the app now go to the group.', 'ok')
  }
  const disconnect = async () => {
    const { error } = await supabase.from('telegram').delete().eq('workspace_id', ws)
    if (error) return toast(error.message, 'error')
    setRow(null); setToken(''); setChatId('')
    toast('Telegram disconnected')
  }
  const test = async () => {
    if (!token.trim() || !chatId.trim()) return
    try {
      const r = await fetch(`https://api.telegram.org/bot${token.trim()}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId.trim(), text: 'THEMADLIONS Projects is connected to this group.' }) })
      const j = await r.json()
      if (!j.ok) throw new Error(j.description || 'Telegram refused')
      toast('Test message sent to the group', 'ok')
    } catch (e) { toast(e.message, 'error') }
  }
  const webhookUrl = row ? `https://api.telegram.org/bot${row.bot_token}/setWebhook?url=${encodeURIComponent(fnUrl)}&secret_token=${row.webhook_secret}` : ''

  return (
    <div className="panel chat-tg">
      <div className="panel-head"><h2>Telegram group</h2>{row && <button className="link small" onClick={disconnect}>Disconnect</button>}</div>
      <p className="small muted">Every message written here is posted to your Telegram group by the bot. Messages written in Telegram show up here too once the webhook is registered (step 4).</p>
      <ol className="chat-steps small">
        <li>In Telegram open <strong>@BotFather</strong>, send <code>/newbot</code>, copy the token.</li>
        <li>Add the bot to the team group and make it an admin, then send any message in the group.</li>
        <li>Open <code>https://api.telegram.org/bot&lt;token&gt;/getUpdates</code> in a browser and copy the chat id (a negative number starting with -100).</li>
        <li>Save below. For Telegram → app, deploy <code>supabase/functions/telegram-webhook</code> once (Supabase dashboard → Edge Functions, JWT verification off) and open the webhook link that appears.</li>
      </ol>
      <div className="row-2">
        <Field label="Bot token"><Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="123456789:AA…" /></Field>
        <Field label="Group chat id"><Input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="-1001234567890" /></Field>
      </div>
      <div className="row-actions wrap">
        <Button variant="primary" onClick={save} disabled={busy}>{row ? 'Save changes' : 'Connect'}</Button>
        <Button variant="ghost" onClick={test} disabled={!token || !chatId}>Send test message</Button>
        <Button variant="ghost" onClick={onDone}>Close</Button>
      </div>
      {row && (
        <div className="chat-webhook small">
          <div className="muted">Webhook link (open it once in a browser after the Edge Function is deployed):</div>
          <a href={webhookUrl} target="_blank" rel="noreferrer">{webhookUrl}</a>
        </div>
      )}
    </div>
  )
}
