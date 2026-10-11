import { Fragment, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { PinGate, ShareProblem, usePublicShare } from '../components/PublicGate.jsx'

// Links made before Customise existed carry no layout: the note, then the location.
const OLD_ORDER = [['note', ''], ['location', 'Location']]
// What an ordino link draws now (Alex, 11 Oct): cast, crew, production, scenes, department
// requirements and emergency numbers are left out, also on links shared before.
const KEEP = new Set(['note', 'groupcalls', 'location', 'program'])
const ZOOM = { small: 0.9, normal: 1, large: 1.12 }

const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '')

export default function PublicCallSheet() {
  const { token } = useParams()
  const { share, tryPin, pinErr } = usePublicShare(token)
  const theme = share?.data?.layout?.theme

  // The production picks light or Glass dark for the link; the page takes it while it is open.
  // Dark became Glass dark (Alex, 11 Oct), so links shared as dark open in glass too.
  useEffect(() => {
    if (!theme) return undefined
    const html = document.documentElement
    const before = html.dataset.theme
    const skin = html.dataset.skin // an app skin would recolour the production's chosen look
    const glass = theme === 'glass' || theme === 'dark'
    html.dataset.theme = glass ? 'dark' : theme
    html.classList.toggle('pub-glass-page', glass)
    delete html.dataset.skin
    return () => { html.dataset.theme = before; html.classList.remove('pub-glass-page'); if (skin) html.dataset.skin = skin }
  }, [theme])

  if (share === undefined) return <div className="pub"><p className="pub-loading">Loading the ordino…</p></div>
  if (share?.closed) return <div className="pub"><div className="pub-card"><h1>This link is closed</h1><p className="muted">The production has closed this ordino. Ask them for the current one.</p></div></div>
  if (share?.locked) return <PinGate onTry={tryPin} err={pinErr} what="the ordino" />
  if (share?.data?.expiresAt && new Date(share.data.expiresAt) < new Date()) return <div className="pub"><div className="pub-card"><h1>This ordino has expired</h1><p className="muted">The day has passed. Ask the production for the current one.</p></div></div>
  if (share?.error) return <ShareProblem error={share.error} />
  if (!share || share.kind !== 'callsheet') return <div className="pub"><div className="pub-card"><h1>This link has expired</h1><p className="muted">Ask the production for a fresh link.</p></div></div>

  return <CallSheetLinkView data={share.data} updatedAt={share.updated_at} />
}

/* The link's page itself, without the loading and the access code around it, so the ordino can
   draw the same thing live in its phone preview. Under the big call only the sun is left (no
   Shooting call, Break or Est. wrap, Alex 11 Oct, also on links shared before). */
export function CallSheetLinkView({ data: d, updatedAt }) {
  const lay = d.layout || {}
  const grid = d.sun ? [['sun', 'Sun', `${d.sun.sunrise} · ${d.sun.sunset}`]] : []
  const blocks = (lay.blocks || OLD_ORDER.map(([key, title]) => ({ key, title }))).filter((b) => b.custom || KEEP.has(b.key))
  const mapsUrl = d.loc?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.loc.address)}` : ''
  const dirUrl = d.loc?.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.loc.address)}` : ''

  const block = (b) => {
    switch (b.key) {
      case 'note':
        return d.sheet.notes ? <section className="pub-note"><p>{d.sheet.notes}</p></section> : null
      case 'location':
        return (
          <section className="pub-card">
            <h2>{b.title || 'Location'}</h2>
            {d.loc ? (
              <>
                <strong className="pub-loc-name">{d.loc.name}</strong>
                <div>{d.loc.address}</div>
                {(d.loc.contact || d.loc.phone) && <div className="muted">{d.loc.contact}{d.loc.contact && d.loc.phone ? ' · ' : ''}{d.loc.phone && <a href={`tel:${d.loc.phone}`}>{d.loc.phone}</a>}</div>}
                {mapsUrl && <div className="pub-btns"><a className="pub-btn" href={dirUrl} target="_blank" rel="noreferrer">Directions</a><a className="pub-btn ghost" href={mapsUrl} target="_blank" rel="noreferrer">Open in Maps</a></div>}
              </>
            ) : <p className="muted">To be confirmed.</p>}
            {(d.sheet.parking || d.sheet.hospital) && (
              <div className="pub-locgrid">
                {d.sheet.parking && <div><span className="pub-label">Parking</span><div>{d.sheet.parking}</div></div>}
                {d.sheet.hospital && <div><span className="pub-label">Nearest hospital</span><div>{d.sheet.hospital}</div></div>}
              </div>
            )}
            {d.extraLocs?.length > 0 && (
              <div className="pub-extra">
                <span className="pub-label">Extra Locations</span>
                <ul>
                  {d.extraLocs.map((x, i) => (
                    <li key={i}>
                      <div className="grow"><strong>{x.name}</strong>{x.name && x.address ? ' · ' : ''}{x.address}</div>
                      {x.address && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(x.address)}`} target="_blank" rel="noreferrer">Directions</a>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )
      case 'groupcalls':
        return d.groupCalls?.length > 0 ? (
          <section className="pub-card">
            <h2>{b.title || 'Calls by group'}</h2>
            <ul className="pub-groups">
              {d.groupCalls.map((x, i) => <li key={i}><span>{x.who}</span><b>{x.time}</b></li>)}
            </ul>
          </section>
        ) : null
      case 'program':
        return d.program?.length > 0 ? (
          <section className="pub-card">
            <h2>{b.title || 'Program'}</h2>
            <ul className="pub-scenes pub-program">
              {d.program.map((x, i) => (
                <li key={i}>
                  <span className="pub-sc pub-sc-time">{x.from || x.to ? `${x.from || ''}${x.to ? ` – ${x.to}` : ''}` : '–'}</span>
                  <div className="grow"><strong className="pub-program-what">{x.what}</strong></div>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      default:
        return b.custom && b.text ? (
          <section className="pub-card">
            <h2>{b.title}</h2>
            <p className="pub-custom">{b.text}</p>
          </section>
        ) : null
    }
  }

  return (
    <div className={`pub${lay.accent ? ' pub-accented' : ''}${lay.theme === 'glass' || lay.theme === 'dark' ? ' pub-glass' : ''}`} style={{ ...(lay.accent ? { '--pa': lay.accent } : {}), ...(ZOOM[lay.size] && ZOOM[lay.size] !== 1 ? { zoom: ZOOM[lay.size] } : {}) }}>
      <header className={`pub-hero${d.project.cover ? ' has-cover' : ''}`} style={{ '--pc': lay.accent || d.project.color || '#C8503F' }}>
        {d.project.cover && <img className="pub-cover" src={d.project.cover} alt="" />}
        <div className="pub-hero-body">
          <div className="pub-company">{d.company?.logo && <img src={d.company.logo} alt="" />}{d.company?.name || 'THEMADLIONS'}</div>
          <h1>{d.project.title}</h1>
          <div className="pub-day">{fmt(d.day.date)}</div>
        </div>
      </header>

      <section className="pub-call">
        <div className={`pub-call-main${grid.length ? '' : ' alone'}`}>
          <span className="pub-label">{lay.labels?.call || 'General crew call'}</span>
          <strong>{d.day.callTime}</strong>
        </div>
        {grid.length > 0 && (
          <div className="pub-call-grid">
            {grid.map(([k, name, value]) => <div key={k}><span className="pub-label">{name}</span><b>{value}</b></div>)}
          </div>
        )}
        {d.wx && <div className="pub-wx">☀ {d.wx.tmax}° / {d.wx.tmin}° · {d.wx.summary}{d.wx.rain != null ? ` · rain ${d.wx.rain}%` : ''}</div>}
        {d.sheet.tagline && <p className="pub-tagline">{d.sheet.tagline}</p>}
      </section>

      {blocks.map((b) => <Fragment key={b.key}>{block(b)}</Fragment>)}

      {d.sheet.footer && <p className="pub-footer">{d.sheet.footer}</p>}
      <footer className="pub-foot muted small">{updatedAt ? 'Updated' : 'Preview'} {new Date(updatedAt || Date.now()).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · THEMADLIONS Projects</footer>
    </div>
  )
}
