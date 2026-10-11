// Greek mobiles: 69X XXX XXXX -> +30. Anything already international is kept.
export function waNumber(phone) {
  let d = String(phone || '').replace(/[^\d+]/g, '')
  if (!d) return ''
  if (d.startsWith('+')) d = d.slice(1)
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length === 10 && d.startsWith('69')) d = '30' + d
  if (d.length === 10 && d.startsWith('2')) d = '30' + d
  return d
}
export const waLink = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`
export const waShareLink = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`
export const mailLink = ({ to = [], bcc = [], subject, body }) =>
  `mailto:${to.join(',')}?${bcc.length ? `bcc=${bcc.join(',')}&` : ''}subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
/* bit.ly has no way to take the link in its address, so: open it, and put the link on the clipboard
   for pasting. The tab opens first, before any await, or the browser's popup blocker eats it. */
export function shortenWithBitly(url, toast) {
  window.open('https://bitly.com/', '_blank', 'noopener')
  navigator.clipboard.writeText(url)
    .then(() => toast('Link copied. Paste it in bit.ly and pick the short name.', 'ok'))
    .catch(() => toast('Could not copy; copy the link from the box above and paste it in bit.ly.', 'error'))
}
