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

/* A delivery straight to pCloud (Alex, 12 Oct): the function opens an upload into
   <root>/Deliveries/<stage>/<title>, the file goes up in 8 MB pieces, one after the other (each well
   within the function's limits, so a cut of several GB is fine and the pCloud key stays in the
   function), then the function saves it there and makes a public link for the client. A piece that
   fails is tried once more. onProgress gets 0..1; signal (an AbortController's) stops it. */
const PIECE = 8 * 1024 * 1024
/* One piece at a time again (26 Oct): pCloud now refuses a piece written while another of the same upload is still
   being written ("Error writing to upload.", 2068; checked with the function pcloud-check), so the four side by side
   of 23 Oct broke every delivery. A refused piece is still tried again, later each time. */
const AT_ONCE = 1
export async function pcloudDeliver(file, { stage, title, sub, nolink }, { onProgress, signal } = {}) {
  const start = await call('deliveryStart', { stage, title, sub })
  const offsets = []
  for (let offset = 0; offset < file.size; offset += PIECE) offsets.push(offset)
  let next = 0
  let sent = 0
  let lanes = AT_ONCE
  const send = (offset) => {
    const fd = new FormData()
    fd.append('file', file.slice(offset, offset + PIECE), 'piece')
    fd.append('uploadid', String(start.uploadid))
    fd.append('offset', String(offset))
    return call('deliveryChunk', fd)
  }
  /* A piece pCloud turns down (Alex, 26 Oct: "the user cannot upload to pCloud") is tried again, up to five times,
     a little later each time and one at a time (the queue `again`): the pieces that were already going up side by side
     used to give up at once and break the whole upload. From the first refusal on, the rest go one after the other. */
  let again = Promise.resolve()
  const wait = (ms) => new Promise((ok) => setTimeout(ok, ms))
  const one = async (offset) => {
    try { await send(offset) } catch (e) {
      if (signal?.aborted || /signed in|Only people|not allowed/i.test(e.message || '')) throw e
      lanes = 1
      const retry = again.then(async () => {
        for (let t = 1; ; t++) {
          if (signal?.aborted) throw new Error('Upload stopped.')
          await wait(700 * t)
          try { return await send(offset) } catch (e2) { if (t >= 5 || signal?.aborted) throw e2 }
        }
      })
      again = retry.catch(() => {})
      await retry
    }
    sent += Math.min(PIECE, file.size - offset)
    onProgress?.(Math.min(1, sent / file.size))
  }
  const lane = async (k) => {
    while (next < offsets.length) {
      if (signal?.aborted) throw new Error('Upload stopped.')
      if (k >= lanes) return
      await one(offsets[next++])
    }
  }
  await Promise.all(Array.from({ length: Math.min(AT_ONCE, offsets.length || 1) }, (_, k) => lane(k)))
  if (signal?.aborted) throw new Error('Upload stopped.')
  return call('deliveryFinish', { uploadid: start.uploadid, path: start.path, name: file.name, nolink })
}

/* Several files for one delivery (Alex, 12 Oct: "one link for several files", then "a button for each
   and all together"): one after the other into a folder of their own, <stage>/<title>/<sub>, each with
   its own public link, then one public link for the whole folder. The delivery page shows Download all
   (the folder) and a button per file. One file alone goes as pcloudDeliver.
   onProgress gets (overall 0..1, index of the file going up). */
export async function pcloudDeliverMany(files, { stage, title, sub, into }, { onProgress, signal } = {}) {
  /* more files for a delivery that already has some (Alex, 23 Oct: "it loses the ones it had"): into the same folder
     as those, <root>/Deliveries/<stage>/<title>/<sub>, so the folder's one link covers them all */
  const at = String(into || '').split('/')
  const k = at.indexOf('Deliveries')
  if (k >= 0 && at[k + 3]) { stage = at[k + 1]; title = at[k + 2]; sub = at.slice(k + 3).join('/') }
  // one file alone: in its own dated folder too (23 Oct), so files added later land next to it
  else if (files.length === 1) return pcloudDeliver(files[0], { stage, title, sub }, { onProgress: (p) => onProgress?.(p, 0), signal })
  const total = files.reduce((n, f) => n + f.size, 0) || 1
  let done = 0
  let path = ''
  const list = []
  for (let i = 0; i < files.length; i += 1) {
    const f = files[i]
    const r = await pcloudDeliver(f, { stage, title, sub }, { onProgress: (p) => onProgress?.((done + p * f.size) / total, i), signal })
    path = r.folder
    list.push({ name: r.name || f.name, url: r.url, size: r.size || f.size, fileid: r.fileid })
    done += f.size
  }
  const link = await call('deliveryFolderLink', { path })
  return { ...link, count: files.length, files: list }
}
export const pcloudDelete = (fileid, scope) => call('delete', { fileid, scope })
/* One file taken off a delivery, or replaced (Alex, 27 Oct): to pCloud's trash, so the folder's Download all no longer
   has it. A file from before fileids were kept is found by its public link's code. */
export const pcloudDeliveryRemove = ({ fileid, url, path }) => {
  let code = ''
  try { code = new URL(url).searchParams.get('code') || '' } catch { /* not a pCloud link */ }
  return call('deliveryRemove', { fileid: fileid || 0, code, path })
}
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
