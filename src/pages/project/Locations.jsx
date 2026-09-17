import { useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { uid, useStore } from '../../lib/store.jsx'
import { coordsFromText } from '../../lib/sun.js'
import PhotoGrid from '../../components/PhotoGrid.jsx'
import { locationToLibrary, matchText, sharedLocation } from '../../lib/library.js'

const TYPES = ['Studio', 'Interior', 'Exterior', 'Office', 'Base camp', 'Parking', 'Hospital', 'Other']

function mapSrc(address, key) {
  const q = encodeURIComponent(address)
  if (key) return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${q}`
  return `https://www.google.com/maps?q=${q}&output=embed`
}

export default function Locations() {
  const { project, edit, canEdit, library, editLibrary } = useProject()
  const { state } = useStore()
  const toast = useToast()
  const [draft, setDraft] = useState(null)
  const [pick, setPick] = useState(null)
  const inLibrary = new Set(project.locations.map((l) => l.libraryId).filter(Boolean))
  const libChoices = (library?.locations || []).filter((l) => !inLibrary.has(l.id)).filter((l) => matchText(pick?.q, l.name, l.address, l.type, (l.tags || []).join(' ')))
  const addFromLibrary = () => {
    const chosen = libChoices.filter((l) => pick.sel.includes(l.id))
    if (!chosen.length) return
    const first = chosen[0]?.id
    let newId = ''
    edit((p) => {
      chosen.forEach((l) => { const id = uid(); if (l.id === first) newId = id; p.locations.push({ id, libraryId: l.id, ...sharedLocation(l), sceneLocations: [] }) })
    })
    setSelected(newId)
    setPick(null)
    toast(`${chosen.length} added from the library`, 'ok')
  }
  const [selected, setSelected] = useState(project.locations[0]?.id || '')
  const editable = canEdit('locations')
  const loc = project.locations.find((l) => l.id === selected) || project.locations[0]

  const scenesAt = (l) => project.scenes.filter((s) => l.sceneLocations?.includes(s.location) || (s.location && l.name && s.location.toUpperCase() === l.name.toUpperCase()))

  const save = () => {
    if (!draft.name.trim()) return toast('Name the location.', 'error')
    const { saveToLibrary, ...l } = draft
    let libraryId = l.libraryId
    if (libraryId) {
      editLibrary((lib) => { const x = lib.locations.find((y) => y.id === libraryId); if (x) Object.assign(x, sharedLocation(l)) })
    } else if (saveToLibrary) {
      const entry = locationToLibrary(l)
      libraryId = entry.id
      editLibrary((lib) => lib.locations.push(entry))
    }
    edit((p) => {
      const item = { ...l, libraryId }
      const i = p.locations.findIndex((x) => x.id === l.id)
      if (i >= 0) p.locations[i] = item
      else p.locations.push(item)
    })
    setSelected(l.id)
    setDraft(null)
    toast(libraryId ? 'Location saved (shared in the company library)' : 'Location saved', 'ok')
  }
  const setLocPhotos = (loc, photos) => {
    if (loc.libraryId) editLibrary((lib) => { const x = lib.locations.find((y) => y.id === loc.libraryId); if (x) x.photos = photos })
    else edit((p) => { const x = p.locations.find((y) => y.id === loc.id); if (x) x.photos = photos })
  }

  const scriptSets = [...new Set(project.scenes.map((s) => s.location).filter(Boolean))]

  return (
    <div className="locations">
      <div className="toolbar">
        <div className="toolbar-info">
          <strong>{project.locations.length} locations</strong>
          {scriptSets.length > 0 && <span className="muted">{scriptSets.length} sets in the script</span>}
        </div>
        {editable && (
          <div className="toolbar-actions">
            {(library?.locations || []).length > 0 && <Button onClick={() => setPick({ q: '', sel: [] })}>From library</Button>}
            <Button variant="primary" onClick={() => setDraft({ id: uid(), name: '', address: '', type: 'Interior', notes: '', contact: '', phone: '', sceneLocations: [], saveToLibrary: true })}>
              Add location
            </Button>
          </div>
        )}
      </div>

      {project.locations.length === 0 ? (
        <Empty title="No locations yet">Add the studio, real locations, base camp and the nearest hospital. Each one gets a map and goes on the call sheet.</Empty>
      ) : (
        <div className="loc-layout">
          <ul className="loc-list">
            {project.locations.map((l) => (
              <li key={l.id}>
                <button className={`loc-item ${loc?.id === l.id ? 'on' : ''}`} onClick={() => setSelected(l.id)}>
                  {l.photos?.[0]?.thumb && <img className="loc-thumb" src={l.photos[0].thumb} alt="" />}
                  <strong>{l.name}</strong>
                  <span className="muted small">
                    {l.type}
                    {l.address ? ` · ${l.address}` : ''}
                  </span>
                  {scenesAt(l).length > 0 && <span className="small">{scenesAt(l).length} scenes</span>}
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
                  <h2>{loc.name}{loc.libraryId && <span className="lib-badge" title="Shared in the company library">library</span>}</h2>
                  <div className="row-actions">
                    {loc.address && (
                      <a className="btn btn-ghost btn-sm" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`} target="_blank" rel="noreferrer">
                        Open in Maps
                      </a>
                    )}
                    {loc.address && (
                      <a className="btn btn-ghost btn-sm" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.address)}`} target="_blank" rel="noreferrer">
                        Directions
                      </a>
                    )}
                    {editable && (
                      <>
                        <Button size="sm" onClick={() => setDraft({ sceneLocations: [], ...loc })}>
                          Edit
                        </Button>
                        <Confirm
                          onConfirm={() => {
                            edit((p) => {
                              p.locations = p.locations.filter((x) => x.id !== loc.id)
                              p.shootingDays.forEach((d) => d.locationId === loc.id && (d.locationId = ''))
                            })
                            setSelected('')
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
                <dl className="details">
                  <dt>Type</dt>
                  <dd>{loc.type}</dd>
                  <dt>Address</dt>
                  <dd>{loc.address || '–'}</dd>
                  {loc.contact && (
                    <>
                      <dt>Contact</dt>
                      <dd>
                        {loc.contact} {loc.phone && <a href={`tel:${loc.phone}`}>{loc.phone}</a>}
                      </dd>
                    </>
                  )}
                  {loc.sceneLocations?.length > 0 && (
                    <>
                      <dt>Script sets</dt>
                      <dd>{loc.sceneLocations.join(', ')}</dd>
                    </>
                  )}
                </dl>
                {loc.notes && <p className="notes-text">{loc.notes}</p>}
                {scenesAt(loc).length > 0 && (
                  <p className="small muted">Scenes here: {scenesAt(loc).map((s) => s.number).join(', ')}</p>
                )}
                <PhotoGrid
                  photos={loc.photos || []}
                  projectId={loc.libraryId ? 'library' : project.id}
                  ownerId={loc.libraryId || loc.id}
                  editable={editable}
                  onChange={(photos) => setLocPhotos(loc, photos)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        open={!!draft}
        title={project.locations.some((l) => l.id === draft?.id) ? 'Edit location' : 'New location'}
        onClose={() => setDraft(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              Save location
            </Button>
          </>
        }
      >
        {draft && (
          <div className="stack">
            <div className="row-2">
              <Field label="Name">
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus placeholder="Bunker set, Rooftop, Base camp" />
              </Field>
              <Field label="Type">
                <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} options={TYPES} />
              </Field>
            </div>
            <Field label="Address" hint="Anything Google Maps can find: street, landmark or coordinates.">
              <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            </Field>
            <Field label="Coordinates" hint="Optional. Paste a Google Maps link or lat, lon. Used for sunrise, sunset and weather on the call sheet.">
              <Input
                value={draft.lat && draft.lon ? `${draft.lat}, ${draft.lon}` : draft.coordsText || ''}
                onChange={(e) => {
                  const c = coordsFromText(e.target.value)
                  setDraft({ ...draft, coordsText: e.target.value, lat: c ? c.lat : '', lon: c ? c.lon : '' })
                }}
                placeholder="37.9838, 23.7275 or https://maps.google.com/…"
              />
            </Field>
            <div className="row-2">
              <Field label="Contact">
                <Input value={draft.contact} onChange={(e) => setDraft({ ...draft, contact: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </Field>
            </div>
            {scriptSets.length > 0 && (
              <div className="field">
                <span className="field-label">Which script sets shoot here</span>
                <div className="chips">
                  {scriptSets.map((s) => {
                    const on = draft.sceneLocations?.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        className={`chip ${on ? 'on' : ''}`}
                        onClick={() => setDraft({ ...draft, sceneLocations: on ? draft.sceneLocations.filter((x) => x !== s) : [...(draft.sceneLocations || []), s] })}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {draft.libraryId ? (
              <p className="fineprint">Name, address, type, contact, coordinates, notes and photos are shared from the company library. Changes here update every project. Script sets belong to this project.</p>
            ) : (
              <label className="check">
                <input type="checkbox" checked={draft.saveToLibrary !== false} onChange={(e) => setDraft({ ...draft, saveToLibrary: e.target.checked })} />
                Also keep in the company library for future projects
              </label>
            )}
            <Field label="Notes">
              <Textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Access, parking, power, permits, noise, neighbours" />
            </Field>
          </div>
        )}
      </Modal>
      <Modal open={!!pick} title="Add locations from the library" onClose={() => setPick(null)}
        footer={<><Button variant="ghost" onClick={() => setPick(null)}>Cancel</Button><Button variant="primary" disabled={!pick?.sel.length} onClick={addFromLibrary}>Add {pick?.sel.length || ''}</Button></>}>
        {pick && (
          <div className="stack">
            <Input autoFocus value={pick.q} onChange={(e) => setPick({ ...pick, q: e.target.value })} placeholder="Search…" />
            <ul className="lib-pick">
              {libChoices.map((l) => {
                const on = pick.sel.includes(l.id)
                return (
                  <li key={l.id} className={on ? 'on' : ''} onClick={() => setPick({ ...pick, sel: on ? pick.sel.filter((x) => x !== l.id) : [...pick.sel, l.id] })}>
                    {l.photos?.[0]?.thumb ? <img className="avatar-img" src={l.photos[0].thumb} alt="" /> : null}
                    <span className="grow"><strong>{l.name}</strong><div className="muted small">{[l.type, l.address].filter(Boolean).join(' · ')}</div></span>
                    <input type="checkbox" checked={on} readOnly />
                  </li>
                )
              })}
              {!libChoices.length && <li className="muted">Every matching location is already in this project.</li>}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  )
}
