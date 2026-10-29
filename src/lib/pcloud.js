// Files in Alex's pCloud through the "pcloud" Edge Function (supabase/functions/pcloud/index.ts).
// The browser never holds a pCloud token: it sends the file and the member's own Supabase
// session to the function, which checks the same permissions the database enforces.
import { supabase } from './supabase.js'
import { SUPABASE_KEY, SUPABASE_URL } from './supabaseConfig.js'
import { demoCall } from './pcloudDemo.js'

/* Settings > Integrations > File storage. Off means the built-in Supabase bucket, as before. */
export const pcloudOn = (settings) => settings?.storage === 'pcloud'
const PIECE = 8 * 1024 * 1024 // one piece of a big upload

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

/* Once a day on its own, when an administrator has the app open (Settings > Data > Every day; on unless switched off,
   Alex 27 Oct: "are we safe, do we have backups?"). */
export const backupDue = (settings) => settings?.pcloudAutoBackup !== false && (!settings?.pcloudBackupAt || Date.now() - new Date(settings.pcloudBackupAt).getTime() > 86400000)
/* A big file (over 8 MB, e.g. a song kept as its WAV, Alex 29 Oct) goes up in pieces like a delivery, so the
   function's request limit never matters; a small one in one request. onProgress gets 0..1. */
export async function pcloudUpload({ file, folder, scope, onProgress }) {
  if (file.size > PIECE) return pcloudUploadBig({ file, folder, scope, onProgress })
  const fd = new FormData()
  fd.append('file', file, file.name)
  fd.append('folder', JSON.stringify(folder || []))
  fd.append('scope', JSON.stringify(scope))
  return call('upload', fd)
}
export const pcloudLink = (fileid, scope, download = false) => call('link', { fileid, scope, download })

async function pcloudUploadBig({ file, folder, scope, onProgress }) {
  const start = await call('uploadStart', { folder: folder || [], scope })
  for (let offset = 0; offset < file.size; offset += PIECE) {
    const send = () => {
      const fd = new FormData()
      fd.append('file', file.slice(offset, offset + PIECE), 'piece')
      fd.append('uploadid', String(start.uploadid))
      fd.append('offset', String(offset))
      fd.append('path', start.path)
      return call('uploadChunk', fd)
    }
    // a refused piece is tried again, a little later each time, as for deliveries
    for (let t = 1; ; t++) {
      try { await send(); break } catch (e) {
        if (t >= 5 || /signed in|not allowed|cannot upload/i.test(e.message || '')) throw e
        await new Promise((ok) => setTimeout(ok, 700 * t))
      }
    }
    onProgress?.(Math.min(1, (offset + PIECE) / file.size))
  }
  return call('uploadFinish', { folder: folder || [], scope, uploadid: start.uploadid, name: file.name })
}

/* A delivery straight to pCloud (Alex, 12 Oct): the function opens an upload into the delivery's folder
   (27 Oct: RoughCut and PreFinal Cut straight into "Projects - RoughCuts", Final Deliverables into
   "Projects - FinalCuts/<label>/<project>"; see the function), the file goes up in 8 MB pieces, one after the other (each well
   within the function's limits, so a cut of several GB is fine and the pCloud key stays in the
   function), then the function saves it there and makes a public link for the client. A piece that
   fails is tried once more. onProgress gets 0..1; signal (an AbortController's) stops it. */
/* One piece at a time again (26 Oct): pCloud now refuses a piece written while another of the same upload is still
   being written ("Error writing to upload.", 2068; checked with the function pcloud-check), so the four side by side
   of 23 Oct broke every delivery. A refused piece is still tried again, later each time. */
const AT_ONCE = 1
export async function pcloudDeliver(file, { stage, title, label, into, nolink }, { onProgress, signal } = {}) {
  const start = await call('deliveryStart', { stage, title, label, into })
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
    fd.append('path', start.path)
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
   and all together"): one after the other, each with its own public link, then one link for them all.
   No dated folder of their own any more (Alex, 27 Oct): they sit with the project's other files, so the one
   link is to exactly this delivery's files (keep, the ones already on it, plus the new). The delivery page
   shows Download all and a button per file. into: the folder the delivery's files are already in.
   onProgress gets (overall 0..1, index of the file going up). Answers { url, folder, files }. */
export async function pcloudDeliverMany(files, { stage, title, label, into, keep = [] }, { onProgress, signal } = {}) {
  const total = files.reduce((n, f) => n + f.size, 0) || 1
  let done = 0
  let path = into || ''
  const list = []
  for (let i = 0; i < files.length; i += 1) {
    const f = files[i]
    const r = await pcloudDeliver(f, { stage, title, label, into: path }, { onProgress: (p) => onProgress?.((done + p * f.size) / total, i), signal })
    path = r.folder
    list.push({ name: r.name || f.name, url: r.url, size: r.size || f.size, fileid: r.fileid })
    done += f.size
  }
  // the files are up whatever happens to the one link: each has its own, and the page's Download all uses those
  const url = await pcloudDeliveryLink(path, [...keep, ...list], title).catch(() => '')
  return { url, folder: path, files: list }
}
/* The one link for a delivery's files: a file alone is its own link; several, a pCloud link to just those (the
   folder's link for a delivery from before 27 Oct whose files are in a folder of their own and some have no fileid). */
export async function pcloudDeliveryLink(path, files, name) {
  const up = files.filter((f) => f.url)
  if (up.length <= 1) return up[0]?.url || ''
  const fileids = up.every((f) => f.fileid) ? up.map((f) => f.fileid) : []
  return (await call('deliveryFolderLink', { path, fileids, name })).url
}
/* The record labels a Final Deliverables can go under (the folders in "Projects - FinalCuts"); ready false until the
   pcloud function has the token that sees Alex's whole pCloud. */
export const pcloudDeliveryLabels = () => call('deliveryLabels', {})
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

/* Database > pCloud (Alex, 29 Oct): the whole pCloud through the function's filesX actions (the TML HUB Library app's
   token stays in the function). ready false until it has that token. */
const INDEX = new Map() // folder path -> { at, items } for the search
const pcloudIds = (list) => ({ fileids: list.filter((i) => !i.folder).map((i) => i.fileid), folderids: list.filter((i) => i.folder).map((i) => i.folderid) })
// without the online database (the local build) a made-up pCloud answers instead (pcloudDemo.js)
const fcall = (action, body) => (supabase ? call(action, body) : demoCall(action, body))
export const pcloudFiles = {
  list: (path, folderid) => fcall('filesList', { path, ...(folderid ? { folderid } : {}) }),
  /* a file to show in the page (a photo, a song) */
  link: (fileid) => fcall('filesLink', { fileid }).then((r) => r.url),
  /* a video to watch in the page: { url: the original, web: pCloud's web copy (H.264, 720p) } */
  watch: (fileid) => fcall('filesLink', { fileid, preview: 'video' }),
  /* to download: { url, page } (page: pCloud's own download page, for a big file) */
  download: (it) => fcall('filesLink', { fileid: it.fileid, download: true, size: it.size, name: it.name }),
  share: (it) => fcall('filesShare', it.folder ? { folderid: it.folderid } : { fileid: it.fileid }).then((r) => r.url),
  mkdir: (path, name) => fcall('filesMkdir', { path, name }),
  rename: (it, name) => fcall('filesRename', { ...(it.folder ? { folderid: it.folderid } : { fileid: it.fileid }), from: it.path, name }),
  move: (it, to) => fcall('filesMove', { ...(it.folder ? { folderid: it.folderid } : { fileid: it.fileid }), from: it.path, to }),
  trash: (it) => fcall('filesTrash', { ...(it.folder ? { folderid: it.folderid } : { fileid: it.fileid }), from: it.path }),
  /* every folder under `path`, read one at a time (four side by side): one big listing of a whole pCloud is refused by
     pCloud (Alex, 29 Oct: "invalid request"). onItem gets every file and folder; onProgress (folders, files). */
  async walk(path, onItem, onProgress, signal) {
    const queue = [{ path }]
    let folders = 0, files = 0, active = 0
    const lane = async () => {
      for (;;) {
        if (signal?.aborted) throw new Error('Stopped.')
        if (!queue.length) { if (!active) return; await new Promise((ok) => setTimeout(ok, 120)); continue }
        const at = queue.shift()
        active++
        try {
          let r
          for (let t = 1; ; t++) {
            try { r = await fcall('filesList', { path: at.path, ...(at.folderid ? { folderid: at.folderid } : {}), nothumbs: true }); break } catch (e) {
              if (t >= 3) throw new Error(`${at.path}: ${e.message}`)
              await new Promise((ok) => setTimeout(ok, 800 * t))
            }
          }
          folders++
          for (const it of r.items || []) {
            if (it.folder) queue.push({ path: it.path, folderid: it.folderid })
            else files++
            onItem(it)
          }
          onProgress?.(folders, files)
        } finally { active-- }
      }
    }
    await Promise.all(Array.from({ length: 4 }, lane))
    return { folders, files }
  },
  /* the same content in more than one place: pCloud's hash of each file's content and its size, from 1 MB, the oldest
     first in each group */
  async dupes(path = '/', onProgress, signal) {
    const by = new Map()
    const { folders, files } = await pcloudFiles.walk(path, (it) => {
      if (it.folder || it.size < 1048576 || !it.hash) return
      const k = `${it.hash}|${it.size}`
      if (by.has(k)) by.get(k).push(it)
      else by.set(k, [it])
    }, onProgress, signal)
    const t = (f) => Date.parse(f.created || f.modified) || 0
    const groups = [...by.values()].filter((g) => g.length > 1)
      .map((g) => ({ size: g[0].size, waste: g[0].size * (g.length - 1), files: g.sort((a, b) => t(a) - t(b)) }))
      .sort((a, b) => b.waste - a.waste)
    return { path, scanned: files, folders, count: groups.length, waste: groups.reduce((n, g) => n + g.waste, 0), groups }
  },
  /* everything under `path`, for searching by name; kept ten minutes, so a second search is instant */
  async index(path, onProgress, signal) {
    const hit = INDEX.get(path)
    if (hit && Date.now() - hit.at < 600000) return hit.items
    const items = []
    await pcloudFiles.walk(path, (it) => items.push(it), onProgress, signal)
    INDEX.set(path, { at: Date.now(), items })
    return items
  },
  forget: () => INDEX.clear(),
  // full management (Alex, 29 Oct: "everything pCloud can do, we do in the hub too")
  info: () => fcall('filesInfo', {}),
  copy: (it, to) => fcall('filesCopy', { ...(it.folder ? { folderid: it.folderid } : { fileid: it.fileid }), from: it.path, to, name: it.name }),
  /* the chosen files and folders as one zip to download, or one public link to just them */
  zip: (list, name) => fcall('filesZip', { ...pcloudIds(list), name }).then((r) => r.url),
  treeLink: (list, name) => fcall('filesTreeLink', { ...pcloudIds(list), name }).then((r) => r.url),
  makeZip: (list, to, name) => fcall('filesMakeZip', { ...pcloudIds(list), to, name }),
  /* a zip opened into a folder; waits until pCloud has finished */
  async extract(it, to, password) {
    const r = await fcall('filesExtract', { fileid: it.fileid, to, password })
    for (let t = 0; !r.finished && r.progresshash && t < 300; t++) {
      await new Promise((ok) => setTimeout(ok, 1500))
      const p = await fcall('filesExtractProgress', { progresshash: r.progresshash })
      if (p.errors?.length) throw new Error(p.errors[0])
      if (p.finished) break
    }
  },
  trashList: () => fcall('filesTrashList', {}).then((r) => r.items || []),
  restore: (it) => fcall('filesRestore', it.folder ? { folderid: it.folderid } : { fileid: it.fileid }),
  purge: (it) => fcall('filesPurge', it ? (it.folder ? { folderid: it.folderid } : { fileid: it.fileid }) : { all: true }),
  links: () => fcall('filesLinks', {}),
  linkChange: (id, change) => fcall('filesLinkChange', { id, ...change }),
  linkDelete: (l) => fcall('filesLinkDelete', { id: l.id, upload: !!l.upload }),
  uploadLink: (folderid, opts) => fcall('filesUploadLink', { folderid, ...opts }).then((r) => r.url),
  revisions: (fileid) => fcall('filesRevisions', { fileid }).then((r) => r.revisions || []),
  revert: (fileid, revisionid) => fcall('filesRevert', { fileid, revisionid }),
  fetch: (path, url, name) => fcall('filesFetch', { path, url, name }),
  shares: () => fcall('filesShares', {}).then((r) => r.shares || []),
  shareFolder: (it, mail, edit, message) => fcall('filesShareFolder', { folderid: it.folderid, from: it.path, name: it.name, mail, edit, message }),
  unshare: (s) => fcall('filesUnshare', { id: s.id, pending: s.pending }),
  /* a file into a folder, in 8 MB pieces whatever its size; onProgress gets 0..1 */
  async upload(path, file, onProgress) {
    const { uploadid } = await fcall('filesUploadStart', {})
    for (let offset = 0; offset < file.size || offset === 0; offset += PIECE) {
      const fd = new FormData()
      fd.append('file', file.slice(offset, offset + PIECE), 'piece')
      fd.append('uploadid', String(uploadid))
      fd.append('offset', String(offset))
      for (let t = 1; ; t++) {
        try { await fcall('filesChunk', fd); break } catch (e) {
          if (t >= 5 || /pCloud section|signed in/i.test(e.message || '')) throw e
          await new Promise((ok) => setTimeout(ok, 700 * t))
        }
      }
      onProgress?.(Math.min(1, (offset + PIECE) / (file.size || 1)))
      if (!file.size) break
    }
    return fcall('filesUploadFinish', { path, uploadid, name: file.name })
  },
}
