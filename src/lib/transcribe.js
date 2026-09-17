/*
  Lyrics from audio with OpenAI Whisper (verbose_json gives timed segments).
  Called from the browser with the key saved in Settings. Files up to 25 MB.
*/
export async function transcribe({ apiKey, file, language = '', prompt = '' }) {
  if (!apiKey) throw new Error('Add your OpenAI API key in Settings first.')
  if (file.size > 25 * 1024 * 1024) throw new Error('Whisper accepts files up to 25 MB. Upload an MP3 version of the song.')
  const fd = new FormData()
  fd.append('file', file, file.name || 'song.mp3')
  fd.append('model', 'whisper-1')
  fd.append('response_format', 'verbose_json')
  fd.append('timestamp_granularities[]', 'segment')
  if (language) fd.append('language', language)
  if (prompt) fd.append('prompt', prompt.slice(0, 800))
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: fd })
  if (!res.ok) {
    let msg = `OpenAI ${res.status}`
    try { msg += `: ${(await res.json()).error?.message || ''}` } catch {}
    throw new Error(msg)
  }
  const data = await res.json()
  const segments = (data.segments || []).map((s) => ({ start: Math.round(s.start * 10) / 10, end: Math.round(s.end * 10) / 10, text: (s.text || '').trim() })).filter((s) => s.text)
  return { text: data.text || '', language: data.language || language, segments }
}

/* Group timed phrases into sections wherever the voice pauses for longer than `gap` seconds. */
export function groupSegments(segments, gap = 1.6, maxLen = 40) {
  const groups = []
  let cur = null
  segments.forEach((s) => {
    if (!cur || s.start - cur.end > gap || s.end - cur.start > maxLen) {
      cur = { start: s.start, end: s.end, lines: [s.text] }
      groups.push(cur)
    } else {
      cur.end = s.end
      cur.lines.push(s.text)
    }
  })
  return groups.map((g) => ({ start: g.start, end: g.end, lyrics: g.lines.join('\n') }))
}

/* Align lyrics the user already has with what Whisper heard: each of the user's blocks gets the time span
   of the heard segments that best match it (fuzzy, by shared words). */
const norm = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2)
export function alignBlocks(blocks, segments) {
  if (!segments.length) return blocks.map(() => null)
  const segWords = segments.map((s) => new Set(norm(s.text)))
  let cursor = 0
  return blocks.map((block) => {
    const words = norm(block)
    if (!words.length) return null
    const need = Math.max(1, Math.round(words.length / 6)) // roughly one segment per 6 words
    let best = null
    for (let i = cursor; i < segments.length; i++) {
      for (let n = need; n <= need + 4 && i + n <= segments.length; n++) {
        const set = new Set()
        for (let k = i; k < i + n; k++) segWords[k].forEach((w) => set.add(w))
        const hit = words.filter((w) => set.has(w)).length / words.length
        if (!best || hit > best.hit + 0.02) best = { i, n, hit }
      }
      if (best && best.hit > 0.6) break
    }
    if (!best || best.hit < 0.25) return null
    cursor = best.i + best.n
    return { start: segments[best.i].start, end: segments[best.i + best.n - 1].end, confidence: best.hit }
  })
}
