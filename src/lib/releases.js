/*
 * Release forms signed on the screen: a talent release (cast, extras, anyone filmed) and a
 * location release (the owner lets the crew film on the property). The form is filled in the app,
 * the person reads it and signs with a finger, and the signed page becomes an A4 PDF drawn on a
 * canvas and wrapped by the same hand-written PDF container the estimate and the invoice use, so
 * Greek renders from the browser's own fonts and nothing has to be fetched.
 *
 * The standard texts below are a sensible starting point, not legal advice: they can be edited per
 * release, and "Save as the standard text" keeps an edited one in settings.releaseTemplates.
 * Words in {braces} are filled in from the form.
 */
import { buildPdf, canvasToJpegBytes } from './estimatePdf.js'

export const RELEASE_KINDS = [['talent', 'Talent release'], ['location', 'Location release']]
export const RELEASE_LANGS = [['el', 'Ελληνικά'], ['en', 'English']]

const TEMPLATES = {
  talent_el: `Ο/Η υπογράφων/ουσα παραχωρώ στην εταιρεία {producer} («ο Παραγωγός»), στους διαδόχους της και σε όσους εκείνη εξουσιοδοτήσει, το δικαίωμα να βιντεοσκοπήσει, να φωτογραφίσει και να ηχογραφήσει την εικόνα, τη φωνή, το όνομα και την ερμηνεία του προσώπου που αναφέρεται παραπάνω ({name}) στο πλαίσιο της παραγωγής «{project}» (ρόλος: {role}).

Ο Παραγωγός μπορεί να χρησιμοποιεί, να επεξεργάζεται, να μοντάρει, να αναπαράγει, να διανέμει και να προβάλλει το υλικό αυτό, ολόκληρο ή σε αποσπάσματα, σε κάθε μέσο γνωστό σήμερα ή μελλοντικό (τηλεόραση, κινηματογράφο, διαδίκτυο, μέσα κοινωνικής δικτύωσης, διαφήμιση και προώθηση της παραγωγής), σε όλο τον κόσμο και χωρίς χρονικό περιορισμό. Ο Παραγωγός δεν υποχρεούται να χρησιμοποιήσει το υλικό.

Αμοιβή: {fee}. Πέρα από αυτήν δεν οφείλεται άλλη αμοιβή ή αποζημίωση για τη χρήση του υλικού.

Δηλώνω ότι έχω το δικαίωμα να υπογράψω την παρούσα (ως ενήλικος/η ή ως νόμιμος κηδεμόνας του/της ανήλικου/ης) και ότι τη διάβασα και την κατάλαβα πριν την υπογράψω.

Συναινώ στην επεξεργασία των προσωπικών δεδομένων που αναγράφονται εδώ, αποκλειστικά για τους σκοπούς της παραγωγής, σύμφωνα με τον Κανονισμό (ΕΕ) 2016/679.`,

  talent_en: `I, the undersigned, grant {producer} ("the Producer"), its successors and anyone it authorises, the right to film, photograph and record the image, voice, name and performance of {name} in the production "{project}" (role: {role}).

The Producer may use, edit, reproduce, distribute and show this material, in whole or in part, in any media known now or devised later (television, cinema, the internet, social media, advertising and promotion of the production), throughout the world and without time limit. The Producer is not obliged to use the material.

Fee: {fee}. No other fee or compensation is due for the use of the material.

I confirm that I have the right to sign this release (as an adult, or as the legal guardian of the minor named above) and that I have read and understood it before signing.

I consent to the processing of the personal data written here, solely for the purposes of the production, under Regulation (EU) 2016/679 (GDPR).`,

  location_el: `Ο/Η υπογράφων/ουσα, ως ιδιοκτήτης/τρια ή νόμιμα εξουσιοδοτημένος/η εκπρόσωπος του χώρου «{location}» ({address}), επιτρέπω στην εταιρεία {producer} («ο Παραγωγός») και στο συνεργείο της να εισέλθουν και να χρησιμοποιήσουν τον χώρο για τα γυρίσματα της παραγωγής «{project}» στις {dates}, μαζί με τον απαραίτητο εξοπλισμό, οχήματα και προσωπικό, καθώς και για την προετοιμασία και την αποχώρηση.

Ο Παραγωγός μπορεί να βιντεοσκοπήσει και να φωτογραφίσει τον χώρο, εσωτερικά και εξωτερικά, μαζί με ονόματα, πινακίδες και χαρακτηριστικά του, και να χρησιμοποιεί το υλικό σε κάθε μέσο γνωστό σήμερα ή μελλοντικό, σε όλο τον κόσμο και χωρίς χρονικό περιορισμό. Ο Παραγωγός δεν υποχρεούται να χρησιμοποιήσει το υλικό.

Αμοιβή για τη χρήση του χώρου: {fee}.

Ο Παραγωγός θα παραδώσει τον χώρο στην κατάσταση που τον παρέλαβε, εξαιρουμένης της συνήθους φθοράς, και αναλαμβάνει την αποκατάσταση κάθε ζημιάς που θα προκαλέσει το συνεργείο του.

Δηλώνω ότι έχω το δικαίωμα να υπογράψω την παρούσα και ότι δεν απαιτείται άδεια ή συναίνεση άλλου προσώπου.`,

  location_en: `I, the undersigned, as the owner or the legally authorised representative of the property "{location}" ({address}), allow {producer} ("the Producer") and its crew to enter and use the property to film the production "{project}" on {dates}, with the equipment, vehicles and people this needs, including preparation and wrap.

The Producer may film and photograph the property, inside and outside, including its name, signs and features, and use that material in any media known now or devised later, throughout the world and without time limit. The Producer is not obliged to use the material.

Fee for the use of the property: {fee}.

The Producer will leave the property in the condition it was found, normal wear excepted, and will make good any damage its crew causes.

I confirm that I have the right to sign this release and that no other person's permission or consent is needed.`,
}

const FEE_NONE = { el: 'όπως έχει συμφωνηθεί χωριστά', en: 'as agreed separately' }
const DASH = { el: '—', en: '—' }

/* The text a new release starts from: the one saved in Settings if there is one, else the standard. */
export const releaseTemplate = (settings, kind, lang) => settings?.releaseTemplates?.[`${kind}_${lang}`] || TEMPLATES[`${kind}_${lang}`] || TEMPLATES[`${kind}_en`]
export const standardTemplate = (kind, lang) => TEMPLATES[`${kind}_${lang}`]

/* The template with the form's values in place of {producer}, {project}, {name} and the rest. */
export function fillRelease(text, r) {
  const lang = r.lang === 'en' ? 'en' : 'el'
  const fee = String(r.fee ?? '').trim()
  const values = {
    producer: r.producer, project: r.project, name: r.name, role: r.role, location: r.location,
    address: r.address, dates: r.dates, signer: r.signerName || r.name,
    fee: fee ? (/^\d+([.,]\d+)?$/.test(fee) ? `€${fee}` : fee) : FEE_NONE[lang],
  }
  return String(text || '').replace(/\{(\w+)\}/g, (m, k) => (k in values ? (String(values[k] || '').trim() || DASH[lang]) : m))
}

const L = {
  el: {
    title_talent: 'ΔΗΛΩΣΗ ΣΥΝΑΙΝΕΣΗΣ ΚΑΙ ΠΑΡΑΧΩΡΗΣΗΣ ΔΙΚΑΙΩΜΑΤΩΝ', title_location: 'ΑΔΕΙΑ ΧΡΗΣΗΣ ΧΩΡΟΥ ΓΙΑ ΓΥΡΙΣΜΑ',
    project: 'Παραγωγή', producer: 'Παραγωγός', name: 'Ονοματεπώνυμο', minor: 'Ανήλικος/η', guardian: 'Κηδεμόνας', role: 'Ρόλος',
    idNumber: 'Αρ. ταυτότητας / διαβατηρίου', address: 'Διεύθυνση', phone: 'Τηλέφωνο', email: 'Email', location: 'Χώρος',
    owner: 'Ιδιοκτήτης / εκπρόσωπος', dates: 'Ημερομηνίες', fee: 'Αμοιβή', date: 'Ημερομηνία',
    signs: 'Υπογραφή', forProducer: 'Για τον Παραγωγό', signedOn: 'Υπογράφηκε ηλεκτρονικά στην οθόνη', page: 'Σελίδα',
  },
  en: {
    title_talent: 'TALENT RELEASE', title_location: 'LOCATION RELEASE',
    project: 'Production', producer: 'Producer', name: 'Full name', minor: 'Minor', guardian: 'Guardian', role: 'Role',
    idNumber: 'ID / passport no.', address: 'Address', phone: 'Phone', email: 'Email', location: 'Property',
    owner: 'Owner / representative', dates: 'Dates', fee: 'Fee', date: 'Date',
    signs: 'Signature', forProducer: 'For the Producer', signedOn: 'Signed on screen', page: 'Page',
  },
}

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 50
const CONTENT_W = PAGE_W - MARGIN * 2
const SCALE = 2
const INK = '#16181d'
const MUTED = '#6b7078'
const LINE = '#dcdad5'
const ACCENT = '#C8503F'
const FONT = "'Sofia Sans', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"

function wrap(ctx, text, maxW) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (line && ctx.measureText(next).width > maxW) { lines.push(line); line = w } else line = next
  }
  if (line) lines.push(line)
  return lines
}

// Greek capitals carry no accents (ΠΑΡΑΓΩΓΗ, not ΠΑΡΑΓΩΓΉ)
const caps = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().normalize('NFC')

/* One line, shortened with … when it would not fit. */
function fit(ctx, text, maxW) {
  const s = String(text || '')
  if (ctx.measureText(s).width <= maxW) return s
  let lo = 0, hi = s.length
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ctx.measureText(s.slice(0, mid) + '…').width <= maxW) lo = mid; else hi = mid - 1 }
  return s.slice(0, lo) + '…'
}

function loadImage(src) {
  return new Promise((res) => {
    if (!src) return res(null)
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = () => res(null)
    img.src = src
  })
}

const stamp = (iso, lang) => new Date(iso).toLocaleString(lang === 'en' ? 'en-GB' : 'el-GR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/* Draws the signed release onto as many A4 canvases as the text needs.
   r: { kind, lang, producer, project, name, minor, guardianName, signerName, idNumber, address, phone,
        email, role, location, locationAddress, dates, fee, text (already filled), signedAt,
        signature (PNG data URL), producerSignature (PNG data URL, optional), logo (data URL, optional), id } */
export async function renderRelease(r) {
  const t = L[r.lang === 'en' ? 'en' : 'el']
  try { if (document.fonts) { await document.fonts.load(`700 15px 'Sofia Sans'`); await document.fonts.load(`400 10px 'Sofia Sans'`); await document.fonts.ready } } catch {}
  const [logo, sig, psig] = await Promise.all([loadImage(r.logo), loadImage(r.signature), loadImage(r.producerSignature)])

  const pages = []
  let ctx = null
  let y = 0
  const newPage = () => {
    const c = document.createElement('canvas')
    c.width = Math.round(PAGE_W * SCALE)
    c.height = Math.round(PAGE_H * SCALE)
    ctx = c.getContext('2d')
    ctx.scale(SCALE, SCALE)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, PAGE_W, PAGE_H)
    ctx.textBaseline = 'alphabetic'
    pages.push(c)
    y = MARGIN
  }
  const bottom = PAGE_H - MARGIN - 24
  const room = (h) => { if (y + h > bottom) newPage() }
  const rule = (yy) => { ctx.strokeStyle = LINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(MARGIN, yy); ctx.lineTo(PAGE_W - MARGIN, yy); ctx.stroke() }

  newPage()
  // ---- head: logo and producer on the left, the date on the right ----
  let headH = 0
  if (logo) {
    const h = 40
    const w = Math.min(120, logo.width ? (h * logo.width) / logo.height : h)
    ctx.drawImage(logo, MARGIN, y, w, h)
    headH = h
  }
  ctx.fillStyle = INK
  ctx.font = `700 11px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText(r.producer || '', PAGE_W - MARGIN, y + 12)
  ctx.fillStyle = MUTED
  ctx.font = `400 9.5px ${FONT}`
  ctx.fillText(stamp(r.signedAt, r.lang), PAGE_W - MARGIN, y + 26)
  ctx.textAlign = 'left'
  y += Math.max(headH, 30) + 22

  // ---- title ----
  ctx.fillStyle = ACCENT
  ctx.fillRect(MARGIN, y - 12, 4, 16)
  ctx.fillStyle = INK
  ctx.font = `700 15px ${FONT}`
  for (const ln of wrap(ctx, caps(r.kind === 'location' ? t.title_location : t.title_talent), CONTENT_W - 14)) { ctx.fillText(ln, MARGIN + 12, y); y += 20 }
  y += 8

  // ---- the parties: label / value rows in two columns ----
  const rows = r.kind === 'location'
    ? [[t.project, r.project], [t.producer, r.producer], [t.location, r.location], [t.address, r.locationAddress], [t.dates, r.dates], [t.owner, r.signerName], [t.idNumber, r.idNumber], [t.phone, r.phone], [t.email, r.email], [t.fee, r.feeText]]
    : [[t.project, r.project], [t.producer, r.producer], [t.name, r.name], [t.role, r.role], ...(r.minor ? [[t.guardian, r.guardianName]] : []), [t.idNumber, r.idNumber], [t.address, r.address], [t.phone, r.phone], [t.email, r.email], [t.fee, r.feeText]]
  const shown = rows.filter(([, v]) => String(v || '').trim())
  const colW = (CONTENT_W - 20) / 2
  rule(y)
  y += 6
  for (let i = 0; i < shown.length; i += 2) {
    const pair = shown.slice(i, i + 2)
    let rowH = 0
    const cells = pair.map(([label, value]) => {
      ctx.font = `400 10.5px ${FONT}`
      const lines = wrap(ctx, value, colW)
      return { label, lines }
    })
    rowH = Math.max(...cells.map((c) => 14 + c.lines.length * 14)) + 6
    room(rowH)
    cells.forEach((c, k) => {
      const x = MARGIN + k * (colW + 20)
      ctx.fillStyle = MUTED
      ctx.font = `600 8px ${FONT}`
      ctx.fillText(caps(c.label), x, y + 10)
      ctx.fillStyle = INK
      ctx.font = `400 10.5px ${FONT}`
      c.lines.forEach((ln, j) => ctx.fillText(ln, x, y + 24 + j * 14))
    })
    y += rowH
  }
  rule(y)
  y += 22

  // ---- the agreement ----
  ctx.fillStyle = INK
  ctx.font = `400 10.5px ${FONT}`
  for (const para of String(r.text || '').split(/\n\s*\n/)) {
    const lines = para.split('\n').flatMap((ln) => wrap(ctx, ln, CONTENT_W))
    for (const ln of lines) {
      room(15)
      ctx.fillStyle = INK
      ctx.font = `400 10.5px ${FONT}`
      ctx.fillText(ln, MARGIN, y)
      y += 15
    }
    y += 7
  }

  // ---- signatures, side by side, kept together on one page ----
  y += 10
  room(140)
  const boxW = (CONTENT_W - 30) / 2
  const drawSig = (img, x, caption, name, sub) => {
    if (img) {
      const k = Math.min(boxW / img.width, 70 / img.height)
      ctx.drawImage(img, x, y + 70 - img.height * k, img.width * k, img.height * k)
    }
    ctx.strokeStyle = INK
    ctx.lineWidth = 0.8
    ctx.beginPath(); ctx.moveTo(x, y + 76); ctx.lineTo(x + boxW, y + 76); ctx.stroke()
    ctx.fillStyle = MUTED
    ctx.font = `600 8px ${FONT}`
    ctx.fillText(caps(caption), x, y + 90)
    ctx.fillStyle = INK
    ctx.font = `400 10.5px ${FONT}`
    ctx.fillText(fit(ctx, name, boxW), x, y + 104)
    if (sub) {
      ctx.fillStyle = MUTED
      ctx.font = `400 9px ${FONT}`
      ctx.fillText(fit(ctx, sub, boxW), x, y + 117)
    }
  }
  const signerCaption = r.kind === 'talent' && r.minor ? `${t.signs} · ${t.guardian}` : t.signs
  drawSig(sig, MARGIN, signerCaption, r.signerName || r.name, r.kind === 'talent' && r.minor ? r.name : '')
  drawSig(psig, MARGIN + boxW + 30, t.forProducer, r.producerSigner || r.producer, r.producerSigner ? r.producer : '')
  y += 124

  // ---- foot on every page: when it was signed and the page number ----
  pages.forEach((c, i) => {
    const g = c.getContext('2d')
    g.fillStyle = MUTED
    g.font = `400 8px ${FONT}`
    g.textAlign = 'left'
    g.fillText(`${t.signedOn} · ${stamp(r.signedAt, r.lang)} · ${r.id || ''}`, MARGIN, PAGE_H - MARGIN + 14)
    g.textAlign = 'right'
    g.fillText(`${t.page} ${i + 1}/${pages.length}`, PAGE_W - MARGIN, PAGE_H - MARGIN + 14)
    g.textAlign = 'left'
  })
  return pages
}

export async function releasePdf(r) {
  const pages = await renderRelease(r)
  const imgs = []
  for (const c of pages) imgs.push({ bytes: await canvasToJpegBytes(c, 0.9), width: c.width, height: c.height })
  return new Blob([buildPdf(imgs)], { type: 'application/pdf' })
}

/* "Release - Maria Papadopoulou - Project.pdf", safe for pCloud and the storage bucket. */
export function releaseFilename(r) {
  const who = r.kind === 'location' ? r.location || r.signerName : r.name
  const clean = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()
  return `${r.kind === 'location' ? 'Location release' : 'Release'} - ${clean(who) || 'Unnamed'} - ${clean(r.project).slice(0, 40)} - ${String(r.signedAt || '').slice(0, 10)}.pdf`
}
