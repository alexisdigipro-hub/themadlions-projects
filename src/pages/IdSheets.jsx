import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Act, Button, Empty, Field, Input, Modal, Textarea, useIsMobile, useToast } from '../components/ui.jsx'
import { DbAdd, DbBar, DbSearch, ListRow, useFitScroll } from '../components/DbTools.jsx'
import { InfoCard } from '../components/InfoCard.jsx'
import { can, useCurrentUser } from '../lib/store.jsx'
import { matchText } from '../lib/library.js'
import { fmtDate } from '../lib/dates.js'
import { idApi, idLocal } from '../lib/idsheets.js'

/* Database > ID sheets (Alex, 25 Oct): photos of people's ID sheets, a folder per person, uploaded untouched to
   pCloud. Laid out like Drives (Alex: "the same UI as Drives"): one top row (search with its ×, New person, People |
   Sheets), a line of numbers, soft tiles (a person with their newest picture, how many and the titles as chips; or
   every sheet with its person), and a person opens in a window like a disk does: their sheets one under the other,
   each with its picture, title, date and notes, Full size, Download, Edit and Delete, and Upload on top. Who sees this
   is the permission "ID sheets"; edit uploads, edits and deletes (supabase/id_sheets.sql). */
const HUES = ['#ff8a3d', '#4f9dff', '#b07cff', '#35c98b', '#ff5d8f', '#f2c94c', '#4fd1e6', '#ff6b5b']
const kb = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`)
const day = (iso) => (iso ? fmtDate(String(iso).slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const isPicture = (s) => !!s.width || /\.(jpe?g|png|webp|gif|bmp|tiff?)$/i.test(s.name)
const initials = (t) => String(t || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
function ActDelete({ label, onConfirm, small = false }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t) }, [armed])
  return <Act icon="trash" label={armed ? `Sure? ${label}` : label} className={`act-del${small ? ' act-sm' : ''}${armed ? ' armed' : ''}`} onClick={() => { if (armed) { setArmed(false); onConfirm() } else setArmed(true) }} />
}

export default function IdSheets({ slot }) {
  const user = useCurrentUser()
  const toast = useToast()
  const editable = can(user, 'idsheets', 'edit')
  const mobile = useIsMobile()
  const [people, setPeople] = useState(null)
  const [sheets, setSheets] = useState([])
  const [orig, setOrig] = useState({}) // fileid -> the original, fetched for Full size
  const tried = useRef(new Set()) // sheets whose small picture was asked for once
  const [q, setQ] = useState('')
  const [view, setView] = useState(() => { try { return localStorage.getItem('tml_ids_view') === 'sheets' ? 'sheets' : 'people' } catch { return 'people' } })
  const pickView = (v) => { setView(v); try { localStorage.setItem('tml_ids_view', v) } catch { /* private window */ } }
  const [openId, setOpenId] = useState('') // the person open in their window
  const [adding, setAdding] = useState(null) // the new person's name
  const [renaming, setRenaming] = useState(null)
  const [edit, setEdit] = useState(null) // a sheet's title, date and notes
  const [big, setBig] = useState(null) // the sheet, big
  const [actual, setActual] = useState(false) // at its real pixel size, scrolling
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const pick = useRef(null)
  // one list as Contacts, its rows 70% taller for the picture (Alex, 27 Oct), in a scroll box under a steady top row
  const scrollRef = useFitScroll(people === null)

  // the small pictures come with the list (thumb); a sheet from before they existed gets one made once
  const fill = useCallback(async (all) => {
    const need = all.filter((x) => isPicture(x) && !x.thumb && !tried.current.has(x.id))
    if (!need.length) return
    need.forEach((x) => tried.current.add(x.id))
    const got = await idApi.previews(need, editable)
    if (Object.keys(got).length) setSheets((l) => l.map((x) => (got[x.id] ? { ...x, thumb: got[x.id] } : x)))
  }, [editable])
  const load = useCallback(async () => {
    try {
      const [ppl, all] = await Promise.all([idApi.people(), idApi.allSheets()])
      setPeople(ppl); setSheets(all); setError('')
      fill(all)
    } catch (e) { setError(e.message); setPeople([]) }
  }, [fill])
  useEffect(() => { load() }, [load])
  // Full size: the original from pCloud, the small picture until it is here
  const openBig = async (x) => {
    setBig(x)
    if (orig[x.fileid]) return
    try { const url = await idApi.original(x); setOrig((o) => ({ ...o, [x.fileid]: url })) } catch (e) { toast(e.message, 'error') }
  }

  const list = people || []
  const hue = (id) => HUES[Math.max(0, list.findIndex((p) => p.id === id)) % HUES.length]
  const personOf = (id) => list.find((p) => p.id === id)
  const sheetsOf = (id) => sheets.filter((s) => s.person_id === id)
  const searching = !!q.trim()
  const shownPeople = useMemo(() => list.filter((p) => !searching || matchText(q, p.name, p.note, ...sheets.filter((s) => s.person_id === p.id).map((s) => `${s.title} ${s.note}`))), [list, sheets, q, searching])
  const shownSheets = useMemo(() => sheets.filter((s) => !searching || matchText(q, s.title, s.note, s.name, personOf(s.person_id)?.name)), [sheets, list, q, searching]) // eslint-disable-line react-hooks/exhaustive-deps
  const opened = personOf(openId)

  const stats = useMemo(() => {
    const size = sheets.reduce((a, s) => a + (s.size || 0), 0)
    const dated = sheets.filter((s) => s.doc_date).length
    return { people: list.length, sheets: sheets.length, size, last: sheets[0]?.uploaded_at, dated }
  }, [list, sheets])

  if (!can(user, 'idsheets')) return <Navigate to="/" replace />

  const create = async () => {
    const name = String(adding || '').trim()
    if (!name) return toast('Write the person\'s name.', 'error')
    try { const p = await idApi.addPerson(name); setAdding(null); await load(); setOpenId(p.id) } catch (e) { toast(e.message, 'error') }
  }
  const upload = async (person, files) => {
    const all = [...files]
    if (!all.length) return
    let done = 0
    for (const f of all) {
      setBusy(`Uploading ${done + 1} of ${all.length}: ${f.name}`)
      try { await idApi.upload(person, f); done++ } catch (e) { toast(`${f.name}: ${e.message}`, 'error') }
    }
    setBusy('')
    if (done) toast(done === 1 ? 'Uploaded, full quality' : `${done} uploaded, full quality`, 'ok')
    await load()
  }
  const saveEdit = async () => {
    const patch = { title: edit.title.trim(), doc_date: edit.doc_date || null, note: edit.note }
    try { await idApi.updateSheet(edit.id, patch); setSheets((l) => l.map((x) => (x.id === edit.id ? { ...x, ...patch } : x))); setEdit(null) } catch (e) { toast(e.message, 'error') }
  }
  const download = async (s) => {
    try {
      const url = await idApi.original(s)
      const a = document.createElement('a')
      a.href = url; a.download = s.name; a.rel = 'noopener'
      document.body.append(a); a.click(); a.remove()
    } catch (e) { toast(e.message, 'error') }
  }
  const removeSheet = async (s) => {
    try { await idApi.removeSheet(s); toast('Deleted, from pCloud too', 'ok'); await load() } catch (e) { toast(e.message, 'error') }
  }
  const rename = async () => {
    const name = String(renaming || '').trim()
    if (!name || !opened) return
    try { await idApi.updatePerson(opened.id, { name }); setRenaming(null); await load() } catch (e) { toast(e.message, 'error') }
  }
  const removePerson = async (p) => {
    try { await idApi.removePerson(p); setOpenId(''); toast(`${p.name} deleted`, 'ok'); await load() } catch (e) { toast(e.message, 'error') }
  }

  const personChip = (p) => (
    <button key={p.id} type="button" className="drv-chip" style={{ '--c': hue(p.id) }} onClick={(e) => { e.stopPropagation(); setOpenId(p.id) }} title={`Open ${p.name}`}>
      <i />{p.name}
    </button>
  )
  // a row as every Database list (Alex, 27 Oct), 70% taller for the picture; the initials on the person's colour
  const thumb = (pic, name) => (pic ? <img src={pic} alt="" /> : <b>{initials(name)}</b>)
  const personTile = (p) => {
    const mine = sheetsOf(p.id)
    return (
      <ListRow key={p.id} tall className="ids-lrow" onClick={() => setOpenId(p.id)}
        thumb={<span className="lrow-tint" style={{ '--c': hue(p.id) }}>{thumb(mine.find((x) => x.thumb)?.thumb, p.name)}</span>}
        title={p.name}
        sub={[mine.length === 1 ? '1 sheet' : `${mine.length} sheets`, mine.length ? `last ${day(mine[0].uploaded_at)}` : 'empty folder', p.note].filter(Boolean).join(' · ')}
        chips={<>
          {mine.slice(0, 4).map((s) => <span key={s.id} className="lchip acc"><i />{s.title || s.name}</span>)}
          {mine.length > 4 && <span className="lchip">+{mine.length - 4}</span>}
          {!mine.length && <span className="lchip">No sheets yet</span>}
        </>} />
    )
  }
  const sheetTile = (s) => {
    const p = personOf(s.person_id)
    return (
      <ListRow key={s.id} tall className="ids-lrow" onClick={() => (isPicture(s) ? openBig(s) : setOpenId(s.person_id))}
        thumb={<span className="lrow-tint" style={{ '--c': hue(s.person_id) }}>{thumb(s.thumb, s.title || s.name)}</span>}
        title={s.title || s.name}
        sub={[s.doc_date ? day(s.doc_date) : '', `uploaded ${day(s.uploaded_at)}`, s.note].filter(Boolean).join(' · ')}
        chips={<>
          {p && personChip(p)}
          <span className="lchip">{kb(s.size)}</span>
        </>} />
    )
  }

  return (
    <section className="panel db-card drives drv ids">
      <DbBar slot={slot}>
        <div className="toolbar-info"><strong>ID sheets</strong> <span className="muted">{people ? people.length : ''}</span></div>
        <div className="toolbar-actions">
          {/* on a phone a round magnifier that opens into the search, like the other Database tabs */}
          {mobile ? <DbSearch value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" /> : (
            <span className="search-clear-wrap">
              <Input className="input search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the ID sheets" placeholder="Search" />
              {q && <button type="button" className="search-clear" aria-label="Clear the search" title="Clear" onClick={() => setQ('')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" /></svg></button>}
            </span>
          )}
          {editable && <DbAdd label="New person" onClick={() => setAdding('')} />}
          <span className="segmented small ids-view">
            <button className={view === 'people' ? 'on' : ''} onClick={() => pickView('people')}>People</button>
            <button className={view === 'sheets' ? 'on' : ''} onClick={() => pickView('sheets')}>Sheets</button>
          </span>
        </div>
      </DbBar>

      {idLocal && <p className="ids-note">Trying it out: without the online database the pictures stay in this browser only. On hub.themadlions.com they go to pCloud.</p>}
      {error && <p className="ids-note err">{error}</p>}

      {people === null ? <p className="muted ids-wait">Loading…</p> : !list.length ? (
        <Empty title="No people yet" action={editable && <Button variant="primary" onClick={() => setAdding('')}>New person</Button>}>
          Make a folder for each person, then upload the photos of their ID card, passport or licence into it. They go to pCloud as they are, full quality.
        </Empty>
      ) : (
        <>
          <div className="drv-stats">
            <span><b>{stats.people}</b><small>{stats.people === 1 ? 'person' : 'people'}</small></span>
            <span><b>{stats.sheets}</b><small>{stats.sheets === 1 ? 'sheet' : 'sheets'}{stats.dated ? ` · ${stats.dated} with a date` : ''}</small></span>
            <span><b>{stats.size ? kb(stats.size) : '–'}</b><small>in pCloud, full quality</small></span>
            <span><b>{stats.last ? day(stats.last) : '–'}</b><small>last upload</small></span>
          </div>
          <div className="ab-scroll" ref={scrollRef}>
          {searching || view === 'sheets' ? (
            (view === 'sheets' ? shownSheets : shownPeople).length ? (
              <div className="lrow-list">{view === 'sheets' ? shownSheets.map(sheetTile) : shownPeople.map(personTile)}</div>
            ) : <Empty title="Nothing found">{`Nothing matches "${q}". Try a name, or what the sheet is.`}</Empty>
          ) : (
            <div className="lrow-list">{shownPeople.map(personTile)}</div>
          )}
          </div>
        </>
      )}

      {/* a person in their own window, like a disk: every sheet uploaded for them */}
      {/* the person's card, as Contacts' (Alex, 27 Oct): the newest picture, how many and where, then their sheets */}
      {(() => {
        const mine = opened ? sheetsOf(opened.id) : []
        const size = mine.reduce((a, s) => a + (s.size || 0), 0)
        return (
          <InfoCard open={!!opened} onClose={() => setOpenId('')} wide
            photo={mine.find((x) => x.thumb)?.thumb} name={opened?.name}
            tags={opened && <>
              <span className="ab-chip"><i />{mine.length === 1 ? '1 sheet' : `${mine.length} sheets`}</span>
              {size > 0 && <span className="muted">{kb(size)}</span>}
              <span className="ab-card-in">pCloud · ID sheets / {opened.name}</span>
            </>}
            notes={opened?.note}
            footer={opened && editable && <>
              <ActDelete label="Delete person" onConfirm={() => removePerson(opened)} />
              <span className="grow" />
              <Button onClick={() => setRenaming(opened.name)}>Rename</Button>
              <Button variant="primary" onClick={() => pick.current?.click()}>Upload</Button>
            </>}>
            {opened && (
              <div className="drv-open" style={{ '--c': hue(opened.id) }} onDragOver={(e) => editable && e.preventDefault()} onDrop={(e) => { if (!editable) return; e.preventDefault(); upload(opened, e.dataTransfer.files) }}>
                <input ref={pick} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => { upload(opened, e.target.files); e.target.value = '' }} />
                {busy && <p className="ids-note busy"><span className="ids-spin" />{busy}</p>}
                {mine.length ? (
                  <div className="drv-open-list">
                    {mine.map((s) => (
                      <div key={s.id} className="drv-row ids-row">
                        <button type="button" className="ids-thumb" onClick={() => isPicture(s) && openBig(s)} aria-label={`Open ${s.title || s.name} at full size`} style={s.thumb ? { backgroundImage: `url("${s.thumb}")` } : null}>
                          {!s.thumb && <span className="muted small">{isPicture(s) ? (tried.current.has(s.id) ? 'Loading…' : 'No preview') : (s.name.split('.').pop() || 'file').toUpperCase()}</span>}
                        </button>
                        <div className="drv-film-body">
                          <strong>{s.title || s.name}</strong>
                          <span className="drv-meta">{[s.doc_date ? day(s.doc_date) : '', s.note].filter(Boolean).join(' · ') || <span className="muted">No date or notes</span>}</span>
                          <span className="drv-chips">
                            <span className="drv-chip static">Uploaded {day(s.uploaded_at)}</span>
                            {s.width ? <span className="drv-chip static">{s.width}×{s.height}</span> : null}
                            <span className="drv-chip static">{kb(s.size)}</span>
                          </span>
                        </div>
                        <span className="drive-item-tools">
                          {isPicture(s) && <Act icon="expand" label="Full size" className="act-sm" onClick={() => openBig(s)} />}
                          <Act icon="download" label="Download" className="act-sm" onClick={() => download(s)} />
                          {editable && <Act icon="edit" label="Edit" className="act-sm" onClick={() => setEdit({ id: s.id, title: s.title || '', doc_date: s.doc_date || '', note: s.note || '' })} />}
                          {editable && <ActDelete small label="Delete" onConfirm={() => removeSheet(s)} />}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : <p className="muted">No sheets for {opened.name} yet.{editable ? ' Upload the photos of their ID card, passport or licence, or drop them here.' : ''}</p>}
              </div>
            )}
          </InfoCard>
        )
      })()}

      {/* the picture at its real size */}
      <Modal open={!!big} title={big ? `${personOf(big.person_id)?.name || ''} · ${big.title || big.name}` : ''} wide className="ids-big" onClose={() => { setBig(null); setActual(false) }}
        footer={big ? <><span className="muted">{big.width ? `${big.width}×${big.height} · ` : ''}{kb(big.size)}</span><Button variant="primary" onClick={() => download(big)}>Download</Button></> : null}>
        {big && <div className={`ids-big-pic${actual ? ' actual' : ''}`} onClick={() => setActual(!actual)} title={actual ? 'Fit the window' : 'Real size'}><img src={orig[big.fileid] || big.thumb} alt={big.title || big.name} />{!orig[big.fileid] && <span className="ids-loading"><span className="ids-spin" />Loading the original…</span>}</div>}
      </Modal>

      <Modal open={!!edit} title="Edit sheet" onClose={() => setEdit(null)} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={saveEdit}>Save</Button></>}>
        {edit && (
          <div className="stack">
            <Field label="What is it"><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="ID card, front · Passport · Driving licence" autoFocus /></Field>
            <Field label="Date" hint="The date that matters on it: issued, expires, signed."><Input type="date" value={edit.doc_date} onChange={(e) => setEdit({ ...edit, doc_date: e.target.value })} /></Field>
            <Field label="Notes"><Textarea rows={2} value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} placeholder="Number, expiry, anything" /></Field>
          </div>
        )}
      </Modal>

      <Modal open={adding !== null} title="New person" onClose={() => setAdding(null)} footer={<><Button variant="ghost" onClick={() => setAdding(null)}>Cancel</Button><Button variant="primary" onClick={create}>Make the folder</Button></>}>
        <Field label="Name" hint="The folder in pCloud gets this name too: ID sheets / name.">
          <Input autoFocus value={adding || ''} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') create() }} placeholder="e.g. Maria Papadopoulou" />
        </Field>
      </Modal>
      <Modal open={renaming !== null} title="Rename" onClose={() => setRenaming(null)} footer={<><Button variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button><Button variant="primary" onClick={rename}>Save</Button></>}>
        <Field label="Name" hint="New uploads go into a pCloud folder with the new name; the ones already there stay where they are.">
          <Input autoFocus value={renaming || ''} onChange={(e) => setRenaming(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') rename() }} />
        </Field>
      </Modal>
    </section>
  )
}
