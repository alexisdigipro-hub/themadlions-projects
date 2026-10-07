import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PinGate, ShareProblem, usePublicShare } from '../components/PublicGate.jsx'
import { buildPdf } from '../lib/estimatePdf.js'

/* A presentation as a link: the slides as finished pictures, one under the other, any one of
   them opens full screen and steps with the arrows, a swipe or the keyboard. Download PDF puts
   the same pictures in a PDF right here in the browser, nothing is drawn again. */

async function pdfFromPictures(urls, size) {
  const pages = await Promise.all(urls.map(async (u) => {
    const r = await fetch(u)
    if (!r.ok) throw new Error(`A slide could not be loaded (${r.status}).`)
    return { bytes: new Uint8Array(await r.arrayBuffer()), width: size.width, height: size.height }
  }))
  return new Blob([buildPdf(pages, { width: 960, height: 540 })], { type: 'application/pdf' })
}

function Viewer({ slides, at, setAt }) {
  const startX = useRef(null)
  const go = (d) => setAt((i) => Math.min(slides.length - 1, Math.max(0, i + d)))
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); go(1) }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1) }
      else if (e.key === 'Escape') setAt(null)
    }
    window.addEventListener('keydown', key)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = '' }
  }, [slides.length])
  return (
    <div
      className="pdeck-viewer"
      onPointerDown={(e) => { startX.current = e.clientX }}
      onPointerUp={(e) => {
        if (startX.current == null) return
        const dx = e.clientX - startX.current
        startX.current = null
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
      }}
    >
      <img src={slides[at]} alt={`Slide ${at + 1}`} draggable="false" />
      <button className="pdeck-nav prev" type="button" onClick={() => go(-1)} disabled={at === 0} aria-label="Previous slide">‹</button>
      <button className="pdeck-nav next" type="button" onClick={() => go(1)} disabled={at === slides.length - 1} aria-label="Next slide">›</button>
      <div className="pdeck-count">{at + 1} / {slides.length}</div>
      <button className="pdeck-close" type="button" onClick={() => setAt(null)} aria-label="Close">×</button>
    </div>
  )
}

export default function PublicDeck() {
  const { token } = useParams()
  const { share, tryPin, pinErr } = usePublicShare(token)
  const [at, setAt] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (share === undefined) return <div className="pub"><p className="pub-loading">Loading the presentation…</p></div>
  if (share?.closed) return <div className="pub"><div className="pub-card"><h1>This link is closed</h1><p className="muted">The production has closed this presentation. Ask them for the current one.</p></div></div>
  if (share?.locked) return <PinGate onTry={tryPin} err={pinErr} what="the presentation" />
  if (share?.error) return <ShareProblem error={share.error} />
  if (!share || share.kind !== 'deck') return <div className="pub"><div className="pub-card"><h1>This link has expired</h1><p className="muted">Ask the production for a fresh link.</p></div></div>

  const d = share.data
  const slides = d.slides || []
  const name = [d.project?.title, d.subtitle && d.subtitle !== d.project?.title ? d.subtitle : ''].filter(Boolean).join(' · ')

  const download = async () => {
    setBusy(true); setErr('')
    try {
      const blob = await pdfFromPictures(slides, d.size || { width: 1600, height: 900 })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${d.project?.title || 'Presentation'}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pdeck">
      <header className="pdeck-head">
        <div className="grow">
          <div className="pdeck-company">{d.company?.logo && <img src={d.company.logo} alt="" />}{d.company?.name || 'THEMADLIONS'}</div>
          <h1>{name}</h1>
        </div>
        <div className="pdeck-actions">
          {slides.length > 0 && <button className="pdeck-btn" type="button" onClick={() => setAt(0)}>Present</button>}
          {slides.length > 0 && <button className="pdeck-btn primary" type="button" onClick={download} disabled={busy}>{busy ? 'Making the PDF…' : 'Download PDF'}</button>}
        </div>
      </header>
      {err && <p className="pdeck-err">{err}</p>}
      <main className="pdeck-slides">
        {slides.map((u, i) => (
          <button key={u} type="button" className="pdeck-slide" onClick={() => setAt(i)} aria-label={`Open slide ${i + 1}`}>
            <img src={u} alt={`Slide ${i + 1}`} loading={i < 2 ? 'eager' : 'lazy'} width={d.size?.width || 1600} height={d.size?.height || 900} />
          </button>
        ))}
      </main>
      {at != null && <Viewer slides={slides} at={at} setAt={setAt} />}
    </div>
  )
}
