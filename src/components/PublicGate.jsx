import { useEffect, useState } from 'react'
import { fetchShare } from '../lib/shares.js'

/* Everything a public page needs to load a share: the fetch, the "closed" and "locked" answers,
   and the access code, which is remembered on this device so a crew member types it once. */
const KEY = (t) => `tml_pin_${t}`

export function usePublicShare(token) {
  const [share, setShare] = useState(undefined)
  const [pinErr, setPinErr] = useState('')

  const load = async (pin) => {
    try {
      const r = await fetchShare(token, pin)
      setShare(r || null)
      if (r?.locked) setPinErr(pin ? 'That code is not right.' : '')
      else if (pin) { try { localStorage.setItem(KEY(token), pin) } catch { /* private window */ } }
    } catch (e) {
      // not "expired": the link may be fine and the request failed, so say what failed
      setShare({ error: e?.message || e?.code || 'Unknown error' })
    }
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-public', '1')
    let saved = ''
    try { saved = localStorage.getItem(KEY(token)) || '' } catch { /* private window */ }
    load(saved)
    return () => document.documentElement.removeAttribute('data-public')
  }, [token])

  return { share, tryPin: load, pinErr }
}

export function ShareProblem({ error }) {
  return (
    <div className="pub">
      <div className="pub-card">
        <h1>This page could not open</h1>
        <p className="muted">The link is probably fine; loading it failed. Try again in a minute, and if it keeps happening send this to the production:</p>
        <p className="small"><code>{error}</code></p>
        <button className="dlv-btn" type="button" onClick={() => window.location.reload()}>Try again</button>
      </div>
    </div>
  )
}

export function PinGate({ onTry, err, what = 'this page' }) {
  const [v, setV] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async (e) => {
    e.preventDefault()
    if (!v.trim()) return
    setBusy(true)
    await onTry(v.trim())
    setBusy(false)
  }
  return (
    <div className="pub">
      <form className="pub-card pin-gate" onSubmit={go}>
        <h1>Access code</h1>
        <p className="muted">The production sent you a code together with the link. Type it to open {what}.</p>
        <label className="dlv-lbl" htmlFor="pin">Code</label>
        <input id="pin" className="dlv-input pin-input" inputMode="numeric" autoComplete="one-time-code" autoFocus value={v} onChange={(e) => setV(e.target.value)} />
        {err && <p className="dlv-err">{err}</p>}
        <button className="dlv-btn" type="submit" disabled={busy || !v.trim()}>{busy ? 'Checking…' : 'Open'}</button>
      </form>
    </div>
  )
}
