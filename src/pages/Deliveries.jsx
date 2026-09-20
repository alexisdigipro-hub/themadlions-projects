import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, PageHead, Select, Textarea, useToast } from '../components/ui.jsx'
import { can, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { deliveryUrl, listDeliveries, publishShare, removeShare, tokenOf } from '../lib/shares.js'
import { fmtDate } from '../lib/dates.js'

export const STAGES = [
  ['rough', 'Rough cut'],
  ['prefinal', 'Prefinal'],
  ['final', 'Final cut'],
  ['files', 'Final files'],
]
export const stageLabel = (k) => STAGES.find((s) => s[0] === k)?.[1] || 'Rough cut'
const RESPONSE = { approved: 'Approved', changes: 'Changes asked', seen: 'Seen' }

const emptyDelivery = () => ({
  id: uid(), projectId: '', stage: 'rough', version: '', title: '', client: '',
  link: '', linkLabel: '', password: '', linkExpires: '', note: '', feedbackBy: '',
  credits: [], deliverables: [], contactName: '', contactEmail: '', contactPhone: '',
})

export default function Deliveries() {
  const { state } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  if (!can(user, 'post')) return <Navigate to="/home" replace />
  const editable = can(user, 'post', 'edit')
  const projects = visibleProjects(state, user)
  const [rows, setRows] = useState(undefined) // undefined = loading
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)

  const reload = () => {
    if (!state.workspace?.id) return setRows([])
    listDeliveries(state.workspace.id).then(setRows).catch((e) => { setError(e.message); setRows([]) })
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
      const url = await publishShare({ workspaceId: state.workspace.id, kind: 'delivery', ref: `delivery:${draft.id}`, data, userId: user?.id })
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

  const list = useMemo(() => (rows || []).map((r) => ({
    ...r,
    answers: Array.isArray(r.responses) ? r.responses : [],
  })), [rows])

  return (
    <div className="deliveries">
      <PageHead title="Share" sub="Send a cut or the final files as a page with your logo, instead of a bare link">
        {editable && <Button variant="primary" onClick={startNew}>New delivery</Button>}
      </PageHead>

      {error && <p className="muted small">{error}</p>}

      {rows === undefined ? (
        <p className="muted">Loading…</p>
      ) : !list.length ? (
        <Empty title="Nothing sent yet" action={editable && <Button variant="primary" onClick={startNew}>Send the first one</Button>}>
          Paste the link you already made on SwissTransfer or WeTransfer, choose the stage, and the app gives you a page
          with your logo to send instead. The client opens it, downloads, and can approve or ask for changes right there.
        </Empty>
      ) : (
        <ul className="plain deliv-list">
          {list.map((r) => {
            const d = r.data
            const last = r.answers[r.answers.length - 1]
            return (
              <li key={r.token} className="deliv-row">
                <span className={`deliv-stage s-${d.stage}`}>{stageLabel(d.stage)}</span>
                <div className="grow">
                  <strong>{d.title}{d.version ? <span className="muted"> · {d.version}</span> : null}</strong>
                  <div className="small muted">
                    {[d.client, projTitle(d.projectId), d.sentAt ? `sent ${fmtDate(d.sentAt.slice(0, 10), { day: 'numeric', month: 'short' })}` : ''].filter(Boolean).join(' · ')}
                  </div>
                  {last && (
                    <div className={`small deliv-answer ${last.status}`}>
                      {RESPONSE[last.status] || 'Seen'}{last.name ? ` · ${last.name}` : ''}
                      {last.note ? ` · “${last.note}”` : ''}
                      {r.answers.length > 1 ? ` · ${r.answers.length} replies` : ''}
                    </div>
                  )}
                </div>
                <div className="deliv-tools">
                  <button className="link small" onClick={() => copy(deliveryUrl(r.token), 'Link')}>Copy link</button>
                  <button className="link small" onClick={() => copy(mailText(r), 'Message')}>Copy for email</button>
                  <a className="link small" href={deliveryUrl(r.token)} target="_blank" rel="noreferrer">Open</a>
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
    </div>
  )
}

/* A short editable list, used for the credits and the files on a final delivery. */
function RowEditor({ label, hint, rows, onChange, fields, addLabel }) {
  const set = (i, k, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="rowlist">
        {rows.map((r, i) => (
          <div key={i} className="rowlist-row">
            {fields.map((f) => <Input key={f.k} value={r[f.k] || ''} placeholder={f.placeholder} onChange={(e) => set(i, f.k, e.target.value)} />)}
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
