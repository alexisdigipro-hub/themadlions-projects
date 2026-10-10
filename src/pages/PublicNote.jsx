import { useParams } from 'react-router-dom'
import { PinGate, ShareProblem, usePublicShare } from '../components/PublicGate.jsx'
import { cleanHtml } from '../lib/notes.js'

/* A note opened from its link (Alex, 10 Oct): anyone with the link reads it, no sign-in. The writer
   makes or removes the link from the note's Share window; it shows the note as last saved. */
export default function PublicNote() {
  const { token } = useParams()
  const { share, tryPin, pinErr } = usePublicShare(token)

  if (share === undefined) return <div className="pub"><p className="pub-loading">Loading…</p></div>
  if (share?.closed) return <div className="pub"><div className="pub-card"><h1>This link is closed</h1><p className="muted">Ask for a fresh one.</p></div></div>
  if (share?.locked) return <PinGate onTry={tryPin} err={pinErr} what="this note" />
  if (share?.error) return <ShareProblem error={share.error} />
  if (!share || share.kind !== 'note') {
    return <div className="pub"><div className="pub-card"><h1>This note is no longer shared</h1><p className="muted">Ask whoever sent it for a fresh link.</p></div></div>
  }
  const d = share.data || {}
  const when = d.updatedAt ? new Date(d.updatedAt).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="pub pub-note">
      <div className="pub-note-sheet">
        <header className="pub-note-head">
          {d.logo && <img className="pub-note-logo" src={d.logo} alt="" />}
          <div className="pub-note-who">{[d.company, d.author].filter(Boolean).join(' · ')}{when && <span>{when}</span>}</div>
        </header>
        <article className="pub-note-body" dangerouslySetInnerHTML={{ __html: cleanHtml(d.html) }} />
      </div>
    </div>
  )
}
