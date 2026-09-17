// Public Supabase configuration. The publishable key is safe to ship in the browser:
// what each user can read or change is enforced by Row Level Security in supabase/schema.sql.
// Build with VITE_LOCAL_MODE=1 to run the app in local (single browser) mode.
const local = !!import.meta.env.VITE_LOCAL_MODE
export const SUPABASE_URL = local ? '' : 'https://naibamqexcqnqhbbqafa.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_o1OB_ohozPq1Xr2jg2ZSHA_3GsusXFL'
