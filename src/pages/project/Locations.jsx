import { useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import { useProject } from '../Project.jsx'
import { uid, useStore } from '../../lib/store.jsx'
import { coordsFromText } from '../../lib/sun.js'

const TYPES = ['Studio', 'Interior', 'Exterior', 'Office', 'Base camp', 'Parking', 'Hospital', 'Other']

function mapSrc(address, key) {
  const q = encodeURIComponent(address)
  if (key) return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${q}`
  return `https://www.google.com/maps?q=${q}&output=embed`
}

export default function Locations() {
  const { project, edit, canEdit } = useProject()
  const { state } = useStore()
  const toast = useToast()
  const [draft, setDraft] = useState(null)
  const [selected, setSelected] = useState(project.locations[0]?.id || '')
  const editable = canEdit('locations')
  const loc = project.locations.find((l) => l.id === selected) || project.locations[0]

  const scenesAt = (l) => project.scenes.filter((s) => l.sceneLocations?.includes(s.location) || (s.location && l.name && s.location.toUpperCase() === l.name.toUpperCase()))

  const save = () => {
    if (!draft.name.trim()) return toast('Name the location.', 'error')
    edit((p) => {
      const i = p.locations.findIndex((l) => l.id === draft.id)
      if (i >= 0) p.locations[i] = draft
      else p.locations.push(draft)
    })
    setSelected(draft.id)
    setDraft(null)
    toast('Location saved', 'ok')
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
            <Button variant="primary" onClick={() => setDraft({ id: uid(), name: '', address: '', type: 'Interior', notes: '', contact: '', phone: '', sceneLocations: [] })}>
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
                  <h2>{loc.name}</h2>
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
            <Field label="Notes">
              <Textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Access, parking, power, permits, noise, neighbours" />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  )
}
