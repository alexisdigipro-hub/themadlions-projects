import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ShareProblem, usePublicShare } from '../components/PublicGate.jsx'
import { downloadInvoicePdf, invoiceFilename, renderInvoice } from '../lib/invoicePdf.js'
import { invoiceTotals, money } from '../lib/invoice.js'

const fmt = (iso) => (iso ? new Date(`${iso}T00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

export default function PublicInvoice() {
  const { token } = useParams()
  const { share } = usePublicShare(token)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const d = share?.kind === 'invoice' ? share.data : null

  useEffect(() => {
    if (d?.number) document.title = `Invoice #${d.number}`
  }, [d])

  useEffect(() => {
    let dead = false
    if (!d) return
    renderInvoice(d).then((canvas) => { if (!dead) setPreview(canvas.toDataURL('image/jpeg', 0.9)) }).catch(() => {})
    return () => { dead = true }
  }, [d])

  if (share === undefined) return <div className="pub"><p className="pub-loading">Loading…</p></div>
  if (share?.error) return <ShareProblem error={share.error} />
  if (!share || share.kind !== 'invoice') {
    return <div className="pub"><div className="pub-card"><h1>This link has expired</h1><p className="muted">Ask for a fresh one.</p></div></div>
  }

  const t = invoiceTotals(d)
  const cur = d.currency || 'EUR'

  const download = async () => {
    setBusy(true); setErr('')
    try {
      await downloadInvoicePdf(d, invoiceFilename(d))
    } catch (e) {
      setErr(e.message || 'Could not make the PDF. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pub">
      <div className="pub-card" style={{ maxWidth: 480, margin: '24px auto', textAlign: 'center' }}>
        <h1>Invoice #{d.number}</h1>
        <p className="muted small">{fmt(d.date)}{d.recipient?.name ? ` · ${d.recipient.name}` : ''}</p>
        <p className="muted" style={{ margin: '10px 0 18px' }}><b style={{ fontSize: 20, color: 'var(--text)' }}>{money(t.total, cur)}</b></p>
        {preview ? (
          <img src={preview} alt={`Invoice #${d.number}`} style={{ width: '100%', border: '1px solid var(--line-soft)', borderRadius: 10, boxShadow: 'var(--shadow)' }} />
        ) : (
          <p className="muted small" style={{ padding: '40px 0' }}>Preparing preview…</p>
        )}
        <button className="dlv-btn" onClick={download} disabled={busy}>{busy ? 'Preparing…' : 'Download PDF'}</button>
        {err && <p className="dlv-err">{err}</p>}
      </div>
    </div>
  )
}
