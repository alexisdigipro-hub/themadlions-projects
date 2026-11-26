/* Where you're signed in (Alex, 26 Nov 2026: "when someone signs in to my account, show me who and from where, like
   Facebook or Instagram"; without the city). Under My profile in Settings: every device signed in to this account, what
   it is, when it signed in and when it was last seen, this device marked, a round sign-out beside each, and Sign Out
   Everywhere Else. Administrators also see the team's devices and can sign a member out everywhere. A new device is
   also emailed about (supabase/sign_ins.sql + the Edge Function signin-alert). */
import { useCallback, useEffect, useState } from 'react'
import { Act, useToast } from './ui.jsx'
import { supabase } from '../lib/supabase.js'

// "iPhone · Safari", "Mac · Chrome", from what the browser says it is (the same words the email uses)
export function deviceOf(ua) {
  const u = String(ua || '')
  const os = /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' : /Mac OS X|Macintosh/.test(u) ? 'Mac'
    : /Windows/.test(u) ? 'Windows' : /Linux/.test(u) ? 'Linux' : 'A device'
  const br = /Edg\//.test(u) ? 'Edge' : /OPR\/|Opera/.test(u) ? 'Opera' : /Firefox\/|FxiOS/.test(u) ? 'Firefox' : /CriOS|Chrome\//.test(u) ? 'Chrome'
    : /Safari\//.test(u) ? 'Safari' : /Electron/.test(u) ? 'App' : ''
  return { os, label: br ? `${os} · ${br}` : os }
}

const ago = (t) => {
  const s = (Date.now() - new Date(t).getTime()) / 1000
  if (!t || Number.isNaN(s)) return ''
  if (s < 120) return 'Active now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  if (s < 86400 * 30) return `${Math.round(s / 86400)} d ago`
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
const when = (t) => (t ? new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')

const ICON = {
  phone: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>,
  computer: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="12" rx="2" /><path d="M8 20h8M12 16.5V20" /></svg>,
}
const iconFor = (os) => (/iPhone|iPad|Android/.test(os) ? ICON.phone : ICON.computer)

function Row({ ua, sub, current, onEnd, endLabel }) {
  const d = deviceOf(ua)
  return (
    <div className={`si-row${current ? ' si-current' : ''}`}>
      <span className="si-ico">{iconFor(d.os)}</span>
      <span className="si-main">
        <b>{d.label}{current && <span className="si-this">This device</span>}</b>
        <small>{sub}</small>
      </span>
      {onEnd && <Act icon="close" label={endLabel} onClick={onEnd} className="si-end" />}
    </div>
  )
}

export default function SignIns({ isAdmin = false }) {
  const toast = useToast()
  const [mine, setMine] = useState(null)
  const [team, setTeam] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.rpc('my_sessions')
    if (error) { setMine([]); return }
    setMine(data || [])
    if (isAdmin) {
      const { data: t } = await supabase.rpc('team_sessions')
      setTeam(t || [])
    }
  }, [isAdmin])
  useEffect(() => { load() }, [load])

  if (!supabase || mine === null) return null

  const run = async (fn, args, done) => {
    if (busy) return
    setBusy(true)
    const { error } = await supabase.rpc(fn, args)
    setBusy(false)
    if (error) toast(error.message || 'Could not sign it out', 'error')
    else { toast(done, 'ok'); load() }
  }
  const others = mine.filter((s) => !s.current).length

  // the team's devices, a box per member (other people only; your own are above)
  const people = []
  for (const s of team || []) {
    let p = people.find((x) => x.user_id === s.user_id)
    if (!p) { p = { user_id: s.user_id, name: s.name || s.email, rows: [] }; people.push(p) }
    p.rows.push(s)
  }
  const myId = mine[0] ? (team || []).find((t) => t.id === mine[0].id)?.user_id : null

  return (
    <section className="panel signins">
      <div className="si-head">
        <h2>Where you're signed in</h2>
        {others > 0 && <button type="button" className="btn btn-ghost btn-md" disabled={busy} onClick={() => run('end_other_sessions', {}, 'Signed out everywhere else')}>Sign out everywhere else</button>}
      </div>
      <p className="si-note">If you see a device you don't know, sign it out and change your password. A new device also gets you an email.</p>
      <div className="si-list">
        {mine.map((s) => (
          <Row key={s.id} ua={s.user_agent} current={s.current}
            sub={`${s.current ? 'Active now' : ago(s.last_seen)} · signed in ${when(s.created_at)}`}
            onEnd={s.current ? null : () => run('end_session', { p_id: s.id }, 'Signed out')} endLabel="Sign out this device" />
        ))}
      </div>

      {isAdmin && people.filter((p) => p.user_id !== myId).length > 0 && (
        <>
          <h3 className="si-sub">Team</h3>
          <div className="si-team">
            {people.filter((p) => p.user_id !== myId).map((p) => (
              <div key={p.user_id} className="si-person">
                <div className="si-phead">
                  <b>{p.name}</b>
                  <small>{p.rows.length} device{p.rows.length === 1 ? '' : 's'}</small>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run('end_member_sessions', { p_user: p.user_id }, `${p.name} signed out everywhere`)}>Sign out everywhere</button>
                </div>
                {p.rows.map((s) => <Row key={s.id} ua={s.user_agent} sub={`${ago(s.last_seen)} · signed in ${when(s.created_at)}`} />)}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
