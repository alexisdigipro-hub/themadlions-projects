import { remote, supabase } from './supabase.js'

const token = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('')
export const shareUrl = (t) => `${location.origin}${location.pathname}#/s/${t}`

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
