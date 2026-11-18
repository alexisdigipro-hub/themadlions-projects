import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useToast } from '../../components/ui.jsx'
import Fold from '../../components/Fold.jsx'
import { useProject } from '../Project.jsx'
import { useStore } from '../../lib/store.jsx'
import { pcloudTarget } from '../../lib/pcloud.js'
import { deletePhoto, photoUrls } from '../../lib/photos.js'
import { importPdfShow } from '../../lib/pdfShow.js'

/* Presentations from a PDF, on the Overview (Alex, 18 Nov; lib/pdfShow.js reads them): each one a box of its own, one
   slide at a time in the hub's look (title, text, pictures as soft tiles), ‹ › to move, Present for the whole screen.
   project.pdfShows = [{ id, name, at, pages, slides: [{ id, title, body, photos }] }]. */
const I = {
  prev: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6" /></svg>,
  next: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" /></svg>,
  play: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14v10H5z" /><path d="M10.5 8.5v4l3.5-2z" /><path d="M9 19.5h6M12 15.5v4" /></svg>,
  trash: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l1 12.5h9l1-12.5M9.5 7V4.5h5V7" /></svg>,
  close: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>,
}

function Slide({ s, urls }) {
  const pics = s.photos || []
  const kind = pics.length && (s.title || s.body) ? 'split' : pics.length ? 'pics' : 'text'
  return (
    <div className={`pds-slide ${kind}`}>
      {pics.length > 0 && (
        <div className={`pds-pics n${Math.min(pics.length, 4)}`}>
          {pics.slice(0, 6).map((p) => <img key={p.id} src={urls[p.id] || p.thumb} alt="" loading="lazy" draggable="false" />)}
        </div>
      )}
      {(s.title || s.body) && (
        <div className="pds-text">
          {s.title && <h3>{s.title}</h3>}
          {s.body && s.body.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
        </div>
      )}
    </div>
  )
}

function useSlideKeys(on, go, close) {
  useEffect(() => {
    if (!on) return undefined
    const key = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
      else if (e.key === 'Escape') close?.()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  })
}

function Show({ show, editable, onDelete }) {
  const [i, setI] = useState(0)
  const [full, setFull] = useState(false)
  const [armed, setArmed] = useState(false)
  const [urls, setUrls] = useState({})
  const n = show.slides.length
  const all = useMemo(() => show.slides.flatMap((s) => s.photos || []), [show])
  useEffect(() => { let alive = true; photoUrls(all).then((u) => alive && setUrls(u)).catch(() => {}); return () => { alive = false } }, [all])
  useEffect(() => { if (i >= n) setI(Math.max(0, n - 1)) }, [n]) // eslint-disable-line react-hooks/exhaustive-deps
  const go = (d) => setI((x) => Math.min(n - 1, Math.max(0, x + d)))
  useSlideKeys(full, go, () => setFull(false))
  const touch = useRef(null)
  const swipe = { onTouchStart: (e) => { touch.current = e.touches[0].clientX }, onTouchEnd: (e) => { const dx = e.changedTouches[0].clientX - (touch.current ?? 0); if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1) } }
  const s = show.slides[i]
  return (
    <Fold k="pdfshow" title={show.name}>
      <section className="panel pds">
        <div className="toolbar">
          <div className="toolbar-info"><strong>{show.name}</strong><span className="muted">{n} slide{n === 1 ? '' : 's'} · from PDF</span></div>
          <div className="toolbar-actions ov-acts">
            <button type="button" className="add-pill" onClick={() => setFull(true)}>{I.play}<span>Present</span></button>
            {editable && <button type="button" className={`ov-round pds-del${armed ? ' armed' : ''}`} onClick={() => { if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 3000); return } onDelete() }} title={armed ? 'Click again to delete' : 'Delete presentation'} aria-label="Delete presentation">{I.trash}</button>}
          </div>
        </div>
        <div className="pds-stage" {...swipe}>{s && <Slide s={s} urls={urls} />}</div>
        {n > 1 && (
          <div className="pds-nav">
            <button type="button" className="ov-round" onClick={() => go(-1)} disabled={!i} aria-label="Previous slide">{I.prev}</button>
            <span className="pds-count">{i + 1} / {n}</span>
            <button type="button" className="ov-round" onClick={() => go(1)} disabled={i >= n - 1} aria-label="Next slide">{I.next}</button>
          </div>
        )}
      </section>
      {full && createPortal(
        <div className="pds-full" role="dialog" aria-label={show.name} {...swipe}>
          <button type="button" className="ov-round pds-x" onClick={() => setFull(false)} aria-label="Close">{I.close}</button>
          <div className="pds-full-stage">{s && <Slide s={s} urls={urls} />}</div>
          <div className="pds-nav">
            <button type="button" className="ov-round" onClick={() => go(-1)} disabled={!i} aria-label="Previous slide">{I.prev}</button>
            <span className="pds-count">{i + 1} / {n}</span>
            <button type="button" className="ov-round" onClick={() => go(1)} disabled={i >= n - 1} aria-label="Next slide">{I.next}</button>
          </div>
        </div>, document.body)}
    </Fold>
  )
}

export default function PdfShows({ startSignal = 0 }) {
  const { project, edit, canEdit } = useProject()
  const { state } = useStore()
  const toast = useToast()
  const editable = canEdit('files')
  const fileRef = useRef(null)
  const [busy, setBusy] = useState('')
  useEffect(() => { if (startSignal) fileRef.current?.click() }, [startSignal])
  const shows = project.pdfShows || []
  const add = async (file) => {
    if (!file) return
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') return toast('Pick a PDF file.', 'error')
    setBusy('Opening the PDF…')
    try {
      const show = await importPdfShow({ file, projectId: project.id, pcloud: pcloudTarget(state, project.id), onStep: setBusy })
      edit((p) => { p.pdfShows = [...(p.pdfShows || []), show] })
      toast(`${show.slides.length} slides from ${show.name}`, 'ok')
    } catch (e) { toast(e.message || 'Could not read this PDF.', 'error') }
    setBusy('')
    if (fileRef.current) fileRef.current.value = ''
  }
  const remove = async (show) => {
    edit((p) => { p.pdfShows = (p.pdfShows || []).filter((x) => x.id !== show.id) })
    for (const s of show.slides) for (const ph of s.photos || []) await deletePhoto(ph).catch(() => {})
    toast('Presentation deleted', 'ok')
  }
  return (
    <>
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => add(e.target.files?.[0])} />
      {busy && <div className="panel pds-busy"><span className="pds-spin" aria-hidden="true" />{busy}</div>}
      {shows.map((sh) => <Show key={sh.id} show={sh} editable={editable} onDelete={() => remove(sh)} />)}
    </>
  )
}
