import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, Input } from '../components/ui.jsx'
import { defaultPermissions, sampleProject, uid, useStore } from '../lib/store.jsx'

export default function Login() {
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
        s.users.push({
          id,
          name: name.trim(),
          email: em,
          password,
          role: 'admin',
          permissions: defaultPermissions('edit'),
          projectAccess: 'all',
          active: true,
          createdAt: new Date().toISOString(),
        })
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
        <div className="logo login-logo">
          <span className="logo-mark" aria-hidden="true" />
          <span className="logo-text">
            <strong>{state.workspace.name}</strong>
            <em>{state.workspace.subtitle}</em>
          </span>
        </div>
        <h1>{firstRun ? 'Set up your workspace' : 'Sign in'}</h1>
        <p className="muted">
          {firstRun
            ? 'You become the administrator. You can add teammates and set what each one can see from the Team page.'
            : 'Use the email and password your administrator gave you.'}
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
        <p className="fineprint">
          Phase 1 stores everything in this browser only. Team login across devices arrives with the Supabase backend.
        </p>
      </div>
    </div>
  )
}
