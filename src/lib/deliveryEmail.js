// A delivery as an email (Alex, 28 Oct): the same page the link opens, made of the things every mail program
// draws (tables, inline styles, pictures from the web), so it can be pasted into Gmail or Apple Mail, or saved as
// an .html file. The delivery page's look: black, the wordmark, the stage, the title, the client, the message, a big
// red Download Files, the files, the fine print. The button goes to the delivery page, which downloads in one tap,
// counts the opening and carries the thumbnails and the reply.

const HUB = 'https://hub.themadlions.com/'
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const lines = (s) => esc(s).replace(/\r?\n/g, '<br>')
// capitals the Greek way, without accents (text-transform would write ΠΑΡΑΣΤΑΤΙΚΌ)
const caps = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().normalize('NFC')
const web = (u) => (/^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '')
const sizeOf = (n) => (n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n > 0 ? `${Math.max(1, Math.round(n / 1e6))} MB` : '')

const C = { bg: '#0b0b0c', card: '#151517', line: '#2a2a2e', text: '#f2f0ec', muted: '#9a9893', accent: '#d40000' }
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

const btnOf = (href, label, big = true) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr><td bgcolor="${C.accent}" style="border-radius:999px;background:${C.accent};"><a href="${esc(href)}" target="_blank" style="display:inline-block;padding:${big ? '16px 40px' : '11px 26px'};font-family:${FONT};font-size:${big ? 16 : 14}px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(label)}</a></td></tr></table>`

/* the frame every email shares: black, 600 wide, the wordmark on top, the company and the site at the foot */
function wrap(subject, rows, company) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background:${C.bg};">
<tr><td align="center" style="padding:28px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding:6px 0 26px;"><img src="${HUB}site/wordmark.png" width="220" alt="${esc(company)}" style="display:block;width:220px;max-width:60%;height:auto;border:0;color:${C.text};font-family:${FONT};font-size:20px;font-weight:700;"></td></tr>
${rows}<tr><td align="center" style="font-family:${FONT};color:${C.muted};font-size:11px;letter-spacing:1px;padding:34px 0 6px;">${esc(company)} · <a href="https://themadlions.com/" target="_blank" style="color:${C.muted};text-decoration:none;">themadlions.com</a></td></tr>
</table>
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

  const html = wrap(subject, `${cover ? `<tr><td style="padding:0 0 26px;"><a href="${esc(pageUrl)}" target="_blank"><img src="${esc(cover)}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:16px;"></a></td></tr>` : ''}
<tr><td align="center" style="font-family:${FONT};color:${C.accent};font-size:12px;font-weight:700;letter-spacing:2px;padding:0 0 10px;">${esc(caps(stage))}</td></tr>
<tr><td align="center" style="font-family:${FONT};color:${C.text};font-size:30px;line-height:1.15;font-weight:300;padding:0 10px 8px;">${esc(title)}</td></tr>
${d.client ? `<tr><td align="center" style="font-family:${FONT};color:${C.muted};font-size:13px;letter-spacing:1.5px;padding:0 0 6px;">${esc(caps(d.client))}</td></tr>` : ''}
${d.recipient?.name ? `<tr><td align="center" style="font-family:${FONT};color:${C.muted};font-size:14px;padding:0 0 6px;">For ${esc(d.recipient.name)}</td></tr>` : ''}
${d.message ? `<tr><td align="center" style="font-family:${FONT};color:${C.text};font-size:15px;line-height:1.6;padding:18px 18px 0;">${lines(d.message)}</td></tr>` : ''}
<tr><td align="center" style="padding:30px 0 10px;">${btn(pageUrl, files.length > 1 ? `Download all ${files.length} files` : stageAction(d.stage))}</td></tr>
${meta.length ? `<tr><td align="center" style="font-family:${FONT};color:${C.muted};font-size:13px;padding:8px 0 0;">${meta.join(' &nbsp;·&nbsp; ')}</td></tr>` : ''}
${files.length > 1 ? `<tr><td style="padding:24px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${files.map((f) => `<tr><td style="padding:0 0 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-radius:14px;"><tr><td style="padding:14px 16px;font-family:${FONT};color:${C.text};font-size:14px;">${esc(f.name)}${sizeOf(f.size) ? `<br><span style="color:${C.muted};font-size:12px;">${sizeOf(f.size)}</span>` : ''}</td><td align="right" style="padding:14px 16px;"><a href="${esc(web(f.url) || pageUrl)}" target="_blank" style="font-family:${FONT};font-size:13px;font-weight:700;color:${C.text};text-decoration:none;border:1px solid ${C.line};border-radius:999px;padding:8px 16px;display:inline-block;">Download</a></td></tr></table></td></tr>`).join('')}</table></td></tr>` : ''}
<tr><td align="center" style="padding:22px 0 0;font-family:${FONT};font-size:13px;"><a href="${esc(pageUrl)}" target="_blank" style="color:${C.muted};text-decoration:underline;">Open the delivery page</a></td></tr>
${d.fine ? `<tr><td style="font-family:${FONT};color:${C.muted};font-size:11px;line-height:1.55;padding:30px 8px 0;">${lines(d.fine)}</td></tr>` : ''}
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
  const tile = (inner) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-radius:16px;"><tr><td style="padding:18px 20px;">${inner}</td></tr></table>`
  const html = wrap(subject, `<tr><td align="center" style="font-family:${FONT};color:${C.accent};font-size:12px;font-weight:700;letter-spacing:2px;padding:0 0 10px;">${esc(caps(v.kicker))}</td></tr>
${project ? `<tr><td align="center" style="font-family:${FONT};color:${C.text};font-size:30px;line-height:1.15;font-weight:300;padding:0 10px 8px;">${esc(project)}</td></tr>` : ''}
${v.client ? `<tr><td align="center" style="font-family:${FONT};color:${C.muted};font-size:13px;letter-spacing:1.5px;padding:0 0 6px;">${esc(caps(v.client))}</td></tr>` : ''}
${msg ? `<tr><td style="font-family:${FONT};color:${C.text};font-size:15px;line-height:1.6;padding:20px 8px 0;">${lines(msg)}</td></tr>` : ''}
<tr><td align="center" style="padding:28px 0 6px;">${btnOf(pageUrl, v.button || 'Δείτε το παραστατικό ➤')}</td></tr>
${facts.length ? `<tr><td style="padding:24px 0 0;">${tile(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${facts.map(([k, v]) => `<td valign="top" style="font-family:${FONT};padding:0 6px;"><div style="color:${C.muted};font-size:11px;letter-spacing:1.5px;">${esc(caps(k))}</div><div style="color:${C.text};font-size:17px;font-weight:700;padding-top:4px;">${esc(v)}</div></td>`).join('')}</tr></table>`)}</td></tr>` : ''}
${bank.length ? `<tr><td style="padding:10px 0 0;">${tile(`<div style="font-family:${FONT};color:${C.accent};font-size:11px;font-weight:700;letter-spacing:2px;padding:0 0 10px;">ΣΤΟΙΧΕΙΑ ΤΡΑΠΕΖΙΚΟΥ ΛΟΓΑΡΙΑΣΜΟΥ</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${bank.map(([k, v]) => `<tr><td valign="top" style="font-family:${FONT};color:${C.muted};font-size:12px;letter-spacing:1px;padding:5px 10px 5px 0;white-space:nowrap;">${esc(k)}</td><td style="font-family:${FONT};color:${C.text};font-size:14px;font-weight:600;padding:5px 0;">${esc(v)}</td></tr>`).join('')}</table>`)}</td></tr>` : ''}
${closing ? `<tr><td style="font-family:${FONT};color:${C.text};font-size:15px;line-height:1.6;padding:24px 8px 0;">${lines(closing)}</td></tr>` : ''}
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
