import { Fragment, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { respondToDelivery } from '../lib/shares.js'
import { PinGate, ShareProblem, usePublicShare } from '../components/PublicGate.jsx'
import { amount, estimateTotals, groupLines, lineAmount, showGroupSum, showLineAmount, upper } from '../lib/estimate.js'
import { downloadEstimatePdf } from '../lib/estimatePdf.js'
import { loadFont, lookOf, lookProps } from '../lib/estimateLook.js'

const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

export default function PublicEstimate() {
  const { token } = useParams()
  const { share, tryPin, pinErr } = usePublicShare(token)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [pdfBusy, setPdfBusy] = useState(false)

  // A page made for one person already knows the name, so the reply form does not ask for it again.
  useEffect(() => {
    if (share?.data?.recipient?.name) setName(share.data.recipient.name)
  }, [share])

  // The page in the company site's look (Alex, 19 Oct), whatever the app's own theme or skin is, while it is open
  useEffect(() => {
    const html = document.documentElement
    const before = html.dataset.theme
    const skin = html.dataset.skin
    html.dataset.theme = 'dark'
    html.classList.add('pub-est-page')
    delete html.dataset.skin
    return () => { html.dataset.theme = before; html.classList.remove('pub-est-page'); html.style.removeProperty('--est-page-bg'); if (skin) html.dataset.skin = skin }
  }, [])
  useEffect(() => {
    const bg = share?.data && lookOf(share.data).bg
    if (bg) document.documentElement.style.setProperty('--est-page-bg', bg)
  }, [share])

  // Also used if someone prints the page by hand (Ctrl+P): a real filename instead of the app's own.
  useEffect(() => {
    const d = share?.data
    if (d?.title) document.title = `${d.title}${d.version ? ` ${d.version}` : ''} — cost estimate`
  }, [share])

  if (share === undefined) return <div className="pub"><p className="pub-loading">Loading…</p></div>
  if (share?.closed) {
    return <div className="pub"><div className="pub-card"><h1>This link is closed</h1><p className="muted">The production has closed this page. Ask them for a fresh one.</p></div></div>
  }
  if (share?.locked) return <PinGate onTry={tryPin} err={pinErr} what="this page" />
  if (share?.error) return <ShareProblem error={share.error} />
  if (!share || share.kind !== 'estimate') {
    return <div className="pub"><div className="pub-card"><h1>This link has expired</h1><p className="muted">Ask the production for a fresh one.</p></div></div>
  }

  const d = share.data
  const cur = d.currency || 'EUR'
  const t = estimateTotals(d)
  const groups = groupLines(t.lines)
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

  // Drawn onto a canvas and wrapped in a hand-written PDF, so this saves the file straight away —
  // no print dialog for the client to find "Save as PDF" in themselves.
  const savePdf = async () => {
    setPdfBusy(true); setErr('')
    try {
      await downloadEstimatePdf(d, t, groups, cur, `${d.title || 'estimate'}${d.version ? ` ${d.version}` : ''}.pdf`)
    } catch (e) {
      setErr(e.message || 'Could not make the PDF. Try again.')
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <EstimateSheet d={d}>
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
                <button className="dlv-btn ghost" onClick={() => reply('changes')} disabled={!!busy}>{busy === 'changes' ? 'Sending…' : 'Send Feedback'}</button>
                <button type="button" className="dlv-btn ghost" onClick={savePdf} disabled={pdfBusy}>{pdfBusy ? 'Preparing…' : 'Download PDF'}</button>
                <button className="dlv-btn" onClick={() => reply('approved')} disabled={!!busy}>{busy === 'approved' ? 'Sending…' : 'Accept'}</button>
              </div>
              {err && <p className="dlv-err">{err}</p>}
            </>
          )}
        </section>
    </EstimateSheet>
  )
}


/* The estimate itself, as the client sees it: used by the client's page and by the live preview beside the editor
   (Alex, 19 Oct: "the preview of how it looks on the right"), so the two can never differ */
export function EstimateSheet({ d, children = null }) {
  const cur = d.currency || 'EUR'
  const t = estimateTotals(d)
  const groups = groupLines(t.lines)
  const expired = d.validUntil && d.validUntil < new Date().toISOString().slice(0, 10)
  const L = lookOf(d)
  const look = lookProps(L)
  useEffect(() => { loadFont(L.font) }, [L.font])
  const logo = L.logo ? (L.logoImg || d.company?.logo) : ''
  const cover = L.cover
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,${(Number(L.coverDim) || 0) / 100}), rgba(0,0,0,${(Number(L.coverDim) || 0) / 100})), url("${L.cover}")`, backgroundPosition: `center ${Number(L.coverY ?? 50)}%` }
    : undefined
  return (
    <div className={`pub dlv dlv-estimate ${look.className}`} style={look.style}>
    <div className="dlv-sheet">
      {(logo || L.company) && (
        <header className="dlv-band dlv-top">
          {logo && <img className="dlv-logo" src={logo} alt="" />}
          {L.company && <div className="dlv-company">{d.company?.name || 'THEMADLIONS'}</div>}
        </header>
      )}

      <section className={`dlv-band dlv-hero${cover ? ` est-cover est-cover-${L.coverHeight}` : ''}`} style={cover}>
        {L.kicker && <div className="dlv-stage">{L.kicker}{d.version ? ` · ${d.version}` : ''}</div>}
        <h1 className="dlv-title">{L.titleCaps ? upper(d.title) : d.title}</h1>
        {d.client && <p className="dlv-client">{upper(d.client)}</p>}
        {d.recipient?.name && <p className="dlv-for">For {d.recipient.name}</p>}
        {d.intro && <p className="dlv-note est-intro">{d.intro}</p>}
      </section>

      <section className="dlv-block est-lines">
        {L.covers && <h2>{L.covers}</h2>}
        {/* List (Alex, 19 Oct, like his own e-mail estimates): each heading, a dashed rule, the lines as › items */}
        {L.lines === 'list' ? (
          <div className="est-list">
            {groups.map((g, gi) => (
              <div key={g.label || `g${gi}`} className="est-list-group">
                {g.label && <h3>{g.label}</h3>}
                <ul>
                  {g.rows.map((l, i) => (
                    <li key={i} className={l.advance ? 'est-advance' : undefined}>
                      <span className="est-what">{l.what}</span>
                      {showLineAmount(l, t) && <span className="est-amt">{amount(lineAmount(l), cur)}</span>}
                    </li>
                  ))}
                </ul>
                {L.subtotals && showGroupSum(g, t) && <p className="est-list-sub"><span>Subtotal</span><span className="est-amt">{amount(g.sum, cur)}</span></p>}
              </div>
            ))}
          </div>
        ) : (
        <table className="est-table">
          <tbody>
            {/* a Fragment with a key, not <>, because a bare fragment cannot carry one */}
            {groups.map((g, gi) => (
              <Fragment key={g.label || `g${gi}`}>
                {g.label && <tr className="est-head"><th colSpan={2}>{upper(g.label)}</th></tr>}
                {g.rows.map((l, i) => (
                  <tr key={i} className={l.advance ? 'est-advance' : undefined}>
                    <td className="est-what">{l.what}</td>
                    <td className="est-amt">{showLineAmount(l, t) ? amount(lineAmount(l), cur) : ''}</td>
                  </tr>
                ))}
                {L.subtotals && showGroupSum(g, t) && (
                  <tr className="est-sub"><td>Subtotal</td><td className="est-amt">{amount(g.sum, cur)}</td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        )}

        <div className="est-totals-row">
          {t.advance > 0 && (
            <div className="est-advance-box">
              <span className="est-advance-label">Advance</span>
              <span className="est-advance-amt">{amount(t.advance, cur)}</span>
            </div>
          )}
          <table className="est-totals">
            <tbody>
              <tr><td>{t.fixed ? 'Total price' : 'Clean cost'}</td><td className="est-amt">{amount(t.subtotal, cur)}</td></tr>
              {t.discount > 0 && <tr><td>Discount</td><td className="est-amt">&minus; {amount(t.discount, cur)}</td></tr>}
              {t.vatPct > 0 && <tr><td>VAT {t.vatPct}%</td><td className="est-amt">{amount(t.vat, cur)}</td></tr>}
              <tr className="est-total"><td>Total</td><td className="est-amt">{amount(t.total, cur)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* what the price does not include (Alex, 19 Oct): props, make-up, a set designer, the location fee… */}
      {d.excluded?.length > 0 && (
        <section className="dlv-block est-excluded">
          {L.excludedTitle && <h2>{L.excludedTitle}</h2>}
          <ul>{d.excluded.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>
      )}

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

      {children}

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
