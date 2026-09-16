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
