import { remote, supabase } from './supabase.js'

const token = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('')
export const shareUrl = (t) => `${location.origin}${location.pathname}#/s/${t}`
export const deliveryUrl = (t) => `${location.origin}${location.pathname}#/d/${t}`
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

export async function removeShare({ workspaceId, ref }) {
  if (!remote) return
  await supabase.from('shares').delete().eq('workspace_id', workspaceId).eq('ref', ref)
}

export async function fetchShare(t) {
  if (!remote) throw new Error('Not available in this mode.')
  const { data, error } = await supabase.rpc('share_get', { p_token: t })
  if (error) throw error
  return data
}

/* Every delivery page the team has published, newest first. Members read the shares table
   directly; only the client's replies come through a function. */
export async function listDeliveries(workspaceId) {
  if (!remote) return []
  const { data, error } = await supabase
    .from('shares')
    .select('token, ref, data, responses, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .eq('kind', 'delivery')
    .order('updated_at', { ascending: false })
  if (error && error.code === '42P01') throw new Error('Run supabase/shares.sql in the Supabase SQL editor to enable share links.')
  if (error && error.code === '42703') throw new Error('Run supabase/deliveries.sql in the Supabase SQL editor to enable delivery pages.')
  if (error) throw error
  return data || []
}

/* The client approving or asking for changes. The only write anyone without an account can make. */
export async function respondToDelivery({ token, name, status, note }) {
  if (!remote) throw new Error('Not available in this mode.')
  const { error } = await supabase.rpc('share_respond', { p_token: token, p_name: name || '', p_status: status, p_note: note || '' })
  if (error) throw new Error(error.code === '42883' || error.code === 'PGRST202' ? 'This page is not ready to take replies yet. Ask the production to run supabase/deliveries.sql.' : error.message)
}
