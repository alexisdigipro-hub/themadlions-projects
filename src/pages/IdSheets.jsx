import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Act, Button, Empty, Field, Input, Modal, Textarea, useToast } from '../components/ui.jsx'
import { DbAdd, DbBar, DbSearch } from '../components/DbTools.jsx'
import { Icon } from '../components/icons.jsx'
import { can, useCurrentUser } from '../lib/store.jsx'
import { matchText } from '../lib/library.js'
import { fmtDate } from '../lib/dates.js'
import { idApi, idLocal } from '../lib/idsheets.js'

/* Database > ID sheets (Alex, 25 Oct): "photos of people's ID sheets with their details and a date, big enough to
   read, uploaded as they are, not compressed, into pCloud, a Download button on every card, and each person a
   folder with everything I have uploaded for them". The tab opens on the folders, one soft tile a person (their
   newest picture, how many, when); a folder opens on its sheets, each a big card with the picture at full width,
   what it is, its date, a note, and Download. The picture opens at its real size on a click. Who sees this is
   the permission "ID sheets"; edit uploads, renames and deletes (supabase/id_sheets.sql). */
const kb = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`)
const day = (iso) => (iso ? fmtDate(String(iso).slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const isPicture = (s) => !!s.width || /\.(jpe?g|png|webp|gif|bmp|tiff?)$/i.test(s.name)
const ActDel = ({ label, onConfirm }) => {
  const [armed, setArmed] = useState(false)
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t) }, [armed])
  return <Act icon="trash" label={armed ? `Sure? ${label}` : label} className={`act-del${armed ? ' armed' : ''}`} onClick={() => { if (armed) { setArmed(false); onConfirm() } else setArmed(true) }} />
}

export default function IdSheets({ slot }) {
  const user = useCurrentUser()
  const toast = useToast()
  const editable = can(user, 'idsheets', 'edit')
  const [people, setPeople] = useState(null)
  const [urls, setUrls] = useState({})
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState('')
  const [adding, setAdding] = useState(null) // the new person's name
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const list = await idApi.people()
      setPeople(list)
      const covers = list.map((p) => p.cover).filter(Boolean)
      if (covers.length) setUrls({ ...(await idApi.urls(covers)) })
      setError('')
    } catch (e) { setError(e.message); setPeople([]) }
  }, [])
  useEffect(() => { load() }, [load])

  if (!can(user, 'idsheets')) return <Navigate to="/" replace />
  const person = people?.find((p) => p.id === openId)
  if (person) return <Folder person={person} editable={editable} slot={slot} toast={toast} onBack={() => { setOpenId(''); load() }} onChanged={load} />

  const list = (people || []).filter((p) => matchText(q, p.name, p.note))
  const create = async () => {
    const name = String(adding || '').trim()
    if (!name) return toast('Write the person\'s name.', 'error')
    try { const p = await idApi.addPerson(name); setAdding(null); await load(); setOpenId(p.id) } catch (e) { toast(e.message, 'error') }
  }
  return (
    <section className="panel db-card ids">
      <DbBar slot={slot}>
        <div className="toolbar-info"><strong>ID sheets</strong> <span className="muted">{people ? people.length : ''}</span></div>
        <DbSearch value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" />
        {editable && <DbAdd label="New person" onClick={() => setAdding('')} />}
      </DbBar>
      {idLocal && <p className="ids-note">Trying it out: without the online database the pictures stay in this browser only. On hub.themadlions.com they go to pCloud.</p>}
      {error && <p className="ids-note err">{error}</p>}
      {people === null ? <p className="muted ids-wait">Loading…</p> : !list.length ? (
        <Empty title={q ? 'Nobody by that name' : 'No folders yet'} action={editable && !q ? <Button variant="primary" onClick={() => setAdding('')}>New person</Button> : null}>
          {q ? 'Try another name.' : 'Make a folder for a person, then upload the photos of their ID sheets into it.'}
        </Empty>
      ) : (
        <div className="ids-folders">
          {list.map((p) => (
            <button key={p.id} type="button" className="ids-folder" onClick={() => setOpenId(p.id)}>
              <span className="ids-cover" style={p.cover && urls[p.cover] ? { backgroundImage: `url("${urls[p.cover]}")` } : null}>
                {!(p.cover && urls[p.cover]) && <span className="ids-cover-ico">{Icon.idcard?.()}</span>}
              </span>
              <span className="ids-folder-t">
                <strong>{p.name}</strong>
                <small>{p.count === 1 ? '1 sheet' : `${p.count} sheets`}{p.count ? ` · ${day(p.last)}` : ''}</small>
              </span>
            </button>
          ))}
        </div>
      )}
      <Modal open={adding !== null} title="New person" onClose={() => setAdding(null)} footer={<><Button onClick={() => setAdding(null)}>Cancel</Button><Button variant="primary" onClick={create}>Make the folder</Button></>}>
        <Field label="Name" hint="The folder in pCloud gets this name too: ID sheets / name.">
          <Input autoFocus value={adding || ''} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') create() }} placeholder="e.g. Maria Papadopoulou" />
        </Field>
      </Modal>
    </section>
  )
}

/* one person's folder: every sheet uploaded for them, newest first */
function Folder({ person, editable, slot, toast, onBack, onChanged }) {
  const [sheets, setSheets] = useState(null)
  const [urls, setUrls] = useState({})
  const [tried, setTried] = useState(false) // the pictures were asked for: one missing could not load
  const [busy, setBusy] = useState('') // "Uploading 2 of 5…"
  const [big, setBig] = useState(null) // the sheet open at its real size
  const [renaming, setRenaming] = useState(null)
  const pick = useRef(null)

  const load = useCallback(async () => {
    try {
      const list = await idApi.sheets(person.id)
      setSheets(list)
      const ids = list.filter(isPicture).map((s) => s.fileid)
      if (ids.length) setUrls(await idApi.urls(ids))
      setTried(true)
    } catch (e) { toast(e.message, 'error'); setSheets([]) }
  }, [person.id, toast])
  useEffect(() => { load() }, [load])

  const upload = async (files) => {
    const list = [...files]
    if (!list.length) return
    let done = 0
    for (const f of list) {
      setBusy(`Uploading ${done + 1} of ${list.length}: ${f.name}`)
      try { await idApi.upload(person, f); done++ } catch (e) { toast(`${f.name}: ${e.message}`, 'error') }
    }
    setBusy('')
    if (done) toast(done === 1 ? 'Uploaded' : `${done} uploaded`, 'ok')
    await load(); onChanged()
  }
  const save = async (s, patch) => {
    setSheets((l) => l.map((x) => (x.id === s.id ? { ...x, ...patch } : x)))
    try { await idApi.updateSheet(s.id, patch) } catch (e) { toast(e.message, 'error') }
  }
  const download = async (s) => {
    try {
      const url = await idApi.download(s)
      const a = document.createElement('a')
      a.href = url; a.download = s.name; a.rel = 'noopener'
      document.body.append(a); a.click(); a.remove()
    } catch (e) { toast(e.message, 'error') }
  }
  const remove = async (s) => {
    try { await idApi.removeSheet(s); setSheets((l) => l.filter((x) => x.id !== s.id)); onChanged(); toast('Deleted, from pCloud too', 'ok') } catch (e) { toast(e.message, 'error') }
  }
  const rename = async () => {
    const name = String(renaming || '').trim()
    if (!name) return
    try { await idApi.updatePerson(person.id, { name }); setRenaming(null); onChanged() } catch (e) { toast(e.message, 'error') }
  }
  const removePerson = async () => {
    try { await idApi.removePerson(person); toast(`${person.name} deleted`, 'ok'); onBack() } catch (e) { toast(e.message, 'error') }
  }

  return (
    <section className="panel db-card ids">
      <DbBar slot={slot}>
        <Act icon="back" label="All people" onClick={onBack} />
        <div className="toolbar-info"><strong>{person.name}</strong> <span className="muted">{sheets ? sheets.length : ''}</span></div>
        {editable && <Act icon="edit" label="Rename" onClick={() => setRenaming(person.name)} />}
        {editable && <Act icon="expense" label="Upload" main onClick={() => pick.current?.click()} />}
        <input ref={pick} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = '' }} />
      </DbBar>
      {busy && <p className="ids-note busy"><span className="ids-spin" />{busy}</p>}
      {sheets === null ? <p className="muted ids-wait">Loading…</p> : !sheets.length ? (
        <div className={`ids-drop${editable ? '' : ' off'}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (editable) upload(e.dataTransfer.files) }}>
          <span className="ids-cover-ico">{Icon.idcard?.()}</span>
          <strong>No sheets for {person.name} yet</strong>
          <span className="muted">{editable ? 'Upload the photos of their ID card, passport or licence, or drop them here. They go up as they are, full quality.' : 'Nothing uploaded yet.'}</span>
          {editable && <Button variant="primary" onClick={() => pick.current?.click()}>Upload photos</Button>}
        </div>
      ) : (
        <div className="ids-sheets" onDragOver={(e) => editable && e.preventDefault()} onDrop={(e) => { if (!editable) return; e.preventDefault(); upload(e.dataTransfer.files) }}>
          {sheets.map((s) => (
            <article key={s.id} className="ids-card">
              {isPicture(s) ? (
                <button type="button" className="ids-pic" onClick={() => urls[s.fileid] && setBig(s)} aria-label={`Open ${s.title || s.name} at full size`}>
                  {urls[s.fileid] ? <img src={urls[s.fileid]} alt={s.title || s.name} loading="lazy" /> : <span className="ids-wait">{tried ? 'The picture could not be loaded. Download still works.' : 'Loading the picture…'}</span>}
                </button>
              ) : (
                <div className="ids-pic ids-doc"><span className="ids-cover-ico">{Icon.office?.()}</span><span>{s.name}</span></div>
              )}
              <div className="ids-info">
                {editable ? (
                  <>
                    <input className="ids-title" value={s.title} placeholder="What is it? e.g. ID card, front" onChange={(e) => setSheets((l) => l.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))} onBlur={(e) => save(s, { title: e.target.value.trim() })} />
                    <div className="ids-row">
                      <Field label="Date"><Input type="date" value={s.doc_date || ''} onChange={(e) => save(s, { doc_date: e.target.value || null })} /></Field>
                      <Field label="Notes" className="grow"><Textarea rows={1} value={s.note} placeholder="Number, expiry, anything" onChange={(e) => setSheets((l) => l.map((x) => (x.id === s.id ? { ...x, note: e.target.value } : x)))} onBlur={(e) => save(s, { note: e.target.value })} /></Field>
                    </div>
                  </>
                ) : (
                  <>
                    <strong className="ids-title ro">{s.title || s.name}</strong>
                    {(s.doc_date || s.note) && <p className="ids-ro">{s.doc_date ? <b>{day(s.doc_date)}</b> : null}{s.doc_date && s.note ? ' · ' : ''}{s.note}</p>}
                  </>
                )}
                <div className="ids-foot">
                  <span className="ids-chips">
                    <span className="ids-chip"><i className="ids-dot" />Uploaded {day(s.uploaded_at)}</span>
                    {s.width ? <span className="ids-chip">{s.width}×{s.height}</span> : null}
                    <span className="ids-chip">{kb(s.size)}</span>
                  </span>
                  <span className="ids-acts">
                    {isPicture(s) && urls[s.fileid] && <Act icon="expand" label="Full size" onClick={() => setBig(s)} />}
                    <Act icon="download" label="Download" main onClick={() => download(s)} />
                    {editable && <ActDel label="Delete" onConfirm={() => remove(s)} />}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {editable && sheets && <div className="ids-end"><ActDel label={`Delete the folder of ${person.name}`} onConfirm={removePerson} /></div>}
      <Modal open={!!big} title={big ? big.title || big.name : ''} wide className="ids-big" onClose={() => setBig(null)}
        footer={big ? <><span className="muted">{big.width ? `${big.width}×${big.height} · ` : ''}{kb(big.size)}</span><Button variant="primary" onClick={() => download(big)}>Download</Button></> : null}>
        {big && <div className="ids-big-pic"><img src={urls[big.fileid]} alt={big.title || big.name} /></div>}
      </Modal>
      <Modal open={renaming !== null} title="Rename" onClose={() => setRenaming(null)} footer={<><Button onClick={() => setRenaming(null)}>Cancel</Button><Button variant="primary" onClick={rename}>Save</Button></>}>
        <Field label="Name" hint="New uploads go into a pCloud folder with the new name; the ones already there stay where they are.">
          <Input autoFocus value={renaming || ''} onChange={(e) => setRenaming(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') rename() }} />
        </Field>
      </Modal>
    </section>
  )
}
