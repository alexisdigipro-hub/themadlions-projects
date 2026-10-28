// THEMADLIONS Projects · pCloud storage door (Supabase Edge Function "pcloud")
//
// The app hands files to this function and it puts them in Alex's pCloud, under one root
// folder, in a folder per project or chat room. The pCloud token lives only here, as a
// secret; no browser ever sees it. Every call carries the signed-in member's Supabase token,
// and the same database rules the app uses (can_view_project, can_read_chat, my_perm,
// is_admin) decide what that member may upload, open or delete.
//
// Deploy: Supabase > Edge Functions > Deploy a new function > via Editor, name "pcloud",
// paste this file, Deploy. Secrets (Edge Functions > Secrets):
//   PCLOUD_TOKEN   the access token from Settings > Integrations > pCloud > Connect
//   PCLOUD_HOST    eapi.pcloud.com for a European account (default), api.pcloud.com for a US one
//   PCLOUD_ROOT    the folder everything goes under, default "/TML HUB"
//
//   PCLOUD_FULL_TOKEN  (27 Oct, optional) a token of the app "TML HUB Library", which sees all of Alex's pCloud,
//                  not only this app's own folder. With it the deliveries go into Alex's own folders (below).
//
// Actions (POST, JSON or multipart): ping · upload · link · links · raw · delete · backup ·
// deliveryStart · deliveryChunk · deliveryFinish · deliveryFolderLink · deliveryRemove · deliveryLabels. See src/lib/pcloud.js.
// Where a delivery goes (Alex, 27 Oct): with PCLOUD_FULL_TOKEN, RoughCut and PreFinal Cut straight into
// "/Projects - RoughCuts" (no folder of their own, so they can be emptied together), Final Deliverables into
// "/Projects - FinalCuts/<label>/<project>" (the record label, picked from that folder's own folders: deliveryLabels).
// Without it, ROOT/Deliveries/<stage>/<project>. No dated folder under the project any more: the delivery's one link
// is a pCloud link to exactly its own files (gettreepublink), not to the folder. Deliveries made before keep their
// folders and their links; anything under ROOT goes on through PCLOUD_TOKEN.
// deliveryRemove (27 Oct): one file of a delivery taken off it, or replaced, goes to pCloud's trash too, so the
// delivery's Download all (the folder's link) no longer holds it; only a file inside ROOT/Deliveries.
// deliveryStart / deliveryChunk / deliveryFinish (Share = edit, or administrators): a cut for a client
// goes into ROOT/Deliveries/<stage>/<title> in pieces of a few MB through pCloud's upload session
// (upload_create, upload_write in order, upload_save; the calls pCloud's own apps use), so a file of
// any size fits in this function's limits and the token never leaves it; then a public pCloud link
// for the delivery page. (A pCloud upload link was tried first; pCloud answered "Log in required" to
// a browser sending to it, 12 Oct.) Several files for one delivery go into a folder of their own
// (ROOT/Deliveries/<stage>/<title>/<version or date>) and deliveryFolderLink makes one public link for
// that folder, so the client gets them all on one page.
// publicDirect / publicFile (no account: the client's delivery page): for a public link this pCloud
// account made, its file's direct download address, or the file's bytes themselves (Save to Photos on a
// phone needs them in the page, and pCloud's servers do not let a page fetch them). A browser cannot
// ask pCloud's API itself; it is refused. Any other public link is refused here too. Deployed with
// verify_jwt off for this reason; every other action checks the caller's own sign-in below.
// backup (administrators): the files the app sends (the workspace's data) and the site's code as
// GitHub keeps it (a zip of the main branch) go into ROOT/Backups/<date time>, so the whole thing
// can be put back if anything happens to the site. The newest 30 are kept, older dated folders go to the trash.
// Scopes: a project (its files, photos and songs), a chat room, the company library (the
// people and locations of the Database page, shared by every project), or ids: Database > ID sheets,
// the permission "idsheets" (view to open, edit to upload or delete), files only into ROOT/ID sheets/<name>
// and only those recorded in the id_sheets table (supabase/id_sheets.sql).

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const HOST = Deno.env.get('PCLOUD_HOST') || 'eapi.pcloud.com'
const TOKEN = Deno.env.get('PCLOUD_TOKEN') || ''
const ROOT = '/' + (Deno.env.get('PCLOUD_ROOT') || '/TML HUB').replace(/^\/+|\/+$/g, '')
const FULL = Deno.env.get('PCLOUD_FULL_TOKEN') || ''
const ROUGH = '/Projects - RoughCuts'
const FINAL = '/Projects - FinalCuts'
const REPO = 'alexisdigipro-hub/themadlions-projects'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

/* One pCloud API call. The token goes as a parameter, which is what pCloud's own SDK does. */
async function pc(method: string, params: Record<string, any> = {}, body?: BodyInit, token = TOKEN) {
  const url = new URL(`https://${HOST}/${method}`)
  url.searchParams.set('access_token', token)
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
  const res = await fetch(url, body ? { method: 'POST', body } : undefined)
  const data = await res.json().catch(() => ({ result: -1, error: `pCloud answered ${res.status}` }))
  if (data.result !== 0) throw new Error(data.error ? `pCloud: ${data.error}` : `pCloud error ${data.result}`)
  return data
}

/* A folder name pCloud accepts: no slashes or other path characters, not too long. */
const segment = (s: any) => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Untitled'

/* ROOT/a/b/c, each level created if missing (pCloud creates one level at a time). */
async function ensureFolder(parts: string[]) {
  let path = ROOT
  await pc('createfolderifnotexists', { path })
  for (const p of parts.map(segment)) {
    path += '/' + p
    await pc('createfolderifnotexists', { path })
  }
  return path
}

/* A delivery's folder: under ROOT/Deliveries (the app's own folder), or with the full token Alex's own two folders.
   Nothing climbing out of them. */
const inFull = (path: string) => !!FULL && (path === ROUGH || path.startsWith(`${ROUGH}/`) || path.startsWith(`${FINAL}/`))
const isDelivery = (path: string) => !path.includes('..') && (path.startsWith(`${ROOT}/Deliveries/`) || inFull(path))
const tokenFor = (path: string) => (inFull(path) ? FULL : TOKEN)

/* base/a/b, each level created if missing, with the token that folder belongs to. */
async function ensureAt(base: string, parts: string[], token: string) {
  let path = base
  let meta = (await pc('createfolderifnotexists', { path }, undefined, token)).metadata
  for (const p of parts.map(segment)) {
    path += '/' + p
    meta = (await pc('createfolderifnotexists', { path }, undefined, token)).metadata
  }
  return { path, folderid: Number(meta?.folderid) }
}

/* Is this a public link either token made? */
async function ownLink(code: string) {
  for (const token of [TOKEN, FULL].filter(Boolean)) {
    const mine = await pc('listpublinks', {}, undefined, token)
    const hit = (mine.publinks || []).find((p: any) => p.code === code)
    if (hit) return { hit, token }
  }
  return null
}

type Scope = { kind: 'project' | 'chat' | 'library' | 'ids' | 'logos'; id: string }

/* Is this pCloud file recorded anywhere in this piece of data? Every record the app keeps for a
   pCloud file (a project file, a photo, a song, a chat attachment) carries "fileid": <n>. */
const mentions = (data: any, fileid: number) => new RegExp(`"fileid":${fileid}(?![0-9])`).test(JSON.stringify(data ?? null))

/* The library rows the caller can read (people, locations), for photos kept there. */
async function inLibrary(db: any, fileid: number) {
  const { data } = await db.from('library').select('data').in('kind', ['contact', 'location'])
  return mentions(data, fileid)
}

/* What the caller may do, asked of the database with the caller's own token, so the answer is
   exactly what Row Level Security would say. With a fileid the file must also be recorded in
   that project or that room, so a member cannot fetch another project's file by guessing ids. */
async function allowed(db: any, uid: string, scope: Scope, fileid?: number, forDelete = false, forUpload = false) {
  if (!scope || !scope.id) return false
  // an ID sheet's picture only ever through its own scope, whatever a project or the library says (security review, 25 Oct)
  if (fileid && scope.kind !== 'ids' && scope.kind !== 'logos') {
    const { data: isId } = await db.rpc('is_id_sheet_file', { p_fileid: fileid })
    if (isId) return false
  }
  if (scope.kind === 'project') {
    const { data: ok } = await db.rpc('can_view_project', { pid: scope.id })
    if (!ok) return false
    if (forDelete) {
      // files need Files & notes = edit; photos and songs need the project itself editable
      const [{ data: perm }, { data: canEdit }] = await Promise.all([db.rpc('my_perm', { p_module: 'files' }), db.rpc('can_edit_project', { pid: scope.id })])
      if (perm !== 'edit' && !canEdit) return false
    }
    if (fileid) {
      // recorded anywhere in this project, or in the library when it is a person's or a
      // location's photo shown inside the project
      const { data } = await db.from('projects').select('data').eq('id', scope.id)
      if (!data?.length) return false
      if (!mentions(data[0].data, fileid) && !(await inLibrary(db, fileid))) return false
    }
    return true
  }
  if (scope.kind === 'library') {
    const { data: ws } = await db.rpc('my_ws')
    if (!ws) return false
    if (forDelete || forUpload) {
      const { data: canEdit } = await db.rpc('can_edit_any')
      if (!canEdit) return false
    }
    if (fileid && !(await inLibrary(db, fileid))) return false
    return true
  }
  if (scope.kind === 'ids') {
    const { data: perm } = await db.rpc('my_perm', { p_module: 'idsheets' })
    if (perm !== 'view' && perm !== 'edit') return false
    if ((forDelete || forUpload) && perm !== 'edit') return false
    if (fileid) {
      const { data } = await db.from('id_sheets').select('id').eq('fileid', fileid).limit(1)
      if (!data?.length) return false
    }
    return true
  }
  // Database > Logos (Alex, 28 Oct): the permission "logos" (view to open, edit to upload or delete), files only into
  // ROOT/Logos/<brand> and only those recorded in the logos table (supabase/logos.sql)
  if (scope.kind === 'logos') {
    const { data: perm } = await db.rpc('my_perm', { p_module: 'logos' })
    if (perm !== 'view' && perm !== 'edit') return false
    if ((forDelete || forUpload) && perm !== 'edit') return false
    if (fileid) {
      const { data } = await db.from('logos').select('id').eq('fileid', fileid).limit(1)
      if (!data?.length) return false
    }
    return true
  }
  if (scope.kind === 'chat') {
    const { data: ok } = await db.rpc('can_read_chat', { p_chat: scope.id })
    if (!ok) return false
    if (fileid) {
      // the JSON goes as text: .contains() with an array writes a Postgres array literal
      // ({[object Object]}), which never matched, so every chat file was refused (Alex, 8 Oct)
      const { data } = await db.from('messages').select('id, user_id').eq('chat_id', scope.id).filter('attachments', 'cs', JSON.stringify([{ fileid }]))
      if (!data?.length) return false
      if (forDelete && data[0].user_id !== uid) {
        const { data: adm } = await db.rpc('is_admin')
        if (!adm) return false
      }
    }
    return true
  }
  return false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!TOKEN) return json({ error: 'PCLOUD_TOKEN is not set in the function secrets.' }, 500)

  // the client's delivery page, signed in to nothing: only public links of this account
  if (!(req.headers.get('content-type') || '').includes('multipart/form-data')) {
    const pre = await req.clone().json().catch(() => ({}))
    if (pre.action === 'publicDirect' || pre.action === 'publicFile') {
      try {
        const code = String(pre.code || '')
        if (!/^[A-Za-z0-9]{8,80}$/.test(code)) return json({ error: 'No link.' }, 400)
        const own = await ownLink(code)
        if (!own) return json({ error: 'Not a link of this production.' }, 403)
        const r = await pc('getpublinkdownload', { code, forcedownload: pre.action === 'publicDirect' ? 1 : 0 }, undefined, own.token)
        const url = `https://${Array.isArray(r.hosts) && r.hosts.length ? r.hosts[0] : HOST}${r.path}`
        if (pre.action === 'publicDirect') return json({ ok: true, url })
        const file = await fetch(url)
        if (!file.ok) return json({ error: `pCloud answered ${file.status}` }, 502)
        const headers: Record<string, string> = { ...CORS, 'Content-Type': file.headers.get('content-type') || 'application/octet-stream', 'Access-Control-Expose-Headers': 'Content-Length' }
        const len = file.headers.get('content-length')
        if (len) headers['Content-Length'] = len
        return new Response(file.body, { headers })
      } catch (e) {
        return json({ error: (e as Error).message || String(e) }, 502)
      }
    }
  }

  const auth = req.headers.get('Authorization') || ''
  const apikey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || ''
  const db = createClient(Deno.env.get('SUPABASE_URL') || '', apikey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: userData } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ''))
  const uid = userData?.user?.id
  if (!uid) return json({ error: 'Not signed in.' }, 401)

  try {
    let action = ''
    let body: any = {}
    let file: File | null = null
    let files: File[] = []
    if ((req.headers.get('content-type') || '').includes('multipart/form-data')) {
      const fd = await req.formData()
      action = String(fd.get('action') || '')
      files = fd.getAll('file').filter((f) => f instanceof File) as File[]
      file = files[0] || null
      body = { folder: JSON.parse(String(fd.get('folder') || '[]')), scope: JSON.parse(String(fd.get('scope') || 'null')), uploadid: fd.get('uploadid'), offset: fd.get('offset'), path: String(fd.get('path') || '') }
    } else {
      body = await req.json().catch(() => ({}))
      action = String(body.action || '')
    }

    if (action === 'ping') {
      const { data: adm } = await db.rpc('is_admin')
      if (!adm) return json({ error: 'Administrators only.' }, 403)
      const me = await pc('userinfo')
      await pc('createfolderifnotexists', { path: ROOT })
      return json({ ok: true, email: me.email, host: HOST, root: ROOT, quota: me.quota, used: me.usedquota })
    }

    if (action === 'upload') {
      if (!file) return json({ error: 'No file.' }, 400)
      if (!(await allowed(db, uid, body.scope, undefined, false, true))) return json({ error: 'You cannot upload there.' }, 403)
      // into a project: the project must be the person's to change, or they have Files = edit (security check, 27 Oct)
      if (body.scope?.kind === 'project') {
        const [{ data: perm }, { data: canEdit }] = await Promise.all([db.rpc('my_perm', { p_module: 'files' }), db.rpc('can_edit_project', { pid: body.scope.id })])
        if (perm !== 'edit' && !canEdit) return json({ error: 'You cannot upload there.' }, 403)
      }
      // ID sheets only ever go under ROOT/ID sheets; the folders the server keeps (Backups, Deliveries, ID sheets, and
      // Library for anything but the library) never take an upload from here, and two levels at most
      const parts = (Array.isArray(body.folder) ? body.folder : []).slice(0, 2)
      const top = segment(parts[0]).toLowerCase()
      const reserved = ['backups', 'deliveries', 'id sheets', 'logos', ...(body.scope?.kind === 'library' ? [] : ['library'])]
      const ownFolder = body.scope?.kind === 'ids' || body.scope?.kind === 'logos'
      if (!ownFolder && reserved.includes(top)) return json({ error: 'You cannot upload there.' }, 403)
      // logos in a folder a brand (Alex, 28 Oct: "they have different versions for different uses")
      const path = await ensureFolder(body.scope?.kind === 'ids' ? ['ID sheets', ...parts.slice(-1)] : body.scope?.kind === 'logos' ? ['Logos', ...parts.slice(-1)] : parts)
      const fd = new FormData()
      fd.append('file', file, file.name)
      const up = await pc('uploadfile', { path, filename: file.name, nopartial: 1, renameifexists: 1 }, fd)
      const meta = up.metadata?.[0]
      if (!meta?.fileid) return json({ error: 'pCloud did not return the file.' }, 502)
      return json({ ok: true, fileid: meta.fileid, name: meta.name, size: meta.size, folder: path })
    }

    if (action === 'backup') {
      const { data: adm } = await db.rpc('is_admin')
      if (!adm) return json({ error: 'Administrators only.' }, 403)
      if (!files.length) return json({ error: 'No backup file.' }, 400)
      const stamp = Array.isArray(body.folder) && body.folder.length ? body.folder[body.folder.length - 1] : new Date().toISOString().slice(0, 16).replace('T', ' ').replace(':', '.')
      const path = await ensureFolder(['Backups', stamp])
      const put = async (f: File) => {
        const fd = new FormData()
        fd.append('file', f, f.name)
        const up = await pc('uploadfile', { path, filename: f.name, nopartial: 1, renameifexists: 1 }, fd)
        return up.metadata?.[0]
      }
      const saved: any[] = []
      for (const f of files) saved.push(await put(f))
      // the code: the main branch of the site's repository, as a zip
      let codeError = ''
      try {
        const res = await fetch(`https://codeload.github.com/${REPO}/zip/refs/heads/main`)
        if (!res.ok) throw new Error(`GitHub answered ${res.status}`)
        saved.push(await put(new File([await res.blob()], 'themadlions-projects-code.zip', { type: 'application/zip' })))
      } catch (e) {
        codeError = (e as Error).message
      }
      // keep the newest 30 backups (one a day since 27 Oct); older dated folders go to pCloud's trash
      let pruned = 0
      try {
        const list = await pc('listfolder', { path: ROOT + '/Backups' })
        const dated = (list.metadata?.contents || []).filter((m: any) => m.isfolder && /^\d{4}-\d{2}-\d{2} \d{2}\.\d{2}$/.test(m.name))
        dated.sort((a: any, b: any) => (a.name < b.name ? 1 : -1))
        for (const old of dated.slice(30)) { await pc('deletefolderrecursive', { folderid: old.folderid }); pruned++ }
      } catch { /* keeping more than 30 for a while is harmless */ }
      return json({ ok: true, folder: path, files: saved.filter(Boolean).map((m: any) => ({ name: m.name, size: m.size })), codeError, pruned })
    }

    if (action === 'link') {
      const fileid = Number(body.fileid)
      if (!fileid) return json({ error: 'No file id.' }, 400)
      if (!(await allowed(db, uid, body.scope, fileid))) return json({ error: 'You cannot open this file.' }, 403)
      const r = await pc('getfilelink', { fileid, forcedownload: body.download ? 1 : 0 })
      const host = Array.isArray(r.hosts) && r.hosts.length ? r.hosts[0] : HOST
      return json({ ok: true, url: `https://${host}${r.path}`, expires: r.expires })
    }

    // several links at once, for a gallery or a slide: one permission check for the lot
    if (action === 'links') {
      const ids = (Array.isArray(body.fileids) ? body.fileids : []).map(Number).filter(Boolean).slice(0, 200)
      if (!ids.length) return json({ ok: true, urls: {} })
      const scope = body.scope
      if (!(await allowed(db, uid, scope))) return json({ error: 'You cannot open these files.' }, 403)
      let lib: any = null
      let proj: any = null
      if (scope?.kind === 'project') proj = (await db.from('projects').select('data').eq('id', scope.id)).data?.[0]?.data
      const ids_ = scope?.kind === 'ids' ? new Set(((await db.from('id_sheets').select('fileid').in('fileid', ids)).data || []).map((r: any) => Number(r.fileid)))
        : scope?.kind === 'logos' ? new Set(((await db.from('logos').select('fileid').in('fileid', ids)).data || []).map((r: any) => Number(r.fileid))) : null
      const known = async (id: number) => {
        if (ids_) return ids_.has(id)
        if ((await db.rpc('is_id_sheet_file', { p_fileid: id })).data) return false
        if (proj && mentions(proj, id)) return true
        if (lib === null) lib = (await db.from('library').select('data').in('kind', ['contact', 'location'])).data || []
        return mentions(lib, id)
      }
      const urls: Record<string, string> = {}
      await Promise.all(ids.map(async (id: number) => {
        if (!(await known(id))) return
        try {
          const r = await pc('getfilelink', { fileid: id })
          const host = Array.isArray(r.hosts) && r.hosts.length ? r.hosts[0] : HOST
          urls[id] = `https://${host}${r.path}`
        } catch { /* gone from pCloud: the app shows the small picture it keeps */ }
      }))
      return json({ ok: true, urls })
    }

    // the file's bytes themselves, for the presentation's slides, which are drawn in the browser
    // and need the picture from this same address
    if (action === 'raw') {
      const fileid = Number(body.fileid)
      if (!fileid) return json({ error: 'No file id.' }, 400)
      if (!(await allowed(db, uid, body.scope, fileid))) return json({ error: 'You cannot open this file.' }, 403)
      const r = await pc('getfilelink', { fileid })
      const host = Array.isArray(r.hosts) && r.hosts.length ? r.hosts[0] : HOST
      const file = await fetch(`https://${host}${r.path}`)
      if (!file.ok) return json({ error: `pCloud answered ${file.status}` }, 502)
      return new Response(file.body, { headers: { ...CORS, 'Content-Type': file.headers.get('content-type') || 'application/octet-stream', 'Cache-Control': 'private, max-age=3600' } })
    }

    if (action === 'delete') {
      const fileid = Number(body.fileid)
      if (!fileid) return json({ error: 'No file id.' }, 400)
      if (!(await allowed(db, uid, body.scope, fileid, true))) return json({ error: 'You cannot delete this file.' }, 403)
      await pc('deletefile', { fileid })
      return json({ ok: true })
    }

    // deliveries: who may send cuts to clients (Share = edit), administrators always
    if (action.startsWith('delivery')) {
      const [{ data: adm }, { data: perm }] = await Promise.all([db.rpc('is_admin'), db.rpc('my_perm', { p_module: 'share' })])
      if (!adm && perm !== 'edit') return json({ error: 'Only people who can send deliveries may upload them.' }, 403)
    }

    // the record labels a Final Deliverables can go under: the folders inside "/Projects - FinalCuts"
    if (action === 'deliveryLabels') {
      if (!FULL) return json({ ok: true, ready: false, labels: [] })
      const list = await pc('listfolder', { path: FINAL }, undefined, FULL)
      const labels = (list.metadata?.contents || []).filter((m: any) => m.isfolder).map((m: any) => String(m.name)).sort((a: string, b: string) => a.localeCompare(b))
      return json({ ok: true, ready: true, labels })
    }

    if (action === 'deliveryStart') {
      const stage = String(body.stage || 'RoughCut')
      const into = String(body.into || '')
      let at: { path: string; folderid: number }
      // more files for a delivery that has some: next to them
      if (into && isDelivery(into)) at = await ensureAt(into, [], tokenFor(into))
      else if (FULL && /rough|prefinal/i.test(stage)) at = await ensureAt(ROUGH, [], FULL)
      else if (FULL && /deliverables/i.test(stage)) {
        if (!String(body.label || '').trim()) return json({ error: 'Pick the label first.' }, 400)
        at = await ensureAt(FINAL, [body.label, body.title || 'Untitled'], FULL)
      } else at = await ensureAt(ROOT, ['Deliveries', stage, body.title || 'Untitled'], TOKEN)
      if (!at.folderid) return json({ error: 'pCloud did not return the folder.' }, 502)
      const up = await pc('upload_create', {}, undefined, tokenFor(at.path))
      if (!up.uploadid) return json({ error: 'pCloud did not open the upload.' }, 502)
      return json({ ok: true, uploadid: up.uploadid, path: at.path })
    }

    // one piece of the file, written at its place; the pieces come in order
    if (action === 'deliveryChunk') {
      const uploadid = Number(body.uploadid)
      const offset = Number(body.offset)
      if (!uploadid || !file || !(offset >= 0)) return json({ error: 'No piece to write.' }, 400)
      const url = new URL(`https://${HOST}/upload_write`)
      url.searchParams.set('access_token', tokenFor(String(body.path || '')))
      url.searchParams.set('uploadid', String(uploadid))
      url.searchParams.set('uploadoffset', String(offset))
      const res = await fetch(url, { method: 'PUT', body: await file.arrayBuffer() })
      const out = await res.json().catch(() => ({ result: -1, error: `pCloud answered ${res.status}` }))
      if (out.result !== 0) return json({ error: out.error ? `pCloud: ${out.error}` : `pCloud error ${out.result}`, code: out.result }, 502)
      return json({ ok: true })
    }

    if (action === 'deliveryFinish') {
      const path = String(body.path || '')
      // only a folder deliveryStart made
      if (!isDelivery(path)) return json({ error: 'Not a delivery folder.' }, 400)
      const token = tokenFor(path)
      const folderid = Number((await pc('createfolderifnotexists', { path }, undefined, token)).metadata?.folderid)
      const saved = await pc('upload_save', { uploadid: Number(body.uploadid), folderid, name: segment(body.name || 'delivery').replace(/ +/g, ' ') || 'delivery', renameifexists: 1 }, undefined, token)
      const meta = saved.metadata?.[0] || saved.metadata
      if (!meta?.fileid) return json({ error: 'pCloud did not keep the file.' }, 502)
      // one of several: the folder gets the link at the end (deliveryFolderLink)
      if (body.nolink) return json({ ok: true, fileid: meta.fileid, name: meta.name, size: meta.size, folder: path })
      const pub = await pc('getfilepublink', { fileid: meta.fileid }, undefined, token)
      return json({ ok: true, url: pub.link, fileid: meta.fileid, name: meta.name, size: meta.size, folder: path })
    }

    // one public link for a whole delivery: with fileids, a link to exactly those files (they share the project's
    // folder, or RoughCuts, with other deliveries); without, the folder's (a delivery made before 27 Oct, in a
    // folder of its own)
    if (action === 'deliveryFolderLink') {
      const path = String(body.path || '')
      if (!isDelivery(path)) return json({ error: 'Not a delivery folder.' }, 400)
      const token = tokenFor(path)
      const ids = (Array.isArray(body.fileids) ? body.fileids : []).map(Number).filter((n: number) => n > 0)
      if (ids.length) {
        const list = await pc('listfolder', { path }, undefined, token)
        const here = new Set((list.metadata?.contents || []).map((m: any) => Number(m.fileid)))
        if (!ids.every((id: number) => here.has(id))) return json({ error: 'Those files are not in this delivery.' }, 403)
        const pub = await pc('gettreepublink', { name: segment(body.name || path.split('/').pop()), fileids: ids.join(',') }, undefined, token)
        return json({ ok: true, url: pub.link, folder: path })
      }
      if (inFull(path)) return json({ error: 'No files for the link.' }, 400)
      const folderid = Number((await pc('createfolderifnotexists', { path })).metadata?.folderid)
      const pub = await pc('getfolderpublink', { folderid })
      return json({ ok: true, url: pub.link, folder: path })
    }

    // one file off a delivery (Alex, 27 Oct: "delete a link, replace it, keep the same page link"): by its fileid, or
    // for a file uploaded before fileids were kept, by the code of its public link; it must sit in the delivery's
    // folder under ROOT/Deliveries, and it goes to pCloud's trash (it can be restored there)
    if (action === 'deliveryRemove') {
      const path = String(body.path || '')
      if (!isDelivery(path)) return json({ error: 'Not a delivery folder.' }, 400)
      const token = tokenFor(path)
      let fileid = Number(body.fileid) || 0
      if (!fileid && body.code) {
        const mine = await pc('listpublinks', {}, undefined, token)
        fileid = Number((mine.publinks || []).find((p: any) => p.code === String(body.code))?.metadata?.fileid) || 0
      }
      if (!fileid) return json({ ok: true, kept: true }) // nothing to find: it only leaves the page
      const list = await pc('listfolder', { path }, undefined, token)
      if (!(list.metadata?.contents || []).some((m: any) => Number(m.fileid) === fileid)) return json({ error: 'That file is not in this delivery.' }, 403)
      await pc('deletefile', { fileid }, undefined, token)
      return json({ ok: true })
    }

    return json({ error: `Unknown action "${action}".` }, 400)
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, 500)
  }
})
