// RoarList's window: shot lists on the left, the open one on the right as a list or a storyboard.
// The hub's copy (Alex, 27 Oct 2026): signed in as the hub member, the team's lists each tied to a hub project,
// the Shot list permission decides (view reads only). Keep it in step with the roarlist repository by hand.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MenuCommand, PrintMode, Project, ProjectSummary } from '../shared/api'
import { fmtDur, totals } from '../shared/print'
import { ASPECTS, printLabels, t } from './i18n'
import * as M from './model'
import { api, isWeb } from './api'
import { Board } from './components/Board'
import { Icon } from './components/Icon'
import { Img } from './components/Img'
import { SettingsSheet } from './components/SettingsSheet'
import { canEdit, hub, loadHub, projectName, ready, scope, type HubProject } from './hub'
import * as S from './settings'
import { Lens } from './ui'
import { ShotList } from './components/ShotList'


export type Ops = {
  edit: (fn: (p: Project) => Project, history?: boolean) => void
  setImage: (shotId: string, file: Blob) => void
  setActive: (shotId: string) => void
  addShot: (sceneId: string) => void
  addShotAfter: (shotId: string) => void
  addScene: () => void
  removeShot: (shotId: string) => void
  removeScene: (sceneId: string) => void
  moveScene: (sceneId: string, by: number) => void
}

type Toast = { text: string; undo?: boolean } | null

// a hub project fills the list's empty fields: title, client, director, DOP, shoot date (what is typed stays)
const fromProject = (x: Project, hp: HubProject): Project => ({
  ...x, projectId: hp.id,
  title: x.title || hp.name, client: x.client || hp.client, director: x.director || hp.director, dop: x.dop || hp.dop, date: x.date || hp.date,
})

// after React has drawn the new row: its description field
const later = (fn: () => void) => setTimeout(fn, 0)
const focusShot = (id: string) => later(() => {
  document.querySelector(`[data-shot="${id}"]`)?.classList.add('fresh')
  const row = document.querySelector(`[data-shot="${id}"]`)
  ;(row?.querySelector<HTMLElement>('textarea') || row?.querySelector<HTMLElement>('input:not([type=checkbox])'))?.focus()
})

const phone = () => window.matchMedia?.('(max-width: 820px)').matches

export default function App() {
  const [lists, setLists] = useState<ProjectSummary[] | null>(null)
  const [p, setP] = useState<Project | null>(null)
  const [view, setView] = useState<PrintMode>(() => (localStorage.getItem('view') as PrintMode) || 'list')
  const [menu, setMenu] = useState(false)
  const [sideOpen, setSideOpen] = useState(false)
  const [settings, setSettings] = useState<false | 'appearance' | 'keys'>(false)
  const [intro, setIntro] = useState(true)
  const [query, setQuery] = useState('')
  const [ctx, setCtx] = useState<{ id: string; x: number; y: number } | null>(null)
  const [sideW, setSideW] = useState(() => { try { return Number(localStorage.getItem('roarlist-side')) || 270 } catch { return 270 } })
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [toast, setToast] = useState<Toast>(null)
  const cur = useRef<Project | null>(null)
  const dirty = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const history = useRef<Project[]>([])
  const active = useRef<string>('')
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const say = (text: string, undo = false) => {
    setToast({ text, undo })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), undo ? 6000 : 2200)
  }

  const refresh = useCallback(async () => setLists(await api.list()), [])

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    if (!dirty.current || !cur.current) return
    dirty.current = false
    try {
      await api.save(cur.current)
    } catch {
      dirty.current = true // tried again with the next change or when the window loses focus
      say(t.offlineErr)
      return
    }
    refresh()
  }, [refresh])

  const put = useCallback((next: Project, record: boolean) => {
    if (!canEdit()) return // view only: nothing changes, nothing is saved
    if (record && cur.current) history.current = [...history.current.slice(-49), cur.current]
    cur.current = next
    setP(next)
    dirty.current = true
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, 400)
  }, [flush])

  const open = useCallback(async (id: string) => {
    await flush()
    const next = await api.get(id)
    history.current = []
    cur.current = next
    setP(next)
    if (next) localStorage.setItem('last', id)
  }, [flush])

  // a phone: back from a shot list to all of them (Alex, 28 Oct: "it does not go away, it does not close")
  const close = useCallback(async () => {
    await flush()
    history.current = []
    cur.current = null
    setP(null)
    setSideOpen(false)
  }, [flush])

  const create = useCallback(async () => {
    await flush()
    let next = await api.create('')
    // a list made inside a project starts with the project's name, client, director, DOP and date
    const hp = hub.projects.find((x) => x.id === next.projectId)
    if (hp) { next = fromProject(next, hp); await api.save(next) }
    // the defaults from Settings
    const d = S.get()
    if (d.aspect !== next.aspect || d.lens) {
      next = { ...next, aspect: d.aspect, scenes: next.scenes.map((sc) => ({ ...sc, shots: sc.shots.map((x) => ({ ...x, lens: d.lens })) })) }
      await api.save(next)
    }
    history.current = []
    cur.current = next
    setP(next)
    localStorage.setItem('last', next.id)
    await refresh()
    later(() => document.querySelector<HTMLInputElement>('.title')?.focus())
  }, [flush, refresh])

  const undo = useCallback(() => {
    const prev = history.current.pop()
    if (!prev || !cur.current || prev.id !== cur.current.id) return
    cur.current = prev
    setP(prev)
    dirty.current = true
    flush()
    setToast(null)
  }, [flush])

  const edit = (fn: (x: Project) => Project, record = false) => { if (cur.current) put(fn(cur.current), record) }

  const ops: Ops = {
    edit,
    setActive: (id) => { active.current = id },
    setImage: async (shotId, file) => {
      const pid = cur.current?.id
      if (!pid) return
      try {
        const name = await M.ingestImage(pid, file)
        if (cur.current?.id === pid) edit((x) => M.mapShot(x, shotId, (s) => ({ ...s, image: name })), true)
      } catch {
        say(t.imgError)
      }
    },
    addShot: (sceneId) => { if (!cur.current) return; const [n, id] = M.addShot(cur.current, sceneId); put(n, true); focusShot(id) },
    addShotAfter: (shotId) => {
      const sc = cur.current?.scenes.find((x) => x.shots.some((s) => s.id === shotId))
      if (!sc || !cur.current) return
      const [n, id] = M.addShot(cur.current, sc.id, shotId); put(n, true); focusShot(id)
    },
    addScene: () => {
      if (!cur.current) return
      const sc = M.newScene(M.nextSceneNumber(cur.current))
      put({ ...cur.current, scenes: [...cur.current.scenes, sc] }, true)
      later(() => document.querySelector<HTMLInputElement>('.scene:last-of-type .scene-heading')?.focus())
    },
    removeShot: (id) => {
      if (S.get().confirmDelete && !confirm(t.removeShotQ)) return
      edit((x) => M.removeShot(x, id), true); say(t.deleted, true)
    },
    removeScene: (id) => {
      const sc = cur.current?.scenes.find((x) => x.id === id)
      if (!sc) return
      if (sc.shots.some((s) => s.description || s.image) && !confirm(t.removeSceneQ)) return
      edit((x) => ({ ...x, scenes: x.scenes.filter((s) => s.id !== id) }), true)
      say(`${t.scene} ${sc.number}: ${t.deleted.toLowerCase()}`, true)
    },
    moveScene: (id, by) => edit((x) => M.moveScene(x, id, by), true),
  }
  const opsRef = useRef(ops)
  opsRef.current = ops

  const exportAs = async (kind: 'pdf' | 'board' | 'html' | 'file') => {
    setMenu(false)
    if (!cur.current) return
    await flush()
    const id = cur.current.id
    const ok = kind === 'file' ? await api.exportFile(id)
      : kind === 'html' ? await api.exportHtml(id, view, printLabels())
      : await api.exportPdf(id, kind === 'board' ? 'board' : 'list', printLabels())
    if (ok) say(t.exported)
  }

  const exportRef = useRef(exportAs)
  exportRef.current = exportAs

  const importFile = async () => {
    await flush()
    const n = await api.importFile()
    if (n) { await refresh(); open(n.id) }
  }

  // the shot lists, and the one open last time
  const start = useCallback(async () => {
    const all = await api.list()
    setLists(all)
    // on a phone it starts on the shot lists themselves (Alex, 28 Oct); on a computer the one open last time
    if (phone()) return
    const last = localStorage.getItem('last')
    const pick = all.find((x) => x.id === last) || all[0]
    if (pick) open(pick.id)
  }, [open])

  // the hub member (the hub's own sign-in), their Shot list permission and the projects, then the lists
  useEffect(() => {
    loadHub().then(async (ok) => {
      setAuthed(ok)
      if (ok && hub.level !== 'none') await start()
      ready()
    }).catch(() => { setAuthed(false); ready() })
  }, [start])

  useEffect(() => {
    const offO = api.onOpened((n) => { refresh(); open(n.id) })
    const save = () => { if (dirty.current && cur.current) { dirty.current = false; api.saveNow(cur.current) } }
    // leaving the window (or quitting) writes what is pending at once
    window.addEventListener('beforeunload', save)
    window.addEventListener('blur', flush)
    return () => { offO(); window.removeEventListener('beforeunload', save); window.removeEventListener('blur', flush) }
  }, [open, refresh, flush])

  useEffect(() => api.onMenu((c: MenuCommand) => {
    const o = opsRef.current
    const sc = cur.current?.scenes
    if (c === 'new') create()
    else if (c === 'import') importFile()
    else if (c === 'export-pdf') exportAs('pdf')
    else if (c === 'export-board') exportAs('board')
    else if (c === 'export-html') exportAs('html')
    else if (c === 'export-file') exportAs('file')
    else if (c === 'add-scene') o.addScene()
    else if (c === 'settings') setSettings('appearance')
    else if (c === 'add-shot') {
      if (active.current && sc?.some((x) => x.shots.some((s) => s.id === active.current))) o.addShotAfter(active.current)
      else if (sc?.length) o.addShot(sc[sc.length - 1].id)
    }
  }))

  // undo for the big changes (a removed shot or scene, a reorder, an image) when no text field is being edited;
  // a pasted picture goes to the shot being edited
  useEffect(() => {
    const typing = () => /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') && (document.activeElement as HTMLInputElement).type !== 'checkbox'
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !typing()) { e.preventDefault(); undo() }
      if (e.key === 'Escape') { setMenu(false); setCtx(null) }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSideOpen(true); later(() => document.querySelector<HTMLInputElement>('.side-search input')?.focus()) }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') { e.preventDefault(); setSettings('appearance') }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') { e.preventDefault(); setSettings('keys') }
      if (isWeb && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); exportRef.current(e.shiftKey ? 'board' : 'pdf') }
    }
    const paste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files || []).find((x) => x.type.startsWith('image/'))
      if (f && active.current) { e.preventDefault(); opsRef.current.setImage(active.current, f) }
    }
    window.addEventListener('keydown', key)
    window.addEventListener('paste', paste)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('paste', paste) }
  }, [undo])

  useEffect(() => { localStorage.setItem('view', view) }, [view])
  // RoarMe's opening: the side slides in and the page rises, only the first moment
  useEffect(() => { const id = setTimeout(() => setIntro(false), 1400); return () => clearTimeout(id) }, [])

  // the side panel's edge drags its width (370-720 in RoarMe; 220-480 here), a double click puts it back
  const grip = (e: React.PointerEvent) => {
    e.preventDefault()
    const x0 = e.clientX, w0 = sideW
    document.body.classList.add('resizing')
    const move = (ev: PointerEvent) => setSideW(Math.round(Math.min(480, Math.max(220, w0 + ev.clientX - x0))))
    const up = () => {
      document.body.classList.remove('resizing')
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up)
      setSideW((w) => { try { localStorage.setItem('roarlist-side', String(w)) } catch { /* private */ } return w })
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }

  const duplicate = async (id: string, title: string) => {
    await flush()
    const n = await api.duplicate(id, `${t.copyOf} ${title || t.untitled}`)
    await refresh(); open(n.id)
  }
  const removeList = async (id: string) => {
    if (!confirm(t.removeQWeb)) return
    if (cur.current?.id === id) { clearTimeout(timer.current); dirty.current = false; cur.current = null; setP(null) }
    await api.remove(id); await refresh()
  }

  if (authed === false) return <main className="main empty"><div className="empty-mark"><b>ROAR</b><i>LIST</i></div><h2>{t.hubSignIn}</h2></main>
  if (authed && hub.level === 'none') return <main className="main empty"><div className="empty-mark"><b>ROAR</b><i>LIST</i></div><h2>{t.hubNoAccess}</h2><p className="muted">{t.hubNoAccessSub}</p></main>
  if (!lists) return <div className="boot"><div className="spinner" /></div>
  const edits = canEdit()

  const tot = p ? totals(p) : null
  const q = query.trim().toLowerCase()
  const shown = q ? lists.filter((x) => (x.title || t.untitled).toLowerCase().includes(q)) : lists
  const ctxList = ctx && lists.find((x) => x.id === ctx.id)
  const field = (k: 'client' | 'director' | 'dop', label: string) => (
    <label className="meta-field"><span>{label}</span><input value={p![k]} onChange={(e) => edit((x) => ({ ...x, [k]: e.target.value }))} /></label>
  )

  return (
    <div className={`app${sideOpen ? ' side-open' : ''}${intro ? ' intro' : ''}${p ? '' : ' no-list'}`} style={{ '--side-w': `${sideW}px` } as React.CSSProperties}>
      <div className="drag" />
      {sideOpen && <div className="side-shade" onClick={() => setSideOpen(false)} />}
      <aside className="side">
        <div className="brand"><b>ROAR</b><i>LIST</i></div>
        {scope && <div className="side-project ellipsis" title={projectName(scope)}>{projectName(scope)}</div>}
        {edits && <button className="pill primary new" onClick={() => { setSideOpen(false); create() }}><Icon name="plus" size={16} />{t.newList}</button>}
        <label className="side-search"><Icon name="search" size={15} />
          <input value={query} placeholder={t.searchPh} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { setQuery(''); (e.target as HTMLInputElement).blur() } }} />
          {!query && <kbd>{/Mac/.test(navigator.platform) ? '⌘' : 'Ctrl'} K</kbd>}
        </label>
        <div className="side-title muted small">{t.shotlists}</div>
        <div className="projects" key={query ? 'q' : 'all'}>
          {query && !shown.length && <div className="muted small side-empty">{t.noMatch}</div>}
          {shown.map((x) => (
            <div key={x.id} className={`project${p?.id === x.id ? ' on' : ''}`} onClick={() => { setSideOpen(false); if (p?.id !== x.id) open(x.id) }}
              onContextMenu={(e) => { e.preventDefault(); setCtx({ id: x.id, x: Math.min(e.clientX, innerWidth - 230), y: Math.min(e.clientY, innerHeight - 260) }) }}>
              <div className="cover">{x.cover ? <Img projectId={x.id} file={x.cover} /> : <Icon name="clapper" size={18} />}</div>
              <div className="grow">
                <div className="ellipsis">{(p?.id === x.id ? p.title : x.title) || t.untitled}</div>
                <div className="muted small ellipsis">
                  {!scope && x.projectId && projectName(x.projectId) ? projectName(x.projectId) + ' · ' : ''}{x.date ? new Date(x.date + 'T12:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' · ' : ''}{x.done}/{x.shots} {t.shots.toLowerCase()}
                </div>
              </div>
              {edits && <div className="project-tools">
                <button className="tool small" title={t.duplicate} onClick={(e) => { e.stopPropagation(); duplicate(x.id, x.title) }}><Icon name="copy" size={15} /></button>
                <button className="tool small" title={t.remove} onClick={(e) => { e.stopPropagation(); removeList(x.id) }}><Icon name="trash" size={15} /></button>
              </div>}
            </div>
          ))}
        </div>
        <div className="side-foot">
          {edits ? <button className="link" onClick={importFile}><Icon name="open" size={16} />{t.open}</button> : <span className="muted small">{t.viewOnly}</span>}
          <button className="tool" title={t.settings} onClick={() => { setSideOpen(false); setSettings('appearance') }}><Icon name="gear" size={18} /></button>
        </div>
        <div className="side-grip" onPointerDown={grip} onDoubleClick={() => { setSideW(270); try { localStorage.removeItem('roarlist-side') } catch { /* private */ } }} />
      </aside>

      {!p ? (
        <main className="main empty">
          <div className="empty-mark"><b>ROAR</b><i>LIST</i></div>
          <h2>{t.empty}</h2>
          <p className="muted">{edits ? t.emptySub : t.viewOnly}</p>
          {edits && <button className="pill primary" onClick={create}>{t.start}</button>}
        </main>
      ) : (
        <main className="main">
          <div className="bar">
            <button className="tool back-lists" title={t.shotlists} aria-label={t.shotlists} onClick={close}><Icon name="back" size={18} /></button>
            <button className="tool side-toggle" title={t.shotlists} onClick={() => setSideOpen(true)}><Icon name="menu" size={18} /></button>
            <Lens className="seg" dep={view}>
              <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><Icon name="list" size={16} />{t.list}</button>
              <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}><Icon name="board" size={16} />{t.board}</button>
            </Lens>
            <span className="grow" />
            {tot && <span className="muted small totals">{tot.done}/{tot.shots} {t.shots.toLowerCase()}{tot.secs ? ` · ${fmtDur(tot.secs)}` : ''}</span>}
            <div className="menu-wrap">
              <button className="pill" onClick={() => setMenu(!menu)}><Icon name="download" size={16} />{t.export}</button>
              {menu && (
                <>
                  <div className="menu-shade" onClick={() => setMenu(false)} />
                  <div className="menu">
                    <button onClick={() => exportAs('pdf')}><Icon name="list" size={16} />{t.pdfList}</button>
                    <button onClick={() => exportAs('board')}><Icon name="board" size={16} />{t.pdfBoard}</button>
                    <button onClick={() => exportAs('html')}><Icon name="download" size={16} />{t.html}</button>
                    <button onClick={() => exportAs('file')}><Icon name="clapper" size={16} /><span>{t.file}<small className="muted">{t.fileHint}</small></span></button>
                  </div>
                </>
              )}
            </div>
          </div>

          <fieldset className="page swap" key={p.id} disabled={!edits}>
            <header className="doc-head">
              <input className="title" value={p.title} placeholder={t.untitled} onChange={(e) => edit((x) => ({ ...x, title: e.target.value }))} />
              <div className="meta-row">
                <label className="meta-field"><span>{t.hubProject}</span>
                  <select value={p.projectId} onChange={(e) => { const hp = hub.projects.find((x) => x.id === e.target.value); edit((x) => (hp ? fromProject({ ...x, projectId: hp.id }, hp) : { ...x, projectId: '' }), true) }}>
                    <option value="">{t.noProject}</option>
                    {hub.projects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                </label>
                {field('client', t.client)}
                {field('director', t.director)}
                {field('dop', t.dop)}
                <label className="meta-field"><span>{t.date}</span><input type="date" value={p.date} onChange={(e) => edit((x) => ({ ...x, date: e.target.value }))} /></label>
                <label className="meta-field small-field"><span>{t.aspect}</span>
                  <select value={p.aspect} onChange={(e) => edit((x) => ({ ...x, aspect: e.target.value }))}>
                    {ASPECTS.map((a) => <option key={a}>{a}</option>)}
                  </select>
                </label>
              </div>
              <textarea className="doc-notes" rows={1} value={p.notes} placeholder={t.projectNotes} onChange={(e) => edit((x) => ({ ...x, notes: e.target.value }))} />
            </header>
            {view === 'list' ? <ShotList p={p} ops={ops} /> : <Board p={p} ops={ops} />}
          </fieldset>
        </main>
      )}

      {settings && <SettingsSheet start={settings} onClose={() => setSettings(false)} />}
      {ctx && ctxList && (
        <>
          <div className="menu-shade" onMouseDown={() => setCtx(null)} onContextMenu={(e) => { e.preventDefault(); setCtx(null) }} />
          <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }} onClick={() => setCtx(null)}>
            <button onClick={() => open(ctx.id)}><Icon name="open" size={16} />{t.openList}</button>
            {edits && <button onClick={async () => { await open(ctx.id); later(() => document.querySelector<HTMLInputElement>('.title')?.select()) }}><Icon name="edit" size={16} />{t.rename}</button>}
            {edits && <button onClick={() => duplicate(ctx.id, ctxList.title)}><Icon name="copy" size={16} />{t.duplicate}</button>}
            <hr />
            <button onClick={async () => { await open(ctx.id); exportRef.current('pdf') }}><Icon name="list" size={16} />{t.pdfList}</button>
            <button onClick={async () => { await open(ctx.id); exportRef.current('board') }}><Icon name="board" size={16} />{t.pdfBoard}</button>
            <button onClick={async () => { await open(ctx.id); exportRef.current('file') }}><Icon name="clapper" size={16} />{t.file}</button>
            <hr />
            {edits && <button className="danger" onClick={() => removeList(ctx.id)}><Icon name="trash" size={16} />{t.remove}</button>}
          </div>
        </>
      )}
      {toast && (
        <div className="toast">{toast.text}{toast.undo && <button className="link undo" onClick={undo}>{t.undo}</button>}</div>
      )}
    </div>
  )
}
