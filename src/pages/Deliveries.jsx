import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, PageHead, Select, Textarea, useToast } from '../components/ui.jsx'
import { STATUSES, can, uid, useCurrentUser, useStore, visibleProjects, whenMs } from '../lib/store.jsx'
import { deliveryUrl, estimateUrl, listShares, publishShare, removeShare, reopenQuietly, setShareState, shareUrl, statusUrl, tokenOf } from '../lib/shares.js'
import { amount, estimateTotals, lineAmount } from '../lib/estimate.js'
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
  credits: [], deliverables: [], recipients: [], contactName: '', contactEmail: '', contactPhone: '', pin: '',
})

const emptyStatus = () => ({
  id: uid(), projectId: '', title: '', client: '', headline: '', note: '',
  next: [], needs: [], contactName: '', contactEmail: '', contactPhone: '', pageCloses: '', pin: '',
})

const emptyEstimate = () => ({
  id: uid(), projectId: '', version: '', title: '', client: '', intro: '',
  lines: [], discount: '', vatPct: '', validUntil: '', terms: '',
  recipients: [], contactName: '', contactEmail: '', contactPhone: '', pageCloses: '', pin: '',
})

export default function Deliveries() {
  const { state } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  if (!can(user, 'share')) return <Navigate to="/home" replace />
  const editable = can(user, 'share', 'edit')
  // A cost estimation is money, so it follows Finance rather than the Share permission.
  const isAdmin = user?.role === 'admin'
  const projects = visibleProjects(state, user)
  const [rows, setRows] = useState(undefined) // undefined = loading
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('delivery')
  const [sdraft, setSdraft] = useState(null)
  const [edraft, setEdraft] = useState(null)

  const reload = () => {
    if (!state.workspace?.id) return setRows([])
    listShares(state.workspace.id).then(setRows).catch((e) => { setError(e.message); setRows([]) })
  }
  useEffect(reload, [state.workspace?.id])
  /* Opening this page counts as having seen the clients' answers, which clears the badge in the
     sidebar. Marked once the rows are actually on screen, not on mount. */
  useEffect(() => {
    if (rows === undefined) return
    localStorage.setItem('tml_share_read', new Date().toISOString())
    window.dispatchEvent(new Event('tml-share-read'))
  }, [rows])

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
      /* One page per person when names are given, so an answer carries a name you can trust and you
         can see who has not opened it yet. No names means one page for everybody, as before. */
      const ref = `delivery:${draft.id}`
      const people = draft.recipients.filter((p) => (p.name || '').trim())
      const targets = people.length
        ? people.map((p, i) => ({ ref: `${ref}:r${i + 1}`, recipient: { name: p.name.trim(), email: (p.email || '').trim() } }))
        : [{ ref, recipient: null }]
      let firstUrl = ''
      for (const t of targets) {
        const url = await publishShare({ workspaceId: state.workspace.id, kind: 'delivery', ref: t.ref, data: { ...data, recipient: t.recipient }, userId: user?.id })
        if (!firstUrl) firstUrl = url
      }
      await reopenQuietly({ workspaceId: state.workspace.id, ref })
      if (draft.pageCloses) {
        // the pages are published either way; only the closing date can fail, and it says why
        try { await setShareState({ workspaceId: state.workspace.id, ref, expiresAt: draft.pageCloses }) } catch (e) { toast(e.message, 'error') }
      if (draft.pin.trim()) { try { await setShareState({ workspaceId: state.workspace.id, ref, pin: draft.pin }) } catch (e) { toast(e.message, 'error') } }
      }
      if (targets.length === 1) {
        await navigator.clipboard.writeText(deliveryUrl(tokenOf(firstUrl))).catch(() => {})
        toast('Delivery page published, link copied', 'ok')
      } else {
        toast(`${targets.length} pages published, one per person. Copy each link from the list.`, 'ok')
      }
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
    const isEstimate = r.kind === 'estimate'
    const day = d.day || {}
    return {
      ...r,
      isDelivery,
      isStatus,
      isEstimate,
      url: isDelivery ? deliveryUrl(r.token) : isStatus ? statusUrl(r.token) : isEstimate ? estimateUrl(r.token) : shareUrl(r.token),
      shut: !!r.closed || (!!r.expires_at && r.expires_at < today),
      answers: Array.isArray(r.responses) ? r.responses : [],
      badge: isDelivery ? stageLabel(d.stage) : isStatus ? 'Status' : isEstimate ? 'Estimate' : 'Call sheet',
      badgeClass: isDelivery ? `s-${d.stage}` : isStatus ? 's-status' : isEstimate ? 's-estimate' : 's-callsheet',
      name: isDelivery || isStatus || isEstimate ? d.title : (d.project?.title || 'Call sheet'),
      version: isDelivery || isEstimate ? d.version : isStatus ? '' : (day.index ? `Day ${day.index}${day.count ? ` of ${day.count}` : ''}` : ''),
      sub: isDelivery
        ? [d.client, projTitle(d.projectId), d.sentAt ? `sent ${fmtDate(d.sentAt.slice(0, 10), { day: 'numeric', month: 'short' })}` : ''].filter(Boolean).join(' · ')
        : isStatus
          ? [d.client, d.headline].filter(Boolean).join(' · ')
          : isEstimate
            ? [d.client, amount(estimateTotals(d).total, d.currency), d.validUntil ? `valid until ${fmtDate(d.validUntil, { day: 'numeric', month: 'short' })}` : ''].filter(Boolean).join(' · ')
            : [day.date ? fmtDate(day.date, { weekday: 'short', day: 'numeric', month: 'short' }) : '', day.callTime ? `call ${day.callTime}` : ''].filter(Boolean).join(' · '),
    }
  }), [rows, state.projects])
  /* A delivery sent to five people is five rows in the table but one thing on this page, so the rows
     are grouped back together by the part of the ref before the recipient. */
  const groups = useMemo(() => {
    const m = new Map()
    for (const r of all) {
      if (r.isEstimate && !isAdmin) continue
      const key = r.isDelivery || r.isEstimate ? r.ref.split(':').slice(0, 2).join(':') : r.ref
      if (!m.has(key)) m.set(key, { key, rows: [] })
      m.get(key).rows.push(r)
    }
    return [...m.values()].map((g) => {
      const head = g.rows[0]
      // r1, r2, r3: the order they were typed in, not the order they were last touched.
      const named = g.rows.filter((r) => r.data?.recipient?.name).sort((a, b) => a.ref.localeCompare(b.ref, 'en', { numeric: true }))
      return {
        ...g,
        head,
        people: named.length ? named : [],
        shut: g.rows.every((r) => r.shut),
        // whenMs, not text: the two timestamp formats never compare correctly as strings.
        answers: g.rows.flatMap((r) => r.answers).sort((a, b) => whenMs(a.at) - whenMs(b.at)),
      }
    })
  }, [all, isAdmin])
  const tabs = [['delivery', 'Deliveries'], ...(isAdmin ? [['estimate', 'Estimates']] : []), ['status', 'Status pages'], ['callsheet', 'Call sheets'], ['all', 'Everything']]
  const shown = tabs.some(([k]) => k === filter) ? filter : 'delivery'
  const list = useMemo(() => (shown === 'all' ? groups : groups.filter((g) => g.head.kind === shown)), [groups, shown])
  const counts = { all: groups.length, delivery: groups.filter((g) => g.head.isDelivery).length, estimate: groups.filter((g) => g.head.isEstimate).length, status: groups.filter((g) => g.head.isStatus).length, callsheet: groups.filter((g) => g.head.kind === 'callsheet').length }
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
      pin: r.pin || '',
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
      if (sdraft.pin.trim()) { try { await setShareState({ workspaceId: state.workspace.id, ref, pin: sdraft.pin }) } catch (e) { toast(e.message, 'error') } }
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

  const startEstimate = () => setEdraft({ ...emptyEstimate(), vatPct: String(state.finance?.settings?.vatDefault ?? 24) })
  /* An estimate keeps its link while it is reworked, so opening one means editing it. */
  const openEstimate = (r) => {
    const d = r.data || {}
    setEdraft({
      id: (r.ref.split(':')[1]) || uid(), projectId: d.projectId || '', version: d.version || '',
      title: d.title || '', client: d.client || '', intro: d.intro || '',
      lines: d.lines || [], discount: d.discount ? String(d.discount) : '', vatPct: d.vatPct != null ? String(d.vatPct) : '',
      validUntil: d.validUntil || '', terms: d.terms || '',
      recipients: d.recipient?.name ? [{ name: d.recipient.name, email: d.recipient.email || '' }] : [],
      contactName: d.contact?.name || '', contactEmail: d.contact?.email || '', contactPhone: d.contact?.phone || '',
      pageCloses: r.expires_at || '',
      pin: r.pin || '',
    })
  }
  const pickEstimateProject = (projectId) => {
    const p = state.projects.find((x) => x.id === projectId)
    // Title, client and nothing else. The project's budget is a different thing and stays out of this.
    setEdraft((d) => ({ ...d, projectId, title: d.title || p?.title || '', client: d.client || p?.client || '' }))
  }
  const setE = (k, v) => setEdraft((d) => ({ ...d, [k]: v }))

  const publishEstimate = async () => {
    if (!edraft.title.trim()) return toast('Give it a title, or pick a project.', 'error')
    if (!edraft.lines.some((l) => (l.what || '').trim())) return toast('Add at least one cost line.', 'error')
    setBusy(true)
    try {
      const cs = state.settings.callsheet || {}
      const data = {
        title: edraft.title.trim(),
        client: edraft.client.trim(),
        version: edraft.version.trim(),
        projectId: edraft.projectId,
        intro: edraft.intro.trim(),
        lines: edraft.lines.filter((l) => (l.what || '').trim()).map((l) => ({
          group: (l.group || '').trim(), what: l.what.trim(), unit: (l.unit || '').trim(),
          qty: Number(l.qty) || 1, price: Number(l.price) || 0,
        })),
        discount: Number(edraft.discount) || 0,
        vatPct: Number(edraft.vatPct) || 0,
        validUntil: edraft.validUntil,
        terms: edraft.terms.trim(),
        currency: state.finance?.settings?.currency || 'EUR',
        company: { name: state.workspace.name, logo: state.settings.logo || '', footer: cs.footer || '' },
        contact: { name: edraft.contactName.trim(), email: edraft.contactEmail.trim(), phone: edraft.contactPhone.trim() },
        sentAt: new Date().toISOString(),
      }
      const ref = `estimate:${edraft.id}`
      const people = edraft.recipients.filter((p) => (p.name || '').trim())
      const targets = people.length
        ? people.map((p, i) => ({ ref: `${ref}:r${i + 1}`, recipient: { name: p.name.trim(), email: (p.email || '').trim() } }))
        : [{ ref, recipient: null }]
      let firstUrl = ''
      for (const t of targets) {
        const url = await publishShare({ workspaceId: state.workspace.id, kind: 'estimate', ref: t.ref, data: { ...data, recipient: t.recipient }, userId: user?.id })
        if (!firstUrl) firstUrl = url
      }
      await reopenQuietly({ workspaceId: state.workspace.id, ref })
      try { await setShareState({ workspaceId: state.workspace.id, ref, expiresAt: edraft.pageCloses }) } catch (e) { toast(e.message, 'error') }
      if (edraft.pin.trim()) { try { await setShareState({ workspaceId: state.workspace.id, ref, pin: edraft.pin }) } catch (e) { toast(e.message, 'error') } }
      if (targets.length === 1) {
        await navigator.clipboard.writeText(estimateUrl(tokenOf(firstUrl))).catch(() => {})
        toast('Cost estimation published, link copied', 'ok')
      } else {
        toast(`${targets.length} pages published, one per person. Copy each link from the list.`, 'ok')
      }
      setEdraft(null)
      reload()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const setShut = async (ref, shut, one = false) => {
    try {
      await setShareState({ workspaceId: state.workspace.id, ref, closed: shut, one })
      toast(shut ? 'Link closed' : 'Link open again', 'ok')
      reload()
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <div className="deliveries">
      <PageHead title="Share" sub="Every link you have sent out of the building, and what happened to it">
        {editable && isAdmin && <Button variant="ghost" onClick={startEstimate}>New cost estimation</Button>}
        {editable && <Button variant="ghost" onClick={startStatus}>New status page</Button>}
        {editable && <Button variant="primary" onClick={startNew}>New delivery</Button>}
      </PageHead>

      {error && <p className="muted small">{error}</p>}
      {noReplies && <p className="muted small">Run <b>supabase/deliveries.sql</b> in Supabase to collect the clients' answers.</p>}
      {noTracking && <p className="muted small">Run <b>supabase/share_track.sql</b> in Supabase to see whether a link was opened, and to close one.</p>}

      <div className="chips">
        {tabs.map(([k, label]) => (
          <button key={k} className={`chip ${shown === k ? 'on' : ''}`} onClick={() => setFilter(k)}>
            {label}
            <small>{counts[k]}</small>
          </button>
        ))}
      </div>

      {rows === undefined ? (
        <p className="muted">Loading…</p>
      ) : !list.length ? (
        <Empty title={shown === 'callsheet' ? 'No call sheet links yet' : 'Nothing sent yet'} action={editable && shown !== 'callsheet' && <Button variant="primary" onClick={startNew}>Send the first one</Button>}>
          {shown === 'callsheet'
            ? 'Call sheet links are made from the day itself, inside the project. They show up here so you can see what is still open and close it when the shoot is over.'
            : 'Paste the link you already made on SwissTransfer or WeTransfer, choose the stage, and the app gives you a page with your logo to send instead. The client opens it, downloads, and can approve or ask for changes right there.'}
        </Empty>
      ) : (
        <ul className="plain deliv-list">
          {list.map((g) => {
            const r = g.head
            const last = g.answers[g.answers.length - 1]
            const one = !g.people.length
            return (
              <li key={g.key} className={`deliv-row${g.shut ? ' is-shut' : ''}`}>
                <span className={`deliv-stage ${r.badgeClass}`}>{r.badge}</span>
                <div className="grow">
                  <strong>{r.name}{r.version ? <span className="muted"> · {r.version}</span> : null}</strong>
                  <div className="small muted">{r.sub}</div>
                  {/* one strip of small tags instead of three grey lines that all looked the same */}
                  {one && (g.shut || r.opens !== undefined || last) && (
                    <div className="deliv-tags">
                      {g.shut && <span className="deliv-tag t-shut">Closed</span>}
                      {r.opens === undefined ? null
                        : r.opens > 0
                          ? <span className="deliv-tag">Opened {r.opens}&#215;{r.opened_at ? ` · ${fmtDate(r.opened_at.slice(0, 10), { day: 'numeric', month: 'short' })}` : ''}</span>
                          : <span className="deliv-tag t-quiet">Not opened</span>}
                      {r.expires_at && !r.closed && <span className="deliv-tag t-quiet">Closes {fmtDate(r.expires_at, { day: 'numeric', month: 'short' })}</span>}
                      {r.pin && <span className="deliv-tag t-quiet">Code {r.pin}</span>}
                      {last && <span className={`deliv-tag t-${last.status}`}>{RESPONSE[last.status] || 'Seen'}{last.name ? ` · ${last.name}` : ''}</span>}
                      {g.answers.length > 1 && <span className="deliv-tag t-quiet">{g.answers.length} replies</span>}
                    </div>
                  )}
                  {one && last?.note && <p className="deliv-quote">&#8220;{last.note}&#8221;</p>}

                  {!one && (
                    <ul className="plain deliv-people">
                      {g.people.map((p) => {
                        const a = p.answers[p.answers.length - 1]
                        return (
                          <li key={p.token}>
                            <b>{p.data.recipient.name}</b>
                            <span className="deliv-tags">
                              {p.shut && <span className="deliv-tag t-shut">Closed</span>}
                              {p.opens === undefined ? null
                                : p.opens > 0 ? <span className="deliv-tag">Opened {p.opens}&#215;</span> : <span className="deliv-tag t-quiet">Not opened</span>}
                              {a && <span className={`deliv-tag t-${a.status}`}>{RESPONSE[a.status] || 'Seen'}</span>}
                            </span>
                            <span className="deliv-person-tools">
                              <button className="deliv-tool" onClick={() => copy(p.url, 'Link')}>Copy link</button>
                              <a className="deliv-tool" href={p.url} target="_blank" rel="noreferrer">Open</a>
                              {editable && p.opens !== undefined && (
                                <button className="deliv-tool" onClick={() => setShut(p.ref, !p.shut, true)}>{p.shut ? 'Reopen' : 'Close'}</button>
                              )}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
                <div className="deliv-tools">
                  {one && <button className="deliv-tool" onClick={() => copy(r.url, 'Link')}>Copy link</button>}
                  {one && r.isDelivery && <button className="deliv-tool" onClick={() => copy(mailText(r), 'Message')}>Copy for email</button>}
                  {one && <a className="deliv-tool" href={r.url} target="_blank" rel="noreferrer">Open</a>}
                  {editable && r.isStatus && <button className="deliv-tool" onClick={() => openStatus(r)}>Update</button>}
                  {editable && isAdmin && r.isEstimate && one && <button className="deliv-tool" onClick={() => openEstimate(r)}>Update</button>}
                  {editable && r.opens !== undefined && (
                    <button className="deliv-tool" onClick={() => setShut(g.key, !g.shut)}>{g.shut ? 'Reopen all' : one ? 'Close' : 'Close all'}</button>
                  )}
                  {editable && <Confirm className="deliv-tool deliv-tool-x" onConfirm={async () => { await removeShare({ workspaceId: state.workspace.id, ref: g.key }); reload() }} label="Delete">Delete</Confirm>}
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
            <div className="row-2">
              <Field label="Close this page on" hint="After this date the link stops working and says so. Leave empty to keep it open until you close it by hand."><Input type="date" value={draft.pageCloses} onChange={(e) => setD('pageCloses', e.target.value)} /></Field>
              <Field label="Access code" hint="Optional. Six digits or a word. The page shows nothing without it, so send it separately from the link."><Input value={draft.pin} onChange={(e) => setD('pin', e.target.value)} placeholder="482913" /></Field>
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

            <RowEditor
              label="Send it to"
              hint="Leave empty for one link for everybody. Add names and each person gets their own page, so you can see who opened it and who approved, without taking their word for it."
              rows={draft.recipients}
              onChange={(v) => setD('recipients', v)}
              fields={[{ k: 'name', placeholder: 'Maria Vlachou' }, { k: 'email', placeholder: 'maria@client.gr' }]}
              addLabel="Add a person"
            />

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
            <div className="row-2">
              <Field label="Close this page on" hint="Leave empty to keep it open until you close it by hand."><Input type="date" value={sdraft.pageCloses} onChange={(e) => setS('pageCloses', e.target.value)} /></Field>
              <Field label="Access code" hint="Optional. Six digits or a word. The page shows nothing without it, so send it separately from the link."><Input value={sdraft.pin} onChange={(e) => setS('pin', e.target.value)} placeholder="482913" /></Field>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!edraft} title="Cost estimation" wide onClose={() => !busy && setEdraft(null)}
        footer={<><Button variant="ghost" onClick={() => setEdraft(null)} disabled={busy}>Cancel</Button><Button variant="primary" onClick={publishEstimate} disabled={busy}>{busy ? 'Publishing…' : 'Publish and copy link'}</Button></>}>
        {edraft && (
          <div className="stack">
            <p className="muted small">Your own costs, typed here. Picking a project only fills in the title and the client; the project&#39;s budget is a separate thing and stays out of this.</p>
            <div className="row-3">
              <Field label="Project" hint="Only the title and the client."><Select value={edraft.projectId} onChange={(e) => pickEstimateProject(e.target.value)} options={[['', 'Not in the app'], ...projects.map((p) => [p.id, p.title])]} /></Field>
              <Field label="Title"><Input value={edraft.title} onChange={(e) => setE('title', e.target.value)} placeholder="Northwind Summer Film" /></Field>
              <Field label="Version" hint="v1, v2…"><Input value={edraft.version} onChange={(e) => setE('version', e.target.value)} placeholder="v1" /></Field>
            </div>
            <Field label="Client"><Input value={edraft.client} onChange={(e) => setE('client', e.target.value)} /></Field>
            <Field label="Opening note" hint="What the estimate covers, in a line or two."><Textarea rows={2} value={edraft.intro} onChange={(e) => setE('intro', e.target.value)} /></Field>

            <LineEditor
              rows={edraft.lines}
              onChange={(v) => setE('lines', v)}
              cur={state.finance?.settings?.currency || 'EUR'}
              discount={edraft.discount}
              vatPct={edraft.vatPct}
            />

            <div className="row-3">
              <Field label="Discount" hint="An amount, not a percentage."><Input type="number" min="0" step="0.01" value={edraft.discount} onChange={(e) => setE('discount', e.target.value)} placeholder="0" /></Field>
              <Field label="VAT %"><Input type="number" min="0" max="99" value={edraft.vatPct} onChange={(e) => setE('vatPct', e.target.value)} /></Field>
              <Field label="Valid until"><Input type="date" value={edraft.validUntil} onChange={(e) => setE('validUntil', e.target.value)} /></Field>
            </div>
            <Field label="Payment terms" hint="Shown under the total."><Textarea rows={2} value={edraft.terms} onChange={(e) => setE('terms', e.target.value)} placeholder="50% on signature, 50% on delivery. Travel outside Attica billed separately." /></Field>

            <RowEditor
              label="Send it to"
              hint="Leave empty for one link for everybody. Add names and each person gets their own page."
              rows={edraft.recipients}
              onChange={(v) => setE('recipients', v)}
              fields={[{ k: 'name', placeholder: 'Maria Vlachou' }, { k: 'email', placeholder: 'maria@client.gr' }]}
              addLabel="Add a person"
            />

            <div className="row-3">
              <Field label="Who they ask"><Input value={edraft.contactName} onChange={(e) => setE('contactName', e.target.value)} placeholder={user?.name || 'Name'} /></Field>
              <Field label="Email"><Input value={edraft.contactEmail} onChange={(e) => setE('contactEmail', e.target.value)} /></Field>
              <Field label="Phone"><Input value={edraft.contactPhone} onChange={(e) => setE('contactPhone', e.target.value)} /></Field>
            </div>
            <div className="row-2">
              <Field label="Close this page on" hint="Leave empty to keep it open until you close it by hand."><Input type="date" value={edraft.pageCloses} onChange={(e) => setE('pageCloses', e.target.value)} /></Field>
              <Field label="Access code" hint="Optional. Six digits or a word. The page shows nothing without it, so send it separately from the link."><Input value={edraft.pin} onChange={(e) => setE('pin', e.target.value)} placeholder="482913" /></Field>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* The cost lines. Add one, remove one, and the total underneath moves as you type. */
function LineEditor({ rows, onChange, cur, discount, vatPct }) {
  const set = (i, k, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const add = () => onChange([...rows, { group: rows[rows.length - 1]?.group || '', what: '', qty: 1, unit: '', price: '' }])
  const t = estimateTotals({ lines: rows, discount, vatPct })
  return (
    <div className="field">
      <span className="field-label">Costs</span>
      <div className="est-edit">
        <div className="est-edit-head">
          <span>Heading</span><span>What</span><span>Qty</span><span>Unit</span><span>Price</span><span>Amount</span><span />
        </div>
        {rows.map((r, i) => (
          <div key={i} className="est-edit-row">
            <Input value={r.group || ''} placeholder="Shooting" onChange={(e) => set(i, 'group', e.target.value)} />
            <Input value={r.what || ''} placeholder="Camera crew" onChange={(e) => set(i, 'what', e.target.value)} />
            <Input type="number" min="0" step="0.5" value={r.qty ?? ''} onChange={(e) => set(i, 'qty', e.target.value)} />
            <Input value={r.unit || ''} placeholder="days" onChange={(e) => set(i, 'unit', e.target.value)} />
            <Input type="number" min="0" step="0.01" value={r.price ?? ''} placeholder="0" onChange={(e) => set(i, 'price', e.target.value)} />
            <span className="est-edit-amt">{amount(lineAmount(r), cur)}</span>
            <button className="link small" onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        {!rows.length && <p className="muted small">No costs yet.</p>}
        <div className="est-edit-foot">
          <Button variant="ghost" onClick={add}>Add a cost</Button>
          <span className="muted small">
            Subtotal {amount(t.subtotal, cur)}
            {t.discount > 0 ? ` · discount ${amount(t.discount, cur)}` : ''}
            {t.vatPct > 0 ? ` · VAT ${t.vatPct}% ${amount(t.vat, cur)}` : ''}
          </span>
          <b className="est-edit-total">{amount(t.total, cur)}</b>
        </div>
      </div>
      <span className="field-hint">Leave the heading empty to keep a line loose. Lines with the same heading are grouped together on the page, with their own subtotal.</span>
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
