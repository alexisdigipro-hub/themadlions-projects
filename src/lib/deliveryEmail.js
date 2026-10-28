// A delivery or an invoice as an email (Alex, 28 Oct), made of the things every mail program draws (tables, inline
// styles, pictures from the web), sent by the hub or pasted: the wordmark, the stage, the title, the client, the
// message, a big Download Files, the files, the fine print, all centred, in the hub's look. The button goes to the delivery page, which downloads in one tap,
// counts the opening and carries the thumbnails and the reply.

const HUB = 'https://hub.themadlions.com/'
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const lines = (s) => esc(s).replace(/\r?\n/g, '<br>')
// capitals the Greek way, without accents (text-transform would write ΠΑΡΑΣΤΑΤΙΚΌ)
const caps = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().normalize('NFC')
const web = (u) => (/^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '')
const sizeOf = (n) => (n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n > 0 ? `${Math.max(1, Math.round(n / 1e6))} MB` : '')

/* The hub's look (Alex, 28 Oct: "the colours and the feel of the hub as it is now", everything centred): graphite with
   a warm glow, one glassy card, soft rounded tiles, the coral accent as a pill. Gradients where the mail program draws
   them (Apple Mail, iOS, Outlook.com), the plain colour under them everywhere else. */
const C = { bg: '#1c1e22', card: '#2a2d33', tile: '#33363d', line: '#40444c', text: '#f4f4f5', muted: '#a3a8b0', accent: '#ffffff' } // white where coral was (Alex, 28 Oct)
const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Helvetica, Arial, sans-serif"
const BG = `background-color:${C.bg};background-image:radial-gradient(120% 60% at 50% 110%, rgba(255,255,255,.07), rgba(255,255,255,0) 60%),linear-gradient(180deg,#2b2e34 0%,#1c1e22 55%,#16171a 100%);`
const CARD = `background-color:${C.card};background-image:linear-gradient(160deg,#363a41 0%,#2a2d33 45%,#212328 100%);border:1px solid ${C.line};border-radius:28px;box-shadow:inset 0 1px 0 rgba(255,255,255,.10),0 24px 60px rgba(0,0,0,.35);`
const TILE = `background-color:${C.tile};background-image:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid ${C.line};border-radius:18px;box-shadow:inset 0 1px 0 rgba(255,255,255,.08);`
const td = (style, inner) => `<tr><td align="center" style="font-family:${FONT};text-align:center;${style}">${inner}</td></tr>`

const btnOf = (href, label, big = true) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr><td align="center" bgcolor="#ffffff" style="border-radius:999px;background-color:#ffffff;background-image:linear-gradient(180deg,#ffffff 0%,#eceef1 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 10px 26px rgba(255,255,255,.16);"><a href="${esc(href)}" target="_blank" style="display:inline-block;padding:${big ? '16px 40px' : '10px 24px'};font-family:${FONT};font-size:${big ? 16 : 13}px;font-weight:700;color:#17181c;text-decoration:none;border-radius:999px;">${esc(label)}</a></td></tr></table>`
const glassBtn = (href, label) => `<a href="${esc(href)}" target="_blank" style="display:inline-block;font-family:${FONT};font-size:13px;font-weight:700;color:${C.text};text-decoration:none;background-color:#3a3e45;border:1px solid #4a4f57;border-radius:999px;padding:9px 20px;">${esc(label)}</a>`
const tileOf = (inner, pad = '18px 20px') => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.tile}" style="${TILE}"><tr><td align="center" style="padding:${pad};text-align:center;">${inner}</td></tr></table>`

/* the frame every email shares: graphite, one glass card 600 wide, the wordmark on top, the company at the foot */
function wrap(subject, rows, company) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background-color:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="${BG}">
<tr><td align="center" style="padding:64px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card}" style="max-width:600px;width:100%;${CARD}">
<tr><td align="center" style="padding:34px 26px 30px;text-align:center;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:0 0 28px;"><img src="${HUB}site/wordmark-white.png" width="210" alt="${esc(company)}" style="display:block;margin:0 auto;width:210px;max-width:62%;height:auto;border:0;color:${C.text};font-family:${FONT};font-size:20px;font-weight:700;"></td></tr>
${rows}
</table>
</td></tr>
</table>
<p style="margin:44px 0 0;font-family:${FONT};font-size:11px;letter-spacing:1.5px;color:${C.muted};text-align:center;">${esc(caps(company))} · <a href="https://themadlions.com/" target="_blank" style="color:${C.muted};text-decoration:none;">themadlions.com</a></p>
</td></tr>
</table>
</body></html>`
}

// stageLabel and stageAction come from the Share page (passed in, so Finance does not load that whole page)
export function deliveryEmail(d, pageUrl, company = 'THEMADLIONS', { stageLabel = (k) => k, stageAction = () => 'Download Files' } = {}) {
  const title = d.title || 'Delivery'
  const stage = `${stageLabel(d.stage)}${d.version ? ` · ${d.version}` : ''}`
  const cover = web(d.thumbs?.find((t) => web(t.url))?.url || d.project?.cover)
  const files = (d.files || []).filter((f) => f.name)
  const subject = `${title}${d.version ? ` · ${d.version}` : ''} | ${stageLabel(d.stage)}`
  const btn = btnOf
  const meta = [d.linkLabel, d.password ? `Password <b style="color:${C.text};">${esc(d.password)}</b>` : ''].filter(Boolean)

  const html = wrap(subject, `${cover ? `<tr><td align="center" style="padding:0 0 26px;"><a href="${esc(pageUrl)}" target="_blank"><img src="${esc(cover)}" width="548" alt="" style="display:block;margin:0 auto;width:100%;max-width:548px;height:auto;border:0;border-radius:18px;"></a></td></tr>` : ''}
${td(`color:${C.accent};font-size:12px;font-weight:700;letter-spacing:2px;padding:0 0 10px;`, esc(caps(stage)))}
${td(`color:${C.text};font-size:30px;line-height:1.15;font-weight:700;letter-spacing:-.4px;padding:0 6px 8px;`, esc(title))}
${d.client ? td(`color:${C.muted};font-size:13px;letter-spacing:1.5px;padding:0 0 6px;`, esc(caps(d.client))) : ''}
${d.recipient?.name ? td(`color:${C.muted};font-size:14px;padding:0 0 6px;`, `For ${esc(d.recipient.name)}`) : ''}
${d.message ? td(`color:${C.text};font-size:15px;line-height:1.65;padding:18px 6px 0;`, lines(d.message)) : ''}
<tr><td align="center" style="padding:30px 0 10px;">${btnOf(pageUrl, files.length > 1 ? `Download all ${files.length} files` : stageAction(d.stage))}</td></tr>
${meta.length ? td(`color:${C.muted};font-size:13px;padding:8px 0 0;`, meta.join(' &nbsp;·&nbsp; ')) : ''}
${files.length > 1 ? files.map((f) => `<tr><td style="padding:10px 0 0;">${tileOf(`<div style="font-family:${FONT};color:${C.text};font-size:14px;font-weight:600;word-break:break-all;">${esc(f.name)}</div>${sizeOf(f.size) ? `<div style="font-family:${FONT};color:${C.muted};font-size:12px;padding-top:3px;">${sizeOf(f.size)}</div>` : ''}<div style="padding-top:12px;">${glassBtn(web(f.url) || pageUrl, 'Download')}</div>`, '16px 18px')}</td></tr>`).join('') : ''}
${td('padding:24px 0 0;font-size:13px;', `<a href="${esc(pageUrl)}" target="_blank" style="color:${C.muted};text-decoration:underline;">Open the delivery page</a>`)}
${d.fine ? td(`color:${C.muted};font-size:11px;line-height:1.6;padding:28px 4px 0;`, lines(d.fine)) : ''}
`, company)

  const text = [stage, title, d.client, '', d.message, '', `${files.length > 1 ? `Download all ${files.length} files` : stageAction(d.stage)}: ${pageUrl}`, d.password ? `Password: ${d.password}` : '', '', d.fine, '', company].filter((x, i, a) => x !== undefined && !(x === '' && a[i - 1] === '')).join('\n').trim()
  return { subject, html, text }
}

/* An invoice as an email (Alex, 28 Oct, the text he has been sending): his greeting (editable in the window), the
   project, a red button to the invoice's page (preview and Download PDF), the amount and due date, the bank account,
   his closing line. */
export const INVOICE_MESSAGE = (project) => `Καλησπέρα σας,\n\nστο παρακάτω link μπορείτε να δείτε και να αποθηκεύσετε το παραστατικό που αφορά το project${project ? `: ${project}` : '.'}`
export const INVOICE_CLOSING = 'Είμαστε στη διάθεσή σας για οτιδήποτε χρειαστείτε!'
/* Everything the invoice email says, as the window's fields start (all editable, Alex 28 Oct) */
export function invoiceEmailStart(inv, total = '') {
  const co = inv.company || {}
  const project = inv.projectTitle || ''
  const fmt = (d) => { const x = new Date(`${d}T12:00:00`); return isNaN(x) ? d : x.toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' }) }
  return {
    subject: `Παραστατικό #${inv.number || ''}${project ? ` | ${project}` : ''}`,
    kicker: 'Παραστατικό',
    title: project,
    client: inv.recipient?.name || '',
    message: INVOICE_MESSAGE(project),
    button: 'Δείτε το παραστατικό ➤',
    number: inv.number ? `#${inv.number}` : '',
    amount: total,
    due: inv.dueDate ? fmt(inv.dueDate) : '',
    accountName: co.providerName || '',
    bank: co.bankName || '',
    iban: co.bankIban || '',
    bic: co.bankBic || '',
    closing: INVOICE_CLOSING,
  }
}
export function invoiceEmail(inv, pageUrl, { company = 'THEMADLIONS', total = '', ...over } = {}) {
  const v = { ...invoiceEmailStart(inv, total), ...over }
  const subject = v.subject
  const project = v.title
  const bank = [['ACCOUNT NAME', v.accountName], ['BANK', v.bank], ['IBAN', v.iban], ['BIC / SWIFT', v.bic]].filter((r) => r[1])
  const facts = [['Αριθμός', v.number], ['Ποσό', v.amount], ['Λήξη', v.due]].filter((r) => r[1])
  const message = v.message
  const closing = v.closing
  const msg = message
  const html = wrap(subject, `${td(`color:${C.accent};font-size:12px;font-weight:700;letter-spacing:2px;padding:0 0 10px;`, esc(caps(v.kicker)))}
${project ? td(`color:${C.text};font-size:30px;line-height:1.15;font-weight:700;letter-spacing:-.4px;padding:0 6px 8px;`, esc(project)) : ''}
${v.client ? td(`color:${C.muted};font-size:13px;letter-spacing:1.5px;padding:0 0 6px;`, esc(caps(v.client))) : ''}
${msg ? td(`color:${C.text};font-size:15px;line-height:1.65;padding:20px 6px 0;`, lines(msg)) : ''}
<tr><td align="center" style="padding:28px 0 6px;">${btnOf(pageUrl, v.button || 'Δείτε το παραστατικό ➤')}</td></tr>
${facts.length ? `<tr><td style="padding:26px 0 0;">${tileOf(facts.map(([k, val]) => `<div style="font-family:${FONT};padding:6px 0;"><div style="color:${C.muted};font-size:11px;letter-spacing:1.5px;">${esc(caps(k))}</div><div style="color:${C.text};font-size:${k === 'Ποσό' ? 22 : 16}px;font-weight:700;padding-top:3px;">${esc(val)}</div></div>`).join(''))}</td></tr>` : ''}
${bank.length ? `<tr><td style="padding:10px 0 0;">${tileOf(`<div style="font-family:${FONT};color:${C.accent};font-size:11px;font-weight:700;letter-spacing:2px;padding:0 0 12px;">ΣΤΟΙΧΕΙΑ ΤΡΑΠΕΖΙΚΟΥ ΛΟΓΑΡΙΑΣΜΟΥ</div>${bank.map(([k, val]) => `<div style="font-family:${FONT};padding:6px 0;"><div style="color:${C.muted};font-size:11px;letter-spacing:1.5px;">${esc(k)}</div><div style="color:${C.text};font-size:15px;font-weight:600;padding-top:3px;word-break:break-all;">${esc(val)}</div></div>`).join('')}`)}</td></tr>` : ''}
${closing ? td(`color:${C.text};font-size:15px;line-height:1.65;padding:26px 6px 0;`, lines(closing)) : ''}
`, company)
  const text = [msg, '', `${(v.button || 'Δείτε το παραστατικό').replace(/\s*➤\s*$/, '')}: ${pageUrl}`, '', ...facts.map(([k, v]) => `${k}: ${v}`), facts.length ? '' : null, bank.length ? 'ΣΤΟΙΧΕΙΑ ΤΡΑΠΕΖΙΚΟΥ ΛΟΓΑΡΙΑΣΜΟΥ' : null, ...bank.map(([k, v]) => `${k}: ${v}`), '', closing, '', company].filter((x) => x !== null && x !== undefined).join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return { subject, html, text }
}

/* Puts the email on the clipboard as a formatted email (pastes as the designed email in Gmail, Apple Mail, Outlook)
   with the plain text beside it for where formatting is not taken. Only the body: a pasted <html> is cut to it anyway. */
export async function copyEmail({ html, text }) {
  const body = html.replace(/^[\s\S]*<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, '')
  if (window.ClipboardItem && navigator.clipboard?.write) {
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([body], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })])
    return
  }
  // older browsers: copy what is selected in a hidden copy of it
  const box = document.createElement('div')
  box.contentEditable = 'true'
  box.style.cssText = 'position:fixed;left:-9999px;top:0;'
  box.innerHTML = body
  document.body.appendChild(box)
  const r = document.createRange(); r.selectNodeContents(box)
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
  const ok = document.execCommand('copy')
  sel.removeAllRanges(); box.remove()
  if (!ok) throw new Error('Could not copy')
}

/* Sends it from the hub (supabase/functions/send-email, through Resend): it arrives exactly as it looks here. */
export async function sendEmail({ to, cc = '', copyMe = true, mail }) {
  const { supabase, remote } = await import('./supabase.js')
  const { SUPABASE_URL, SUPABASE_KEY } = await import('./supabaseConfig.js')
  if (!remote) throw new Error('Sending needs the online hub.')
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Sign in again.')
  let res
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, cc, copyMe, subject: mail.subject, html: mail.html, text: mail.text }),
    })
  } catch (e) { throw new Error(`Could not reach the hub's mail (${e.message}).`) }
  let out = null
  try { out = await res.json() } catch { /* not JSON */ }
  if (out?.error) throw new Error(out.error)
  if (res.status === 404) throw new Error('The send-email function is not deployed yet.')
  if (!res.ok) throw new Error(`The hub's mail answered ${res.status}.`)
  return out
}
