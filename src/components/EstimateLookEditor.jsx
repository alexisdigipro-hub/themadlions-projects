import { useRef } from 'react'
import { Field, Input, useToast } from './ui.jsx'
import { PRESETS, fontKey, lookOf, shrinkImage } from '../lib/estimateLook.js'
import FontPicker from './FontPicker.jsx'

/* The Look tab of the cost estimation window (Alex, 19 Oct: "settings for everything"): colours,
   letters, sizes, layout, a cover photo and the logo. Every change shows at once in the preview. */
export default function EstimateLookEditor({ look, onChange, saved = null, onSave }) {
  const toast = useToast()
  const L = lookOf({ look })
  const coverRef = useRef()
  const logoRef = useRef()
  const set = (patch) => onChange({ ...(look || {}), ...patch })

  const pick = async (file, key, max, type) => {
    if (!file) return
    try { set({ [key]: await shrinkImage(file, max, type) }) }
    catch { toast('Could not read that image.', 'error') }
  }

  const seg = (key, options) => (
    <div className="est-seg" role="group">
      {options.map(([v, label]) => (
        <button key={String(v)} type="button" className={L[key] === v ? 'on' : ''} onClick={() => set({ [key]: v })}>{label}</button>
      ))}
    </div>
  )
  const range = (key, min, max, step = 1, unit = '%') => (
    <div className="est-range">
      <input type="range" min={min} max={max} step={step} value={L[key]} onChange={(e) => set({ [key]: Number(e.target.value) })} />
      <span>{L[key]}{unit}</span>
    </div>
  )
  const colour = (key, label) => (
    <label className="est-colour">
      <input type="color" value={L[key]} onChange={(e) => set({ [key]: e.target.value })} />
      <span>{label}</span>
    </label>
  )
  const toggle = (key, label) => (
    <label className="est-toggle">
      <input type="checkbox" checked={!!L[key]} onChange={(e) => set({ [key]: e.target.checked })} />
      <span>{label}</span>
    </label>
  )

  const same = saved && JSON.stringify(saved) === JSON.stringify(look || {})
  return (
    <div className="est-look-ed stack">
      {/* my look (Alex, 20 Oct): keep this look for every new estimate, or bring the kept one back */}
      <div className="est-mylook">
        {onSave && <button type="button" className={`est-pill est-save${same ? ' on' : ''}`} onClick={onSave} disabled={same}>{same ? 'This is my look' : 'Save as my look'}</button>}
        {saved && !same && <button type="button" className="est-pill" onClick={() => onChange({ ...saved })}>Use my look</button>}
      </div>
      <section className="est-look-group">
        <h4>Colours</h4>
        <div className="est-presets">
          {PRESETS.map(([name, p]) => (
            <button key={name} type="button" className={L.bg === p.bg && L.accent === p.accent ? 'on' : ''} onClick={() => set(p)}>
              <i style={{ background: p.bg, boxShadow: `inset 0 0 0 4px ${p.bg}, inset 0 0 0 9px ${p.accent}` }} />{name}
            </button>
          ))}
        </div>
        <div className="est-colours">
          {colour('bg', 'Background')}
          {colour('text', 'Text')}
          {colour('accent', 'Accent')}
          {colour('advance', 'Advance')}
          {toggle('glow', 'Glow at the top')}
        </div>
      </section>

      <section className="est-look-group">
        <h4>Letters</h4>
        <div className="row-2">
          <Field label="Font">
            <FontPicker value={fontKey(L.font)} onChange={(id) => set({ font: id })} />
          </Field>
          <Field label="Title weight">{seg('titleWeight', [[300, 'Thin'], [500, 'Regular'], [800, 'Bold']])}</Field>
        </div>
        <div className="row-2">
          <Field label="Title size">{range('titleSize', 60, 160, 5)}</Field>
          <Field label="Text size">{range('textSize', 80, 130, 5)}</Field>
        </div>
        {toggle('titleCaps', 'Title in capitals')}
      </section>

      <section className="est-look-group">
        <h4>Layout</h4>
        <div className="row-2">
          <Field label="Heading">{seg('align', [['center', 'Centre'], ['left', 'Left']])}</Field>
          <Field label="Width">{seg('width', [['narrow', 'Narrow'], ['normal', 'Normal'], ['wide', 'Wide']])}</Field>
        </div>
        <div className="row-2">
          <Field label="Cost lines">{seg('lines', [['tiles', 'Tiles'], ['rows', 'Rows'], ['compact', 'Compact'], ['list', 'List']])}</Field>
          <Field label="Corners">{range('radius', 0, 32, 1, 'px')}</Field>
        </div>
        <div className="est-toggles">
          {toggle('subtotals', 'Subtotal per heading')}
          {toggle('frame', 'Frame around the page')}
        </div>
      </section>

      <section className="est-look-group">
        <h4>Cover photo</h4>
        <div className="est-pic">
          {L.cover ? <img src={L.cover} alt="" /> : <span className="est-pic-empty">No photo</span>}
          <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0], 'cover', 1800, 'image/jpeg'); e.target.value = '' }} />
          <div className="est-pic-acts">
            <button type="button" className="est-pill" onClick={() => coverRef.current?.click()}>{L.cover ? 'Change' : 'Add a photo'}</button>
            {L.cover && <button type="button" className="est-pill danger" onClick={() => set({ cover: '' })}>Remove</button>}
          </div>
        </div>
        {L.cover && (
          <>
            <Field label="Height">{seg('coverHeight', [['short', 'Short'], ['medium', 'Medium'], ['tall', 'Tall']])}</Field>
            <div className="row-2">
              <Field label="Darken">{range('coverDim', 0, 90, 5)}</Field>
              <Field label="Position">{range('coverY', 0, 100, 5)}</Field>
            </div>
          </>
        )}
      </section>

      <section className="est-look-group">
        <h4>Logo and words</h4>
        <div className="est-pic">
          {L.logoImg ? <img className="logo" src={L.logoImg} alt="" /> : <span className="est-pic-empty">Company logo</span>}
          <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0], 'logoImg', 600, 'image/png'); e.target.value = '' }} />
          <div className="est-pic-acts">
            <button type="button" className="est-pill" onClick={() => logoRef.current?.click()}>Use another logo</button>
            {L.logoImg && <button type="button" className="est-pill danger" onClick={() => set({ logoImg: '' })}>Back to the company logo</button>}
          </div>
        </div>
        <div className="est-toggles">
          {toggle('logo', 'Show the logo')}
          {toggle('company', 'Show the company name')}
        </div>
        {L.logo && <Field label="Logo size">{range('logoSize', 50, 200, 10)}</Field>}
        <div className="row-2">
          <Field label="Small line above the title"><Input value={L.kicker} onChange={(e) => set({ kicker: e.target.value })} placeholder="Leave empty for none" /></Field>
          <Field label="Heading over the costs"><Input value={L.covers} onChange={(e) => set({ covers: e.target.value })} placeholder="Leave empty for none" /></Field>
        </div>
        <Field label="Heading over what is not included"><Input value={L.excludedTitle} onChange={(e) => set({ excludedTitle: e.target.value })} placeholder="Not included in the price" /></Field>
      </section>

      <button type="button" className="est-pill est-reset" onClick={() => onChange({})}>Back to the original look</button>
    </div>
  )
}

