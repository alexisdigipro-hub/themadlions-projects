import { createClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from './supabaseConfig.js'

export const remote = !!(SUPABASE_URL && SUPABASE_KEY)
export const supabase = remote ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null
