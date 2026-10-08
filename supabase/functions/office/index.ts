// THEMADLIONS Projects · Office (Supabase Edge Function "office")
//
// Word, Excel and PowerPoint inside the app (Alex, 8 Oct), with ONLYOFFICE Docs, the open-source
// office suite, running on a small server of Alex's own. The files themselves stay in Alex's
// pCloud, in each project's folder ("<project>/Office"), and the same database rules as the rest
// of the app decide who may open or change them.
//
// How it fits together:
//   app ──(open)──> this function: checks the member may see the project and that the file is
//                   one of the project's, asks pCloud for a link, and hands back the editor's
//                   settings, signed with the secret ONLYOFFICE and this function share
//   app ──────────> ONLYOFFICE server: shows the editor; the server fetches the file by that link
//   ONLYOFFICE ───> this function (callback): "here is the saved file"; the function checks the
//                   signature and puts the new version back in pCloud in place of the old one
//
// Deploy: Supabase > Edge Functions > Deploy a new function > via Editor, name "office", paste this
// file, Deploy; then in the function's Details switch OFF "Verify JWT" (ONLYOFFICE calls back
// without a Supabase login; every call is checked here instead). Secrets (Edge Functions >
// Secrets), next to the pCloud ones it shares:
//   OFFICE_URL         the ONLYOFFICE server, e.g. https://1-2-3-4.sslip.io
//   OFFICE_JWT_SECRET  the same secret the ONLYOFFICE server was started with (JWT_SECRET)
//   APP_URL            optional, where the app is published (the blank files are in its /office)
//
// Actions (POST JSON, signed-in member): ping · create · open. Callback: POST ?cb=1&p=&f=&s=.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const HOST = Deno.env.get('PCLOUD_HOST') || 'eapi.pcloud.com'
const TOKEN = Deno.env.get('PCLOUD_TOKEN') || ''
const ROOT = '/' + (Deno.env.get('PCLOUD_ROOT') || '/TML HUB').replace(/^\/+|\/+$/g, '')
const DOCS = (Deno.env.get('OFFICE_URL') || '').replace(/\/+$/, '')
const SECRET = Deno.env.get('OFFICE_JWT_SECRET') || ''
const SB_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

/* ---------- pCloud, as in the pcloud function ---------- */
async function pc(method: string, params: Record<string, any> = {}, body?: BodyInit) {
  const url = new URL(`https://${HOST}/${method}`)
  url.searchParams.set('access_token', TOKEN)
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
  const res = await fetch(url, body ? { method: 'POST', body } : undefined)
  const data = await res.json().catch(() => ({ result: -1, error: `pCloud answered ${res.status}` }))
  if (data.result !== 0) throw new Error(data.error ? `pCloud: ${data.error}` : `pCloud error ${data.result}`)
  return data
}
const segment = (s: any) => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Untitled'
async function ensureFolder(parts: string[]) {
  let path = ROOT
  await pc('createfolderifnotexists', { path })
  for (const p of parts.map(segment)) {
    path += '/' + p
    await pc('createfolderifnotexists', { path })
  }
  return path
}
const mentions = (data: any, fileid: number) => new RegExp(`"fileid":${fileid}(?![0-9])`).test(JSON.stringify(data ?? null))

/* ---------- the signature ONLYOFFICE and this function share (JWT, HS256) ---------- */
const enc = new TextEncoder()
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0))
const hmacKey = () => crypto.subtle.importKey('raw', enc.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
async function hmac(text: string) { return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(text)))) }
async function signJwt(payload: any) {
  const head = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = b64url(enc.encode(JSON.stringify(payload)))
  return `${head}.${body}.${await hmac(`${head}.${body}`)}`
}
async function verifyJwt(token: string) {
  const [head, body, sig] = String(token || '').split('.')
  if (!sig) return null
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(), fromB64url(sig), enc.encode(`${head}.${body}`))
  return ok ? JSON.parse(new TextDecoder().decode(fromB64url(body))) : null
}

/* ---------- blank files for New: a page, a sheet, a slide, served by the app itself ---------- */
const APP_URL = (Deno.env.get('APP_URL') || 'https://alexisdigipro-hub.github.io/themadlions-projects').replace(/\/+$/, '')
const BLANK = ['docx', 'xlsx', 'pptx']
const KIND: Record<string, string> = { docx: 'word', doc: 'word', odt: 'word', rtf: 'word', txt: 'word', xlsx: 'cell', xls: 'cell', ods: 'cell', csv: 'cell', pptx: 'slide', ppt: 'slide', odp: 'slide' }
const extOf = (name: string) => (String(name).match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase()

/* May this member see the project, and change its documents? (Files & notes = edit, or the
   project itself editable, the same rule as deleting a project's file in pCloud.) */
async function access(db: any, projectId: string) {
  const { data: view } = await db.rpc('can_view_project', { pid: projectId })
  if (!view) return { view: false, edit: false }
  const [{ data: perm }, { data: canEdit }] = await Promise.all([db.rpc('my_perm', { p_module: 'files' }), db.rpc('can_edit_project', { pid: projectId })])
  return { view: true, edit: perm === 'edit' || !!canEdit }
}

/* ONLYOFFICE has saved the file: put it back in pCloud where it was, under the same name. */
async function callback(req: Request, url: URL) {
  const p = url.searchParams.get('p') || ''
  const f = Number(url.searchParams.get('f'))
  if (!SECRET || !p || !f || url.searchParams.get('s') !== (await hmac(`cb:${p}:${f}`))) return json({ error: 1, message: 'Bad callback' }, 403)
  const raw = await req.json().catch(() => ({}))
  const auth = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const signed = (raw.token && (await verifyJwt(raw.token))) || (auth && (await verifyJwt(auth)))
  if (!signed) return json({ error: 1, message: 'Bad signature' }, 403)
  const data = signed.payload ?? signed
  // 2: everyone closed the file, save it; 6: saved while still open (force save)
  if ((data.status === 2 || data.status === 6) && data.url) {
    const meta = (await pc('stat', { fileid: f })).metadata
    const file = await fetch(data.url)
    if (!file.ok) return json({ error: 1, message: `ONLYOFFICE file ${file.status}` })
    const fd = new FormData()
    fd.append('file', new Blob([await file.arrayBuffer()]), meta.name)
    const up = await pc('uploadfile', { folderid: meta.parentfolderid, filename: meta.name, nopartial: 1 }, fd)
    const fresh = up.metadata?.[0]?.fileid
    // pCloud keeps the same file id when it overwrites; should it ever hand out a new one, the
    // project's record is moved over to it so the document does not go missing
    if (fresh && fresh !== f && SERVICE) {
      const admin = createClient(SB_URL, SERVICE, { auth: { persistSession: false } })
      const { data: rows } = await admin.from('projects').select('data').eq('id', p)
      if (rows?.[0]) {
        const next = JSON.parse(JSON.stringify(rows[0].data).replace(new RegExp(`"fileid":${f}(?![0-9])`, 'g'), `"fileid":${fresh}`))
        await admin.from('projects').update({ data: next }).eq('id', p)
      }
    }
  }
  return json({ error: 0 })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const url = new URL(req.url)
  try {
    if (url.searchParams.get('cb')) return await callback(req, url)

    const auth = req.headers.get('Authorization') || ''
    const apikey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || ''
    const db = createClient(SB_URL, apikey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
    const { data: userData } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ''))
    const uid = userData?.user?.id
    if (!uid) return json({ error: 'Not signed in.' }, 401)
    if (!DOCS || !SECRET) return json({ error: 'Office is not set up yet: OFFICE_URL and OFFICE_JWT_SECRET are missing from the function secrets.' }, 500)
    if (!TOKEN) return json({ error: 'PCLOUD_TOKEN is not set in the function secrets.' }, 500)
    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '')

    if (action === 'ping') {
      const r = await fetch(`${DOCS}/healthcheck`).catch((e) => ({ ok: false, statusText: e.message }) as any)
      const up = r.ok ? (await r.text()).trim() === 'true' : false
      return json({ ok: up, docs: DOCS, error: up ? undefined : `The ONLYOFFICE server at ${DOCS} did not answer (${r.status || r.statusText}).` })
    }

    const projectId = String(body.projectId || '')
    const can = await access(db, projectId)
    if (!can.view) return json({ error: 'You cannot open this project.' }, 403)
    const { data: rows } = await db.from('projects').select('data').eq('id', projectId)
    const project = rows?.[0]?.data
    if (!project) return json({ error: 'Project not found.' }, 404)

    if (action === 'create') {
      if (!can.edit) return json({ error: 'You cannot add documents to this project.' }, 403)
      const type = String(body.type || '')
      if (!BLANK.includes(type)) return json({ error: 'Unknown document type.' }, 400)
      const blank = await fetch(`${APP_URL}/office/blank.${type}`)
      if (!blank.ok) return json({ error: `Could not fetch the blank ${type} from the app (${blank.status}).` }, 502)
      const name = `${segment(body.name || 'Untitled').replace(/\.(docx|xlsx|pptx)$/i, '')}.${type}`
      const path = await ensureFolder([project.title || 'Project', 'Office'])
      const fd = new FormData()
      fd.append('file', new Blob([await blank.arrayBuffer()]), name)
      const up = await pc('uploadfile', { path, filename: name, nopartial: 1, renameifexists: 1 }, fd)
      const meta = up.metadata?.[0]
      if (!meta?.fileid) return json({ error: 'pCloud did not return the file.' }, 502)
      return json({ ok: true, fileid: meta.fileid, name: meta.name })
    }

    if (action === 'open') {
      const fileid = Number(body.fileid)
      // only a file the project records (the app records a new document before opening it)
      if (!fileid || !mentions(project, fileid)) return json({ error: 'This document is not one of the project\'s.' }, 403)
      const meta = (await pc('stat', { fileid })).metadata
      const ext = extOf(meta.name)
      if (!KIND[ext]) return json({ error: `Office cannot open .${ext} files.` }, 400)
      const link = await pc('getfilelink', { fileid })
      const host = Array.isArray(link.hosts) && link.hosts.length ? link.hosts[0] : HOST
      const { data: me } = await db.from('members').select('name').eq('user_id', uid).limit(1)
      const edit = can.edit && body.mode !== 'view'
      const config: any = {
        document: {
          fileType: ext,
          key: `${fileid}-${meta.hash || meta.modified || ''}`.replace(/[^0-9a-zA-Z._=-]/g, '').slice(0, 120),
          title: meta.name,
          url: `https://${host}${link.path}`,
          permissions: { edit, comment: edit, download: true, print: true, review: edit },
        },
        documentType: KIND[ext],
        editorConfig: {
          callbackUrl: `${SB_URL}/functions/v1/office?cb=1&p=${encodeURIComponent(projectId)}&f=${fileid}&s=${await hmac(`cb:${projectId}:${fileid}`)}`,
          user: { id: uid, name: me?.[0]?.name || 'Member' },
          lang: 'en',
          mode: edit ? 'edit' : 'view',
          customization: { forcesave: true, autosave: true, compactHeader: false, hideRightMenu: false },
        },
      }
      config.token = await signJwt(config)
      return json({ ok: true, docs: DOCS, config, edit })
    }

    return json({ error: `Unknown action "${action}".` }, 400)
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, 500)
  }
})
