import { useState } from 'react'
import { Button } from './ui.jsx'
import { CHAT_DEFAULTS, chime, loadChatPrefs, saveChatPrefs } from '../lib/chatPrefs.js'

/* Settings > Chat: personal, per device, like theme and text size. A plain div around each row,
   not the Field label: a label re-dispatches a click to its first button in some browsers, which
   snapped the choice back to the first option. */
function ChatRow({ label, hint, children }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}
function ChatSeg({ value, options, onPick }) {
  return (
    <div className="segmented small">
      {options.map(([v, l]) => (
        <button key={String(v)} type="button" className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPick(v) }}>{l}</button>
      ))}
    </div>
  )
}
export default function ChatSettings({ toast }) {
  const [p, setP] = useState(loadChatPrefs)
  const set = (k, v) => setP(saveChatPrefs({ [k]: v }))
  return (
    <div className="stack">
      {/* The chat looks like Telegram on the phone and the computer, so the bubble style choice is gone;
          the old None background shows as Plain (Telegram always has its tinted wallpaper). */}
      <ChatRow label="Background behind the messages" hint="Plain is Telegram's tinted wallpaper in your accent colour. Pattern adds small dots."><ChatSeg value={p.wallpaper === 'none' ? 'soft' : p.wallpaper} onPick={(v) => set('wallpaper', v)} options={[['soft', 'Plain'], ['dots', 'Pattern']]} /></ChatRow>
      <ChatRow label="Text size in messages"><ChatSeg value={p.size} onPick={(v) => set('size', v)} options={[['small', 'Small'], ['normal', 'Normal'], ['large', 'Large']]} /></ChatRow>
      <ChatRow label="Spacing"><ChatSeg value={p.density} onPick={(v) => set('density', v)} options={[['comfortable', 'Comfortable'], ['compact', 'Compact']]} /></ChatRow>
      <ChatRow label="Enter key" hint="With Send, Shift+Enter makes a new line. With New line, Cmd+Enter (Ctrl+Enter on Windows) sends."><ChatSeg value={p.enterSends} onPick={(v) => set('enterSends', v)} options={[[true, 'Sends the message'], [false, 'New line']]} /></ChatRow>
      <ChatRow label="Faces next to messages in groups and rooms"><ChatSeg value={p.avatars} onPick={(v) => set('avatars', v)} options={[[true, 'Show'], [false, 'Hide']]} /></ChatRow>
      <ChatRow label="Sound when a message arrives" hint="Plays when someone else writes while you are in another room, page or tab. Never for your own messages.">
        <div className="row-actions">
          <ChatSeg value={p.sound} onPick={(v) => set('sound', v)} options={[[true, 'On'], [false, 'Off']]} />
          <Button size="sm" variant="ghost" onClick={chime}>Play it</Button>
        </div>
      </ChatRow>
      <div className="row-actions">
        <Button variant="ghost" onClick={() => { setP(saveChatPrefs({ ...CHAT_DEFAULTS })); toast('Chat settings back to standard', 'ok') }}>Back to standard</Button>
      </div>
    </div>
  )
}
