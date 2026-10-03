import { useEffect, useRef, useState } from 'react'
import { Button, Confirm, Empty, Field, Input, Select, Textarea, useToast } from '../../components/ui.jsx'
import PhotoGrid from '../../components/PhotoGrid.jsx'
import { useProject } from '../Project.jsx'
import { deletePhoto } from '../../lib/photos.js'
import { nameParts } from '../../lib/projectName.js'
import { HAS_TEXT, LAYOUTS, PHOTO_SLOTS, deckPdfBlob, drawSlide, loadDeckAssets, loadDeckFonts, loadSlidePhotos, newSlide, starterSlides } from '../../lib/deck.js'

const layoutName = (l) => LAYOUTS.find(([k]) => k === l)?.[1] || l

/* The slide exactly as it goes into the PDF, drawn again whenever it changes. */
function SlidePreview({ slide, subtitle }) {
  const ref = useRef()
  useEffect(() => {
    let alive = true
    ;(async () => {
      await loadDeckFonts()
      const assets = await loadDeckAssets().catch(() => ({}))
      const pictures = await loadSlidePhotos(slide.photos || []).catch(() => ({}))
      if (alive && ref.current) drawSlide(ref.current, slide, { assets, pictures, subtitle })
    })()
    return () => { alive = false }
  }, [slide, subtitle])
  return <canvas ref={ref} className="deck-preview" width="1920" height="1080" />
}

export default function Presentation() {
  const { project, edit, canEdit } = useProject()
  const toast = useToast()
  const editable = canEdit('projects')
  const slides = project.deck?.slides || []
  const [adding, setAdding] = useState('grid')
  const [busy, setBusy] = useState(false)
  const { artist, shortTitle } = nameParts(project)
  const subtitle = [artist, shortTitle].filter(Boolean).join(' – ')

  const setSlides = (fn) => edit((p) => {
    p.deck = p.deck || { slides: [] }
    p.deck.slides = fn([...(p.deck.slides || [])])
  })
  const patch = (id, change) => setSlides((list) => list.map((s) => (s.id === id ? { ...s, ...change } : s)))
  const move = (i, d) => setSlides((list) => {
    const j = i + d
    if (j < 0 || j >= list.length) return list
    ;[list[i], list[j]] = [list[j], list[i]]
    return list
  })
  const remove = (s) => {
    ;(s.photos || []).forEach((ph) => deletePhoto(ph.path).catch(() => {}))
    setSlides((list) => list.filter((x) => x.id !== s.id))
  }

  const download = async () => {
    setBusy(true)
    try {
      const blob = await deckPdfBlob(slides, subtitle)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.title} - presentation.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    } catch (e) {
      toast(`Could not make the PDF: ${e.message}`, 'error')
    } finally {
      setBusy(false)
    }
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
          <Button variant="primary" onClick={download} disabled={busy}>{busy ? 'Making the PDF…' : 'Download PDF'}</Button>
        </div>
      </div>

      {slides.map((s, i) => (
        <section key={s.id} className="panel deck-slide">
          <div className="deck-slide-head">
            <strong>{i + 1}. {layoutName(s.layout)}</strong>
            {editable && (
              <span className="row-actions">
                <button onClick={() => move(i, -1)} disabled={i === 0} title="Move up">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === slides.length - 1} title="Move down">↓</button>
                <Confirm onConfirm={() => remove(s)} label="Delete slide">×</Confirm>
              </span>
            )}
          </div>
          <div className="deck-slide-body">
            <SlidePreview slide={s} subtitle={subtitle} />
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
                    <PhotoGrid title={`Pictures · the first ${PHOTO_SLOTS[s.layout]} are used, in order`} photos={s.photos || []} projectId={project.id} ownerId={s.id} editable={editable} onChange={(photos) => patch(s.id, { photos })} />
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
