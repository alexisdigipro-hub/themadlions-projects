import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, Input } from '../components/ui.jsx'
import { defaultPermissions, sampleProject, uid, useStore } from '../lib/store.jsx'

function Logo({ state }) {
  return (
    <div className="logo login-logo">
      {state.settings?.logo ? <img className="logo-img" src={state.settings.logo} alt="" /> : <span className="logo-mark" aria-hidden="true" />}
      <span className="logo-text">
        <strong>{state.workspace.name}</strong>
        <em>{state.workspace.subtitle}</em>
      </span>
    </div>
  )
}

/* ---------- remote mode: Supabase Auth ---------- */
function RemoteLogin() {
  const { state, auth, authUser, membership, syncError, logout } = useStore()
  const [mode, setMode] = useState('signin') // signin | signup | reset
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setMsg('')
    setBusy(true)
    try {
      const em = email.trim().toLowerCase()
      if (mode === 'signin') await auth.signIn(em, password)
      else if (mode === 'signup') {
        if (password.length < 6) throw new Error('Password must be at least 6 characters.')
        const signedIn = await auth.signUp(em, password, name.trim())
        if (!signedIn) setMsg('Check your inbox and confirm your email, then sign in.')
      } else {
        await auth.reset(em)
        setMsg('Password reset email sent.')
      }
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setBusy(false)
    }
  }

  // signed in, but no membership and no invite for this email
  if (authUser && membership === null) {
    return (
      <div className="login">
        <div className="login-card">
          <Logo state={state} />
          <h1>No access yet</h1>
          <p className="muted">
            You are signed in as <strong>{authUser.email}</strong>, but no administrator has added this email to the team. Ask them to add you from the Team page, then sign in again.
          </p>
          <Button variant="ghost" onClick={logout}>Sign out</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="login">
      <div className="login-card">
        <Logo state={state} />
        <h1>{mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset password' : 'Sign in'}</h1>
        <p className="muted">
          {mode === 'signup'
            ? 'Use the email your administrator added to the team. The very first account becomes the administrator.'
            : mode === 'reset'
              ? 'We will email you a link to set a new password.'
              : 'Your account works on every device.'}
        </p>
        <form onSubmit={submit} className="stack">
          {mode === 'signup' && (
            <Field label="Your name">
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Alex Konstantinidis" />
            </Field>
          )}
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@themadlions.gr" autoFocus={mode !== 'signup'} autoComplete="email" />
          </Field>
          {mode !== 'reset' && (
            <Field label="Password">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
            </Field>
          )}
          {error && <div className="error">{error}</div>}
          {msg && <div className="notice">{msg}</div>}
          {syncError && <div className="error">{syncError}</div>}
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? 'One moment…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
          </Button>
        </form>
        <div className="login-links">
          {mode !== 'signin' && <button className="link" onClick={() => setMode('signin')}>Back to sign in</button>}
          {mode === 'signin' && <button className="link" onClick={() => setMode('signup')}>Create an account</button>}
          {mode === 'signin' && <button className="link" onClick={() => setMode('reset')}>Forgot password</button>}
        </div>
        <p className="fineprint">Signing in with Google appears here once the Google provider is enabled in Supabase.</p>
      </div>
    </div>
  )
}

/* ---------- local mode: accounts live in this browser ---------- */
function LocalLogin() {
  const { state, update, login } = useStore()
  const nav = useNavigate()
  const firstRun = state.users.length === 0
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [withSample, setWithSample] = useState(true)
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    setError('')
    const em = email.trim().toLowerCase()
    if (firstRun) {
      if (!name.trim() || !em || password.length < 4) return setError('Name, email and a password of at least 4 characters.')
      const id = uid()
      update((s) => {
        s.users.push({ id, name: name.trim(), email: em, password, role: 'admin', permissions: defaultPermissions('edit'), projectAccess: 'all', active: true, createdAt: new Date().toISOString() })
        if (withSample) s.projects.push(sampleProject())
        return s
      })
      login(id)
      nav('/')
      return
    }
    const u = state.users.find((x) => x.email === em && x.password === password && x.active !== false)
    if (!u) return setError('Wrong email or password, or this account was deactivated.')
    login(u.id)
    nav('/')
  }

  return (
    <div className="login">
      <div className="login-card">
        <Logo state={state} />
        <h1>{firstRun ? 'Set up your workspace' : 'Sign in'}</h1>
        <p className="muted">
          {firstRun ? 'You become the administrator. You can add teammates and set what each one can see from the Team page.' : 'Use the email and password your administrator gave you.'}
        </p>
        <form onSubmit={submit} className="stack">
          {firstRun && (
            <Field label="Your name">
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Alex Konstantinidis" />
            </Field>
          )}
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@themadlions.gr" autoFocus={!firstRun} />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {firstRun && (
            <label className="check">
              <input type="checkbox" checked={withSample} onChange={(e) => setWithSample(e.target.checked)} />
              Add a sample project so I can click around
            </label>
          )}
          {error && <div className="error">{error}</div>}
          <Button variant="primary" type="submit">
            {firstRun ? 'Create workspace' : 'Sign in'}
          </Button>
        </form>
        <p className="fineprint">Local mode stores everything in this browser only. Team login across devices arrives with the Supabase backend.</p>
      </div>
    </div>
  )
}

export default function Login() {
  const { mode } = useStore()
  return mode === 'remote' ? <RemoteLogin /> : <LocalLogin />
}
