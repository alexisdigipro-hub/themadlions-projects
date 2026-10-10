import { useEffect, useRef, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui.jsx'
import PhotoGrid from '../../components/PhotoGrid.jsx'
import LinkName from '../../components/LinkName.jsx'
import { useProject } from '../Project.jsx'
import { can, useCurrentUser, useStore } from '../../lib/store.jsx'
import { deletePhoto } from '../../lib/photos.js'
import { nameParts } from '../../lib/projectName.js'
import { deckUrl } from '../../lib/shares.js'
import { mailLink, shortenWithBitly, waShareLink } from '../../lib/share.js'
import { HAS_TEXT, LAYOUTS, PHOTO_SLOTS, THEMES, W, deckPdfBlob, drawSlide, loadDeckAssets, loadDeckFonts, loadSlidePhotos, newSlide, starterSlides } from '../../lib/deck.js'
import { publishDeck, saveBlob } from '../../lib/deckShare.js'
import { Grip, moveItem, useDragSort } from '../../components/DragSort.jsx'

const layoutName = (l) => LAYOUTS.find(([k]) => k === l)?.[1] || l

/* The slide exactly as it goes into the PDF, drawn again whenever it changes. */
function SlidePreview({ slide, subtitle, look }) {
  const ref = useRef()
  useEffect(() => {
    let alive = true
    ;(async () => {
      await loadDeckFonts(look.theme)
      const assets = await loadDeckAssets().catch(() => ({}))
      const pictures = await loadSlidePhotos(slide.photos || []).catch(() => ({}))
      if (alive && ref.current) drawSlide(ref.current, slide, { assets, pictures, subtitle, ...look })
    })()
    return () => { alive = false }
  }, [slide, subtitle, look.theme, look.accent, look.company])
  return <canvas ref={ref} className="deck-preview" width="1920" height="1080" />
}

/* The first slide drawn in one look, small, so the four can be compared side by side. Drawn
   full size once and shrunk, so the thumbnail is the real thing and not an approximation. */
function LookThumb({ slide, subtitle, look }) {
  const ref = useRef()
  useEffect(() => {
    let alive = true
    ;(async () => {
      await loadDeckFonts(look.theme)
      const assets = await loadDeckAssets().catch(() => ({}))
      const pictures = await loadSlidePhotos(slide.photos || []).catch(() => ({}))
      const c = ref.current
      if (!alive || !c) return
      const full = drawSlide(document.createElement('canvas'), slide, { assets, pictures, subtitle, ...look })
      c.getContext('2d').drawImage(full, 0, 0, c.width, c.height)
    })()
    return () => { alive = false }
  }, [slide, subtitle, look.theme, look.accent, look.company])
  return <canvas ref={ref} width={W / 4} height={1080 / 4} />
}

export default function Presentation() {
  const { project, edit, canEdit } = useProject()
  const { state } = useStore()
  const user = useCurrentUser()
  const toast = useToast()
  const editable = canEdit('projects')
  const canShare = editable && can(user, 'share', 'edit')
  const slides = project.deck?.slides || []
  const [adding, setAdding] = useState('grid')
  const [busy, setBusy] = useState(false)
  const [share, setShare] = useState(null)
  const { artist, shortTitle } = nameParts(project)
  const subtitle = [artist, shortTitle].filter(Boolean).join(' – ')
  const theme = THEMES.some(([k]) => k === project.deck?.theme) ? project.deck.theme : 'mb'
  const look = { theme, accent: project.color || '', company: state.workspace.name || '' }
  const setTheme = (t) => edit((p) => { p.deck = { ...(p.deck || { slides: [] }), theme: t } })

  const setSlides = (fn) => edit((p) => {
    p.deck = p.deck || { slides: [] }
    p.deck.slides = fn([...(p.deck.slides || [])])
  })
  const patch = (id, change) => setSlides((list) => list.map((s) => (s.id === id ? { ...s, ...change } : s)))
  // drag a slide by its ⋮⋮ to reorder the deck (Alex, 10 Oct: no more arrows)
  const sort = useDragSort((from, to) => setSlides((list) => moveItem(list, from, to)))
  const remove = (s) => {
    // a copied project's pCloud pictures belong to the original: those stay
    ;(s.photos || []).filter((ph) => !ph.fileid || ph.scope?.id === project.id).forEach((ph) => deletePhoto(ph).catch(() => {}))
    setSlides((list) => list.filter((x) => x.id !== s.id))
  }

  const download = async () => {
    setBusy(true)
    try {
      saveBlob(await deckPdfBlob(slides, subtitle, look), `${project.title} - presentation.pdf`)
    } catch (e) {
      toast(`Could not make the PDF: ${e.message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const makeShare = async () => {
    setShare({ busy: 'Drawing the slides…' })
    try {
      const out = await publishDeck({
        project, slides, subtitle, look,
        workspace: state.workspace, logo: state.settings?.logo || '', userId: user?.id,
        onStep: (i, n) => setShare({ busy: `Drawing and uploading slide ${i} of ${n}…` }),
      })
      setShare(out)
    } catch (e) {
      setShare({ error: e.message })
    }
  }
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast('Copied', 'ok') } catch { toast('Could not copy', 'error') }
  }

  if (!slides.length) {
    return (
      <Empty
        title="No presentation yet"
        action={editable && <Button variant="primary" onClick={() => setSlides(() => starterSlides())}>Start from the moodboard template</Button>}
      >
        Your MB template: cover, overview, script, setups, props, wardrobe and the closing logo, in the house style. Fill in the text and the pictures, then download it as a PDF.
      </Empty>
    )
  }

  return (
    <div className="deck">
      <div className="toolbar">
        <div className="toolbar-info"><strong>Presentation</strong> <span className="muted">{slides.length} slide{slides.length === 1 ? '' : 's'}</span></div>
        <div className="toolbar-actions">
          {editable && (
            <>
              <Select value={adding} onChange={(e) => setAdding(e.target.value)} options={LAYOUTS} aria-label="Layout of the new slide" />
              <Button onClick={() => setSlides((list) => [...list.filter((s) => s.layout !== 'end'), newSlide(adding), ...list.filter((s) => s.layout === 'end')])}>Add slide</Button>
            </>
          )}
          {canShare && <Button onClick={makeShare} disabled={!!share?.busy}>Share link</Button>}
          <Button variant="primary" onClick={download} disabled={busy}>{busy ? 'Making the PDF…' : 'Download PDF'}</Button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Look</h2></div>
        <div className="deck-looks">
          {THEMES.map(([k, name, about]) => (
            <button key={k} type="button" className={`deck-look${k === theme ? ' on' : ''}`} onClick={() => editable && k !== theme && setTheme(k)} disabled={!editable && k !== theme} aria-pressed={k === theme}>
              <LookThumb slide={slides[0]} subtitle={subtitle} look={{ ...look, theme: k }} />
              <strong>{name}</strong>
              <span>{about}</span>
            </button>
          ))}
        </div>
      </section>

      <Modal open={!!share} title="Share the presentation" onClose={() => !share?.busy && setShare(null)}>
        {share?.busy && <p className="muted">{share.busy}</p>}
        {share?.error && <p className="error">{share.error}</p>}
        {share?.url && (
          <div className="stack">
            <p className="small muted">
              The slides in the {THEMES.find(([k]) => k === theme)[1]} look, as they are now. Anyone with the link sees them on any screen, no login, can present them full screen and download the PDF.
              {' '}After changes, press Share link again: the same link shows the new version.
            </p>
            <div className="share-link"><input className="input" readOnly value={share.url} onFocus={(e) => e.target.select()} /><Button variant="ghost" onClick={() => copy(share.url)}>Copy</Button></div>
            <LinkName
              key={share.ref}
              workspaceId={state.workspace.id} shareRef={share.ref} url={share.url} makeUrl={deckUrl}
              suggestion={`${shortTitle || project.title} presentation`}
              hasCode
              onRenamed={(url) => { setShare({ ...share, url }); toast('Link renamed', 'ok') }}
            />
            <div className="row-actions wrap">
              <a className="btn btn-primary" href={waShareLink(`${project.title} · Presentation\n${share.url}`)} target="_blank" rel="noreferrer">Send on WhatsApp</a>
              <a className="btn btn-ghost" href={mailLink({ subject: `${project.title} · Presentation`, body: share.url })}>Mail</a>
              <Button variant="ghost" onClick={() => shortenWithBitly(share.url, toast)} title="Opens bit.ly with the link copied, for a short address of your own">Shorten with bit.ly</Button>
            </div>
          </div>
        )}
      </Modal>

      {slides.map((s, i) => (
        <section key={s.id} {...sort.row('slides', i)} className={`panel deck-slide ${sort.cls('slides', i)}`}>
          <div className="deck-slide-head">
            <strong>{i + 1}. {layoutName(s.layout)}</strong>
            {editable && (
              <span className="row-actions">
                <Grip {...sort.grip('slides', i)} />
                <Confirm onConfirm={() => remove(s)} label="Delete slide">×</Confirm>
              </span>
            )}
          </div>
          <div className="deck-slide-body">
            <SlidePreview slide={s} subtitle={subtitle} look={look} />
            {editable && (
              <div className="deck-slide-form">
                <Field label="Layout">
                  <Select value={s.layout} onChange={(e) => patch(s.id, { layout: e.target.value })} options={LAYOUTS} />
                </Field>
                {s.layout !== 'end' && (
                  <Field label="Title" hint="Put the bold part between stars, like in WhatsApp: MOOD*BOARD*, *OVER*VIEW">
                    <Input value={s.title} onChange={(e) => patch(s.id, { title: e.target.value })} />
                  </Field>
                )}
                {HAS_TEXT[s.layout] && (
                  <Field label={s.layout === 'cover' ? 'Line under the title' : s.layout === 'grid' ? 'Line under the title (optional)' : 'Text'} hint={s.layout === 'cover' ? `Leave empty for "${subtitle}"` : ''}>
                    {s.layout === 'cover' || s.layout === 'grid'
                      ? <Input value={s.text} onChange={(e) => patch(s.id, { text: e.target.value })} placeholder={s.layout === 'cover' ? subtitle : ''} />
                      : <Textarea rows={5} value={s.text} onChange={(e) => patch(s.id, { text: e.target.value })} />}
                  </Field>
                )}
                {PHOTO_SLOTS[s.layout] && (
                  <>
                    <PhotoGrid title={`Pictures · the first ${PHOTO_SLOTS[s.layout]} are used, in order`} photos={s.photos || []} projectId={project.id} ownerId={s.id} editable={editable} cloud={false} onChange={(photos) => patch(s.id, { photos })} />
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
