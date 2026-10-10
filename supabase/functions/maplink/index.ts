// THEMADLIONS Projects · Google Maps link reader (Supabase Edge Function "maplink")
//
// Alex (10 Oct): paste a location's Google Maps link (the short one the Share button gives,
// https://maps.app.goo.gl/…) and the address and the map fill in by themselves. A short link holds
// nothing but a redirect, and the page may not follow it itself (no CORS), so this follows it, reads
// the place's name and coordinates from the full Google Maps address it lands on, and asks
// OpenStreetMap (Nominatim, free, no key) for the street address and the area at those coordinates.
//
// Deploy: Supabase > Edge Functions > Deploy a new function > via Editor, name "maplink", paste this
// file, Deploy. No secrets. Only signed-in members may call it, and only Google Maps addresses are
// followed, so it cannot be used to reach anything else.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const GOOGLE = /^(maps\.app\.goo\.gl|goo\.gl|g\.co|maps\.google\.[a-z.]+|(www\.)?google\.[a-z.]+|consent\.google\.[a-z.]+)$/i
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const UA = 'THEMADLIONS Projects (https://alexisdigipro-hub.github.io/themadlions-projects/)'

function googleUrl(raw: string) {
  let u: URL
  try { u = new URL(String(raw).trim()) } catch { throw new Error('That does not look like a web address.') }
  if (u.protocol !== 'https:' || !GOOGLE.test(u.hostname)) throw new Error('Paste a Google Maps link (maps.app.goo.gl or google.com/maps).')
  return u
}

/* Follow the short link one hop at a time, so every hop is checked to stay on Google. In Europe Google
   may stop at its cookie page first; the real address is then in its "continue" parameter. */
async function resolve(start: URL) {
  let u = start
  for (let i = 0; i < 6; i++) {
    if (/^consent\./i.test(u.hostname) && u.searchParams.get('continue')) { u = googleUrl(u.searchParams.get('continue')!); continue }
    if (/\/maps/.test(u.pathname) && !/^maps\.app\.goo\.gl$/i.test(u.hostname)) return u
    const res = await fetch(u, { redirect: 'manual', headers: { 'User-Agent': UA } })
    const next = res.headers.get('location')
    if (!next) return u
    u = googleUrl(new URL(next, u).toString())
  }
  return u
}

const num = (x: string | null | undefined) => (x == null || x === '' ? null : Number(x))
function readPlace(u: URL) {
  const href = decodeURIComponent(u.toString())
  const name = (u.pathname.match(/\/maps\/place\/([^/]+)/) || [])[1]
  let m = href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || href.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  const q = u.searchParams.get('q') || u.searchParams.get('query') || ''
  if (!m) m = q.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/)
  return {
    name: name ? decodeURIComponent(name.replace(/\+/g, ' ')) : '',
    lat: m ? num(m[1]) : null,
    lon: m ? num(m[2]) : null,
    text: q && !/^\s*-?\d+\.\d+\s*,/.test(q) ? q.replace(/\+/g, ' ') : '',
  }
}

/* "Karaoli ke Dimitriou 9, Vironas 162 32", the way the app writes addresses (its cards show the area) */
function addressOf(a: any) {
  const street = [a.road || a.pedestrian || a.footway, a.house_number].filter(Boolean).join(' ')
  const area = a.suburb || a.city_district || a.neighbourhood || a.quarter || a.village || a.town || a.municipality || a.city || ''
  return { address: [street, [area, a.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', '), area }
}
async function nominatim(path: string) {
  const res = await fetch(`https://nominatim.openstreetmap.org/${path}`, { headers: { 'User-Agent': UA, 'Accept-Language': 'el,en' } })
  return res.ok ? res.json() : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const auth = req.headers.get('Authorization') || ''
  const apikey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || ''
  const db = createClient(Deno.env.get('SUPABASE_URL') || '', apikey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: userData } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ''))
  if (!userData?.user?.id) return json({ error: 'Not signed in.' }, 401)

  try {
    const body = await req.json().catch(() => ({}))
    const final = await resolve(googleUrl(body.url || ''))
    const place = readPlace(final)
    let { lat, lon } = place
    let found: any = null
    if (lat != null && lon != null) {
      found = await nominatim(`reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lon}`)
    } else if (place.text || place.name) {
      const hits = await nominatim(`search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(place.text || place.name)}`)
      found = Array.isArray(hits) ? hits[0] : null
      if (found) { lat = num(found.lat); lon = num(found.lon) }
    }
    if (lat == null && !found) return json({ error: 'Could not find the place in that link. Open it in Google Maps, press Share and copy the link again.' }, 422)
    const { address, area } = found?.address ? addressOf(found.address) : { address: place.text, area: '' }
    return json({ ok: true, url: final.toString(), name: place.name, lat, lon, address: address || place.text, area })
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, 400)
  }
})
