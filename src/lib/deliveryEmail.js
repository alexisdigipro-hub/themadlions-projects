// A delivery as an email (Alex, 28 Oct): the same page the link opens, made of the things every mail program
// draws (tables, inline styles, pictures from the web), so it can be pasted into Gmail or Apple Mail, or saved as
// an .html file. The delivery page's look: black, the wordmark, the stage, the title, the client, the message, a big
// red Download Files, the files, the fine print. The button goes to the delivery page, which downloads in one tap,
// counts the opening and carries the thumbnails and the reply.
import { stageAction, stageLabel } from '../pages/Deliveries.jsx'

const HUB = 'https://hub.themadlions.com/'
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const lines = (s) => esc(s).replace(/\r?\n/g, '<br>')
const web = (u) => (/^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '')
const sizeOf = (n) => (n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n > 0 ? `${Math.max(1, Math.round(n / 1e6))} MB` : '')

const C = { bg: '#0b0b0c', card: '#151517', line: '#2a2a2e', text: '#f2f0ec', muted: '#9a9893', accent: '#d40000' }
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

export function deliveryEmail(d, pageUrl, company = 'THEMADLIONS') {
  const title = d.title || 'Delivery'
  const stage = `${stageLabel(d.stage)}${d.version ? ` · ${d.version}` : ''}`
  const cover = web(d.thumbs?.find((t) => web(t.url))?.url || d.project?.cover)
  const files = (d.files || []).filter((f) => f.name)
  const subject = `${title}${d.version ? ` · ${d.version}` : ''} | ${stageLabel(d.stage)}`
  const btn = (href, label, big = true) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr><td bgcolor="${C.accent}" style="border-radius:999px;background:${C.accent};"><a href="${esc(href)}" target="_blank" style="display:inline-block;padding:${big ? '16px 40px' : '11px 26px'};font-family:${FONT};font-size:${big ? 16 : 14}px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(label)}</a></td></tr></table>`
  const meta = [d.linkLabel, d.password ? `Password <b style="color:${C.text};">${esc(d.password)}</b>` : ''].filter(Boolean)

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background:${C.bg};">
<tr><td align="center" style="padding:28px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding:6px 0 26px;"><img src="${HUB}site/wordmark.png" width="220" alt="${esc(company)}" style="display:block;width:220px;max-width:60%;height:auto;border:0;color:${C.text};font-family:${FONT};font-size:20px;font-weight:700;"></td></tr>
${cover ? `<tr><td style="padding:0 0 26px;"><a href="${esc(pageUrl)}" target="_blank"><img src="${esc(cover)}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:16px;"></a></td></tr>` : ''}
<tr><td align="center" style="font-family:${FONT};color:${C.accent};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:0 0 10px;">${esc(stage)}</td></tr>
<tr><td align="center" style="font-family:${FONT};color:${C.text};font-size:30px;line-height:1.15;font-weight:300;padding:0 10px 8px;">${esc(title)}</td></tr>
${d.client ? `<tr><td align="center" style="font-family:${FONT};color:${C.muted};font-size:13px;letter-spacing:1.5px;text-transform:uppercase;padding:0 0 6px;">${esc(d.client)}</td></tr>` : ''}
${d.recipient?.name ? `<tr><td align="center" style="font-family:${FONT};color:${C.muted};font-size:14px;padding:0 0 6px;">For ${esc(d.recipient.name)}</td></tr>` : ''}
${d.message ? `<tr><td align="center" style="font-family:${FONT};color:${C.text};font-size:15px;line-height:1.6;padding:18px 18px 0;">${lines(d.message)}</td></tr>` : ''}
<tr><td align="center" style="padding:30px 0 10px;">${btn(pageUrl, files.length > 1 ? `Download all ${files.length} files` : stageAction(d.stage))}</td></tr>
${meta.length ? `<tr><td align="center" style="font-family:${FONT};color:${C.muted};font-size:13px;padding:8px 0 0;">${meta.join(' &nbsp;·&nbsp; ')}</td></tr>` : ''}
${files.length > 1 ? `<tr><td style="padding:24px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${files.map((f) => `<tr><td style="padding:0 0 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-radius:14px;"><tr><td style="padding:14px 16px;font-family:${FONT};color:${C.text};font-size:14px;">${esc(f.name)}${sizeOf(f.size) ? `<br><span style="color:${C.muted};font-size:12px;">${sizeOf(f.size)}</span>` : ''}</td><td align="right" style="padding:14px 16px;"><a href="${esc(web(f.url) || pageUrl)}" target="_blank" style="font-family:${FONT};font-size:13px;font-weight:700;color:${C.text};text-decoration:none;border:1px solid ${C.line};border-radius:999px;padding:8px 16px;display:inline-block;">Download</a></td></tr></table></td></tr>`).join('')}</table></td></tr>` : ''}
<tr><td align="center" style="padding:22px 0 0;font-family:${FONT};font-size:13px;"><a href="${esc(pageUrl)}" target="_blank" style="color:${C.muted};text-decoration:underline;">Open the delivery page</a></td></tr>
${d.fine ? `<tr><td style="font-family:${FONT};color:${C.muted};font-size:11px;line-height:1.55;padding:30px 8px 0;">${lines(d.fine)}</td></tr>` : ''}
<tr><td align="center" style="font-family:${FONT};color:${C.muted};font-size:11px;letter-spacing:1px;padding:34px 0 6px;">${esc(company)} · <a href="https://themadlions.com/" target="_blank" style="color:${C.muted};text-decoration:none;">themadlions.com</a></td></tr>
</table>
</td></tr>
</table>
</body></html>`

  const text = [stage, title, d.client, '', d.message, '', `${files.length > 1 ? `Download all ${files.length} files` : stageAction(d.stage)}: ${pageUrl}`, d.password ? `Password: ${d.password}` : '', '', d.fine, '', company].filter((x, i, a) => x !== undefined && !(x === '' && a[i - 1] === '')).join('\n').trim()
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
