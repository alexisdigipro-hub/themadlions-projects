import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PinGate, ShareProblem, usePublicShare } from '../components/PublicGate.jsx'
import { respondToDelivery } from '../lib/shares.js'
import { applyThemeChoice } from '../lib/skin.js'
import { SUPABASE_KEY, SUPABASE_URL } from '../lib/supabaseConfig.js'

// capitals without Greek accents (Alex, 18 Nov: "if you make it capitals yourself, take the accents off"): ΓΙΩΡΓΟΣ, not ΓΙΏΡΓΟΣ
const upper = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u0307\u0309-\u036f]/g, '').toUpperCase()

/* A project for outside collaborators (Alex, 18 Nov; lib/projectShare.js). "Almost as we see it, everything we have
   put in, all but the budget", in the hub's own look (the theme of whoever shared it): the project's head with its
   progress, the song with its map and lyrics, the schedule, tasks, files & notes, script & breakdown, team,
   locations and gear, each a glass panel. Read only; the one thing to do is leave a comment. The song and the photos
   come one by one from the share-media function, for this link only, to hear and see, with no download offered. */

const fmt = (d, o = { day: 'numeric', month: 'short', year: 'numeric' }) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', o) : '')
const clock = (sec) => { const t = Math.max(0, Math.round(sec || 0)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }
const noMenu = (e) => e.preventDefault()

/* one file of the link, by the server; cached per page */
const cache = new Map()
function useMedia(token, item) {
  const key = item ? (item.fileid ? `pc:${item.fileid}` : `${item.b}:${item.path}`) : ''
  const [url, setUrl] = useState(() => (item?.inline ? item.inline : cache.get(key) || ''))
  useEffect(() => {
    if (!item || item.inline || !key) return undefined
    if (cache.get(key)) { setUrl(cache.get(key)); return undefined }
    let off = false
    let pin = ''
    try { pin = localStorage.getItem(`tml_pin_${token}`) || '' } catch { /* private window */ }
    fetch(`${SUPABASE_URL}/functions/v1/share-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ token, pin, fileid: item.fileid || 0, path: item.path || '', b: item.b || '' }),
    }).then((r) => r.json()).then((r) => { if (r?.url && !off) { cache.set(key, r.url); setUrl(r.url) } }).catch(() => {})
    return () => { off = true }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return url
}

function Photo({ token, item, className = '' }) {
  const url = useMedia(token, item)
  return <span className={`pjh-photo ${className}`}>{url && <img src={url} alt="" loading="lazy" draggable="false" onContextMenu={noMenu} />}</span>
}

/* each box folds into its head with the arrow on its right (Alex, 18 Nov: "an arrow there too, so it is not all
   poured downwards"), remembered on that device */
const FOLDS = 'tml_pj_folds2'
// folded until the person opens one (Alex, 18 Nov: "in the links the sections folded, they open them with the arrows")
const foldedOf = (k) => { try { const v = JSON.parse(localStorage.getItem(FOLDS) || '{}')[k]; return v === undefined ? true : !!v } catch { return true } }
const keepFold = (k, v) => { try { const m = JSON.parse(localStorage.getItem(FOLDS) || '{}'); m[k] = v ? 1 : 0; localStorage.setItem(FOLDS, JSON.stringify(m)) } catch { /* private window */ } }
const CHEV = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
function Panel({ title, aside, extra, children, className = '', fold = true }) {
  const [shut, setShut] = useState(() => fold && !!title && foldedOf(title))
  const set = (v) => { setShut(v); keepFold(title, v) }
  return (
    <section className={`pjh-panel ${className}${shut ? ' shut' : ''}`}>
      {title && (
        <header className="pjh-panel-head">
          <h2>{title}</h2>
          <span className="pjh-head-end">
            {extra}
            {aside && <span className="pjh-aside">{aside}</span>}
            {fold && <button type="button" className="pjh-fold" onClick={() => set(!shut)} aria-expanded={!shut} aria-label={shut ? `Open ${title}` : `Fold ${title}`}>{CHEV}</button>}
          </span>
        </header>
      )}
      <div className="pjh-panel-body">{children}</div>
    </section>
  )
}

export default function PublicProject() {
  const { token } = useParams()
  const { share, tryPin, pinErr } = usePublicShare(token)
  const look = share?.data?.look
  useEffect(() => { applyThemeChoice(look || 'glassdark'); document.documentElement.classList.add('pjh-page'); return () => document.documentElement.classList.remove('pjh-page') }, [look])

  if (share === undefined) return <div className="pub"><p className="pub-loading">Loading…</p></div>
  if (share?.closed) return <div className="pub"><div className="pub-card"><h1>This link is closed</h1><p className="muted">The production has closed this page. Ask them for a fresh one.</p></div></div>
  if (share?.locked) return <PinGate onTry={tryPin} err={pinErr} what="this project" />
  if (share?.error) return <ShareProblem error={share.error} />
  if (!share || share.kind !== 'project') return <div className="pub"><div className="pub-card"><h1>This link has expired</h1><p className="muted">Ask the production for a fresh one.</p></div></div>

  const d = share.data || {}
  const updated = share.updated_at ? new Date(share.updated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
  const name = d.shortTitle || d.title

  return (
    <div className="pjh">
      <div className="pjh-wrap">
        <div className="pjh-top">
          <span className="pjh-brand">{(d.company?.name || 'THEMADLIONS').toUpperCase()}</span>
          <span className="pjh-shared">Shared project{updated ? ` · updated ${updated}` : ''}</span>
        </div>

        <Panel className="pjh-hero">
          <div className="pjh-hero-row">
            {d.cover ? <img className="pjh-cover" src={d.cover} alt="" draggable="false" onContextMenu={noMenu} /> : <span className="pjh-cover pjh-cover-none" style={{ background: d.color || undefined }} />}
            <div className="pjh-hero-text">
              {d.artist && <p className="pjh-artist">{upper(d.artist)}</p>}
              <h1>{name}</h1>
              <p className="pjh-meta">{[d.client, d.category, d.status, d.code].filter(Boolean).join(' · ')}</p>
              {(d.startDate || d.director || d.producer) && (
                <p className="pjh-meta">{[d.startDate ? `${fmt(d.startDate)}${d.endDate && d.endDate !== d.startDate ? ` to ${fmt(d.endDate)}` : ''}` : '', d.director ? `Director ${d.director}` : '', d.producer ? `Producer ${d.producer}` : ''].filter(Boolean).join(' · ')}</p>
              )}
            </div>
            {d.progress && <span className="pjh-pct">{d.progress.pct}%</span>}
          </div>
          {d.progress && (
            <>
              <div className="pjh-bar"><i style={{ width: `${d.progress.pct}%` }} /></div>
              <div className="pjh-stages">
                {d.progress.stages.map((s, i) => <span key={i} className={`pjh-chip${s.done >= 100 ? ' done' : s.done > 0 ? ' part' : ''}`}><i />{s.label}{s.done > 0 && s.done < 100 ? ` ${s.done}%` : ''}</span>)}
              </div>
            </>
          )}
        </Panel>

        {d.music && (d.music.tracks.length > 0 || d.music.sections.length > 0) && <Song token={token} music={d.music} />}

        {d.days?.length > 0 && (
          <Panel title="Schedule" aside={`${d.days.length} day${d.days.length === 1 ? '' : 's'}`}>
            <ul className="pjh-list">
              {d.days.map((x, i) => (
                <li key={i} className="pjh-row">
                  <b>{fmt(x.date, { weekday: 'short', day: 'numeric', month: 'short' })}</b>
                  <span className="pjh-dim">{[x.call && x.wrap ? `${x.call} to ${x.wrap}` : x.call, x.where, x.unit].filter(Boolean).join(' · ')}</span>
                  {x.blocks?.length > 0 && (
                    <ul className="pjh-blocks">{x.blocks.map((b, j) => <li key={j}><span className="pjh-time">{b.time}{b.end ? `–${b.end}` : ''}</span>{b.item}{b.owner ? <span className="pjh-dim"> · {b.owner}</span> : null}</li>)}</ul>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {d.tasks?.length > 0 && <Tasks tasks={d.tasks} />}

        {(d.notes || d.links?.length > 0) && (
          <Panel title="Files & notes">
            {d.notes && <p className="pjh-notes">{d.notes}</p>}
            {d.links?.length > 0 && (
              <div className="pjh-links">
                {d.links.map((l, i) => <a key={i} className="pjh-link" href={l.url} target="_blank" rel="noreferrer noopener"><b>{l.title}</b><span className="pjh-dim">{[l.kind, l.note].filter(Boolean).join(' · ')}</span></a>)}
              </div>
            )}
          </Panel>
        )}

        {(d.script || d.scenes?.length > 0) && <Script text={d.script} scenes={d.scenes || []} />}

        {d.team?.length > 0 && (
          <Panel title="Team" aside={`${d.team.length}`}>
            <div className="pjh-people">
              {[...d.team.filter((c) => c.kind === 'cast'), ...d.team.filter((c) => c.kind !== 'cast')].map((c, i) => (
                <div key={i} className="pjh-person">
                  {c.photos?.[0] ? <Photo token={token} item={c.photos[0]} className="round" /> : <span className="pjh-photo round pjh-initial">{(c.name || '?').slice(0, 1)}</span>}
                  <span><b>{c.name}</b><small>{c.kind === 'cast' ? (c.character ? `as ${c.character}` : 'Cast') : c.role || c.dept}</small></span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {d.locations?.length > 0 && (
          <Panel title="Locations" aside={`${d.locations.length}`}>
            <div className="pjh-places">
              {d.locations.map((l, i) => (
                <div key={i} className="pjh-place">
                  {l.photos?.length > 0 && <div className="pjh-strip">{l.photos.slice(0, 6).map((ph, j) => <Photo key={j} token={token} item={ph} />)}</div>}
                  <b>{l.name}</b>
                  <span className="pjh-dim">{[l.type, l.address].filter(Boolean).join(' · ')}</span>
                  {l.notes && <p className="pjh-small">{l.notes}</p>}
                </div>
              ))}
            </div>
          </Panel>
        )}

        {d.gear?.length > 0 && (
          <Panel title="Gear" aside={`${d.gear.length}`}>
            <ul className="pjh-list">
              {d.gear.map((g, i) => <li key={i} className="pjh-row pjh-row-line"><b>{g.item}{g.qty > 1 ? ` ×${g.qty}` : ''}</b><span className="pjh-dim">{g.category}</span>{g.status && <span className={`pjh-chip small s-${g.status}`}>{g.status}</span>}</li>)}
            </ul>
          </Panel>
        )}

        <Comment token={token} />
      </div>
    </div>
  )
}

/* the song: a player (heard, not downloaded), its waveform, and the song map with the lyrics */
function Song({ token, music }) {
  const tracks = music.tracks || []
  const [tid, setTid] = useState(music.active && tracks.some((t) => t.id === music.active) ? music.active : tracks[0]?.id)
  const track = tracks.find((t) => t.id === tid)
  const url = useMedia(token, track && (track.fileid || track.path) ? track : null)
  const audio = useRef(null)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const dur = track?.duration || audio.current?.duration || 0
  const peaks = useMemo(() => {
    const p = track?.peaks || []
    if (!p.length) return []
    const n = 120, out = []
    for (let i = 0; i < n; i++) out.push(p[Math.floor((i / n) * p.length)] || 0)
    return out
  }, [track])
  const seek = (sec, go = true) => { const a = audio.current; if (!a) return; a.currentTime = sec; if (go) a.play().catch(() => {}) }
  const toggle = () => { const a = audio.current; if (!a) return; if (a.paused) a.play().catch(() => {}); else a.pause() }
  const now = music.sections.find((s) => time >= s.start && time < s.end)
  return (
    <>
    <Panel title="Song" extra={tracks.length > 1 && (
        <span className="pjh-seg">{tracks.map((t) => <button key={t.id} type="button" className={t.id === tid ? 'on' : ''} onClick={() => { setTid(t.id); setPlaying(false); setTime(0) }}>{t.name}</button>)}</span>
      )}>
      {track && (
        <div className="pjh-player">
          <button type="button" className="pjh-play" onClick={toggle} disabled={!url} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <svg viewBox="0 0 24 24"><rect x="7" y="5" width="3.5" height="14" rx="1" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" /></svg> : <svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" /></svg>}
          </button>
          <div className="pjh-wave" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); if (dur) seek(((e.clientX - r.left) / r.width) * dur) }}>
            {peaks.length ? peaks.map((v, i) => <i key={i} className={dur && (i / peaks.length) * dur <= time ? 'on' : ''} style={{ height: `${Math.max(8, v * 100)}%` }} />) : <span className="pjh-dim">{track.name}</span>}
          </div>
          <span className="pjh-time">{clock(time)} / {clock(dur)}</span>
          {url && <audio ref={audio} src={url} preload="metadata" controlsList="nodownload" onContextMenu={noMenu} onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />}
        </div>
      )}
    </Panel>
    {music.sections.length > 0 && (
      <Panel title="Lyrics Per Section" aside={`${music.sections.length} section${music.sections.length === 1 ? '' : 's'}`}>
        <ol className="pjh-map">
          {music.sections.map((s, i) => (
            <li key={i} className={now === s ? 'now' : ''}>
              <button type="button" className="pjh-mini-play" onClick={() => seek(s.start)} disabled={!url} aria-label={`Play ${s.name}`}><svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" /></svg></button>
              <div><b>{s.name}</b><span className="pjh-dim"> {clock(s.start)} to {clock(s.end)}</span>{s.lyrics && <p className="pjh-lyrics">{s.lyrics}</p>}</div>
            </li>
          ))}
        </ol>
      </Panel>
    )}
    </>
  )
}

function Tasks({ tasks }) {
  const open = tasks.filter((t) => !t.done), done = tasks.filter((t) => t.done)
  return (
    <Panel title="Tasks" aside={`${done.length} of ${tasks.length} done`}>
      <ul className="pjh-list">
        {[...open, ...done].map((t, i) => (
          <li key={i} className={`pjh-row pjh-task${t.done ? ' done' : ''}`}>
            <span className="pjh-check">{t.done && <svg viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9" /></svg>}</span>
            <span className="pjh-task-text"><b>{t.title}</b>{t.notes && <small>{t.notes}</small>}</span>
            <span className="pjh-dim">{[t.who, t.dept, t.due ? `due ${fmt(t.due, { day: 'numeric', month: 'short' })}` : ''].filter(Boolean).join(' · ')}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function Script({ text, scenes }) {
  const [show, setShow] = useState(false)
  return (
    <Panel title="Script & Breakdown" aside={scenes.length ? `${scenes.length} scene${scenes.length === 1 ? '' : 's'}` : ''}>
      {scenes.length > 0 && (
        <ul className="pjh-list">
          {scenes.map((s, i) => (
            <li key={i} className="pjh-row pjh-scene">
              <span className="pjh-num">{s.number}</span>
              <span className="pjh-task-text"><b>{s.heading}</b>{s.synopsis && <small>{s.synopsis}</small>}{s.characters?.length > 0 && <span className="pjh-tags">{s.characters.map((c, j) => <span key={j} className="pjh-chip small">{c}</span>)}</span>}</span>
              {s.time && <span className="pjh-dim">{s.time}</span>}
            </li>
          ))}
        </ul>
      )}
      {text && (
        <>
          <button type="button" className="pjh-pill" onClick={() => setShow(!show)}>{show ? 'Hide the script' : 'Read the script'}</button>
          {show && <pre className="pjh-script">{text}</pre>}
        </>
      )}
    </Panel>
  )
}

/* the one thing a collaborator can do: leave a comment (share_respond 'comment', project_share.sql) */
function Comment({ token }) {
  const [name, setName] = useState(() => { try { return localStorage.getItem('tml_pj_name') || '' } catch { return '' } })
  const [note, setNote] = useState('')
  const [state, setState] = useState('') // '' | 'sending' | 'sent' | error text
  const send = async (e) => {
    e.preventDefault()
    if (!note.trim()) return
    setState('sending')
    try {
      try { localStorage.setItem('tml_pj_name', name) } catch { /* private window */ }
      await respondToDelivery({ token, name: name.trim(), status: 'comment', note: note.trim() })
      setNote(''); setState('sent')
    } catch (err) { setState(err.message || 'Could not send it. Try again.') }
  }
  return (
    <Panel title="Leave a comment" className="pjh-comment" fold={false}>
      <form onSubmit={send}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={120} autoComplete="name" />
        <textarea className="input" rows={4} value={note} onChange={(e) => { setNote(e.target.value); if (state === 'sent') setState('') }} placeholder="Your comment for the team" maxLength={4000} />
        <div className="pjh-send">
          {state === 'sent' && <span className="pjh-ok">Thank you, the team has it.</span>}
          {state && state !== 'sent' && state !== 'sending' && <span className="pjh-err">{state}</span>}
          <button type="submit" className="pjh-pill main" disabled={state === 'sending' || !note.trim()}>{state === 'sending' ? 'Sending…' : 'Send comment'}</button>
        </div>
      </form>
    </Panel>
  )
}
