import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Modal, useToast } from './ui.jsx'
import { copyEmail, sendEmail } from '../lib/deliveryEmail.js'

/* An email made in the hub (Alex, 28 Oct): what the client will see, then Copy email (paste it into a new email in
   Gmail, Apple Mail or Outlook), Copy link, or Send: the hub sends it itself, so it arrives exactly as it looks.
   With `fields` every part of it is edited beside the preview (the invoice's: subject, greeting, button, amount,
   bank account, closing); build(values) makes { subject, html, text }. */
export default function EmailWindow({ build, start = {}, base, onKeep, fields = [], link = '', to: toStart = '', cc: ccStart = '', ccHint = 'optional', title = 'Email', onClose, onSent }) {
  const toast = useToast()
  const [v, setV] = useState(start)
  const mail = useMemo(() => build(v), [build, v])
  // what is changed in the fields is kept for the next email, a moment after the typing stops (onKeep)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (!onKeep) return
    const t = setTimeout(() => onKeep(v), 600)
    return () => clearTimeout(t)
  }, [v])
  // sent by the hub itself (Alex, 28 Oct: "like the newsletters I get"), so it arrives exactly as it looks here
  const [to, setTo] = useState(toStart)
  // Cc as one field per address (Alex, 24 Nov: the accountant, Anastasia and an empty one for the managers); + adds one
  const [ccs, setCcs] = useState(() => { const l = (Array.isArray(ccStart) ? ccStart : String(ccStart || '').split(',')).map((x) => String(x || '').trim()); return l.length ? l : [''] })
  const cc = ccs.map((x) => x.trim()).filter(Boolean).join(', ')
  const setCcAt = (i, val) => setCcs((l) => l.map((x, j) => (j === i ? val : x)))
  // the form's width, dragged by the line between it and the preview (Alex, 24 Nov), kept on this device
  const [formW, setFormW] = useState(() => { try { return Number(localStorage.getItem('tml-mail-formw')) || 380 } catch { return 380 } })
  const drag = (e) => {
    e.preventDefault()
    const x0 = e.clientX, w0 = formW
    let w = w0
    const move = (ev) => { w = Math.max(280, Math.min(760, w0 + ev.clientX - x0)); setFormW(w) }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); try { localStorage.setItem('tml-mail-formw', String(Math.round(w))) } catch { /* private window */ } }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const [copyMe, setCopyMe] = useState(true)
  const [sending, setSending] = useState(false)
  const send = async () => {
    if (!to.trim()) { toast('Write who it goes to.', 'error'); return }
    setSending(true)
    try { await sendEmail({ to, cc, copyMe, mail }); toast(`Sent to ${to.trim()}`, 'ok'); onSent?.(); onClose() } catch (e) { toast(e.message, 'error') }
    setSending(false)
  }
  const copyIt = async () => {
    try { await copyEmail(mail); toast('Email copied. Paste it into a new email.', 'ok') } catch { toast('Could not copy. Use Download .html.', 'error') }
  }
  const copyLink = () => navigator.clipboard.writeText(link).then(() => toast('Link copied', 'ok')).catch(() => toast('Could not copy', 'error'))
  /* gathered (Alex, 25 Nov: "no titles over the fields, no gaps, no scrolling to see them all"): each field one slim
     line with its name small inside at the left; a text box keeps its name over its first line */
  const line = (key, k, input, cls = '') => <label key={key} className={`mf${cls ? ` ${cls}` : ''}`}><span className="mf-k">{k}</span>{input}</label>
  const field = (f) => line(f.k, f.label, f.rows
    ? <textarea className="mf-in" rows={Math.min(f.rows, 4)} value={v[f.k] ?? ''} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} />
    : <input className="mf-in" value={v[f.k] ?? ''} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} />, `${f.half ? 'mf-half' : ''}${f.rows ? ' mf-area' : ''}`)
  return (
    <Modal open wide title={title} onClose={onClose} className="mail-win" footer={
      <>
        {link && <Button variant="ghost" onClick={copyLink}>Copy link</Button>}
        <Button variant="ghost" onClick={copyIt}>Copy email</Button>
        <span className="grow" />
        <Button variant="primary" onClick={send} disabled={sending}>{sending ? 'Sending…' : 'Send'}</Button>
      </>
    }>
      <div className="deliv-email with-form" style={{ '--mail-form-w': `${formW}px` }}>
        <div className={fields.length ? 'mail-form' : 'mail-form mail-form-to'}>
          {line('to', 'To', <input className="mf-in" type="email" multiple value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@company.com" autoComplete="email" />)}
          <div className="mf mf-cc"><span className="mf-k">Cc</span>
            <div className="mail-ccs">
              {ccs.map((x, i) => <input key={i} className="mf-in" type="email" value={x} onChange={(e) => setCcAt(i, e.target.value)} placeholder={i === ccs.length - 1 && !x ? ccHint : 'email'} autoComplete="off" />)}
              <button type="button" className="mail-ccadd" onClick={() => setCcs((l) => [...l, ''])} aria-label="Add another Cc" title="Add another Cc">+</button>
            </div>
          </div>
          <label className="mail-copyme"><input type="checkbox" checked={copyMe} onChange={(e) => setCopyMe(e.target.checked)} /> Send me a copy</label>
          {fields.length > 0 && (<>
            {fields.filter((f) => !f.group).map(field)}
            <Button variant="ghost" size="sm" className="mf-reset" onClick={() => setV(base || start)}>Back to the original text</Button>
          </>)}
        </div>
        <div className="mail-split" onPointerDown={drag} role="separator" aria-orientation="vertical" aria-label="Drag to make the fields wider or narrower" title="Drag" />
        <div className="mail-preview">
          <p className="muted small mail-subj">Subject: <b>{mail.subject}</b></p>
          <iframe className="deliv-email-frame" title="The email" srcDoc={mail.html} sandbox="allow-popups allow-popups-to-escape-sandbox" />
        </div>
      </div>
    </Modal>
  )
}
