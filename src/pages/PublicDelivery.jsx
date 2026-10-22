import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PinGate, ShareProblem, usePublicShare } from '../components/PublicGate.jsx'
import { stageAction, stageLabel } from './Deliveries.jsx'
import { SUPABASE_KEY, SUPABASE_URL } from '../lib/supabaseConfig.js'
import { LOOK_DEFAULT, loadFont, lookProps } from '../lib/estimateLook.js'
import { upper } from '../lib/estimate.js'

const fmt = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

/* Save to Photos on a phone (Alex, 12 Oct). A web page cannot write into the Photos app itself; what an
   iPhone allows is its share sheet with a file in it, which offers Save Video / Save Image. So: the
   first tap fetches the file through our pcloud function (see below) with a progress count; the second tap opens the share sheet with it (the iPhone wants
   that tap to come straight from a finger, not after a long download). A file too big for a phone's
   memory opens the file itself instead, to save from Share. */
const PHOTO_EXT = /\.(mov|mp4|m4v|jpe?g|png|heic|heif|gif|webp)$/i
const BIG = 6e8 // the bytes come through the function, which has a time limit
const mimeOf = (name) => {
  const ext = (name.split('.').pop() || '').toLowerCase()
  return { mov: 'video/quicktime', mp4: 'video/mp4', m4v: 'video/x-m4v', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', heif: 'image/heif', gif: 'image/gif', webp: 'image/webp' }[ext] || 'application/octet-stream'
}
const canShareFiles = () => typeof navigator !== 'undefined' && !!navigator.canShare && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '')
/* A direct pCloud address works only for the connection that asked for it (410 Gone from anywhere
   else, checked 12 Oct), so the page asks pCloud's public API itself (it allows any page) for
   downloads. Save to Photos has to read the bytes in the page, which pCloud's file servers refuse,
   so those come through the production's pcloud function, which answers only for its own links. */
const codeOf = (link) => { const c = new URL(link).searchParams.get('code'); if (!c) throw new Error('Not a pCloud link'); return c }
async function directUrl(link, download = true) {
  const host = /(^|\.)e\.pcloud\.link$|eapi/.test(new URL(link).hostname) ? 'eapi.pcloud.com' : 'api.pcloud.com'
  // without the page's address: pCloud answers "Invalid link referer" to a link asked from another site (checked 12 Oct)
  const r = await (await fetch(`https://${host}/getpublinkdownload?code=${encodeURIComponent(codeOf(link))}${download ? '&forcedownload=1' : ''}`, { referrerPolicy: 'no-referrer' })).json()
  if (r.result !== 0 || !r.hosts?.length) throw new Error(r.error || 'pCloud did not give the file')
  return `https://${r.hosts[0]}${r.path}`
}
const fileThroughFunction = (link) => fetch(`${SUPABASE_URL}/functions/v1/pcloud`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
  body: JSON.stringify({ action: 'publicFile', code: codeOf(link) }),
})

/* Download straight away (Alex, 12 Oct: "Download all should download both at once"): each file's
   direct address from pCloud, saved as a download, one after the other a moment apart (a browser may
   ask once to allow several downloads). If pCloud does not answer, its own page opens instead. */
const fire = (url) => {
  const a = document.createElement('a')
  a.href = url
  a.rel = 'noreferrer'
  a.setAttribute('download', '')
  document.body.appendChild(a)
  a.click()
  a.remove()
}
// plays the file in the browser (its address without forcedownload); pCloud's own page if that fails
async function previewFile(f) {
  try {
    const a = document.createElement('a')
    a.href = await directUrl(f.url, false)
    a.rel = 'noreferrer'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } catch { window.location.href = f.url }
}
async function downloadFiles(files, fallback) {
  try {
    const urls = await Promise.all(files.map((f) => directUrl(f.url)))
    urls.forEach((u, i) => setTimeout(() => fire(u), i * 900))
  } catch {
    // after a wait a new tab would be blocked as a pop-up, so this one goes there
    window.location.href = fallback || files[0]?.url
  }
}
function SaveToPhotos({ file }) {
  const [state, setState] = useState({ step: 'idle', p: 0, ready: null, err: '' })
  if (!canShareFiles() || !PHOTO_EXT.test(file.name || '')) return null
  const fetchIt = async () => {
    setState({ step: 'loading', p: 0, ready: null, err: '' })
    try {
      if (file.size > BIG) { window.location.href = await directUrl(file.url, false); setState({ step: 'idle', p: 0, ready: null, err: '' }); return }
      const res = await fileThroughFunction(file.url)
      if (!res.ok || !res.body) throw new Error('No file')
      const total = Number(res.headers.get('content-length')) || file.size || 0
      const reader = res.body.getReader()
      const parts = []
      let got = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        parts.push(value)
        got += value.length
        if (total) setState((s) => ({ ...s, p: got / total }))
      }
      const f = new File(parts, file.name, { type: mimeOf(file.name) })
      // no more opening the file instead (Alex, 12 Oct: "it does the same as Open"): the share sheet is tried anyway
      setState({ step: 'ready', p: 1, ready: f, err: '' })
    } catch (e) {
      // say what went wrong right here instead of leaving for pCloud's own page
      setState({ step: 'idle', p: 0, ready: null, err: e?.message || 'It could not be prepared.' })
    }
  }
  const share = async () => {
    // the file alone: with a title next to it the iPhone may offer to share the text instead of Save Video
    try { await navigator.share({ files: [state.ready] }) } catch (e) {
      if (e?.name !== 'AbortError') setState((s) => ({ ...s, err: `${e?.name || 'Error'}: ${e?.message || 'the phone refused'}` }))
    }
  }
  if (state.step === 'ready') return (
    <>
      <button type="button" className="dlv-btn dlv-each-btn dlv-photos ready" onClick={share}>Tap to save</button>
      {state.err && <span className="dlv-photos-err">Could not save: {state.err}</span>}
    </>
  )
  return (
    <>
      <button type="button" className="dlv-btn ghost dlv-each-btn dlv-photos" onClick={fetchIt} disabled={state.step === 'loading'}>{state.step === 'loading' ? `${Math.round(state.p * 100)}%` : state.err ? 'Try again' : 'Save to Photos'}</button>
      {state.err && <span className="dlv-photos-err">Could not save: {state.err}</span>}
    </>
  )
}

export default function PublicDelivery() {
  const { token } = useParams()
  const { share, tryPin, pinErr } = usePublicShare(token)

  // The client's page in the company site's look (Alex, 22 Oct: "like our page on themadlions.com"), the same as a
  // cost estimate's: near-black, cream letters, the red accent, whatever the app's own theme or skin is
  useEffect(() => {
    const html = document.documentElement
    const before = html.dataset.theme
    const skin = html.dataset.skin
    html.dataset.theme = 'dark'
    html.classList.add('pub-est-page')
    delete html.dataset.skin
    loadFont(LOOK_DEFAULT.font)
    html.style.setProperty('--est-page-bg', LOOK_DEFAULT.bg)
    return () => { html.dataset.theme = before; html.classList.remove('pub-est-page'); html.style.removeProperty('--est-page-bg'); if (skin) html.dataset.skin = skin }
  }, [])

  if (share === undefined) return <div className="pub"><p className="pub-loading">Loading…</p></div>
  if (share?.closed) {
    return <div className="pub"><div className="pub-card"><h1>This link is closed</h1><p className="muted">The production has closed this page. Ask them for a fresh one.</p></div></div>
  }
  if (share?.locked) return <PinGate onTry={tryPin} err={pinErr} what="this page" />
  if (share?.error) return <ShareProblem error={share.error} />
  if (!share || share.kind !== 'delivery') {
    return <div className="pub"><div className="pub-card"><h1>This link has expired</h1><p className="muted">Ask the production for a fresh one.</p></div></div>
  }

  const d = share.data
  const look = lookProps(LOOK_DEFAULT)

  return (
    <div className={`pub dlv dlv-estimate dlv-site ${look.className}`} style={look.style}>
      <div className="dlv-sheet">
        {/* the company site's own head (Alex, 22 Oct): THE MAD LIONS as the site's wordmark, MAD bold, and the red
            Film production house under it, instead of the small logo and the name in small letters */}
        <header className="dlv-band dlv-top dlv-brand">
          <img className="dlv-wordmark" src="./site/wordmark.png" alt={d.company?.name || 'THEMADLIONS'} />
          <div className="dlv-kicker">Film production house</div>
        </header>

        <section className="dlv-band dlv-hero">
          <div className="dlv-stage">{stageLabel(d.stage)}{d.version ? ` · ${d.version}` : ''}</div>
          <h1 className="dlv-title">{d.title}</h1>
          {d.client && <p className="dlv-client">{upper(d.client)}</p>}
          {d.recipient?.name && <p className="dlv-for">For {d.recipient.name}</p>}

          {/* Final Deliverables' message to the client (Alex, 22 Oct), where the big button was */}
          {d.message && <p className="dlv-message">{d.message}</p>}

          {/* one file or a bare link: the big button here; several files (Alex, 12 Oct) get one button per file and
              Download all under them, as wide as the files' tiles (Alex, 22 Oct) */}
          {!(d.files?.length > 1) && (d.files?.length === 1 ? (
            <button type="button" className="dlv-btn" onClick={() => downloadFiles(d.files, d.link)}>{stageAction(d.stage)}</button>
          ) : (
            <a className="dlv-btn" href={d.link} target="_blank" rel="noreferrer">{stageAction(d.stage)}</a>
          ))}
          {d.files?.length > 1 && (
            <ul className="plain dlv-each">
              {d.files.map((f) => (
                <li key={f.url}>
                  <span className="dlv-each-text">
                    <span className="dlv-each-name">{f.name}</span>
                    {f.size > 0 && <span className="dlv-each-size">{f.size > 1e9 ? `${(f.size / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(f.size / 1e6))} MB`}</span>}
                  </span>
                  <span className="dlv-each-acts">
                    <SaveToPhotos file={f} />
                    {/* on a phone the file goes to Photos with the button beside it, so this one plays it (Alex, 12 Oct) */}
                    {canShareFiles() && PHOTO_EXT.test(f.name || '')
                      ? <button type="button" className="dlv-btn ghost dlv-each-btn" onClick={() => previewFile(f)}>Preview</button>
                      : <button type="button" className="dlv-btn ghost dlv-each-btn" onClick={() => downloadFiles([f], f.url)}>Download</button>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {d.files?.length > 1 && (
            <button type="button" className="dlv-btn dlv-all" onClick={() => downloadFiles(d.files, d.link)}>Download all {d.files.length} files</button>
          )}
          {/* one file uploaded to pCloud: Save to Photos under the big button, on a phone */}
          {!(d.files?.length > 1) && d.files?.length === 1 && (
            <div className="dlv-one-photos"><SaveToPhotos file={d.files[0]} /></div>
          )}
          {/* one line with dots instead of three stacked greys */}
          <p className="dlv-meta">
            {[
              d.linkLabel,
              d.linkExpires ? `Until ${fmt(d.linkExpires)}` : '',
            ].filter(Boolean).map((t, i) => <span key={i}>{t}</span>)}
            {d.password && <span>Password <b className="dlv-pass">{d.password}</b></span>}
          </p>
          {/* Final Deliverables' fine print (Alex, 22 Oct): small and quiet, under the files */}
          {d.fine && <p className="dlv-fine">{d.fine}</p>}
        </section>

        {(d.note || d.feedbackBy) && (
          <section className="dlv-band dlv-say">
            {d.note && <p className="dlv-note">{d.note}</p>}
            {d.feedbackBy && <p className="dlv-by">Your notes by <b>{fmt(d.feedbackBy)}</b></p>}
          </section>
        )}

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
                <li key={i}><b>{x.name}</b>{[x.format, x.notes].filter(Boolean).length ? <span className="muted">{[x.format, x.notes].filter(Boolean).join(' · ')}</span> : null}</li>
              ))}
            </ul>
          </section>
        )}

        {/* no answer form on the client's page any more (Alex, 22 Oct): no Approve or Ask for changes, as on an estimate */}

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
