import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PinGate, ShareProblem, usePublicShare } from '../components/PublicGate.jsx'
import { LOOK_DEFAULT, loadFont, lookProps } from '../lib/estimateLook.js'
import { respondToDelivery } from '../lib/shares.js'

/* A project for outside collaborators (Alex, 18 Nov; lib/projectShare.js). The page reads only the snapshot the team
   published, in the company site's look (as a delivery's page), and offers one thing to do: leave a comment. */

const fmt = (d, o = { day: 'numeric', month: 'short', year: 'numeric' }) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', o) : '')
const upper = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().normalize('NFC')

export default function PublicProject() {
  const { token } = useParams()
  const { share, tryPin, pinErr } = usePublicShare(token)
  useEffect(() => {
    const html = document.documentElement
    const before = html.dataset.theme
    const skin = html.dataset.skin
    html.dataset.theme = 'dark'
    html.classList.add('pub-est-page')
    delete html.dataset.skin
    loadFont(LOOK_DEFAULT.font)
    html.style.setProperty('--est-page-bg', LOOK_DEFAULT.bg)
    return () => { html.dataset.theme = before; html.classList.remove('pub-est-page'); html.style.removeProperty('--est-page-bg'); if (skin) html.dataset.skin = skin }
  }, [])

  if (share === undefined) return <div className="pub"><p className="pub-loading">Loading…</p></div>
  if (share?.closed) return <div className="pub"><div className="pub-card"><h1>This link is closed</h1><p className="muted">The production has closed this page. Ask them for a fresh one.</p></div></div>
  if (share?.locked) return <PinGate onTry={tryPin} err={pinErr} what="this project" />
  if (share?.error) return <ShareProblem error={share.error} />
  if (!share || share.kind !== 'project') return <div className="pub"><div className="pub-card"><h1>This link has expired</h1><p className="muted">Ask the production for a fresh one.</p></div></div>

  const d = share.data || {}
  const look = lookProps(LOOK_DEFAULT)
  const days = d.days || [], tasks = d.tasks || [], team = d.team || [], locs = d.locations || [], scenes = d.scenes || []
  const open = tasks.filter((t) => !t.done), done = tasks.filter((t) => t.done)
  const cast = team.filter((c) => c.kind === 'cast'), crew = team.filter((c) => c.kind !== 'cast')
  const updated = share.updated_at ? new Date(share.updated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <div className={`pub dlv dlv-estimate dlv-site pj ${look.className}`} style={look.style}>
      <div className="dlv-sheet">
        <header className="dlv-band dlv-top dlv-brand">
          <img className="dlv-wordmark" src="./site/wordmark.png" alt={d.company?.name || 'THEMADLIONS'} />
        </header>

        <section className="dlv-band dlv-hero">
          <div className="dlv-stage">Project · {d.category || 'Production'}</div>
          <h1 className="dlv-title">{d.title}</h1>
          {d.client && <p className="dlv-client">{upper(d.client)}</p>}
          <p className="pj-meta">
            {[d.status, d.startDate ? `${fmt(d.startDate)}${d.endDate && d.endDate !== d.startDate ? ` to ${fmt(d.endDate)}` : ''}` : '', updated ? `Updated ${updated}` : ''].filter(Boolean).map((t, i) => <span key={i}>{t}</span>)}
          </p>
          {d.cover && <img className="pj-cover" src={d.cover} alt="" />}
        </section>

        {d.progress && (
          <section className="dlv-block pj-block">
            <h2>Progress</h2>
            <div className="pj-pct"><b>{d.progress.pct}%</b></div>
            <div className="pj-bar"><i style={{ width: `${d.progress.pct}%` }} /></div>
            <ul className="plain pj-stages">
              {d.progress.stages.map((s, i) => <li key={i} className={s.done >= 100 ? 'done' : s.done > 0 ? 'part' : ''}><span className="pj-dot" />{s.label}<small>{s.done >= 100 ? 'Done' : s.done > 0 ? `${s.done}%` : 'To do'}</small></li>)}
            </ul>
          </section>
        )}

        {days.length > 0 && (
          <section className="dlv-block pj-block">
            <h2>Schedule</h2>
            <ul className="plain pj-tiles">
              {days.map((x, i) => <li key={i}><b>{fmt(x.date, { weekday: 'short', day: 'numeric', month: 'short' })}</b><span>{[x.call && x.wrap ? `${x.call} to ${x.wrap}` : x.call, x.where, x.unit].filter(Boolean).join(' · ')}</span></li>)}
            </ul>
          </section>
        )}

        {tasks.length > 0 && (
          <section className="dlv-block pj-block">
            <h2>Tasks <small>{done.length} of {tasks.length} done</small></h2>
            <ul className="plain pj-tiles">
              {[...open, ...done].map((t, i) => <li key={i} className={t.done ? 'done' : ''}><span className="pj-check">{t.done ? '✓' : ''}</span><b>{t.title}</b><span>{[t.dept, t.due ? `due ${fmt(t.due, { day: 'numeric', month: 'short' })}` : ''].filter(Boolean).join(' · ')}</span></li>)}
            </ul>
          </section>
        )}

        {team.length > 0 && (
          <section className="dlv-block pj-block">
            <h2>Team</h2>
            <ul className="plain pj-people">
              {[...cast, ...crew].map((c, i) => <li key={i}><b>{c.name}</b><span>{c.kind === 'cast' ? (c.character ? `as ${c.character}` : 'Cast') : c.role || c.dept}</span></li>)}
            </ul>
          </section>
        )}

        {locs.length > 0 && (
          <section className="dlv-block pj-block">
            <h2>Locations</h2>
            <ul className="plain pj-tiles">
              {locs.map((l, i) => <li key={i}><b>{l.name}</b><span>{[l.type, l.address].filter(Boolean).join(' · ')}</span></li>)}
            </ul>
          </section>
        )}

        {scenes.length > 0 && (
          <section className="dlv-block pj-block">
            <h2>Scenes</h2>
            <ul className="plain pj-tiles">
              {scenes.map((s, i) => <li key={i}><b>{s.number}</b><span>{[s.heading, s.time].filter(Boolean).join(' · ')}</span></li>)}
            </ul>
          </section>
        )}

        <Comment token={token} />
      </div>
    </div>
  )
}

/* the one thing a collaborator can do: leave a comment (share_respond 'comment', project_share.sql) */
function Comment({ token }) {
  const [name, setName] = useState(() => { try { return localStorage.getItem('tml_pj_name') || '' } catch { return '' } })
  const [note, setNote] = useState('')
  const [state, setState] = useState('') // '' | 'sending' | 'sent' | error text
  const send = async (e) => {
    e.preventDefault()
    if (!note.trim()) return
    setState('sending')
    try {
      try { localStorage.setItem('tml_pj_name', name) } catch { /* private window */ }
      await respondToDelivery({ token, name: name.trim(), status: 'comment', note: note.trim() })
      setNote(''); setState('sent')
    } catch (err) { setState(err.message || 'Could not send it. Try again.') }
  }
  return (
    <section className="dlv-block pj-block pj-comment">
      <h2>Leave a comment</h2>
      <p className="muted">The team sees it in the project. Nothing else on this page can be changed.</p>
      <form onSubmit={send}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={120} autoComplete="name" />
        <textarea className="input" rows={4} value={note} onChange={(e) => { setNote(e.target.value); if (state === 'sent') setState('') }} placeholder="Your comment" maxLength={4000} />
        <button type="submit" className="dlv-btn" disabled={state === 'sending' || !note.trim()}>{state === 'sending' ? 'Sending…' : 'Send comment'}</button>
        {state === 'sent' && <p className="pj-sent">Thank you, the team has it.</p>}
        {state && state !== 'sent' && state !== 'sending' && <p className="pj-err">{state}</p>}
      </form>
    </section>
  )
}
