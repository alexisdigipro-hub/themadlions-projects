import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchShare } from '../lib/shares.js'

const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

export default function PublicStatus() {
  const { token } = useParams()
  const [share, setShare] = useState(undefined)

  useEffect(() => {
    document.documentElement.setAttribute('data-public', '1')
    fetchShare(token).then((r) => setShare(r || null)).catch(() => setShare(null))
    return () => document.documentElement.removeAttribute('data-public')
  }, [token])

  if (share === undefined) return <div className="pub"><p className="pub-loading">Loading…</p></div>
  if (share?.closed) {
    return <div className="pub"><div className="pub-card"><h1>This link is closed</h1><p className="muted">The production has closed this page. Ask them for a fresh one.</p></div></div>
  }
  if (!share || share.kind !== 'status') {
    return <div className="pub"><div className="pub-card"><h1>This link has expired</h1><p className="muted">Ask the production for a fresh one.</p></div></div>
  }

  const d = share.data
  const updated = share.updated_at ? new Date(share.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  return (
    <div className="pub dlv">
      <div className="dlv-sheet">
        <header className="dlv-band dlv-top">
          {d.company?.logo && <img className="dlv-logo" src={d.company.logo} alt="" />}
          <div className="dlv-company">{d.company?.name || 'THEMADLIONS'}</div>
        </header>

        <section className="dlv-band dlv-hero">
          <div className="dlv-stage">Where we are</div>
          <h1 className="dlv-title">{d.title}</h1>
          {d.client && <p className="dlv-client">{d.client}</p>}
          {d.headline && <p className="dlv-headline">{d.headline}</p>}
        </section>

        {d.note && (
          <section className="dlv-band dlv-say">
            <p className="dlv-note">{d.note}</p>
          </section>
        )}

        {d.next?.length > 0 && (
          <section className="dlv-block">
            <h2>What happens next</h2>
            <ul className="plain dlv-steps">
              {d.next.map((x, i) => (
                <li key={i}><b>{x.what}</b>{x.when ? <span className="muted"> · {fmt(x.when)}</span> : null}</li>
              ))}
            </ul>
          </section>
        )}

        {d.needs?.length > 0 && (
          <section className="dlv-block">
            <h2>What we need from you</h2>
            <ul className="plain dlv-steps">
              {d.needs.map((x, i) => (
                <li key={i}><b>{x.what}</b>{x.when ? <span className="muted"> · by {fmt(x.when)}</span> : null}</li>
              ))}
            </ul>
          </section>
        )}

        <footer className="dlv-band dlv-end">
          {(d.contact?.name || d.contact?.email || d.contact?.phone) && (
            <p className="dlv-contact">
              {d.contact.name}
              {d.contact.email && <> · <a href={`mailto:${d.contact.email}`}>{d.contact.email}</a></>}
              {d.contact.phone && <> · <a href={`tel:${d.contact.phone}`}>{d.contact.phone}</a></>}
            </p>
          )}
          {updated && <p className="dlv-foot">Last updated {updated}</p>}
          {d.company?.footer && <p className="dlv-foot">{d.company.footer}</p>}
        </footer>
      </div>
    </div>
  )
}
