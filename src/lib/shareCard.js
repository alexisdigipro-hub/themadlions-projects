// A profile's track record as a picture to post (Alex, 29 Oct: "card for share"): 1080 × 1920, an
// Instagram story's size, drawn on a canvas in the browser, no library. The photo, the level, the
// counts, the stickers and the project covers. A picture that cannot be loaded (a cover whose host
// sends no CORS header) is drawn as a circle in the project's colour instead, so the canvas is never
// tainted and toBlob always works.

const W = 1080
const H = 1920
const IG = ['#feda75', '#fa7e1e', '#d62976', '#962fbf']

const loadImg = (src) => new Promise((res) => {
  if (!src) return res(null)
  const img = new Image()
  if (!src.startsWith('data:')) img.crossOrigin = 'anonymous'
  img.onload = () => res(img)
  img.onerror = () => res(null)
  img.src = src
})

const grad = (ctx, x0, y0, x1, y1, stops = IG) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c))
  return g
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// an image cropped to a circle, or the fallback fill with initials
function circlePic(ctx, img, cx, cy, r, fill, text, font) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  if (img) {
    const s = Math.max((2 * r) / img.width, (2 * r) / img.height)
    ctx.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s)
  } else {
    ctx.fillStyle = fill
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r)
    ctx.fillStyle = 'rgba(255,255,255,.9)'
    ctx.font = `800 ${Math.round(r * 0.62)}px ${font}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, cx, cy + 2)
  }
  ctx.restore()
}

const initials = (s) => (s || '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()

function fitText(ctx, text, max) {
  if (ctx.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1)
  return `${t}…`
}

export async function drawShareCard({ person, record: r, logo }) {
  const font = (getComputedStyle(document.documentElement).getPropertyValue('--font') || 'system-ui, sans-serif').trim()
  try { await document.fonts?.ready } catch { /* the system font then */ }
  const profile = person.profile || {}
  const more = Math.max(0, r.list.length - 8) && r.list.length - 7 // past eight, the eighth circle reads +N
  const shown = r.list.slice(0, more ? 7 : 8)
  const [photo, logoImg, ...covers] = await Promise.all([loadImg(profile.photo), loadImg(logo), ...shown.map((x) => loadImg(x.cover))])

  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')

  // the backdrop: near black with an orange glow top left and a purple one bottom right
  ctx.fillStyle = '#111216'
  ctx.fillRect(0, 0, W, H)
  const glow = (x, y, rad, col) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
    g.addColorStop(0, col)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  glow(80, 120, 900, 'rgba(250,126,30,.30)')
  glow(1040, 1820, 1000, 'rgba(150,47,191,.34)')
  glow(900, 700, 600, 'rgba(214,41,118,.14)')

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // the company at the top
  let y = 130
  if (logoImg) {
    const h = 64
    const w = Math.min(320, (logoImg.width / logoImg.height) * h)
    ctx.drawImage(logoImg, W / 2 - w / 2, y - 48, w, h)
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.85)'
    ctx.font = `800 40px ${font}`
    ctx.fillText('THE MAD LIONS', W / 2, y)
  }

  // the photo in a gradient ring, the level's emoji on its edge
  const pcx = W / 2
  const pcy = 420
  ctx.beginPath()
  ctx.arc(pcx, pcy, 196, 0, Math.PI * 2)
  ctx.fillStyle = grad(ctx, pcx - 196, pcy + 196, pcx + 196, pcy - 196)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(pcx, pcy, 182, 0, Math.PI * 2)
  ctx.fillStyle = '#111216'
  ctx.fill()
  circlePic(ctx, photo, pcx, pcy, 170, '#2a2c33', initials(person.name), font)
  ctx.beginPath()
  ctx.arc(pcx + 138, pcy + 128, 54, 0, Math.PI * 2)
  ctx.fillStyle = '#23252c'
  ctx.fill()
  ctx.lineWidth = 8
  ctx.strokeStyle = '#111216'
  ctx.stroke()
  ctx.font = `56px ${font}`
  ctx.textBaseline = 'middle'
  ctx.fillText(r.emoji, pcx + 138, pcy + 132)
  ctx.textBaseline = 'alphabetic'

  // name and position
  y = 720
  ctx.fillStyle = '#fff'
  ctx.font = `800 78px ${font}`
  ctx.fillText(fitText(ctx, person.name || '', 940), W / 2, y)
  if (profile.position) {
    ctx.fillStyle = 'rgba(255,255,255,.62)'
    ctx.font = `500 40px ${font}`
    ctx.fillText(fitText(ctx, profile.position, 900), W / 2, y + 60)
  }

  // the level as a gradient pill with the XP
  y = 850
  ctx.font = `800 44px ${font}`
  const pill = `${r.emoji} ${r.level}  ·  ${r.score} XP`
  const pw = ctx.measureText(pill).width + 80
  roundRect(ctx, W / 2 - pw / 2, y, pw, 92, 46)
  ctx.fillStyle = grad(ctx, W / 2 - pw / 2, 0, W / 2 + pw / 2, 0, IG.slice(1))
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'middle'
  ctx.fillText(pill, W / 2, y + 48)
  ctx.textBaseline = 'alphabetic'

  // the counts, like a profile's posts / followers
  y = 1080
  const colW = 940 / r.stats.length
  r.stats.forEach((s, i) => {
    const x = 70 + colW * i + colW / 2
    ctx.fillStyle = '#fff'
    ctx.font = `800 84px ${font}`
    ctx.fillText(String(s.value), x, y)
    ctx.fillStyle = 'rgba(255,255,255,.58)'
    ctx.font = `600 32px ${font}`
    ctx.fillText(s.label, x, y + 50)
  })

  // the stickers, centred rows, a little tilted
  y = 1210
  ctx.font = `700 34px ${font}`
  const stickers = r.badges.slice(0, 6).map((b) => ({ t: `${b.emoji}  ${b.name}`, w: ctx.measureText(`${b.emoji}  ${b.name}`).width + 56 }))
  const rows = []
  for (const s of stickers) {
    const row = rows[rows.length - 1]
    if (row && row.w + s.w + 18 <= 960) { row.items.push(s); row.w += s.w + 18 } else rows.push({ items: [s], w: s.w })
  }
  rows.slice(0, 2).forEach((row, ri) => {
    let x = W / 2 - row.w / 2
    row.items.forEach((s, i) => {
      ctx.save()
      ctx.translate(x + s.w / 2, y + ri * 96 + 36)
      ctx.rotate(((ri + i) % 2 ? 1 : -1) * 0.03)
      roundRect(ctx, -s.w / 2, -36, s.w, 72, 36)
      ctx.fillStyle = 'rgba(255,255,255,.10)'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(255,255,255,.16)'
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.textBaseline = 'middle'
      ctx.fillText(s.t, 0, 2)
      ctx.restore()
      x += s.w + 18
    })
  })

  // the projects as story circles, four to a row
  y = rows.length > 1 ? 1430 : 1390
  const per = 4
  const cell = 230
  const slots = more ? [...shown, null] : shown
  slots.forEach((p, i) => {
    const row = Math.floor(i / per)
    const inRow = Math.min(per, slots.length - row * per)
    const cx = W / 2 - ((inRow - 1) * cell) / 2 + (i % per) * cell
    const cy = y + row * 240
    if (!p) {
      ctx.beginPath()
      ctx.arc(cx, cy, 84, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,.10)'
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = `800 52px ${font}`
      ctx.textBaseline = 'middle'
      ctx.fillText(`+${more}`, cx, cy + 2)
      return
    }
    ctx.beginPath()
    ctx.arc(cx, cy, 92, 0, Math.PI * 2)
    ctx.fillStyle = p.delivered ? 'rgba(255,255,255,.28)' : grad(ctx, cx - 92, cy + 92, cx + 92, cy - 92)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, cy, 84, 0, Math.PI * 2)
    ctx.fillStyle = '#111216'
    ctx.fill()
    circlePic(ctx, covers[i], cx, cy, 78, p.color || '#444', initials(p.title), font)
    ctx.fillStyle = 'rgba(255,255,255,.9)'
    ctx.font = `700 28px ${font}`
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(fitText(ctx, p.title, 210), cx, cy + 134)
  })
  ctx.fillStyle = 'rgba(255,255,255,.45)'
  ctx.font = `600 30px ${font}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('hub.themadlions.com', W / 2, H - 56)

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not make the picture.'))), 'image/png'))
}
