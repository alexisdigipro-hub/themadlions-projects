import { uid } from './store.jsx'

/*
  Rule-based breakdown. Works on any plain screenplay text, English or Greek.
  It finds scene headings, INT/EXT, DAY/NIGHT, locations, speaking characters,
  and estimates page length in eighths. The AI pass builds on top of this.
*/

const HEADING_RE =
  /^\s*(?:(\d+[A-Z]?)[\.\)]?\s+)?((?:INT|EXT|INT\.?\s*\/\s*EXT|I\/E|ΕΣΩΤ|ΕΞΩΤ|ΕΣ|ΕΞ|ΕΣΩΤ\.?\s*\/\s*ΕΞΩΤ)\.?)\s*[\-–—:\s]\s*(.+?)\s*$/iu

const B0 = '(?<![\\p{L}\\p{N}])', B1 = '(?![\\p{L}\\p{N}])'
const uw = (words) => new RegExp(B0 + '(' + words + ')' + B1, 'iu')
const TIME_WORDS = [
  ['DAY', uw('DAY|ΜΕΡΑ|ΗΜΕΡΑ|MORNING|ΠΡΩΙ|AFTERNOON|ΑΠΟΓΕΥΜΑ|ΜΕΣΗΜΕΡΙ')],
  ['NIGHT', uw('NIGHT|ΝΥΧΤΑ|ΝΥΧΤΑ|ΒΡΑΔΥ|EVENING')],
  ['DAWN', uw('DAWN|ΞΗΜΕΡΩΜΑ|ΑΥΓΗ|SUNRISE|ΧΑΡΑΜΑΤΑ')],
  ['DUSK', uw('DUSK|ΣΟΥΡΟΥΠΟ|SUNSET|ΗΛΙΟΒΑΣΙΛΕΜΑ|MAGIC HOUR|ΔΕΙΛΙΝΟ')],
  ['CONTINUOUS', uw('CONTINUOUS|ΣΥΝΕΧΕΙΑ|ΣΥΝΕΧΟΜΕΝΟ|LATER|ΑΡΓΟΤΕΡΑ|SAME|MOMENTS LATER|ΛΙΓΟ ΑΡΓΟΤΕΡΑ')],
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

// "ΕΛΕΝΗ: Πού είσαι;" / "Ελένη:" / "ELENI (V.O.):"  -> name before the colon
const COLON_CUE_RE = /^\s*([A-Za-zΑ-Ωα-ωΆ-ώΪΫϊϋΐΰ][A-Za-zΑ-Ωα-ωΆ-ώΪΫϊϋΐΰ'’\.\- ]{0,30}?)(\s*\([^)]{1,20}\))?\s*:\s*(\S.*)?$/u

export function colonCue(line) {
  const m = line.match(COLON_CUE_RE)
  if (!m) return null
  const name = cleanCharacterName(m[1])
  if (!name || name.length < 2 || name.length > 30) return null
  if (isHeading(line) || TRANSITION_RE.test(name)) return null
  if (/^(ΣΗΜ|ΣΗΜΕΙΩΣΗ|NOTE|ΤΙΤΛΟΣ|TITLE|ΜΟΥΣΙΚΗ|MUSIC|ΣΚΗΝΗ|SCENE|ΤΕΛΟΣ|END|ΚΑΜΕΡΑ|CAMERA|ΦΩΝΗ|VOICE|ΗΧΟΣ|SOUND)$/iu.test(name)) return null
  return name.toLocaleUpperCase('el-GR')
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
      let name = ''
      if (looksLikeCharacterCue(l, current.lines[i + 1])) name = cleanCharacterName(l)
      else name = colonCue(l) || ''
      if (name && name.length > 1 && !chars.includes(name)) chars.push(name)
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
      location = location.replace(/\s*[\-–—]\s*(DAY|NIGHT|ΜΕΡΑ|ΝΥΧΤΑ|ΗΜΕΡΑ|ΒΡΑΔΥ|CONTINUOUS|ΣΥΝΕΧΕΙΑ|DAWN|DUSK|LATER|ΑΡΓΟΤΕΡΑ|ΞΗΜΕΡΩΜΑ|ΣΟΥΡΟΥΠΟ|ΑΥΓΗ|ΠΡΩΙ|ΑΠΟΓΕΥΜΑ|ΜΕΣΗΜΕΡΙ|ΔΕΙΛΙΝΟ)(?![\p{L}\p{N}]).*$/iu, '').trim()
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

// Keyword hints: a first pass at elements without AI. English and Greek stems.
const HINTS = [
  ['Props', uw('gun|pistol|rifle|knife|phone|mobile|laptop|bottle|glass|cigarette|letter|envelope|suitcase|bag|keys?|money|cash|camera|radio|flare|map|book|photo|ring|watch|umbrella|όπλ\\p{L}*|πιστόλ\\p{L}*|μαχαίρ\\p{L}*|τηλέφων\\p{L}*|κινητ\\p{L}*|λάπτοπ|μπουκάλ\\p{L}*|ποτήρ\\p{L}*|τσιγάρ\\p{L}*|γράμμα|φάκελ\\p{L}*|βαλίτσ\\p{L}*|τσάντ\\p{L}*|κλειδι\\p{L}*|λεφτά|χρήματα|κάμερ\\p{L}*|ραδιόφων\\p{L}*|χάρτ\\p{L}*|βιβλί\\p{L}*|φωτογραφί\\p{L}*|δαχτυλίδ\\p{L}*|ρολό\\p{L}*|ομπρέλ\\p{L}*')],
  ['Vehicles', uw('car|taxi|truck|van|bus|motorbike|motorcycle|bike|scooter|boat|helicopter|train|SUV|jeep|αυτοκίνητ\\p{L}*|αμάξ\\p{L}*|ταξί|φορτηγ\\p{L}*|βαν|λεωφορεί\\p{L}*|μηχαν[ήη]ς?|μοτοσικλέτ\\p{L}*|ποδήλατ\\p{L}*|σκούτερ|βάρκ\\p{L}*|καΐκ\\p{L}*|ελικόπτερ\\p{L}*|τρέν\\p{L}*|τζιπ')],
  ['Animals', uw('dog|cat|horse|bird|pigeon|goat|sheep|donkey|σκύλ\\p{L}*|σκυλί|γάτ\\p{L}*|άλογ\\p{L}*|πουλ\\p{L}*|περιστέρ\\p{L}*|κατσίκ\\p{L}*|πρόβατ\\p{L}*|γάιδαρ\\p{L}*|γαϊδούρ\\p{L}*')],
  ['Extras', uw('crowd|passers-?by|pedestrians|customers|guests|patrons|waiters?|police(men)?|soldiers|students|audience|κόσμος|πλήθος|περαστικ\\p{L}*|πελάτ\\p{L}*|καλεσμέν\\p{L}*|θαμών\\p{L}*|σερβιτόρ\\p{L}*|αστυνομικ\\p{L}*|στρατιώτ\\p{L}*|μαθητ\\p{L}*|κοινό')],
  ['Special effects', uw('rain|fire|smoke|explosion|fog|snow|wind|sparks|blood|storm|βροχ\\p{L}*|φωτιά|φλόγ\\p{L}*|καπν\\p{L}*|έκρηξ\\p{L}*|ομίχλ\\p{L}*|χιόν\\p{L}*|άνεμ\\p{L}*|αέρας|σπίθ\\p{L}*|αίμα|καταιγίδ\\p{L}*|θάλασσ\\p{L}*')],
  ['Stunts', uw('fight|punch|falls?|crash|chase|shoot(s|ing)?|fires? (the|a) gun|jumps? (off|from)|καβγ\\p{L}*|γροθι\\p{L}*|πέφτ\\p{L}*|πέσιμ\\p{L}*|τρακάρ\\p{L}*|σύγκρουσ\\p{L}*|κυνηγητ\\p{L}*|πυροβολ\\p{L}*|πηδ\\p{L}*')],
  ['Makeup & hair', uw('wound|scar|bruise|bleeding|blood|tattoo|beard|wig|τραύμα|πληγ\\p{L}*|ουλ\\p{L}*|μελανι\\p{L}*|αιμορραγ\\p{L}*|τατουάζ|γενειάδ\\p{L}*|μούσι|περούκ\\p{L}*')],
  ['Wardrobe', uw('uniform|suit|wedding dress|costume|coat|jacket|helmet|mask|hoodie|soaked|wet clothes|στολ[ήη]\\p{L}*|κοστούμ\\p{L}*|νυφικ\\p{L}*|παλτ\\p{L}*|μπουφάν|κράνος|μάσκ\\p{L}*|φούτερ|μουσκεμέν\\p{L}*|βρεγμέν\\p{L}*')],
  ['Sound', uw('radio|music|song|playback|siren|phone rings?|thunder|ραδιόφων\\p{L}*|μουσικ\\p{L}*|τραγούδ\\p{L}*|σειρήν\\p{L}*|χτυπάει το (τηλέφωνο|κινητό)|βροντ\\p{L}*')],
  ['Camera & grip', uw('drone|slow motion|aerial|underwater|handheld|steadicam|pov|ντρόουν|αργή κίνηση|εναέρι\\p{L}*|υποβρύχι\\p{L}*')],
]
export function keywordHints(body) {
  const out = {}
  for (const [cat, re] of HINTS) {
    const found = new Set()
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
    let m
    while ((m = g.exec(body)) && found.size < 8) found.add(m[0].trim().toLowerCase())
    if (found.size) out[cat] = [...found]
  }
  return out
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
