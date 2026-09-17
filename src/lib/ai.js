import { ELEMENT_CATEGORIES } from './store.jsx'

/*
  Phase 1: the key lives only in this browser (Settings) and requests go
  straight to the Anthropic API with the browser-access header.
  Phase 2: replace `callClaude` with a fetch to a Supabase Edge Function
  so the key never leaves the server.
*/

const SYSTEM = `You are a film production script breakdown assistant working for a Greek production company. You read screenplay scenes (English or Greek) and return a production breakdown as strict JSON. Never invent elements that are not in the text. Keep item names short (1-4 words) and in the language of the script. Return JSON only, no markdown fences, no commentary.`

function buildPrompt(scenes) {
  const cats = ELEMENT_CATEGORIES.filter((c) => c !== 'Notes').map((c) => `"${c}"`).join(', ')
  const payload = scenes.map((s) => ({ id: s.id, number: s.number, heading: s.heading, text: s.body.slice(0, 6000) }))
  return `Break down each scene below for scheduling and departments.

For each scene return:
- "id": same id as input
- "int_ext": "INT" | "EXT" | "INT/EXT"
- "location": the set/location name from the heading
- "time_of_day": "DAY" | "NIGHT" | "DAWN" | "DUSK" | "CONTINUOUS" | ""
- "synopsis": one sentence, max 25 words, same language as the script
- "characters": speaking characters, uppercase names exactly as written
- "elements": object whose keys are only from [${cats}] and values are arrays of short strings found in the scene. Only include keys that have items. "Cast" must list non-speaking named characters; "Extras" for crowds/background.
- "eighths": integer estimate of page length in eighths of a page (1 page = 8)
- "flags": array of short scheduling notes (e.g. "night exterior", "child actor", "water", "weapon", "vehicle stunt") or []

Return exactly: {"scenes":[...]}

SCENES:
${JSON.stringify(payload)}`
}

async function callClaude({ apiKey, model, prompt }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    let detail = ''
    try {
      detail = (await res.json())?.error?.message || ''
    } catch {}
    throw new Error(`Claude API ${res.status}${detail ? `: ${detail}` : ''}`)
  }
  const data = await res.json()
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
  const clean = text.replace(/```json|```/g, '').trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  return JSON.parse(clean.slice(start, end + 1))
}

/**
 * Runs the AI breakdown over all scenes in batches.
 * onProgress(done, total) is called after each batch.
 * Returns a map sceneId -> enrichment.
 */
export async function aiBreakdown({ scenes, settings, onProgress }) {
  if (!settings.aiKey) throw new Error('Add your Anthropic API key in Settings first.')
  const model = settings.aiModel || 'claude-sonnet-4-6'
  const BATCH = 6
  const out = {}
  for (let i = 0; i < scenes.length; i += BATCH) {
    const batch = scenes.slice(i, i + BATCH)
    const json = await callClaude({ apiKey: settings.aiKey, model, prompt: buildPrompt(batch) })
    for (const s of json.scenes || []) {
      if (!s.id) continue
      out[s.id] = {
        intExt: ['INT', 'EXT', 'INT/EXT'].includes(s.int_ext) ? s.int_ext : undefined,
        location: typeof s.location === 'string' ? s.location : undefined,
        timeOfDay: typeof s.time_of_day === 'string' ? s.time_of_day.toUpperCase() : undefined,
        synopsis: typeof s.synopsis === 'string' ? s.synopsis : undefined,
        characters: Array.isArray(s.characters) ? s.characters.map(String) : undefined,
        elements: sanitizeElements(s.elements),
        eighths: Number.isFinite(s.eighths) ? Math.max(1, Math.round(s.eighths)) : undefined,
        flags: Array.isArray(s.flags) ? s.flags.map(String) : [],
      }
    }
    onProgress?.(Math.min(i + BATCH, scenes.length), scenes.length)
  }
  return out
}

function sanitizeElements(obj) {
  if (!obj || typeof obj !== 'object') return {}
  const res = {}
  for (const cat of ELEMENT_CATEGORIES) {
    const v = obj[cat]
    if (Array.isArray(v) && v.length) res[cat] = [...new Set(v.map((x) => String(x).trim()).filter(Boolean))]
  }
  return res
}

export async function testKey(settings) {
  const model = settings.aiModel || 'claude-sonnet-4-6'
  const json = await callClaude({ apiKey: settings.aiKey, model, prompt: 'Reply with exactly {"ok":true}' })
  return json.ok === true
}

/* ---------- treatments, concepts and moodboards ---------- */

const DOC_SYSTEM = `You are a line producer and first assistant director at a Greek production company. You read treatments, concepts, director's notes and moodboards (text, PDF pages, images) for music videos, commercials and films, and turn them into a shootable production breakdown as strict JSON. Group what must be shot into setups (a setup = one location and time of day, one continuous shooting situation). Be concrete and practical. Do not invent things that are not in the material, but do name what the images clearly show (wardrobe, props, lighting, locations). Keep item names short (1-4 words), in the language of the document (Greek stays Greek), character and talent names in uppercase. Return JSON only, no markdown fences, no commentary.`

function docPrompt({ category, notes, wantShots }) {
  const cats = ELEMENT_CATEGORIES.filter((c) => c !== 'Notes').map((c) => `"${c}"`).join(', ')
  return `Project type: ${category}.${notes ? `\nProducer notes: ${notes}` : ''}

Read everything attached (text and images) and return exactly this JSON:
{
  "title": "short working title",
  "summary": "2-3 sentences: what this piece is and how it feels",
  "setups": [
    {
      "number": "1",
      "heading": "LOCATION · TIME · WHAT HAPPENS (max 8 words, uppercase)",
      "int_ext": "INT" | "EXT" | "INT/EXT",
      "location": "location or set as described",
      "time_of_day": "DAY" | "NIGHT" | "DAWN" | "DUSK" | "",
      "synopsis": "one sentence, max 25 words",
      "description": "what we see and what must happen on set, 2-5 sentences",
      "look": "lighting, colour, camera and mood references, 1-3 sentences",
      "duration_hint": "estimated shooting time, e.g. '3 hours', 'half day', '1 day'",
      "characters": ["ARTIST", "GIRL"],
      "elements": { "Cast": [], "Extras": [], "Props": [], "Set dressing": [], "Wardrobe": [], "Makeup & hair": [], "Vehicles": [], "Animals": [], "Stunts": [], "Special effects": [], "VFX": [], "Sound": [], "Camera & grip": [], "Special equipment": [] },
      "flags": ["night exterior", "water", "drone permit", "minors", "crowd"]${wantShots ? `,
      "shots": [{ "size": "WS|MS|CU|ECU|OTS|POV|Insert|Establishing", "movement": "Static|Handheld|Steadicam|Dolly|Drone|Crane|Push in|Pull out|Pan|Tilt", "description": "one sentence" }]` : ''}
    }
  ],
  "locations": [{ "name": "", "notes": "what it needs to have / look like" }],
  "talent": [{ "role": "", "count": 1, "notes": "age, look, skills" }],
  "notes": ["anything a producer should know: permits, safety, weather, playback, art builds, VFX"]
}
Rules: elements keys only from [${cats}], include only keys with items. Number setups in shooting-logical order. If the material is a moodboard with little text, describe each board as references inside "look" and group them into setups by location or scene. Aim for 3 to 20 setups.`
}

const fileToBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader()
  r.onload = () => res(String(r.result).split(',')[1])
  r.onerror = () => rej(new Error(`Could not read ${file.name}`))
  r.readAsDataURL(file)
})

async function imageBlock(file) {
  // shrink big images so the request stays small and cheap
  const { compress } = await import('./photos.js')
  const c = await compress(file, { max: 1568, quality: 0.8, thumb: 64 })
  const b64 = await fileToBase64(new File([c.blob], file.name, { type: 'image/jpeg' }))
  return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } }
}

/**
 * Breaks down a treatment, concept or moodboard.
 * text: optional prose; files: PDF and/or images. Returns { title, summary, setups: [...], locations, talent, notes }.
 */
export async function aiDocumentBreakdown({ settings, category, text, files = [], notes = '', wantShots = false, onProgress }) {
  if (!settings.aiKey) throw new Error('Add your Anthropic API key in Settings first.')
  const model = settings.aiModel || 'claude-sonnet-4-6'
  const content = []
  if (text?.trim()) content.push({ type: 'text', text: `DOCUMENT TEXT:\n${text.slice(0, 120000)}` })
  let n = 0
  for (const f of files) {
    onProgress?.(`Reading ${f.name}…`)
    const name = f.name.toLowerCase()
    if (name.endsWith('.pdf')) {
      if (f.size > 30 * 1024 * 1024) throw new Error(`${f.name} is over 30 MB. Export a smaller PDF.`)
      content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: await fileToBase64(f) }, title: f.name })
    } else if (f.type.startsWith('image/') || /\.(heic|heif)$/i.test(name)) {
      content.push(await imageBlock(f))
      n += 1
      if (n >= 60) break
    } else if (name.endsWith('.txt') || name.endsWith('.md')) {
      content.push({ type: 'text', text: `FILE ${f.name}:\n${(await f.text()).slice(0, 60000)}` })
    } else if (name.endsWith('.docx')) {
      const { extractText } = await import('./scriptImport.js')
      const r = await extractText(f)
      content.push({ type: 'text', text: `FILE ${f.name}:\n${r.text.slice(0, 60000)}` })
    }
  }
  if (!content.length) throw new Error('Add some text, a PDF or images first.')
  content.push({ type: 'text', text: docPrompt({ category, notes, wantShots }) })
  onProgress?.('Claude is reading the material…')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': settings.aiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, max_tokens: 12000, system: DOC_SYSTEM, messages: [{ role: 'user', content }] }),
  })
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json())?.error?.message || '' } catch {}
    throw new Error(`Claude API ${res.status}${detail ? `: ${detail}` : ''}`)
  }
  const data = await res.json()
  const txt = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
  const clean = txt.replace(/```json|```/g, '').trim()
  const json = JSON.parse(clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1))
  const setups = (json.setups || []).map((s, i) => ({
    number: String(s.number || i + 1),
    heading: String(s.heading || `SETUP ${i + 1}`).toUpperCase(),
    intExt: ['INT', 'EXT', 'INT/EXT'].includes(s.int_ext) ? s.int_ext : 'EXT',
    location: String(s.location || ''),
    timeOfDay: typeof s.time_of_day === 'string' ? s.time_of_day.toUpperCase() : '',
    synopsis: String(s.synopsis || ''),
    body: [s.description, s.look ? `LOOK: ${s.look}` : '', s.duration_hint ? `EST. TIME: ${s.duration_hint}` : ''].filter(Boolean).join('\n\n'),
    look: String(s.look || ''),
    durationHint: String(s.duration_hint || ''),
    characters: Array.isArray(s.characters) ? [...new Set(s.characters.map((c) => String(c).toUpperCase()))] : [],
    elements: sanitizeElements(s.elements),
    flags: Array.isArray(s.flags) ? s.flags.map(String) : [],
    shots: Array.isArray(s.shots) ? s.shots.map((sh) => ({ size: String(sh.size || 'MS'), movement: String(sh.movement || 'Static'), description: String(sh.description || '') })) : [],
  }))
  return {
    title: String(json.title || ''),
    summary: String(json.summary || ''),
    setups,
    locations: Array.isArray(json.locations) ? json.locations.map((l) => ({ name: String(l.name || ''), notes: String(l.notes || '') })).filter((l) => l.name) : [],
    talent: Array.isArray(json.talent) ? json.talent.map((t) => ({ role: String(t.role || ''), count: Number(t.count) || 1, notes: String(t.notes || '') })).filter((t) => t.role) : [],
    notes: Array.isArray(json.notes) ? json.notes.map(String) : [],
  }
}
