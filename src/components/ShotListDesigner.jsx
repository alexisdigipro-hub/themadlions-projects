import { useState } from 'react'
import { Button, Field, Input, Select, Textarea } from './ui.jsx'
import { COLUMNS, LISTS, newCustomColumn } from '../lib/shotLayout.js'
import { SIZES } from '../lib/callsheetLayout.js'

const defaultName = (c) => (c.custom ? 'Untitled' : COLUMNS.find(([k]) => k === c.key)?.[1] || c.key)

/* A pick list edited as text, one item per line. Kept as its own text while typing, so an empty
   line in the middle of typing is not swallowed; the parsed list goes up on every change. */
function ListBox({ value, onChange }) {
  const [text, setText] = useState(value.join('\n'))
  return <Textarea rows={6} value={text} onChange={(e) => { setText(e.target.value); onChange(e.target.value.split('\n').map((x) => x.trim()).filter(Boolean)) }} />
}

/* The Customise panel above a shot list: columns (order, name, screen / paper / link), your own
   columns, the pick lists, default minutes for the shoot day, and the look. */
export default function ShotListDesigner({ layout, setLayout, hasOwn, isAdmin, onMakeDefault, onReset }) {
  const change = (fn) => setLayout((l) => { fn(l); return l })
  const setCol = (i, patch) => change((l) => { l.columns[i] = { ...l.columns[i], ...patch } })
  const move = (i, d) => change((l) => {
    const j = i + d
    if (j < 0 || j >= l.columns.length) return
    ;[l.columns[i], l.columns[j]] = [l.columns[j], l.columns[i]]
  })

  return (
    <section className="panel cs-design no-print">
      <div className="cs-design-cols">
        <div className="stack">
          <div className="panel-head"><h3>Columns</h3><span className="muted small">Order, name, and where each one shows</span></div>
          <table className="table cs-design-table">
            <thead><tr><th /><th>Name</th><th>Screen</th><th>Print</th><th>Link</th><th /></tr></thead>
            <tbody>
              {layout.columns.map((c, i) => (
                <tr key={c.key}>
                  <td className="row-actions nowrap">
                    <button onClick={() => move(i, -1)} disabled={i === 0} title="Move up">↑</button>
                    <button onClick={() => move(i, 1)} disabled={i === layout.columns.length - 1} title="Move down">↓</button>
                  </td>
                  <td><input className="input sm" value={c.title} placeholder={defaultName(c)} onChange={(e) => setCol(i, { title: e.target.value })} /></td>
                  <td><input type="checkbox" checked={c.screen} onChange={() => setCol(i, { screen: !c.screen })} aria-label={`${defaultName(c)} on screen`} /></td>
                  <td><input type="checkbox" checked={c.print} onChange={() => setCol(i, { print: !c.print })} aria-label={`${defaultName(c)} on paper`} /></td>
                  <td><input type="checkbox" checked={c.link} onChange={() => setCol(i, { link: !c.link })} aria-label={`${defaultName(c)} on the link`} /></td>
                  <td className="row-actions">{c.custom && <button onClick={() => change((l) => { l.columns.splice(i, 1) })} title="Delete this column">×</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div><Button size="sm" onClick={() => change((l) => { l.columns.push(newCustomColumn()) })}>Add your own column</Button></div>
          <p className="fineprint">Your own columns (props, wardrobe, VFX, anything) get a field in every shot's form.</p>
        </div>

        <div className="stack">
          <div className="panel-head"><h3>Pick lists</h3><span className="muted small">One per line, in the order you want them</span></div>
          <div className="sl-lists">
            {LISTS.map(([k, name]) => (
              <Field key={`${k}-${hasOwn}`} label={name} hint={k === 'lens' ? 'Your lens kit. Empty: type any lens.' : ''}>
                <ListBox value={layout.lists[k]} onChange={(v) => change((l) => { l.lists[k] = v })} />
              </Field>
            ))}
          </div>

          <div className="panel-head"><h3>Shoot day</h3><span className="muted small">For shots with no minutes of their own</span></div>
          <div className="row-2">
            <Field label="Setup (minutes)"><Input value={layout.timing.setup} inputMode="numeric" onChange={(e) => change((l) => { l.timing.setup = e.target.value.replace(/[^\d]/g, '') })} /></Field>
            <Field label="Shoot (minutes)"><Input value={layout.timing.shoot} inputMode="numeric" onChange={(e) => change((l) => { l.timing.shoot = e.target.value.replace(/[^\d]/g, '') })} /></Field>
          </div>

          <div className="panel-head"><h3>Look</h3></div>
          <div className="row-2">
            <Field label="Colour of headings">
              <div className="cs-colour">
                <Select value={layout.look.colour} onChange={(e) => change((l) => { l.look.colour = e.target.value })} options={[['', 'Black'], ['project', 'Project colour'], ['custom', 'Pick a colour']]} />
                {layout.look.colour === 'custom' && <input type="color" value={layout.look.custom} onChange={(e) => change((l) => { l.look.custom = e.target.value })} aria-label="Colour" />}
              </div>
            </Field>
            <Field label="Text size on paper"><Select value={layout.look.printSize} onChange={(e) => change((l) => { l.look.printSize = e.target.value })} options={SIZES} /></Field>
            <Field label="Text size on the link"><Select value={layout.look.linkSize} onChange={(e) => change((l) => { l.look.linkSize = e.target.value })} options={SIZES} /></Field>
            <Field label="Link colours"><Select value={layout.look.linkTheme} onChange={(e) => change((l) => { l.look.linkTheme = e.target.value })} options={[['light', 'Light'], ['dark', 'Dark']]} /></Field>
          </div>

          <p className="small muted">{hasOwn ? 'This project has its own layout.' : 'This project uses the company layout. Changing anything here gives it its own.'}</p>
          <div className="row-actions wrap">
            {isAdmin && <Button size="sm" variant="ghost" onClick={onMakeDefault}>Use this layout for every project</Button>}
            {hasOwn && <Button size="sm" variant="ghost" onClick={onReset}>Back to the company layout</Button>}
          </div>
        </div>
      </div>
    </section>
  )
}
