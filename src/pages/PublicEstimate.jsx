import { Fragment, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchShare, respondToDelivery } from '../lib/shares.js'
import { amount, estimateTotals, groupLines, lineAmount } from '../lib/estimate.js'

const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

export default function PublicEstimate() {
  const { token } = useParams()
  const [share, setShare] = useState(undefined)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    document.documentElement.setAttribute('data-public', '1')
    fetchShare(token).then((r) => {
      setShare(r || null)
      if (r?.data?.recipient?.name) setName(r.data.recipient.name)
    }).catch(() => setShare(null))
    return () => document.documentElement.removeAttribute('data-public')
  }, [token])

  if (share === undefined) return <div className="pub"><p className="pub-loading">Loading…</p></div>
  if (share?.closed) {
    return <div className="pub"><div className="pub-card"><h1>This link is closed</h1><p className="muted">The production has closed this page. Ask them for a fresh one.</p></div></div>
  }
  if (!share || share.kind !== 'estimate') {
    return <div className="pub"><div className="pub-card"><h1>This link has expired</h1><p className="muted">Ask the production for a fresh one.</p></div></div>
  }

  const d = share.data
  const cur = d.currency || 'EUR'
  const t = estimateTotals(d)
  const groups = groupLines(t.lines)
  const expired = d.validUntil && d.validUntil < new Date().toISOString().slice(0, 10)

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
        <header className="dlv-band dlv-top">
          {d.company?.logo && <img className="dlv-logo" src={d.company.logo} alt="" />}
          <div className="dlv-company">{d.company?.name || 'THEMADLIONS'}</div>
        </header>

        <section className="dlv-band dlv-hero">
          <div className="dlv-stage">Cost estimation{d.version ? ` · ${d.version}` : ''}</div>
          <h1 className="dlv-title">{d.title}</h1>
          {d.client && <p className="dlv-client">{d.client}</p>}
          {d.recipient?.name && <p className="dlv-for">For {d.recipient.name}</p>}
          {d.intro && <p className="dlv-note est-intro">{d.intro}</p>}
        </section>

        <section className="dlv-block est-lines">
          <h2>What it covers</h2>
          <table className="est-table">
            <tbody>
              {/* a Fragment with a key, not <>, because a bare fragment cannot carry one */}
              {groups.map((g, gi) => (
                <Fragment key={g.label || `g${gi}`}>
                  {g.label && <tr className="est-head"><th colSpan={3}>{g.label}</th></tr>}
                  {g.rows.map((l, i) => (
                    <tr key={i}>
                      <td>{l.what}</td>
                      {/* how the number was reached, so nothing looks plucked out of the air */}
                      <td className="est-qty">{Number(l.qty) > 1 || l.unit ? `${Number(l.qty) || 1}${l.unit ? ` ${l.unit}` : ''} · ${amount(l.price, cur)}` : ''}</td>
                      <td className="est-amt">{amount(lineAmount(l), cur)}</td>
                    </tr>
                  ))}
                  {g.label && g.rows.length > 1 && (
                    <tr className="est-sub"><td colSpan={2}>Subtotal</td><td className="est-amt">{amount(g.sum, cur)}</td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>

          <table className="est-totals">
            <tbody>
              <tr><td>Subtotal</td><td className="est-amt">{amount(t.subtotal, cur)}</td></tr>
              {t.discount > 0 && <tr><td>Discount</td><td className="est-amt">&minus; {amount(t.discount, cur)}</td></tr>}
              {t.vatPct > 0 && <tr><td>VAT {t.vatPct}%</td><td className="est-amt">{amount(t.vat, cur)}</td></tr>}
              <tr className="est-total"><td>Total</td><td className="est-amt">{amount(t.total, cur)}</td></tr>
            </tbody>
          </table>
        </section>

        {(d.validUntil || d.terms) && (
          <section className="dlv-band dlv-say">
            {d.validUntil && (
              <p className={`dlv-by${expired ? ' est-expired' : ''}`}>
                {expired ? 'This estimate ran out on ' : 'Valid until '}<b>{fmt(d.validUntil)}</b>
              </p>
            )}
            {d.terms && <p className="dlv-note est-terms">{d.terms}</p>}
          </section>
        )}

        <section className="dlv-block dlv-reply">
          {sent ? (
            <p className="dlv-thanks">
              {sent === 'approved' ? 'Accepted. Thank you, the production has been told.' : 'Sent. The production has your notes.'}
            </p>
          ) : (
            <>
              <h2>Your answer</h2>
              <label className="dlv-lbl" htmlFor="est-name">Your name</label>
              <input id="est-name" className="dlv-input" value={name} onChange={(e) => setName(e.target.value)} />
              <label className="dlv-lbl" htmlFor="est-note">Questions or changes</label>
              <textarea id="est-note" className="dlv-input dlv-area" rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="dlv-actions">
                <button className="dlv-btn ghost" onClick={() => reply('changes')} disabled={!!busy}>{busy === 'changes' ? 'Sending…' : 'Ask for changes'}</button>
                <button className="dlv-btn" onClick={() => reply('approved')} disabled={!!busy}>{busy === 'approved' ? 'Sending…' : 'Accept'}</button>
              </div>
              {err && <p className="dlv-err">{err}</p>}
            </>
          )}
        </section>

        <footer className="dlv-band dlv-end">
          {(d.contact?.name || d.contact?.email || d.contact?.phone) && (
            <p className="dlv-contact">
              {d.contact.name}
              {d.contact.email && <> · <a href={`mailto:${d.contact.email}`}>{d.contact.email}</a></>}
              {d.contact.phone && <> · <a href={`tel:${d.contact.phone}`}>{d.contact.phone}</a></>}
            </p>
          )}
          {d.company?.footer && <p className="dlv-foot">{d.company.footer}</p>}
        </footer>
      </div>
    </div>
  )
}
