import { Field, Input, Select, Textarea } from './ui.jsx'
import { DETAILS, LABELS, SIZES, newCustomBlock, titleOf } from '../lib/callsheetLayout.js'
import { Grip, moveItem, useDragSort } from './DragSort.jsx'

/* The Customise panel above the ordino: how every ordino of this project looks on its link. Left the
   sections (order, name, shown or not), right the details, words and look. There is no printed sheet
   any more (Alex, 11 Oct), so no Sheet switches, header or sheet text size (old layouts keep those
   flags, unused). Everything about one day is filled in the ordino itself, next to the preview:
   the old "This day only" column went (title, times, location, extra people). */
export default function CallSheetDesigner({ layout, setLayout, hasOwn, isAdmin, onMakeDefault, onReset }) {
  const change = (fn) => setLayout((l) => { fn(l); return l })
  const setBlock = (i, patch) => change((l) => { l.blocks[i] = { ...l.blocks[i], ...patch } })
  // drag a section by its ⋮⋮ to reorder (Alex, 10 Oct: no more arrows)
  const sort = useDragSort((from, to) => change((l) => { l.blocks = moveItem(l.blocks, from, to) }))

  return (
    <section className="panel cs-design no-print">
      {/* two columns (Alex, 11 Oct: "tidy it, two columns so I see it all at once"): the sections and
          the details side by side, then the words and the look side by side */}
      <div className="cs2">
        <div className="cs2-col">
          <div className="cs2-head"><h3>Sections</h3><span className="muted small">Drag to reorder, rename, show or hide</span></div>
          <ul className="plain cs2-list">
            {layout.blocks.map((b, i) => (
              <li key={b.key} {...sort.row('blocks', i)} className={`cs2-row ${sort.cls('blocks', i)}`}>
                <Grip {...sort.grip('blocks', i)} />
                <input className="input sm" value={b.title} placeholder={titleOf(layout, { ...b, title: '' })} onChange={(e) => setBlock(i, { title: e.target.value })} aria-label="Section name" />
                <label className="cs2-switch" title="On the link"><input type="checkbox" checked={b.link} onChange={() => setBlock(i, { link: !b.link })} aria-label={`${titleOf(layout, b)} on the link`} /><span /></label>
                {b.custom ? <button type="button" className="ordino-x" onClick={() => change((l) => { l.blocks.splice(i, 1) })} title="Delete this section" aria-label="Delete this section">×</button> : <span className="cs2-gap" />}
              </li>
            ))}
          </ul>
          {layout.blocks.filter((b) => b.custom).map((b) => (
            <Field key={b.key} label={`${titleOf(layout, b)} · text for every day`} hint="Type over it in the ordino to change it for one day only.">
              <Textarea rows={2} value={b.text} onChange={(e) => change((l) => { const x = l.blocks.find((y) => y.key === b.key); if (x) x.text = e.target.value })} />
            </Field>
          ))}
          <div><button type="button" className="ordino-pill" onClick={() => change((l) => { l.blocks.push(newCustomBlock()) })}><b>+</b>Add your own section</button></div>
        </div>

        <div className="cs2-col">
          <div className="cs2-head"><h3>Details</h3><span className="muted small">What the link shows</span></div>
          <ul className="plain cs2-list">
            {DETAILS.map(([k, name]) => (
              <li key={k} className="cs2-row cs2-detail">
                <span>{name}</span>
                <label className="cs2-switch"><input type="checkbox" checked={layout.details[k].link} onChange={() => change((l) => { l.details[k] = { ...l.details[k], link: !l.details[k].link } })} aria-label={`${name} on the link`} /><span /></label>
              </li>
            ))}
          </ul>
        </div>

        <div className="cs2-col">
          <div className="cs2-head"><h3>Words</h3></div>
          <div className="cs2-fields">
            {LABELS.map(([k, name]) => (
              <Field key={k} label={name}><Input value={layout.labels[k]} placeholder={name} onChange={(e) => change((l) => { l.labels[k] = e.target.value })} /></Field>
            ))}
          </div>
        </div>

        <div className="cs2-col">
          <div className="cs2-head"><h3>Look</h3></div>
          <div className="cs2-fields">
            <Field label="Headings and call time">
              <div className="cs-colour">
                <Select value={layout.look.colour} onChange={(e) => change((l) => { l.look.colour = e.target.value })} options={[['', 'Black'], ['project', 'Project colour'], ['custom', 'Pick a colour']]} />
                {layout.look.colour === 'custom' && <input type="color" value={layout.look.custom} onChange={(e) => change((l) => { l.look.custom = e.target.value })} aria-label="Colour" />}
              </div>
            </Field>
            <Field label="Text size"><Select value={layout.look.linkSize} onChange={(e) => change((l) => { l.look.linkSize = e.target.value })} options={SIZES} /></Field>
            <Field label="Colours"><Select value={layout.look.linkTheme} onChange={(e) => change((l) => { l.look.linkTheme = e.target.value })} options={[['light', 'Light'], ['dark', 'Dark']]} /></Field>
          </div>
        </div>
      </div>

      <div className="cs2-foot">
        <span className="small muted">{hasOwn ? 'This project has its own layout.' : 'This project uses the company layout. Changing anything here gives it its own.'}</span>
        {isAdmin && <button type="button" className="ordino-pill" onClick={onMakeDefault}>Use for every project</button>}
        {hasOwn && <button type="button" className="ordino-pill" onClick={onReset}>Back to the company layout</button>}
      </div>
    </section>
  )
}
