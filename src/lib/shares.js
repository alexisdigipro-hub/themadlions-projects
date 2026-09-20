import { remote, supabase } from './supabase.js'

const token = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('')
export const shareUrl = (t) => `${location.origin}${location.pathname}#/s/${t}`
export const deliveryUrl = (t) => `${location.origin}${location.pathname}#/d/${t}`
export const statusUrl = (t) => `${location.origin}${location.pathname}#/ps/${t}`
export const estimateUrl = (t) => `${location.origin}${location.pathname}#/e/${t}`
/* publishShare hands back a /s/ url; a delivery needs the token out of it to build its own. */
export const tokenOf = (url) => String(url || '').split('/').filter(Boolean).pop() || ''

/* Creates or refreshes the public snapshot for ref and returns its URL (same link every time for the same ref). */
export async function publishShare({ workspaceId, kind, ref, data, userId }) {
  if (!remote) throw new Error('Share links need the team workspace on Supabase. In this browser-only mode use Print / Save PDF.')
  const { data: existing, error: e1 } = await supabase.from('shares').select('token').eq('workspace_id', workspaceId).eq('ref', ref).maybeSingle()
  if (e1 && e1.code === '42P01') throw new Error('Run supabase/shares.sql in the Supabase SQL editor to enable share links.')
  if (e1) throw e1
  const t = existing?.token || token()
  const { error } = await supabase.from('shares').upsert({ token: t, workspace_id: workspaceId, kind, ref, data, created_by: userId || null, updated_at: new Date().toISOString() }, { onConflict: 'token' })
  if (error) throw error
  return shareUrl(t)
}

/* A delivery sent to several people is several rows, `delivery:<id>` plus `delivery:<id>:r1` and so
   on, so deleting or closing one means the whole family: the row itself and anything under it. */
const family = (q, ref) => q.or(`ref.eq.${ref},ref.like.${ref}:%`)

export async function removeShare({ workspaceId, ref }) {
  if (!remote) return
  await family(supabase.from('shares').delete().eq('workspace_id', workspaceId), ref)
}

export async function fetchShare(t) {
  if (!remote) throw new Error('Not available in this mode.')
  const { data, error } = await supabase.rpc('share_get', { p_token: t })
  if (error) throw error
  return data
}

/* Every public link the team has published, newest first: delivery pages and call sheet pages
   together, because Alex wanted one place that shows what is out there. Members read the shares
   table directly; only the client's replies come through a function.
   select('*') on purpose: opens, closed and responses only exist once the matching SQL file has
   been run, and asking for them by name would fail the whole query instead of just missing them. */
export async function listShares(workspaceId) {
  if (!remote) return []
  const { data, error } = await supabase
    .from('shares')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
  if (error && error.code === '42P01') throw new Error('Run supabase/shares.sql in the Supabase SQL editor to enable share links.')
  if (error) throw error
  return data || []
}

/* Closing a link, reopening it, or giving it a date to close itself. */
export async function setShareState({ workspaceId, ref, closed, expiresAt, one = false }) {
  if (!remote) return
  const patch = {}
  if (closed !== undefined) patch.closed = !!closed
  if (expiresAt !== undefined) patch.expires_at = expiresAt || null
  if (!Object.keys(patch).length) return
  const base = supabase.from('shares').update(patch).eq('workspace_id', workspaceId)
  const { error } = await (one ? base.eq('ref', ref) : family(base, ref))
  if (error) throw new Error(error.code === '42703' ? 'Run supabase/share_track.sql in the Supabase SQL editor to close and reopen links.' : error.message)
}

/* Publishing again means the link should work again. Quiet on purpose: if share_track.sql has not
   been run there is no closed column to clear, and that must not break publishing. */
export async function reopenQuietly({ workspaceId, ref }) {
  try {
    await setShareState({ workspaceId, ref, closed: false })
  } catch {
    /* no closed column yet, nothing to reopen */
  }
}

/* The client approving or asking for changes. The only write anyone without an account can make. */
export async function respondToDelivery({ token, name, status, note }) {
  if (!remote) throw new Error('Not available in this mode.')
  const { error } = await supabase.rpc('share_respond', { p_token: token, p_name: name || '', p_status: status, p_note: note || '' })
  if (error) throw new Error(error.code === '42883' || error.code === 'PGRST202' ? 'This page is not ready to take replies yet. Ask the production to run supabase/deliveries.sql.' : error.message)
}
