import { useEffect, useRef, useState } from 'react'
import { Button, Modal, useToast } from './ui.jsx'
import { MAX_ZOOM, centred, clamp, cropRect, pan, renderCrop } from '../lib/coverCrop.js'
import { compress, deletePhoto, photoBlob, uploadPhoto } from '../lib/photos.js'
import { pcloudTarget } from '../lib/pcloud.js'
import { useStore } from '../lib/store.jsx'
import { remote } from '../lib/supabase.js'

/* Everything around the cropper, for the two places a cover is set (the Overview and the
   project's details form):
   pick(file)  a new picture: it opens in the cropper, centred
   adjust()    the cover already there opens again where it was cut
   remove()    no cover
   modal       the cropper itself, to be rendered
   The square goes into coverThumb, small, inside the project, as before. The whole picture it was
   cut from is kept in the photos bucket (coverSource) so Adjust can move or widen the cut later;
   a project not yet created has no folder there, so it keeps only the square until it exists. */
export function useCover({ value, projectId, keepSource, onChange }) {
  const toast = useToast()
  const { state } = useStore()
  const [editing, setEditing] = useState(null) // { src, blob?, crop, fresh }
  const [saving, setSaving] = useState(false)
  const close = () => { if (editing?.src?.startsWith('blob:')) URL.revokeObjectURL(editing.src); setEditing(null) }

  const pick = async (file) => {
    if (!file) return
    try {
      const c = await compress(file, { max: 1600, quality: 0.85, thumb: 64 })
      setEditing({ src: URL.createObjectURL(c.blob), blob: c.blob, crop: centred(), fresh: true })
    } catch (e) {
      toast(e.message, 'error')
    }
  }
  const adjust = async () => {
    const src = value?.coverSource
    if (src?.path || src?.inline || src?.fileid) {
      try {
        return setEditing({ src: URL.createObjectURL(await photoBlob(src)), crop: value.coverCrop || centred(), fresh: false })
      } catch { /* the original is gone: cut again from the square itself */ }
    }
    if (value?.coverThumb) setEditing({ src: value.coverThumb, crop: centred(), fresh: false, fromThumb: true })
  }
  const save = async ({ thumb, crop }) => {
    setSaving(true)
    const patch = { coverThumb: thumb, coverCrop: editing.fromThumb ? null : crop }
    if (editing.fresh) {
      patch.coverSource = null
      if (keepSource && remote && projectId) {
        try {
          const id = `source-${Date.now().toString(36)}`
          const { path, fileid, scope } = await uploadPhoto({ projectId, ownerId: 'cover', id, blob: editing.blob, pcloud: pcloudTarget(state, projectId, 'Cover') })
          patch.coverSource = fileid ? { id: 'cover', fileid, scope } : { id: 'cover', path }
        } catch { /* the square is saved all the same; Adjust then works from it */ }
      }
      dropOld()
    } else if (editing.fromThumb) {
      // a square cut from the square: there is no bigger picture to go back to
      patch.coverSource = null
    }
    onChange(patch)
    setSaving(false)
    close()
  }
  // Only a file in this project's own folder: a copied project points at the original's.
  const dropOld = () => {
    const old = value?.coverSource
    if (!old || !projectId) return
    if (old.fileid ? old.scope?.id === projectId : old.path?.startsWith(`${projectId}/`)) deletePhoto(old).catch(() => {})
  }
  const remove = () => { dropOld(); onChange({ coverThumb: '', coverSource: null, coverCrop: null }) }

  const modal = editing ? <CoverCropper src={editing.src} crop={editing.crop} saving={saving} onCancel={close} onSave={save} /> : null
  return { pick, adjust, remove, modal }
}

/* Square crop of a cover: drag the picture to place it, the slider (or the mouse wheel, or two
   fingers) to scale it, Centre to put it back in the middle. What is inside the frame is what
   the cover becomes, on Home, the Overview, the call sheet and everywhere else it is shown.
   src is an object URL or a data URL (never a remote address, so the canvas can read it). */
export default function CoverCropper({ src, crop: start, onCancel, onSave, saving }) {
  const [img, setImg] = useState(null)
  const [crop, setCrop] = useState(start || centred())
  const [view, setView] = useState(320)
  const frame = useRef()
  const drag = useRef(null)

  useEffect(() => {
    const i = new Image()
    i.onload = () => { setImg(i); setCrop((c) => clamp(i.naturalWidth, i.naturalHeight, c)) }
    i.src = src
  }, [src])
  useEffect(() => {
    const el = frame.current
    if (!el) return undefined
    const measure = () => setView(el.clientWidth || 320)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [img])

  const w = img?.naturalWidth || 1, h = img?.naturalHeight || 1
  const r = cropRect(w, h, crop)
  const k = view / r.side
  const setZoom = (z) => setCrop((c) => clamp(w, h, { ...c, zoom: z }))

  // pointers: one drags, two pinch
  const pts = useRef(new Map())
  const down = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    drag.current = { crop, pinch: pts.current.size === 2 ? dist() : 0 }
  }
  const dist = () => { const [a, b] = [...pts.current.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1 }
  const move = (e) => {
    const p = pts.current.get(e.pointerId)
    if (!p || !drag.current) return
    const dx = e.clientX - p.x, dy = e.clientY - p.y
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.current.size === 2) {
      const d = dist()
      if (drag.current.pinch) setCrop((c) => clamp(w, h, { ...c, zoom: c.zoom * (d / drag.current.pinch) }))
      drag.current.pinch = d
    } else setCrop((c) => pan(w, h, c, dx, dy, view))
  }
  const up = (e) => { pts.current.delete(e.pointerId); if (!pts.current.size) drag.current = null; else if (drag.current) drag.current.pinch = pts.current.size === 2 ? dist() : 0 }
  const wheel = (e) => { e.preventDefault(); setZoom(crop.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)) }
  useEffect(() => {
    const el = frame.current
    if (!el) return undefined
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  })

  return (
    <Modal
      open
      title="Cover"
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" disabled={!img || saving} onClick={() => onSave({ thumb: renderCrop(img, crop), crop: clamp(w, h, crop) })}>{saving ? 'Saving…' : 'Save cover'}</Button>
        </>
      }
    >
      <div className="cover-crop">
        <div
          ref={frame}
          className="cover-crop-frame"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          style={{ touchAction: 'none' }}
        >
          {img ? (
            <img
              src={src}
              alt=""
              draggable="false"
              style={{ width: w * k, height: h * k, transform: `translate(${-r.sx * k}px, ${-r.sy * k}px)` }}
            />
          ) : <span className="muted small">Loading the picture…</span>}
        </div>
        <div className="cover-crop-tools">
          <span className="muted small">Scale</span>
          <input type="range" min="1" max={MAX_ZOOM} step="0.01" value={crop.zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Scale" />
          <Button size="sm" onClick={() => setCrop((c) => clamp(w, h, { ...c, x: 0.5, y: 0.5 }))}>Centre</Button>
          <Button size="sm" variant="ghost" onClick={() => setCrop(centred())}>Reset</Button>
        </div>
        <p className="muted small">Drag the picture to place it in the square. Scale with the slider, the mouse wheel or two fingers.</p>
      </div>
    </Modal>
  )
}
