import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchShare, respondToDelivery } from '../lib/shares.js'
import { stageLabel } from './Deliveries.jsx'

const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

export default function PublicDelivery() {
  const { token } = useParams()
  const [share, setShare] = useState(undefined)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    document.documentElement.setAttribute('data-public', '1')
    fetchShare(token).then((r) => setShare(r || null)).catch(() => setShare(null))
    return () => document.documentElement.removeAttribute('data-public')
  }, [token])

  if (share === undefined) return <div className="pub"><p className="pub-loading">Loading…</p></div>
  if (!share || share.kind !== 'delivery') {
    return <div className="pub"><div className="pub-card"><h1>This link has expired</h1><p className="muted">Ask the production for a fresh one.</p></div></div>
  }

  const d = share.data
  const reply = async (status) => {
    setBusy(status); setErr('')
    try {
      await respondToDelivery({ token, name, status, note })
      setSent(status)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="pub dlv">
      <div className="dlv-sheet">
        <header className="dlv-top">
          {d.company?.logo && <img className="dlv-logo" src={d.company.logo} alt="" />}
          <div className="dlv-company">{d.company?.name || 'THEMADLIONS'}</div>
        </header>

        <div className="dlv-stage">{stageLabel(d.stage)}{d.version ? ` · ${d.version}` : ''}</div>
        <h1 className="dlv-title">{d.title}</h1>
        {d.client && <p className="dlv-client">{d.client}</p>}

        <a className="dlv-btn" href={d.link} target="_blank" rel="noreferrer">
          {d.stage === 'files' ? 'Download the files' : 'Watch the cut'}
        </a>
        <p className="dlv-under">
          {[d.linkLabel, d.linkExpires ? `available until ${fmt(d.linkExpires)}` : ''].filter(Boolean).join(' · ')}
        </p>
        {d.password && (
          <p className="dlv-pass">Password <b>{d.password}</b></p>
        )}

        {d.note && <p className="dlv-note">{d.note}</p>}

        {d.feedbackBy && <p className="dlv-by">Your notes by <b>{fmt(d.feedbackBy)}</b></p>}

        {d.credits?.length > 0 && (
          <section className="dlv-block">
            <h2>Credits</h2>
            <dl className="dlv-credits">
              {d.credits.map((c, i) => <div key={i}><dt>{c.role}</dt><dd>{c.name}</dd></div>)}
            </dl>
          </section>
        )}

        {d.deliverables?.length > 0 && (
          <section className="dlv-block">
            <h2>What is included</h2>
            <ul className="plain dlv-files">
              {d.deliverables.map((x, i) => (
                <li key={i}><b>{x.name}</b>{[x.format, x.notes].filter(Boolean).length ? <span className="muted"> · {[x.format, x.notes].filter(Boolean).join(' · ')}</span> : null}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="dlv-block dlv-reply">
          {sent ? (
            <p className="dlv-thanks">
              {sent === 'approved' ? 'Approved. Thank you, the production has been told.' : 'Sent. The production has your notes.'}
            </p>
          ) : (
            <>
              <h2>Your answer</h2>
              <input className="dlv-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              <textarea className="dlv-input dlv-area" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes, corrections, anything (optional)" />
              <div className="dlv-actions">
                <button className="dlv-btn ghost" onClick={() => reply('changes')} disabled={!!busy}>{busy === 'changes' ? 'Sending…' : 'Ask for changes'}</button>
                <button className="dlv-btn" onClick={() => reply('approved')} disabled={!!busy}>{busy === 'approved' ? 'Sending…' : 'Approve'}</button>
              </div>
              {err && <p className="dlv-err">{err}</p>}
            </>
          )}
        </section>

        {(d.contact?.name || d.contact?.email || d.contact?.phone) && (
          <p className="dlv-contact">
            {d.contact.name}
            {d.contact.email && <> · <a href={`mailto:${d.contact.email}`}>{d.contact.email}</a></>}
            {d.contact.phone && <> · <a href={`tel:${d.contact.phone}`}>{d.contact.phone}</a></>}
          </p>
        )}
        {d.company?.footer && <p className="dlv-foot">{d.company.footer}</p>}
      </div>
    </div>
  )
}
