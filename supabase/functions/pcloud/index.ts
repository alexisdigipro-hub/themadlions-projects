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
// Actions (POST, JSON or multipart): ping · upload · link · delete. See src/lib/pcloud.js.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const HOST = Deno.env.get('PCLOUD_HOST') || 'eapi.pcloud.com'
const TOKEN = Deno.env.get('PCLOUD_TOKEN') || ''
const ROOT = '/' + (Deno.env.get('PCLOUD_ROOT') || '/TML HUB').replace(/^\/+|\/+$/g, '')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

/* One pCloud API call. The token goes as a parameter, which is what pCloud's own SDK does. */
async function pc(method: string, params: Record<string, any> = {}, body?: BodyInit) {
  const url = new URL(`https://${HOST}/${method}`)
  url.searchParams.set('access_token', TOKEN)
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

type Scope = { kind: 'project' | 'chat'; id: string }

/* What the caller may do, asked of the database with the caller's own token, so the answer is
   exactly what Row Level Security would say. With a fileid the file must also be recorded in
   that project or that room, so a member cannot fetch another project's file by guessing ids. */
async function allowed(db: any, uid: string, scope: Scope, fileid?: number, forDelete = false) {
  if (!scope || !scope.id) return false
  if (scope.kind === 'project') {
    const { data: ok } = await db.rpc('can_view_project', { pid: scope.id })
    if (!ok) return false
    if (forDelete) {
      const { data: perm } = await db.rpc('my_perm', { p_module: 'files' })
      if (perm !== 'edit') return false
    }
    if (fileid) {
      const { data } = await db.from('projects').select('id').eq('id', scope.id).contains('data->files', [{ fileid }])
      if (!data?.length) return false
    }
    return true
  }
  if (scope.kind === 'chat') {
    const { data: ok } = await db.rpc('can_read_chat', { p_chat: scope.id })
    if (!ok) return false
    if (fileid) {
      const { data } = await db.from('messages').select('id, user_id').eq('chat_id', scope.id).contains('attachments', [{ fileid }])
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
    if ((req.headers.get('content-type') || '').includes('multipart/form-data')) {
      const fd = await req.formData()
      action = String(fd.get('action') || '')
      file = fd.get('file') as File | null
      body = { folder: JSON.parse(String(fd.get('folder') || '[]')), scope: JSON.parse(String(fd.get('scope') || 'null')) }
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
      if (!(await allowed(db, uid, body.scope))) return json({ error: 'You cannot upload there.' }, 403)
      const path = await ensureFolder(Array.isArray(body.folder) ? body.folder : [])
      const fd = new FormData()
      fd.append('file', file, file.name)
      const up = await pc('uploadfile', { path, filename: file.name, nopartial: 1, renameifexists: 1 }, fd)
      const meta = up.metadata?.[0]
      if (!meta?.fileid) return json({ error: 'pCloud did not return the file.' }, 502)
      return json({ ok: true, fileid: meta.fileid, name: meta.name, size: meta.size, folder: path })
    }

    if (action === 'link') {
      const fileid = Number(body.fileid)
      if (!fileid) return json({ error: 'No file id.' }, 400)
      if (!(await allowed(db, uid, body.scope, fileid))) return json({ error: 'You cannot open this file.' }, 403)
      const r = await pc('getfilelink', { fileid, forcedownload: body.download ? 1 : 0 })
      const host = Array.isArray(r.hosts) && r.hosts.length ? r.hosts[0] : HOST
      return json({ ok: true, url: `https://${host}${r.path}`, expires: r.expires })
    }

    if (action === 'delete') {
      const fileid = Number(body.fileid)
      if (!fileid) return json({ error: 'No file id.' }, 400)
      if (!(await allowed(db, uid, body.scope, fileid, true))) return json({ error: 'You cannot delete this file.' }, 403)
      await pc('deletefile', { fileid })
      return json({ ok: true })
    }

    return json({ error: `Unknown action "${action}".` }, 400)
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, 500)
  }
})
