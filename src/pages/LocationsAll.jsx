import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, Select, TagsInput, Textarea, useToast } from '../components/ui.jsx'
import { can, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { locationProjects, locationToLibrary, matchText } from '../lib/library.js'
import { coordsFromText } from '../lib/sun.js'
import { isMapsLink, readMapLink } from '../lib/maplink.js'
import PhotoGrid from '../components/PhotoGrid.jsx'
import { InfoCard, QuickLinks } from '../components/InfoCard.jsx'
import { DbAdd, DbBar, DbFilter, DbStats, ListRow, ListSearch, useFitScroll } from '../components/DbTools.jsx'

const TYPES = ['Studio', 'Interior', 'Exterior', 'INT. & EXT.', 'Office', 'Base camp', 'Parking', 'Hospital', 'Other']
const emptyLoc = () => ({ id: uid(), name: '', mapsUrl: '', address: '', type: 'Interior', notes: '', contact: '', phone: '', lat: '', lon: '', coordsText: '', photos: [], tags: [], createdAt: new Date().toISOString() })
// the exact spot when the location has coordinates (from its Google Maps link), else its address
const mapQuery = (l) => (l.lat && l.lon ? `${l.lat},${l.lon}` : l.address)
function mapSrc(address, key) {
  const q = encodeURIComponent(address)
  return key ? `https://www.google.com/maps/embed/v1/place?key=${key}&q=${q}` : `https://www.google.com/maps?q=${q}&output=embed`
}

/* Just the area of an address, for the cards on a phone (Alex, 10 Oct: "only the area, not the address"):
   "Karaoli ke Dimitriou 9, Vironas 162 32, Greece" gives "Vironas". The street (the first part when there
   are several), postcodes, the country and plain coordinates are left out. */
const COUNTRIES = /^(greece|ελλάδα|ελλαδα|hellas)$/i
function areaOf(address) {
  const parts = String(address || '').split(',').map((x) => x.replace(/\b\d{3}\s?\d{2}\b/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean)
  const named = (x) => /\p{L}{2,}/u.test(x) && !/\d/.test(x) && !COUNTRIES.test(x)
  if (parts.length === 1) return named(parts[0]) ? parts[0] : ''
  return parts.slice(1).find(named) || ''
}

/* Database > Locations. A compact card grid, the same look as Crew and Cast, with the map and
   full detail behind a click in a modal instead of an always-open split pane — fits one database
   section among the others instead of taking the whole page over. */
export default function LocationsAll({ slot }) {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const editable = can(user, 'locations', 'edit')
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [detailFor, setDetailFor] = useState('')
  const [draft, setDraft] = useState(null)
  const [linkNote, setLinkNote] = useState('') // what reading the Google Maps link did
  const locs = state.library.locations
  const projects = visibleProjects(state, user)
  const list = locs
    .filter((l) => (type ? l.type === type : true))
    .filter((l) => matchText(q, l.name, l.address, l.type, l.contact, l.notes, (l.tags || []).join(' ')))
    .sort((a, b) => a.name.localeCompare(b.name))
  const detail = locs.find((l) => l.id === detailFor)
  // one list as Contacts, its rows 70% taller for the picture (Alex, 27 Oct), in a scroll box under a steady top row
  const scrollRef = useFitScroll()

  /* A pasted Google Maps link fills the address, the coordinates (so the map shows the exact spot) and,
     if it is still empty, the name (Alex, 10 Oct) */
  const linkTimer = useRef(0)
  const pickLink = (text) => {
    const url = String(text || '').trim()
    setDraft((d) => ({ ...d, mapsUrl: url }))
    clearTimeout(linkTimer.current)
    if (!isMapsLink(url)) { setLinkNote(url ? 'Paste the link from Google Maps (Share > Copy link).' : ''); return }
    // read it once the pasting or typing has stopped, not on every letter
    linkTimer.current = setTimeout(() => readLink(url), 500)
  }
  const readLink = async (url) => {
    setLinkNote('Reading the link…')
    try {
      const r = await readMapLink(url)
      setDraft((d) => (d && d.mapsUrl === url ? {
        ...d,
        name: d.name.trim() ? d.name : r.name || d.name,
        address: r.address || d.address,
        lat: r.lat ?? d.lat, lon: r.lon ?? d.lon, coordsText: '',
      } : d))
      setLinkNote(r.address ? 'Address and map filled from the link.' : 'Map spot filled from the link.')
    } catch (e) {
      setLinkNote(e.message)
    }
  }
  const save = () => {
    if (!draft.name.trim()) return toast('Name the location.', 'error')
    update((s) => {
      const i = s.library.locations.findIndex((l) => l.id === draft.id)
      if (i >= 0) s.library.locations[i] = draft
      else s.library.locations.push(draft)
      return s
    })
    setDetailFor(draft.id)
    setDraft(null)
    toast('Saved to the library', 'ok')
  }
  const remove = (l) => {
    update((s) => {
      s.projects.forEach((pr) => pr.locations.forEach((x) => x.libraryId === l.id && delete x.libraryId))
      s.library.locations = s.library.locations.filter((x) => x.id !== l.id)
      return s
    })
    setDetailFor('')
  }
  const setPhotos = (id, photos) => update((s) => {
    const l = s.library.locations.find((x) => x.id === id)
    if (l) l.photos = photos
    return s
  })
  const unlinked = projects.flatMap((p) => p.locations.filter((l) => !l.libraryId)).length
  const collect = () => {
    let added = 0, linked = 0
    update((s) => {
      s.projects.forEach((pr) => pr.locations.forEach((l) => {
        if (l.libraryId) return
        const key = (l.name || '').trim().toLowerCase()
        if (!key) return
        let entry = s.library.locations.find((x) => x.name.trim().toLowerCase() === key && (x.address || '').trim().toLowerCase() === (l.address || '').trim().toLowerCase())
        if (!entry) { entry = locationToLibrary(l); s.library.locations.push(entry); added += 1 }
        else if (!entry.photos?.length && l.photos?.length) entry.photos = l.photos
        l.libraryId = entry.id
        linked += 1
      }))
      return s
    })
    toast(`${added} added to the library, ${linked} project entries linked`, 'ok')
  }

  return (
    <section className="panel db-card">
      <DbBar slot={slot}>
        <div className="toolbar-info">
          <strong>Locations</strong>
        </div>
        <div className="toolbar-actions">
          <ListSearch value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, address, notes…" />
          <span className="ab-count">{q.trim() || type ? `${list.length} of ${locs.length}` : `${locs.length} location${locs.length === 1 ? '' : 's'}`}</span>
          <DbFilter value={type} onChange={(e) => setType(e.target.value)} options={[['', 'All types'], ...TYPES.map((t) => [t, t])]} label="Type" />
          {editable && unlinked > 0 && <Button variant="ghost" className="db-collect" onClick={collect}>Collect {unlinked} from projects</Button>}
          {editable && <DbAdd label="Add location" onClick={() => { setLinkNote(''); setDraft(emptyLoc()) }} />}
        </div>
      </DbBar>

      {/* the numbers, as Drives' (Alex, 27 Oct) */}
      {locs.length > 0 && <DbStats items={[
        [locs.length, 'locations'],
        [locs.filter((l) => l.photos?.length).length, 'with photos'],
        [locs.filter((l) => locationProjects(projects, l.id).length).length, 'used in a project'],
        locs.filter((l) => !l.address && !(l.lat && l.lon)).length ? [locs.filter((l) => !l.address && !(l.lat && l.lon)).length, 'with no address', true] : [new Set(locs.map((l) => l.type).filter(Boolean)).size, 'types'],
      ]} />}
      <div className="ab-scroll" ref={scrollRef}>
      {!list.length ? (
        <Empty title={locs.length ? 'No matches' : 'The database is empty'}>
          {locs.length ? 'Try another search.' : 'Locations you add inside a project land here automatically. Scouted places you have not used yet can be added directly.'}
        </Empty>
      ) : (
        // the picture, the name and its area, the type as a chip, the address, who to call; a tap opens the map
        <div className="lrow-list">
          {list.map((l) => (
            <ListRow key={l.id} tall onClick={() => setDetailFor(l.id)}
              thumb={l.photos?.[0]?.thumb ? <img src={l.photos[0].thumb} alt="" /> : '📍'}
              title={l.name}
              sub={l.address}
              chips={<>
                {l.type && <span className="lchip acc"><i />{l.type}</span>}
                {areaOf(l.address) && <span className="lchip">{areaOf(l.address)}</span>}
                {(l.contact || l.phone) && <span className="lchip">{l.contact}{l.phone && <> {l.contact ? '· ' : ''}<a href={`tel:${l.phone}`} onClick={(e) => e.stopPropagation()}>{l.phone}</a></>}</span>}
              </>}
              aside={<>
                {(l.mapsUrl || l.address) && <a className="btn btn-default btn-sm" href={l.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.address)}`} target="_blank" rel="noreferrer">Map</a>}
                {editable && <button type="button" className="btn btn-default btn-sm" onClick={() => { setLinkNote(''); setDraft({ ...l }) }}>Edit</button>}
              </>} />
          ))}
        </div>
      )}
      </div>

      {/* the location's card, as Contacts' (Alex, 27 Oct): the picture, the type, Call / Map / Directions, the details,
          then the map and the photos */}
      <InfoCard open={!!detail} onClose={() => setDetailFor('')} wide square glyph="📍"
        photo={detail?.photos?.[0]?.thumb} name={detail?.name}
        tags={detail && <>
          {detail.type && <span className="ab-chip"><i />{detail.type}</span>}
          {areaOf(detail.address) && <span className="muted">{areaOf(detail.address)}</span>}
        </>}
        quick={detail && <QuickLinks phone={detail.phone} extra={[
          ...((detail.mapsUrl || detail.address) ? [['map', detail.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detail.address)}`, 'Open in Maps']] : []),
          ...((detail.address || (detail.lat && detail.lon)) ? [['go', `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery(detail))}`, 'Directions']] : []),
        ]} />}
        rows={detail ? [
          ['Address', detail.address],
          ['Contact', (detail.contact || detail.phone) && <>{detail.contact} {detail.phone && <a href={`tel:${detail.phone}`}>{detail.phone}</a>}</>],
          ['Used in', locationProjects(projects, detail.id).length ? <span className="ab-card-links">{locationProjects(projects, detail.id).map((p) => <Link key={p.id} className="proj-link" to={`/p/${p.id}`} style={{ '--pc': p.color }}>{p.title}</Link>)}</span> : <span className="muted">No project yet</span>],
        ] : []}
        notes={detail?.notes}
        footer={detail && editable && <>
          <Confirm onConfirm={() => remove(detail)} label="Delete" className="ab-del">Delete</Confirm>
          <span className="grow" />
          <Button variant="primary" onClick={() => { const d = detail; setDetailFor(''); setLinkNote(''); setDraft({ ...d }) }}>Edit</Button>
        </>}>
        {detail && (detail.address || (detail.lat && detail.lon)) && <iframe className="map" title={detail.name} src={mapSrc(mapQuery(detail), state.settings.mapsKey)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />}
        {detail && <PhotoGrid photos={detail.photos || []} projectId="library" ownerId={detail.id} editable={editable} onChange={(photos) => setPhotos(detail.id, photos)} />}
      </InfoCard>

      <Modal open={!!draft} title={draft && locs.some((l) => l.id === draft.id) ? 'Edit location' : 'New location'} onClose={() => setDraft(null)}
        footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save location</Button></>}>
        {draft && (
          <div className="stack">
            <div className="row-2">
              <Field label="Name"><Input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
              <Field label="Type"><Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} options={TYPES} /></Field>
            </div>
            <Field label="Google Maps link" hint={linkNote || 'In Google Maps: Share > Copy link, then paste it here. The address and the map fill in by themselves.'}>
              <Input value={draft.mapsUrl || ''} inputMode="url" placeholder="https://maps.app.goo.gl/…" onChange={(e) => pickLink(e.target.value)} />
            </Field>
            <Field label="Address"><Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></Field>
            <Field label="Coordinates" hint="Optional. Paste a Google Maps link or lat, lon.">
              <Input value={draft.lat && draft.lon ? `${draft.lat}, ${draft.lon}` : draft.coordsText || ''} onChange={(e) => { const c = coordsFromText(e.target.value); setDraft({ ...draft, coordsText: e.target.value, lat: c ? c.lat : '', lon: c ? c.lon : '' }) }} placeholder="37.9838, 23.7275" />
            </Field>
            <div className="row-2">
              <Field label="Contact"><Input value={draft.contact} onChange={(e) => setDraft({ ...draft, contact: e.target.value })} /></Field>
              <Field label="Phone"><Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
            </div>
            <Field label="Notes"><Textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Permits, parking, power, noise, best hours, fees" /></Field>
            <Field label="Tags" hint="Comma separated: rooftop, sea view, free parking"><TagsInput key={draft.id} value={draft.tags} onChange={(tags) => setDraft({ ...draft, tags })} /></Field>
          </div>
        )}
      </Modal>
    </section>
  )
}
