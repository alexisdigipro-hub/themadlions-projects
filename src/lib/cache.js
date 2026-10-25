/* The last state this device saw, kept in IndexedDB so the hub opens at once (Alex, 25 Oct: "it is still
   heavy"). The app shows it straight away and asks the server for the fresh state behind it (store.jsx).
   One entry per signed-in person; Finance and the AI keys are never kept here. Cleared on sign-out and
   when the server says the person is no longer on the team. Everything fails quietly: without IndexedDB
   (a private window, an old browser) the app simply waits for the server as it always did. */
const DB = 'tml-cache'
const STORE = 'state'
let dbp = null
const open = () => {
  if (dbp) return dbp
  dbp = new Promise((ok, bad) => {
    if (typeof indexedDB === 'undefined') return bad(new Error('no IndexedDB'))
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => ok(r.result)
    r.onerror = () => bad(r.error)
    r.onblocked = () => bad(new Error('blocked'))
  })
  dbp.catch(() => { dbp = null })
  return dbp
}
const run = async (mode, fn) => {
  const db = await open()
  return new Promise((ok, bad) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => ok(req?.result)
    tx.onerror = () => bad(tx.error)
    tx.onabort = () => bad(tx.error)
  })
}

// a week old at most: anything older is more likely to mislead than to help
const MAX_AGE = 7 * 864e5

export async function readCache(userId) {
  try {
    const v = await run('readonly', (s) => s.get(userId))
    if (!v || !v.state || !v.membership || Date.now() - (v.at || 0) > MAX_AGE) return null
    return v
  } catch { return null }
}

export function writeCache(userId, membership, state) {
  const { aiKey, openaiKey, ...settings } = state.settings || {} // eslint-disable-line no-unused-vars
  const keep = { ...state, settings, finance: { transactions: [], recurring: [], invoices: [], settings: {} } }
  return run('readwrite', (s) => s.put({ at: Date.now(), membership, state: keep }, userId)).catch(() => {})
}

export function clearCache(userId) {
  return run('readwrite', (s) => (userId ? s.delete(userId) : s.clear())).catch(() => {})
}
