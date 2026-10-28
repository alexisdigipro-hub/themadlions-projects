import { useMemo, useState } from 'react'
import { Button, Field, Modal, Textarea, useToast } from './ui.jsx'
import { copyEmail } from '../lib/deliveryEmail.js'

/* An email made in the hub (Alex, 28 Oct): what the client will see, then Copy email (paste it into a new email in
   Gmail, Apple Mail or Outlook, it keeps its look), Download .html, or Open in Mail with the plain text.
   build(message) makes { subject, html, text }; with `message` the window lets the text be changed first. */
export default function EmailWindow({ build, message: start, fileName = 'Email', onClose }) {
  const toast = useToast()
  const [message, setMessage] = useState(start)
  const mail = useMemo(() => build(message), [build, message])
  const copyIt = async () => {
    try { await copyEmail(mail); toast('Email copied. Paste it into a new email.', 'ok') } catch { toast('Could not copy. Use Download .html.', 'error') }
  }
  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([mail.html], { type: 'text/html' }))
    a.download = `${fileName.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Email'}.html`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  return (
    <Modal open wide title="Email" onClose={onClose} footer={
      <>
        <a className="btn btn-ghost btn-md" href={`mailto:?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.text)}`}>Open in Mail</a>
        <Button variant="ghost" onClick={download}>Download .html</Button>
        <span className="grow" />
        <Button variant="primary" onClick={copyIt}>Copy email</Button>
      </>
    }>
      <div className="deliv-email">
        <p className="muted small">Copy email, then paste it into a new email in Gmail, Apple Mail or Outlook: it keeps this look. Subject: <b>{mail.subject}</b></p>
        {start !== undefined && <Field label="Message"><Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>}
        <iframe className="deliv-email-frame" title="The email" srcDoc={mail.html} sandbox="allow-popups allow-popups-to-escape-sandbox" />
      </div>
    </Modal>
  )
}
