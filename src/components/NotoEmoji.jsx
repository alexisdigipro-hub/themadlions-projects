import { useState } from 'react'

/* Moving emoji in the chat, like Telegram's (Alex, 11 Oct). Telegram's own set is Telegram's, so these
   are Google's Noto Animated Emoji (free under CC BY 4.0, credited in Settings > Chat), served by
   Google's font CDN. Each emoji tries its file with and without the U+FE0F selector, and anything
   Google does not have shows as the phone's own emoji, so nothing ever disappears. */
const BASE = 'https://fonts.gstatic.com/s/e/notoemoji/latest/'
const codeOf = (e, keepFe0f) => [...e].map((c) => c.codePointAt(0).toString(16)).filter((h) => keepFe0f || h !== 'fe0f').join('_')

export function NotoEmoji({ e, animated = true, className = '' }) {
  const codes = [...new Set([codeOf(e, true), codeOf(e, false)])]
  // still: the light picture first, the moving one only if that is missing
  const files = animated ? ['512.webp'] : ['emoji.svg', '512.webp']
  const urls = files.flatMap((f) => codes.map((c) => `${BASE}${c}/${f}`))
  const [at, setAt] = useState(0)
  if (at >= urls.length) return <span className={`noto-fallback ${className}`}>{e}</span>
  return <img className={`noto-emoji ${className}`} src={urls[at]} alt={e} draggable={false} loading="lazy" decoding="async" onError={() => setAt((n) => n + 1)} />
}

/* A short emoji-only message, one picture per emoji. */
export const emojiParts = (t) => {
  const x = (t || '').replace(/\s+/g, '')
  return typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter().segment(x)].map((s) => s.segment) : [...x]
}
