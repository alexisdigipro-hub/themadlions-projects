import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Confirm, Empty, Field, Input, Modal, PageHead, Select, Textarea, useToast } from '../components/ui.jsx'
import { can, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { locationProjects, locationToLibrary, matchText } from '../lib/library.js'
import { coordsFromText } from '../lib/sun.js'
import PhotoGrid from '../components/PhotoGrid.jsx'

const TYPES = ['Studio', 'Interior', 'Exterior', 'Office', 'Base camp', 'Parking', 'Hospital', 'Other']
const emptyLoc = () => ({ id: uid(), name: '', address: '', type: 'Interior', notes: '', contact: '', phone: '', lat: '', lon: '', coordsText: '', photos: [], tags: [], createdAt: new Date().toISOString() })
function mapSrc(address, key) {
  const q = encodeURIComponent(address)
  return key ? `https://www.google.com/maps/embed/v1/place?key=${key}&q=${q}` : `https://www.google.com/maps?q=${q}&output=embed`
}

export default function LocationsAll({ embedded = false } = {}) {
  const { state, update } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const editable = can(user, 'locations', 'edit')
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [selected, setSelected] = useState('')
  const [draft, setDraft] = useState(null)
  const locs = state.library.locations
  const projects = visibleProjects(state, user)
  const list = locs
    .filter((l) => (type ? l.type === type : true))
    .filter((l) => matchText(q, l.name, l.address, l.type, l.contact, l.notes, (l.tags || []).join(' ')))
    .sort((a, b) => a.name.localeCompare(b.name))
  const loc = locs.find((l) => l.id === selected) || list[0]

  const save = () => {
    if (!draft.name.trim()) return toast('Name the location.', 'error')
    update((s) => {
      const i = s.library.locations.findIndex((l) => l.id === draft.id)
      if (i >= 0) s.library.locations[i] = draft
      else s.library.locations.push(draft)
      return s
    })
    setSelected(draft.id)
    setDraft(null)
    toast('Saved to the library', 'ok')
  }
  const remove = (l) => update((s) => {
    s.projects.forEach((pr) => pr.locations.forEach((x) => x.libraryId === l.id && delete x.libraryId))
    s.library.locations = s.library.locations.filter((x) => x.id !== l.id)
    return s
  })
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
    <div>
      {!embedded && (
        <PageHead title="Locations" sub={`${locs.length} locations in the company library`}>
          {editable && unlinked > 0 && <Button variant="ghost" onClick={collect}>Collect {unlinked} from projects</Button>}
          {editable && <Button variant="primary" onClick={() => setDraft(emptyLoc())}>Add location</Button>}
        </PageHead>
      )}
      <div className="toolbar">
        {embedded && <span className="muted">{list.length} location{list.length === 1 ? '' : 's'}{unlinked > 0 && editable ? ` · ` : ''}{unlinked > 0 && editable && <button className="link" onClick={collect}>collect {unlinked} from projects</button>}</span>}
        <div className="toolbar-actions">
          <Input className="input search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, address, notes…" />
          <Select value={type} onChange={(e) => setType(e.target.value)} options={[['', 'All types'], ...TYPES.map((t) => [t, t])]} />
          {embedded && editable && <Button variant="primary" onClick={() => setDraft(emptyLoc())}>Add location</Button>}
        </div>
      </div>

      {!list.length ? (
        <Empty title={locs.length ? 'No matches' : 'The database is empty'}>
          {locs.length ? 'Try another search.' : 'Locations you add inside a project land here automatically. Scouted places you have not used yet can be added directly.'}
        </Empty>
      ) : (
        <div className="loc-layout">
          <ul className="loc-list">
            {list.map((l) => (
              <li key={l.id}>
                <button className={`loc-item ${loc?.id === l.id ? 'on' : ''}`} onClick={() => setSelected(l.id)}>
                  {l.photos?.[0]?.thumb && <img className="loc-thumb" src={l.photos[0].thumb} alt="" />}
                  <strong>{l.name}</strong>
                  <span className="muted small">{l.type}{l.address ? ` · ${l.address}` : ''}</span>
                </button>
              </li>
            ))}
          </ul>
          {loc && (
            <div className="loc-detail">
              {loc.address ? (
                <iframe className="map" title={loc.name} src={mapSrc(loc.address, state.settings.mapsKey)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
              ) : (
                <div className="map map-empty muted">Add an address to see the map.</div>
              )}
              <div className="loc-info">
                <div className="panel-head">
                  <h2>{loc.name}</h2>
                  <div className="row-actions">
                    {loc.address && <a className="btn btn-ghost btn-sm" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`} target="_blank" rel="noreferrer">Open in Maps</a>}
                    {editable && <Button size="sm" onClick={() => setDraft({ ...loc })}>Edit</Button>}
                    {editable && <Confirm onConfirm={() => { remove(loc); setSelected('') }} />}
                  </div>
                </div>
                <dl className="details">
                  <dt>Type</dt><dd>{loc.type}</dd>
                  <dt>Address</dt><dd>{loc.address || '–'}</dd>
                  {loc.contact && (<><dt>Contact</dt><dd>{loc.contact} {loc.phone && <a href={`tel:${loc.phone}`}>{loc.phone}</a>}</dd></>)}
                  <dt>Used in</dt>
                  <dd>
                    {locationProjects(projects, loc.id).length ? locationProjects(projects, loc.id).map((p) => <Link key={p.id} className="proj-link" to={`/p/${p.id}/locations`} style={{ '--pc': p.color }}>{p.title}</Link>) : <span className="muted">No project yet</span>}
                  </dd>
                </dl>
                {loc.notes && <p className="notes-text">{loc.notes}</p>}
                <PhotoGrid photos={loc.photos || []} projectId="library" ownerId={loc.id} editable={editable} onChange={(photos) => setPhotos(loc.id, photos)} />
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={!!draft} title={draft && locs.some((l) => l.id === draft.id) ? 'Edit location' : 'New location'} onClose={() => setDraft(null)}
        footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save location</Button></>}>
        {draft && (
          <div className="stack">
            <div className="row-2">
              <Field label="Name"><Input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
              <Field label="Type"><Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} options={TYPES} /></Field>
            </div>
            <Field label="Address"><Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></Field>
            <Field label="Coordinates" hint="Optional. Paste a Google Maps link or lat, lon.">
              <Input value={draft.lat && draft.lon ? `${draft.lat}, ${draft.lon}` : draft.coordsText || ''} onChange={(e) => { const c = coordsFromText(e.target.value); setDraft({ ...draft, coordsText: e.target.value, lat: c ? c.lat : '', lon: c ? c.lon : '' }) }} placeholder="37.9838, 23.7275" />
            </Field>
            <div className="row-2">
              <Field label="Contact"><Input value={draft.contact} onChange={(e) => setDraft({ ...draft, contact: e.target.value })} /></Field>
              <Field label="Phone"><Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
            </div>
            <Field label="Notes"><Textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Permits, parking, power, noise, best hours, fees" /></Field>
            <Field label="Tags" hint="Comma separated: rooftop, sea view, free parking"><Input value={(draft.tags || []).join(', ')} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  )
}
