// THEMADLIONS company site · AI picture for a film (Supabase Edge Function "site-ai", Alex 18 Oct 2026)
//
// Studio > Work > a film > "Clean it with AI": the film's current picture (the YouTube still, a frame, or one uploaded)
// goes to OpenAI's GPT Image 2.5 (Sunburst, the edit model), which takes off text, logos, watermarks and graphic bars,
// rebuilds what was under them and brings the frame to a clean 2K still, keeping the people, framing and light as they
// are. The result is saved in the site's bucket (works/ai-…) and its address goes back to Studio, which shows it before
// Save. Only someone Studio lets in (is_admin) can call it; it writes with the caller's own sign-in.
//
// Secret (Edge Functions > Secrets): OPENAI_API_KEY. Deployed with verify_jwt off (like the hub's other functions, so the
// browser's preflight passes); the is_admin check below needs a real sign-in, so nobody else gets through.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const KEEP = 'Keep everything else exactly as it is: the same people with the same faces, identity, expressions, skin texture and pose, the same clothes, the same location and objects, the same framing, camera angle and composition, the same lighting direction, color temperature and grade. Do not add anything new.'
const CLEAN = `This is a still frame from a film. Remove every piece of text, title, logo, watermark, channel badge, record label mark and graphic overlay, including colored gradient bars or frames laid over the picture, and rebuild what was underneath so it continues the scene naturally. Restore it to a clean, sharp, high resolution film still with natural detail and fine film grain. ${KEEP} The result must look like an untouched frame from the original camera, not an illustration, not a poster. No text, no logos, no watermark.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) return json({ error: 'The AI is not connected yet: OPENAI_API_KEY is missing in Supabase > Edge Functions > Secrets' }, 503)

  const auth = req.headers.get('Authorization') || ''
  const apikey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || ''
  const sb = createClient(Deno.env.get('SUPABASE_URL') || '', apikey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: admin } = await sb.rpc('is_admin')
  if (admin !== true) return json({ error: 'Studio administrators only' }, 403)

  let body: any = {}
  try { body = await req.json() } catch { /* empty */ }
  const src = String(body.src || '')
  if (!/^https:\/\//.test(src)) return json({ error: 'No picture to start from' }, 400)
  const note = String(body.note || '').trim().slice(0, 400)

  // the picture it starts from
  let pic = await fetch(src)
  // a YouTube film without a large still: its normal one
  if (!pic.ok && /\/maxresdefault\.jpg$/.test(src)) pic = await fetch(src.replace('maxresdefault', 'hqdefault'))
  if (!pic.ok) return json({ error: `Could not read the picture (${pic.status})` }, 400)
  const type = pic.headers.get('content-type') || 'image/jpeg'
  const blob = new Blob([await pic.arrayBuffer()], { type })

  const form = new FormData()
  form.append('model', 'gpt-image-2.5-sunburst')
  form.append('quality', 'high')
  form.append('size', '2048x1152')
  form.append('output_format', 'jpeg')
  form.append('output_compression', '90')
  form.append('image[]', blob, type.includes('png') ? 'still.png' : type.includes('webp') ? 'still.webp' : 'still.jpg')
  form.append('prompt', note ? `${CLEAN} Also: ${note}. ${KEEP}` : CLEAN)

  const ai = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form })
  const out = await ai.json().catch(() => ({}))
  if (!ai.ok) return json({ error: `OpenAI: ${out?.error?.message || ai.status}` }, 502)
  const b64 = out?.data?.[0]?.b64_json
  if (!b64) return json({ error: 'OpenAI gave no picture back' }, 502)

  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const path = `works/ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const { error } = await sb.storage.from('site').upload(path, bytes, { contentType: 'image/jpeg' })
  if (error) return json({ error: `Could not save it: ${error.message}` }, 500)
  return json({ url: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/site/${path}` })
})
