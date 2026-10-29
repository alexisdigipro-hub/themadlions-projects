import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { Modal, useIsMobile } from '../components/ui.jsx'
import { can, canAccessProject, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { hydrateProject } from '../lib/library.js'
import { nameParts } from '../lib/projectName.js'
import Presentation from './project/Presentation.jsx'

/* Presentations in the Organizer (Alex, 24 Oct: "take the presentation out of the projects, into Organizer /
   Office"). Each project still keeps its own deck (project.deck, as before, so nothing moves in the data);
   /office/decks lists every project's presentation as tiles, New presentation picks the project, and
   /office/deck/<project> is the editor that was the project's Presentation tab. */
const slidesOf = (p) => (p.deck?.slides || []).length

export default function Presentations() {
  const { state } = useStore()
  const user = useCurrentUser()
  const nav = useNavigate()
  const mobile = useIsMobile()
  const [picking, setPicking] = useState(false)
  const [q, setQ] = useState('')
  const projects = visibleProjects(state, user)
  const mayEdit = can(user, 'projects', 'edit')
  const decks = projects.filter((p) => slidesOf(p) > 0)
  const name = (p) => { const { artist, shortTitle } = nameParts(p); return [artist, shortTitle].filter(Boolean).join(' - ') || p.title || 'Untitled' }
  const found = (list) => list.filter((p) => !q.trim() || name(p).toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div className="decks-page">
      <div className="decks-top">
        <Link to="/office" className="decks-back" aria-label="Back to Documents" title="Documents">‹</Link>
        <h1>Presentations</h1>
        <span className="decks-count">{decks.length}</span>
        <label className="decks-search"><input type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        {mayEdit && <button type="button" className="btn btn-primary decks-new" onClick={() => setPicking(true)}>{mobile ? '+' : '+ New presentation'}</button>}
      </div>
      {decks.length ? (
        <div className="decks-grid">
          {found(decks).map((p) => (
            <Link key={p.id} to={`/office/deck/${p.id}`} className="deck-tile">
              <span className="deck-tile-cover" style={p.coverThumb ? { backgroundImage: `url("${p.coverThumb}")` } : { background: p.color }} />
              <span className="deck-tile-body">
                <span className="deck-tile-proj"><i style={{ background: p.color }} />{p.category}</span>
                <strong>{name(p)}</strong>
                <span className="deck-tile-chips"><span>{slidesOf(p)} slides</span></span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="decks-empty">
          <b>No presentation yet</b>
          <span>A moodboard or treatment for a project, drawn in the house style, shared as a link or a PDF.</span>
          {mayEdit && <button type="button" className="btn btn-primary" onClick={() => setPicking(true)}>New presentation</button>}
        </div>
      )}
      <Modal open={picking} title="Presentation for which project?" onClose={() => setPicking(false)}>
        <div className="decks-pick">
          {projects.filter((p) => can(user, 'projects', 'edit')).map((p) => (
            <button key={p.id} type="button" onClick={() => { setPicking(false); nav(`/office/deck/${p.id}`) }}>
              <span className="deck-pick-dot" style={p.coverThumb ? { backgroundImage: `url("${p.coverThumb}")` } : { background: p.color }} />
              <span><b>{name(p)}</b><small>{slidesOf(p) ? `${slidesOf(p)} slides` : 'no presentation yet'}</small></span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}

/* One project's presentation, full page under the Organizer */
export function DeckEditor() {
  const { pid } = useParams()
  const { state, updateProject, update } = useStore()
  const user = useCurrentUser()
  const raw = state.projects.find((p) => p.id === pid)
  if (!raw || !canAccessProject(user, pid)) return <Navigate to="/office/decks" replace />
  const project = hydrateProject(raw, state.library)
  const ctx = {
    project,
    user,
    edit: (fn) => updateProject(project.id, fn),
    canEdit: (key) => can(user, key, 'edit') && (!project.frozen || user?.role === 'admin'),
    library: state.library,
    editLibrary: (fn) => update((s) => { fn(s.library); return s }),
  }
  return (
    <div className="decks-page deck-editor-page">
      <div className="decks-top">
        <Link to="/office/decks" className="decks-back" aria-label="Back to Presentations" title="Presentations">‹</Link>
        <h1>{project.title}</h1>
        <Link to={`/p/${project.id}`} className="btn btn-ghost decks-proj">Open project</Link>
      </div>
      <section className="panel"><Presentation ctx={ctx} /></section>
    </div>
  )
}
