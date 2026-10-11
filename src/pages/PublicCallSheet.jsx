import { Fragment, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PinGate, ShareProblem, usePublicShare } from '../components/PublicGate.jsx'

// Links made before Customise existed carry no layout: they keep the order they always had.
const OLD_ORDER = [['note', ''], ['location', 'Location'], ['cast', 'Calls'], ['crew', 'Calls'], ['schedule', ''], ['contacts', '']]
const ZOOM = { small: 0.9, normal: 1, large: 1.12 }

const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '')

export default function PublicCallSheet() {
  const { token } = useParams()
  const { share, tryPin, pinErr } = usePublicShare(token)
  const theme = share?.data?.layout?.theme

  // The production picks light or dark for the link; the page takes it while it is open.
  useEffect(() => {
    if (!theme) return undefined
    const html = document.documentElement
    const before = html.dataset.theme
    const skin = html.dataset.skin // an app skin would recolour the production's chosen look
    html.dataset.theme = theme
    delete html.dataset.skin
    return () => { html.dataset.theme = before; if (skin) html.dataset.skin = skin }
  }, [theme])

  if (share === undefined) return <div className="pub"><p className="pub-loading">Loading call sheet…</p></div>
  if (share?.closed) return <div className="pub"><div className="pub-card"><h1>This link is closed</h1><p className="muted">The production has closed this call sheet. Ask them for the current one.</p></div></div>
  if (share?.locked) return <PinGate onTry={tryPin} err={pinErr} what="the call sheet" />
  if (share?.data?.expiresAt && new Date(share.data.expiresAt) < new Date()) return <div className="pub"><div className="pub-card"><h1>This call sheet has expired</h1><p className="muted">The shooting day has passed. Ask the production for the current one.</p></div></div>
  if (share?.error) return <ShareProblem error={share.error} />
  if (!share || share.kind !== 'callsheet') return <div className="pub"><div className="pub-card"><h1>This link has expired</h1><p className="muted">Ask the production for a fresh link.</p></div></div>

  return <CallSheetLinkView data={share.data} updatedAt={share.updated_at} />
}

/* The link's page itself, without the loading and the access code around it, so the call sheet
   can draw the same thing live in its phone preview. */
export function CallSheetLinkView({ data: d, updatedAt }) {
  const [q, setQ] = useState('')
  const lay = d.layout || {}
  const label = (k, fallback) => lay.labels?.[k] || fallback
  // Under the big call: whatever the production left switched on for the link. Links made before
  // these switches existed carry no flag for them and keep showing them.
  const on = (k) => lay.details?.[k] !== false
  const grid = [
    // no Shooting call any more (Alex, 11 Oct), not even on links shared before
    d.sheet.lunch && ['lunch', label('lunch', 'Lunch'), d.sheet.lunch],
    on('wrap') && d.day.wrapTime && ['wrap', label('wrap', 'Est. wrap'), d.day.wrapTime],
    d.sun && ['sun', 'Sun', `${d.sun.sunrise} · ${d.sun.sunset}`],
  ].filter(Boolean)
  const blocks = lay.blocks || OLD_ORDER.map(([key, title]) => ({ key, title }))
  const people = [...(d.cast || []).map((c) => ({ ...c, kind: 'cast' })), ...(d.crew || []).map((c) => ({ ...c, kind: 'crew' }))]
  const match = (p) => !q.trim() || [p.name, p.character, p.role].filter(Boolean).some((x) => x.toLowerCase().includes(q.trim().toLowerCase()))
  const mapsUrl = d.loc?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.loc.address)}` : ''
  const dirUrl = d.loc?.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.loc.address)}` : ''
  // Cast and crew are one list with a search box, drawn where the first of the two sits.
  const firstPeople = blocks.find((b) => b.key === 'cast' || b.key === 'crew')?.key
  const peopleTitle = blocks.filter((b) => b.key === 'cast' || b.key === 'crew').length > 1 || !lay.blocks ? 'Calls' : blocks.find((b) => b.key === firstPeople)?.title || 'Calls'

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
      case 'cast':
      case 'crew':
        return b.key === firstPeople && people.length > 0 ? (
          <section className="pub-card">
            <div className="pub-card-head"><h2>{peopleTitle}</h2><input className="pub-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find your name" /></div>
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
        ) : null
      case 'schedule':
        return (
          <>
            {d.blocks?.length > 0 && (
              <section className="pub-card">
                <h2>{b.title || 'Run of show'}</h2>
                <ul className="pub-scenes">
                  {d.blocks.map((x, i) => <li key={i}><span className="pub-sc">{x.time}{x.end ? ` – ${x.end}` : ''}</span><div className="grow"><strong>{x.item}</strong>{(x.owner || x.notes) && <div className="muted small">{[x.owner, x.notes].filter(Boolean).join(' · ')}</div>}</div></li>)}
                </ul>
              </section>
            )}
            {d.scenes?.length > 0 && (
              <section className="pub-card">
                <h2>{lay.blocks ? b.title : 'Sets'}</h2>
                <ul className="pub-scenes">
                  {d.scenes.map((x, i) => (
                    <li key={i}>
                      <span className="pub-sc pub-sc-time">{x.from || x.to ? `${x.from || ''}${x.to ? ` – ${x.to}` : ''}` : '–'}</span>
                      <div className="grow"><strong>{x.location || x.heading || 'Set'}</strong></div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
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
      case 'departments':
        return d.departments?.length > 0 ? (
          <section className="pub-card">
            <h2>{b.title || 'Department requirements'}</h2>
            <ul className="pub-kv">
              {d.departments.map((x, i) => <li key={i}><span className="muted">{x.cat}</span><span>{x.items.join(', ')}</span></li>)}
            </ul>
          </section>
        ) : null
      case 'contacts':
        return (
          <>
            {(d.keyCrew?.length > 0 || d.prodContacts?.length > 0) && (
              <section className="pub-card">
                <h2>Production</h2>
                <ul className="pub-kv">
                  {(d.prodContacts || []).map((c, i) => <li key={`pc${i}`}><span className="muted">{c.role}</span><span>{c.name}{c.phone ? <> · <a href={`tel:${c.phone}`}>{c.phone}</a></> : null}</span></li>)}
                  {(d.keyCrew || []).map((k, i) => <li key={i}><span className="muted">{k.role}</span><span>{k.name}{k.phone ? <> · <a href={`tel:${k.phone}`}>{k.phone}</a></> : null}</span></li>)}
                </ul>
                {d.company?.address && <p className="muted small">{d.company.name} · {d.company.address}</p>}
              </section>
            )}
            {d.emergency?.length > 0 && (
              <section className="pub-card pub-emergency">
                <h2>Emergency</h2>
                <ul className="pub-kv">
                  {d.emergency.map((n, i) => <li key={i}><span className="muted">{n.label}</span><a href={`tel:${n.number}`}>{n.number}</a></li>)}
                </ul>
              </section>
            )}
          </>
        )
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
    <div className={`pub${lay.accent ? ' pub-accented' : ''}`} style={{ ...(lay.accent ? { '--pa': lay.accent } : {}), ...(ZOOM[lay.size] && ZOOM[lay.size] !== 1 ? { zoom: ZOOM[lay.size] } : {}) }}>
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
          <span className="pub-label">{label('call', 'General crew call')}</span>
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
