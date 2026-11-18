import { useEffect, useRef, useState } from 'react'
import { Button, DateInput, Field, Modal, useToast } from './ui.jsx'
import { can, useCurrentUser, useStore } from '../lib/store.jsx'
import { newPin, projectUrl, tokenOf } from '../lib/shares.js'
import { DEFAULT_SECTIONS, SECTIONS, getProjectShare, publishProjectShare, removeProjectShare, setProjectShare } from '../lib/projectShare.js'
import { fmtDate } from '../lib/dates.js'

/* Share with collaborators (Alex, 18 Nov; lib/projectShare.js): one link per project, what it shows, a code, a date
   it closes, Close, and the comments the collaborators leave. */
export default function ProjectShare({ project, onClose }) {
  const { state } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const [row, setRow] = useState(undefined) // undefined loading, null none
  const [busy, setBusy] = useState(false)
  const [sections, setSections] = useState(DEFAULT_SECTIONS)
  const load = async () => {
    try {
      const r = await getProjectShare(state, project.id)
      setRow(r)
      if (r?.data?.sections) setSections(r.data.sections)
    } catch (e) { setRow(null); toast(e.message, 'error') }
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const url = row ? projectUrl(row.token) : ''
  const copy = async (u = url) => { try { await navigator.clipboard.writeText(u); toast('Link copied', 'ok') } catch { toast('Could not copy', 'error') } }

  const publish = async (secs = sections, quiet = false) => {
    setBusy(true)
    try {
      const u = await publishProjectShare({ project, state, sections: secs, userId: user?.id })
      if (!row) { await copy(projectUrl(tokenOf(u))) }
      else if (!quiet) toast('Updated', 'ok')
      await load()
    } catch (e) { toast(e.message, 'error') }
    setBusy(false)
  }
  const toggle = (k) => {
    const next = sections.includes(k) ? sections.filter((x) => x !== k) : [...sections, k]
    setSections(next)
    if (row) publish(next, true)
  }
  const patch = async (p, msg) => {
    setBusy(true)
    try { await setProjectShare(state, project.id, p); if (msg) toast(msg, 'ok'); await load() } catch (e) { toast(e.message, 'error') }
    setBusy(false)
  }
  const comments = (Array.isArray(row?.responses) ? row.responses : []).filter((c) => c.note || c.status === 'comment').slice().reverse()

  return (
    <Modal open title="Share with collaborators" onClose={onClose} className="pshare">
      <p className="small muted">A link for people outside the team. They see the progress and what you choose below, and can leave comments; they cannot change anything. Money, phone numbers, emails, notes and files never go on it.</p>
      <div className="pshare-secs" role="group" aria-label="What the link shows">
        {SECTIONS.map(([k, label, hint]) => (
          <button key={k} type="button" role="switch" aria-checked={sections.includes(k)} className={`pshare-sec${sections.includes(k) ? ' on' : ''}`} onClick={() => toggle(k)} disabled={busy}>
            <span className="pshare-tick" aria-hidden="true">{sections.includes(k) && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m6 12.5 4 4 8-9" /></svg>}</span>
            <span><b>{label}</b><small>{hint}</small></span>
          </button>
        ))}
      </div>

      {row === undefined ? <p className="muted small">Loading…</p> : !row ? (
        <div className="pshare-acts"><Button variant="primary" disabled={busy} onClick={() => publish()}>{busy ? 'Making the link…' : 'Make the link and copy it'}</Button></div>
      ) : (
        <>
          <div className="pshare-link">
            <input className="input" readOnly value={url} onFocus={(e) => e.target.select()} aria-label="The link" />
            <Button variant="primary" onClick={() => copy()}>Copy link</Button>
          </div>
          <p className="small muted">{row.closed ? 'Closed: the link shows nothing until you open it again.' : `Opened ${row.opens || 0} time${row.opens === 1 ? '' : 's'}${row.opened_at ? `, last ${fmtDate(String(row.opened_at).slice(0, 10), { day: 'numeric', month: 'short' })}` : ''}. It follows the project by itself.`}</p>
          <div className="pshare-row">
            <Field label="Code to open it">
              <div className="pshare-inline">
                {row.pin ? <b className="pshare-pin">{row.pin}</b> : <span className="muted small">No code</span>}
                {row.pin
                  ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => patch({ pin: '' }, 'Code taken off')}>Take it off</Button>
                  : <Button variant="ghost" size="sm" disabled={busy} onClick={() => patch({ pin: newPin() }, 'Code added: send it to them apart from the link')}>Add a code</Button>}
              </div>
            </Field>
            <Field label="Closes on">
              <DateInput type="date" value={row.expires_at || ''} onChange={(e) => patch({ expiresAt: e.target.value })} />
            </Field>
          </div>
          <div className="pshare-acts">
            <Button variant="ghost" disabled={busy} onClick={() => publish()}>Update now</Button>
            <Button variant="ghost" disabled={busy} onClick={() => patch({ closed: !row.closed }, row.closed ? 'Link open again' : 'Link closed')}>{row.closed ? 'Open the link again' : 'Close the link'}</Button>
            <Button variant="ghost" className="pshare-del" disabled={busy} onClick={async () => { if (!window.confirm('Delete this link? It stops working and its comments go.')) return; setBusy(true); try { await removeProjectShare(state, project.id); setRow(null); toast('Link deleted', 'ok') } catch (e) { toast(e.message, 'error') } setBusy(false) }}>Delete</Button>
          </div>
          <h3 className="pshare-h">Comments{comments.length ? ` · ${comments.length}` : ''}</h3>
          {comments.length ? (
            <ul className="plain pshare-comments">
              {comments.map((c, i) => (
                <li key={i}><div className="pshare-c-head"><b>{c.name || 'Someone'}</b><small className="muted">{c.at ? new Date(c.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</small></div><p>{c.note}</p></li>
              ))}
            </ul>
          ) : <p className="small muted">No comments yet.</p>}
        </>
      )}
    </Modal>
  )
}

/* While a project's link is open, it follows the project: a few seconds after a change the snapshot is written
   again, with the sections it already shows. Only someone who may edit shares does it. */
export function useProjectShareSync(project) {
  const { state } = useStore()
  const user = useCurrentUser()
  const may = can(user, 'share', 'edit')
  const live = useRef(null) // the row's sections while a link is open, else false
  useEffect(() => {
    let off = false
    if (!may || !project?.id) return undefined
    getProjectShare(state, project.id).then((r) => { if (!off) live.current = r && !r.closed ? (r.data?.sections || DEFAULT_SECTIONS) : false }).catch(() => {})
    return () => { off = true }
  }, [project?.id, may]) // eslint-disable-line react-hooks/exhaustive-deps
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return undefined }
    if (!may || !live.current) return undefined
    const t = setTimeout(() => { publishProjectShare({ project, state, sections: live.current, userId: user?.id }).catch(() => {}) }, 4000)
    return () => clearTimeout(t)
  }, [project]) // eslint-disable-line react-hooks/exhaustive-deps
}
