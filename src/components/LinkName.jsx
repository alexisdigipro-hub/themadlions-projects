import { useState } from 'react'
import { Button } from './ui.jsx'
import { cleanSlug, renameShare, tokenOf } from '../lib/shares.js'

// The 12 random characters the app gives a link when nobody has named it.
const isRandom = (t) => /^[A-Za-z0-9]{12}$/.test(t) && /[A-Z]/.test(t)

/* "Link name" under a freshly published link: type a name, the address ends in it instead of the
   random characters. The same name stays on every later share of the same day or list. */
export default function LinkName({ workspaceId, shareRef, url, suggestion, makeUrl, onRenamed, hasCode }) {
  const current = tokenOf(url)
  const [name, setName] = useState(isRandom(current) ? cleanSlug(suggestion) : current)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const next = cleanSlug(name)
  const save = async () => {
    setBusy(true); setErr('')
    try {
      const t = await renameShare({ workspaceId, ref: shareRef, name })
      onRenamed(makeUrl(t))
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="link-name">
      <label className="field-label" htmlFor="link-name">Link name</label>
      <div className="share-link">
        <input id="link-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="sampanis-day-1" onKeyDown={(e) => e.key === 'Enter' && next !== current && save()} />
        <Button onClick={save} disabled={busy || next.length < 3 || next === current}>{busy ? 'Saving…' : 'Use this name'}</Button>
      </div>
      <p className="fineprint">
        {next && next !== current ? <>The link will end in <b>/{next}</b>. </> : null}
        Letters, numbers and dashes; Greek is written in Latin letters. Renaming changes the address, so a link you already sent with the old ending stops opening.
        {!hasCode && ' A name is easier to guess than random letters: for links with phone numbers, an access code (Settings > Call sheets) keeps them private.'}
      </p>
      {err && <p className="error small">{err}</p>}
    </div>
  )
}
