import { useEffect, useState } from 'react'
import { Button } from './ui.jsx'
import { disablePush, enablePush, pushStatus, testPush } from '../lib/push.js'
import { remote } from '../lib/supabase.js'
import { CHAT_DEFAULTS, TEXT_SIZES, chime, loadChatPrefs, saveChatPrefs, textSizeOf } from '../lib/chatPrefs.js'

/* Settings > Chat (and the chat window's Settings tab): personal, per device, laid out like
   Telegram's settings (Alex, 8 Oct): grouped cards with a heading above each, a switch at the
   end of each row. Plain divs and buttons, not labels: a label re-dispatches a click to its
   first button in some browsers, which snapped a choice back. */

const THEMES = [
  ['accent', 'Your accent'],
  ['blue', 'Splendid blue'],
  ['sepia', 'Sepia'],
  ['gray', 'Grayscale'],
  ['gold', 'Mineshaft gold'],
  ['amoled', 'Amoled black'],
  ['neo', 'Neo red'],
  ['coral', 'Coral'],
]
const QUICK = ['🎥', '❤️', '👍', '🔥', '🏆', '👏', '😂']
const SHORTCUTS = [
  ['⌘K / Ctrl+K', 'Search the conversations and messages'],
  ['Enter', 'Send the message (Shift+Enter: a new line), unless switched under General'],
  ['↑ in an empty box', 'Edit your last message'],
  ['Esc', 'Close a menu, a search or the reply you are writing'],
  ['Double click', 'Your quick reaction on a message'],
  ['Right click', 'The message menu'],
]

function Group({ title, note, children }) {
  return (
    <section className="cset-group">
      <h3>{title}</h3>
      <div className="cset-card">{children}</div>
      {note && <p className="cset-note">{note}</p>}
    </section>
  )
}
function Row({ label, hint, children }) {
  return (
    <div className="cset-row">
      <span className="cset-label">{label}{hint && <small>{hint}</small>}</span>
      {children}
    </div>
  )
}
function Switch({ on, onChange, label }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`chat-switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />
}
function Seg({ value, options, onPick }) {
  return (
    <div className="segmented small">
      {options.map(([v, l]) => (
        <button key={String(v)} type="button" className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPick(v) }}>{l}</button>
      ))}
    </div>
  )
}

/* Calls and messages on this phone or computer with the app closed (Web Push). Per device:
   TML Chat and the app on the same iPhone are two apps, each switched on on its own. */
const PUSH_HINT = {
  on: 'Calls ring and messages show on this device, even with the app closed',
  off: 'Calls ring and messages show on this device, even with the app closed',
  blocked: 'Blocked for this site: allow notifications in the browser or phone settings, then come back',
  homescreen: 'On an iPhone: Share > Add to Home Screen, open the app from there, then switch this on',
  unsupported: 'This browser cannot show notifications',
}
function PushRow({ toast }) {
  const [st, setSt] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { pushStatus().then(setSt).catch(() => setSt('unsupported')) }, [])
  if (!remote) return null
  const flip = async (on) => {
    setBusy(true)
    try {
      if (on) { await enablePush(); toast?.('Notifications are on for this device', 'ok') }
      else { await disablePush(); toast?.('Notifications are off for this device', 'ok') }
      setSt(await pushStatus())
    } catch (e) {
      toast?.(e.message || 'Could not switch notifications.', 'error')
      setSt(await pushStatus().catch(() => 'off'))
    } finally {
      setBusy(false)
    }
  }
  const test = async () => {
    try {
      const r = await testPush()
      toast?.(r?.sent ? 'Sent: it shows in a moment' : 'No device of yours has notifications on yet', r?.sent ? 'ok' : 'error')
    } catch (e) { toast?.(e.message, 'error') }
  }
  const can = st === 'on' || st === 'off'
  return (
    <Row label="Notifications with the app closed" hint={PUSH_HINT[st] || ''}>
      <span className="cset-inline">
        {st === 'on' && <Button size="sm" variant="ghost" onClick={test}>Test</Button>}
        {can && <Switch on={st === 'on'} onChange={(v) => !busy && flip(v)} label="Notifications with the app closed" />}
      </span>
    </Row>
  )
}

export default function ChatSettings({ toast }) {
  const [p, setP] = useState(loadChatPrefs)
  const set = (k, v) => setP(saveChatPrefs({ [k]: v }))
  const size = textSizeOf(p)
  return (
    <div className="cset">
      <Group title="Appearance">
        <div className="cset-themes" role="radiogroup" aria-label="Chat colours">
          {THEMES.map(([id, name]) => (
            <button key={id} type="button" role="radio" aria-checked={p.theme === id} className={`cset-theme ${p.theme === id ? 'on' : ''}`} data-chat-theme={id} onClick={() => set('theme', id)}>
              <span className="cset-theme-pic"><i /><b /></span>
              <span>{name}</span>
            </button>
          ))}
        </div>
        <Row label="Background" hint="Plain is the tinted wallpaper, Pattern adds small dots">
          <Seg value={p.wallpaper === 'none' ? 'soft' : p.wallpaper} onPick={(v) => set('wallpaper', v)} options={[['soft', 'Plain'], ['dots', 'Pattern']]} />
        </Row>
        <div className="cset-row cset-size">
          <span className="cset-label">Text size</span>
          <span className="cset-slider">
            <small>A</small>
            <input type="range" min="0" max={TEXT_SIZES.length - 1} step="1" value={size} onChange={(e) => set('textSize', Number(e.target.value))} aria-label="Text size" />
            <b>A</b>
          </span>
        </div>
        <Row label="Large emoji" hint="One to three emoji alone show large, without a bubble"><Switch on={p.bigEmoji} onChange={(v) => set('bigEmoji', v)} label="Large emoji" /></Row>
        <Row label="Compact spacing"><Switch on={p.density === 'compact'} onChange={(v) => set('density', v ? 'compact' : 'comfortable')} label="Compact spacing" /></Row>
      </Group>

      <Group title="General">
        <Row label="Enter sends the message" hint={p.enterSends ? 'Shift+Enter makes a new line' : 'Enter makes a new line, Cmd/Ctrl+Enter sends'}><Switch on={p.enterSends} onChange={(v) => set('enterSends', v)} label="Enter sends" /></Row>
        <Row label="Check spelling while typing"><Switch on={p.spell} onChange={(v) => set('spell', v)} label="Check spelling" /></Row>
        <Row label="Faces next to messages" hint="In groups and project rooms"><Switch on={p.avatars} onChange={(v) => set('avatars', v)} label="Faces" /></Row>
        <Row label="Send large photos" hint="2560 px instead of 1600 when photos are compressed"><Switch on={p.hdPhotos} onChange={(v) => set('hdPhotos', v)} label="Large photos" /></Row>
      </Group>

      <Group title="Reactions">
        <div className="cset-row cset-quick">
          <span className="cset-label">Quick reaction<small>What a double tap puts on a message</small></span>
          <span className="cset-emojis">{QUICK.map((e) => <button key={e} type="button" className={p.quickReaction === e ? 'on' : ''} onClick={() => set('quickReaction', e)} aria-label={e}>{e}</button>)}</span>
        </div>
        <Row label="Double tap on a message"><Seg value={p.doubleTap} onPick={(v) => set('doubleTap', v)} options={[['react', 'Quick reaction'], ['reply', 'Reply']]} /></Row>
      </Group>

      <Group title="Notifications and sounds">
        <PushRow toast={toast} />
        <Row label="Sound when a message arrives" hint="When someone else writes while you are in another room, page or tab">
          <span className="cset-inline"><Button size="sm" variant="ghost" onClick={chime}>Play</Button><Switch on={p.sound} onChange={(v) => set('sound', v)} label="Sound" /></span>
        </Row>
      </Group>

      <Group title="Chat folders" note="Your own folders are made with the folder button above the list.">
        <Row label="Show folder tags" hint="The folder of each conversation under its name"><Switch on={p.folderTags} onChange={(v) => set('folderTags', v)} label="Folder tags" /></Row>
        <Row label="Folder tabs" hint="On a computer"><Seg value={p.folderTabs} onPick={(v) => set('folderTabs', v)} options={[['top', 'At the top'], ['left', 'On the left']]} /></Row>
      </Group>

      <Group title="Keyboard shortcuts">
        {SHORTCUTS.map(([k, what]) => <div key={k} className="cset-row cset-key"><kbd>{k}</kbd><span>{what}</span></div>)}
      </Group>

      <div className="row-actions">
        <Button variant="ghost" onClick={() => { setP(saveChatPrefs({ ...CHAT_DEFAULTS })); toast?.('Chat settings back to standard', 'ok') }}>Back to standard</Button>
      </div>
    </div>
  )
}
