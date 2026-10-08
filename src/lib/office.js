// Word, Excel and PowerPoint inside the app through the "office" Edge Function
// (supabase/functions/office/index.ts) and Alex's own ONLYOFFICE server. The browser never holds
// the server's secret: the function signs the editor's settings after checking the member may
// see the project, and ONLYOFFICE saves back to pCloud through the same function.
import { supabase } from './supabase.js'
import { SUPABASE_KEY, SUPABASE_URL } from './supabaseConfig.js'

export const DOC_TYPES = [
  { type: 'docx', label: 'Document', app: 'Word', letter: 'W', color: '#2b6bd6' },
  { type: 'xlsx', label: 'Spreadsheet', app: 'Excel', letter: 'X', color: '#1f8f4e' },
  { type: 'pptx', label: 'Presentation', app: 'PowerPoint', letter: 'P', color: '#d0542c' },
]
export const docTypeOf = (name = '') => {
  const ext = (String(name).match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase()
  if (['docx', 'doc', 'odt', 'rtf', 'txt'].includes(ext)) return DOC_TYPES[0]
  if (['xlsx', 'xls', 'ods', 'csv'].includes(ext)) return DOC_TYPES[1]
  if (['pptx', 'ppt', 'odp'].includes(ext)) return DOC_TYPES[2]
  return null
}

async function call(action, body = {}) {
  if (!supabase) throw new Error('Office needs the online database.')
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Sign in again.')
  let res
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/office`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...body }),
    })
  } catch (e) {
    throw new Error(`Could not reach the Office function (${e.message}).`)
  }
  let out = null
  try { out = await res.json() } catch {}
  if (!res.ok || !out || out.error) {
    if (res.status === 404) throw new Error('The Office function is not deployed yet: Supabase > Edge Functions > office.')
    throw new Error(out?.error || out?.message || `The Office function answered ${res.status}.`)
  }
  return out
}

export const officePing = () => call('ping')
export const officeCreate = (projectId, type, name) => call('create', { projectId, type, name })
export const officeOpen = (projectId, fileid, mode) => call('open', { projectId, fileid, mode })

/* ONLYOFFICE's own script, from Alex's server, once. */
let loading = null
export function loadDocsApi(docsUrl) {
  if (window.DocsAPI) return Promise.resolve(window.DocsAPI)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `${docsUrl}/web-apps/apps/api/documents/api.js`
    s.onload = () => (window.DocsAPI ? resolve(window.DocsAPI) : reject(new Error('The ONLYOFFICE server answered without its editor.')))
    s.onerror = () => { loading = null; reject(new Error(`Could not load the editor from ${docsUrl}. Is the ONLYOFFICE server running?`)) }
    document.head.appendChild(s)
  })
  return loading
}
