import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, PageHead, Select, Textarea, useToast } from '../components/ui.jsx'
import { STATUSES, can, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { deliveryUrl, listShares, publishShare, removeShare, reopenQuietly, setShareState, shareUrl, statusUrl, tokenOf } from '../lib/shares.js'
import { fmtDate, toISODate } from '../lib/dates.js'

export const STAGES = [
  ['rough', 'Rough cut'],
  ['prefinal', 'Prefinal'],
  ['final', 'Final cut'],
  ['files', 'Final files'],
  ['treatment', 'Treatment'],
  ['lookbook', 'Lookbook'],
]
/* What the big button says. A treatment is read, a cut is watched, files are downloaded. */
export const stageAction = (k) =>
  k === 'files' ? 'Download the files'
  : k === 'treatment' ? 'Read the treatment'
  : k === 'lookbook' ? 'Open the lookbook'
  : 'Watch the cut'
export const stageLabel = (k) => STAGES.find((s) => s[0] === k)?.[1] || 'Rough cut'
const RESPONSE = { approved: 'Approved', changes: 'Changes asked', seen: 'Seen' }

const emptyDelivery = () => ({
  id: uid(), projectId: '', stage: 'rough', version: '', title: '', client: '',
  link: '', linkLabel: '', password: '', linkExpires: '', pageCloses: '', note: '', feedbackBy: '',
  credits: [], deliverables: [], contactName: '', contactEmail: '', contactPhone: '',
})

const emptyStatus = () => ({
  id: uid(), projectId: '', title: '', client: '', headline: '', note: '',
  next: [], needs: [], contactName: '', contactEmail: '', contactPhone: '', pageCloses: '',
})

export default function Deliveries() {
  const { state } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  if (!can(user, 'share')) return <Navigate to="/home" replace />
  const editable = can(user, 'share', 'edit')
  const projects = visibleProjects(state, user)
  const [rows, setRows] = useState(undefined) // undefined = loading
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('delivery')
  const [sdraft, setSdraft] = useState(null)

  const reload = () => {
    if (!state.workspace?.id) return setRows([])
    listShares(state.workspace.id).then(setRows).catch((e) => { setError(e.message); setRows([]) })
  }
  useEffect(reload, [state.workspace?.id])

  const projTitle = (id) => projects.find((p) => p.id === id)?.title || ''
  // The credits and the deliverables are already in the project, so this offers them rather
  // than asking Alex to type a crew list he has typed once already.
  const crewOf = (projectId) => {
    const p = state.projects.find((x) => x.id === projectId)
    return (p?.contacts || []).filter((c) => c.kind === 'crew' && c.name).map((c) => ({ role: c.role || c.dept || '', name: c.name }))
  }
  const delivOf = (projectId) => {
    const p = state.projects.find((x) => x.id === projectId)
    return (p?.post?.deliverables || []).filter((d) => d.name).map((d) => ({ name: d.name, format: d.format || '', notes: d.notes || '' }))
  }

  const startNew = () => setDraft(emptyDelivery())
  const pickProject = (projectId) => {
    const p = state.projects.find((x) => x.id === projectId)
    setDraft((d) => ({
      ...d, projectId,
      title: d.title || p?.title || '',
      client: d.client || p?.client || '',
      credits: d.credits.length ? d.credits : crewOf(projectId),
      deliverables: d.deliverables.length ? d.deliverables : delivOf(projectId),
    }))
  }
  const setD = (k, v) => setDraft((d) => ({ ...d, [k]: v }))

  const publish = async () => {
    if (!draft.link.trim()) return toast('Paste the download link (SwissTransfer, WeTransfer…).', 'error')
    if (!draft.title.trim()) return toast('Give it a title, or pick a project.', 'error')
    setBusy(true)
    try {
      const cs = state.settings.callsheet || {}
      const data = {
        stage: draft.stage,
        version: draft.version.trim(),
        title: draft.title.trim(),
        client: draft.client.trim(),
        projectId: draft.projectId,
        color: state.projects.find((p) => p.id === draft.projectId)?.color || '#C8503F',
        company: { name: state.workspace.name, logo: state.settings.logo || '', address: state.settings.companyAddress || '', footer: cs.footer || '' },
        link: draft.link.trim(),
        linkLabel: draft.linkLabel.trim(),
        password: draft.password.trim(),
        linkExpires: draft.linkExpires,
        note: draft.note.trim(),
        feedbackBy: draft.feedbackBy,
        credits: draft.stage === 'files' ? draft.credits.filter((c) => c.name) : [],
        deliverables: draft.stage === 'files' ? draft.deliverables.filter((d) => d.name) : [],
        contact: { name: draft.contactName.trim(), email: draft.contactEmail.trim(), phone: draft.contactPhone.trim() },
        sentAt: new Date().toISOString(),
      }
      const ref = `delivery:${draft.id}`
      const url = await publishShare({ workspaceId: state.workspace.id, kind: 'delivery', ref, data, userId: user?.id })
      await reopenQuietly({ workspaceId: state.workspace.id, ref })
      if (draft.pageCloses) {
        // the page is published either way; only the closing date can fail, and it says why
        try { await setShareState({ workspaceId: state.workspace.id, ref, expiresAt: draft.pageCloses }) } catch (e) { toast(e.message, 'error') }
      }
      const token = tokenOf(url)
      await navigator.clipboard.writeText(deliveryUrl(token)).catch(() => {})
      toast('Delivery page published, link copied', 'ok')
      setDraft(null)
      reload()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); toast(`${what} copied`, 'ok') } catch { toast('Could not copy', 'error') }
  }
  const mailText = (r) => {
    const d = r.data
    return `${d.title}${d.version ? ` · ${d.version}` : ''} — ${stageLabel(d.stage)}\n\n${deliveryUrl(r.token)}\n\n${state.workspace.name}`
  }

  const today = toISODate(new Date()) // local date, not UTC: a link must not look closed a day early
  const all = useMemo(() => (rows || []).map((r) => {
    const d = r.data || {}
    const isDelivery = r.kind === 'delivery'
    const isStatus = r.kind === 'status'
    const day = d.day || {}
    return {
      ...r,
      isDelivery,
      isStatus,
      url: isDelivery ? deliveryUrl(r.token) : isStatus ? statusUrl(r.token) : shareUrl(r.token),
      shut: !!r.closed || (!!r.expires_at && r.expires_at < today),
      answers: Array.isArray(r.responses) ? r.responses : [],
      badge: isDelivery ? stageLabel(d.stage) : isStatus ? 'Status' : 'Call sheet',
      badgeClass: isDelivery ? `s-${d.stage}` : isStatus ? 's-status' : 's-callsheet',
      name: isDelivery || isStatus ? d.title : (d.project?.title || 'Call sheet'),
      version: isDelivery ? d.version : isStatus ? '' : (day.index ? `Day ${day.index}${day.count ? ` of ${day.count}` : ''}` : ''),
      sub: isDelivery
        ? [d.client, projTitle(d.projectId), d.sentAt ? `sent ${fmtDate(d.sentAt.slice(0, 10), { day: 'numeric', month: 'short' })}` : ''].filter(Boolean).join(' · ')
        : isStatus
          ? [d.client, d.headline].filter(Boolean).join(' · ')
          : [day.date ? fmtDate(day.date, { weekday: 'short', day: 'numeric', month: 'short' }) : '', day.callTime ? `call ${day.callTime}` : ''].filter(Boolean).join(' · '),
    }
  }), [rows, state.projects])
  const list = useMemo(() => (filter === 'all' ? all : all.filter((r) => r.kind === filter)), [all, filter])
  const counts = { all: all.length, delivery: all.filter((r) => r.isDelivery).length, status: all.filter((r) => r.isStatus).length, callsheet: all.filter((r) => r.kind === 'callsheet').length }
  // These two only exist once the matching SQL file has been run, so say so rather than hiding the gap.
  const sample = all[0]
  const noReplies = !!sample && sample.responses === undefined
  const noTracking = !!sample && sample.opens === undefined

  const startStatus = () => setSdraft(emptyStatus())
  /* A status page is one per project and keeps the same link, so opening an existing one means
     editing it rather than starting again. */
  const openStatus = (r) => {
    const d = r.data || {}
    setSdraft({
      id: d.projectId || uid(), projectId: d.projectId || '', title: d.title || '', client: d.client || '',
      headline: d.headline || '', note: d.note || '', next: d.next || [], needs: d.needs || [],
      contactName: d.contact?.name || '', contactEmail: d.contact?.email || '', contactPhone: d.contact?.phone || '',
      pageCloses: r.expires_at || '',
    })
  }
  const pickStatusProject = (projectId) => {
    const p = state.projects.find((x) => x.id === projectId)
    setSdraft((d) => ({
      ...d, projectId,
      title: d.title || p?.title || '',
      client: d.client || p?.client || '',
      headline: d.headline || p?.status || '',
    }))
  }
  const setS = (k, v) => setSdraft((d) => ({ ...d, [k]: v }))

  const publishStatus = async () => {
    if (!sdraft.title.trim()) return toast('Give it a title, or pick a project.', 'error')
    setBusy(true)
    try {
      const cs = state.settings.callsheet || {}
      const data = {
        title: sdraft.title.trim(),
        client: sdraft.client.trim(),
        projectId: sdraft.projectId,
        headline: sdraft.headline.trim(),
        note: sdraft.note.trim(),
        next: sdraft.next.filter((x) => x.what),
        needs: sdraft.needs.filter((x) => x.what),
        company: { name: state.workspace.name, logo: state.settings.logo || '', footer: cs.footer || '' },
        contact: { name: sdraft.contactName.trim(), email: sdraft.contactEmail.trim(), phone: sdraft.contactPhone.trim() },
      }
      const ref = `status:${sdraft.projectId || sdraft.id}`
      const url = await publishShare({ workspaceId: state.workspace.id, kind: 'status', ref, data, userId: user?.id })
      await reopenQuietly({ workspaceId: state.workspace.id, ref })
      try { await setShareState({ workspaceId: state.workspace.id, ref, expiresAt: sdraft.pageCloses }) } catch (e) { toast(e.message, 'error') }
      await navigator.clipboard.writeText(statusUrl(tokenOf(url))).catch(() => {})
      toast('Status page published, link copied', 'ok')
      setSdraft(null)
      reload()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const setShut = async (r, shut) => {
    try {
      await setShareState({ workspaceId: state.workspace.id, ref: r.ref, closed: shut })
      toast(shut ? 'Link closed' : 'Link open again', 'ok')
      reload()
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <div className="deliveries">
      <PageHead title="Share" sub="Every link you have sent out of the building, and what happened to it">
        {editable && <Button variant="ghost" onClick={startStatus}>New status page</Button>}
        {editable && <Button variant="primary" onClick={startNew}>New delivery</Button>}
      </PageHead>

      {error && <p className="muted small">{error}</p>}
      {noReplies && <p className="muted small">Run <b>supabase/deliveries.sql</b> in Supabase to collect the clients' answers.</p>}
      {noTracking && <p className="muted small">Run <b>supabase/share_track.sql</b> in Supabase to see whether a link was opened, and to close one.</p>}

      <div className="chips">
        {[['delivery', 'Deliveries'], ['status', 'Status pages'], ['callsheet', 'Call sheets'], ['all', 'Everything']].map(([k, label]) => (
          <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>
            {label}
            <small>{counts[k]}</small>
          </button>
        ))}
      </div>

      {rows === undefined ? (
        <p className="muted">Loading…</p>
      ) : !list.length ? (
        <Empty title={filter === 'callsheet' ? 'No call sheet links yet' : 'Nothing sent yet'} action={editable && filter !== 'callsheet' && <Button variant="primary" onClick={startNew}>Send the first one</Button>}>
          {filter === 'callsheet'
            ? 'Call sheet links are made from the day itself, inside the project. They show up here so you can see what is still open and close it when the shoot is over.'
            : 'Paste the link you already made on SwissTransfer or WeTransfer, choose the stage, and the app gives you a page with your logo to send instead. The client opens it, downloads, and can approve or ask for changes right there.'}
        </Empty>
      ) : (
        <ul className="plain deliv-list">
          {list.map((r) => {
            const last = r.answers[r.answers.length - 1]
            return (
              <li key={r.token} className={`deliv-row${r.shut ? ' is-shut' : ''}`}>
                <span className={`deliv-stage ${r.badgeClass}`}>{r.badge}</span>
                <div className="grow">
                  <strong>{r.name}{r.version ? <span className="muted"> · {r.version}</span> : null}</strong>
                  <div className="small muted">{r.sub}</div>
                  {(r.shut || r.opens !== undefined) && (
                    <div className="small muted deliv-opens">
                      {r.shut && <b className="deliv-shut">Closed</b>}
                      {r.opens === undefined ? null
                        : r.opens > 0 ? <>Opened {r.opens} {r.opens === 1 ? 'time' : 'times'}{r.opened_at ? `, last ${fmtDate(r.opened_at.slice(0, 10), { day: 'numeric', month: 'short' })}` : ''}</>
                        : <>Not opened yet</>}
                      {r.expires_at && !r.closed ? ` · closes ${fmtDate(r.expires_at, { day: 'numeric', month: 'short' })}` : ''}
                    </div>
                  )}
                  {last && (
                    <div className={`small deliv-answer ${last.status}`}>
                      {RESPONSE[last.status] || 'Seen'}{last.name ? ` · ${last.name}` : ''}
                      {last.note ? ` · “${last.note}”` : ''}
                      {r.answers.length > 1 ? ` · ${r.answers.length} replies` : ''}
                    </div>
                  )}
                </div>
                <div className="deliv-tools">
                  <button className="link small" onClick={() => copy(r.url, 'Link')}>Copy link</button>
                  {r.isDelivery && <button className="link small" onClick={() => copy(mailText(r), 'Message')}>Copy for email</button>}
                  <a className="link small" href={r.url} target="_blank" rel="noreferrer">Open</a>
                  {editable && r.isStatus && <button className="link small" onClick={() => openStatus(r)}>Update</button>}
                  {editable && r.opens !== undefined && (
                    <button className="link small" onClick={() => setShut(r, !r.shut)}>{r.shut ? 'Reopen' : 'Close'}</button>
                  )}
                  {editable && <Confirm onConfirm={async () => { await removeShare({ workspaceId: state.workspace.id, ref: r.ref }); reload() }} label="Delete">×</Confirm>}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Modal open={!!draft} title="New delivery" wide onClose={() => !busy && setDraft(null)}
        footer={<><Button variant="ghost" onClick={() => setDraft(null)} disabled={busy}>Cancel</Button><Button variant="primary" onClick={publish} disabled={busy}>{busy ? 'Publishing…' : 'Publish and copy link'}</Button></>}>
        {draft && (
          <div className="stack">
            <div className="row-3">
              <Field label="Stage"><Select value={draft.stage} onChange={(e) => setD('stage', e.target.value)} options={STAGES} /></Field>
              <Field label="Project" hint="Fills in the title, the client and the credits."><Select value={draft.projectId} onChange={(e) => pickProject(e.target.value)} options={[['', 'Not in the app'], ...projects.map((p) => [p.id, p.title])]} /></Field>
              <Field label="Version" hint="v1, v2, cut 3…"><Input value={draft.version} onChange={(e) => setD('version', e.target.value)} placeholder="v2" /></Field>
            </div>
            <div className="row-2">
              <Field label="Title"><Input value={draft.title} onChange={(e) => setD('title', e.target.value)} placeholder="Καίτη Γαρμπή — Το τραγούδι" /></Field>
              <Field label="Client / artist"><Input value={draft.client} onChange={(e) => setD('client', e.target.value)} /></Field>
            </div>
            <Field label="Download link" hint="Paste the SwissTransfer or WeTransfer link you already made."><Input value={draft.link} onChange={(e) => setD('link', e.target.value)} placeholder="https://www.swisstransfer.com/d/…" /></Field>
            <div className="row-3">
              <Field label="Where it is hosted"><Input value={draft.linkLabel} onChange={(e) => setD('linkLabel', e.target.value)} placeholder="SwissTransfer" /></Field>
              <Field label="Password on the transfer"><Input value={draft.password} onChange={(e) => setD('password', e.target.value)} placeholder="Leave empty if none" /></Field>
              <Field label="The transfer expires"><Input type="date" value={draft.linkExpires} onChange={(e) => setD('linkExpires', e.target.value)} /></Field>
            </div>
            <Field label="Close this page on" hint="After this date the link stops working and says so. Leave empty to keep it open until you close it by hand."><Input type="date" value={draft.pageCloses} onChange={(e) => setD('pageCloses', e.target.value)} /></Field>
            <Field label="Your note" hint="What changed, what to look at, what is still missing."><Textarea rows={3} value={draft.note} onChange={(e) => setD('note', e.target.value)} /></Field>
            <div className="row-2">
              <Field label="Answer by" hint="Shown on the page so it is not forgotten."><Input type="date" value={draft.feedbackBy} onChange={(e) => setD('feedbackBy', e.target.value)} /></Field>
              <Field label="Who they reply to"><Input value={draft.contactName} onChange={(e) => setD('contactName', e.target.value)} placeholder={user?.name || 'Name'} /></Field>
            </div>
            <div className="row-2">
              <Field label="Email"><Input value={draft.contactEmail} onChange={(e) => setD('contactEmail', e.target.value)} /></Field>
              <Field label="Phone"><Input value={draft.contactPhone} onChange={(e) => setD('contactPhone', e.target.value)} /></Field>
            </div>

            {draft.stage === 'files' && (
              <>
                <RowEditor
                  label="Credits"
                  hint="Taken from the project's cast and crew. Remove whoever should not be on it."
                  rows={draft.credits}
                  onChange={(v) => setD('credits', v)}
                  fields={[{ k: 'role', placeholder: 'Director' }, { k: 'name', placeholder: 'Name' }]}
                  addLabel="Add a credit"
                />
                <RowEditor
                  label="Files included"
                  hint="Taken from the project's Post tab."
                  rows={draft.deliverables}
                  onChange={(v) => setD('deliverables', v)}
                  fields={[{ k: 'name', placeholder: 'Master 4K' }, { k: 'format', placeholder: 'ProRes 422 HQ' }, { k: 'notes', placeholder: 'with LUT applied' }]}
                  addLabel="Add a file"
                />
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!sdraft} title="Status page for the client" wide onClose={() => !busy && setSdraft(null)}
        footer={<><Button variant="ghost" onClick={() => setSdraft(null)} disabled={busy}>Cancel</Button><Button variant="primary" onClick={publishStatus} disabled={busy}>{busy ? 'Publishing…' : 'Publish and copy link'}</Button></>}>
        {sdraft && (
          <div className="stack">
            <p className="muted small">One page per project that you keep updating. The link never changes, so the client can keep it and always see where the job stands.</p>
            <div className="row-2">
              <Field label="Project" hint="Fills in the title, the client and the stage."><Select value={sdraft.projectId} onChange={(e) => pickStatusProject(e.target.value)} options={[['', 'Not in the app'], ...projects.map((p) => [p.id, p.title])]} /></Field>
              <Field label="Where we are" hint="One line, big on the page."><Select value={sdraft.headline} onChange={(e) => setS('headline', e.target.value)} options={[['', 'Pick one'], ...STATUSES.map((x) => [x, x])]} /></Field>
            </div>
            <div className="row-2">
              <Field label="Title"><Input value={sdraft.title} onChange={(e) => setS('title', e.target.value)} /></Field>
              <Field label="Client / artist"><Input value={sdraft.client} onChange={(e) => setS('client', e.target.value)} /></Field>
            </div>
            <Field label="Your note" hint="What has happened since the last time they looked."><Textarea rows={3} value={sdraft.note} onChange={(e) => setS('note', e.target.value)} /></Field>
            <RowEditor
              label="What happens next"
              hint="The steps on your side, with a date when there is one."
              rows={sdraft.next}
              onChange={(v) => setS('next', v)}
              fields={[{ k: 'what', placeholder: 'Colour grade' }, { k: 'when', placeholder: '2026-10-05', type: 'date' }]}
              addLabel="Add a step"
            />
            <RowEditor
              label="What we need from you"
              hint="So it is written down instead of chased on the phone."
              rows={sdraft.needs}
              onChange={(v) => setS('needs', v)}
              fields={[{ k: 'what', placeholder: 'Approve the music' }, { k: 'when', placeholder: '2026-10-01', type: 'date' }]}
              addLabel="Add something"
            />
            <div className="row-3">
              <Field label="Who they ask"><Input value={sdraft.contactName} onChange={(e) => setS('contactName', e.target.value)} placeholder={user?.name || 'Name'} /></Field>
              <Field label="Email"><Input value={sdraft.contactEmail} onChange={(e) => setS('contactEmail', e.target.value)} /></Field>
              <Field label="Phone"><Input value={sdraft.contactPhone} onChange={(e) => setS('contactPhone', e.target.value)} /></Field>
            </div>
            <Field label="Close this page on" hint="Leave empty to keep it open until you close it by hand."><Input type="date" value={sdraft.pageCloses} onChange={(e) => setS('pageCloses', e.target.value)} /></Field>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* A short editable list: the credits and files on a delivery, the steps on a status page. */
function RowEditor({ label, hint, rows, onChange, fields, addLabel }) {
  const set = (i, k, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="rowlist">
        {rows.map((r, i) => (
          <div key={i} className="rowlist-row">
            {fields.map((f) => <Input key={f.k} type={f.type || 'text'} value={r[f.k] || ''} placeholder={f.placeholder} onChange={(e) => set(i, f.k, e.target.value)} />)}
            <button className="link small" onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        {!rows.length && <p className="muted small">Nothing yet.</p>}
        <Button variant="ghost" onClick={() => onChange([...rows, Object.fromEntries(fields.map((f) => [f.k, '']))])}>{addLabel}</Button>
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}
