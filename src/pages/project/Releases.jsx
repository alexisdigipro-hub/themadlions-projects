import { useEffect, useRef, useState } from 'react'
import { Button, Confirm, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { can, uid, useCurrentUser, useStore } from '../../lib/store.jsx'
import { pcloudTarget } from '../../lib/pcloud.js'
import { deleteFile, fileUrl, uploadFile } from '../../lib/files.js'
import { fmtDate } from '../../lib/dates.js'
import { RELEASE_LANGS, fillRelease, releaseFilename, releasePdf, releaseTemplate, standardTemplate } from '../../lib/releases.js'

/*
  Release forms on the Project Database: a card listing the signed ones (open, download, delete)
  and who in Cast / Locations has none yet, with Sign beside each. Signing is three steps in one
  window: the production fills the details, hands the phone over to be read and signed with a
  finger, then (optionally) signs for the producer. The PDF goes to the project's "Releases"
  folder (pCloud when on, else the private files bucket).
  project.releases keeps only what the list needs (who, what, when, the file): the ID number,
  address, phone and email are written in the PDF and nowhere else.
*/

/* A finger / mouse signature on a canvas. ref.current: { empty(), toDataURL(), clear() } */
function SignaturePad({ padRef, onInk }) {
  const canvas = useRef(null)
  const drawn = useRef(false)
  useEffect(() => {
    const c = canvas.current
    const fit = () => {
      const r = c.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const keep = drawn.current ? c.toDataURL() : null
      c.width = Math.round(r.width * dpr)
      c.height = Math.round(r.height * dpr)
      const g = c.getContext('2d')
      g.scale(dpr, dpr)
      g.lineCap = 'round'
      g.lineJoin = 'round'
      g.strokeStyle = '#111318'
      g.lineWidth = 2.4
      if (keep) { const img = new Image(); img.onload = () => g.drawImage(img, 0, 0, r.width, r.height); img.src = keep }
    }
    fit()
    let last = null
    const pos = (e) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
    const down = (e) => { e.preventDefault(); c.setPointerCapture?.(e.pointerId); last = pos(e); const g = c.getContext('2d'); g.beginPath(); g.arc(last[0], last[1], 1.1, 0, Math.PI * 2); g.fillStyle = '#111318'; g.fill() }
    const move = (e) => {
      if (!last) return
      e.preventDefault()
      const p = pos(e)
      const g = c.getContext('2d')
      g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke()
      last = p
      if (!drawn.current) { drawn.current = true; onInk?.(true) }
    }
    const up = () => { last = null }
    c.addEventListener('pointerdown', down)
    c.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('resize', fit)
    padRef.current = {
      empty: () => !drawn.current,
      clear: () => { const g = c.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.restore(); drawn.current = false; onInk?.(false) },
      // the ink alone, cropped to what was drawn, on a transparent background
      toDataURL: () => {
        const g = c.getContext('2d')
        const { width: w, height: h } = c
        const d = g.getImageData(0, 0, w, h).data
        let x0 = w, y0 = h, x1 = 0, y1 = 0
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (d[(yy * w + xx) * 4 + 3] > 8) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy }
        if (x1 <= x0 || y1 <= y0) return ''
        const pad = 6
        x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad)
        const out = document.createElement('canvas')
        out.width = x1 - x0 + 1
        out.height = y1 - y0 + 1
        out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
        return out.toDataURL('image/png')
      },
    }
    return () => {
      c.removeEventListener('pointerdown', down)
      c.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('resize', fit)
    }
  }, [padRef, onInk])
  return <canvas ref={canvas} className="sig-pad" />
}

function Pad({ label, padRef }) {
  const [ink, setInk] = useState(false)
  return (
    <div className="sig-wrap">
      <div className="sig-box">
        <SignaturePad padRef={padRef} onInk={setInk} />
        {!ink && <span className="sig-hint">Sign here with your finger</span>}
        <span className="sig-line" />
      </div>
      <div className="sig-foot">
        <span className="muted small">{label}</span>
        <button type="button" className="link small" onClick={() => padRef.current?.clear()}>Clear</button>
      </div>
    </div>
  )
}

const shootDates = (project, lang) => {
  const days = (project.shootingDays || []).map((d) => d.date).filter(Boolean).sort()
  if (!days.length) return project.startDate ? fmtDate(project.startDate) : ''
  const f = (d) => new Date(`${d}T00:00`).toLocaleDateString(lang === 'en' ? 'en-GB' : 'el-GR', { day: 'numeric', month: 'long', year: 'numeric' })
  return days.length === 1 ? f(days[0]) : days.map(f).join(', ')
}

function ReleaseModal({ project, start, onClose }) {
  const { state, update } = useStore()
  const me = useCurrentUser()
  const toast = useToast()
  const admin = me?.role === 'admin'
  const cast = (project.contacts || []).filter((c) => c.kind === 'cast')
  const locations = project.locations || []
  const producerName = project.producer || state.finance?.settings?.invoiceProfile?.companyName || 'THE MAD LIONS'
  const stampImg = state.finance?.settings?.invoiceProfile?.stamp || ''
  const lang0 = state.settings?.releaseLang || 'el'
  const fromContact = (c) => ({ contactId: c?.id || '', locationId: '', name: c?.name || '', role: c?.character || c?.role || '', phone: c?.phone || '', email: c?.email || '' })
  const fromLocation = (l) => ({ locationId: l?.id || '', contactId: '', location: l?.name || '', address: l?.address || '', signerName: l?.contact || '', phone: l?.phone || '' })
  const [f, setF] = useState(() => {
    const kind = start?.kind || (cast.length || !locations.length ? 'talent' : 'location')
    const base = { kind, lang: lang0, name: '', role: '', minor: false, guardianName: '', idNumber: '', address: '', phone: '', email: '', location: '', signerName: '', dates: shootDates(project, lang0), fee: '', producer: producerName, contactId: '', locationId: '' }
    if (kind === 'talent') Object.assign(base, fromContact(cast.find((c) => c.id === start?.id)))
    else Object.assign(base, fromLocation(locations.find((l) => l.id === start?.id)))
    base.template = releaseTemplate(state.settings, kind, base.lang)
    return base
  })
  const [step, setStep] = useState('details') // details | sign | producer | saving
  const [showText, setShowText] = useState(false)
  const [useStamp, setUseStamp] = useState(!!stampImg)
  const [signedAt, setSignedAt] = useState('')
  const [sig, setSig] = useState('')
  const signerPad = useRef(null)
  const producerPad = useRef(null)
  const set = (patch) => setF((x) => ({ ...x, ...patch }))
  const setKindLang = (kind, lang) => setF((x) => ({ ...x, kind, lang, template: releaseTemplate(state.settings, kind, lang), dates: x.dates || shootDates(project, lang) }))

  const signer = f.kind === 'talent' ? (f.minor ? f.guardianName : f.name) : f.signerName
  const values = { ...f, project: project.title, signerName: signer }
  const text = fillRelease(f.template, values)

  const next = () => {
    if (f.kind === 'talent' && !f.name.trim()) return toast('Write the name of the person filmed.', 'error')
    if (f.kind === 'talent' && f.minor && !f.guardianName.trim()) return toast('Write the guardian\'s name: they sign for a minor.', 'error')
    if (f.kind === 'location' && !f.location.trim()) return toast('Write the location.', 'error')
    if (f.kind === 'location' && !f.signerName.trim()) return toast('Write who signs for the location.', 'error')
    setStep('sign')
  }
  const signed = () => {
    if (!signerPad.current || signerPad.current.empty()) return toast('Sign in the box first.', 'error')
    setSig(signerPad.current.toDataURL())
    setSignedAt(new Date().toISOString())
    setStep('producer')
  }
  const saveTemplate = () => {
    update((s) => { s.settings.releaseTemplates = { ...(s.settings.releaseTemplates || {}), [`${f.kind}_${f.lang}`]: f.template }; return s })
    toast('Saved as the standard text for new releases', 'ok')
  }

  const finish = async (withProducer) => {
    const psig = withProducer && producerPad.current && !producerPad.current.empty() ? producerPad.current.toDataURL() : ''
    setStep('saving')
    const id = uid()
    const fee = String(f.fee || '').trim()
    const rec = {
      ...values, id, text, signedAt, signature: sig,
      producerSignature: psig || (useStamp ? stampImg : ''), producerSigner: psig ? me?.name || '' : '',
      locationAddress: f.address, feeText: fee ? (/^\d+([.,]\d+)?$/.test(fee) ? `€${fee}` : fee) : '',
      logo: state.settings?.logo || '',
    }
    try {
      const blob = await releasePdf(rec)
      const name = releaseFilename(rec)
      const file = new File([blob], name, { type: 'application/pdf' })
      const up = await uploadFile({ projectId: project.id, id, file, pcloud: pcloudTarget(state, project.id, 'Releases') })
      const entry = {
        id, kind: f.kind, lang: f.lang, contactId: f.kind === 'talent' ? f.contactId : '', locationId: f.kind === 'location' ? f.locationId : '',
        name: f.kind === 'talent' ? f.name.trim() : f.location.trim(), signer: signer.trim(), role: f.kind === 'talent' ? f.role : '', minor: f.kind === 'talent' && f.minor,
        signedAt, signedBy: me?.id || '', signedByName: me?.name || '',
        file: { id, name, type: 'application/pdf', size: blob.size, path: up.path || '', ...(up.fileid ? { fileid: up.fileid, scope: up.scope } : {}) },
      }
      update((s) => {
        const p = s.projects.find((x) => x.id === project.id)
        if (!p) return s
        p.releases = [...(p.releases || []), entry]
        p.updatedAt = new Date().toISOString()
        // only an administrator may write the workspace's settings
        if (admin && s.settings.releaseLang !== f.lang) s.settings.releaseLang = f.lang
        return s
      })
      toast(`Release signed by ${signer} and saved as PDF`, 'ok')
      onClose(entry)
    } catch (e) {
      setStep('producer')
      toast(e.message || 'Could not save the release.', 'error')
    }
  }

  const title = step === 'sign' ? (f.lang === 'en' ? 'Read and sign' : 'Διάβασε και υπόγραψε') : step === 'details' ? 'New release form' : 'Producer signature'
  return (
    <Modal open wide title={title} onClose={step === 'saving' ? undefined : () => onClose(null)} footer={
      step === 'details' ? (
        <><Button variant="ghost" onClick={() => onClose(null)}>Cancel</Button><Button variant="primary" onClick={next}>Next: hand over to sign</Button></>
      ) : step === 'sign' ? (
        <><Button variant="ghost" onClick={() => setStep('details')}>Back</Button><Button variant="primary" onClick={signed}>{f.lang === 'en' ? 'I agree and sign' : 'Συμφωνώ και υπογράφω'}</Button></>
      ) : (
        <><Button variant="ghost" disabled={step === 'saving'} onClick={() => finish(false)}>{useStamp && stampImg ? 'Save with the stamp only' : 'Skip and save'}</Button><Button variant="primary" disabled={step === 'saving'} onClick={() => finish(true)}>{step === 'saving' ? 'Saving the PDF…' : 'Sign and save PDF'}</Button></>
      )
    }>
      {step === 'details' && (
        <div className="stack release-form">
          <div className="row-2">
            <Field label="Release">
              <Select value={f.kind} onChange={(e) => setKindLang(e.target.value, f.lang)} options={[['talent', 'Talent (cast, extras, anyone filmed)'], ['location', 'Location']]} />
            </Field>
            <Field label="Language of the form"><Select value={f.lang} onChange={(e) => setKindLang(f.kind, e.target.value)} options={RELEASE_LANGS} /></Field>
          </div>
          {f.kind === 'talent' ? (
            <>
              {cast.length > 0 && (
                <Field label="From the cast">
                  <Select value={f.contactId} onChange={(e) => set(fromContact(cast.find((c) => c.id === e.target.value)))}>
                    <option value="">Someone not in the cast list</option>
                    {cast.map((c) => <option key={c.id} value={c.id}>{c.name}{c.character ? ` · ${c.character}` : ''}</option>)}
                  </Select>
                </Field>
              )}
              <div className="row-2">
                <Field label="Full name"><Input value={f.name} onChange={(e) => set({ name: e.target.value })} /></Field>
                <Field label="Role"><Input value={f.role} onChange={(e) => set({ role: e.target.value })} placeholder="Lead, extra, interviewee" /></Field>
              </div>
              <label className="check"><input type="checkbox" checked={f.minor} onChange={(e) => set({ minor: e.target.checked })} /> Under 18: a parent or guardian signs</label>
              {f.minor && <Field label="Parent / guardian's full name"><Input value={f.guardianName} onChange={(e) => set({ guardianName: e.target.value })} /></Field>}
            </>
          ) : (
            <>
              {locations.length > 0 && (
                <Field label="From the locations">
                  <Select value={f.locationId} onChange={(e) => set(fromLocation(locations.find((l) => l.id === e.target.value)))}>
                    <option value="">A location not in the list</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </Select>
                </Field>
              )}
              <div className="row-2">
                <Field label="Location"><Input value={f.location} onChange={(e) => set({ location: e.target.value })} /></Field>
                <Field label="Owner or representative who signs"><Input value={f.signerName} onChange={(e) => set({ signerName: e.target.value })} /></Field>
              </div>
              <Field label="Shooting dates"><Input value={f.dates} onChange={(e) => set({ dates: e.target.value })} /></Field>
            </>
          )}
          <div className="row-2">
            <Field label={f.kind === 'location' || f.minor ? 'ID / passport no. of who signs' : 'ID / passport no.'}><Input value={f.idNumber} onChange={(e) => set({ idNumber: e.target.value })} placeholder="Optional" /></Field>
            <Field label={f.kind === 'location' ? 'Address of the location' : 'Address'}><Input value={f.address} onChange={(e) => set({ address: e.target.value })} placeholder="Optional" /></Field>
          </div>
          <div className="row-3">
            <Field label="Phone"><Input type="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} /></Field>
            <Field label="Fee (€)" hint="Empty: as agreed separately."><Input value={f.fee} onChange={(e) => set({ fee: e.target.value })} placeholder="150" /></Field>
          </div>
          <Field label="Producer"><Input value={f.producer} onChange={(e) => set({ producer: e.target.value })} /></Field>
          <div className="release-text-toggle">
            <button type="button" className="link small" onClick={() => setShowText((v) => !v)}>{showText ? 'Hide the text' : 'Read or edit the text of the release'}</button>
          </div>
          {showText && (
            <>
              <Field label="Text" hint="Words in {braces} are filled in from the form. Changes apply to this release only, unless you save them as the standard.">
                <Textarea rows={12} value={f.template} onChange={(e) => set({ template: e.target.value })} />
              </Field>
              <div className="release-text-actions">
                {f.template !== standardTemplate(f.kind, f.lang) && <button type="button" className="link small" onClick={() => set({ template: standardTemplate(f.kind, f.lang) })}>Back to the built-in text</button>}
                {admin && <Button size="sm" variant="ghost" onClick={saveTemplate}>Save as the standard text</Button>}
              </div>
            </>
          )}
        </div>
      )}
      {step === 'sign' && (
        <div className="release-sign">
          <div className="release-paper">
            <div className="release-paper-head">{f.kind === 'location' ? (f.lang === 'en' ? 'LOCATION RELEASE' : 'ΑΔΕΙΑ ΧΡΗΣΗΣ ΧΩΡΟΥ') : (f.lang === 'en' ? 'TALENT RELEASE' : 'ΔΗΛΩΣΗ ΣΥΝΑΙΝΕΣΗΣ')} · {project.title}</div>
            {text.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <Pad padRef={signerPad} label={signer} />
        </div>
      )}
      {(step === 'producer' || step === 'saving') && (
        <div className="release-sign">
          <p className="muted">Signed by <strong>{signer}</strong>. Take the phone back and sign for {f.producer || 'the producer'}, or skip it.</p>
          <Pad padRef={producerPad} label={`${me?.name || ''} · ${f.producer}`} />
          {stampImg && <label className="check"><input type="checkbox" checked={useStamp} onChange={(e) => setUseStamp(e.target.checked)} /> Put the company stamp when there is no signature here</label>}
        </div>
      )}
    </Modal>
  )
}

function OpenRelease({ file, children, download }) {
  const [busy, setBusy] = useState(false)
  const open = async () => {
    // a window opened before the wait, so a phone does not block it as a pop-up
    const w = download ? null : window.open('', '_blank')
    setBusy(true)
    try {
      const url = await fileUrl(file, download)
      if (!url) throw new Error('no url')
      if (w) w.location.href = url
      else { const a = document.createElement('a'); a.href = url; a.download = file.name; a.target = '_blank'; document.body.appendChild(a); a.click(); a.remove() }
    } catch {
      w?.close()
      alert('The PDF could not be opened.')
    } finally {
      setBusy(false)
    }
  }
  return <button type="button" className="link small" disabled={busy} onClick={open}>{busy ? '…' : children}</button>
}

/* The card on the Project Database. Shown when the person can see cast or locations. */
export default function Releases({ startSignal = 0 }) {
  const { project, canEdit, user } = useProject()
  const { update } = useStore()
  const toast = useToast()
  const [start, setStart] = useState(null) // { kind, id } while the form is open
  // New release from the button row at the top of the Project Database, while this card is hidden
  useEffect(() => { if (startSignal) setStart({}) }, [startSignal])
  const seeTalent = can(user, 'contacts')
  const seeLocations = can(user, 'locations')
  const editable = (seeTalent && canEdit('contacts')) || (seeLocations && canEdit('locations'))
  const list = (project.releases || []).filter((r) => (r.kind === 'location' ? seeLocations : seeTalent)).slice().sort((a, b) => (b.signedAt || '').localeCompare(a.signedAt || ''))
  const signedFor = new Set((project.releases || []).flatMap((r) => [r.contactId, r.locationId]).filter(Boolean))
  const missing = [
    ...(seeTalent && canEdit('contacts') ? (project.contacts || []).filter((c) => c.kind === 'cast' && !signedFor.has(c.id)).map((c) => ({ kind: 'talent', id: c.id, name: c.name, sub: c.character || 'Cast' })) : []),
    ...(seeLocations && canEdit('locations') ? (project.locations || []).filter((l) => !signedFor.has(l.id)).map((l) => ({ kind: 'location', id: l.id, name: l.name, sub: 'Location' })) : []),
  ]
  if (!seeTalent && !seeLocations) return null
  const form = start && <ReleaseModal project={project} start={start} onClose={() => setStart(null)} />
  // nothing signed and nobody waiting: no empty card, only the form when the top button opens it
  if (!list.length && !missing.length) return form || null

  const remove = async (r) => {
    // the PDF first, while the project still records it (pCloud only deletes what a project records)
    try { await deleteFile(r.file) } catch { /* the record goes anyway */ }
    update((s) => {
      const p = s.projects.find((x) => x.id === project.id)
      if (p) { p.releases = (p.releases || []).filter((x) => x.id !== r.id); p.updatedAt = new Date().toISOString() }
      return s
    })
    toast('Release deleted', 'ok')
  }

  return (
    <section className="panel db-card releases">
      <div className="toolbar">
        <div className="toolbar-info"><strong>Release forms</strong> <span className="muted">{list.length}</span></div>
        {editable && <div className="toolbar-actions"><Button variant="primary" size="sm" onClick={() => setStart({})}>New release</Button></div>}
      </div>
      {list.length > 0 && (
        <ul className="release-list">
          {list.map((r) => (
            <li key={r.id}>
              <span className="release-ico" aria-hidden="true">{r.kind === 'location' ? '📍' : '✍️'}</span>
              <span className="grow">
                <strong>{r.name}</strong>
                <span className="muted small"> · {r.kind === 'location' ? `location, signed by ${r.signer}` : r.minor ? `${r.role || 'talent'}, guardian ${r.signer}` : r.role || 'talent'} · {fmtDate((r.signedAt || '').slice(0, 10))}</span>
              </span>
              <span className="release-actions">
                <OpenRelease file={r.file}>Open</OpenRelease>
                <OpenRelease file={r.file} download>Download</OpenRelease>
                {editable && <Confirm onConfirm={() => remove(r)} label="Delete">×</Confirm>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {missing.length > 0 && (
        <div className="release-missing">
          <div className="muted small">No release yet</div>
          <div className="release-missing-chips">
            {missing.map((m) => (
              <button key={`${m.kind}:${m.id}`} type="button" className="release-chip" onClick={() => setStart({ kind: m.kind, id: m.id })}>
                <span>{m.name}</span><span className="muted">{m.sub}</span><strong>Sign</strong>
              </button>
            ))}
          </div>
        </div>
      )}
      {form}
    </section>
  )
}
