// THEMADLIONS Projects · the door for other apps (Supabase Edge Function "hub-bridge")
//
// Alex (22 Nov 2026): "a key from the hub, put in RoarMe, and every location made there goes straight into the hub".
// An app sends the key (made in Settings > Integrations > Connected apps; supabase/roarme-bridge.sql) in x-hub-key.
// The hub keeps only its SHA-256; a removed key is refused. What it can do, in this workspace only:
//   hello                      -> the workspace's name
//   location.put { ext, loc, photos: [{ id, url }], from }
//                              -> one entry of the library's locations, the same id for the same ext every time
//                                 (so a change updates it), new photos copied into the public thumbs bucket
//   location.delete { ext }    -> takes that entry away, only if it came from an app
//   projects.list              -> every project: id, title, status, startDate, code, createdAt, the RoarMe group it is tied to,
//                                 whether it was unlinked (from either side; Alex, 22 Nov: a delete or Unlink only unties)
//   project.get { id }         -> the project's title, status, startDate, category, client, artist, tasks, locations (with
//                                 libPhotos, the library's photos, when a location has none of its own), cover (coverThumb) and
//                                 music (each song with a link good for a day: pCloud through the pcloud function, or audio),
//                                 photoLinks (whole photos of the places) and ordinos (the published ones, with the crew's link)
//   project.create { title, status, startDate, category, room } -> a new project with the next TML-YYYY-NNN code
//   project.put { id, set, tasks?, locations? } -> sets title / status / startDate / category / roarme ({ room } or
//                                 { unlinked: true }) and, when sent,
//                                 replaces the project's tasks and locations (the caller merged them; Production Hub,
//                                 Alex 22 Nov: every group in RoarMe's PROJECTS is a project of the hub, both ways)
//   cal.get { email, project, from, to, feeds } -> the hub's Calendar as that member sees it (types, who sees which
//                                 calendar, project access, their own days off), with the calendar feeds' texts when asked;
//                                 an email that is no member here gets only that project's events, to look at
//   cal.put { email, event } / cal.delete { email, id } -> as the hub's Calendar saves: the member's calendar right, or their
//                                 own day off (an administrator anyone's)
// Photos are fetched only from RoarMe's own storage. Deploy with verify_jwt off (the key is the check).

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const PHOTO_HOSTS = ['bzmjhbnwhdwmncxkqkdl.supabase.co']
const TYPES = ['Interior', 'Exterior', 'Both']
// the budget's categories when Settings holds none (as src/lib/budgetCats.js DEFAULT_GROUPS)
const DEFAULT_CATS = [
  { cats: ['Story & rights', 'Producer', 'Director', 'Cast', 'Casting'].map((name) => ({ name })) },
  { cats: ['Production staff', 'Extras', 'Camera', 'Lighting', 'Grip', 'Sound', 'Art & set', 'Props', 'Wardrobe', 'Makeup & hair', 'Locations', 'Studio', 'Transport', 'Catering', 'Equipment rental', 'Production office', 'Travel & accommodation'].map((name) => ({ name })) },
  { cats: ['Editing', 'Color', 'Sound post', 'Music', 'VFX', 'Titles & graphics', 'Deliverables', 'Subtitles'].map((name) => ({ name })) },
  { cats: ['Insurance', 'Legal & accounting', 'Marketing', 'Festival & distribution', 'Contingency', 'Misc'].map((name) => ({ name })) },
]

// a link to a pCloud file that plays without signing in, made the same way as the pcloud function's own (supabase/functions/pcloud,
// sig / signed): that function passes the file on, since a pCloud link works only from the address that asked for it
const FULL = Deno.env.get('PCLOUD_FULL_TOKEN') || ''
let signKey: CryptoKey | null = null
async function pcloudSigned(fileid: number | string, hours = 24) {
  return pcloudSignedAt(fileid, Math.floor(Date.now() / 1000) + hours * 3600)
}
async function pcloudSignedAt(fileid: number | string, until: number) {
  if (!FULL) return ''
  const enc = new TextEncoder()
  signKey ||= await crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', enc.encode('pcloud-stream:' + FULL)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const t = `file.${fileid}.${until}`
  const b = new Uint8Array(await crypto.subtle.sign('HMAC', signKey, enc.encode(t)))
  const sig = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, 32)
  return `${Deno.env.get('SUPABASE_URL')}/functions/v1/pcloud?s=${t}.${sig}`
}

const hex = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('')
const str = (v: any, n = 300) => (typeof v === 'string' ? v.slice(0, n) : v == null ? '' : String(v).slice(0, n))

// ---------- the Calendar for RoarMe (Alex, 25 Nov: "the hub's calendar in the project's Overview, exactly, talking to it") ----------
// as src/lib/store.jsx EVENT_TYPES / eventTypesOf / canSeeCalendar / can, and src/lib/ical.js liveFeeds
const EVENT_TYPES = [
  { key: 'shoot', label: 'Shoot day', color: '#C8503F' }, { key: 'prep', label: 'Prep', color: '#D9A441' },
  { key: 'scout', label: 'Location scout', color: '#5B9E7A' }, { key: 'casting', label: 'Casting', color: '#B07FD1' },
  { key: 'rehearsal', label: 'Rehearsal', color: '#E08A5A' }, { key: 'meeting', label: 'Meeting', color: '#6C9BD1' },
  { key: 'post', label: 'Post', color: '#4FB3BF' }, { key: 'delivery', label: 'Delivery', color: '#9AA0A6' },
  { key: 'google', label: 'From Google Calendar', color: '#4285F4' }, { key: 'unavailable', label: 'Not available', color: '#6B7280' },
]
const FIXED_TYPES = ['shoot', 'google', 'unavailable']
function typesOf(settings: any) {
  const saved = Array.isArray(settings?.eventTypes) ? settings.eventTypes.filter((t: any) => t && t.key) : []
  if (!saved.length) return EVENT_TYPES
  const list = [...saved]
  EVENT_TYPES.filter((t) => FIXED_TYPES.includes(t.key) && !list.some((x: any) => x.key === t.key)).forEach((t) => list.push(t))
  return list.filter((t: any) => !t.removed).map((t: any) => ({ key: str(t.key, 40), label: str(t.label, 80), color: str(t.color, 20) }))
}
const seesCal = (settings: any, u: any, key: string) => {
  if (!u) return false
  if (u.role === 'admin') return true
  const list = settings?.calendarAccess?.[key]
  return !Array.isArray(list) || list.includes(u.id)
}
const seesEvent = (settings: any, u: any, e: any) => (e.type === 'unavailable' && !!u && e.personId === u.id) || seesCal(settings, u, e.feedId ? `feed:${e.feedId}` : e.type)
const ended = (u: any) => { const until = u?.permissions?.accessUntil; return !!u && u.role !== 'admin' && !!until && until < new Date().toISOString().slice(0, 10) }
const mayCal = (u: any, level: 'view' | 'edit') => { if (!u) return false; if (u.role === 'admin') return true; if (ended(u)) return false; const h = u.permissions?.calendar || 'none'; return level === 'view' ? h === 'view' || h === 'edit' : h === 'edit' }
const seesProject = (u: any, pid: string) => !!u && (u.role === 'admin' || u.project_access === 'all' || (Array.isArray(u.project_access) && u.project_access.includes(pid)))
const FEED_HOSTS = ['calendar.google.com', 'www.google.com', 'calendar.google.co.uk', 'outlook.office365.com', 'outlook.live.com', 'p01-caldav.icloud.com', 'webcal.icloud.com']
async function feedText(raw: string) {
  const check = (x: string) => { const u = new URL(String(x).trim().replace(/^webcal:\/\//i, 'https://')); if (u.protocol !== 'https:' || !FEED_HOSTS.includes(u.hostname.toLowerCase())) throw new Error('not a calendar host'); return u }
  const url = check(raw)
  let res = await fetch(url, { headers: { Accept: 'text/calendar, text/plain, */*' }, redirect: 'manual' })
  for (let hop = 0; hop < 5 && res.status >= 300 && res.status < 400 && res.headers.get('location'); hop++) res = await fetch(check(new URL(res.headers.get('location')!, url).toString()), { headers: { Accept: 'text/calendar, text/plain, */*' }, redirect: 'manual' })
  if (!res.ok) throw new Error(`The calendar service answered ${res.status}.`)
  const text = await res.text()
  if (text.length > 8 * 1024 * 1024 || !/BEGIN:VCALENDAR/i.test(text)) throw new Error('Not a calendar file.')
  return text
}
const ISO = /^\d{4}-\d{2}-\d{2}$/
const HM = /^([01]\d|2[0-3]):[0-5]\d$/
function cleanEvent(e: any) {
  const o: any = {
    id: str(e?.id, 60) || ('e' + Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('')),
    title: str(e?.title, 300), type: str(e?.type, 40) || 'meeting', date: str(e?.date, 10), endDate: ISO.test(str(e?.endDate, 10)) ? str(e?.endDate, 10) : '',
    start: e?.allDay ? '' : HM.test(str(e?.start, 5)) ? str(e?.start, 5) : '', end: e?.allDay ? '' : HM.test(str(e?.end, 5)) ? str(e?.end, 5) : '',
    projectId: str(e?.projectId, 60) || null, locationText: str(e?.locationText, 500), notes: str(e?.notes, 5000),
  }
  if (o.type === 'unavailable') o.personId = str(e?.personId, 60)
  if (!ISO.test(o.date)) throw new Error('The event needs a date.')
  if (o.endDate && o.endDate < o.date) o.endDate = ''
  return o
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const key = req.headers.get('x-hub-key') || ''
  if (!/^tmlhub_[0-9a-f]{48}$/.test(key)) return json({ error: 'This key is not right.' }, 401)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: k } = await db.from('hub_keys').select('id, workspace_id, revoked_at').eq('key_hash', await hex(key)).maybeSingle()
  if (!k || k.revoked_at) return json({ error: 'This key was removed in the hub, or never made there.' }, 401)
  const ws = k.workspace_id as string
  db.from('hub_keys').update({ last_used_at: new Date().toISOString() }).eq('id', k.id).then(() => {})
  let body: any
  try { body = await req.json() } catch { return json({ error: 'Nothing sent' }, 400) }
  const action = str(body?.action, 40)

  if (action === 'hello') {
    const { data: w } = await db.from('workspaces').select('name').eq('id', ws).maybeSingle()
    return json({ ok: true, workspace: w?.name || 'Hub' })
  }

  if (action === 'projects.list') {
    const { data: rows, error } = await db.from('projects').select('id, data, updated_at').eq('workspace_id', ws)
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true, projects: (rows || []).map((r: any) => ({ id: r.id, title: r.data?.title || '', status: r.data?.status || '', startDate: r.data?.startDate || '', code: r.data?.code || '', createdAt: r.data?.createdAt || '', room: r.data?.roarme?.room || '', request: r.data?.roarme?.request || '', unlinked: !!r.data?.roarme?.unlinked, delivered: r.data?.status === 'Delivered', updatedAt: r.updated_at })) })
  }
  // ---------- payments from RoarMe (Alex, 22 Nov: "My Payment and Expenses go straight to the hub") ----------
  //   pay.meta { id, email }                 -> who that email is in this hub, the budget's categories, the project
  //   pay.job { id, email, job }              -> a job in that member's My Finance (worklog) and, as the hub's own Add job
  //                                             does, a line paying them in the project's budget ("From My work")
  //   pay.receipt { id, email, receipt }     -> a receipt line in the project's budget with its photo or PDF (fetched only
  //                                             from RoarMe's storage, kept in the files bucket); paid by the member, a
  //                                             refund owed to them in My Finance
  if (action === 'pay.meta' || action === 'pay.job' || action === 'pay.receipt') {
    const pid = str(body?.id, 40)
    const { data: row } = await db.from('projects').select('data').eq('id', pid).eq('workspace_id', ws).maybeSingle()
    if (!row) return json({ error: 'That project is not in the hub any more.' }, 404)
    const d = row.data || {}
    const email = str(body?.email, 200).trim().toLowerCase()
    const { data: mem } = email ? await db.from('members').select('user_id, name, email, active').eq('workspace_id', ws).ilike('email', email.replace(/[\\%_]/g, (c) => `\\${c}`)).maybeSingle() : { data: null }
    const member = mem && mem.active !== false ? { id: mem.user_id, name: mem.name || email } : null
    const { data: w } = await db.from('workspaces').select('settings').eq('id', ws).maybeSingle()
    const g = Array.isArray(w?.settings?.budgetCategories) && w.settings.budgetCategories.length ? w.settings.budgetCategories : DEFAULT_CATS
    const categories: string[] = g.flatMap((x: any) => (x?.cats || []).map((c: any) => str(c?.name, 80))).filter(Boolean)
    const lines: any[] = Array.isArray(d.budget?.lines) ? d.budget.lines : []
    const paysYou = member ? lines.find((l: any) => l.memberId === member.id) : null
    if (action === 'pay.meta') return json({ ok: true, member, categories, project: { title: d.title || '', client: d.client || d.artist || '', startDate: d.startDate || '' }, paysYou: paysYou ? { amount: Number(paysYou.estimate) || 0, description: paysYou.description || '' } : null })
    const now = new Date().toISOString()
    const today = now.slice(0, 10)
    const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('')
    const saveLines = async (next: any[]) => {
      const nd = { ...d, budget: { ...(d.budget || {}), lines: next }, updatedAt: now }
      const { error } = await db.from('projects').update({ data: nd }).eq('id', pid).eq('workspace_id', ws)
      if (error) throw new Error(error.message)
    }
    try {
      if (action === 'pay.job') {
        if (!member) return json({ error: 'Your email is not a member of this hub, so a payment cannot reach your My Finance.' }, 403)
        const j = body?.job || {}
        const amount = Math.max(0, Number(j.amount) || 0)
        const date = /^\d{4}-\d{2}-\d{2}$/.test(str(j.date, 10)) ? str(j.date, 10) : (d.startDate || today)
        const paid = j.status === 'paid'
        if (paysYou) return json({ error: `This project already pays you in its budget${paysYou.description ? ` ("${paysYou.description}")` : ''}. Edit that one in My Finance.` }, 409)
        let budgetLineId = ''
        if (amount > 0) {
          const role = categories.includes(str(j.role, 80)) ? str(j.role, 80) : 'Production staff'
          const line = { id: rid(), category: role, description: str(j.description, 300) || member.name, qty: 1, unit: 'flat', rate: 0, estimate: amount, actual: '', vendor: member.name, memberId: member.id, date, notes: 'From My work' }
          await saveLines([...lines, line])
          budgetLineId = line.id
        }
        const id = rid()
        const job = { id, userId: member.id, date, client: d.client || d.artist || d.title || '', description: str(j.description, 300), amount, status: paid ? 'paid' : 'pending', paidDate: paid ? today : '', method: 'Cash', notes: str(j.notes, 2000), projectId: pid, createdAt: now, ...(budgetLineId ? { budgetLineId } : {}), source: 'roarme' }
        const { error } = await db.from('worklog').insert({ id, workspace_id: ws, user_id: member.id, data: job })
        if (error) throw new Error(error.message)
        return json({ ok: true, id })
      }
      // pay.receipt
      const r = body?.receipt || {}
      const total = Math.max(0, Number(r.total) || 0)
      if (!(total > 0)) return json({ error: 'Type the total paid.' }, 400)
      const vat = Math.max(0, Number(r.vatPct) || 0)
      const net = Math.round((total / (1 + vat / 100)) * 100) / 100
      const id = rid()
      let receipt: any = null
      if (r.file?.url) {
        let u: URL
        try { u = new URL(str(r.file.url, 2000)) } catch { return json({ error: 'The receipt file is not right.' }, 400) }
        if (u.protocol !== 'https:' || !PHOTO_HOSTS.includes(u.hostname)) return json({ error: 'The receipt file is not right.' }, 400)
        const fr = await fetch(u)
        if (!fr.ok) return json({ error: 'The receipt could not be read.' }, 400)
        const type = fr.headers.get('content-type') || str(r.file.type, 80) || 'application/octet-stream'
        const buf = new Uint8Array(await fr.arrayBuffer())
        if (buf.byteLength > 25_000_000) return json({ error: 'The receipt is too big.' }, 400)
        const name = (str(r.file.name, 120) || 'Receipt').replace(/[^\wͰ-Ͽἀ-῿ .-]+/g, '').trim() || 'Receipt'
        const path = `${pid}/${id}-${name}`
        const up = await db.storage.from('files').upload(path, buf, { contentType: type, upsert: true })
        if (up.error) throw new Error(up.error.message)
        receipt = { id, name, type, size: buf.byteLength, path, thumb: '', addedAt: now, addedBy: member?.id || '', addedByName: member?.name || '' }
      }
      const byMe = r.payer === 'me' && member
      const shop = str(r.shop, 200).trim()
      const description = str(r.description, 300).trim() || str(r.category, 80) || 'Expense'
      const date = /^\d{4}-\d{2}-\d{2}$/.test(str(r.date, 10)) ? str(r.date, 10) : today
      const line = {
        id, category: categories.includes(str(r.category, 80)) ? str(r.category, 80) : 'Misc', description, qty: 1, unit: 'flat', rate: 0,
        estimate: net, vatPct: vat || '', actual: '', vendor: byMe ? member!.name : shop, memberId: byMe ? member!.id : '', contactId: '', locationId: '',
        date, notes: [byMe && shop ? `Receipt from ${shop}` : '', str(r.notes, 2000).trim(), 'From RoarMe'].filter(Boolean).join(' · '),
        ...(receipt ? { receipt } : {}), ...(byMe ? { reimburse: true } : {}),
      }
      await saveLines([...lines, line])
      if (byMe) {
        const wid = rid()
        const job = { id: wid, createdAt: now, userId: member!.id, budgetLineId: id, projectId: pid, date, client: d.client || d.title || '', description: `Refund · ${d.client ? `${d.title} · ${description}` : description}`, amount: total, notes: '', method: 'Bank transfer', status: 'pending', paidDate: '' }
        await db.from('worklog').insert({ id: wid, workspace_id: ws, user_id: member!.id, data: job })
      }
      return json({ ok: true, id })
    } catch (e) { return json({ error: (e as Error).message }, 500) }
  }

  if (action === 'cal.get' || action === 'cal.put' || action === 'cal.delete') {
    const email = str(body?.email, 200).trim().toLowerCase()
    const { data: mem } = email ? await db.from('members').select('user_id, name, email, role, permissions, project_access, active').eq('workspace_id', ws).ilike('email', email.replace(/[\\%_]/g, (c) => `\\${c}`)).maybeSingle() : { data: null }
    const me = mem && mem.active !== false ? { id: mem.user_id, name: mem.name || email, role: mem.role, permissions: mem.permissions || {}, project_access: mem.project_access } : null
    const { data: w } = await db.from('workspaces').select('settings').eq('id', ws).maybeSingle()
    const st = w?.settings || {}
    const pid = str(body?.project, 60)
    const isAdmin = me?.role === 'admin'
    const canEdit = mayCal(me, 'edit')
    if (action === 'cal.get') {
      const from = ISO.test(str(body?.from, 10)) ? str(body.from, 10) : '0000-01-01'
      const to = ISO.test(str(body?.to, 10)) ? str(body.to, 10) : '9999-12-31'
      let q = db.from('events').select('id, project_id, data').eq('workspace_id', ws)
      if (!me || !mayCal(me, 'view')) q = q.eq('project_id', pid || '-')
      const { data: rows, error } = await q
      if (error) return json({ error: error.message }, 500)
      const events = (rows || []).map((r: any) => ({ ...(r.data || {}), id: r.id, projectId: r.project_id || r.data?.projectId || null }))
        .filter((e: any) => (e.endDate || e.date || '') >= from && (e.date || '') <= to)
        .filter((e: any) => (me && mayCal(me, 'view') ? (!e.projectId || seesProject(me, e.projectId)) && seesEvent(st, me, e) : e.projectId === pid && e.type !== 'unavailable'))
      const { data: prows } = await db.from('projects').select('id, data').eq('workspace_id', ws)
      const projects = (prows || []).filter((p: any) => (me ? seesProject(me, p.id) : p.id === pid)).map((p: any) => ({ id: p.id, title: p.data?.title || '' }))
      const { data: mrows } = await db.from('members').select('user_id, name, active').eq('workspace_id', ws)
      const people = (mrows || []).filter((m: any) => m.active !== false).map((m: any) => ({ id: m.user_id, name: m.name || '' }))
      const feedList = me && mayCal(me, 'view') && st.calendarFeedsOff !== true ? (st.calendarFeeds || []).filter((f: any) => f && f.url && !f.off && seesCal(st, me, `feed:${f.id}`)) : []
      const feeds = await Promise.all(feedList.map(async (f: any) => {
        const base = { id: str(f.id, 60), name: str(f.name, 120) || 'Calendar', color: str(f.color, 20) || '#6C9BD1' }
        if (!body?.feeds) return base
        try { return { ...base, text: await feedText(f.url) } } catch (e) { return { ...base, error: (e as Error).message } }
      }))
      return json({ ok: true, project: pid, me: me ? { id: me.id, name: me.name, admin: isAdmin, edit: canEdit } : null, types: typesOf(st), projects, people, events, feeds, weekStart: st.weekStart || 'monday', greekHolidays: st.greekHolidays !== false })
    }
    if (!me) return json({ error: 'Your email is not a member of this hub, so the calendar can only be looked at.' }, 403)
    const may = (e: any) => (e?.feedId ? false : e?.type === 'unavailable' ? isAdmin || e.personId === me.id : canEdit)
    if (action === 'cal.delete') {
      const id = str(body?.id, 60)
      const { data: row } = await db.from('events').select('data').eq('id', id).eq('workspace_id', ws).maybeSingle()
      if (!row) return json({ ok: true })
      if (!may(row.data)) return json({ error: 'You cannot delete this event.' }, 403)
      await db.from('events').delete().eq('id', id).eq('workspace_id', ws)
      return json({ ok: true })
    }
    try {
      const e = cleanEvent(body?.event || {})
      if (e.type === 'unavailable' && !isAdmin) e.personId = me.id
      if (!may(e)) return json({ error: 'You cannot change the calendar.' }, 403)
      if (e.projectId && !seesProject(me, e.projectId)) return json({ error: 'That project is not yours to see.' }, 403)
      const { data: old } = await db.from('events').select('data, workspace_id').eq('id', e.id).maybeSingle()
      if (old && old.workspace_id !== ws) return json({ error: 'Not this hub.' }, 403)
      if (old && !may(old.data)) return json({ error: 'You cannot change this event.' }, 403)
      const data: any = { ...(old?.data || {}), ...e }
      if (!old) { data.createdBy = me.id; data.createdByName = me.name }
      if (e.type === 'unavailable') { const { data: who } = await db.from('members').select('name').eq('workspace_id', ws).eq('user_id', e.personId).maybeSingle(); data.personName = who?.name || '' }
      const { error } = await db.from('events').upsert({ id: e.id, workspace_id: ws, project_id: e.projectId || null, data })
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true, event: data })
    } catch (x) { return json({ error: (x as Error).message }, 400) }
  }

  if (action === 'project.get' || action === 'project.put') {
    const pid = str(body?.id, 40)
    const { data: row } = await db.from('projects').select('data, updated_at').eq('id', pid).eq('workspace_id', ws).maybeSingle()
    if (!row) return json({ error: 'That project is not in the hub any more.' }, 404)
    const d = row.data || {}
    if (action === 'project.get') {
      // a location tied to the library with no photos of its own shows the library's (RoarMe's Location Scout shows them)
      const locs: any[] = Array.isArray(d.locations) ? d.locations : []
      const libIds = locs.filter((l) => l.libraryId && !(l.photos || []).length).map((l) => l.libraryId)
      const lib: Record<string, any[]> = {}
      if (libIds.length) {
        const { data: rows } = await db.from('library').select('id, data').eq('workspace_id', ws).in('id', libIds)
        for (const r of rows || []) lib[r.id] = (r.data?.photos || [])
      }
      // the project's songs, each with a link that plays for a day (Alex, 22 Nov: "the song should be in RoarMe too")
      const music: any[] = []
      for (const t of ((d.music?.tracks || []) as any[]).slice(0, 30)) {
        let url = ''
        if (t.fileid) url = await pcloudSigned(t.fileid)
        else if (t.path) { const { data: su } = await db.storage.from('audio').createSignedUrl(t.path, 86400); url = su?.signedUrl || '' }
        if (!url) continue
        const pk: number[] = Array.isArray(t.peaks) ? t.peaks : []
        const peaks = pk.length > 240 ? Array.from({ length: 240 }, (_, i) => pk[Math.floor(i * pk.length / 240)]) : pk
        // keep: a link that lasts two to three months (changing once a month), for a song sent on into another chat
        const keepUntil = (Math.floor(Date.now() / 1000 / 2592000) + 3) * 2592000
        let keep = ''
        if (t.fileid) keep = await pcloudSignedAt(t.fileid, keepUntil)
        else if (t.path) { const { data: sk } = await db.storage.from('audio').createSignedUrl(t.path, keepUntil - Math.floor(Date.now() / 1000)); keep = sk?.signedUrl || '' }
        music.push({ id: t.id, name: `${t.name || 'Song'}.${t.ext || 'mp3'}`, ext: t.ext || '', kind: t.kind || '', bytes: t.bytes || 0, duration: t.duration || 0, peaks, url, keep, addedAt: t.addedAt || '', until: Date.now() + 86000 * 1000 })
      }
      // the whole photos of the places, for RoarMe's viewer (Alex, 22 Nov: "the photos are very small"): pCloud links that
      // last a month and change only once a month, so the scouts kept in RoarMe do not change on every sync
      const photoLinks: Record<string, string> = {}
      const until = (Math.floor(Date.now() / 1000 / 2592000) + 2) * 2592000
      for (const l of locs) for (const p of [...(l.photos || []), ...(lib[l.libraryId] || [])].slice(0, 80)) {
        if (p?.id && p.fileid && !photoLinks[p.id]) photoLinks[p.id] = await pcloudSignedAt(p.fileid, until)
      }
      // the project's published ordinos (Roardino in the hub), each with the crew's link (Alex, 22 Nov)
      const { data: ords } = await db.from('roardino_ordinos').select('token, published, published_at').eq('workspace_id', ws).eq('project_id', pid).not('published_at', 'is', null).order('published_at', { ascending: false }).limit(10)
      const ordinos = (ords || []).filter((o: any) => o.token).map((o: any) => {
        const pb = o.published || {}, dy = pb.day || {}, lc = pb.loc || {}
        return { token: o.token, url: `https://go.themadlions.com/?o/${o.token}`, label: str(dy.label, 60) || 'Ordino', title: str(pb.project?.title, 200).trim(), artist: str(pb.project?.artist, 200).trim(), date: str(dy.date, 20), call: str(dy.callTime, 10), place: str(lc.name, 200).trim(), accent: str(pb.look?.accent, 20), hub: true }
      })
      return json({ ok: true, project: { ordinos, photoLinks, id: pid, title: d.title || '', status: d.status || '', startDate: d.startDate || '', category: d.category || '', client: d.client || '', artist: d.artist || '', code: d.code || '', tasks: d.tasks || [], locations: locs.map((l) => (lib[l.libraryId] ? { ...l, libPhotos: lib[l.libraryId] } : l)), cover: d.coverThumb || '', music, roarme: d.roarme || null, updatedAt: row.updated_at } })
    }
    const set = body?.set || {}
    const next: any = { ...d, updatedAt: new Date().toISOString() }
    for (const k of ['title', 'status', 'startDate', 'category']) if (typeof set[k] === 'string') next[k] = set[k].slice(0, 300)
    if (set.roarme && typeof set.roarme === 'object') next.roarme = set.roarme.unlinked ? { unlinked: new Date().toISOString() } : { room: str(set.roarme.room, 60) }
    if (Array.isArray(body?.tasks)) next.tasks = body.tasks.slice(0, 2000)
    if (Array.isArray(body?.locations)) next.locations = body.locations.slice(0, 500)
    const { error } = await db.from('projects').update({ data: next }).eq('id', pid).eq('workspace_id', ws)
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true })
  }
  if (action === 'project.create') {
    const { data: rows } = await db.from('projects').select('data').eq('workspace_id', ws)
    const { data: w } = await db.from('workspaces').select('settings').eq('id', ws).maybeSingle()
    const prefix = String(w?.settings?.projectCodePrefix ?? 'TML').trim()
    const year = new Date().getFullYear()
    const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-${year}-(\\d+)$`, 'i')
    const used = (rows || []).map((r: any) => re.exec(r.data?.code || '')).filter(Boolean).map((m: any) => Number(m[1]))
    const code = prefix ? `${prefix}-${year}-${String(Math.max(0, ...used) + 1).padStart(3, '0')}` : ''
    const id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('')
    const now = new Date().toISOString()
    const data = {
      id, title: str(body?.title, 300) || 'Untitled project', category: str(body?.category, 60) || 'Music Video', status: str(body?.status, 60) || 'Development',
      client: '', director: '', producer: '', startDate: str(body?.startDate, 20), endDate: '', notes: '', code, color: '#C8503F', createdAt: now, updatedAt: now,
      script: { text: '', fileName: '', format: '', importedAt: '' }, scenes: [], shootingDays: [], locations: [], contacts: [], shots: [], tasks: [],
      budget: { lines: [], contingencyPct: 10, currency: 'EUR', cap: '' }, gear: [], vendors: [], post: { cuts: [], deliverables: [] }, scriptVersions: [],
      music: { tracks: [], activeTrackId: '', sections: [], notes: '' }, breakdownStatus: 'none', hiddenTabs: [],
      roarme: { room: str(body?.room, 60) },
    }
    const { error } = await db.from('projects').insert({ id, workspace_id: ws, data })
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true, id, code })
  }

  const ext = str(body?.ext, 200)
  if (!ext) return json({ error: 'No ext' }, 400)
  const id = 'rm' + (await hex(`${ws}|${ext}`)).slice(0, 12)

  if (action === 'location.delete') {
    const { data: row } = await db.from('library').select('data').eq('id', id).eq('workspace_id', ws).maybeSingle()
    if (row?.data?.source?.app) await db.from('library').delete().eq('id', id).eq('workspace_id', ws)
    return json({ ok: true })
  }

  if (action === 'location.put') {
    const l = body?.loc || {}
    const { data: row } = await db.from('library').select('data').eq('id', id).eq('workspace_id', ws).maybeSingle()
    const old = row?.data || {}
    const had: Record<string, any> = Object.fromEntries((old.photos || []).map((p: any) => [p.id, p]))
    const photos: any[] = []
    for (const p of (Array.isArray(body?.photos) ? body.photos : []).slice(0, 40)) {
      const pid = 'rm' + str(p?.id, 80).replace(/[^\w-]/g, '').slice(0, 40)
      if (had[pid]) { photos.push(had[pid]); continue }
      let u: URL
      try { u = new URL(str(p?.url, 2000)) } catch { continue }
      if (u.protocol !== 'https:' || !PHOTO_HOSTS.includes(u.hostname)) continue
      try {
        const r = await fetch(u)
        if (!r.ok) continue
        const type = r.headers.get('content-type') || 'image/jpeg'
        if (!/^image\/(jpeg|png|webp|gif)/.test(type)) continue
        const buf = new Uint8Array(await r.arrayBuffer())
        if (buf.byteLength > 2_000_000) continue
        const path = `${ws}/${pid}.${type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'}`
        const up = await db.storage.from('thumbs').upload(path, buf, { contentType: type, upsert: true })
        if (up.error) continue
        const thumb = db.storage.from('thumbs').getPublicUrl(path).data.publicUrl
        photos.push({ id: pid, path: '', inline: '', thumb, w: Number(p?.w) || 0, h: Number(p?.h) || 0, bytes: buf.byteLength, caption: '', scope: { id: 'library', kind: 'library' }, addedAt: new Date().toISOString() })
      } catch { /* a photo that cannot be read is left out */ }
    }
    const data = {
      ...old,
      id,
      name: str(l.name, 200) || 'Location',
      address: str(l.address, 300),
      type: TYPES.includes(l.type) ? l.type : (old.type || 'Interior'),
      contact: str(l.contact, 200),
      phone: str(l.phone, 60),
      notes: str(l.notes, 4000),
      mapsUrl: str(l.mapsUrl, 1000),
      lat: str(l.lat, 30),
      lon: str(l.lon, 30),
      coordsText: old.coordsText || '',
      tags: (Array.isArray(l.tags) ? l.tags : []).map((t: any) => str(t, 40)).filter(Boolean).slice(0, 20),
      photos,
      createdAt: old.createdAt || new Date().toISOString(),
      source: { app: str(body?.from?.app, 30) || 'roarme', project: str(body?.from?.project, 200), ext },
    }
    const { error } = await db.from('library').upsert({ id, workspace_id: ws, kind: 'location', data })
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true, id })
  }

  return json({ error: 'Unknown action' }, 400)
})
