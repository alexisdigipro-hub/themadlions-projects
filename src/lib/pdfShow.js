/* A PDF made into the hub's own presentation (Alex, 18 Nov: "import a PDF and take only what is in it, the texts and
   the pictures, and make its own view in our look, tidy and minimal"). Read here in the browser with pdf.js (already
   used by the script import): each page becomes one slide with its title (the largest words at the top), its text in
   paragraphs, and its pictures, each saved as a project photo (photos.js: pCloud or the photos bucket, inline in local
   mode). A picture repeated on most pages (a logo, a background) is left out. A page with neither words nor pictures
   (drawn only with shapes) comes in as one picture of the page. Nothing is sent anywhere but the project's storage. */
import { compress, uploadPhoto } from './photos.js'
import { uid } from './store.jsx'

const MAX_PAGES = 80
const MAX_PICS = 6 // a slide
const MIN_SIDE = 140 // smaller pictures are icons and bullets

async function pdfjsLib() {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  return pdfjs
}

/* words in lines, lines in a title and paragraphs */
function textOf(items) {
  const runs = items.filter((it) => it.str && it.str.trim()).map((it) => ({ s: it.str, x: it.transform[4], y: it.transform[5], size: Math.hypot(it.transform[2], it.transform[3]) || 10 }))
  runs.sort((a, b) => b.y - a.y || a.x - b.x)
  const lines = []
  for (const r of runs) {
    const l = lines[lines.length - 1]
    if (l && Math.abs(l.y - r.y) < Math.max(2, r.size * 0.4)) { l.parts.push(r); l.size = Math.max(l.size, r.size) } else lines.push({ y: r.y, size: r.size, parts: [r] })
  }
  const out = lines.map((l) => {
    l.parts.sort((a, b) => a.x - b.x)
    let t = ''
    for (const p of l.parts) t += (t && !/\s$/.test(t) && !/^\s/.test(p.s) ? ' ' : '') + p.s
    return { y: l.y, size: l.size, text: t.replace(/\s+/g, ' ').trim() }
  }).filter((l) => l.text && !/^\d{1,3}$/.test(l.text)) // page numbers
  if (!out.length) return { title: '', body: '' }
  const big = Math.max(...out.map((l) => l.size))
  const common = out.map((l) => l.size).sort((a, b) => a - b)[Math.floor(out.length / 2)]
  let title = ''
  let rest = out
  if (big > common * 1.15) {
    const i = out.findIndex((l) => l.size >= big * 0.9)
    let j = i
    while (j + 1 < out.length && out[j + 1].size >= big * 0.9 && out[j].y - out[j + 1].y < big * 1.8) j += 1
    title = out.slice(i, j + 1).map((l) => l.text).join(' ')
    rest = [...out.slice(0, i), ...out.slice(j + 1)]
  } else if (out[0].text.length <= 70 && out.length > 1) {
    title = out[0].text
    rest = out.slice(1)
  }
  let body = ''
  rest.forEach((l, k) => {
    if (k) body += rest[k - 1].y - l.y > Math.max(l.size, rest[k - 1].size) * 1.7 ? '\n\n' : '\n'
    body += l.text
  })
  return { title: title.slice(0, 200), body: body.slice(0, 4000) }
}

/* a pdf.js image object as a canvas */
function canvasOf(img) {
  if (!img || !img.width || !img.height) return null
  const c = document.createElement('canvas')
  c.width = img.width; c.height = img.height
  const ctx = c.getContext('2d')
  if (img.bitmap) { ctx.drawImage(img.bitmap, 0, 0); return c }
  if (!img.data) return null
  const d = ctx.createImageData(img.width, img.height)
  const px = img.width * img.height
  const src = img.data
  if (src.length === px * 4) d.data.set(src)
  else if (src.length === px * 3) for (let i = 0, j = 0; i < px; i++, j += 3) { d.data[i * 4] = src[j]; d.data[i * 4 + 1] = src[j + 1]; d.data[i * 4 + 2] = src[j + 2]; d.data[i * 4 + 3] = 255 }
  else if (src.length === px) for (let i = 0; i < px; i++) { d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = src[i]; d.data[i * 4 + 3] = 255 }
  else {
    // 1 bit a pixel, rows padded to a byte
    const row = (img.width + 7) >> 3
    for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) { const v = (src[y * row + (x >> 3)] >> (7 - (x & 7))) & 1 ? 255 : 0; const i = (y * img.width + x) * 4; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255 }
  }
  ctx.putImageData(d, 0, 0)
  return c
}
const objOf = (page, name) => new Promise((res) => {
  const store = name.startsWith('g_') ? page.commonObjs : page.objs
  const t = setTimeout(() => res(null), 4000)
  try { store.get(name, (o) => { clearTimeout(t); res(o) }) } catch { clearTimeout(t); res(null) }
})
const toBlob = (c) => new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9))

export async function importPdfShow({ file, projectId, pcloud, onStep }) {
  const pdfjs = await pdfjsLib()
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const n = Math.min(pdf.numPages, MAX_PAGES)
  const id = uid()
  const pages = []
  const seen = new Map() // picture name -> pages it is on
  for (let i = 1; i <= n; i++) {
    onStep?.(`Reading page ${i} of ${n}…`)
    const page = await pdf.getPage(i)
    const { title, body } = textOf((await page.getTextContent()).items)
    const ops = await page.getOperatorList()
    const names = []
    const inline = []
    ops.fnArray.forEach((fn, k) => {
      if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintImageXObjectRepeat) names.push(ops.argsArray[k][0])
      else if (fn === pdfjs.OPS.paintInlineImageXObject) inline.push(ops.argsArray[k][0])
    })
    const uniq = [...new Set(names)]
    uniq.forEach((nm) => seen.set(nm, (seen.get(nm) || 0) + 1))
    pages.push({ page, title, body, names: uniq, inline })
  }
  const slides = []
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i]
    onStep?.(`Pictures of page ${i + 1} of ${pages.length}…`)
    const canvases = []
    for (const nm of pg.names) {
      if (n > 3 && seen.get(nm) > n * 0.5) continue // on most pages: a logo or a background
      const c = canvasOf(await objOf(pg.page, nm))
      if (c && Math.min(c.width, c.height) >= MIN_SIDE) canvases.push(c)
      if (canvases.length >= MAX_PICS) break
    }
    for (const im of pg.inline) { if (canvases.length >= MAX_PICS) break; const c = canvasOf(im); if (c && Math.min(c.width, c.height) >= MIN_SIDE) canvases.push(c) }
    if (!canvases.length && !pg.title && !pg.body) {
      // drawn only with shapes: the page itself, as a picture
      const vp = pg.page.getViewport({ scale: 1600 / Math.max(pg.page.view[2], pg.page.view[3]) })
      const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height)
      await pg.page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise
      canvases.push(c)
    }
    const photos = []
    for (const c of canvases) {
      const blob = await toBlob(c)
      if (!blob) continue
      const cp = await compress(blob)
      const pid = uid()
      const up = await uploadPhoto({ projectId, ownerId: id, id: pid, blob: cp.blob, pcloud })
      photos.push({ id: pid, path: up.path, inline: up.inline, ...(up.fileid ? { fileid: up.fileid, scope: up.scope } : {}), thumb: cp.thumb, w: cp.w, h: cp.h })
    }
    if (pg.title || pg.body || photos.length) slides.push({ id: uid(), title: pg.title, body: pg.body, photos })
  }
  if (!slides.length) throw new Error('Nothing could be read from this PDF.')
  return { id, name: (file.name || 'Presentation').replace(/\.pdf$/i, '').slice(0, 120), at: new Date().toISOString(), pages: pdf.numPages, slides }
}
