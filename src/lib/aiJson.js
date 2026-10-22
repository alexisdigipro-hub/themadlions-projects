/* Reading Claude's JSON answer without falling over (Alex, 22 Oct: the AI breakdown stopped with a JSON error).
   Three things went wrong in practice: an answer cut off at the length limit (long Greek text takes many tokens),
   a raw line break or tab inside a string, and a word or a fence around the JSON. This takes the JSON out, makes
   control characters inside strings legal, and when the end is missing it keeps everything up to the last complete
   item and closes the brackets that were left open. */

export class AiCutShort extends Error {
  constructor() { super('The AI answer was cut short.'); this.name = 'AiCutShort' }
}

// line breaks and other control characters inside strings, written the way JSON allows
function escapeControls(s) {
  let out = ''
  let inStr = false
  let esc = false
  for (const ch of s) {
    if (inStr) {
      if (esc) { esc = false; out += ch; continue }
      if (ch === '\\') { esc = true; out += ch; continue }
      if (ch === '"') { inStr = false; out += ch; continue }
      const code = ch.charCodeAt(0)
      if (code < 0x20) { out += ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : ch === '\t' ? '\\t' : `\\u${code.toString(16).padStart(4, '0')}`; continue }
      out += ch
    } else {
      if (ch === '"') inStr = true
      out += ch
    }
  }
  return out
}

// everything up to the last complete value inside an array or object, with the open brackets closed
function closeCut(s) {
  const stack = []
  let inStr = false
  let esc = false
  let safe = -1
  let safeStack = []
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === '{' || ch === '[') stack.push(ch)
    else if (ch === '}' || ch === ']') {
      stack.pop()
      // a whole object or array just ended: a place we can cut and still have valid JSON
      safe = i + 1
      safeStack = stack.slice()
    }
  }
  if (safe < 0) return null
  let cut = s.slice(0, safe).replace(/,\s*$/, '')
  for (let k = safeStack.length - 1; k >= 0; k--) cut += safeStack[k] === '{' ? '}' : ']'
  return cut
}

export function parseAiJson(text) {
  const clean = String(text || '').replace(/```json|```/g, '').trim()
  const start = clean.indexOf('{')
  if (start < 0) throw new Error('The AI answered without any data. Try again.')
  const body = clean.slice(start)
  const end = body.lastIndexOf('}')
  const tries = [body.slice(0, end + 1), escapeControls(body.slice(0, end + 1))]
  for (const t of tries) { try { return JSON.parse(t) } catch { /* next */ } }
  const repaired = closeCut(escapeControls(body))
  if (repaired) { try { return JSON.parse(repaired) } catch { /* below */ } }
  throw new Error('The AI answer could not be read. Try again, or with less material at a time.')
}
