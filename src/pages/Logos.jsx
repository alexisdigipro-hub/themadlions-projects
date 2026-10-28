import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Act, Button, Empty, Field, Input, Modal, Textarea, useIsMobile, useToast } from '../components/ui.jsx'
import { DbAdd, DbBar, DbSearch, ListRow, useFitScroll } from '../components/DbTools.jsx'
import { InfoCard } from '../components/InfoCard.jsx'
import { can, useCurrentUser } from '../lib/store.jsx'
import { matchText } from '../lib/library.js'
import { fmtDate } from '../lib/dates.js'
import { extOf, isPicture, logoApi, logoLocal } from '../lib/logos.js'

/* Database > Logos (Alex, 28 Oct): the logos of clients, labels and brands, a folder a brand with its versions (white,
   black, horizontal, the icon), uploaded untouched to pCloud. Laid out like ID sheets: one top row (search, New brand,
   Brands | Logos), soft rows (a brand with its first logo and its versions as chips; or every logo with its brand), and
   a brand opens in its own card: its logos as tiles on a light or dark backdrop (a white logo needs the dark one), each
   with Download, Edit and Delete, and Upload. Who sees this is the permission "Logos" (supabase/logos.sql). */
const HUES = ['#ff8a3d', '#4f9dff', '#b07cff', '#35c98b', '#ff5d8f', '#f2c94c', '#4fd1e6', '#ff6b5b']
const kb = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round((n || 0) / 1e3))} KB`)
const day = (iso) => (iso ? fmtDate(String(iso).slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const initials = (t) => String(t || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
function ActDelete({ label, onConfirm, small = false }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t) }, [armed])
  return <Act icon="trash" label={armed ? `Sure? ${label}` : label} className={`act-del${small ? ' act-sm' : ''}${armed ? ' armed' : ''}`} onClick={() => { if (armed) { setArmed(false); onConfirm() } else setArmed(true) }} />
}

export default function Logos({ slot }) {
  const user = useCurrentUser()
  const toast = useToast()
  const editable = can(user, 'logos', 'edit')
  const mobile = useIsMobile()
  const [brands, setBrands] = useState(null)
  const [logos, setLogos] = useState([])
  const [q, setQ] = useState('')
  const [view, setView] = useState(() => { try { return localStorage.getItem('tml_logos_view') === 'logos' ? 'logos' : 'brands' } catch { return 'brands' } })
  const pickView = (v) => { setView(v); try { localStorage.setItem('tml_logos_view', v) } catch { /* private window */ } }
  // the backdrop behind the logos: light or dark, remembered on this device
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('tml_logos_dark') === '1' } catch { return false } })
  const flip = () => { setDark(!dark); try { localStorage.setItem('tml_logos_dark', dark ? '0' : '1') } catch { /* private window */ } }
  const [openId, setOpenId] = useState('')
  const [adding, setAdding] = useState(null)
  const [renaming, setRenaming] = useState(null)
  const [edit, setEdit] = useState(null)
  const [big, setBigRaw] = useState(null)
  const [bigUrl, setBigUrl] = useState('') // the original, fetched when a logo is opened big
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const pick = useRef(null)
  const scrollRef = useFitScroll(brands === null)

  const load = useCallback(async () => {
    try {
      const [b, all] = await Promise.all([logoApi.brands(), logoApi.all()])
      setBrands(b); setLogos(all); setError('')
    } catch (e) { setError(e.message); setBrands([]) }
  }, [])
  useEffect(() => { load() }, [load])

  const list = brands || []
  const hue = (id) => HUES[Math.max(0, list.findIndex((b) => b.id === id)) % HUES.length]
  const brandOf = (id) => list.find((b) => b.id === id)
  const logosOf = (id) => logos.filter((l) => l.brand_id === id)
  const searching = !!q.trim()
  const shownBrands = useMemo(() => list.filter((b) => !searching || matchText(q, b.name, b.note, ...logos.filter((l) => l.brand_id === b.id).map((l) => `${l.title} ${l.note} ${l.name}`))), [list, logos, q, searching])
  const shownLogos = useMemo(() => logos.filter((l) => !searching || matchText(q, l.title, l.note, l.name, brandOf(l.brand_id)?.name)), [logos, list, q, searching]) // eslint-disable-line react-hooks/exhaustive-deps
  const opened = brandOf(openId)

  if (!can(user, 'logos')) return <Navigate to="/" replace />

  const setBig = async (l) => {
    setBigRaw(l); setBigUrl('')
    if (!l) return
    try { const u = await logoApi.original(l); setBigUrl(u) } catch { /* the small one stays */ }
  }
  const create = async () => {
    const name = String(adding || '').trim()
    if (!name) return toast('Write the brand\'s name.', 'error')
    try { const b = await logoApi.addBrand(name); setAdding(null); await load(); setOpenId(b.id) } catch (e) { toast(e.message, 'error') }
  }
  const upload = async (brand, files) => {
    const all = [...files]
    if (!all.length) return
    let done = 0
    for (const f of all) {
      setBusy(`Uploading ${done + 1} of ${all.length}: ${f.name}`)
      try { await logoApi.upload(brand, f); done++ } catch (e) { toast(`${f.name}: ${e.message}`, 'error') }
    }
    setBusy('')
    if (done) toast(done === 1 ? 'Uploaded to pCloud' : `${done} uploaded to pCloud`, 'ok')
    await load()
  }
  const download = async (l) => {
    try {
      const url = await logoApi.original(l)
      const a = document.createElement('a')
      a.href = url; a.download = l.name; a.rel = 'noopener'
      document.body.append(a); a.click(); a.remove()
    } catch (e) { toast(e.message, 'error') }
  }
  const saveEdit = async () => {
    const patch = { title: edit.title.trim(), note: edit.note }
    try { await logoApi.update(edit.id, patch); setLogos((ls) => ls.map((x) => (x.id === edit.id ? { ...x, ...patch } : x))); setEdit(null) } catch (e) { toast(e.message, 'error') }
  }
  const removeLogo = async (l) => {
    try { await logoApi.remove(l); toast('Deleted, from pCloud too', 'ok'); await load() } catch (e) { toast(e.message, 'error') }
  }
  const rename = async () => {
    const name = String(renaming || '').trim()
    if (!name || !opened) return
    try { await logoApi.updateBrand(opened.id, { name }); setRenaming(null); await load() } catch (e) { toast(e.message, 'error') }
  }
  const removeBrand = async (b) => {
    try { await logoApi.removeBrand(b, logosOf(b.id)); setOpenId(''); toast(`${b.name} deleted`, 'ok'); await load() } catch (e) { toast(e.message, 'error') }
  }

  // a logo's small picture on the checkered (or dark) backdrop, or its format when it has none (AI, EPS, PDF)
  const face = (l, cls = '') => (
    <span className={`logo-face${dark ? ' dark' : ''} ${cls}`}>
      {l?.thumb ? <img src={l.thumb} alt="" /> : <b>{l ? extOf(l.name) : ''}</b>}
    </span>
  )
  const brandRow = (b) => {
    const mine = logosOf(b.id)
    const first = mine.find((x) => x.thumb) || mine[0]
    const kinds = [...new Set(mine.map((l) => extOf(l.name)))]
    return (
      <ListRow key={b.id} tall className="ids-lrow logo-lrow" onClick={() => setOpenId(b.id)}
        thumb={first ? face(first) : <span className="lrow-tint" style={{ '--c': hue(b.id) }}><b>{initials(b.name)}</b></span>}
        title={b.name}
        sub={[mine.length === 1 ? '1 logo' : `${mine.length} logos`, kinds.join(' · '), b.note].filter(Boolean).join(' · ')}
        chips={<>
          {mine.slice(0, 4).map((l) => <span key={l.id} className="lchip acc"><i />{l.title || l.name}</span>)}
          {mine.length > 4 && <span className="lchip">+{mine.length - 4}</span>}
          {!mine.length && <span className="lchip">No logos yet</span>}
        </>} />
    )
  }
  const logoRow = (l) => {
    const b = brandOf(l.brand_id)
    return (
      <ListRow key={l.id} tall className="ids-lrow logo-lrow" onClick={() => (isPicture(l.name) ? setBig(l) : setOpenId(l.brand_id))}
        thumb={face(l)}
        title={l.title || l.name}
        sub={[extOf(l.name), l.width ? `${l.width}×${l.height}` : '', kb(l.size), l.note].filter(Boolean).join(' · ')}
        chips={b && <button type="button" className="drv-chip" style={{ '--c': hue(b.id) }} onClick={(e) => { e.stopPropagation(); setOpenId(b.id) }}><i />{b.name}</button>} />
    )
  }

  return (
    <section className="panel db-card drives drv ids logos">
      <DbBar slot={slot}>
        <div className="toolbar-info"><strong>Logos</strong> <span className="muted">{brands ? brands.length : ''}</span></div>
        <div className="toolbar-actions">
          {mobile ? <DbSearch value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" /> : (
            <span className="search-clear-wrap">
              <Input className="input search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the logos" placeholder="Search" />
              {q && <button type="button" className="search-clear" aria-label="Clear the search" title="Clear" onClick={() => setQ('')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" /></svg></button>}
            </span>
          )}
          {editable && <DbAdd label="New brand" onClick={() => setAdding('')} />}
          <span className="segmented small ids-view">
            <button className={view === 'brands' ? 'on' : ''} onClick={() => pickView('brands')}>Brands</button>
            <button className={view === 'logos' ? 'on' : ''} onClick={() => pickView('logos')}>Logos</button>
          </span>
          <button type="button" className={`logo-bg-flip${dark ? ' on' : ''}`} onClick={flip} title={dark ? 'Light backdrop' : 'Dark backdrop'} aria-label={dark ? 'Light backdrop' : 'Dark backdrop'}><i /></button>
        </div>
      </DbBar>

      {logoLocal && <p className="ids-note">Trying it out: without the online database the logos stay in this browser only. On hub.themadlions.com they go to pCloud.</p>}
      {error && <p className="ids-note err">{error}</p>}

      {brands === null ? <p className="muted ids-wait">Loading…</p> : !list.length ? (
        <Empty title="No brands yet" action={editable && <Button variant="primary" onClick={() => setAdding('')}>New brand</Button>}>
          Make a folder for each client, label or brand, then upload its logos into it: white, black, horizontal, the icon. They go to pCloud as they are.
        </Empty>
      ) : (
        <div className="ab-scroll" ref={scrollRef}>
          {(view === 'logos' ? shownLogos : shownBrands).length ? (
            <div className="lrow-list">{view === 'logos' ? shownLogos.map(logoRow) : shownBrands.map(brandRow)}</div>
          ) : <Empty title="Nothing found">{`Nothing matches "${q}". Try a brand, or a version like white.`}</Empty>}
        </div>
      )}

      {/* a brand in its own card: its logos as tiles, Upload */}
      {(() => {
        const mine = opened ? logosOf(opened.id) : []
        return (
          <InfoCard open={!!opened} onClose={() => setOpenId('')} wide
            photo={mine.find((x) => x.thumb)?.thumb} name={opened?.name}
            tags={opened && <>
              <span className="ab-chip"><i />{mine.length === 1 ? '1 logo' : `${mine.length} logos`}</span>
              <span className="ab-card-in">pCloud · Logos / {opened.name}</span>
            </>}
            notes={opened?.note}
            footer={opened && editable && <>
              <ActDelete label="Delete brand" onConfirm={() => removeBrand(opened)} />
              <span className="grow" />
              <Button onClick={() => setRenaming(opened.name)}>Rename</Button>
              <Button variant="primary" onClick={() => pick.current?.click()}>Upload</Button>
            </>}>
            {opened && (
              <div className="drv-open" onDragOver={(e) => editable && e.preventDefault()} onDrop={(e) => { if (!editable) return; e.preventDefault(); upload(opened, e.dataTransfer.files) }}>
                <input ref={pick} type="file" accept="image/*,.svg,.pdf,.ai,.eps,.psd,.zip" multiple hidden onChange={(e) => { upload(opened, e.target.files); e.target.value = '' }} />
                {busy && <p className="ids-note busy"><span className="ids-spin" />{busy}</p>}
                <div className="logo-card-top">
                  <span className="muted small">Backdrop</span>
                  <button type="button" className={`logo-bg-flip${dark ? ' on' : ''}`} onClick={flip} title={dark ? 'Light backdrop' : 'Dark backdrop'} aria-label={dark ? 'Light backdrop' : 'Dark backdrop'}><i /></button>
                </div>
                {mine.length ? (
                  <div className="logo-grid">
                    {mine.map((l) => (
                      <div key={l.id} className="logo-tile">
                        <button type="button" className="logo-tile-face" onClick={() => (isPicture(l.name) ? setBig(l) : download(l))} aria-label={`Open ${l.title || l.name}`}>{face(l, 'big')}</button>
                        <strong>{l.title || l.name}</strong>
                        <span className="muted small">{[extOf(l.name), l.width ? `${l.width}×${l.height}` : '', kb(l.size)].filter(Boolean).join(' · ')}</span>
                        {l.note && <span className="small">{l.note}</span>}
                        <span className="logo-tile-acts">
                          <Act icon="download" label="Download" className="act-sm" onClick={() => download(l)} />
                          {editable && <Act icon="edit" label="Edit" className="act-sm" onClick={() => setEdit({ id: l.id, title: l.title || '', note: l.note || '' })} />}
                          {editable && <ActDelete small label="Delete" onConfirm={() => removeLogo(l)} />}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : <p className="muted">No logos for {opened.name} yet.{editable ? ' Upload them (PNG, SVG, PDF, AI, EPS), or drop them here.' : ''}</p>}
              </div>
            )}
          </InfoCard>
        )
      })()}

      {/* one logo, big, on the backdrop */}
      <Modal open={!!big} title={big ? `${brandOf(big.brand_id)?.name || ''} · ${big.title || big.name}` : ''} wide className="ids-big" onClose={() => setBig(null)}
        footer={big ? <><span className="muted">{[extOf(big.name), big.width ? `${big.width}×${big.height}` : '', kb(big.size)].filter(Boolean).join(' · ')}</span><span className="grow" /><button type="button" className={`logo-bg-flip${dark ? ' on' : ''}`} onClick={flip} title="Backdrop" aria-label="Backdrop"><i /></button><Button variant="primary" onClick={() => download(big)}>Download</Button></> : null}>
        {big && <div className={`logo-big${dark ? ' dark' : ''}`}><img src={bigUrl || big.thumb} alt={big.title || big.name} /></div>}
      </Modal>

      <Modal open={!!edit} title="Edit logo" onClose={() => setEdit(null)} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={saveEdit}>Save</Button></>}>
        {edit && (
          <div className="stack">
            <Field label="Which version"><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="White · Black · Horizontal · Icon" autoFocus /></Field>
            <Field label="Notes"><Textarea rows={2} value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} placeholder="Where it is used, colours, anything" /></Field>
          </div>
        )}
      </Modal>

      <Modal open={adding !== null} title="New brand" onClose={() => setAdding(null)} footer={<><Button variant="ghost" onClick={() => setAdding(null)}>Cancel</Button><Button variant="primary" onClick={create}>Make the folder</Button></>}>
        <Field label="Name" hint="The folder in pCloud gets this name too: Logos / name.">
          <Input autoFocus value={adding || ''} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') create() }} placeholder="e.g. Panik Records" />
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
