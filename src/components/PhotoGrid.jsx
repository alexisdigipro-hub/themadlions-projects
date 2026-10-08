import { useEffect, useRef, useState } from 'react'
import { Button, Confirm, useToast } from './ui.jsx'
import { uid, useStore } from '../lib/store.jsx'
import { pcloudTarget } from '../lib/pcloud.js'
import { compress, deletePhoto, fmtBytes, photoUrls, uploadPhoto } from '../lib/photos.js'

/* Reusable photo gallery. `photos` live on the parent record; `onChange(nextPhotos)` persists them. */
export default function PhotoGrid({ photos = [], onChange, projectId, ownerId, editable, title = 'Photos' }) {
  const toast = useToast()
  const { state } = useStore()
  const fileRef = useRef()
  const [busy, setBusy] = useState('')
  const [urls, setUrls] = useState({})
  const [open, setOpen] = useState(null)

  useEffect(() => {
    let alive = true
    photoUrls(photos).then((u) => alive && setUrls(u))
    return () => { alive = false }
  }, [photos])

  const add = async (files) => {
    const list = Array.from(files || []).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    if (!list.length) return
    let next = [...photos]
    let saved = 0, before = 0, after = 0
    for (let i = 0; i < list.length; i++) {
      setBusy(`Compressing ${i + 1} of ${list.length}…`)
      try {
        const c = await compress(list[i])
        const id = uid()
        setBusy(`Uploading ${i + 1} of ${list.length}…`)
        // pCloud when Settings > Integrations > File storage says so, the built-in storage otherwise
        const { path, inline, fileid, scope } = await uploadPhoto({ projectId, ownerId, id, blob: c.blob, pcloud: pcloudTarget(state, projectId) })
        next.push({ id, path, inline, ...(fileid ? { fileid, scope } : {}), thumb: c.thumb, w: c.w, h: c.h, bytes: c.bytes, caption: '', addedAt: new Date().toISOString() })
        saved += c.originalBytes - c.bytes
        before += c.originalBytes
        after += c.bytes
      } catch (e) {
        toast(e.message, 'error')
      }
    }
    setBusy('')
    if (next.length !== photos.length) {
      onChange(next)
      toast(`${next.length - photos.length} photo${next.length - photos.length === 1 ? '' : 's'} added · ${fmtBytes(before)} → ${fmtBytes(after)}`, 'ok')
    }
    if (fileRef.current) fileRef.current.value = ''
  }
  const remove = async (p) => {
    // a copied project shares the original's pCloud photos: only a photo of this project (or of
    // the library, from the Database page) is deleted from pCloud, the rest just leave the list
    const own = !p.fileid || p.scope?.id === projectId || (p.scope?.kind === 'library' && projectId === 'library')
    if (own) await deletePhoto(p).catch(() => {})
    onChange(photos.filter((x) => x.id !== p.id))
  }
  const setCaption = (p, caption) => onChange(photos.map((x) => (x.id === p.id ? { ...x, caption } : x)))
  const makeCover = (p) => onChange([p, ...photos.filter((x) => x.id !== p.id)])

  return (
    <div className="photos">
      <div className="photos-head">
        <h3>{title} {photos.length ? <span className="muted">{photos.length}</span> : null}</h3>
        {editable && (
          <div className="row-actions">
            <input ref={fileRef} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => add(e.target.files)} />
            <Button size="sm" onClick={() => fileRef.current?.click()} disabled={!!busy}>{busy || 'Add photos'}</Button>
          </div>
        )}
      </div>
      {!photos.length ? (
        <p className="muted small">Scouting stills, parking, load-in, the room at the planned hour. Photos are compressed on your phone before upload.</p>
      ) : (
        <div className="photo-grid">
          {photos.map((p, i) => (
            <figure key={p.id} className="photo">
              <button className="photo-btn" onClick={() => setOpen(p)} aria-label="Open photo">
                <img src={p.thumb || urls[p.id]} alt={p.caption || ''} loading="lazy" />
                {i === 0 && <span className="photo-cover">cover</span>}
              </button>
              {editable ? (
                <input className="photo-caption" value={p.caption || ''} placeholder="Caption" onChange={(e) => setCaption(p, e.target.value)} />
              ) : (
                p.caption && <figcaption>{p.caption}</figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      {open && (
        <div className="lightbox" onClick={() => setOpen(null)}>
          <img src={urls[open.id] || open.thumb} alt={open.caption || ''} onClick={(e) => e.stopPropagation()} />
          <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
            <span>{open.caption || ''} <span className="muted small">{open.w}×{open.h}{open.bytes ? ` · ${fmtBytes(open.bytes)}` : ''}</span></span>
            <div className="row-actions">
              {urls[open.id] && <a className="btn btn-ghost btn-sm" href={urls[open.id]} target="_blank" rel="noreferrer">Open full size</a>}
              {editable && photos[0]?.id !== open.id && <Button size="sm" variant="ghost" onClick={() => { makeCover(open) }}>Make cover</Button>}
              {editable && <Confirm onConfirm={() => { remove(open); setOpen(null) }} label="Delete" />}
              <Button size="sm" variant="ghost" onClick={() => setOpen(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
