/* The square cut of a project's cover (Alex: centre, scale and crop the picture into a square).
   A crop is { x, y, zoom }: x and y are where the middle of the square sits in the picture, as a
   share of its width and height (0.5, 0.5 is the middle), zoom 1 is the largest square the picture
   holds, 2 is half that side, and so on. Kept with the project so Adjust reopens it where it was. */

export const MAX_ZOOM = 4
export const SIZE = 480 // the square stored as the cover, enough for every place it is shown

export const centred = () => ({ x: 0.5, y: 0.5, zoom: 1 })

/* The square in picture pixels, kept inside the picture whatever x, y and zoom say. */
export function cropRect(w, h, crop) {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, Number(crop?.zoom) || 1))
  const side = Math.min(w, h) / zoom
  const half = side / 2
  const cx = Math.min(w - half, Math.max(half, (crop?.x ?? 0.5) * w))
  const cy = Math.min(h - half, Math.max(half, (crop?.y ?? 0.5) * h))
  return { sx: cx - half, sy: cy - half, side, zoom, x: cx / w, y: cy / h }
}

/* The same crop, its middle moved by dx, dy screen pixels in a frame `view` pixels wide. */
export function pan(w, h, crop, dx, dy, view) {
  const r = cropRect(w, h, crop)
  const k = view / r.side
  return clamp(w, h, { ...crop, x: r.x - dx / k / w, y: r.y - dy / k / h })
}

export function clamp(w, h, crop) {
  const r = cropRect(w, h, crop)
  return { x: r.x, y: r.y, zoom: r.zoom }
}

/* The cut, drawn SIZE × SIZE, as a JPEG data URL. */
export function renderCrop(img, crop, size = SIZE) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height
  const r = cropRect(w, h, crop)
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, r.sx, r.sy, r.side, r.side, 0, 0, size, size)
  return c.toDataURL('image/jpeg', 0.82)
}
