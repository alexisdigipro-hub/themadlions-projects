import { useEffect, useMemo, useState } from 'react'
import { Input, Modal } from './ui.jsx'
import { FONTS, FONT_CATS, ensureFontLoaded, ensureFontPreview, fontById, fontStackOf } from '../lib/fonts.js'

/* One font picker for the whole Hub (Alex, 19 Oct: "all the Greek fonts, everywhere I edit"): every family with
   Greek, searchable, sorted by kind, each name drawn in its own face with a Greek line, and only the picked one is
   fetched in full. */
const SAMPLE = 'Καλημέρα, Αθήνα 06:30'

export function FontPickerDialog({ open, value, onPick, onClose, title = 'Font' }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const list = useMemo(() => {
    const w = q.trim().toLowerCase()
    return FONTS.filter((f) => (!cat || f.cat === cat) && (!w || f.label.toLowerCase().includes(w)))
  }, [q, cat])
  // only the letters each row shows, so the whole list draws in its own faces at once
  useEffect(() => { if (open) list.forEach((f) => ensureFontPreview(f.id, `${f.label}${SAMPLE}`)) }, [open, list])
  const pick = (id) => { ensureFontLoaded(id); onPick(id); onClose() }
  return (
    <Modal open={open} title={title} wide className="font-pick-modal" onClose={onClose}>
      <div className="font-pick">
        <div className="font-pick-top">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" autoFocus className="input search" />
          <div className="font-pick-cats" role="group" aria-label="Kind">
            {FONT_CATS.map(([k, label]) => (
              <button key={k || 'all'} type="button" className={cat === k ? 'on' : ''} onClick={() => setCat(k)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="font-pick-list">
          {list.map((f) => (
            <button key={f.id} type="button" className={`font-pick-item${value === f.id ? ' on' : ''}`} style={{ fontFamily: fontStackOf(f) }} onClick={() => pick(f.id)} title={f.label}>
              <span className="font-pick-name">{f.label}</span>
              <span className="font-pick-sample">{SAMPLE}</span>
            </button>
          ))}
          {!list.length && <p className="muted small">No font by that name.</p>}
        </div>
        <p className="font-pick-count muted small">{list.length} of {FONTS.length} fonts with Greek</p>
      </div>
    </Modal>
  )
}

/* A button that shows the chosen font in its own face and opens the picker. */
export default function FontPicker({ value, onChange, title = 'Font', className = '' }) {
  const [open, setOpen] = useState(false)
  const f = fontById(value) || FONTS[0]
  useEffect(() => { ensureFontLoaded(f.id) }, [f.id])
  return (
    <>
      <button type="button" className={`font-pick-btn ${className}`} style={{ fontFamily: fontStackOf(f) }} onClick={() => setOpen(true)} aria-label={`${title}: ${f.label}`}>
        <span>{f.label}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <FontPickerDialog open={open} value={f.id} title={title} onPick={onChange} onClose={() => setOpen(false)} />
    </>
  )
}
