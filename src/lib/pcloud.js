// Files in Alex's pCloud through the "pcloud" Edge Function (supabase/functions/pcloud/index.ts).
// The browser never holds a pCloud token: it sends the file and the member's own Supabase
// session to the function, which checks the same permissions the database enforces.
import { supabase } from './supabase.js'
import { SUPABASE_KEY, SUPABASE_URL } from './supabaseConfig.js'

/* Settings > Integrations > File storage. Off means the built-in Supabase bucket, as before. */
export const pcloudOn = (settings) => settings?.storage === 'pcloud'

async function call(action, body) {
  if (!supabase) throw new Error('pCloud needs the online database.')
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Sign in again to upload.')
  const form = body instanceof FormData
  if (form) body.set('action', action)
  let res
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/pcloud`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY, ...(form ? {} : { 'Content-Type': 'application/json' }) },
      body: form ? body : JSON.stringify({ action, ...body }),
    })
  } catch (e) {
    throw new Error(`Could not reach the pCloud function (${e.message}).`)
  }
  let out = null
  try { out = await res.json() } catch {}
  if (!res.ok || !out || out.error) {
    if (res.status === 404) throw new Error('The pCloud function is not deployed yet: Supabase > Edge Functions > pcloud.')
    throw new Error(out?.error || out?.message || `The pCloud function answered ${res.status}.`)
  }
  return out
}

export const pcloudPing = () => call('ping', {})
export async function pcloudUpload({ file, folder, scope }) {
  const fd = new FormData()
  fd.append('file', file, file.name)
  fd.append('folder', JSON.stringify(folder || []))
  fd.append('scope', JSON.stringify(scope))
  return call('upload', fd)
}
export const pcloudLink = (fileid, scope, download = false) => call('link', { fileid, scope, download })
export const pcloudDelete = (fileid, scope) => call('delete', { fileid, scope })

/* The token pCloud sent back after "Connect pCloud" (main.jsx catches the redirect and parks it
   here), so Settings can show it once for copying into the function's secrets. */
export const OAUTH_KEY = 'tml_pcloud_oauth'
export function takeOauth() {
  try { const raw = sessionStorage.getItem(OAUTH_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}
export function clearOauth() {
  try { sessionStorage.removeItem(OAUTH_KEY) } catch {}
}
/* The page pCloud sends the person back to: this app, at its root. Registered in the pCloud app too. */
// Always the same address, whichever way the app was opened (with or without the closing slash,
// or as index.html): pCloud refuses anything that is not exactly what its app settings hold.
export const redirectUri = () => window.location.origin + window.location.pathname.replace(/index\.html$/, '').replace(/\/?$/, '/')
export const authorizeUrl = (clientId) => `https://my.pcloud.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri())}`
