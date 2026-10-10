import { SUPABASE_KEY, SUPABASE_URL } from './supabaseConfig.js'
import { supabase } from './supabase.js'
import { coordsFromText } from './sun.js'

/* A location's Google Maps link (Alex, 10 Oct): the short link from Google Maps' Share button gives the
   address and the map by itself. The maplink function (supabase/functions/maplink) follows the link and
   looks the place up; without it, a full google.com/maps link still gives its coordinates here. */
export const isMapsLink = (text) => /^https:\/\/(maps\.app\.goo\.gl|goo\.gl|maps\.google\.|(www\.)?google\.[a-z.]+\/maps)/i.test(String(text || '').trim())

export async function readMapLink(url) {
  const local = coordsFromText(url)
  if (!supabase) {
    if (local) return { lat: local.lat, lon: local.lon }
    throw new Error('Reading a Google Maps link needs the online database.')
  }
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Sign in again.')
  let res
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/maplink`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: String(url).trim() }),
    })
  } catch (e) {
    if (local) return { lat: local.lat, lon: local.lon }
    throw new Error(`Could not reach the maplink function (${e.message}).`)
  }
  let out = null
  try { out = await res.json() } catch { /* not JSON */ }
  if (out?.error) throw new Error(out.error)
  if (res.status === 404 || !out) {
    if (local) return { lat: local.lat, lon: local.lon }
    throw new Error('The maplink function is not deployed yet: Supabase > Edge Functions > maplink.')
  }
  return out
}
