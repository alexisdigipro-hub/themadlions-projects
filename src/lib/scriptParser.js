// Rule-based screenplay parsing. Works on plain text from TXT, PDF or DOCX.
// Handles English (INT./EXT.) and Greek (ΕΣΩΤ./ΕΞΩΤ.) formatting.

const SLUG_RE = /^(?:\d+[A-Z]?[.)]?\s+)?(INT\.?\/EXT\.?|EXT\.?\/INT\.?|I\/E\.?|INT\.?|EXT\.?|EST\.?|ΕΣΩΤ\.?\/ΕΞΩΤ\.?|ΕΞΩΤ\.?\/ΕΣΩΤ\.?|ΕΣΩΤ\.?|ΕΞΩΤ\.?|ΕΣ\.\s?\/\s?ΕΞ\.?|ΕΣ\.|ΕΞ\.)\s*[-–—.:]?\s*(.+)$/i
const TRANSITION_RE = /^(CUT TO|FADE (IN|OUT|TO)|DISSOLVE TO|SMASH CUT|MATCH CUT|INTERCUT|TITLE|SUPER|ΚΟΨΙΜΟ|ΣΒΗΣΙΜΟ|ΤΙΤΛΟΣ|ΤΕΛΟΣ|THE END|END)\b/i
const TIME_WORDS = ['DAY', 'NIGHT', 'DAWN', 'DUSK', 'MORNING', 'EVENING', 'AFTERNOON', 'LATER', 'CONTINUOUS', 'SAME', 'MOMENTS LATER', 'SUNSET', 'SUNRISE', 'MAGIC HOUR',
  'ΜΕΡΑ', 'ΗΜΕΡΑ', 'ΝΥΧΤΑ', 'ΝΥΧΤΑ', 'ΑΥΓΗ', 'ΣΟΥΡΟΥΠΟ', 'ΠΡΩΙ', 'ΒΡΑΔΥ', 'ΑΠΟΓΕΥΜΑ', 'ΜΕΣΗΜΕΡΙ', 'ΑΡΓΟΤΕΡΑ', 'ΣΥΝΕΧΕΙΑ', 'ΞΗΜΕΡΩΜΑ', 'ΗΛΙΟΒΑΣΙΛΕΜΑ']

const upper = s => s.toLocaleUpperCase('el-GR')
const isUpperLine = s => {
  const letters = s.replace(/[^A-Za-zΑ-Ωα-ωΆ-Ώά-ώ]/g, '')
  return letters.length >= 2 && letters === upper(letters)
}

export function normalizeTime(t) {
  const u = upper(t || '').trim()
  if (!u) return ''
  if (/(NIGHT|ΝΥΧΤΑ|ΒΡΑΔΥ)/.test(u)) return 'Night'
  if (/(DAWN|SUNRISE|ΑΥΓΗ|ΞΗΜΕΡΩΜΑ)/.test(u)) return 'Dawn'
  if (/(DUSK|SUNSET|MAGIC|ΣΟΥΡΟΥΠΟ|ΗΛΙΟΒΑΣΙΛΕΜΑ)/.test(u)) return 'Dusk'
  if (/(DAY|MORNING|AFTERNOON|ΜΕΡΑ|ΗΜΕΡΑ|ΠΡΩΙ|ΑΠΟΓΕΥΜΑ|ΜΕΣΗΜΕΡΙ)/.test(u)) return 'Day'
  if (/(CONTINUOUS|SAME|LATER|ΣΥΝΕΧΕΙΑ|ΑΡΓΟΤΕΡΑ)/.test(u)) return 'Continuous'
  return t.trim()
}

export function normalizeIntExt(p) {
  const u = upper(p).replace(/\./g, '')
  if (u.includes('/')) return 'INT/EXT'
  if (u.startsWith('INT') || u.startsWith('ΕΣ')) return 'INT'
  if (u.startsWith('EXT') || u.startsWith('ΕΞ')) return 'EXT'
  return 'INT'
}

export function parseSlugline(line) {
  const m = line.trim().match(SLUG_RE)
  if (!m) return null
  const intExt = normalizeIntExt(m[1])
  let rest = m[2].trim()
  let time = ''
  // time of day sits after the last dash
  const parts = rest.split(/\s+[-–—]\s+/)
  if (parts.length > 1) {
    const last = parts[parts.length - 1]
    if (TIME_WORDS.some(w => upper(last).includes(w))) {
      time = normalizeTime(last)
      rest = parts.slice(0, -1).join(' - ')
    }
  } else {
    // "INT. KITCHEN DAY" without dash
    const words = rest.split(/\s+/)
    const lastWord = words[words.length - 1]
    if (TIME_WORDS.includes(upper(lastWord).replace(/[.,]/g, ''))) {
      time = normalizeTime(lastWord)
      rest = words.slice(0, -1).join(' ')
    }
  }
  return { intExt, location: rest.replace(/[.,]+$/, '').trim(), timeOfDay: time }
}

// Split raw script into scene blocks.
export function parseScript(text) {
  const lines = (text || '').replace(/\r/g, '').split('\n').map(l => l.replace(/\t/g, '  ').trimEnd())
  const scenes = []
  let current = null
  let preamble = []
  const push = () => { if (current) scenes.push(current) }

  lines.forEach((raw, idx) => {
    const line = raw.trim()
    const slug = line && isUpperLine(line.slice(0, 6)) ? parseSlugline(line) : null
    if (slug) {
      push()
      current = { slugline: line.replace(/^\d+[A-Z]?[.)]?\s+/, ''), ...slug, lines: [], startLine: idx }
      return
    }
    if (current) current.lines.push(raw); else preamble.push(raw)
  })
  push()

  let n = 0
  const out = scenes.map(sc => {
    n += 1
    const body = sc.lines
    const characters = extractCharacters(body)
    const contentLines = body.filter(l => l.trim()).length
    const eighths = Math.max(1, Math.round((contentLines + 1) / 55 * 8))
    const synopsis = firstAction(body)
    return {
      number: String(n),
      slugline: sc.slugline,
      intExt: sc.intExt,
      timeOfDay: sc.timeOfDay,
      location: sc.location,
      characters,
      eighths,
      synopsis,
      text: body.join('\n').trim(),
    }
  })
  return { scenes: out, preamble: preamble.join('\n').trim(), totalEighths: out.reduce((a, s) => a + s.eighths, 0) }
}

export function extractCharacters(lines) {
  const found = []
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim()
    if (!l || l.length > 45) continue
    if (!isUpperLine(l)) continue
    if (TRANSITION_RE.test(l) || parseSlugline(l)) continue
    if (/[:]$/.test(l)) continue
    const next = (lines[i + 1] || '').trim()
    if (!next || next === '') continue           // dialogue must follow
    const name = l.replace(/\s*\((V\.?O\.?|O\.?S\.?|O\.?C\.?|CONT'?D|ΣΥΝ\.?|ΦΩΝΗ|OFF)\)\s*$/i, '').replace(/\s*\(.*\)\s*$/, '').trim()
    if (name.length < 2 || /^\d+$/.test(name)) continue
    if (!found.includes(name)) found.push(name)
  }
  return found
}

function firstAction(lines) {
  const l = lines.map(x => x.trim()).find(x => x && !isUpperLine(x) && !x.startsWith('('))
  return l ? l.slice(0, 160) : ''
}

export const stripColor = (intExt, timeOfDay) => {
  const night = /night|dusk/i.test(timeOfDay || '')
  if (intExt === 'EXT') return night ? 'var(--color-strip-extnight)' : 'var(--color-strip-extday)'
  return night ? 'var(--color-strip-intnight)' : 'var(--color-strip-intday)'
}
