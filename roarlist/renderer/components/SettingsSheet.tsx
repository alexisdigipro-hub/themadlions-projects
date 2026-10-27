// Settings, laid out like RoarMe's: pages in groups on the left (the chosen one lit by the lens), each page with a hero
// line and boxes of rows. Appearance carries RoarMe's look settings; the rest is RoarList's own.
import { useState } from 'react'
import { ASPECTS, LEGAL, t } from '../i18n'
import { ACCENTS, COLUMNS, FONTS, THEMES, TEXT_SIZES, revealFrom, set, type Settings } from '../settings'
import { Lens } from '../ui'
import { useSettings } from '../useSettings'
import { Icon } from './Icon'

const VERSION = '0.4.2'
type Page = 'general' | 'appearance' | 'language' | 'lists' | 'pdf' | 'keys'

// [id, title, colour, icon, hero line, group]
const PAGES = (): [Page, string, string, string, string, number][] => [
  ['general', t.general, '#8e8e93', 'gear', t.heroGeneral, 1],
  ['appearance', t.appearance, '#40c8e0', 'sun', t.heroAppearance, 1],
  ['language', t.language, '#bf5af2', 'globe', t.heroLanguage, 1],
  ['lists', t.defaults, '#ff9f0a', 'list', t.heroLists, 2],
  ['pdf', t.pdf, '#ff453a', 'download', t.heroPdf, 2],
  ['keys', t.keys, '#30d158', 'keyboard', t.heroKeys, 2],
]

export function SettingsSheet({ onClose, start = 'appearance' }: { onClose: () => void; start?: Page }) {
  const s = useSettings()
  const [page, setPage] = useState<Page>(start)
  const pages = PAGES()
  const cur = pages.find((x) => x[0] === page)!
  return (
    <div className="sheet-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet settings" role="dialog" aria-label={t.settings}>
        <div className="set-side">
          <h2>{t.settings}</h2>
          <Lens className="set-nav" dep={page}>
            {pages.map(([k, label, , icon, , group], i) => [
              i > 0 && pages[i - 1][5] !== group ? <div key={`g${k}`} className="nav-group" /> : null,
              <button key={k} className={page === k ? 'on' : ''} onClick={() => setPage(k)}><Icon name={icon} size={17} />{label}</button>,
            ])}
          </Lens>
          <div className="set-version"><div className="brand"><b>ROAR</b><i>LIST</i></div>by THEMADLIONS · {VERSION} hub<div className="set-legal"><a href={`${LEGAL}#privacy`} target="_blank" rel="noreferrer">{t.privacy}</a> · <a href={`${LEGAL}#terms`} target="_blank" rel="noreferrer">{t.terms}</a></div></div>
        </div>
        <div className="set-body">
          <button className="tool set-close" title={t.close} onClick={onClose}><Icon name="close" size={18} /></button>
          <section key={page}>
            <h3>{cur[1]}</h3>
            <div className="set-hero" style={{ '--c': cur[2] } as React.CSSProperties}><i><Icon name={cur[3]} size={26} /></i><p>{cur[4]}</p></div>
            {page === 'general' && <General s={s} />}
            {page === 'appearance' && <Appearance s={s} />}
            {page === 'language' && <Language s={s} />}
            {page === 'lists' && <Lists s={s} />}
            {page === 'pdf' && <Pdf s={s} />}
            {page === 'keys' && <Keys />}
          </section>
        </div>
      </div>
    </div>
  )
}

function Box({ title, note, children }: { title?: string; note?: string; children: React.ReactNode }) {
  return (
    <>
      {title && <h4>{title}</h4>}
      <div className="set-box">{children}</div>
      {note && <p className="set-note">{note}</p>}
    </>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="set-row">
      <div className="grow"><div>{label}</div>{hint && <div className="muted small">{hint}</div>}</div>
      {children && <div className="set-ctl">{children}</div>}
    </div>
  )
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T, e: React.MouseEvent) => void }) {
  return (
    <Lens className="seg" dep={value}>
      {options.map(([v, label]) => <button key={v} className={value === v ? 'on' : ''} onClick={(e) => onChange(v, e)}>{label}</button>)}
    </Lens>
  )
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return <label className="switch"><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /><span /></label>
}

function General({ s }: { s: Settings }) {
  return (
    <>
      <Box title={t.behaviour}>
        <Row label={t.confirmDelete} hint={t.confirmDeleteHint}><Switch on={s.confirmDelete} onChange={(confirmDelete) => set({ confirmDelete })} /></Row>
      </Box>
      <Box title={t.battery} note={t.liteHint}>
        <Row label={t.lite}><Switch on={s.lite} onChange={(lite) => set({ lite })} /></Row>
      </Box>
      <Box>
        <Row label={t.resetAll} hint={t.resetHint}>
          <button className="pill small danger-text" onClick={() => { if (confirm(t.resetQ)) set(null) }}>{t.reset}</button>
        </Row>
      </Box>
    </>
  )
}

function Appearance({ s }: { s: Settings }) {
  const themeName = THEMES.find(([k]) => k === s.theme)?.[1]
  return (
    <>
      <div className="set-preview">
        <div className="pv-frame" />
        <div className="pv-text">
          <b>1A · {themeName}</b>
          <span className="muted small">{t.previewLine}</span>
          <div className="pv-tags"><span className="on">WS</span><span>Drone</span><span>24mm</span></div>
        </div>
      </div>
      <Box title={t.theme}>
        <div className="set-row">
          <div className="themes">
            {THEMES.map(([k, name, accent, bg]) => (
              <button key={k} className={`theme-tile${s.theme === k ? ' on' : ''}`} onClick={(e) => revealFrom(e, () => set({ theme: k }))}>
                <span className="sw" style={{ background: bg }}><b /><i style={{ background: accent }} /></span>{name}
              </button>
            ))}
          </div>
        </div>
        <Row label={t.mode}>
          <Seg value={s.mode} options={[['dark', t.modeDark], ['light', t.modeLight], ['auto', t.modeSystem]]} onChange={(mode, e) => revealFrom(e, () => set({ mode }))} />
        </Row>
        <Row label={t.accent}>
          <div className="swatches">
            <button className={`swatch theme-own${s.accent === '' ? ' on' : ''}`} title={t.themeOwn} onClick={() => set({ accent: '' })} />
            {ACCENTS.map(([k, hex]) => (
              <button key={k} className={`swatch${s.accent === k ? ' on' : ''}`} style={{ background: hex }} title={k} onClick={() => set({ accent: k })} />
            ))}
          </div>
        </Row>
      </Box>
      <Box title={t.text}>
        <Row label={t.textSize}>
          <span className="muted small">A</span>
          <input type="range" min={0} max={TEXT_SIZES.length - 1} value={s.textSize} onChange={(e) => set({ textSize: Number(e.target.value) })} />
          <span className="muted">A</span>
        </Row>
        <Row label={t.font}>
          <select className="set-select" value={s.font} onChange={(e) => set({ font: e.target.value })}>
            {FONTS.map(([k, name, stack]) => <option key={k} value={k} style={{ fontFamily: stack }}>{name}</option>)}
          </select>
        </Row>
      </Box>
      <Box title={t.layout}>
        <Row label={t.spacing}>
          <Seg value={s.density} options={[['tight', t.tight], ['standard', t.standard], ['relaxed', t.relaxed]]} onChange={(density) => set({ density })} />
        </Row>
        <Row label={t.radius}>
          <input type="range" min={4} max={16} step={2} value={s.radius} onChange={(e) => set({ radius: Number(e.target.value) })} />
          <span className="muted small num">{s.radius}px</span>
        </Row>
      </Box>
      <Box title={t.effects}>
        <Row label={t.glassLook} hint={t.glassHint}><Switch on={s.glass} onChange={(glass) => set({ glass })} /></Row>
        <Row label={t.motion}><Switch on={s.motion} onChange={(motion) => set({ motion })} /></Row>
        <Row label={t.focusRings} hint={t.focusHint}><Switch on={s.focusRings} onChange={(focusRings) => set({ focusRings })} /></Row>
      </Box>
    </>
  )
}

function Language({ s }: { s: Settings }) {
  return (
    <Box title={t.interface} note={t.langNote}>
      <Row label={t.language}>
        <Seg value={s.language} options={[['el', 'Ελληνικά'], ['en', 'English'], ['system', t.langSystem]]} onChange={(language) => set({ language })} />
      </Row>
    </Box>
  )
}

function Lists({ s }: { s: Settings }) {
  const label: Record<string, string> = { frame: t.frame, size: t.size, angle: t.angle, move: t.move, lens: t.lens, cast: t.cast, duration: t.duration, notes: t.notes }
  return (
    <>
      <Box title={t.newLists}>
        <Row label={t.defAspect}>
          <select className="set-select" value={s.aspect} onChange={(e) => set({ aspect: e.target.value })}>
            {ASPECTS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </Row>
        <Row label={t.defLens}>
          <input className="set-input" value={s.lens} placeholder="35mm" onChange={(e) => set({ lens: e.target.value })} />
        </Row>
      </Box>
      <Box title={t.columns} note={t.columnsHint}>
        {COLUMNS.map((c) => (
          <Row key={c} label={label[c]}>
            <Switch on={s.columns[c] !== false} onChange={(v) => set({ columns: { ...s.columns, [c]: v } })} />
          </Row>
        ))}
      </Box>
    </>
  )
}

function Pdf({ s }: { s: Settings }) {
  return (
    <Box title={t.printing}>
      <Row label={t.paper}><Seg value={s.paper} options={[['A4', 'A4'], ['Letter', 'Letter']]} onChange={(paper) => set({ paper })} /></Row>
      <Row label={t.pdfFrames}><Switch on={s.pdfFrames} onChange={(pdfFrames) => set({ pdfFrames })} /></Row>
    </Box>
  )
}

const mod = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'
function Keys() {
  const rows: [string, string][] = [
    [`${mod} K`, t.k_search], [`${mod} N`, t.k_new], [`${mod} ↵`, t.k_shot], [`${mod} ⇧ ↵`, t.k_scene], [`${mod} P`, t.k_pdf],
    [`${mod} ⇧ P`, t.k_board], [`${mod} Z`, t.k_undo], [`${mod} ,`, t.k_settings], [`${mod} /`, t.k_keys], ['Esc', t.k_esc],
    [t.k_paste, t.k_pasteWhat], [t.k_right, t.k_rightWhat],
  ]
  return <div className="set-box"><div className="set-row"><div className="keys">{rows.map(([k, v]) => [<kbd key={k}>{k}</kbd>, <span key={v}>{v}</span>])}</div></div></div>
}

