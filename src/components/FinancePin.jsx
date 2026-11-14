import { useEffect, useRef, useState } from 'react'
import { Button, Field, Input, useToast } from './ui.jsx'
import { useCurrentUser, useStore } from '../lib/store.jsx'
import { remote, supabase } from '../lib/supabase.js'

/* A 4-digit PIN on Finance (Alex, 14 Nov: "a 4-number pin code on my finance, which I can get past from here if I
   forget it"). Each administrator sets their own in Finance > Settings. Only a fingerprint of it is kept (PBKDF2 with
   its own salt), in finance.settings.pins[userId], the Finance table that only administrators can read. It is a lock
   on the screen, for a computer or phone left open: the money itself is already guarded by the database (finance.sql).

   Unlocked, it stays open while Finance is in use and for 10 minutes after leaving it, in this tab only.
   Forgot it: Forgot PIN? asks for the hub password and takes the PIN off; or Claude takes it off in the database
   (update finance set data = data - 'pins' where kind = 'settings'). Five wrong tries wait 30 seconds. */

const KEEP_MS = 10 * 60 * 1000
const keyOf = (id) => `tml-fin-open:${id}`
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export async function pinHash(pin, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 150000, hash: 'SHA-256' }, base, 256)
  return hex(bits)
}
const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(16)))
const openUntil = (id) => { try { return Number(sessionStorage.getItem(keyOf(id)) || 0) } catch { return 0 } }
const keepOpen = (id) => { try { sessionStorage.setItem(keyOf(id), String(Date.now() + KEEP_MS)) } catch { /* private window */ } }
const shut = (id) => { try { sessionStorage.removeItem(keyOf(id)) } catch { /* private window */ } }

const LOCK = (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
)

/* four boxes over one hidden number field: typing (or the phone's number pad) fills them; at the fourth digit onDone */
function PinBoxes({ onDone, error, busy, label }) {
  const [v, setV] = useState('')
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])
  useEffect(() => { if (error) setV('') }, [error])
  const change = (e) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 4)
    setV(d)
    if (d.length === 4) onDone(d)
  }
  return (
    <label className={`fin-pin-boxes${error ? ' shake' : ''}`} aria-label={label}>
      <input ref={ref} className="fin-pin-input" type="password" inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={4} value={v} onChange={change} disabled={busy} />
      {[0, 1, 2, 3].map((i) => <span key={i} className={`fin-pin-box${i < v.length ? ' on' : ''}${i === v.length ? ' at' : ''}`} />)}
    </label>
  )
}

export function FinancePinGate({ children }) {
  const { state, update } = useStore()
  const me = useCurrentUser()
  const toast = useToast()
  const rec = state.finance?.settings?.pins?.[me?.id]
  const [open, setOpen] = useState(() => !rec || openUntil(me?.id) > Date.now())
  const [err, setErr] = useState(0)
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(0)
  const tries = useRef(0)
  const [forgot, setForgot] = useState(false)
  const [pw, setPw] = useState('')

  // a PIN set or taken off elsewhere: follow it
  useEffect(() => { if (!rec) setOpen(true) }, [rec])
  // open: kept open while Finance is on screen, and 10 minutes after
  useEffect(() => {
    if (!open || !rec || !me?.id) return undefined
    keepOpen(me.id)
    const t = setInterval(() => keepOpen(me.id), 30000)
    return () => { clearInterval(t); keepOpen(me.id) }
  }, [open, rec, me?.id])
  useEffect(() => {
    if (!wait) return undefined
    const t = setInterval(() => setWait((w) => (w <= 1 ? 0 : w - 1)), 1000)
    return () => clearInterval(t)
  }, [wait])

  if (open || !rec) return children

  const tryPin = async (pin) => {
    if (wait) return
    setBusy(true)
    const ok = (await pinHash(pin, rec.salt)) === rec.hash
    setBusy(false)
    if (ok) { tries.current = 0; setOpen(true); return }
    tries.current += 1
    setErr((n) => n + 1)
    if (tries.current >= 5) { tries.current = 0; setWait(30) }
  }
  const reset = async () => {
    if (!pw) return
    setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: me.email, password: pw })
      if (error) throw new Error('That password is not right.')
      update((s) => { const pins = { ...(s.finance.settings.pins || {}) }; delete pins[me.id]; s.finance.settings = { ...s.finance.settings, pins }; return s })
      setOpen(true)
      toast('PIN taken off. Set a new one in Finance > Settings.', 'ok')
    } catch (e) { toast(e.message, 'error') }
    setBusy(false)
  }

  return (
    <div className="fin-lock">
      <div className="fin-lock-card">
        <span className="fin-lock-ico">{LOCK}</span>
        <h1>Finance is locked</h1>
        {!forgot ? (
          <>
            <p className="muted">{wait ? `Too many tries. Try again in ${wait} s.` : err ? 'That PIN is not right. Try again.' : 'Enter your 4-digit PIN.'}</p>
            <PinBoxes key={err} onDone={tryPin} error={err} busy={busy || !!wait} label="Finance PIN" />
            {remote && <Button variant="ghost" className="fin-lock-forgot" onClick={() => setForgot(true)}>Forgot PIN?</Button>}
          </>
        ) : (
          <form className="fin-lock-forget" onSubmit={(e) => { e.preventDefault(); reset() }}>
            <p className="muted">Enter your hub password and the PIN comes off. You can set a new one in Finance &gt; Settings.</p>
            <Input type="password" autoFocus autoComplete="current-password" placeholder="Hub password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <div className="fin-lock-acts">
              <Button variant="ghost" type="button" onClick={() => { setForgot(false); setPw('') }}>Back</Button>
              <Button variant="primary" type="submit" disabled={busy || !pw}>Take the PIN off</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/* Finance > Settings: set, change or take off your own PIN */
export function FinancePinSettings() {
  const { state, update } = useStore()
  const me = useCurrentUser()
  const toast = useToast()
  const rec = state.finance?.settings?.pins?.[me?.id]
  const [step, setStep] = useState('') // '' | 'new' | 'again'
  const [first, setFirst] = useState('')
  const [err, setErr] = useState(0)
  const save = async (pin) => {
    const salt = newSalt()
    const hash = await pinHash(pin, salt)
    update((s) => { s.finance.settings = { ...s.finance.settings, pins: { ...(s.finance.settings.pins || {}), [me.id]: { salt, hash, at: new Date().toISOString() } } }; return s })
    keepOpen(me.id)
    setStep(''); setFirst('')
    toast(rec ? 'PIN changed' : 'PIN set. Finance asks for it from now on.', 'ok')
  }
  const off = () => {
    update((s) => { const pins = { ...(s.finance.settings.pins || {}) }; delete pins[me.id]; s.finance.settings = { ...s.finance.settings, pins }; return s })
    shut(me.id)
    toast('PIN taken off', 'ok')
  }
  return (
    <section className="panel fin-settings fin-pin-set">
      <h2>Finance PIN</h2>
      <p className="small muted">{rec ? 'Finance asks for your 4-digit PIN. It stays open while you use it and for 10 minutes after.' : 'Lock Finance with a 4-digit PIN of your own. Forgot it: Forgot PIN? on the lock takes it off with your hub password.'}</p>
      {step ? (
        <Field label={step === 'new' ? 'New PIN' : 'The same PIN again'}>
          <PinBoxes key={`${step}-${err}`} error={err} label={step === 'new' ? 'New PIN' : 'Repeat the PIN'} onDone={(pin) => {
            if (step === 'new') { setFirst(pin); setStep('again'); return }
            if (pin !== first) { setErr((n) => n + 1); setStep('new'); setFirst(''); toast('The two did not match. Type the new PIN again.', 'error'); return }
            save(pin)
          }} />
        </Field>
      ) : null}
      <div className="row-actions">
        {step
          ? <Button variant="ghost" onClick={() => { setStep(''); setFirst('') }}>Cancel</Button>
          : <Button variant="primary" onClick={() => setStep('new')}>{rec ? 'Change PIN' : 'Set a PIN'}</Button>}
        {rec && !step && <Button variant="ghost" onClick={off}>Take the PIN off</Button>}
        {rec && !step && <Button variant="ghost" onClick={() => { shut(me.id); window.location.reload() }}>Lock now</Button>}
      </div>
    </section>
  )
}
