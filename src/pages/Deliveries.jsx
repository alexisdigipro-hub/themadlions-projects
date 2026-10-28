import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ACT_ICON, Act, Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useIsMobile, useToast } from '../components/ui.jsx'
import { can, uid, useCurrentUser, useStore, visibleProjects, whenMs } from '../lib/store.jsx'
import { deliveryUrl, estimateUrl, getShareRow, listShares, publishShare, removeShare, reopenQuietly, setShareState, shareUrl, tokenOf, deckUrl } from '../lib/shares.js'
import { amount, estimateTotals } from '../lib/estimate.js'
import { EstimateSheet } from './PublicEstimate.jsx'
import EstimateLookEditor from '../components/EstimateLookEditor.jsx'
import { fmtDate, toISODate } from '../lib/dates.js'
import { dirIn, useSlide } from '../lib/glide.js'
import { Grip, moveItem, useDragSort } from '../components/DragSort.jsx'
import { pcloudDeliverMany, pcloudDeliveryLabels, pcloudDeliveryLink, pcloudDeliveryRemove } from '../lib/pcloud.js'
import { uploadThumbs } from '../lib/deliveryThumbs.js'
import { copyText, creditsFromProject, parseCredits, youtubeCredits } from '../lib/deliveryCredits.js'
import { remote } from '../lib/supabase.js'
import { ListSearch } from '../components/DbTools.jsx'
import { matchText } from '../lib/library.js'
import { useArrowTabs } from '../lib/arrowTabs.js'
import { copyEmail, deliveryEmail } from '../lib/deliveryEmail.js'

/* The stages a new delivery can be (Alex, 12 Oct, written his way): RoughCut, PreFinal Cut, Final Deliverables
   (Final Cut taken out, Alex 27 Oct: "it has no meaning"). Older deliveries made as a Final Cut, final files, a
   treatment or a lookbook keep their names and their pages. */
export const STAGES = [
  ['rough', 'RoughCut'],
  ['prefinal', 'PreFinal Cut'],
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
const OLD_STAGES = [['final', 'Final Cut'], ['files', 'Final files'], ['treatment', 'Treatment'], ['lookbook', 'Lookbook']]
/* What the big button says: Download Files for every cut (Alex, 12 Oct, his words); an old treatment or
   lookbook delivery keeps its own. */
export const stageAction = (k) =>
  k === 'treatment' ? 'Read the treatment'
  : k === 'lookbook' ? 'Open the lookbook'
  : 'Download Files'
export const stageLabel = (k) => [...STAGES, ...OLD_STAGES].find((s) => s[0] === k)?.[1] || 'RoughCut'
const RESPONSE = { approved: 'Approved', changes: 'Changes asked', seen: 'Seen' }
/* How long the pCloud upload still needs, from its pace so far (Alex, 23 Oct: a big file on a slow line looked
   stuck): nothing for the first few seconds, then "· about 40 min left" and its speed. */
const uploadLeft = (u) => {
  const secs = (Date.now() - (u.at || Date.now())) / 1000
  if (!u.p || u.p < 0.005 || secs < 8) return ''
  const left = Math.max(0, secs / u.p - secs)
  const speed = (u.p * u.size) / secs / 1e6
  const t = left < 90 ? 'under 2 min' : left < 3600 ? `${Math.round(left / 60)} min` : `${Math.floor(left / 3600)} h ${Math.round((left % 3600) / 60)} min`
  return ` · ${speed >= 1 ? speed.toFixed(1) : speed.toFixed(2)} MB/s · about ${t} left`
}

const emptyDelivery = () => ({
  id: uid(), projectId: '', stage: 'rough', version: '', title: '', client: '',
  link: '', linkLabel: '', password: '', linkExpires: '', pageCloses: '', note: '', feedbackBy: '',
  credits: [], deliverables: [], recipients: [], contactName: '', contactEmail: '', contactPhone: '', pin: '',
  files: [], // several files uploaded together: [{ name, url, size }], one button each on the page
  fine: '', // Final Deliverables' fine print
  pcFolder: '', // the pCloud folder the uploaded files are in, so more can go next to them
  label: '', // Final Deliverables: the record label folder in "Projects - FinalCuts" it goes under (Alex, 27 Oct)
  message: '', // and its opening message
  creditsText: '', // and its credits, one "Role: Name" a line
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
  const [emailing, setEmailing] = useState(null) // the delivery shown as an email (Alex, 28 Oct)
  const tabsRow = useRef(null) // ← / → step through the tabs on a computer (Alex, 27 Oct)
  useArrowTabs(tabsRow)
  const [params] = useSearchParams()
  const go = useNavigate()
  const [filter, setFilterRaw] = useState(() => params.get('tab') || 'all') // Alex: open on Everything, not just Deliveries
  // Roardino is a tab here (Alex, 27 Oct): its frame is the hub's kept one (Layout.jsx), shown while the address
  // says ?tab=roardino; the other tabs take that away again
  const setFilter = (k) => { setFilterRaw(k); if (k === 'roardino') go('/share?tab=roardino'); else if (params.get('tab')) go('/share') }
  useEffect(() => { const t = params.get('tab'); if (t && t !== filter) setFilterRaw(t) }, [params]) // eslint-disable-line react-hooks/exhaustive-deps
  // Tiles or a list, on a computer (Alex, 24 Oct), remembered on this device
  // the List only (Alex, 27 Oct: "leave only the list mode"), Tiles / List gave way to a search
  const look = 'list'
  const [q, setQ] = useState('')
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
  // a tile's picture on a computer (Alex, 24 Oct: the Share page, 2026): the delivery's first still, else its project's cover
  const coverOf = (d) => d.thumbs?.find((t) => t.url)?.url || d.project?.cover || projects.find((p) => p.id === d.projectId)?.coverThumb || ''
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
      pin: r.pin || '', fine: d.fine || '', message: d.message || '', creditsText: d.creditsText || '', thumbs: d.thumbs || [], pcFolder: d.pcFolder || '', label: d.label || '',
    })
  }
  const creditsOf = (projectId) => creditsFromProject(state.projects.find((x) => x.id === projectId), state.workspace.name, { users: state.users || [], settings: state.settings })
  const pickProject = (projectId) => {
    const p = state.projects.find((x) => x.id === projectId)
    setDraft((d) => ({
      ...d, projectId,
      creditsText: d.stage === 'deliverables' && !d.creditsText?.trim() ? creditsOf(projectId) : d.creditsText,
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
    // and the project's credits (Alex, 23 Oct)
    creditsText: v === 'deliverables' && !d.creditsText?.trim() && d.projectId ? creditsOf(d.projectId) : d.creditsText,
  }))
  /* The record labels (Alex, 27 Oct): the folders in "Projects - FinalCuts", asked of pCloud once a Final Deliverables
     form is open; none (ready false) until the function has the token that sees the whole pCloud, and the field stays
     hidden. */
  const [labels, setLabels] = useState({ ready: false, list: [] })
  const [newLabel, setNewLabel] = useState(null)
  const wantLabels = remote && draft?.stage === 'deliverables'
  useEffect(() => {
    if (!wantLabels) return undefined
    let on = true
    pcloudDeliveryLabels().then((r) => on && setLabels({ ready: !!r.ready, list: r.labels || [] })).catch(() => {})
    return () => { on = false }
  }, [wantLabels])
  useEffect(() => { if (!draft) setNewLabel(null) }, [draft])
  /* Upload the cut itself to pCloud (Alex, 12 Oct): into Deliveries/<stage>/<title> in the company
     pCloud, straight from this browser, then the public pCloud link fills Download link. */
  const [upload, setUpload] = useState(null) // { names, size, p, i, ctrl }
  const fileRef = useRef(null)
  // one file or several (Alex, 12 Oct): several share one folder and one link for them all
  const uploadFiles = async (list) => {
    const files = [...(list || [])]
    if (!files.length || !draft) return
    const ctrl = new AbortController()
    setUpload({ names: files.map((f) => f.name), size: files.reduce((n, f) => n + f.size, 0), p: 0, i: 0, ctrl, at: Date.now() })
    try {
      const title = draft.title.trim() || projects.find((p) => p.id === draft.projectId)?.title || files[0].name.replace(/\.[^.]+$/, '')
      // files already on this delivery stay (Alex, 23 Oct): the new ones are added, into the same pCloud folder when
      // that folder is known (pcFolder, kept with the page since 23 Oct)
      const prev = (draft.files || []).filter((f) => f.url)
      const into = prev.length ? draft.pcFolder || '' : ''
      if (!into && draft.stage === 'deliverables' && labels.ready && !draft.label) throw new Error('Pick the label first.')
      const r = await pcloudDeliverMany(files, { stage: stageLabel(draft.stage), title, label: draft.label, into, keep: into ? prev : [] }, { onProgress: (p, i) => setUpload((u) => (u ? { ...u, p, i } : u)), signal: ctrl.signal })
      // one file is kept too, so the client's page can offer Save to Photos for it
      const got = r.files
      const together = !!into && into === r.folder
      setDraft((d) => (d ? {
        ...d,
        // one link for every file when they are in one folder; else the link the delivery already had (each file has its own)
        link: !prev.length || together ? r.url || d.link || got[0].url : d.link || r.url,
        linkLabel: d.linkLabel || 'pCloud',
        files: [...prev, ...got],
        pcFolder: prev.length && !together ? d.pcFolder || '' : r.folder || '',
      } : d))
      const n = prev.length + got.length
      toast(prev.length ? `${got.length} more ${got.length === 1 ? 'file' : 'files'} added, ${n} in all` : `Uploaded to pCloud: ${r.folder.split('/').filter(Boolean).slice(-3).join(' / ')}`, 'ok')
    } catch (e) {
      if (!ctrl.signal.aborted) toast(/Unknown action/.test(e.message) ? 'Deploy the new pcloud function first (Supabase > Edge Functions > pcloud).' : e.message, 'error')
    } finally {
      setUpload(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  /* One file off the delivery, or a new one in its place (Alex, 27 Oct: "delete a link and replace it when needed,
     but keep the same link"): the client's page keeps its address (publishing again keeps its token); the file taken
     off goes to pCloud's trash only when the page is published, so Cancel loses nothing. */
  const replaceRef = useRef(null)
  const [replacing, setReplacing] = useState(-1)
  const dropFile = (i) => setDraft((d) => {
    const old = d.files[i]
    const files = d.files.filter((_, j) => j !== i)
    return { ...d, files, removed: [...(d.removed || []), old], link: files.length ? d.link : '', pcFolder: files.length ? d.pcFolder : d.pcFolder }
  })
  const replaceFile = async (i, file) => {
    if (!file || !draft) return
    const ctrl = new AbortController()
    setUpload({ names: [file.name], size: file.size, p: 0, i: 0, ctrl, at: Date.now() })
    try {
      const title = draft.title.trim() || projects.find((p) => p.id === draft.projectId)?.title || file.name.replace(/\.[^.]+$/, '')
      const keep = (draft.files || []).filter((f, j) => j !== i && f.url)
      const r = await pcloudDeliverMany([file], { stage: stageLabel(draft.stage), title, label: draft.label, into: draft.pcFolder || '', keep: draft.pcFolder ? keep : [] }, { onProgress: (p) => setUpload((u) => (u ? { ...u, p } : u)), signal: ctrl.signal })
      const got = r.files[0]
      setDraft((d) => {
        if (!d) return d
        const old = d.files[i]
        const files = d.files.map((f, j) => (j === i ? got : f))
        const sameFolder = !!d.pcFolder && d.pcFolder === r.folder
        // one file: its own link is the page's; several in one folder: a new link for them all
        return { ...d, files, removed: [...(d.removed || []), old], link: files.length === 1 ? got.url : sameFolder ? r.url || d.link : d.link || got.url, pcFolder: d.pcFolder || r.folder || '' }
      })
      toast(`${file.name} in place of the old one. Publish to update the client's page (same link).`, 'ok')
    } catch (e) {
      if (!ctrl.signal.aborted) toast(e.message, 'error')
    } finally {
      setUpload(null); setReplacing(-1)
      if (replaceRef.current) replaceRef.current.value = ''
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
        pcFolder: (draft.files || []).length ? draft.pcFolder || '' : '',
        label: draft.stage === 'deliverables' ? draft.label || '' : '',
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
        credits: draft.stage === 'deliverables' ? parseCredits(draft.creditsText) : draft.stage === 'files' ? draft.credits.filter((c) => c.name) : [],
        creditsText: draft.stage === 'deliverables' ? (draft.creditsText || '').trim() : '',
        deliverables: draft.stage === 'files' ? draft.deliverables.filter((d) => d.name) : [],
        contact: {},
        sentAt: new Date().toISOString(),
      }
      // the files taken off or replaced: out of pCloud's folder too (to its trash), so Download all matches the page
      let dropped = false
      for (const f of draft.removed || []) {
        if (!draft.pcFolder || draft.files.some((x) => x.url === f.url)) continue
        try { await pcloudDeliveryRemove({ fileid: f.fileid, url: f.url, path: draft.pcFolder }); dropped = true } catch (e) { toast(`${f.name}: ${e.message}`, 'error') }
      }
      // a file taken off without a new one in its place: the one link is made again for the files left (27 Oct: it is a
      // link to those files, not to the folder, so it would still hold the one gone)
      if (dropped && data.files.length) {
        try { data.link = (await pcloudDeliveryLink(draft.pcFolder, data.files, data.title)) || data.link } catch { /* the old link stays */ }
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

  const today = toISODate(new Date()) // local date, not UTC: a link must not look closed a day early
  // shot list links stopped with RoarList (Alex, 27 Oct), as the ordino links with Roardino
  const all = useMemo(() => (rows || []).filter((r) => r.kind !== 'status' && r.kind !== 'callsheet' && r.kind !== 'shotlist').map((r) => {
    const d = r.data || {}
    const isDelivery = r.kind === 'delivery'
    const isEstimate = r.kind === 'estimate'
    const isDeck = r.kind === 'deck'
    const day = d.day || {}
    return {
      ...r,
      isDelivery,
      isEstimate,
      url: isDelivery ? deliveryUrl(r.token) : isEstimate ? estimateUrl(r.token) : isDeck ? deckUrl(r.token) : shareUrl(r.token),
      shut: !!r.closed || (!!r.expires_at && r.expires_at < today),
      // the day it went out, for the list's date (as Roardino's list, Alex 27 Oct)
      when: d.sentAt || r.updated_at || r.created_at || '',
      answers: Array.isArray(r.responses) ? r.responses : [],
      badge: isDelivery ? stageLabel(d.stage) : isEstimate ? 'Estimate' : isDeck ? 'Presentation' : 'Call sheet',
      badgeClass: isDelivery ? `s-${d.stage}` : isEstimate ? 's-estimate' : 's-callsheet',
      name: isDelivery || isEstimate ? d.title : (d.project?.title || (isDeck ? 'Presentation' : 'Call sheet')),
      version: isDelivery || isEstimate ? d.version : (day.index ? `Day ${day.index}${day.count ? ` of ${day.count}` : ''}` : ''),
      cover: coverOf(d),
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
  // the Call sheets tab went with the old ordino (Alex, 23 Oct): its links stopped, Roardino sends its own
  // the order (Alex, 27 Oct): Everything, Deliveries, Roardino, Estimates
  const tabs = [['all', 'Everything'], ['delivery', 'Deliveries'], ...(remote && can(user, 'roardino') ? [['roardino', 'Roardino']] : []), ...(isAdmin ? [['estimate', 'Estimates']] : [])]
  const inRoardino = filter === 'roardino' && tabs.some(([k]) => k === 'roardino')
  // Roardino's home in Share's top row (Alex, 27 Oct): its filters, search and New ordino come from the frame
  // ('roardino:home') and what is pressed here goes back to it ('roardino:do'); roardino/app.js
  const [rd, setRd] = useState(null)
  const [rdQ, setRdQ] = useState('')
  useEffect(() => {
    const on = (e) => { if (e.origin === window.location.origin && e.data?.type === 'roardino:home') { setRd(e.data); if (typeof e.data.search === 'string') setRdQ(e.data.search) } }
    window.addEventListener('message', on)
    return () => window.removeEventListener('message', on)
  }, [])
  const toRoardino = (msg) => { try { document.querySelector('iframe.roardino-frame')?.contentWindow?.postMessage({ type: 'roardino:do', ...msg }, window.location.origin) } catch { /* the frame is not there */ } }
  // no filters of its own here (Alex, 27 Oct: "delete All, Upcoming, Sent, Drafts, Past"): all the ordinos, the search
  useEffect(() => { if (inRoardino && rd?.view === 'home' && rd.current && rd.current !== 'all') toRoardino({ filter: 'all' }) }, [inRoardino, rd?.view, rd?.current]) // eslint-disable-line react-hooks/exhaustive-deps
  const shown = tabs.some(([k]) => k === filter) ? filter : 'all'
  const list = useMemo(() => (shown === 'all' ? groups : groups.filter((g) => g.head.kind === shown))
    .filter((g) => matchText(q, g.head.name, g.head.sub, g.head.badge, g.head.version, ...g.people.map((r) => `${r.data?.recipient?.name || ''} ${r.data?.recipient?.email || ''}`))), [groups, shown, q])
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
    <div className={`deliveries${look === 'list' ? ' share-list' : ''}${inRoardino ? ' in-roardino' : ''}`}>
      {emailing && <EmailWindow r={emailing} company={state.workspace.name} onClose={() => setEmailing(null)} />}
      {/* on a phone (Alex, 15 Oct): no title, the filters as a glass capsule and a round + on one line;
          the + offers New delivery and, for administrators, New cost estimation */}
      {mobile && (
        <div className="share-top">
          <div className="share-tabs">
            {tabs.map(([k, label]) => (
              <button key={k} type="button" className={shown === k ? 'on' : ''} onClick={(e) => { if (shown !== k) slideTo(dirIn(e.currentTarget.parentNode, e.currentTarget)); setFilter(k) }}>
                {({ 'Call sheets': 'Sheets', Everything: 'All' })[label] || label}{counts[k] !== undefined && <small>{counts[k]}</small>}
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
        <nav className="tabs db-tabs" ref={tabsRow}>
          {tabs.map(([k, label]) => (
            <button key={k} type="button" className={shown === k ? 'active' : ''} onClick={(e) => { if (shown !== k) slideTo(dirIn(e.currentTarget.parentNode, e.currentTarget)); setFilter(k) }}>
              {label}{counts[k] !== undefined && <small>{counts[k]}</small>}
            </button>
          ))}
        </nav>
        {inRoardino && rd?.view === 'home' && <>
          <span className="share-search"><ListSearch value={rdQ} onChange={(e) => { setRdQ(e.target.value); toRoardino({ search: e.target.value }) }} placeholder="Search" /></span>
          {rd.canEdit && <span className="share-new rd"><Act icon="plus" label="New ordino" main onClick={() => toRoardino({ create: true })} /></span>}
        </>}
        {!inRoardino && <span className="share-search"><ListSearch value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" /></span>}
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
        q.trim() ? <Empty title="Nothing matches">{`Nothing here has "${q.trim()}" in its title, client, project or recipients.`}</Empty> : <Empty title="Nothing sent yet" action={editable && <Button variant="primary" onClick={startNew}>Send the first one</Button>}>
          Paste the link you already made on SwissTransfer or WeTransfer, choose the stage, and the app gives you a page with your logo to send instead. The client opens it and downloads.
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
                {/* the picture on top of a tile, on a computer only (styles.css, "The Share page, 2026") */}
                <span className="deliv-cover" aria-hidden="true" style={r.cover ? { backgroundImage: `url("${r.cover}")` } : undefined} />
                <span className={`deliv-stage ${r.badgeClass}`}>{r.badge}{r.version ? <span className="deliv-ver">· {String(r.version).replace(/^version\s*/i, 'V')}</span> : null}</span>
                {/* the list (a computer): the date as Roardino's list, big day then month and weekday */}
                {(() => { const at = r.when ? new Date(r.when) : null; return at && !isNaN(at) ? <span className="deliv-date"><b>{at.getDate()}</b><span>{at.toLocaleDateString('en-GB', { month: 'short' })} · {at.toLocaleDateString('en-GB', { weekday: 'short' })}</span></span> : <span className="deliv-date none">–</span> })()}
                <div className="grow">
                  <strong>{r.name}{r.version ? <span className="muted deliv-tver"> · {r.version}</span> : null}</strong>
                  <div className="small muted">{r.sub}</div>
                  {/* one strip of small tags instead of three grey lines that all looked the same */}
                  {(one && (g.shut || r.opens !== undefined || last) || (look === 'list' && !mobile)) && (
                    <div className="deliv-tags">
                      <span className={`deliv-tag deliv-stage-in ${r.badgeClass}`}>{r.badge}</span>
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
                  {one && r.isDelivery && <button className="deliv-tool" title="Email" aria-label="Email" onClick={() => setEmailing(r)}>{tool(ICO.mail, 'Email')}</button>}
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
            <div className={draft.stage === 'deliverables' && !labels.ready ? 'row-2' : 'row-3'}>
              <Field label="Stage"><Select value={draft.stage} onChange={(e) => setStage(e.target.value)} options={STAGES.some((s) => s[0] === draft.stage) ? STAGES : [...STAGES, OLD_STAGES.find((s) => s[0] === draft.stage) || [draft.stage, stageLabel(draft.stage)]]} /></Field>
              <Field label="Project"><Select value={draft.projectId} onChange={(e) => pickProject(e.target.value)} options={[['', 'Not in the app'], ...projects.map((p) => [p.id, p.title])]} /></Field>
              {/* the record label's folder in "Projects - FinalCuts" (Alex, 27 Oct), read from pCloud; fixed once files are up */}
              {draft.stage === 'deliverables' && labels.ready && (
                <Field label="Label">
                  {newLabel !== null ? (
                    <Input autoFocus value={newLabel} placeholder="Panic Records" disabled={!!upload}
                      onChange={(e) => { setNewLabel(e.target.value); setD('label', e.target.value.trim()) }}
                      onBlur={() => { if (!newLabel.trim()) setNewLabel(null) }} />
                  ) : (
                    <Select value={draft.label} disabled={!!upload || !!draft.pcFolder}
                      onChange={(e) => (e.target.value === '+new' ? setNewLabel('') : setD('label', e.target.value))}
                      options={[['', 'Pick the label'], ...[...new Set([...labels.list, ...(draft.label ? [draft.label] : [])])].map((l) => [l, l]), ['+new', 'New label…']]} />
                  )}
                </Field>
              )}
              {draft.stage !== 'deliverables' && <Field label="Version"><Input value={draft.version} onChange={(e) => setD('version', e.target.value)} placeholder="v2" /></Field>}
            </div>
            <div className="row-2">
              {/* client first, then the title (Alex, 13 Oct) */}
              <Field label="Client / artist"><Input value={draft.client} onChange={(e) => setD('client', e.target.value)} placeholder="Καίτη Γαρμπή" /></Field>
              <Field label="Title"><Input value={draft.title} onChange={(e) => setD('title', e.target.value)} placeholder="Το τραγούδι" /></Field>
            </div>
            {/* a div, not Field's <label>: the Replace and × buttons inside it */}
            <div className="field"><span className="field-label">Download link</span>
              <div className="deliv-linkrow">
                {/* a link typed by hand replaces the uploaded files' own buttons */}
                <Input value={draft.link} onChange={(e) => setDraft((d) => ({ ...d, link: e.target.value, files: [], pcFolder: '' }))} placeholder="https://www.swisstransfer.com/d/…" disabled={!!upload} />
                {remote && (
                  <>
                    <input ref={fileRef} type="file" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
                    <input ref={replaceRef} type="file" hidden onChange={(e) => replaceFile(replacing, e.target.files?.[0])} />
                    <Button type="button" onClick={() => fileRef.current?.click()} disabled={!!upload} title="One file, or several at once: several get one link for them all">Upload to pCloud</Button>
                  </>
                )}
              </div>
              {/* what is already up stays in view, one line each, even with one file and while more go up (Alex, 23 Oct:
                  "so we can see what is there and check it") */}
              {(draft.files || []).length > 0 && (
                <ul className="deliv-files">
                  {draft.files.map((f, i) => (
                    <li key={`${f.url}-${i}`}>
                      <span><a href={f.url} target="_blank" rel="noreferrer">{f.name}</a></span>
                      <small className="muted">{f.size > 1e9 ? `${(f.size / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(f.size / 1e6))} MB`}</small>
                      {remote && <span className="deliv-file-acts">
                        <button type="button" className="btn btn-default btn-sm" disabled={!!upload} onClick={() => { setReplacing(i); replaceRef.current?.click() }} title="Upload a new file in its place; the client's link stays the same">Replace</button>
                        <Confirm onConfirm={() => dropFile(i)} label="Remove" className="deliv-file-x" title="Take it off this delivery">×</Confirm>
                      </span>}
                    </li>
                  ))}
                  <li className="muted small">{draft.files.length > 1 ? `${draft.files.length} files up. The page shows Download all and a button for each file.` : '1 file up.'}</li>
                </ul>
              )}
              {upload && (
                <div className="deliv-upload" role="status">
                  <div className="deliv-upload-row">
                    <span className="deliv-upload-name">{upload.names.length > 1 ? `File ${upload.i + 1} of ${upload.names.length} · ${upload.names[upload.i]}` : upload.names[0]}</span>
                    <span className="deliv-upload-pct">{upload.p >= 1 ? 'Making the link…' : `${Math.round(upload.p * 100)}% of ${upload.size > 1e9 ? `${(upload.size / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(upload.size / 1e6))} MB`}${uploadLeft(upload)}`}</span>
                    <button type="button" className="link small" onClick={() => upload.ctrl.abort()}>Stop</button>
                  </div>
                  <div className="deliv-upload-bar"><i style={{ width: `${Math.round(upload.p * 100)}%` }} /></div>
                  <small className="muted">Keep this window open until it finishes.</small>
                </div>
              )}
            </div>
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
                {/* credits (Alex, 23 Oct): written from the project, then his to change and add to; a div, as the
                    button inside a label would take the textarea's clicks */}
                <div className="field">
                  <span className="field-label deliv-credits-head">
                    Credits
                    {draft.projectId && (
                      <button type="button" className="link small" onClick={() => {
                        const t = creditsOf(draft.projectId)
                        if (!t) return toast('The project has no director, producer, cast or crew yet.', 'error')
                        setD('creditsText', t)
                      }}>Fill from project</button>
                    )}
                  </span>
                  <Textarea rows={7} value={draft.creditsText} placeholder={'Director: Alex Konstantinidis\nDirector of Photography: Name'} onChange={(e) => setD('creditsText', e.target.value)} />
                  <span className="field-hint deliv-credits-foot">
                    <span>One a line, Role: Name. Two names in a role: Name, Name.</span>
                    {/* the same plain lines the client's Copy gives, for a YouTube description (Alex, 23 Oct) */}
                    {draft.creditsText?.trim() && (
                      <button type="button" className="link small" onClick={async () => {
                        if (await copyText(youtubeCredits(parseCredits(draft.creditsText, { keepEmpty: true })))) toast('Credits copied for YouTube', 'ok')
                      }}>Copy for YouTube</button>
                    )}
                  </span>
                </div>
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

/* A delivery as an email (Alex, 28 Oct): what the client will see, then Copy email (paste it into a new email in
   Gmail or Apple Mail, it keeps its look), Download .html, or Open in Mail with the plain text. */
function EmailWindow({ r, company, onClose }) {
  const toast = useToast()
  const mail = useMemo(() => deliveryEmail(r.data || {}, r.url, company), [r, company])
  const copyIt = async () => {
    try { await copyEmail(mail); toast('Email copied. Paste it into a new email.', 'ok') } catch { toast('Could not copy. Use Download .html.', 'error') }
  }
  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([mail.html], { type: 'text/html' }))
    a.download = `${(r.data?.title || 'Delivery').replace(/[\\/:*?"<>|]+/g, ' ').trim()}.html`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  return (
    <Modal open wide title="Email" onClose={onClose} footer={
      <>
        <a className="btn btn-ghost btn-md" href={`mailto:?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.text)}`}>Open in Mail</a>
        <Button variant="ghost" onClick={download}>Download .html</Button>
        <span className="grow" />
        <Button variant="primary" onClick={copyIt}>Copy email</Button>
      </>
    }>
      <div className="deliv-email">
        <p className="muted small">Copy email, then paste it into a new email in Gmail, Apple Mail or Outlook: it keeps this look. Subject: <b>{mail.subject}</b></p>
        <iframe className="deliv-email-frame" title="The email" srcDoc={mail.html} sandbox="allow-popups allow-popups-to-escape-sandbox" />
      </div>
    </Modal>
  )
}
