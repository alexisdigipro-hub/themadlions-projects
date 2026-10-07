import { useEffect, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { uid, useStore } from '../../lib/store.jsx'
import { coordsFromText } from '../../lib/sun.js'
import PhotoGrid from '../../components/PhotoGrid.jsx'
import { locationToLibrary, matchText, sharedLocation } from '../../lib/library.js'

const TYPES = ['Studio', 'Interior', 'Exterior', 'INT. & EXT.', 'Office', 'Base camp', 'Parking', 'Hospital', 'Other']
const initials = (n) => (n || '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()

function mapSrc(address, key) {
  const q = encodeURIComponent(address)
  if (key) return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${q}`
  return `https://www.google.com/maps?q=${q}&output=embed`
}

/* A section of the project's Database page (People.jsx). Kept compact: a small card grid here,
   same look as the Crew/Cast cards; the map, directions and full detail sit behind a click in a
   modal instead of an always-open side panel, so this section doesn't dominate the page. */
const emptyLocation = () => ({ id: uid(), name: '', address: '', type: 'Interior', notes: '', contact: '', phone: '', sceneLocations: [], saveToLibrary: true })

/* On the Project Database an empty card is noise, so `hideEmpty` draws nothing until there is a
   location and `startSignal` (a counter the page bumps) opens the form from a button out there.
   Nothing else passes either. */
export default function Locations({ hideEmpty = false, startSignal = 0 }) {
  const { project, edit, canEdit, library, editLibrary } = useProject()
  const { state } = useStore()
  const toast = useToast()
  const [draft, setDraft] = useState(null)
  const [pick, setPick] = useState(null) // { q, sel }
  const [detailFor, setDetailFor] = useState('')
  const editable = canEdit('locations')
  const inLibrary = new Set(project.locations.map((l) => l.libraryId).filter(Boolean))
  const libChoices = (library?.locations || []).filter((l) => !inLibrary.has(l.id)).filter((l) => matchText(pick?.q, l.name, l.address, l.type, (l.tags || []).join(' ')))
  const addFromLibrary = () => {
    const chosen = libChoices.filter((l) => pick.sel.includes(l.id))
    if (!chosen.length) return
    edit((p) => {
      chosen.forEach((l) => p.locations.push({ id: uid(), libraryId: l.id, ...sharedLocation(l), sceneLocations: [] }))
    })
    setPick(null)
    toast(`${chosen.length} added from the library`, 'ok')
  }
  const scenesAt = (l) => project.scenes.filter((s) => s.location && l.sceneLocations?.includes(s.location))
  const save = () => {
    if (!draft.name.trim()) return toast('Name the location.', 'error')
    const { saveToLibrary, coordsText, ...l } = draft
    let libraryId = l.libraryId
    if (libraryId) {
      // shared fields live in the library
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
    setDraft(null)
    toast(libraryId ? 'Location saved (shared in the company library)' : 'Location saved', 'ok')
  }
  const setLocPhotos = (loc, photos) => {
    if (loc.libraryId) editLibrary((lib) => { const x = lib.locations.find((y) => y.id === loc.libraryId); if (x) x.photos = photos })
    else edit((p) => { const x = p.locations.find((y) => y.id === loc.id); if (x) x.photos = photos })
  }

  const scriptSets = [...new Set(project.scenes.map((s) => s.location).filter(Boolean))]
  const detail = project.locations.find((l) => l.id === detailFor)

  useEffect(() => { if (startSignal) setDraft(emptyLocation()) }, [startSignal])

  // Both the cards and the forms, so a button on the Project Database still has a form to
  // open while this card is hidden.
  const modals = (
    <>
      <Modal open={!!detail} wide title={detail?.name || ''} onClose={() => setDetailFor('')}>
        {detail && (
          <div className="stack">
            {detail.address ? (
              <iframe className="map" title={detail.name} src={mapSrc(detail.address, state.settings.mapsKey)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
            ) : (
              <div className="map map-empty muted">Add an address to see the map.</div>
            )}
            <div className="row-actions">
              {detail.address && (
                <a className="btn btn-ghost btn-sm" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detail.address)}`} target="_blank" rel="noreferrer">
                  Open in Maps
                </a>
              )}
              {detail.address && (
                <a className="btn btn-ghost btn-sm" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(detail.address)}`} target="_blank" rel="noreferrer">
                  Directions
                </a>
              )}
              {editable && (
                <>
                  <Button size="sm" onClick={() => { const d = detail; setDetailFor(''); setDraft({ sceneLocations: [], ...d }) }}>
                    Edit
                  </Button>
                  <Confirm
                    onConfirm={() => {
                      edit((p) => {
                        p.locations = p.locations.filter((x) => x.id !== detail.id)
                        p.shootingDays.forEach((d) => d.locationId === detail.id && (d.locationId = ''))
                      })
                      setDetailFor('')
                    }}
                  />
                </>
              )}
            </div>
            <dl className="details">
              <dt>Type</dt>
              <dd>{detail.type}</dd>
              <dt>Address</dt>
              <dd>{detail.address || '–'}</dd>
              {detail.contact && (
                <>
                  <dt>Contact</dt>
                  <dd>
                    {detail.contact} {detail.phone && <a href={`tel:${detail.phone}`}>{detail.phone}</a>}
                  </dd>
                </>
              )}
              {detail.sceneLocations?.length > 0 && (
                <>
                  <dt>Script sets</dt>
                  <dd>{detail.sceneLocations.join(', ')}</dd>
                </>
              )}
            </dl>
            {detail.notes && <p className="notes-text">{detail.notes}</p>}
            {scenesAt(detail).length > 0 && <p className="small muted">Scenes here: {scenesAt(detail).map((s) => s.number).join(', ')}</p>}
            <PhotoGrid
              photos={detail.photos || []}
              projectId={detail.libraryId ? 'library' : project.id}
              ownerId={detail.libraryId || detail.id}
              editable={editable}
              onChange={(photos) => setLocPhotos(detail, photos)}
            />
          </div>
        )}
      </Modal>

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
    </>
  )

  if (hideEmpty && !project.locations.length) return modals

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-info">
          <strong>Locations</strong> <span className="muted">{project.locations.length}</span>
        </div>
        {editable && (
          <div className="toolbar-actions">
            {(library?.locations || []).length > 0 && <Button variant="ghost" onClick={() => setPick({ q: '', sel: [] })}>From library</Button>}
            <Button variant="primary" onClick={() => setDraft(emptyLocation())}>
              Add location
            </Button>
          </div>
        )}
      </div>

      {project.locations.length === 0 ? (
        <Empty title="No locations yet">Add the studio, real locations, base camp and the nearest hospital. Each one gets a map and goes on the call sheet.</Empty>
      ) : (
        <div className="people-grid compact">
          {project.locations.map((l) => (
            <article key={l.id} className="person loc-card" onClick={() => setDetailFor(l.id)} role="button" tabIndex={0}>
              <div className="person-photo" aria-hidden="true">
                {l.photos?.[0]?.thumb ? <img src={l.photos[0].thumb} alt="" /> : <span className="person-initials">{initials(l.name) || '📍'}</span>}
              </div>
              <div className="person-body">
                <strong>{l.name}{l.libraryId && <span className="lib-badge" title="Shared in the company library">library</span>}</strong>
                <div className="small muted">{[l.type, l.address].filter(Boolean).join(' · ') || 'No address yet'}</div>
                {scenesAt(l).length > 0 && <div className="small muted">{scenesAt(l).length} scenes</div>}
              </div>
            </article>
          ))}
        </div>
      )}

      {modals}
    </>
  )
}
