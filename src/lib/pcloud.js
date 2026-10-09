// Files in Alex's pCloud through the "pcloud" Edge Function (supabase/functions/pcloud/index.ts).
// The browser never holds a pCloud token: it sends the file and the member's own Supabase
// session to the function, which checks the same permissions the database enforces.
import { supabase } from './supabase.js'
import { SUPABASE_KEY, SUPABASE_URL } from './supabaseConfig.js'

/* Settings > Integrations > File storage. Off means the built-in Supabase bucket, as before. */
export const pcloudOn = (settings) => settings?.storage === 'pcloud'

async function call(action, body, { raw = false } = {}) {
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
  if (raw && res.ok && !(res.headers.get('content-type') || '').includes('application/json')) return res.blob()
  let out = null
  try { out = await res.json() } catch {}
  if (!res.ok || !out || out.error) {
    if (res.status === 404) throw new Error('The pCloud function is not deployed yet: Supabase > Edge Functions > pcloud.')
    throw new Error(out?.error || out?.message || `The pCloud function answered ${res.status}.`)
  }
  return out
}

export const pcloudPing = () => call('ping', {})

/* A full backup into pCloud (Alex, 9 Oct): everything the app holds (the same file Download
   backup gives, which Settings > Data > Restore backup reads back), the database's latest weekly
   snapshot when there is one, and the function adds the site's code from GitHub. All in
   <root>/Backups/<date time>. Administrators only. */
export async function pcloudBackup(state) {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const stamp = `${day} ${pad(now.getHours())}.${pad(now.getMinutes())}`
  const fd = new FormData()
  fd.append('file', new Blob([JSON.stringify({ ...state, backupTakenAt: now.toISOString() }, null, 1)], { type: 'application/json' }), `themadlions-data-${day}.json`)
  try {
    const { data: row } = await supabase.from('backups').select('data').order('taken_at', { ascending: false }).limit(1).maybeSingle()
    if (row?.data) fd.append('file', new Blob([JSON.stringify(row.data)], { type: 'application/json' }), `themadlions-database-${day}.json`)
  } catch { /* no weekly backups table yet: the app's own file is enough to restore */ }
  fd.append('folder', JSON.stringify([stamp]))
  fd.append('scope', 'null')
  return call('backup', fd)
}

/* Once a week on its own, when an administrator has the app open (Settings > Data > Every week). */
export const backupDue = (settings) => !!settings?.pcloudAutoBackup && (!settings.pcloudBackupAt || Date.now() - new Date(settings.pcloudBackupAt).getTime() > 7 * 86400000)
export async function pcloudUpload({ file, folder, scope }) {
  const fd = new FormData()
  fd.append('file', file, file.name)
  fd.append('folder', JSON.stringify(folder || []))
  fd.append('scope', JSON.stringify(scope))
  return call('upload', fd)
}
export const pcloudLink = (fileid, scope, download = false) => call('link', { fileid, scope, download })
export const pcloudDelete = (fileid, scope) => call('delete', { fileid, scope })
/* Links for many files of one project (or the library) in one call: { [fileid]: url }. */
export const pcloudLinks = async (fileids, scope) => (await call('links', { fileids, scope })).urls || {}
/* The file itself, through the function, for pictures drawn on a canvas (presentation slides). */
export const pcloudBlob = (fileid, scope) => call('raw', { fileid, scope }, { raw: true })

/* Where a photo or a song of this project goes in pCloud, and under which permission. The
   library (people and locations of the Database page) has its own folder. Null when pCloud is
   off or there is no online database, so the caller keeps using the built-in storage. */
export function pcloudTarget(state, projectId, kind = 'Photos') {
  if (!pcloudOn(state?.settings) || !supabase) return null
  if (!projectId || projectId === 'library') return { folder: ['Library', kind], scope: { kind: 'library', id: 'library' } }
  const title = state.projects?.find((p) => p.id === projectId)?.title || 'Project'
  return { folder: [title, kind], scope: { kind: 'project', id: projectId } }
}

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
