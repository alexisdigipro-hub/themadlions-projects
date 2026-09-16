import { uid } from './store.jsx'

/*
  Rule-based breakdown. Works on any plain screenplay text, English or Greek.
  It finds scene headings, INT/EXT, DAY/NIGHT, locations, speaking characters,
  and estimates page length in eighths. The AI pass builds on top of this.
*/

const HEADING_RE =
  /^\s*(?:(\d+[A-Z]?)[\.\)]?\s+)?((?:INT|EXT|INT\.?\s*\/\s*EXT|I\/E|ΕΣΩΤ|ΕΞΩΤ|ΕΣ|ΕΞ|ΕΣΩΤ\.?\s*\/\s*ΕΞΩΤ)\.?)\s*[\-–—:\s]\s*(.+?)\s*$/iu

const TIME_WORDS = [
  ['DAY', /\b(DAY|ΜΕΡΑ|ΗΜΕΡΑ|MORNING|ΠΡΩΙ|AFTERNOON|ΑΠΟΓΕΥΜΑ|ΜΕΣΗΜΕΡΙ)\b/iu],
  ['NIGHT', /\b(NIGHT|ΝΥΧΤΑ|ΒΡΑΔΥ|EVENING)\b/iu],
  ['DAWN', /\b(DAWN|ΞΗΜΕΡΩΜΑ|ΑΥΓΗ|SUNRISE)\b/iu],
  ['DUSK', /\b(DUSK|ΣΟΥΡΟΥΠΟ|SUNSET|ΗΛΙΟΒΑΣΙΛΕΜΑ|MAGIC HOUR)\b/iu],
  ['CONTINUOUS', /\b(CONTINUOUS|ΣΥΝΕΧΕΙΑ|ΣΥΝΕΧΟΜΕΝΟ|LATER|ΑΡΓΟΤΕΡΑ|SAME|MOMENTS LATER)\b/iu],
]

const CHAR_STRIP_RE = /\s*\((V\.?O\.?|O\.?S\.?|O\.?C\.?|CONT'?D|ΣΥΝ\.?|ΣΥΝΕΧΕΙΑ|OFF|ON PHONE|ΤΗΛ\.?|ΦΩΝΗ)\)\s*/giu
const TRANSITION_RE = /^(FADE (IN|OUT)|CUT TO|DISSOLVE TO|SMASH CUT|MATCH CUT|INTERCUT|ΚΟΨΙΜΟ|ΤΕΛΟΣ|THE END|TITLE|ΤΙΤΛΟΣ)/iu

export function isHeading(line) {
  return HEADING_RE.test(line)
}

function normalizeIntExt(raw) {
  const s = raw.toUpperCase().replace(/\./g, '').replace(/\s+/g, '')
  if (s.includes('/')) return 'INT/EXT'
  if (s.startsWith('INT') || s.startsWith('ΕΣ')) return 'INT'
  if (s.startsWith('EXT') || s.startsWith('ΕΞ')) return 'EXT'
  return 'INT'
}

function detectTime(text) {
  for (const [key, re] of TIME_WORDS) if (re.test(text)) return key
  return ''
}

function looksLikeCharacterCue(line, next) {
  const t = line.trim()
  if (!t || t.length > 40) return false
  if (isHeading(t) || TRANSITION_RE.test(t)) return false
  if (!/[A-ZΑ-Ω]/u.test(t)) return false
  // All caps (Latin or Greek), allows digits, dots, spaces, parentheses, apostrophes.
  if (t !== t.toUpperCase()) return false
  if (/^[\d\s\.\-]+$/.test(t)) return false
  const nextTrim = (next || '').trim()
  if (!nextTrim) return false
  if (isHeading(nextTrim)) return false
  return true
}

export function cleanCharacterName(raw) {
  return raw.replace(CHAR_STRIP_RE, ' ').replace(/[\(\)]/g, '').replace(/\s+/g, ' ').trim()
}

export function parseScript(text) {
  const lines = text.replace(/\r/g, '').split('\n')
  const scenes = []
  let current = null
  let preamble = []

  const pushScene = () => {
    if (!current) return
    const body = current.lines.join('\n').trim()
    const chars = []
    for (let i = 0; i < current.lines.length; i++) {
      const l = current.lines[i]
      if (looksLikeCharacterCue(l, current.lines[i + 1])) {
        const name = cleanCharacterName(l)
        if (name && name.length > 1 && !chars.includes(name)) chars.push(name)
      }
    }
    const nonEmpty = current.lines.filter((l) => l.trim()).length
    const eighths = Math.max(1, Math.round((nonEmpty / 52) * 8))
    scenes.push({
      id: uid(),
      number: current.number || String(scenes.length + 1),
      heading: current.heading,
      intExt: current.intExt,
      location: current.location,
      timeOfDay: current.timeOfDay,
      synopsis: firstSentence(body),
      body,
      eighths,
      characters: chars,
      elements: {},
      notes: '',
      dayId: '',
      order: scenes.length,
    })
  }

  for (const line of lines) {
    const m = line.match(HEADING_RE)
    if (m) {
      pushScene()
      const rest = m[3].trim()
      const parts = rest.split(/\s+[\-–—]\s+/)
      const timeOfDay = detectTime(rest)
      let location = parts.length > 1 ? parts.slice(0, -1).join(' - ') : rest
      if (parts.length > 1 && !detectTime(parts[parts.length - 1])) location = rest
      location = location.replace(/\s*[\-–—]\s*(DAY|NIGHT|ΜΕΡΑ|ΝΥΧΤΑ|ΗΜΕΡΑ|ΒΡΑΔΥ|CONTINUOUS|ΣΥΝΕΧΕΙΑ|DAWN|DUSK|LATER|ΑΡΓΟΤΕΡΑ)\b.*$/iu, '').trim()
      current = {
        number: m[1] || '',
        heading: line.trim(),
        intExt: normalizeIntExt(m[2]),
        location,
        timeOfDay,
        lines: [],
      }
    } else if (current) {
      current.lines.push(line)
    } else {
      preamble.push(line)
    }
  }
  pushScene()

  const characters = {}
  for (const s of scenes) for (const c of s.characters) characters[c] = (characters[c] || 0) + 1
  const locations = {}
  for (const s of scenes) if (s.location) locations[s.location] = (locations[s.location] || 0) + 1

  return {
    scenes,
    characters: Object.entries(characters).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    locations: Object.entries(locations).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    preamble: preamble.join('\n').trim(),
    totalEighths: scenes.reduce((a, s) => a + s.eighths, 0),
  }
}

function firstSentence(body) {
  const action = body
    .split('\n')
    .filter((l) => l.trim() && !looksLikeCharacterCue(l, 'x') && !/^\(/.test(l.trim()))
    .join(' ')
    .replace(/\s+/g, ' ')
  const m = action.match(/^(.{20,180}?[\.\!\?;])(\s|$)/)
  return (m ? m[1] : action.slice(0, 160)).trim()
}

export function formatPages(eighths) {
  const whole = Math.floor(eighths / 8)
  const rem = eighths % 8
  if (!whole && !rem) return '0'
  if (!rem) return `${whole}`
  return whole ? `${whole} ${rem}/8` : `${rem}/8`
}

export function stripColor(scene) {
  const ie = scene.intExt || 'INT'
  const night = ['NIGHT', 'DUSK', 'DAWN'].includes(scene.timeOfDay)
  if (ie === 'EXT') return night ? 'strip-ext-night' : 'strip-ext-day'
  if (ie === 'INT/EXT') return night ? 'strip-ext-night' : 'strip-ext-day'
  return night ? 'strip-int-night' : 'strip-int-day'
}
