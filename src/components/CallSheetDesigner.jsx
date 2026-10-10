import { Button, Field, Input, Select, Textarea } from './ui.jsx'
import { uid } from '../lib/store.jsx'
import { DETAILS, LABELS, SIZES, newCustomBlock, titleOf } from '../lib/callsheetLayout.js'
import { Grip, moveItem, useDragSort } from './DragSort.jsx'

/* The Customise panel above the ordino. Left: how every ordino of this project looks on its link
   (sections, order, names, what shows). There is no printed sheet any more (Alex, 11 Oct), so the
   Sheet switches, the sheet's header and its text size are gone; old layouts keep their sheet flags
   unused. Right: what is different on this one day (title, location, people added or left out). */
export default function CallSheetDesigner({ layout, setLayout, sheet, setSheet, day, setDay, loc, hiddenPeople, onShowPerson, hasOwn, isAdmin, onMakeDefault, onReset }) {
  const change = (fn) => setLayout((l) => { fn(l); return l })
  const setBlock = (i, patch) => change((l) => { l.blocks[i] = { ...l.blocks[i], ...patch } })
  // drag a section by its ⋮⋮ to reorder (Alex, 10 Oct: no more arrows)
  const sort = useDragSort((from, to) => change((l) => { l.blocks = moveItem(l.blocks, from, to) }))
  const extra = sheet.extra || []
  const setExtra = (list) => setSheet('extra', list)

  return (
    <section className="panel cs-design no-print">
      <div className="cs-design-cols">
        <div className="stack">
          <div className="panel-head"><h3>Sections</h3><span className="muted small">Order, name, and whether the link shows it</span></div>
          <table className="table cs-design-table">
            <thead><tr><th /><th>Name</th><th>On the link</th><th /></tr></thead>
            <tbody>
              {layout.blocks.map((b, i) => (
                <tr key={b.key} {...sort.row('blocks', i)} className={sort.cls('blocks', i)}>
                  <td className="row-actions nowrap"><Grip {...sort.grip('blocks', i)} /></td>
                  <td><input className="input sm" value={b.title} placeholder={titleOf(layout, { ...b, title: '' })} onChange={(e) => setBlock(i, { title: e.target.value })} /></td>
                  <td><input type="checkbox" checked={b.link} onChange={() => setBlock(i, { link: !b.link })} aria-label={`${titleOf(layout, b)} on the link`} /></td>
                  <td className="row-actions">{b.custom && <button onClick={() => change((l) => { l.blocks.splice(i, 1) })} title="Delete this section">×</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {layout.blocks.filter((b) => b.custom).map((b) => (
            <Field key={b.key} label={`${titleOf(layout, b)} · text for every day`} hint="Type over it in the ordino to change it for one day only.">
              <Textarea rows={2} value={b.text} onChange={(e) => change((l) => { const x = l.blocks.find((y) => y.key === b.key); if (x) x.text = e.target.value })} />
            </Field>
          ))}
          <div><Button size="sm" onClick={() => change((l) => { l.blocks.push(newCustomBlock()) })}>Add your own section</Button></div>

          <div className="panel-head"><h3>Details</h3></div>
          <table className="table cs-design-table">
            <thead><tr><th>Show</th><th>On the link</th></tr></thead>
            <tbody>
              {DETAILS.map(([k, name]) => (
                <tr key={k}>
                  <td>{name}</td>
                  <td><input type="checkbox" checked={layout.details[k].link} onChange={() => change((l) => { l.details[k] = { ...l.details[k], link: !l.details[k].link } })} aria-label={`${name} on the link`} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="panel-head"><h3>Words</h3></div>
          <div className="row-2">
            {LABELS.map(([k, name]) => (
              <Field key={k} label={name}><Input value={layout.labels[k]} placeholder={name} onChange={(e) => change((l) => { l.labels[k] = e.target.value })} /></Field>
            ))}
          </div>

          <div className="panel-head"><h3>Look</h3></div>
          <div className="row-2">
            <Field label="Colour of headings and call time">
              <div className="cs-colour">
                <Select value={layout.look.colour} onChange={(e) => change((l) => { l.look.colour = e.target.value })} options={[['', 'Black'], ['project', 'Project colour'], ['custom', 'Pick a colour']]} />
                {layout.look.colour === 'custom' && <input type="color" value={layout.look.custom} onChange={(e) => change((l) => { l.look.custom = e.target.value })} aria-label="Colour" />}
              </div>
            </Field>
            <Field label="Text size"><Select value={layout.look.linkSize} onChange={(e) => change((l) => { l.look.linkSize = e.target.value })} options={SIZES} /></Field>
            <Field label="Colours"><Select value={layout.look.linkTheme} onChange={(e) => change((l) => { l.look.linkTheme = e.target.value })} options={[['light', 'Light'], ['dark', 'Dark']]} /></Field>
          </div>

          <p className="small muted">
            {hasOwn ? 'This project has its own layout.' : 'This project uses the company layout. Changing anything here gives it its own.'}
          </p>
          <div className="row-actions wrap">
            {isAdmin && <Button size="sm" variant="ghost" onClick={onMakeDefault}>Use this layout for every project</Button>}
            {hasOwn && <Button size="sm" variant="ghost" onClick={onReset}>Back to the company layout</Button>}
          </div>
        </div>

        <div className="stack">
          <div className="panel-head"><h3>This day only</h3><span className="muted small">Leave a field empty to keep what the app fills in</span></div>
          <Field label="Title"><Input value={sheet.title || ''} onChange={(e) => setSheet('title', e.target.value)} placeholder="The project title" /></Field>
          <div className="row-2">
            <Field label="General crew call" hint="Same as the shoot day in Schedule"><Input value={day.callTime || ''} onChange={(e) => setDay('callTime', e.target.value)} placeholder="07:00" /></Field>
            <Field label="Est. wrap"><Input value={day.wrapTime || ''} onChange={(e) => setDay('wrapTime', e.target.value)} placeholder="19:00" /></Field>
          </div>
          <div className="row-2">
            <Field label="Location name"><Input value={sheet.locName || ''} onChange={(e) => setSheet('locName', e.target.value)} placeholder={loc?.name || ''} /></Field>
            <Field label="Address"><Input value={sheet.locAddress || ''} onChange={(e) => setSheet('locAddress', e.target.value)} placeholder={loc?.address || ''} /></Field>
            <Field label="Who to ask on location"><Input value={sheet.locContact || ''} onChange={(e) => setSheet('locContact', e.target.value)} placeholder={loc?.contact || ''} /></Field>
            <Field label="Their phone"><Input value={sheet.locPhone || ''} onChange={(e) => setSheet('locPhone', e.target.value)} placeholder={loc?.phone || ''} /></Field>
          </div>

          <div className="panel-head"><h3>Extra people</h3><span className="muted small">Not in the project, only on this day</span></div>
          {extra.map((x, i) => (
            <div key={x.id} className="cs-extra">
              <Select value={x.kind} onChange={(e) => setExtra(extra.map((y, j) => (j === i ? { ...y, kind: e.target.value } : y)))} options={[['crew', 'Crew'], ['cast', 'Cast']]} aria-label="Cast or crew" />
              <Input value={x.name} placeholder="Name" onChange={(e) => setExtra(extra.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} />
              <Input value={x.role} placeholder={x.kind === 'cast' ? 'Character' : 'Role'} onChange={(e) => setExtra(extra.map((y, j) => (j === i ? { ...y, role: e.target.value } : y)))} />
              <Input value={x.phone} placeholder="Phone" onChange={(e) => setExtra(extra.map((y, j) => (j === i ? { ...y, phone: e.target.value } : y)))} />
              <Input value={x.call} placeholder={day.callTime || 'Call'} onChange={(e) => setExtra(extra.map((y, j) => (j === i ? { ...y, call: e.target.value } : y)))} />
              <button className="cs-x" onClick={() => setExtra(extra.filter((_, j) => j !== i))} title="Remove">×</button>
            </div>
          ))}
          <div><Button size="sm" onClick={() => setExtra([...extra, { id: uid(), kind: 'crew', name: '', role: '', phone: '', call: '' }])}>Add a person</Button></div>

          {hiddenPeople.length > 0 && (
            <>
              <div className="panel-head"><h3>Left out of this day</h3></div>
              <ul className="plain cs-hidden">
                {hiddenPeople.map((p) => <li key={p.key}><span>{p.name}</span><button className="link" onClick={() => onShowPerson(p.key)}>Show again</button></li>)}
              </ul>
            </>
          )}
          <p className="fineprint">Call times and who is on the day can also be changed right in the ordino below. After changes, press Share link again so the link shows them.</p>
        </div>
      </div>
    </section>
  )
}
