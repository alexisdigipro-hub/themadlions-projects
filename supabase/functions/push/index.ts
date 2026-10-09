// THEMADLIONS Projects · push notifications (Supabase Edge Function "push")
//
// Rings a phone for a call and shows a chat message even with the app closed (Web Push, the
// standard every browser and the iPhone's home-screen apps speak). Nothing to set up by hand:
// the first time it runs it makes its own VAPID key pair and keeps it in push_config, a table no
// app user can read. Supabase gives every function SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY on its own.
//
// Deploy: Supabase > Edge Functions > Deploy a new function > via Editor, name "push", paste
// this file, Deploy. Needs supabase/push.sql run once.
//
// Every call carries the signed-in member's Supabase token. With it the function asks the
// database, under the member's own Row Level Security, whether the message or the call is
// really theirs and who may read that room (push_recipients); only then does it read those
// people's subscriptions with the service key and send.
//
// Actions (POST JSON): key · message { id } · call { chatId, callId, video } ·
//   call_missed { chatId, callId, video } · test (a call's chatId: a direct room, or any room for a group call)
//
// The encryption is RFC 8291 (aes128gcm) and the sender's identity RFC 8292 (VAPID), written
// out with the Web Crypto the runtime has, so no library is needed.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const SITE = 'https://alexisdigipro-hub.github.io/themadlions-projects/'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

/* ---------- bytes ---------- */
const enc = new TextEncoder()
const b64u = (buf: ArrayBuffer | Uint8Array) => {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const unb64u = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))
  const u = new Uint8Array(b.length)
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i)
  return u
}
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0))
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}
const hmac = async (key: Uint8Array, data: Uint8Array) => {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
}

/* ---------- VAPID: the function's own key pair, made once ---------- */
let vapid: { publicKey: string; privateKey: CryptoKey } | null = null
async function getVapid(admin: any) {
  if (vapid) return vapid
  const { data } = await admin.from('push_config').select('public_key, private_jwk').eq('id', 1).maybeSingle()
  if (data) {
    vapid = { publicKey: data.public_key, privateKey: await crypto.subtle.importKey('jwk', data.private_jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']) }
    return vapid
  }
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair
  const publicKey = b64u(await crypto.subtle.exportKey('raw', pair.publicKey))
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
  // two first calls at once: whichever row lands first wins, the other reads it back
  await admin.from('push_config').upsert({ id: 1, public_key: publicKey, private_jwk: jwk }, { onConflict: 'id', ignoreDuplicates: true })
  vapid = null
  const again = await admin.from('push_config').select('public_key, private_jwk').eq('id', 1).single()
  if (again.error) throw new Error('Run supabase/push.sql in the SQL editor first.')
  vapid = { publicKey: again.data.public_key, privateKey: await crypto.subtle.importKey('jwk', again.data.private_jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']) }
  return vapid
}

async function vapidHeader(endpoint: string, v: { publicKey: string; privateKey: CryptoKey }) {
  const aud = new URL(endpoint).origin
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SITE })))
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, v.privateKey, enc.encode(`${head}.${body}`))
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${v.publicKey}`
}

/* ---------- RFC 8291: the message sealed for one browser ---------- */
export async function encrypt(payload: Uint8Array, p256dh: string, authSecret: string) {
  const uaPublic = unb64u(p256dh)
  const auth = unb64u(authSecret)
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey))
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256))
  const prkKey = await hmac(auth, ecdh)
  const ikm = await hmac(prkKey, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1])))
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const prk = await hmac(salt, ikm)
  const cek = (await hmac(prk, concat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16)
  const nonce = (await hmac(prk, concat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12)
  const key = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(payload, new Uint8Array([2]))))
  const header = new Uint8Array(16 + 4 + 1 + asPublic.length)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, 4096)
  header[20] = asPublic.length
  header.set(asPublic, 21)
  return concat(header, sealed)
}

/* One notification to every device of these people. Gone devices (404 / 410) are forgotten. */
async function deliver(admin: any, userIds: string[], build: (sub: any) => any, opts: { ttl?: number; urgency?: string; topic?: string } = {}) {
  if (!userIds.length) return { sent: 0, devices: 0 }
  const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth, app, user_id').in('user_id', userIds)
  if (!subs?.length) return { sent: 0, devices: 0 }
  const v = await getVapid(admin)
  let sent = 0
  const gone: string[] = []
  const ok: string[] = []
  await Promise.all(subs.map(async (s: any) => {
    try {
      const body = await encrypt(enc.encode(JSON.stringify(build(s))), s.p256dh, s.auth)
      const res = await fetch(s.endpoint, {
        method: 'POST',
        headers: {
          Authorization: await vapidHeader(s.endpoint, v),
          'Content-Encoding': 'aes128gcm',
          'Content-Type': 'application/octet-stream',
          TTL: String(opts.ttl ?? 86400),
          Urgency: opts.urgency || 'normal',
          ...(opts.topic ? { Topic: opts.topic } : {}),
        },
        body,
      })
      if (res.status === 404 || res.status === 410) gone.push(s.id)
      else if (res.ok) { sent++; ok.push(s.id) }
      else console.log('push refused', res.status, await res.text().catch(() => ''))
    } catch (e) {
      console.log('push failed', (e as Error).message)
    }
  }))
  if (gone.length) await admin.from('push_subscriptions').delete().in('id', gone)
  if (ok.length) await admin.from('push_subscriptions').update({ last_ok_at: new Date().toISOString() }).in('id', ok)
  return { sent, devices: subs.length }
}

/* Where a tap on the notification opens: TML Chat's own page or the app's chat, on that room. */
const roomUrl = (sub: any, room: string, extra = '') => (sub.app === 'chat'
  ? `chat.html#/chat-window/${encodeURIComponent(room)}${extra}`
  : `#/chat/${encodeURIComponent(room)}${extra}`)

const short = (s: string, n = 140) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }

/* What a message says on the lock screen when it is not text. */
function preview(m: any) {
  const text = short(m.text)
  if (text) return text
  const a = Array.isArray(m.attachments) ? m.attachments : []
  if (!a.length) return 'New message'
  const t = String(a[0].type || a[0].kind || '')
  if (t.startsWith('image')) return a.length > 1 ? `📷 ${a.length} photos` : '📷 Photo'
  if (t.startsWith('video')) return '🎬 Video'
  if (t.startsWith('audio') || a[0].voice) return '🎤 Voice message'
  return `📎 ${a[0].name || 'File'}`
}

async function roomName(db: any, chatId: string) {
  if (!chatId || chatId === 'team') return 'Team'
  if (chatId.startsWith('p:')) {
    const { data } = await db.from('projects').select('data').eq('id', chatId.slice(2)).maybeSingle()
    return data?.data?.title || 'Project'
  }
  if (chatId.startsWith('d:')) return ''
  const { data } = await db.from('chats').select('name').eq('id', chatId).maybeSingle()
  return data?.name || 'Group'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const url = Deno.env.get('SUPABASE_URL') || ''
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!service) return json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing from the function.' }, 500)
  const auth = req.headers.get('Authorization') || ''
  const apikey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || ''
  const db = createClient(url, apikey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const admin = createClient(url, service, { auth: { persistSession: false } })
  const { data: userData } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ''))
  const uid = userData?.user?.id
  if (!uid) return json({ error: 'Not signed in.' }, 401)

  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '')
    // my name as the team knows it (members.name), never what the browser claims
    const me = async () => {
      const { data } = await db.from('members').select('name').eq('user_id', uid).limit(1)
      return data?.[0]?.name || 'Someone'
    }

    if (action === 'key') return json({ publicKey: (await getVapid(admin)).publicKey })

    if (action === 'test') {
      const r = await deliver(admin, [uid], () => ({ type: 'test', title: 'Notifications are on', body: 'Calls and messages will reach this device with the app closed.', tag: 'test', url: '' }))
      return json({ ok: true, ...r })
    }

    if (action === 'message') {
      // read under the sender's own rules: it must exist, be theirs and be in a room they are in
      const { data: m } = await db.from('messages').select('id, user_id, chat_id, text, attachments').eq('id', String(body.id || '')).maybeSingle()
      if (!m || m.user_id !== uid) return json({ error: 'No such message of yours.' }, 403)
      const chatId = m.chat_id || 'team'
      const { data: rec, error } = await db.rpc('push_recipients', { p_chat: chatId })
      if (error) return json({ error: error.message }, 500)
      const ids = (rec || []).map((r: any) => (typeof r === 'string' ? r : r.push_recipients || Object.values(r)[0])).filter(Boolean)
      const [name, room] = await Promise.all([me(), roomName(db, chatId)])
      const r = await deliver(admin, ids, (sub) => ({
        type: 'message', room: chatId, id: m.id,
        title: room ? `${name} · ${room}` : name,
        body: preview(m), tag: `room:${chatId}`, url: roomUrl(sub, chatId),
      }))
      return json({ ok: true, ...r })
    }

    if (action === 'call' || action === 'call_missed') {
      const chatId = String(body.chatId || '')
      const callId = String(body.callId || '').slice(0, 40)
      if (!chatId || !callId) return json({ error: 'No call.' }, 400)
      let ids: string[] = []
      let group = ''
      if (chatId.startsWith('d:')) {
        // a direct room the caller is in (its id is the two member ids)
        const pair = chatId.slice(2).split(':')
        if (pair.length !== 2 || !pair.includes(uid)) return json({ error: 'Not your conversation.' }, 403)
        const other = pair.find((x) => x !== uid) as string
        const { data: same } = await db.from('members').select('user_id').eq('user_id', other).eq('active', true).limit(1)
        if (!same?.length) return json({ error: 'Not someone of your team.' }, 403)
        ids = [other]
      } else {
        // a group call: everyone who may read that room, under the caller's own rules
        const { data: rec, error } = await db.rpc('push_recipients', { p_chat: chatId })
        if (error) return json({ error: error.message }, 500)
        ids = (rec || []).map((r: any) => (typeof r === 'string' ? r : r.push_recipients || Object.values(r)[0])).filter(Boolean)
        group = (await roomName(db, chatId)) || 'the group'
      }
      const name = await me()
      const kind = `${group ? 'group ' : ''}${body.video ? 'video call' : 'voice call'}`
      const missed = action === 'call_missed'
      const r = await deliver(admin, ids, (sub) => ({
        type: missed ? 'missed' : 'call', room: chatId, callId, from: uid, video: !!body.video,
        title: missed ? `Missed ${kind}` : group ? `${name} · ${group}` : `${name}`,
        body: missed ? (group ? `${name} called ${group}.` : `${name} called you.`) : `Incoming ${kind} · tap to answer`,
        tag: `call:${callId}`,
        url: roomUrl(sub, chatId, missed ? '' : `?call=${encodeURIComponent(callId)}&from=${encodeURIComponent(uid)}`),
      }), missed ? { ttl: 86400, urgency: 'normal' } : { ttl: 60, urgency: 'high' })
      return json({ ok: true, ...r })
    }

    return json({ error: `Unknown action "${action}".` }, 400)
  } catch (e) {
    return json({ error: (e as Error).message || 'Push failed.' }, 500)
  }
})
