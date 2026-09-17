import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchShare } from '../lib/shares.js'

const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '')

export default function PublicCallSheet() {
  const { token } = useParams()
  const [share, setShare] = useState(undefined)
  const [q, setQ] = useState('')
  useEffect(() => {
    document.documentElement.setAttribute('data-public', '1')
    fetchShare(token).then((r) => setShare(r || null)).catch(() => setShare(null))
    return () => document.documentElement.removeAttribute('data-public')
  }, [token])

  if (share === undefined) return <div className="pub"><p className="pub-loading">Loading call sheet…</p></div>
  if (!share || share.kind !== 'callsheet') return <div className="pub"><div className="pub-card"><h1>This link has expired</h1><p className="muted">Ask the production for a fresh link.</p></div></div>

  const d = share.data
  const people = [...(d.cast || []).map((c) => ({ ...c, kind: 'cast' })), ...(d.crew || []).map((c) => ({ ...c, kind: 'crew' }))]
  const match = (p) => !q.trim() || [p.name, p.character, p.role].filter(Boolean).some((x) => x.toLowerCase().includes(q.trim().toLowerCase()))
  const mapsUrl = d.loc?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.loc.address)}` : ''
  const dirUrl = d.loc?.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.loc.address)}` : ''

  return (
    <div className="pub">
      <header className="pub-hero" style={{ '--pc': d.project.color || '#C8503F' }}>
        {d.project.cover && <img className="pub-cover" src={d.project.cover} alt="" />}
        <div className="pub-hero-body">
          <div className="pub-company">{d.company?.name || 'THEMADLIONS'}</div>
          <h1>{d.project.title}</h1>
          <div className="pub-day">Day {d.day.index} of {d.day.count} · {fmt(d.day.date)}</div>
        </div>
      </header>

      <section className="pub-call">
        <div className="pub-call-main">
          <span className="pub-label">General crew call</span>
          <strong>{d.day.callTime}</strong>
        </div>
        <div className="pub-call-grid">
          <div><span className="pub-label">Shooting call</span><b>{d.sheet.shootingCall || d.day.callTime}</b></div>
          {d.sheet.lunch && <div><span className="pub-label">Lunch</span><b>{d.sheet.lunch}</b></div>}
          {d.day.wrapTime && <div><span className="pub-label">Est. wrap</span><b>{d.day.wrapTime}</b></div>}
          {d.sun && <div><span className="pub-label">Sun</span><b>{d.sun.sunrise} · {d.sun.sunset}</b></div>}
        </div>
        {d.wx && <div className="pub-wx">☀ {d.wx.tmax}° / {d.wx.tmin}° · {d.wx.summary}{d.wx.rain != null ? ` · rain ${d.wx.rain}%` : ''}</div>}
        {d.sheet.tagline && <p className="pub-tagline">{d.sheet.tagline}</p>}
      </section>

      {d.sheet.notes && <section className="pub-note"><span>📌</span><p>{d.sheet.notes}</p></section>}

      <section className="pub-card">
        <h2>Location</h2>
        {d.loc ? (
          <>
            <strong className="pub-loc-name">{d.loc.name}</strong>
            <div>{d.loc.address}</div>
            {d.loc.phone && <div className="muted">{d.loc.contact ? `${d.loc.contact} · ` : ''}<a href={`tel:${d.loc.phone}`}>{d.loc.phone}</a></div>}
            {mapsUrl && <div className="pub-btns"><a className="pub-btn" href={dirUrl} target="_blank" rel="noreferrer">Directions</a><a className="pub-btn ghost" href={mapsUrl} target="_blank" rel="noreferrer">Open in Maps</a></div>}
          </>
        ) : <p className="muted">To be confirmed.</p>}
        {(d.sheet.parking || d.sheet.hospital) && (
          <div className="pub-locgrid">
            {d.sheet.parking && <div><span className="pub-label">Parking</span><div>{d.sheet.parking}</div></div>}
            {d.sheet.hospital && <div><span className="pub-label">Nearest hospital</span><div>{d.sheet.hospital}</div></div>}
          </div>
        )}
      </section>

      {people.length > 0 && (
        <section className="pub-card">
          <div className="pub-card-head"><h2>Calls</h2><input className="pub-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find your name" /></div>
          <ul className="pub-people">
            {people.filter(match).map((p, i) => (
              <li key={i} className={p.kind}>
                {p.photo ? <img src={p.photo} alt="" /> : <span className="pub-av">{(p.name || '?').split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase()}</span>}
                <div className="grow">
                  <strong>{p.name || 'Not cast'}</strong>
                  <div className="muted small">{p.kind === 'cast' ? p.character : p.role}{p.phone ? <> · <a href={`tel:${p.phone}`}>{p.phone}</a></> : null}</div>
                </div>
                <span className="pub-time">{p.call}</span>
              </li>
            ))}
            {!people.filter(match).length && <li className="muted">No one matches.</li>}
          </ul>
        </section>
      )}

      {d.blocks?.length > 0 && (
        <section className="pub-card">
          <h2>Run of show</h2>
          <ul className="pub-scenes">
            {d.blocks.map((b, i) => <li key={i}><span className="pub-sc">{b.time}{b.end ? ` – ${b.end}` : ''}</span><div className="grow"><strong>{b.item}</strong>{(b.owner || b.notes) && <div className="muted small">{[b.owner, b.notes].filter(Boolean).join(' · ')}</div>}</div></li>)}
          </ul>
        </section>
      )}

      {d.scenes?.length > 0 && (
        <section className="pub-card">
          <h2>Scenes</h2>
          <ul className="pub-scenes">
            {d.scenes.map((s, i) => (
              <li key={i}>
                <span className="pub-sc">{s.number}</span>
                <div className="grow">
                  <strong>{[s.intExt, s.location, s.timeOfDay].filter(Boolean).join(' · ')}</strong>
                  {s.synopsis && <div className="small">{s.synopsis}</div>}
                  {s.characters?.length > 0 && <div className="muted small">{s.characters.join(', ')}</div>}
                </div>
                {s.pages && <span className="muted small">{s.pages}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.keyCrew?.length > 0 && (
        <section className="pub-card">
          <h2>Production</h2>
          <ul className="pub-kv">
            {d.keyCrew.map((k, i) => <li key={i}><span className="muted">{k.role}</span><span>{k.name}{k.phone ? <> · <a href={`tel:${k.phone}`}>{k.phone}</a></> : null}</span></li>)}
          </ul>
          {d.company?.address && <p className="muted small">{d.company.name} · {d.company.address}</p>}
        </section>
      )}

      <footer className="pub-foot muted small">Updated {new Date(share.updated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · THEMADLIONS Projects</footer>
    </div>
  )
}
