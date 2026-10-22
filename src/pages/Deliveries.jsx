import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ACT_ICON, Act, Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useIsMobile, useToast } from '../components/ui.jsx'
import { can, uid, useCurrentUser, useStore, visibleProjects, whenMs } from '../lib/store.jsx'
import { deliveryUrl, estimateUrl, getShareRow, listShares, publishShare, removeShare, reopenQuietly, setShareState, shareUrl, shotlistUrl, tokenOf, deckUrl } from '../lib/shares.js'
import { amount, estimateTotals } from '../lib/estimate.js'
import { EstimateSheet } from './PublicEstimate.jsx'
import EstimateLookEditor from '../components/EstimateLookEditor.jsx'
import { fmtDate, toISODate } from '../lib/dates.js'
import { dirIn, useSlide } from '../lib/glide.js'
import { Grip, moveItem, useDragSort } from '../components/DragSort.jsx'
import { pcloudDeliverMany } from '../lib/pcloud.js'
import { uploadThumbs } from '../lib/deliveryThumbs.js'
import { remote } from '../lib/supabase.js'

/* The stages a new delivery can be (Alex, 12 Oct, written his way): RoughCut, PreFinal Cut, Final Cut.
   Older deliveries made as final files, a treatment or a lookbook keep their names and their pages. */
export const STAGES = [
  ['rough', 'RoughCut'],
  ['prefinal', 'PreFinal Cut'],
  ['final', 'Final Cut'],
  // the final files themselves (Alex, 22 Oct): no version, and the fine print under the files
  ['deliverables', 'Final Deliverables'],
]
/* The fine print a Final Deliverables page carries, small, under the files (Alex, 22 Oct, his words); filled in
   when that stage is picked, and editable each time. */
export const FINE_DEFAULT = `IMPORTANT !! Τα τελικά παραδοτέα αρχεία θα βρίσκονται διαθέσιμα προς λήψη μέσω του εταιρικού μας cloud storage για διάστημα 6 μηνών από την ημερομηνία παράδοσής τους. Τα RAW (ακατέργαστα / πρωτότυπα) αρχεία της παραγωγής θα παραμένουν αποθηκευμένα στο αρχείο μας για 30 ημέρες από την ημερομηνία του γυρίσματος, και μετά την πάροδο αυτού του διαστήματος θα διαγράφονται οριστικά.
Σε περίπτωση που επιθυμείτε να προβείτε σε buyout των πρωτότυπων υλικών, παρακαλούμε ενημερώστε μας γραπτώς εντός της ανωτέρω προθεσμίας των 30 ημερών.`
/* The message a Final Deliverables page opens with, under the title (Alex, 22 Oct, his words); filled in like the
   fine print and editable each time. */
export const MESSAGE_DEFAULT = `Ακολουθούν τα τελικά αρχεία του Music Video στις εκδόσεις YouTube, TV & Social.
Παρακαλούμε μετά το ανέβασμα να γίνει ένας τελικός έλεγχος από πλευράς σας, ώστε να βεβαιωθείτε πως όλα είναι εντάξει. Εναλλακτικά, μπορείτε να μας στείλετε ένα κρυφό (unlisted) link του τελικού βίντεο στο YouTube, ώστε να πραγματοποιήσουμε εμείς τον έλεγχο.`
const OLD_STAGES = [['files', 'Final files'], ['treatment', 'Treatment'], ['lookbook', 'Lookbook']]
/* What the big button says: Download Files for every cut (Alex, 12 Oct, his words); an old treatment or
   lookbook delivery keeps its own. */
export const stageAction = (k) =>
  k === 'treatment' ? 'Read the treatment'
  : k === 'lookbook' ? 'Open the lookbook'
  : 'Download Files'
export const stageLabel = (k) => [...STAGES, ...OLD_STAGES].find((s) => s[0] === k)?.[1] || 'RoughCut'
const RESPONSE = { approved: 'Approved', changes: 'Changes asked', seen: 'Seen' }

const emptyDelivery = () => ({
  id: uid(), projectId: '', stage: 'rough', version: '', title: '', client: '',
  link: '', linkLabel: '', password: '', linkExpires: '', pageCloses: '', note: '', feedbackBy: '',
  credits: [], deliverables: [], recipients: [], contactName: '', contactEmail: '', contactPhone: '', pin: '',
  files: [], // several files uploaded together: [{ name, url, size }], one button each on the page
  fine: '', // Final Deliverables' fine print
  message: '', // and its opening message
  thumbs: [], // thumbnails the client can see and download: [{ name, path, url, dl, size, w, h }]
})

const emptyEstimate = () => ({
  id: uid(), projectId: '', version: '', title: '', client: '', intro: '',
  lines: [], excluded: [], totalPrice: '', discount: '', vatPct: '', validUntil: '', terms: '',
  recipients: [], contactName: '', contactEmail: '', contactPhone: '', pageCloses: '', pin: '', look: {},
})

/* The link tools as line icons (Alex, 15 Oct: the Share page put in order): round glass buttons on a phone,
   icon and word on a computer */
const ico = (d) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
const ICO = {
  link: ico(<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>),
  mail: ico(<><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></>),
  open: ico(<><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></>),
  edit: ico(<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>),
  lock: ico(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  unlock: ico(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 7.5-2" /></>),
  trash: ico(<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />),
  plus: ico(<path d="M12 5v14M5 12h14" />),
  eye: ico(<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
}
const tool = (icon, text) => <>{icon}<span className="dt-t">{text}</span></>

export default function Deliveries() {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  if (!can(user, 'share')) return <Navigate to="/" replace />
  const editable = can(user, 'share', 'edit')
  // A cost estimation is money, so it follows Finance rather than the Share permission.
  const isAdmin = user?.role === 'admin'
  const projects = visibleProjects(state, user)
  const [rows, setRows] = useState(undefined) // undefined = loading
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('all') // Alex: open on Everything, not just Deliveries
  const mobile = useIsMobile()
  const [addMenu, setAddMenu] = useState(false) // the phone's + : New delivery / New cost estimation
  const { boxRef, slideTo, inClass } = useSlide()
  const [edraft, setEdraft] = useState(null)
  const [etab, setEtab] = useState('content')
  /* Full screen (Alex, 20 Oct: "to see it on the whole screen"): the browser's own full screen, so the bar of the browser
     and the Dock go too; Esc or the same button brings them back, and closing the window leaves it */
  const [full, setFull] = useState(false)
  useEffect(() => {
    const on = () => setFull(!!(document.fullscreenElement || document.webkitFullscreenElement))
    document.addEventListener('fullscreenchange', on)
    document.addEventListener('webkitfullscreenchange', on)
    return () => { document.removeEventListener('fullscreenchange', on); document.removeEventListener('webkitfullscreenchange', on) }
  }, [])
  const leaveFull = () => { if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {}) }
  const flipFull = () => {
    if (full) return leaveFull()
    const el = document.documentElement
    ;(el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)?.catch?.(() => {})
  } // the estimate window's tabs: Content, Look (and Preview on a phone)

  const reload = () => {
    if (!state.workspace?.id) return setRows([])
    listShares(state.workspace.id).then(setRows).catch((e) => { setError(e.message); setRows([]) })
  }
  useEffect(reload, [state.workspace?.id])
  // coming back to this window reads the links again, so nothing older than the database is ever shown or opened
  useEffect(() => {
    const back = () => { if (document.visibilityState === 'visible') reload() }
    document.addEventListener('visibilitychange', back)
    window.addEventListener('focus', back)
    return () => { document.removeEventListener('visibilitychange', back); window.removeEventListener('focus', back) }
  }, [state.workspace?.id]) // eslint-disable-line react-hooks/exhaustive-deps
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
  // the file list was filled from the project's Post tab, which was taken out (Alex, 10 Oct): it is typed here
  const delivOf = () => []

  const startNew = () => setDraft(emptyDelivery())
  /* A delivery keeps its link while it is reworked, so opening an existing one (same as an
     estimate) means editing it rather than starting a fresh page and losing the old
     link. Only offered for a single-page delivery (see the Update button below): a delivery sent
     to several named people has one row per person and this only has room to load one back. */
  const openDelivery = (r) => {
    const d = r.data || {}
    setDraft({
      id: (r.ref.split(':')[1]) || uid(), projectId: d.projectId || '', stage: d.stage || 'rough',
      version: d.version || '', title: d.title || '', client: d.client || '',
      link: d.link || '', linkLabel: d.linkLabel || '', password: d.password || '', linkExpires: d.linkExpires || '', files: d.files || [],
      pageCloses: r.expires_at || '', note: d.note || '', feedbackBy: d.feedbackBy || '',
      credits: d.credits || [], deliverables: d.deliverables || [],
      recipients: d.recipient?.name ? [{ name: d.recipient.name, email: d.recipient.email || '' }] : [],
      contactName: d.contact?.name || '', contactEmail: d.contact?.email || '', contactPhone: d.contact?.phone || '',
      pin: r.pin || '', fine: d.fine || '', message: d.message || '', thumbs: d.thumbs || [],
    })
  }
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
  // picking Final Deliverables brings its fine print, unless some is already written
  const setStage = (v) => setDraft((d) => ({
    ...d, stage: v,
    fine: v === 'deliverables' && !d.fine?.trim() ? FINE_DEFAULT : d.fine,
    message: v === 'deliverables' && !d.message?.trim() ? MESSAGE_DEFAULT : d.message,
  }))
  /* Upload the cut itself to pCloud (Alex, 12 Oct): into Deliveries/<stage>/<title> in the company
     pCloud, straight from this browser, then the public pCloud link fills Download link. */
  const [upload, setUpload] = useState(null) // { names, size, p, i, ctrl }
  const fileRef = useRef(null)
  // one file or several (Alex, 12 Oct): several share one folder and one link for them all
  const uploadFiles = async (list) => {
    const files = [...(list || [])]
    if (!files.length || !draft) return
    const ctrl = new AbortController()
    setUpload({ names: files.map((f) => f.name), size: files.reduce((n, f) => n + f.size, 0), p: 0, i: 0, ctrl })
    try {
      const title = draft.title.trim() || projects.find((p) => p.id === draft.projectId)?.title || files[0].name.replace(/\.[^.]+$/, '')
      const now = new Date()
      const sub = draft.version.trim() || `${toISODate(now)} ${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}`
      const r = await pcloudDeliverMany(files, { stage: stageLabel(draft.stage), title, sub }, { onProgress: (p, i) => setUpload((u) => (u ? { ...u, p, i } : u)), signal: ctrl.signal })
      // one file is kept too, so the client's page can offer Save to Photos for it
      setDraft((d) => (d ? { ...d, link: r.url, linkLabel: 'pCloud', files: r.files || [{ name: r.name || files[0].name, url: r.url, size: r.size || files[0].size }] } : d))
      toast(files.length > 1 ? `${files.length} files uploaded to pCloud, one link for them all` : `Uploaded to pCloud: ${r.folder.split('/').slice(-3).join(' / ')}`, 'ok')
    } catch (e) {
      if (!ctrl.signal.aborted) toast(/Unknown action/.test(e.message) ? 'Deploy the new pcloud function first (Supabase > Edge Functions > pcloud).' : e.message, 'error')
    } finally {
      setUpload(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  /* Thumbnails (Alex, 22 Oct): up at once into the hub's photos storage, full quality (lib/deliveryThumbs.js) */
  const [thumbUp, setThumbUp] = useState('')
  const thumbRef = useRef(null)
  const addThumbs = async (list) => {
    const files = [...(list || [])]
    if (!files.length || !draft) return
    try {
      const got = await uploadThumbs(files, draft.id, (i, n) => setThumbUp(n > 1 ? `Uploading ${i} of ${n}…` : 'Uploading…'))
      setDraft((d) => (d ? { ...d, thumbs: [...(d.thumbs || []), ...got] } : d))
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setThumbUp('')
      if (thumbRef.current) thumbRef.current.value = ''
    }
  }

  const publish = async () => {
    if (!draft.link.trim()) return toast('Paste the download link (SwissTransfer, WeTransfer…).', 'error')
    if (thumbUp) return toast('Wait for the thumbnails to finish uploading.', 'error')
    if (!draft.title.trim()) return toast('Give it a title, or pick a project.', 'error')
    setBusy(true)
    try {
      const cs = state.settings.callsheet || {}
      const data = {
        stage: draft.stage,
        version: draft.stage === 'deliverables' ? '' : draft.version.trim(),
        title: draft.title.trim(),
        client: draft.client.trim(),
        projectId: draft.projectId,
        color: state.projects.find((p) => p.id === draft.projectId)?.color || '#C8503F',
        company: { name: state.workspace.name, logo: state.settings.logo || '', address: state.settings.companyAddress || '', footer: cs.footer || '' },
        link: draft.link.trim(),
        files: (draft.files || []).filter((f) => f.url),
        linkLabel: draft.linkLabel.trim(),
        // no transfer password or expiry, no Answer by and no contact any more (Alex, 22 Oct)
        password: '',
        linkExpires: '',
        // no note any more (Alex, 22 Oct); Final Deliverables has its fine print instead
        note: '',
        fine: draft.stage === 'deliverables' ? (draft.fine || '').trim() : '',
        message: draft.stage === 'deliverables' ? (draft.message || '').trim() : '',
        thumbs: (draft.thumbs || []).filter((t) => t.url),
        feedbackBy: '',
        credits: draft.stage === 'files' ? draft.credits.filter((c) => c.name) : [],
        deliverables: draft.stage === 'files' ? draft.deliverables.filter((d) => d.name) : [],
        contact: {},
        sentAt: new Date().toISOString(),
      }
      // one page for everybody: Send it to (a page per named person) was taken out (Alex, 22 Oct)
      const ref = `delivery:${draft.id}`
      const targets = [{ ref, recipient: null }]
      let firstUrl = ''
      for (const t of targets) {
        const url = await publishShare({ workspaceId: state.workspace.id, kind: 'delivery', ref: t.ref, data: { ...data, recipient: t.recipient }, userId: user?.id })
        if (!firstUrl) firstUrl = url
      }
      await reopenQuietly({ workspaceId: state.workspace.id, ref })
      // no closing date or access code any more (Alex, 22 Oct): publishing again clears any an older page still had
      try { await setShareState({ workspaceId: state.workspace.id, ref, expiresAt: '', pin: '' }) } catch {}
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
  const all = useMemo(() => (rows || []).filter((r) => r.kind !== 'status').map((r) => {
    const d = r.data || {}
    const isDelivery = r.kind === 'delivery'
    const isEstimate = r.kind === 'estimate'
    const isShotlist = r.kind === 'shotlist'
    const isDeck = r.kind === 'deck'
    const day = d.day || {}
    return {
      ...r,
      isDelivery,
      isEstimate,
      url: isDelivery ? deliveryUrl(r.token) : isEstimate ? estimateUrl(r.token) : isShotlist ? shotlistUrl(r.token) : isDeck ? deckUrl(r.token) : shareUrl(r.token),
      shut: !!r.closed || (!!r.expires_at && r.expires_at < today),
      answers: Array.isArray(r.responses) ? r.responses : [],
      badge: isDelivery ? stageLabel(d.stage) : isEstimate ? 'Estimate' : isShotlist ? 'Shot list' : isDeck ? 'Presentation' : 'Call sheet',
      badgeClass: isDelivery ? `s-${d.stage}` : isEstimate ? 's-estimate' : 's-callsheet',
      name: isDelivery || isEstimate ? d.title : (d.project?.title || (isShotlist ? 'Shot list' : isDeck ? 'Presentation' : 'Call sheet')),
      version: isDelivery || isEstimate ? d.version : (day.index ? `Day ${day.index}${day.count ? ` of ${day.count}` : ''}` : ''),
      sub: isDelivery
        ? [d.client, projTitle(d.projectId), d.sentAt ? `sent ${fmtDate(d.sentAt.slice(0, 10), { day: 'numeric', month: 'short' })}` : ''].filter(Boolean).join(' · ')
        : isEstimate
            ? [d.client, amount(estimateTotals(d).total, d.currency), d.validUntil ? `valid until ${fmtDate(d.validUntil, { day: 'numeric', month: 'short' })}` : ''].filter(Boolean).join(' · ')
            : isDeck
              ? [`${(d.slides || []).length} slides`, d.at ? `shared ${fmtDate(d.at.slice(0, 10), { day: 'numeric', month: 'short' })}` : ''].filter(Boolean).join(' · ')
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
  const tabs = [['delivery', 'Deliveries'], ...(isAdmin ? [['estimate', 'Estimates']] : []), ['callsheet', 'Call sheets'], ['all', 'Everything']]
  const shown = tabs.some(([k]) => k === filter) ? filter : 'all'
  const list = useMemo(() => (shown === 'all' ? groups : groups.filter((g) => g.head.kind === shown)), [groups, shown])
  const counts = { all: groups.length, delivery: groups.filter((g) => g.head.isDelivery).length, estimate: groups.filter((g) => g.head.isEstimate).length, callsheet: groups.filter((g) => g.head.kind === 'callsheet').length }
  // These two only exist once the matching SQL file has been run, so say so rather than hiding the gap.
  const sample = all[0]
  const noReplies = !!sample && sample.responses === undefined
  const noTracking = !!sample && sample.opens === undefined

  /* My look (Alex, 20 Oct: "keep the whole look as I made it"): the look of an estimate saved once for the workspace;
     every new estimate starts with it */
  const savedLook = state.settings?.estimateLook || null
  const saveLook = (look) => {
    update((s) => { s.settings = { ...s.settings, estimateLook: { ...(look || {}) } }; return s })
    toast('Saved. Every new cost estimation starts with this look.', 'ok')
  }
  const startEstimate = () => {
    setEtab('content')
    setEdraft({ ...emptyEstimate(), vatPct: String(state.finance?.settings?.vatDefault ?? 24), look: savedLook ? { ...savedLook } : {} })
  }
  /* An estimate keeps its link while it is reworked, so opening one means editing it. */
  const openEstimate = async (r) => {
    setEtab('content')
    // the newest version from the database, not the copy this page loaded earlier (another window may have published since)
    let row = { data: r.data, updated_at: r.updated_at }
    try { row = (await getShareRow(state.workspace.id, r.ref)) || row } catch { /* offline: the copy on the page */ }
    const d = row.data || {}
    setEdraft({
      ref: r.ref, baseAt: row.updated_at || '',
      id: (r.ref.split(':')[1]) || uid(), projectId: d.projectId || '', version: d.version || '',
      title: d.title || '', client: d.client || '', intro: d.intro || '',
      lines: d.lines || [], excluded: (d.excluded || []).map((what) => ({ what })), totalPrice: d.totalPrice ? String(d.totalPrice) : '', discount: d.discount ? String(d.discount) : '', vatPct: d.vatPct != null ? String(d.vatPct) : '',
      validUntil: d.validUntil || '', terms: d.terms || '',
      // recipients, contact, closing date and access code left the estimate (Alex, 19 Oct)
      recipients: [], contactName: '', contactEmail: '', contactPhone: '', pageCloses: '', pin: '',
      look: d.look || {},
    })
  }
  const pickEstimateProject = (projectId) => {
    const p = state.projects.find((x) => x.id === projectId)
    // Title, client and nothing else. The project's budget is a different thing and stays out of this.
    setEdraft((d) => ({ ...d, projectId, title: d.title || p?.title || '', client: d.client || p?.client || '' }))
  }
  const setE = (k, v) => setEdraft((d) => ({ ...d, [k]: v }))

  // what the client's page shows, from the editor: published as it is, and drawn live in the preview beside it
  const estimateData = (e) => {
    const cs = state.settings.callsheet || {}
    return {
      title: e.title.trim(),
      client: e.client.trim(),
      version: e.version.trim(),
      projectId: e.projectId,
      intro: e.intro.trim(),
      lines: e.lines.filter((l) => (l.what || '').trim()).map((l) => ({
        group: (l.group || '').trim(), what: l.what.trim(), unit: (l.unit || '').trim(),
        // an empty amount stays empty (the line only says what is included), a typed 0 stays 0
        qty: Number(l.qty) || 1, price: String(l.price ?? '').trim() === '' ? null : Number(l.price) || 0, advance: !!l.advance,
      })),
      excluded: (e.excluded || []).map((x) => (x.what || '').trim()).filter(Boolean),
      totalPrice: Number(e.totalPrice) || 0,
      discount: Number(e.discount) || 0,
      vatPct: Number(e.vatPct) || 0,
      validUntil: e.validUntil,
      terms: e.terms.trim(),
      currency: state.finance?.settings?.currency || 'EUR',
      company: { name: state.workspace.name, logo: state.settings.logo || '', footer: cs.footer || '' },
      contact: { name: e.contactName.trim(), email: e.contactEmail.trim(), phone: e.contactPhone.trim() },
      look: e.look || {},
      sentAt: new Date().toISOString(),
    }
  }
  const publishEstimate = async () => {
    if (!edraft.title.trim()) return toast('Give it a title, or pick a project.', 'error')
    if (!edraft.lines.some((l) => (l.what || '').trim())) return toast('Add at least one cost line.', 'error')
    // published from somewhere else after this window opened it: ask before writing over the newer one
    if (edraft.ref && edraft.baseAt) {
      try {
        const now = await getShareRow(state.workspace.id, edraft.ref)
        if (now?.updated_at && new Date(now.updated_at) > new Date(edraft.baseAt)
          && !window.confirm('This estimate was published again from another window or device after you opened it. Publish yours over it? Its newer version would be replaced.')) return
      } catch { /* offline: publishing will say so */ }
    }
    setBusy(true)
    try {
      const data = estimateData(edraft)
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
      // an estimate never closes on a date or asks for a code: clear what an older one may still carry
      try { await setShareState({ workspaceId: state.workspace.id, ref, expiresAt: '', pin: '' }) } catch {}
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
      {/* on a phone (Alex, 15 Oct): no title, the filters as a glass capsule and a round + on one line;
          the + offers New delivery and, for administrators, New cost estimation */}
      {mobile && (
        <div className="share-top">
          <div className="share-tabs">
            {tabs.map(([k, label]) => (
              <button key={k} type="button" className={shown === k ? 'on' : ''} onClick={(e) => { if (shown !== k) slideTo(dirIn(e.currentTarget.parentNode, e.currentTarget)); setFilter(k) }}>
                {({ 'Call sheets': 'Sheets', Everything: 'All' })[label] || label}<small>{counts[k]}</small>
              </button>
            ))}
          </div>
          {editable && <button type="button" className="share-add" aria-label="New" title="New" onClick={() => (isAdmin ? setAddMenu((v) => !v) : startNew())}>{ICO.plus}</button>}
          {addMenu && (
            <>
              <button type="button" className="share-scrim" aria-label="Close" onClick={() => setAddMenu(false)} />
              <div className="share-menu">
                <button type="button" onClick={() => { setAddMenu(false); startNew() }}>New delivery</button>
                <button type="button" onClick={() => { setAddMenu(false); startEstimate() }}>New cost estimation</button>
              </div>
            </>
          )}
        </div>
      )}

      {error && <p className="muted small">{error}</p>}
      {noReplies && <p className="muted small">Run <b>supabase/deliveries.sql</b> in Supabase to collect the clients' answers.</p>}
      {noTracking && <p className="muted small">Run <b>supabase/share_track.sql</b> in Supabase to see whether a link was opened, and to close one.</p>}

      {/* on a computer the filters as the Organizer's glass capsule, the two New buttons at the end of
          the same line in the same glass (Alex, 15 Oct) */}
      {!mobile && <div className="db-top share-dtop">
        <nav className="tabs db-tabs">
          {tabs.map(([k, label]) => (
            <button key={k} type="button" className={shown === k ? 'active' : ''} onClick={(e) => { if (shown !== k) slideTo(dirIn(e.currentTarget.parentNode, e.currentTarget)); setFilter(k) }}>
              {label}<small>{counts[k]}</small>
            </button>
          ))}
        </nav>
        {editable && (
          <span className="share-new">
            {isAdmin && <Act icon="estimate" label="New cost estimation" onClick={startEstimate} />}
            <Act icon="plus" label="New delivery" main onClick={startNew} />
          </span>
        )}
      </div>}

      {/* the list slides over when another filter is picked (lib/glide.js) */}
      <div className="glide-box" ref={boxRef}>
      <div key={shown} className={inClass}>
      {rows === undefined ? (
        <p className="muted">Loading…</p>
      ) : !list.length ? (
        <Empty title={shown === 'callsheet' ? 'No call sheet links yet' : 'Nothing sent yet'} action={editable && shown !== 'callsheet' && <Button variant="primary" onClick={startNew}>Send the first one</Button>}>
          {shown === 'callsheet'
            ? 'Call sheet links are made from the day itself, inside the project. They show up here so you can see what is still open and close it when the shoot is over.'
            : 'Paste the link you already made on SwissTransfer or WeTransfer, choose the stage, and the app gives you a page with your logo to send instead. The client opens it and downloads.'}
        </Empty>
      ) : (
        <ul className="plain deliv-list">
          {list.map((g) => {
            const r = g.head
            const last = g.answers[g.answers.length - 1]
            const one = !g.people.length
            // Update reopens one row's worth of fields into the form: fine for no name at all or
            // exactly one, but a delivery sent to several named people is several rows and there
            // is nowhere for more than one of them to go back into a single form.
            const singleTarget = g.people.length <= 1
            return (
              <li key={g.key} className={`deliv-row${g.shut ? ' is-shut' : ''}`}>
                <span className={`deliv-stage ${r.badgeClass}`}>{r.badge}{r.version ? <span className="deliv-ver">· {String(r.version).replace(/^version\s*/i, 'V')}</span> : null}</span>
                <div className="grow">
                  <strong>{r.name}{r.version ? <span className="muted deliv-tver"> · {r.version}</span> : null}</strong>
                  <div className="small muted">{r.sub}</div>
                  {/* one strip of small tags instead of three grey lines that all looked the same */}
                  {one && (g.shut || r.opens !== undefined || last) && (
                    <div className="deliv-tags">
                      {g.shut && <span className="deliv-tag t-shut">Closed</span>}
                      {r.opens === undefined ? null
                        : r.opens > 0
                          ? <span className="deliv-tag t-open" title="Opened">{ICO.eye}<span className="dt-w">Opened </span>{r.opens}&#215;{r.opened_at ? ` · ${fmtDate(r.opened_at.slice(0, 10), { day: 'numeric', month: 'short' })}` : ''}</span>
                          : <span className="deliv-tag t-quiet">Not opened</span>}
                      {r.expires_at && !r.closed && <span className="deliv-tag t-quiet">Closes {fmtDate(r.expires_at, { day: 'numeric', month: 'short' })}</span>}
                      {r.pin && <span className="deliv-tag t-quiet">Code {r.pin}</span>}
                      {last && <span className={`deliv-tag t-${last.status}`}>{RESPONSE[last.status] || 'Seen'}{last.name ? ` · ${last.name}` : ''}</span>}
                      {g.answers.length > 1 && <span className="deliv-tag t-quiet">{g.answers.length} replies</span>}
                    </div>
                  )}
                  {one && last?.note && <p className="deliv-quote">&#8220;{last.note}&#8221;</p>}

                </div>
                <div className="deliv-tools">
                  {one && <button className="deliv-tool" title="Copy link" aria-label="Copy link" onClick={() => copy(r.url, 'Link')}>{tool(ICO.link, 'Copy link')}</button>}
                  {one && r.isDelivery && <button className="deliv-tool" title="Copy for email" aria-label="Copy for email" onClick={() => copy(mailText(r), 'Message')}>{tool(ICO.mail, 'Copy for email')}</button>}
                  {one && <a className="deliv-tool" href={r.url} target="_blank" rel="noreferrer" title="Open" aria-label="Open">{tool(ICO.open, 'Open')}</a>}
                  {editable && r.isDelivery && singleTarget && <button className="deliv-tool" title="Update" aria-label="Update" onClick={() => openDelivery(r)}>{tool(ICO.edit, 'Update')}</button>}
                  {editable && isAdmin && r.isEstimate && singleTarget && <button className="deliv-tool" title="Update" aria-label="Update" onClick={() => openEstimate(r)}>{tool(ICO.edit, 'Update')}</button>}
                  {editable && r.opens !== undefined && (
                    <button className="deliv-tool" title={g.shut ? 'Reopen' : 'Close the link'} aria-label={g.shut ? 'Reopen' : 'Close the link'} onClick={() => setShut(g.key, !g.shut)}>{tool(g.shut ? ICO.unlock : ICO.lock, g.shut ? 'Reopen all' : one ? 'Close' : 'Close all')}</button>
                  )}
                  {editable && <Confirm className="deliv-tool deliv-tool-x" onConfirm={async () => { await removeShare({ workspaceId: state.workspace.id, ref: g.key }); reload() }} label="Delete" title="Delete" aria-label="Delete">{tool(ICO.trash, 'Delete')}</Confirm>}
                </div>

                {/* One page per person: its own row under the two above, spanning across to the
                    same right edge so its buttons line up with theirs rather than stopping short. */}
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
                            <button className="deliv-tool" title="Copy link" aria-label="Copy link" onClick={() => copy(p.url, 'Link')}>{tool(ICO.link, 'Copy link')}</button>
                            <a className="deliv-tool" href={p.url} target="_blank" rel="noreferrer" title="Open" aria-label="Open">{tool(ICO.open, 'Open')}</a>
                            {editable && p.opens !== undefined && (
                              <button className="deliv-tool" title={p.shut ? 'Reopen' : 'Close'} aria-label={p.shut ? 'Reopen' : 'Close'} onClick={() => setShut(p.ref, !p.shut, true)}>{tool(p.shut ? ICO.unlock : ICO.lock, p.shut ? 'Reopen' : 'Close')}</button>
                            )}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
      </div>
      </div>

      <Modal open={!!draft} title="Delivery page for the client" wide className="glass-form" onClose={() => !busy && !upload && setDraft(null)}
        footer={<><Button variant="ghost" onClick={() => setDraft(null)} disabled={busy || !!upload}>Cancel</Button><Button variant="primary" onClick={publish} disabled={busy || !!upload || !!thumbUp}>{busy ? 'Publishing…' : upload || thumbUp ? 'Uploading…' : 'Publish and copy link'}</Button></>}>
        {draft && (
          <div className="stack">
            <div className={draft.stage === 'deliverables' ? 'row-2' : 'row-3'}>
              <Field label="Stage"><Select value={draft.stage} onChange={(e) => setStage(e.target.value)} options={STAGES.some((s) => s[0] === draft.stage) ? STAGES : [...STAGES, OLD_STAGES.find((s) => s[0] === draft.stage) || [draft.stage, stageLabel(draft.stage)]]} /></Field>
              <Field label="Project"><Select value={draft.projectId} onChange={(e) => pickProject(e.target.value)} options={[['', 'Not in the app'], ...projects.map((p) => [p.id, p.title])]} /></Field>
              {draft.stage !== 'deliverables' && <Field label="Version"><Input value={draft.version} onChange={(e) => setD('version', e.target.value)} placeholder="v2" /></Field>}
            </div>
            <div className="row-2">
              {/* client first, then the title (Alex, 13 Oct) */}
              <Field label="Client / artist"><Input value={draft.client} onChange={(e) => setD('client', e.target.value)} placeholder="Καίτη Γαρμπή" /></Field>
              <Field label="Title"><Input value={draft.title} onChange={(e) => setD('title', e.target.value)} placeholder="Το τραγούδι" /></Field>
            </div>
            <Field label="Download link">
              <div className="deliv-linkrow">
                {/* a link typed by hand replaces the uploaded files' own buttons */}
                <Input value={draft.link} onChange={(e) => setDraft((d) => ({ ...d, link: e.target.value, files: [] }))} placeholder="https://www.swisstransfer.com/d/…" disabled={!!upload} />
                {remote && (
                  <>
                    <input ref={fileRef} type="file" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
                    <Button type="button" onClick={() => fileRef.current?.click()} disabled={!!upload} title="One file, or several at once: several get one link for them all">Upload to pCloud</Button>
                  </>
                )}
              </div>
              {!upload && (draft.files || []).length > 1 && (
                <ul className="deliv-files">
                  {draft.files.map((f) => <li key={f.url}><span>{f.name}</span><small className="muted">{f.size > 1e9 ? `${(f.size / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(f.size / 1e6))} MB`}</small></li>)}
                  <li className="muted small">The page shows Download all and a button for each file.</li>
                </ul>
              )}
              {upload && (
                <div className="deliv-upload" role="status">
                  <div className="deliv-upload-row">
                    <span className="deliv-upload-name">{upload.names.length > 1 ? `File ${upload.i + 1} of ${upload.names.length} · ${upload.names[upload.i]}` : upload.names[0]}</span>
                    <span className="deliv-upload-pct">{upload.p >= 1 ? 'Making the link…' : `${Math.round(upload.p * 100)}% of ${upload.size > 1e9 ? `${(upload.size / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(upload.size / 1e6))} MB`}`}</span>
                    <button type="button" className="link small" onClick={() => upload.ctrl.abort()}>Stop</button>
                  </div>
                  <div className="deliv-upload-bar"><i style={{ width: `${Math.round(upload.p * 100)}%` }} /></div>
                  <small className="muted">Keep this window open until it finishes.</small>
                </div>
              )}
            </Field>
            {/* one page, one link, nothing else to fill (Alex, 22 Oct): no transfer password or expiry, no closing date
                or access code, no Answer by, no contact and no Send it to, as an estimate */}
            <Field label="Where it is hosted"><Input value={draft.linkLabel} onChange={(e) => setD('linkLabel', e.target.value)} placeholder="SwissTransfer" /></Field>
            {/* Your note is gone (Alex, 22 Oct); Final Deliverables has its fine print, shown small under the files */}
            {remote && (
              /* a div, not Field's <label>: inside a label a click on one × is passed on to the first button too */
              <div className="field">
                <span className="field-label">Thumbnails</span>
                <div className="deliv-thumbs">
                  {(draft.thumbs || []).map((t, i) => (
                    <figure key={t.path || t.url} className="deliv-thumb">
                      <img src={t.url} alt="" />
                      <button type="button" className="deliv-thumb-x" aria-label={`Remove ${t.name}`} title="Remove" onClick={() => setD('thumbs', draft.thumbs.filter((_, k) => k !== i))}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" /></svg>
                      </button>
                    </figure>
                  ))}
                  <input ref={thumbRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => addThumbs(e.target.files)} />
                  <button type="button" className="deliv-thumb-add" onClick={() => thumbRef.current?.click()} disabled={!!thumbUp}>
                    {ACT_ICON.plus}<span>{thumbUp || 'Add thumbnails'}</span>
                  </button>
                </div>
              </div>
            )}
            {draft.stage === 'deliverables' && (
              <>
                <Field label="Message"><Textarea rows={5} value={draft.message} onChange={(e) => setD('message', e.target.value)} /></Field>
                <Field label="Fine print"><Textarea rows={5} value={draft.fine} onChange={(e) => setD('fine', e.target.value)} /></Field>
              </>
            )}

            {draft.stage === 'files' && (
              <>
                <RowEditor
                  label="Credits"
                  rows={draft.credits}
                  onChange={(v) => setD('credits', v)}
                  fields={[{ k: 'role', placeholder: 'Director' }, { k: 'name', placeholder: 'Name' }]}
                  addLabel="Add a credit"
                />
                <RowEditor
                  label="Files included"
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

      <Modal open={!!edraft} title="Cost estimation" wide className="est-modal" onClose={() => { if (!busy) { leaveFull(); setEdraft(null) } }}
        footer={<><Button variant="ghost" onClick={() => { leaveFull(); setEdraft(null) }} disabled={busy}>Cancel</Button><Button variant="primary" onClick={publishEstimate} disabled={busy}>{busy ? 'Publishing…' : 'Publish and copy link'}</Button></>}>
        {edraft && (
          <div className="est-compose">
          <div className="stack">
            <div className="est-topbar">
            <div className="est-seg est-tabs" role="tablist">
              {[['content', 'Content'], ['look', 'Look'], ...(mobile ? [['preview', 'Preview']] : [])].map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={etab === k} className={etab === k ? 'on' : ''} onClick={() => setEtab(k)}>{label}</button>
              ))}
            </div>
            {!mobile && (
              <button type="button" className={`est-full${full ? ' on' : ''}`} onClick={flipFull} title={full ? 'Exit full screen (Esc)' : 'Full screen'}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{full ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}</svg>
                <span>{full ? 'Exit full screen' : 'Full screen'}</span>
              </button>
            )}
            </div>
            {etab === 'look' && <EstimateLookEditor look={edraft.look} onChange={(v) => setE('look', v)} saved={savedLook} onSave={() => saveLook(edraft.look)} />}
            {etab === 'preview' && mobile && <div className="est-preview est-preview-phone"><EstimateSheet d={estimateData(edraft)} /></div>}
            {etab === 'content' && (<>
            {/* tidied (Alex, 19 Oct): no explanations, the fields side by side, the opening note one line */}
            <div className="row-3">
              <Field label="Project"><Select value={edraft.projectId} onChange={(e) => pickEstimateProject(e.target.value)} options={[['', 'Not in the app'], ...projects.map((p) => [p.id, p.title])]} /></Field>
              <Field label="Title"><Input value={edraft.title} onChange={(e) => setE('title', e.target.value)} placeholder="Northwind Summer Film" /></Field>
              <Field label="Client"><Input value={edraft.client} onChange={(e) => setE('client', e.target.value)} /></Field>
            </div>
            <Field label="Opening note"><Input value={edraft.intro} onChange={(e) => setE('intro', e.target.value)} placeholder="What the estimate covers" /></Field>

            <LineEditor
              rows={edraft.lines}
              onChange={(v) => setE('lines', v)}
              cur={state.finance?.settings?.currency || 'EUR'}
              totalPrice={edraft.totalPrice}
              discount={edraft.discount}
              vatPct={edraft.vatPct}
            />

            {/* the price of the whole job and VAT (Alex, 19 Oct): with a total price the lines only say what it includes */}
            <div className="row-4">
              <Field label="Total price"><Input type="number" min="0" step="0.01" value={edraft.totalPrice} onChange={(e) => setE('totalPrice', e.target.value)} placeholder="Sum of the lines" /></Field>
              <Field label="VAT %"><Input type="number" min="0" max="99" value={edraft.vatPct} onChange={(e) => setE('vatPct', e.target.value)} placeholder="0" /></Field>
              <Field label="Discount"><Input type="number" min="0" step="0.01" value={edraft.discount} onChange={(e) => setE('discount', e.target.value)} placeholder="0" /></Field>
              <Field label="Valid until"><Input type="date" value={edraft.validUntil} onChange={(e) => setE('validUntil', e.target.value)} /></Field>
            </div>
            <RowEditor label="Not included" rows={edraft.excluded || []} onChange={(v) => setE('excluded', v)} fields={[{ k: 'what', placeholder: 'Props, Make up & Hair, Location fee…' }]} addLabel="Add" />
            <Field label="Payment terms & Notes"><Textarea rows={2} value={edraft.terms} onChange={(e) => setE('terms', e.target.value)} placeholder="50% on signature, 50% on delivery. Travel outside Attica billed separately." /></Field>

            {/* no recipients, contact, closing date or access code on an estimate (Alex, 19 Oct): one page, one link */}
            </>)}
          </div>
          {/* the page the client gets, drawn live as you type (Alex, 19 Oct), on a computer */}
          {!mobile && (
            <aside className="est-preview" aria-label="Preview">
              {/* Tiles or List at a click, right over the preview (Alex, 19 Oct: "on the same page it changes") */}
              <div className="est-preview-head">
                <span className="est-preview-label">Preview</span>
                <div className="est-seg est-style" role="group" aria-label="Style">
                  {[['tiles', 'Tiles'], ['list', 'List']].map(([k, label]) => {
                    const cur = (edraft.look?.lines || 'tiles') === 'list' ? 'list' : 'tiles'
                    return <button key={k} type="button" className={cur === k ? 'on' : ''} onClick={() => setE('look', { ...(edraft.look || {}), lines: k })}>{label}</button>
                  })}
                </div>
              </div>
              <EstimateSheet d={estimateData(edraft)} />
            </aside>
          )}
          </div>
        )}
      </Modal>
    </div>
  )
}

/* The cost lines. Add one, remove one, and the total underneath moves as you type. */
function LineEditor({ rows, onChange, cur, totalPrice, discount, vatPct }) {
  // No more quantity or unit (Alex): every line is just what it is and what it costs, so qty is
  // pinned to 1 the moment a line is touched here, whatever it was carrying from before.
  const set = (i, k, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v, qty: 1, unit: '' } : r)))
  const add = () => onChange([...rows, { group: rows[rows.length - 1]?.group || '', what: '', qty: 1, unit: '', price: '' }])
  // Reorder by swapping with a neighbour: same move Home's blocks use, so a line's place on the
  // printed estimate (and which group it visually sits under) is something you can set by hand.
  // drag a cost by its ⋮⋮ to reorder (Alex, 10 Oct: no more arrows)
  const sort = useDragSort((from, to) => onChange(moveItem(rows, from, to)))
  const t = estimateTotals({ lines: rows, totalPrice, discount, vatPct })
  return (
    <div className="field">
      <span className="field-label">Costs</span>
      <div className="est-edit">
        <div className="est-edit-head">
          <span>Heading</span><span>What</span><span>Amount</span><span>Advance</span><span />
        </div>
        {rows.map((r, i) => (
          <div key={i} {...sort.row('costs', i)} className={`est-edit-row ${sort.cls('costs', i)}`}>
            <Input value={r.group || ''} placeholder="Shooting" onChange={(e) => set(i, 'group', e.target.value)} />
            <Input value={r.what || ''} placeholder="Camera crew" onChange={(e) => set(i, 'what', e.target.value)} />
            <Input type="number" min="0" step="0.01" value={r.price ?? ''} placeholder="—" onChange={(e) => set(i, 'price', e.target.value)} />
            <label className="est-edit-adv" title="Part of the advance payment">
              <input type="checkbox" checked={!!r.advance} onChange={() => set(i, 'advance', !r.advance)} />
              <span>Advance</span>
            </label>
            <span className="est-edit-actions">
              <Grip {...sort.grip('costs', i)} />
              <button type="button" className="row-del" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="Remove" title="Remove">{ACT_ICON.trash}</button>
            </span>
          </div>
        ))}
        <div className="est-edit-foot">
          <Act icon="plus" label="Add a cost" onClick={add} />
          <span className="muted small">
            {t.fixed ? 'Total price' : 'Clean cost'} {amount(t.subtotal, cur)}
            {t.discount > 0 ? ` · discount ${amount(t.discount, cur)}` : ''}
            {t.vatPct > 0 ? ` · VAT ${t.vatPct}% ${amount(t.vat, cur)}` : ''}
            {t.advance > 0 ? ` · advance ${amount(t.advance, cur)}` : ''}
          </span>
          <b className="est-edit-total">{amount(t.total, cur)}</b>
        </div>
      </div>
    </div>
  )
}

/* A short editable list: the credits and files on a delivery, the lines of an estimate. */
function RowEditor({ label, hint, rows, onChange, fields, addLabel }) {
  const set = (i, k, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="rowlist">
        {rows.map((r, i) => (
          <div key={i} className="rowlist-row">
            {fields.map((f) => <Input key={f.k} type={f.type || 'text'} value={r[f.k] || ''} placeholder={f.placeholder} onChange={(e) => set(i, f.k, e.target.value)} />)}
            <button type="button" className="row-del" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="Remove" title="Remove">{ACT_ICON.trash}</button>
          </div>
        ))}
        <Act icon="plus" label={addLabel} onClick={() => onChange([...rows, Object.fromEntries(fields.map((f) => [f.k, '']))])} />
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}
