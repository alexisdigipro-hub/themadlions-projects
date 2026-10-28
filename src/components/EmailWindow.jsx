import { useMemo, useState } from 'react'
import { Button, Field, Input, Modal, Textarea, useToast } from './ui.jsx'
import { copyEmail, sendEmail } from '../lib/deliveryEmail.js'

/* An email made in the hub (Alex, 28 Oct): what the client will see, then Copy email (paste it into a new email in
   Gmail, Apple Mail or Outlook), Copy link, or Send: the hub sends it itself, so it arrives exactly as it looks.
   With `fields` every part of it is edited beside the preview (the invoice's: subject, greeting, button, amount,
   bank account, closing); build(values) makes { subject, html, text }. */
export default function EmailWindow({ build, start = {}, fields = [], link = '', to: toStart = '', cc: ccStart = '', title = 'Email', onClose, onSent }) {
  const toast = useToast()
  const [v, setV] = useState(start)
  const mail = useMemo(() => build(v), [build, v])
  // sent by the hub itself (Alex, 28 Oct: "like the newsletters I get"), so it arrives exactly as it looks here
  const [to, setTo] = useState(toStart)
  const [cc, setCc] = useState(ccStart)
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
  const field = (f) => (
    <Field key={f.k} label={f.label} className={f.half ? 'mail-half' : ''}>
      {f.rows ? <Textarea rows={f.rows} value={v[f.k] ?? ''} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} /> : <Input value={v[f.k] ?? ''} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} />}
    </Field>
  )
  return (
    <Modal open wide title={title} onClose={onClose} className="mail-win" footer={
      <>
        {link && <Button variant="ghost" onClick={copyLink}>Copy link</Button>}
        <Button variant="ghost" onClick={copyIt}>Copy email</Button>
        <span className="grow" />
        <Button variant="primary" onClick={send} disabled={sending}>{sending ? 'Sending…' : 'Send'}</Button>
      </>
    }>
      <div className="deliv-email with-form">
        <div className={fields.length ? 'mail-form' : 'mail-form mail-form-to'}>
            <Field label="To"><Input type="email" multiple value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@company.com" autoComplete="email" /></Field>
            <Field label="Cc" className="mail-half"><Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="optional" /></Field>
            <label className="mail-copyme"><input type="checkbox" checked={copyMe} onChange={(e) => setCopyMe(e.target.checked)} /> Send me a copy</label>
          {fields.length > 0 && (<>
            {fields.map((f) => (f.group ? <h3 key={f.group} className="mail-group">{f.group}</h3> : field(f)))}
            <Button variant="ghost" size="sm" onClick={() => setV(start)}>Back to the usual text</Button>
          </>)}
        </div>
        <div className="mail-preview">
          <p className="muted small">Send gets it to them exactly as it looks here, from the company's address; their reply comes to you. Subject: <b>{mail.subject}</b></p>
          <iframe className="deliv-email-frame" title="The email" srcDoc={mail.html} sandbox="allow-popups allow-popups-to-escape-sandbox" />
        </div>
      </div>
    </Modal>
  )
}
