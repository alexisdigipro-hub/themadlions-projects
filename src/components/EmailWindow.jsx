import { useMemo, useState } from 'react'
import { Button, Field, Input, Modal, Textarea, useToast } from './ui.jsx'
import { copyEmail } from '../lib/deliveryEmail.js'

/* An email made in the hub (Alex, 28 Oct): what the client will see, then Copy email (paste it into a new email in
   Gmail, Apple Mail or Outlook, it keeps its look), Copy link, Download .html, or Open in Mail with the plain text.
   With `fields` every part of it is edited beside the preview (the invoice's: subject, greeting, button, amount,
   bank account, closing); build(values) makes { subject, html, text }. */
export default function EmailWindow({ build, start = {}, fields = [], link = '', fileName = 'Email', title = 'Email', onClose }) {
  const toast = useToast()
  const [v, setV] = useState(start)
  const mail = useMemo(() => build(v), [build, v])
  const copyIt = async () => {
    try { await copyEmail(mail); toast('Email copied. Paste it into a new email.', 'ok') } catch { toast('Could not copy. Use Download .html.', 'error') }
  }
  const copyLink = () => navigator.clipboard.writeText(link).then(() => toast('Link copied', 'ok')).catch(() => toast('Could not copy', 'error'))
  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([mail.html], { type: 'text/html' }))
    a.download = `${fileName.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Email'}.html`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const field = (f) => (
    <Field key={f.k} label={f.label} className={f.half ? 'mail-half' : ''}>
      {f.rows ? <Textarea rows={f.rows} value={v[f.k] ?? ''} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} /> : <Input value={v[f.k] ?? ''} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} />}
    </Field>
  )
  return (
    <Modal open wide title={title} onClose={onClose} className={fields.length ? 'mail-win' : ''} footer={
      <>
        <a className="btn btn-ghost btn-md" href={`mailto:?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.text)}`}>Open in Mail</a>
        <Button variant="ghost" onClick={download}>Download .html</Button>
        {link && <Button variant="ghost" onClick={copyLink}>Copy link</Button>}
        <span className="grow" />
        <Button variant="primary" onClick={copyIt}>Copy email</Button>
      </>
    }>
      <div className={`deliv-email${fields.length ? ' with-form' : ''}`}>
        {fields.length > 0 && (
          <div className="mail-form">
            {fields.map((f) => (f.group ? <h3 key={f.group} className="mail-group">{f.group}</h3> : field(f)))}
            <Button variant="ghost" size="sm" onClick={() => setV(start)}>Back to the usual text</Button>
          </div>
        )}
        <div className="mail-preview">
          <p className="muted small">Copy email, then paste it into a new email in Gmail, Apple Mail or Outlook: it keeps this look. Subject: <b>{mail.subject}</b></p>
          <iframe className="deliv-email-frame" title="The email" srcDoc={mail.html} sandbox="allow-popups allow-popups-to-escape-sandbox" />
        </div>
      </div>
    </Modal>
  )
}
