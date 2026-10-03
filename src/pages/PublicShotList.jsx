import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { PinGate, ShareProblem, usePublicShare } from '../components/PublicGate.jsx'

const ZOOM = { small: 0.9, normal: 1, large: 1.12 }
const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : '')

/* One shot as a card: number and description big, the other columns as small labelled values,
   which reads on a phone where a wide table would not. */
function ShotCard({ shot, columns, time, scene }) {
  const at = (k) => columns.findIndex((c) => c.key === k)
  const value = (k) => (at(k) >= 0 ? shot.cells[at(k)] : '')
  const rest = columns.map((c, i) => [c, shot.cells[i]]).filter(([c, v]) => v && !['number', 'description', 'status'].includes(c.key))
  return (
    <li className={`psl-shot${shot.status === 'shot' ? ' done' : ''}${shot.status === 'skipped' ? ' skipped' : ''}`}>
      {time && <span className="psl-time">{time}</span>}
      {shot.frame && <img className="psl-frame" src={shot.frame} alt="" />}
      <div className="grow">
        <div className="psl-top">
          {value('number') && <strong className="psl-num">{value('number')}</strong>}
          {scene && <span className="muted small">Sc. {scene}</span>}
          {value('status') && value('status') !== 'planned' && <span className="psl-status">{value('status')}</span>}
        </div>
        {value('description') && <div className="psl-desc">{value('description')}</div>}
        {rest.length > 0 && (
          <div className="psl-meta">
            {rest.map(([c, v]) => <span key={c.key}><span className="muted">{c.title}</span> {v}</span>)}
          </div>
        )}
      </div>
    </li>
  )
}

export default function PublicShotList() {
  const { token } = useParams()
  const { share, tryPin, pinErr } = usePublicShare(token)
  const theme = share?.data?.look?.theme

  useEffect(() => {
    if (!theme) return undefined
    const html = document.documentElement
    const before = html.dataset.theme
    html.dataset.theme = theme
    return () => { html.dataset.theme = before }
  }, [theme])

  if (share === undefined) return <div className="pub"><p className="pub-loading">Loading the shot list…</p></div>
  if (share?.closed) return <div className="pub"><div className="pub-card"><h1>This link is closed</h1><p className="muted">The production has closed this shot list. Ask them for the current one.</p></div></div>
  if (share?.locked) return <PinGate onTry={tryPin} err={pinErr} what="the shot list" />
  if (share?.error) return <ShareProblem error={share.error} />
  if (!share || share.kind !== 'shotlist') return <div className="pub"><div className="pub-card"><h1>This link has expired</h1><p className="muted">Ask the production for a fresh link.</p></div></div>

  const d = share.data
  const look = d.look || {}
  const columns = d.columns || []

  return (
    <div className={`pub${look.accent ? ' pub-accented' : ''}`} style={{ ...(look.accent ? { '--pa': look.accent } : {}), ...(ZOOM[look.size] && ZOOM[look.size] !== 1 ? { zoom: ZOOM[look.size] } : {}) }}>
      <header className="pub-hero" style={{ '--pc': look.accent || d.project?.color || '#C8503F' }}>
        {d.project?.cover && <img className="pub-cover" src={d.project.cover} alt="" />}
        <div className="pub-hero-body">
          <div className="pub-company">{d.company?.logo && <img src={d.company.logo} alt="" />}{d.company?.name || 'THEMADLIONS'}</div>
          <h1>{d.project?.title}</h1>
          <div className="pub-day">{d.mode === 'day' ? `Shot list · Day ${d.day.index} of ${d.day.count} · ${fmt(d.day.date)}` : 'Shot list'}</div>
        </div>
      </header>

      {d.mode === 'day' ? (
        <>
          <section className="pub-call">
            <div className="pub-call-grid">
              <div><span className="pub-label">Call</span><b>{d.day.callTime || '–'}</b></div>
              <div><span className="pub-label">Last shot ends</span><b>{d.day.wrap}</b></div>
            </div>
          </section>
          <section className="pub-card">
            <h2>In shooting order</h2>
            <ul className="psl-list">
              {(d.rows || []).map((r, i) => (r.label
                ? <li key={i} className="psl-break"><span className="psl-time">{r.start}</span><strong>{r.label}</strong><span className="muted">{r.min}′</span></li>
                : <ShotCard key={i} shot={r} columns={columns} time={r.start} scene={r.scene} />))}
            </ul>
          </section>
        </>
      ) : (
        (d.scenes || []).map((sc, i) => (
          <section key={i} className="pub-card">
            <h2>Sc. {sc.number} · {sc.heading}</h2>
            <ul className="psl-list">
              {sc.shots.map((s, j) => <ShotCard key={j} shot={s} columns={columns} />)}
            </ul>
          </section>
        ))
      )}

      <footer className="pub-foot muted small">Updated {new Date(share.updated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · THEMADLIONS Projects</footer>
    </div>
  )
}
