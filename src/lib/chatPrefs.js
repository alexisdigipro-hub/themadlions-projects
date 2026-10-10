// How the chat looks and behaves for this person, on this device (like theme and text size):
// Settings > Chat. Kept in localStorage; the chat page listens for changes.
export const CHAT_PREFS_KEY = 'tml_chat_prefs'
export const CHAT_DEFAULTS = {
  wallpaper: 'none', // 'none' | 'soft' | 'dots'
  bubbles: 'whatsapp', // 'whatsapp' (top tails, own bubbles tinted) | 'telegram' (bottom tails, Telegram colours) | 'classic' (round, own bubbles in the accent)
  size: 'normal', // 'small' | 'normal' | 'large'
  density: 'comfortable', // 'comfortable' | 'compact'
  enterSends: true, // Enter sends, Shift+Enter breaks the line; off: Enter breaks, Cmd/Ctrl+Enter sends
  avatars: true, // faces next to other people's messages in groups and rooms
  sound: true, // a short tone when a message arrives from someone else while you are elsewhere
  // Telegram's settings (Alex, 8 Oct)
  theme: 'accent', // chat colours: 'accent' (the app's accent) | 'blue' | 'sepia' | 'gray' | 'gold' | 'amoled' | 'neo' | 'coral' | 'glass' (Glass dark, TML Chat's own from 9 Oct)
  textSize: null, // 0..4 on the slider; null = from the old size above
  bigEmoji: true, // a message of one to three emoji shows large, without a bubble
  animatedEmoji: true, // Google's moving Noto emoji for large emoji and in the emoji panel, like Telegram's (11 Oct)
  spell: true, // check spelling while typing
  hdPhotos: false, // send photos at 2560 px instead of 1600 when compressing
  quickReaction: '🎥', // what a double tap puts on a message
  doubleTap: 'react', // 'react' | 'reply'
  folderTags: false, // folder names under each conversation in the list
  folderTabs: 'top', // 'top' | 'left' (computer)
}
export const TEXT_SIZES = [13.5, 14.5, 15.5, 17, 18.5]
export const textSizeOf = (p) => (Number.isInteger(p.textSize) ? p.textSize : p.size === 'small' ? 1 : p.size === 'large' ? 3 : 2)
export function loadChatPrefs() {
  try {
    const raw = localStorage.getItem(CHAT_PREFS_KEY)
    return { ...CHAT_DEFAULTS, ...(raw ? JSON.parse(raw) : {}) }
  } catch {
    return { ...CHAT_DEFAULTS }
  }
}
export function saveChatPrefs(patch) {
  const next = { ...loadChatPrefs(), ...patch }
  try { localStorage.setItem(CHAT_PREFS_KEY, JSON.stringify(next)) } catch {}
  window.dispatchEvent(new Event('tml-chat-prefs'))
  return next
}

/* A short, soft two-note tone, made on the spot so no sound file is needed. Silent when the
   browser has not yet allowed audio (before the first click) or the tone cannot play. */
let ctx = null
export function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    ctx = ctx || new Ctx()
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    const t0 = ctx.currentTime
    ;[[880, 0], [1174.7, 0.12]].forEach(([freq, at]) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = freq
      g.gain.setValueAtTime(0.0001, t0 + at)
      g.gain.exponentialRampToValueAtTime(0.18, t0 + at + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.22)
      o.connect(g).connect(ctx.destination)
      o.start(t0 + at)
      o.stop(t0 + at + 0.25)
    })
  } catch {}
}

/* Conversations whose sound is off on this device (the room's ⋯ menu > Mute). */
const MUTED_KEY = 'tml_chat_muted'
export function loadMuted() {
  try { return JSON.parse(localStorage.getItem(MUTED_KEY) || '[]') } catch { return [] }
}
export function toggleMuted(roomId) {
  const list = loadMuted()
  const next = list.includes(roomId) ? list.filter((x) => x !== roomId) : [...list, roomId]
  try { localStorage.setItem(MUTED_KEY, JSON.stringify(next)) } catch {}
  window.dispatchEvent(new Event('tml-chat-prefs'))
  return next
}

/* The tone for a message that just arrived, unless its room is the one on screen (and the page is
   in front) or its room is muted. Used by the app and by the chat's own window. */
export function chimeFor(fresh, openRoom) {
  if (!loadChatPrefs().sound) return
  const muted = loadMuted()
  if (fresh.some((m) => !muted.includes(m.chatId || 'team') && (document.hidden || (m.chatId || 'team') !== openRoom))) chime()
}
