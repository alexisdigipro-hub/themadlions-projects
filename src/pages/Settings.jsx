import { useEffect, useRef, useState } from 'react'
import ScreenInfo from '../components/ScreenInfo.jsx'
import { Button, Confirm, Field, Input, PageHead, Select, Textarea, useIsMobile, useToast } from '../components/ui.jsx'
import { CATEGORIES, DEFAULT_DEPARTMENTS, DEFAULT_GEAR_CATS, STORAGE_KEY, callsheetDefaults, departmentsOf, emptyProject, eventTypesOf, FIXED_EVENT_TYPES, gearCategoriesOf, sampleProject, today, uid, useCurrentUser, useStore, visibleProjects } from '../lib/store.jsx'
import { projectProgress } from '../lib/progress.js'
import { expenseCats } from '../lib/finance.js'
import { budgetGroups, categoryUses, moveLines, renameCategory } from '../lib/budgetCats.js'
import { fmtBytes, snapshotSummary, snapshotToState } from '../lib/backups.js'
import { authorizeUrl, clearOauth, pcloudBackup, pcloudPing, redirectUri, takeOauth } from '../lib/pcloud.js'
import { authorizeUrl as gcalAuthorizeUrl, clearOauthCode, gcalCalendars, gcalConnect, redirectUri as gcalRedirectUri, takeOauthCode } from '../lib/googleCalendar.js'
import { FEED_COLOR, feedsAreOff, feedsOf, fetchFeedText, parseIcs } from '../lib/ical.js'
import Team from './Team.jsx'
import Profile from './Profile.jsx'
import { useNavigate } from 'react-router-dom'
import ChatSettings from '../components/ChatSettings.jsx'
import { FONTS, applyFont, currentFont, ensureFontLoaded } from '../lib/fonts.js'
import Usage from '../components/Usage.jsx'
import { dirIn, useSlide } from '../lib/glide.js'
import { remote, supabase } from '../lib/supabase.js'

import { testKey } from '../lib/ai.js'
import { checkOpenAIKey } from '../lib/transcribe.js'
import { buildICS, download } from '../lib/dates.js'
import { DEFAULT_THEME, SKINS, SKIN_ICONS, applyThemeChoice, isSkin } from '../lib/skin.js'
import { ICON_SETS, IconPreview, applyIconSet } from '../components/icons.jsx'
import { Grip, moveItem, useDragSort } from '../components/DragSort.jsx'

export default function Settings() {
  const { state, update, replaceState, logout, mode, syncError, localBackup } = useStore()
  const me = useCurrentUser()
  const toast = useToast()
  const fileRef = useRef()
  const [ws, setWs] = useState(state.workspace)
  const [ai, setAi] = useState(state.settings)
  const [testing, setTesting] = useState(false)
  const [textSize, setTextSize] = useState(() => localStorage.getItem('tml_text_size') || 'normal')
  const [theme, setTheme] = useState(() => localStorage.getItem('tml_theme') || DEFAULT_THEME)
  const [accent, setAccent] = useState(() => localStorage.getItem('tml_accent') || 'amber')
  const [font, setFont] = useState(currentFont)
  const [icons, setIcons] = useState(() => document.documentElement.dataset.icons || 'classic')
  const pickFont = (id) => setFont(applyFont(id))
  const applyTheme = (v) => {
    setTheme(v); localStorage.setItem('tml_theme', v); applyThemeChoice(v)
    // a skin comes with its own icons, as in its design; Icons below can change them afterwards
    if (SKIN_ICONS[v]) setIcons(applyIconSet(SKIN_ICONS[v]))
  }
  const applyAccent = (v) => { setAccent(v); localStorage.setItem('tml_accent', v); document.documentElement.dataset.accent = v }
  const applyTextSize = (v) => {
    setTextSize(v)
    localStorage.setItem('tml_text_size', v)
    document.documentElement.dataset.textSize = v
  }
  const isAdmin = me?.role === 'admin'
  const nav = useNavigate()
  const mobile = useIsMobile()
  // My profile came off the side menu into Settings, as its first tab (Alex, 10 Oct)
  const TABS = [
    ['profile', 'My profile', false],
    ['company', 'Company', true], ['callsheets', 'Ordino', true], ['team', 'Team', true], ['calendar', 'Calendar & projects', true], ['budget', 'Budget', true],
    ['display', 'Display', false], ['chat', 'Chat', false], ['integrations', 'Integrations', true], ['data', 'Data', false], ['usage', 'Usage', true],
  ].filter(([, , admin]) => !admin || isAdmin)
  const [tab, setTab] = useState('profile')
  const { boxRef, slideTo, inClass } = useSlide()
  const logoRef = useRef()
  const [cs, setCs] = useState(() => callsheetDefaults(state))
  const [depts, setDepts] = useState(() => departmentsOf(state).join('\n'))
  const [gearCats, setGearCats] = useState(() => gearCategoriesOf(state).join('\n'))
  const setSetting = (k, v) => update((s) => { s.settings = { ...s.settings, [k]: v }; return s })
  const pickLogo = async (file) => {
    if (!file) return
    try {
      const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file) })
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
      const max = 320, k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      setSetting('logo', c.toDataURL(file.type === 'image/png' || file.type === 'image/svg+xml' ? 'image/png' : 'image/jpeg', 0.9))
      toast('Logo saved. It shows in the sidebar, the login page, call sheets and shared links.', 'ok')
    } catch { toast('Could not read that image.', 'error') }
    finally { if (logoRef.current) logoRef.current.value = '' }
  }
  const saveCs = () => { setSetting('callsheet', { ...cs, lunchAfterHours: Number(cs.lunchAfterHours) || 0, castOffset: Number(cs.castOffset) || 0, crewOffset: Number(cs.crewOffset) || 0 }); toast('Call sheet defaults saved', 'ok') }
  const saveDepts = () => {
    const list = [...new Set(depts.split('\n').map((x) => x.trim()).filter(Boolean))]
    if (!list.length) return toast('Keep at least one department.', 'error')
    setSetting('departments', list); toast(`${list.length} departments saved`, 'ok')
  }
  const saveGearCats = () => {
    const list = [...new Set(gearCats.split('\n').map((x) => x.trim()).filter(Boolean))]
    if (!list.length) return toast('Keep at least one category.', 'error')
    setSetting('gearCategories', list); toast(`${list.length} equipment categories saved`, 'ok')
  }

  const saveWs = () => {
    update((s) => {
      s.workspace = { ...s.workspace, ...ws }
      return s
    })
    toast('Workspace saved', 'ok')
  }
  const saveAi = () => {
    update((s) => {
      s.settings = { ...s.settings, ...ai }
      return s
    })
    toast('Settings saved', 'ok')
  }
  const runTest = async () => {
    setTesting(true)
    try {
      const ok = await testKey(ai)
      toast(ok ? 'Key works' : 'Unexpected reply from the API', ok ? 'ok' : 'error')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setTesting(false)
    }
  }

  const localData = mode === 'remote' ? localBackup() : null
  const importLocal = () => {
    if (!localData) return
    replaceState({ ...state, projects: [...state.projects.filter((p) => !localData.projects.some((q) => q.id === p.id)), ...localData.projects], events: [...state.events.filter((e) => !localData.events.some((q) => q.id === e.id)), ...localData.events] })
    toast(`Imported ${localData.projects.length} projects from this browser`, 'ok')
  }
  const backup = () => download(`themadlions-backup-${today()}.json`, JSON.stringify(state, null, 2), 'application/json')
  const restore = async (file) => {
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!data.projects || !data.users) throw new Error('Not a THEMADLIONS backup file.')
      replaceState(data)
      toast('Backup restored. Sign in again if your user changed.', 'ok')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      <PageHead title="Settings" />
      {/* on a phone the tabs are chips like Home's categories, one line each, sliding sideways, with the
          same glass lens moving between them (Alex, 10 Oct); a computer keeps the underlined tabs */}
      <nav className={mobile ? 'chips settings-chips' : 'tabs settings-tabs'}>
        {TABS.map(([k, l]) => <button key={k} className={mobile ? `chip${tab === k ? ' on' : ''}` : tab === k ? 'active' : ''} onClick={(e) => { if (tab !== k) slideTo(dirIn(e.currentTarget.parentNode, e.currentTarget)); setTab(k) }}>{l}</button>)}
      </nav>
      {/* the panel slides over when another tab is picked (lib/glide.js); nothing is keyed, so nothing remounts */}
      <div className="glide-box" ref={boxRef}>
      <div className={inClass}>
      <div className="cols settings-cols" data-active={tab}>
        {isAdmin && (
          <section className="panel" data-tab="company">
            <h2>Company</h2>
            <Field label="Logo" hint="PNG or JPG, square works best. Shown in the sidebar, on the login page, on call sheets and on shared call sheet links.">
              <div className="logo-row">
                {state.settings.logo ? <img className="logo-preview" src={state.settings.logo} alt="" /> : <span className="logo-mark logo-preview-mark" />}
                <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => pickLogo(e.target.files?.[0])} />
                <Button variant="ghost" onClick={() => logoRef.current?.click()}>{state.settings.logo ? 'Change' : 'Upload logo'}</Button>
                {state.settings.logo && <button className="link small" onClick={() => setSetting('logo', '')}>Remove</button>}
              </div>
            </Field>
            <Field label="Address on call sheets" hint="Shown under the company name on every call sheet.">
              <Input value={state.settings.companyAddress || ''} onChange={(e) => update((s) => { s.settings.companyAddress = e.target.value; return s })} placeholder="Πειραιώς 260, Ταύρος 177 78 · +30 210 000 0000" />
            </Field>
          </section>
        )}

        {isAdmin && (
          <section className="panel" data-tab="callsheets">
            <h2>Ordino defaults</h2>
            <p className="small muted">Used for every new ordino and wherever one of its fields is left empty. Each ordino can still override them.</p>
            <div className="stack">
              <div className="row-3">
                <Field label="Crew call"><Input value={cs.callTime} onChange={(e) => setCs({ ...cs, callTime: e.target.value })} placeholder="07:00" /></Field>
                <Field label="Est. wrap"><Input value={cs.wrapTime} onChange={(e) => setCs({ ...cs, wrapTime: e.target.value })} placeholder="19:00" /></Field>
                <Field label="Lunch, hours after call"><Input type="number" min={0} max={12} step={0.5} value={cs.lunchAfterHours} onChange={(e) => setCs({ ...cs, lunchAfterHours: e.target.value })} /></Field>
              </div>
              <Field label="Standard line for everyone (tagline)"><Input value={cs.tagline} onChange={(e) => setCs({ ...cs, tagline: e.target.value })} placeholder="Safety first. No photos on set without permission." /></Field>
              <div className="row-2">
                <Field label="Default parking note"><Textarea rows={2} value={cs.parking} onChange={(e) => setCs({ ...cs, parking: e.target.value })} /></Field>
                <Field label="Default nearest hospital"><Textarea rows={2} value={cs.hospital} onChange={(e) => setCs({ ...cs, hospital: e.target.value })} placeholder="Name, address, phone" /></Field>
              </div>
              <Field label="Footer on every ordino link" hint="A line at the bottom of the link."><Input value={cs.footer} onChange={(e) => setCs({ ...cs, footer: e.target.value })} placeholder="Παραγωγή The Mad Lions · production@themadlions.com · +30 69…" /></Field>
              <div className="row-2">
                <Field label="Cast call, minutes vs crew call" hint="Negative = earlier (makeup), positive = later. Applied to every new cast member, editable per person."><Input type="number" step={15} value={cs.castOffset ?? 0} onChange={(e) => setCs({ ...cs, castOffset: e.target.value })} /></Field>
              </div>
              <div className="row-actions"><Button variant="primary" onClick={saveCs}>Save defaults</Button></div>
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="panel" data-tab="callsheets">
            <h2>Production contacts</h2>
            <p className="small muted">The people who are the same on every shoot. They appear under Production on every ordino link, above the key crew picked from that project.</p>
            <RowList
              rows={state.settings.productionContacts || []}
              onChange={(rows) => setSetting('productionContacts', rows)}
              fields={[{ k: 'role', placeholder: '1st AD' }, { k: 'name', placeholder: 'Name' }, { k: 'phone', placeholder: '+30 69…', inputMode: 'tel' }]}
              addLabel="Add a contact"
              empty="None yet. Ordino links will show only the key crew of each project."
            />
          </section>
        )}

        {isAdmin && (
          <section className="panel" data-tab="callsheets">
            <h2>Share links</h2>
            <Field label="Ordino links expire" hint="Counted from the ordino's date. An expired link shows a short 'this ordino has expired' page. Sharing again always refreshes the link.">
              <Select value={String(state.settings.shareExpiryDays || 0)} onChange={(e) => setSetting('shareExpiryDays', Number(e.target.value))} options={[['0', 'Never'], ['1', 'The day after the shoot'], ['3', '3 days after the shoot'], ['7', 'A week after the shoot'], ['30', 'A month after the shoot']]} />
            </Field>
            <Field label="Ask for a code on ordino links" hint="The link carries everyone's phone number, and links get forwarded. With this on, each ordino link gets a six digit code that you send separately; without it the page shows nothing. Crew type it once per phone.">
              <Select value={state.settings.sharePin ? 'yes' : 'no'} onChange={(e) => setSetting('sharePin', e.target.value === 'yes')} options={[['no', 'No, the link is enough'], ['yes', 'Yes, link plus a code']]} />
            </Field>
          </section>
        )}

        {/* The Team list used to be its own page in the sidebar; it is the first thing on this
            tab now (Alex), with the rules that govern it underneath. */}
        {isAdmin && <Team embedded />}

        {isAdmin && (
          <section className="panel" data-tab="team">
            <h2>Team rules</h2>
            <div className="stack">
              <Field label="Default access for a new teammate" hint="What every part of the app starts at when you add someone. Drives and Share always start at none. Notices are always administrators only; call sheet share links are open to everyone who can see call sheets.">
                <Select value={state.settings.newMemberLevel || 'view'} onChange={(e) => setSetting('newMemberLevel', e.target.value)} options={[['none', 'Nothing until you set it'], ['view', 'Can view'], ['edit', 'Can edit']]} />
              </Field>
              <Field label="Who sees phone numbers and emails of cast and crew" hint="Applies inside the app (project Cast & crew, Database). Call sheets and shared links keep showing the numbers they need.">
                <Select value={state.settings.phoneVisibility || 'everyone'} onChange={(e) => setSetting('phoneVisibility', e.target.value)} options={[['everyone', 'Everyone in the team'], ['admins', 'Administrators only']]} />
              </Field>
            </div>
          </section>
        )}

        {/* the pop-up notices, apart from who can do what (Alex, 10 Oct: the Team tab reorganised) */}
        {isAdmin && (
          <section className="panel" data-tab="team">
            <h2>Notices</h2>
            <div className="stack">
              <Field label="Pop up a notice when a task is assigned to me" hint="The person who assigns it is the sender, so they see the confirmation. Nothing is sent when you assign a task to yourself.">
                <Select value={state.settings.autoNotice?.taskAssigned === false ? 'no' : 'yes'} onChange={(e) => setSetting('autoNotice', { ...(state.settings.autoNotice || {}), taskAssigned: e.target.value === 'yes' })} options={[['yes', 'Yes'], ['no', 'No']]} />
              </Field>
              <Field label="Pop up a notice for a new chat message" hint="Messages from the same person collapse into one pop-up that counts them, so a shooting day does not become a wall of modals.">
                <Select value={state.settings.autoNotice?.chatMessage === false ? 'no' : 'yes'} onChange={(e) => setSetting('autoNotice', { ...(state.settings.autoNotice || {}), chatMessage: e.target.value === 'yes' })} options={[['yes', 'Yes'], ['no', 'No']]} />
              </Field>
              <Field label="Notices vibrate on phones">
                <Select value={state.settings.noticeVibrate === false ? 'no' : 'yes'} onChange={(e) => setSetting('noticeVibrate', e.target.value === 'yes')} options={[['yes', 'Yes'], ['no', 'No']]} />
              </Field>
              <div className="row-actions">
                <Button variant="ghost" onClick={() => { update((s) => { s.notices = [...(s.notices || []), { id: uid(), title: 'Test notice', body: 'This is how a notice looks on your screen. Tap Got it to close it.', fromId: '', fromName: me?.name || 'Settings', to: [me?.id], acks: {}, createdAt: new Date().toISOString() }]; return s }) }}>Send myself a test notice</Button>
              </div>
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="panel wide" data-tab="team">
            <h2>Departments</h2>
            <p className="small muted">One per line, in the order you want them in menus. Used for crew, the contacts database and tasks. Existing people keep their department even if you remove it from the list.</p>
            <Textarea rows={8} value={depts} onChange={(e) => setDepts(e.target.value)} />
            <div className="row-actions">
              <Button variant="primary" onClick={saveDepts}>Save departments</Button>
              <button className="link small" onClick={() => setDepts(DEFAULT_DEPARTMENTS.join('\n'))}>Reset to standard list</button>
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="panel" data-tab="calendar">
            <h2>Calendar</h2>
            <Field label="Show Greek public holidays" hint="New Year, Epiphany, Clean Monday, 25 March, Good Friday, Easter, Easter Monday, 1 May, Holy Spirit Monday, 15 August, 28 October, Christmas and 26 December. The movable ones follow Orthodox Easter.">
              <Select value={state.settings.greekHolidays === false ? 'no' : 'yes'} onChange={(e) => setSetting('greekHolidays', e.target.value === 'yes')} options={[['yes', 'Yes'], ['no', 'No']]} />
            </Field>
            <Field label="Week starts on">
              <Select value={state.settings.weekStart || 'monday'} onChange={(e) => setSetting('weekStart', e.target.value)} options={[['monday', 'Monday'], ['sunday', 'Sunday']]} />
            </Field>
            <Field label="Export" hint="Every event on every project you can see, plus days off, as one .ics file for your phone or desktop calendar app.">
              <Button
                variant="ghost"
                onClick={() => {
                  const ids = new Set(visibleProjects(state, me).map((p) => p.id))
                  const events = state.events.filter((e) => !e.projectId || ids.has(e.projectId))
                  download(`${state.workspace.name || 'calendar'}.ics`, buildICS(events, state.workspace.name), 'text/calendar')
                }}
              >
                Export .ics
              </Button>
            </Field>
          </section>
        )}
        {isAdmin && (
          <section className="panel" data-tab="calendar">
            <h2>Event types</h2>
            <p className="small muted">The kinds of event on the Calendar, in the order of its type list. Tap a colour to change it, rename a type in place, drag ⋮⋮ to reorder, × to remove. Events already of a removed type keep its name and colour; bring a removed type back from the list under the types.</p>
            <EventTypesSettings state={state} update={update} toast={toast} />
          </section>
        )}
        {isAdmin && (
          <section className="panel" data-tab="calendar">
            <h2>Projects</h2>
            <div className="stack">
              <Field label="Project code prefix" hint="New projects get a code like TML-2026-001, counted per year. Leave it empty to stop giving out codes. Existing projects keep whatever they have.">
                <Input value={state.settings.projectCodePrefix ?? 'TML'} onChange={(e) => setSetting('projectCodePrefix', e.target.value)} placeholder="TML" />
              </Field>
              <Field label="Category for a new project" hint="What New project is set to before you change it.">
                <Select value={state.settings.defaultCategory || 'Music Video'} onChange={(e) => setSetting('defaultCategory', e.target.value)} options={CATEGORIES} />
              </Field>
            </div>
          </section>
        )}
        {isAdmin && (
          <section className="panel" data-tab="calendar">
            <h2>Equipment categories</h2>
            <p className="small muted">One per line, in the order you want them in a project's Equipment tab. Existing items keep their category even if you remove it from the list.</p>
            <Textarea rows={8} value={gearCats} onChange={(e) => setGearCats(e.target.value)} />
            <div className="row-actions">
              <Button variant="primary" onClick={saveGearCats}>Save equipment categories</Button>
              <button className="link small" onClick={() => setGearCats(DEFAULT_GEAR_CATS.join('\n'))}>Reset to standard list</button>
            </div>
          </section>
        )}
        {isAdmin && (
          <section className="panel" data-tab="calendar">
            <h2>Progress stages</h2>
            <p className="small muted">What counts towards the "% done" of a project, per category. Untick a stage you never do, change its weight, or add your own manual stages that get ticked on the project Overview.</p>
            <ProgressSettings state={state} setSetting={setSetting} />
          </section>
        )}

        {isAdmin && (
          <section className="panel wide" data-tab="budget">
            <h2>Budget categories</h2>
            <p className="small muted">What a budget line can be filed under, in groups, the same for every project. Click a name to rename it: every line already filed under it follows. A category with lines on it cannot be removed until you say where those lines go. The Finance column is where a payment on that category lands in Finance.</p>
            <BudgetCategoriesSettings state={state} update={update} toast={toast} />
          </section>
        )}

        <section className="panel wide" data-tab="display">
          <h2>Display</h2>
          <Field label="Theme">
            <div className="segmented small wrap">
              {[['light', 'Light'], ['dark', 'Dark'], ...SKINS].map(([v, l]) => (
                <button key={v} className={theme === v ? 'on' : ''} onClick={() => applyTheme(v)}>{l}</button>
              ))}
            </div>
          </Field>
          {isSkin(theme) ? <p className="muted small">{SKINS.find(([k]) => k === theme)[1]} has its own colours and layout, so the accent colour below is not used while it is on.</p> : null}
          <Field label="Accent colour">
            <div className="accent-swatches">
              {[['amber', '#c9932f', 'Lion amber'], ['red', '#c8503f', 'Red'], ['slate', '#3f5578', 'Slate blue'], ['lilac', '#7a5ec7', 'Lilac'], ['green', '#3f8f5f', 'Forest'], ['teal', '#2b8a93', 'Teal'], ['blue', '#3b7dd8', 'Ocean'], ['rose', '#c4547f', 'Rose'], ['orange', '#d9762b', 'Orange'], ['ink', '#1f2430', 'Ink']].map(([v, c, l]) => (
                <button key={v} className={`swatch ${accent === v ? 'on' : ''}`} style={{ '--sw': c }} onClick={() => applyAccent(v)} title={l}><span className="dot" />{l}</button>
              ))}
            </div>
          </Field>
          <div className="field">
            <span className="field-label">Typeface</span>
            <div className="font-swatches">
              {FONTS.map((f) => (
                <button key={f.id} type="button" className={`font-swatch ${font === f.id ? 'on' : ''}`} style={{ fontFamily: `${f.family}, ${f.serif ? 'Georgia, serif' : 'system-ui, sans-serif'}` }} onClick={() => pickFont(f.id)} onMouseEnter={() => ensureFontLoaded(f.id)} onFocus={() => ensureFontLoaded(f.id)} title={f.label}>
                  <span className="font-swatch-name">{f.label}</span>
                  <span className="font-swatch-sample">Καλημέρα, call at 06:30</span>
                </button>
              ))}
            </div>
            <span className="field-hint">All of these cover Greek, so a call sheet in both languages reads as one face. A font is fetched from Google Fonts when you hover or pick it; your choice is kept on this device.</span>
          </div>
          <div className="field">
            <span className="field-label">Icons</span>
            <div className="icon-sets">
              {ICON_SETS.map(([v, l]) => (
                <button key={v} type="button" className={`icon-set ${icons === v ? 'on' : ''}`} onClick={() => setIcons(applyIconSet(v))} aria-pressed={icons === v}>
                  <IconPreview set={v} keys={['home', 'calendar', 'chat', 'projects', 'settings']} />
                  <span>{l}</span>
                </button>
              ))}
            </div>
            <span className="field-hint">The icons in the menu, the bottom bar and a project's tabs.</span>
          </div>
          <Field label="Text size" hint="Display settings are saved on this device only.">
            <div className="segmented small">
              {[['compact', 'Compact'], ['normal', 'Normal'], ['large', 'Large']].map(([v, l]) => (
                <button key={v} className={textSize === v ? 'on' : ''} onClick={() => applyTextSize(v)}>{l}</button>
              ))}
            </div>
          </Field>
        </section>

        {/* Users do not need to know where the data lives (Alex), so Storage is for administrators. */}
        {isAdmin && (
        <section className="panel" data-tab="data">
          <h2>Storage</h2>
          {mode === 'remote' ? (
            <>
              <p className="muted small">Connected to Supabase. Everything you change is saved to the team database within a second and appears live for everyone who is signed in.</p>
              {syncError && <div className="error">Last save failed: {syncError}</div>}
              {isAdmin && localData?.projects?.length > 0 && (
                <div className="stack">
                  <p className="small">This browser still holds {localData.projects.length} project{localData.projects.length === 1 ? '' : 's'} from local mode.</p>
                  <div className="row-actions">
                    <Button onClick={importLocal}>Import them into the team workspace</Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="muted small">Local mode: everything lives in this browser. Use Backup below before clearing browser data or switching devices.</p>
          )}
        </section>
        )}
        {isAdmin && (
          <section className="panel" data-tab="company">
            <h2>Workspace</h2>
            <div className="stack">
              <Field label="Name">
                <Input value={ws.name} onChange={(e) => setWs({ ...ws, name: e.target.value })} />
              </Field>
              <Field label="Subtitle">
                <Input value={ws.subtitle} onChange={(e) => setWs({ ...ws, subtitle: e.target.value })} />
              </Field>
              <div className="row-actions">
                <Button variant="primary" onClick={saveWs}>
                  Save workspace
                </Button>
              </div>
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="panel" data-tab="integrations">
            <h2>AI breakdown</h2>
            <p className="muted small">
              Phase 1 calls Anthropic directly from this browser with your key. The key is saved only in this browser. When the Supabase backend is connected the key moves to the server.
            </p>
            <div className="stack">
              <Field label="Anthropic API key">
                <Input type="password" value={ai.aiKey} onChange={(e) => setAi({ ...ai, aiKey: e.target.value })} placeholder="sk-ant-…" autoComplete="off" />
              </Field>
              <Field label="Language the AI writes in" hint="Applies to the scene breakdown and the treatment breakdown: synopses, headings, element names and flags. Character and brand names are always kept as written.">
                <Select value={state.settings.aiLanguage === 'english' ? 'english' : 'greek'} onChange={(e) => setSetting('aiLanguage', e.target.value)} options={[['greek', 'Greek'], ['english', 'English']]} />
              </Field>
              <Field label="Model" hint="Any current Claude model id works. Sonnet is the sweet spot for cost and quality on breakdowns.">
                <Input value={ai.aiModel} onChange={(e) => setAi({ ...ai, aiModel: e.target.value })} />
              </Field>
              <div className="row-actions">
                <Button variant="primary" onClick={saveAi}>
                  Save
                </Button>
                <Button onClick={runTest} disabled={!ai.aiKey || testing}>
                  {testing ? 'Testing…' : 'Test key'}
                </Button>
              </div>
            </div>
          </section>
        )}

        <section className="panel wide" data-tab="chat">
          <h2>Chat</h2>
          <p className="muted small">How the chat looks and behaves for you, on this device. Everyone sets their own; nothing here changes what others see. Who gets a pop-up notice for a chat message is under Team.</p>
          <ChatSettings toast={toast} />
        </section>

        {isAdmin && (
        <section className="panel" data-tab="integrations">
          <h2>Transcription</h2>
          <p className="muted small">Lyrics and timings from the song file with OpenAI Whisper, in the Music tab of music video projects. About $0.006 per minute of audio. The key stays in this browser.</p>
          <Field label="OpenAI API key">
            <div className="row-actions">
              <Input type="password" value={state.settings.openaiKey || ''} onChange={(e) => update((s) => { s.settings.openaiKey = e.target.value.trim(); return s })} placeholder="sk-…" autoComplete="off" />
              <Button onClick={() => checkOpenAIKey(state.settings.openaiKey).then((m) => toast(m, 'ok')).catch((e) => toast(e.message, 'error'))} disabled={!state.settings.openaiKey}>Test key</Button>
            </div>
          </Field>
          {state.settings.openaiKey && <p className="small under">Key saved on this device.</p>}
        </section>
        )}

        {isAdmin && remote && (
          <section className="panel" data-tab="integrations">
            <h2>File storage</h2>
            <p className="muted small">Where the files people upload go: photos (locations, cast and crew, equipment, presentations, the Database page), songs in the Music tab, the original of a project cover, and chat attachments. The built-in storage is 1 GB on the free plan. Your own pCloud has no such limit, keeps everything in folders you can open from the Finder, and stays private: the app asks a small function inside Supabase, which holds the pCloud key and checks the same permissions the database enforces.</p>
            <PcloudPanel toast={toast} />
          </section>
        )}

        {isAdmin && remote && (
          <section className="panel" data-tab="integrations">
            <h2>Calendar feeds</h2>
            <p className="muted small">Other calendars shown on the Calendar page, read only: a Google Calendar of another account, a shared one, a festival's. Each keeps its own colour and can be switched off without losing the address. Nothing from here is ever written back, and the app's own events are not sent there. Needs the <code>ical</code> function deployed in Supabase (Edge Functions &rarr; Deploy a new function &rarr; via Editor, name <code>ical</code>, paste <code>supabase/functions/ical/index.ts</code>).</p>
            <CalendarFeedsPanel toast={toast} />
          </section>
        )}

        {isAdmin && remote && (
          <section className="panel" data-tab="integrations">
            <h2>Google Calendar</h2>
            <p className="muted small">Connects one specific Google Calendar to this workspace: events made here (shoot days, prep, everything on the Calendar page) are pushed there, and events made straight in that Google Calendar show up here too. One shared connection for everyone, the same shape as pCloud: a small function inside Supabase holds the credential, no browser ever sees it except once, when you first connect.</p>
            <GoogleCalendarPanel toast={toast} />
          </section>
        )}

        {isAdmin && (
          <section className="panel" data-tab="integrations">
            <h2>Google Maps</h2>
            <p className="muted small">Maps work without a key using the public embed. Add a Maps Embed API key for a cleaner map with no watermark; restrict it to your GitHub Pages domain.</p>
            <div className="stack">
              <Field label="Maps Embed API key (optional)">
                <Input value={ai.mapsKey || ''} onChange={(e) => setAi({ ...ai, mapsKey: e.target.value })} autoComplete="off" />
              </Field>
              <div className="row-actions">
                <Button variant="primary" onClick={saveAi}>
                  Save
                </Button>
              </div>
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="panel" data-tab="data">
            <h2>Activity</h2>
            <p className="small muted">Who changed what, newest first. Project edits are grouped per person and project every few seconds. Kept for 180 days.</p>
            {tab === 'data' && <ActivityLog />}
          </section>
        )}
        {isAdmin && remote && (
          <section className="panel" data-tab="data">
            <h2>Weekly backups</h2>
            <p className="muted small">The database takes a snapshot of the whole workspace every Monday at 06:00 and keeps the last twelve. Download one to keep a copy on your own disk; the Restore button below reads it. Needs <code>supabase/backups.sql</code> run once.</p>
            <BackupsPanel toast={toast} />
          </section>
        )}
        {isAdmin && remote && (
          <section className="panel" data-tab="data">
            <h2>Backup to pCloud</h2>
            <p className="muted small">A full copy into your pCloud, in <b>Backups</b>, a folder per date: all the app's data (projects, calendar, people, locations, tasks, finance, chat, settings) and the site's code. If anything happens to the site, the data goes back with Restore backup below, and the code can be put back on GitHub from the zip.</p>
            <PcloudBackup state={state} update={update} toast={toast} />
          </section>
        )}
        <section className="panel wide" data-tab="data">
          <h2>Your data</h2>
          <p className="muted small">
            Everything is stored in this browser under <code>{STORAGE_KEY}</code>. Download a backup before clearing browser data, and use it to move to the online database later.
          </p>
          <div className="row-actions wrap">
            <Button onClick={backup}>Download backup</Button>
            {isAdmin && (
              <>
                <input ref={fileRef} type="file" accept=".json" hidden onChange={(e) => restore(e.target.files?.[0])} />
                <Button variant="ghost" onClick={() => fileRef.current?.click()}>
                  Restore backup
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    update((s) => {
                      s.projects.push(sampleProject())
                      return s
                    })
                    toast('Sample project added', 'ok')
                  }}
                >
                  Add sample project
                </Button>
                <Confirm
                  label="Reset workspace"
                  onConfirm={() => {
                    localStorage.removeItem(STORAGE_KEY)
                    logout()
                    window.location.hash = '#/login'
                    window.location.reload()
                  }}
                >
                  Reset everything
                </Confirm>
              </>
            )}
          </div>
        </section>
      </div>
      {isAdmin && tab === 'usage' && <Usage state={state} setSetting={setSetting} />}
      {tab === 'profile' && (
        <>
          <Profile mine embedded />
          {/* on a phone there is no side menu any more, so signing out lives here too */}
          <div className="row-actions settings-signout"><Button variant="ghost" onClick={() => { logout(); nav('/login') }}>Sign out</Button></div>
        </>
      )}
      </div>
      </div>
      <ScreenInfo />
    </>
  )
}


/* Settings > Data > Backup to pCloud: Back up now, and Every week (the app does it on its own when an
   administrator opens it and the last one is a week old, Layout.jsx). */
function PcloudBackup({ state, update, toast }) {
  const [busy, setBusy] = useState(false)
  const [last, setLast] = useState(null)
  const at = state.settings?.pcloudBackupAt
  const run = async () => {
    setBusy(true)
    try {
      const r = await pcloudBackup(state)
      setLast(r)
      update((s) => { s.settings = { ...s.settings, pcloudBackupAt: new Date().toISOString() }; return s })
      toast(r.codeError ? `Data saved to pCloud; the code could not be fetched (${r.codeError}).` : 'Backup saved to pCloud', r.codeError ? 'error' : 'ok')
    } catch (e) {
      toast(/Unknown action/.test(e.message) ? 'Deploy the new pcloud function first (Supabase > Edge Functions > pcloud).' : e.message, 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="stack">
      <div className="row-actions wrap">
        <Button variant="primary" onClick={run} disabled={busy}>{busy ? 'Backing up…' : 'Back up to pCloud now'}</Button>
        <label className="check">
          <input type="checkbox" checked={!!state.settings?.pcloudAutoBackup} onChange={(e) => update((s) => { s.settings = { ...s.settings, pcloudAutoBackup: e.target.checked }; return s })} />
          Every week, on its own
        </label>
      </div>
      <p className="small muted">{at ? `Last backup: ${new Date(at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'No backup in pCloud yet.'}</p>
      {last && <p className="small">Saved in <code>{last.folder}</code>: {(last.files || []).map((f) => `${f.name} (${fmtBytes(f.size)})`).join(', ')}</p>}
    </div>
  )
}

/* Settings > Data > Weekly backups: the snapshots supabase/backups.sql keeps, with Back up now
   and a Download per row. The download is converted to the app's own backup shape, so the
   Restore button next to it accepts it. */
function BackupsPanel({ toast }) {
  const [list, setList] = useState(undefined) // undefined = loading, null = table missing
  const [busy, setBusy] = useState('')
  const load = async () => {
    const { data, error } = await supabase.from('backups').select('id, taken_at, note, bytes').order('taken_at', { ascending: false }).limit(12)
    if (error) { setList(null); return }
    setList(data || [])
  }
  useEffect(() => { load() }, [])
  const now = async () => {
    setBusy('now')
    try {
      const { error } = await supabase.rpc('make_backup_now')
      if (error) throw new Error(error.code === 'PGRST202' || error.code === '42883' ? 'Run supabase/backups.sql first.' : error.message)
      await load()
      toast('Snapshot taken', 'ok')
    } catch (e) { toast(e.message, 'error') } finally { setBusy('') }
  }
  const get = async (row) => {
    setBusy(String(row.id))
    try {
      const { data, error } = await supabase.from('backups').select('data').eq('id', row.id).single()
      if (error) throw new Error(error.message)
      const state = snapshotToState(data.data)
      download(`themadlions-backup-${(row.taken_at || '').slice(0, 10)}.json`, JSON.stringify(state, null, 2), 'application/json')
      toast(`Downloaded: ${snapshotSummary(data.data)}`, 'ok')
    } catch (e) { toast(e.message, 'error') } finally { setBusy('') }
  }
  if (list === undefined) return <p className="muted small">Loading…</p>
  if (list === null) return <p className="notice">No backups table yet. Run <code>supabase/backups.sql</code> in the Supabase SQL editor once; it also takes the first snapshot.</p>
  return (
    <div className="stack">
      <div className="row-actions wrap">
        <Button onClick={now} disabled={!!busy}>{busy === 'now' ? 'Taking a snapshot…' : 'Back up now'}</Button>
      </div>
      {list.length === 0 ? (
        <p className="muted small">No snapshots yet. The first one comes Monday, or press Back up now.</p>
      ) : (
        <ul className="plain bk-list">
          {list.map((b) => (
            <li key={b.id} className="bk-row">
              <span className="bk-when">{new Date(b.taken_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="muted small">{b.note === 'weekly' ? 'weekly' : 'by hand'} · {fmtBytes(b.bytes)}</span>
              <span className="grow" />
              <Button size="sm" variant="ghost" onClick={() => get(b)} disabled={!!busy}>{busy === String(b.id) ? 'Preparing…' : 'Download'}</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* Settings > Budget: the groups and categories a budget line is filed under. Renames migrate every
   project's lines (renameCategory); a removal with lines on it first asks where they go (moveLines). */
function BudgetCategoriesSettings({ state, update, toast }) {
  const groups = budgetGroups(state.settings)
  const all = groups.flatMap((g) => g.cats.map((c) => c.name))
  const [newCat, setNewCat] = useState({}) // group index -> text
  const [newGroup, setNewGroup] = useState('')
  const [moving, setMoving] = useState(null) // { cat, to, uses }
  const save = (next) => update((s) => { s.settings = { ...s.settings, budgetCategories: next }; return s })
  const taken = (name, except) => all.some((c) => c !== except && c.toLowerCase() === name.toLowerCase())
  // drag a group, or a category inside its group, by its ⋮⋮ (Alex, 10 Oct: no more arrows)
  const sort = useDragSort((from, to, group) => {
    if (group === 'groups') return save(moveItem(groups, from, to))
    const gi = Number(String(group).slice(5))
    save(groups.map((g, i) => (i === gi ? { ...g, cats: moveItem(g.cats, from, to) } : g)))
  })

  const renameGroup = (gi, name) => {
    const v = name.trim()
    if (!v || v === groups[gi].name) return
    if (groups.some((g, i) => i !== gi && g.name.toLowerCase() === v.toLowerCase())) return toast('There is already a group with that name.', 'error')
    save(groups.map((g, i) => (i === gi ? { ...g, name: v } : g)))
  }
  const removeGroup = (gi) => {
    if (groups[gi].cats.length) return toast('Empty the group first: move or remove its categories.', 'error')
    save(groups.filter((_, i) => i !== gi))
  }
  const addGroup = () => {
    const v = newGroup.trim()
    if (!v) return
    if (groups.some((g) => g.name.toLowerCase() === v.toLowerCase())) return toast('There is already a group with that name.', 'error')
    save([...groups, { name: v, cats: [] }]); setNewGroup('')
  }
  const renameCat = (from, to) => {
    const v = to.trim()
    if (!v || v === from) return
    if (taken(v, from)) return toast(`"${v}" already exists.`, 'error')
    let n = 0
    update((s) => { n = renameCategory(s, from, v); return s })
    toast(n ? `Renamed, and ${n} budget line${n === 1 ? '' : 's'} moved with it` : 'Renamed', 'ok')
  }
  const setFin = (gi, ci, fin) => save(groups.map((g, i) => (i === gi ? { ...g, cats: g.cats.map((c, j) => (j === ci ? { ...c, fin } : c)) } : g)))
  const addCat = (gi) => {
    const v = (newCat[gi] || '').trim()
    if (!v) return
    if (taken(v)) return toast(`"${v}" already exists.`, 'error')
    save(groups.map((g, i) => (i === gi ? { ...g, cats: [...g.cats, { name: v, fin: 'Other expense' }] } : g)))
    setNewCat({ ...newCat, [gi]: '' })
  }
  const askRemove = (cat) => {
    const uses = categoryUses(state, cat)
    if (!uses.lines) return removeCat(cat)
    const other = all.filter((c) => c !== cat)
    if (!other.length) return toast('Add another category first, so the lines have somewhere to go.', 'error')
    setMoving({ cat, to: other[0], uses })
  }
  const removeCat = (cat, to) => {
    let n = 0
    update((s) => {
      if (to) n = moveLines(s, cat, to)
      s.settings = { ...s.settings, budgetCategories: budgetGroups(s.settings).map((g) => ({ ...g, cats: g.cats.filter((c) => c.name !== cat) })) }
      return s
    })
    setMoving(null)
    toast(n ? `Removed, ${n} line${n === 1 ? '' : 's'} moved to ${to}` : 'Removed', 'ok')
  }
  const reset = () => { save(null); toast('Standard categories are back. Lines under a category that no longer exists show as Unlisted in the budget.', 'ok') }

  return (
    <div className="bcat">
      {groups.map((g, gi) => (
        <div key={g.name} {...sort.row('groups', gi)} className={`bcat-group ${sort.cls('groups', gi)}`}>
          <div className="bcat-head">
            <Grip {...sort.grip('groups', gi)} />
            <input className="input bcat-name" defaultValue={g.name} onBlur={(e) => renameGroup(gi, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} aria-label="Group name" />
            <button className="bcat-btn bcat-x" title={g.cats.length ? 'Empty the group first' : 'Remove group'} disabled={!!g.cats.length} onClick={() => removeGroup(gi)}>×</button>
          </div>
          <ul className="plain bcat-list">
            {g.cats.map((c, ci) => (
              <li key={c.name} {...sort.row(`cats-${gi}`, ci)} className={`bcat-row ${sort.cls(`cats-${gi}`, ci)}`}>
                <Grip {...sort.grip(`cats-${gi}`, ci)} />
                <input className="input" defaultValue={c.name} onBlur={(e) => { if (e.target.value.trim() !== c.name) { const v = e.target.value; e.target.value = c.name; renameCat(c.name, v) } }} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} aria-label="Category name" />
                <Select value={c.fin || 'Other expense'} onChange={(e) => setFin(gi, ci, e.target.value)} options={[...new Set([...expenseCats(state.finance?.settings), ...(c.fin ? [c.fin] : [])])]} aria-label="Finance column" />
                <button className="bcat-btn bcat-x" title="Remove" onClick={() => askRemove(c.name)}>×</button>
                {moving?.cat === c.name && (
                  <div className="bcat-move">
                    <span>{moving.uses.lines} line{moving.uses.lines === 1 ? '' : 's'} in {moving.uses.projects} project{moving.uses.projects === 1 ? '' : 's'} use it. Move them to</span>
                    <Select value={moving.to} onChange={(e) => setMoving({ ...moving, to: e.target.value })} options={all.filter((x) => x !== c.name)} />
                    <Button size="sm" variant="primary" onClick={() => removeCat(c.name, moving.to)}>Move and remove</Button>
                    <Button size="sm" variant="ghost" onClick={() => setMoving(null)}>Cancel</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="bcat-add">
            <Input value={newCat[gi] || ''} onChange={(e) => setNewCat({ ...newCat, [gi]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addCat(gi)} placeholder={`New category in ${g.name}`} />
            <Button size="sm" variant="ghost" onClick={() => addCat(gi)}>Add</Button>
          </div>
        </div>
      ))}
      <div className="bcat-add bcat-add-group">
        <Input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addGroup()} placeholder="New group" />
        <Button size="sm" variant="ghost" onClick={addGroup}>Add group</Button>
        <span className="grow" />
        <Confirm onConfirm={reset} label="Reset to standard">Reset to standard</Confirm>
      </div>
    </div>
  )
}

/* Settings > Calendar > Event types (Alex, 11 Oct). A type removed while events still use it is
   kept as removed (see eventTypesOf), so those events keep their name and colour. */
const NEW_TYPE_COLOURS = ['#E0679A', '#7C8CE0', '#3FA796', '#C99A2E', '#A8754F', '#8E6FD8']
function EventTypesSettings({ state, update, toast }) {
  const all = eventTypesOf(state.settings)
  const shown = all.filter((t) => !t.removed)
  const [name, setName] = useState('')
  const save = (next) => update((s) => { s.settings = { ...s.settings, eventTypes: next }; return s })
  const patch = (key, p) => save(all.map((t) => (t.key === key ? { ...t, ...p } : t)))
  const sort = useDragSort((from, to) => save([...moveItem(shown, from, to), ...all.filter((t) => t.removed)]))
  const taken = (v, except) => shown.some((t) => t.key !== except && t.label.toLowerCase() === v.toLowerCase())
  const rename = (t, v) => {
    const x = v.trim()
    if (!x || x === t.label) return
    if (taken(x, t.key)) return toast(`"${x}" already exists.`, 'error')
    patch(t.key, { label: x })
  }
  const remove = (t) => {
    const n = (state.events || []).filter((e) => e.type === t.key).length
    // the app's own kinds (shoot days, Google, days off) are only ever hidden, never dropped
    save(n || FIXED_EVENT_TYPES.includes(t.key) ? all.map((x) => (x.key === t.key ? { ...x, removed: true } : x)) : all.filter((x) => x.key !== t.key))
    toast(n ? `Removed. The ${n} event${n === 1 ? '' : 's'} already of this type keep${n === 1 ? 's' : ''} it.` : 'Removed', 'ok')
  }
  const restore = (t) => save([...shown, { ...t, removed: false }, ...all.filter((x) => x.removed && x.key !== t.key)])
  const add = () => {
    const x = name.trim()
    if (!x) return
    const old = all.find((t) => t.removed && t.label.toLowerCase() === x.toLowerCase())
    if (old) { restore(old); setName(''); return }
    if (taken(x)) return toast(`"${x}" already exists.`, 'error')
    const colour = NEW_TYPE_COLOURS[all.length % NEW_TYPE_COLOURS.length]
    // a new type goes before From Google Calendar and Not available, which close the list
    const at = shown.findIndex((t) => t.key === 'google' || t.key === 'unavailable')
    const next = [...shown]
    next.splice(at < 0 ? next.length : at, 0, { key: `t-${uid()}`, label: x, color: colour })
    save([...next, ...all.filter((t) => t.removed)])
    setName('')
  }
  return (
    <div className="stack">
      <ul className="plain evtype-list">
        {shown.map((t, i) => (
          <li key={t.key} {...sort.row('evtypes', i)} className={`evtype-row ${sort.cls('evtypes', i)}`}>
            <Grip {...sort.grip('evtypes', i)} />
            <label className="evtype-colour" style={{ background: t.color }} title="Colour">
              <input type="color" value={t.color} onChange={(e) => patch(t.key, { color: e.target.value })} aria-label={`Colour of ${t.label}`} />
            </label>
            <input className="input" defaultValue={t.label} key={t.label} onBlur={(e) => rename(t, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} aria-label="Type name" />
            <button className="bcat-btn bcat-x" title="Remove" onClick={() => remove(t)}>×</button>
          </li>
        ))}
      </ul>
      {all.some((t) => t.removed) && (
        <div className="evtype-removed">
          <span className="small muted">Removed:</span>
          {all.filter((t) => t.removed).map((t) => (
            <button key={t.key} type="button" className="evtype-back" onClick={() => restore(t)} title="Bring it back">
              <i style={{ background: t.color }} />{t.label}<b>+</b>
            </button>
          ))}
        </div>
      )}
      <div className="bcat-add">
        <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="New type, e.g. Fitting" />
        <Button size="sm" variant="ghost" onClick={add}>Add</Button>
      </div>
      <div className="evtype-reset">
        <Confirm onConfirm={() => { save(null); toast('The standard event types are back.', 'ok') }} label="Reset to standard">Reset to standard</Confirm>
      </div>
    </div>
  )
}

function ProgressSettings({ state, setSetting }) {
  const [cat, setCat] = useState(CATEGORIES[0])
  const conf = state.settings.progress?.[cat] || {}
  const sample = { ...emptyProject(), category: cat, scenes: [], shootingDays: [], contacts: [], locations: [] }
  const base = projectProgress(sample, {}).stages
  const save = (next) => setSetting('progress', { ...(state.settings.progress || {}), [cat]: next })
  const toggle = (key) => { const off = new Set(conf.off || []); off.has(key) ? off.delete(key) : off.add(key); save({ ...conf, off: [...off] }) }
  const weight = (key, w) => save({ ...conf, weights: { ...(conf.weights || {}), [key]: Number(w) || 0 } })
  const [label, setLabel] = useState('')
  const addCustom = () => { if (!label.trim()) return; save({ ...conf, custom: [...(conf.custom || []), { key: uid(), label: label.trim(), weight: 10 }] }); setLabel('') }
  const removeCustom = (k) => save({ ...conf, custom: (conf.custom || []).filter((c) => c.key !== k) })
  const customWeight = (k, w) => save({ ...conf, custom: (conf.custom || []).map((c) => (c.key === k ? { ...c, weight: Number(w) || 0 } : c)) })
  return (
    <div className="stack">
      <div className="segmented small wrap">{CATEGORIES.map((c) => <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>)}</div>
      <ul className="plain prog-list">
        {base.map((st) => (
          <li key={st.key}>
            <label className="prog-row"><input type="checkbox" checked={!(conf.off || []).includes(st.key)} onChange={() => toggle(st.key)} /><span className="grow">{st.label}</span><input className="input sm" type="number" min={0} max={100} value={conf.weights?.[st.key] ?? st.weight} onChange={(e) => weight(st.key, e.target.value)} title="Weight" /></label>
          </li>
        ))}
        {(conf.custom || []).map((c) => (
          <li key={c.key}>
            <div className="prog-row"><span className="badge">manual</span><span className="grow">{c.label}</span><input className="input sm" type="number" min={0} max={100} value={c.weight} onChange={(e) => customWeight(c.key, e.target.value)} /><button className="link small" onClick={() => removeCustom(c.key)}>×</button></div>
          </li>
        ))}
      </ul>
      <div className="row-actions">
        <Input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add a manual stage, e.g. Client sign-off" onKeyDown={(e) => e.key === 'Enter' && addCustom()} />
        <Button variant="ghost" onClick={addCustom}>Add</Button>
      </div>
      <p className="small muted">Weights are relative: a stage weighing 25 counts 2.5 times a stage weighing 10.</p>
    </div>
  )
}


function ActivityLog() {
  const { state } = useStore()
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('')
  useEffect(() => {
    if (!remote) { setRows([]); return }
    supabase.from('activity').select('*').eq('workspace_id', state.workspace.id).order('created_at', { ascending: false }).limit(200).then(({ data, error }) => {
      if (error) setErr(error.code === '42P01' ? 'Run supabase/activity.sql in the Supabase SQL editor to start logging.' : error.message)
      setRows(data || [])
    })
  }, [state.workspace.id])
  if (!remote) return <p className="muted small">Available with the team workspace on Supabase.</p>
  if (err) return <p className="error small">{err}</p>
  if (!rows) return <p className="muted small">Loading…</p>
  const list = rows.filter((r) => !filter.trim() || [r.user_name, r.target_name, r.detail, r.action].join(' ').toLowerCase().includes(filter.trim().toLowerCase()))
  const verb = (r) => ({ created: 'created', updated: 'edited', deleted: 'deleted', locked: 'locked', unlocked: 'unlocked', removed: 'removed' })[r.action] || r.action
  const when = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return (
    <div className="stack">
      <Input className="input" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by person, project or section" />
      {!list.length ? <p className="muted small">Nothing logged yet.</p> : (
        <ul className="plain act-list">
          {list.map((r) => (
            <li key={r.id}>
              <span className="act-when muted small">{when(r.created_at)}</span>
              <span className="act-text"><strong>{r.user_name || 'Someone'}</strong> {verb(r)} {r.target} <strong>{r.target_name}</strong>{r.detail ? <span className="muted"> · {r.detail}</span> : null}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* A short editable list of rows, used for the standing production
   contacts. Rows are saved as you type; the Remove button drops one, Add appends a blank. */
function RowList({ rows, onChange, fields, addLabel, empty }) {
  const set = (id, k, v) => onChange(rows.map((r) => (r.id === id ? { ...r, [k]: v } : r)))
  return (
    <div className="rowlist">
      {rows.map((r) => (
        <div key={r.id} className="rowlist-row">
          {fields.map((f) => (
            <Input key={f.k} value={r[f.k] || ''} placeholder={f.placeholder} inputMode={f.inputMode} onChange={(e) => set(r.id, f.k, e.target.value)} />
          ))}
          <button className="link small" onClick={() => onChange(rows.filter((x) => x.id !== r.id))}>Remove</button>
        </div>
      ))}
      {!rows.length && <p className="muted small">{empty}</p>}
      <Button variant="ghost" onClick={() => onChange([...rows, { id: uid(), ...Object.fromEntries(fields.map((f) => [f.k, ''])) }])}>{addLabel}</Button>
    </div>
  )
}


/* Settings > Integrations > File storage: the switch, the pCloud connection and its test. */
function PcloudPanel({ toast }) {
  const { state, update } = useStore()
  const [oauth, setOauth] = useState(takeOauth)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState(null)
  const set = (k, v) => update((s) => { s.settings = { ...s.settings, [k]: v }; return s })
  const clientId = state.settings.pcloudClientId || ''
  const copy = async () => {
    try { await navigator.clipboard.writeText(oauth.token); toast('Token copied', 'ok') } catch { toast('Select the token and copy it by hand.', 'error') }
  }
  const test = async () => {
    setTesting(true)
    setResult(null)
    try {
      const r = await pcloudPing()
      setResult(r)
      toast(`Connected as ${r.email}`, 'ok')
    } catch (e) {
      setResult({ error: e.message })
    }
    setTesting(false)
  }
  const gb = (n) => `${(n / 1073741824).toFixed(1)} GB`
  return (
    <div className="stack">
      <Field label="Uploaded files go to">
        <Select value={state.settings.storage === 'pcloud' ? 'pcloud' : 'supabase'} onChange={(e) => set('storage', e.target.value)} options={[['supabase', 'Built-in storage (Supabase)'], ['pcloud', 'The company pCloud (through the pcloud function)']]} />
      </Field>
      <p className="small muted">Files already uploaded stay where they are and keep opening. Switch to pCloud only after the test below says Connected.</p>
      <ol className="small muted pc-steps">
        <li>At <a href="https://docs.pcloud.com/my_apps/" target="_blank" rel="noreferrer">docs.pcloud.com/my_apps</a> make an app named TML HUB with this redirect URI: <code>{redirectUri()}</code>. Copy its Client ID here.</li>
        <li>Connect pCloud below, allow, and you come back here with a token. Copy it.</li>
        <li>In Supabase: Edge Functions → Secrets → add <code>PCLOUD_TOKEN</code> (the token), <code>PCLOUD_HOST</code> (eapi.pcloud.com for a European account) and <code>PCLOUD_ROOT</code> (/TML HUB).</li>
        <li>In Supabase: Edge Functions → Deploy a new function → via Editor, name <code>pcloud</code>, paste <code>supabase/functions/pcloud/index.ts</code>, Deploy.</li>
        <li>Test connection, then switch the setting above to pCloud.</li>
      </ol>
      <Field label="pCloud Client ID">
        <div className="row-actions">
          <Input value={clientId} onChange={(e) => set('pcloudClientId', e.target.value.trim())} placeholder="From docs.pcloud.com/my_apps" autoComplete="off" />
          <a className={`btn btn-primary ${clientId ? '' : 'disabled'}`} href={clientId ? authorizeUrl(clientId) : undefined} onClick={(e) => { if (!clientId) e.preventDefault() }}>Connect pCloud</a>
        </div>
      </Field>
      {oauth?.token && (
        <div className="pc-token">
          <p className="small"><b>pCloud sent back a token.</b> Copy it into the function's secrets as <code>PCLOUD_TOKEN</code>{oauth.locationid === '2' ? <>, with <code>PCLOUD_HOST</code> = eapi.pcloud.com (European account)</> : oauth.locationid === '1' ? <>, with <code>PCLOUD_HOST</code> = api.pcloud.com (US account)</> : null}. It is shown once and is not saved anywhere in the app.</p>
          <div className="row-actions">
            <Input value={oauth.token} readOnly onFocus={(e) => e.target.select()} />
            <Button variant="primary" onClick={copy}>Copy</Button>
            <Button variant="ghost" onClick={() => { clearOauth(); setOauth(null) }}>Done, hide it</Button>
          </div>
        </div>
      )}
      <div className="row-actions">
        <Button onClick={test} disabled={testing}>{testing ? 'Testing…' : 'Test connection'}</Button>
        {result?.ok && <span className="small under">Connected as {result.email} · {result.host} · folder {result.root} · {gb(result.used)} of {gb(result.quota)} used</span>}
        {result?.error && <span className="small" style={{ color: 'var(--danger)' }}>{result.error}</span>}
      </div>
    </div>
  )
}

/* Settings > Integrations > Google Calendar: connect once (code exchanged for a refresh token,
   shown once for copying into the function's secrets, same spirit as pCloud's token), then pick
   which of that account's calendars this workspace talks to. */
/* Settings > Integrations > Calendar feeds: published .ics addresses the Calendar page reads. */
const PALETTE = ['#6C9BD1', '#5B9E7A', '#B07FD1', '#E08A5A', '#4FB3BF', '#C8503F', '#D9A441', '#9AA0A6']
function CalendarFeedsPanel({ toast }) {
  const { state, update } = useStore()
  const feeds = feedsOf(state.settings)
  const off = feedsAreOff(state.settings)
  const [draft, setDraft] = useState(null)
  const [testing, setTesting] = useState(false)
  const save = (list) => update((s) => { s.settings = { ...s.settings, calendarFeeds: list }; return s })
  const setOff = (v) => update((s) => { s.settings = { ...s.settings, calendarFeedsOff: v }; return s })
  const patch = (id, change) => save(feeds.map((f) => (f.id === id ? { ...f, ...change } : f)))
  const add = () => {
    const url = (draft.url || '').trim()
    if (!url) return toast('Paste the calendar address.', 'error')
    if (feeds.some((f) => f.url === url)) return toast('That calendar is already on the list.', 'error')
    save([...feeds, { id: uid(), name: (draft.name || '').trim() || 'Calendar', url, color: draft.color }])
    setDraft(null)
    toast('Calendar added', 'ok')
  }
  // Reading it once here says whether the address works before it is saved, and how many events
  // are in it, rather than finding out from an empty Calendar page.
  const test = async (url, name) => {
    setTesting(true)
    try {
      const text = await fetchFeedText((url || '').trim())
      const year = new Date().getFullYear()
      const events = parseIcs(text, { from: `${year}-01-01`, to: `${year + 1}-12-31` })
      toast(`${name || 'That calendar'} works: ${events.length} events this year and next.`, 'ok')
    } catch (e) {
      toast(e.message, 'error')
    }
    setTesting(false)
  }
  return (
    <div className="stack">
      <Field label="Show these calendars on the Calendar page" hint="Off hides all of them at once and stops the app reading them. The addresses below stay as they are, so turning it back on needs nothing else.">
        <Select value={off ? 'no' : 'yes'} onChange={(e) => setOff(e.target.value === 'no')} options={[['yes', 'Yes'], ['no', 'No']]} />
      </Field>
      {off && !!feeds.length && <p className="small muted">{feeds.length === 1 ? 'The calendar below is' : `All ${feeds.length} calendars below are`} switched off right now. Test still works, so you can check one without turning them back on.</p>}
      <ol className="small muted pc-steps">
        <li>In Google Calendar on a computer, hover the calendar in the left list &rarr; &#8942; &rarr; <b>Settings and sharing</b>.</li>
        <li>Scroll to <b>Integrate calendar</b> and copy the <b>Secret address in iCal format</b> (the one ending in <code>/basic.ics</code>).</li>
        <li>Paste it below, name it, give it a colour. Repeat for each calendar of that account.</li>
      </ol>
      {!!feeds.length && (
        <ul className="plain gcal-list">
          {feeds.map((f) => (
            <li key={f.id}>
              <input type="color" value={f.color || FEED_COLOR} onChange={(e) => patch(f.id, { color: e.target.value })} aria-label={`Colour of ${f.name}`} title="Colour on the Calendar page" />
              <Input className="grow" value={f.name || ''} onChange={(e) => patch(f.id, { name: e.target.value })} aria-label="Name" />
              <label className="check" title="Show it on the Calendar page">
                <input type="checkbox" checked={!f.off} onChange={(e) => patch(f.id, { off: !e.target.checked })} />
                <span className="small">Show</span>
              </label>
              <button className="link small" onClick={() => test(f.url, f.name)} disabled={testing}>Test</button>
              <Confirm onConfirm={() => save(feeds.filter((x) => x.id !== f.id))} label="Remove">×</Confirm>
            </li>
          ))}
        </ul>
      )}
      {draft ? (
        <>
          <div className="row-2">
            <Field label="Name" hint="What it is called in the legend."><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Personal" autoFocus /></Field>
            <Field label="Colour"><input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} /></Field>
          </div>
          <Field label="Secret address in iCal format" hint="Anyone with this address can read that calendar, so treat it like a password.">
            <Input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" autoComplete="off" />
          </Field>
          <div className="row-actions">
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={() => test(draft.url, draft.name)} disabled={testing || !draft.url.trim()}>{testing ? 'Reading…' : 'Test it'}</Button>
            <Button variant="primary" onClick={add}>Add calendar</Button>
          </div>
        </>
      ) : (
        <div className="row-actions"><Button variant="primary" onClick={() => setDraft({ name: '', url: '', color: PALETTE[feeds.length % PALETTE.length] })}>Add a calendar</Button></div>
      )}
    </div>
  )
}

function GoogleCalendarPanel({ toast }) {
  const { state, update } = useStore()
  const [code] = useState(takeOauthCode)
  const [exchanging, setExchanging] = useState(false)
  const [refreshToken, setRefreshToken] = useState('')
  const [testing, setTesting] = useState(false)
  const [calendars, setCalendars] = useState(null)
  const [error, setError] = useState('')
  const set = (k, v) => update((s) => { s.settings = { ...s.settings, [k]: v }; return s })
  const clientId = state.settings.googleClientId || ''
  const calendarId = state.settings.googleCalendarId || ''

  useEffect(() => {
    if (!code?.code) return
    setExchanging(true)
    gcalConnect(code.code, gcalRedirectUri())
      .then((r) => setRefreshToken(r.refreshToken))
      .catch((e) => toast(e.message, 'error'))
      .finally(() => { setExchanging(false); clearOauthCode() })
    // once, for the code this page loaded with
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast('Copied', 'ok') } catch { toast('Select it and copy by hand.', 'error') }
  }
  const test = async () => {
    setTesting(true)
    setError('')
    try {
      const r = await gcalCalendars()
      setCalendars(r.calendars)
      toast(`${r.calendars.length} calendars found`, 'ok')
    } catch (e) {
      setError(e.message)
      setCalendars(null)
    }
    setTesting(false)
  }

  return (
    <div className="stack">
      <ol className="small muted pc-steps">
        <li>At <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">console.cloud.google.com/apis/credentials</a>, make a project if you don't have one, enable the <b>Google Calendar API</b>, then create an OAuth Client ID of type <b>Web application</b> with this authorized redirect URI: <code>{gcalRedirectUri()}</code>. Copy its Client ID here.</li>
        <li>On the <b>OAuth consent screen</b> for that project, add your own Google account under Test users. Google will warn "unverified app" when you connect below — expected for an app only you use, click Advanced → Go to (app name) to carry on.</li>
        <li>In Supabase: Edge Functions → Secrets → add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> (both from the same credential).</li>
        <li>In Supabase: Edge Functions → Deploy a new function → via Editor, name <code>google-calendar</code>, paste <code>supabase/functions/google-calendar/index.ts</code>, Deploy.</li>
        <li>Connect below, allow access, and you come back here with a refresh token. Copy it into the function's secrets as <code>GOOGLE_REFRESH_TOKEN</code>.</li>
        <li>Test connection, pick which calendar below, and that's it — events start syncing both ways.</li>
      </ol>
      <Field label="Google Client ID">
        <div className="row-actions">
          <Input value={clientId} onChange={(e) => set('googleClientId', e.target.value.trim())} placeholder="…apps.googleusercontent.com" autoComplete="off" />
          <a className={`btn btn-primary ${clientId ? '' : 'disabled'}`} href={clientId ? gcalAuthorizeUrl(clientId) : undefined} onClick={(e) => { if (!clientId) e.preventDefault() }}>Connect Google Calendar</a>
        </div>
      </Field>
      {exchanging && <p className="small muted">Exchanging the code with Google…</p>}
      {refreshToken && (
        <div className="pc-token">
          <p className="small"><b>Google sent back a refresh token.</b> Copy it into the function's secrets as <code>GOOGLE_REFRESH_TOKEN</code>. It is shown once and is not saved anywhere in the app.</p>
          <div className="row-actions">
            <Input value={refreshToken} readOnly onFocus={(e) => e.target.select()} />
            <Button variant="primary" onClick={() => copy(refreshToken)}>Copy</Button>
            <Button variant="ghost" onClick={() => setRefreshToken('')}>Done, hide it</Button>
          </div>
        </div>
      )}
      <div className="row-actions">
        <Button onClick={test} disabled={testing}>{testing ? 'Testing…' : 'Test connection'}</Button>
        {error && <span className="small" style={{ color: 'var(--danger)' }}>{error}</span>}
      </div>
      {calendars && (
        <Field label="Calendar" hint="Which of that account's calendars this workspace reads from and writes to.">
          <Select value={calendarId} onChange={(e) => set('googleCalendarId', e.target.value)} options={[['', 'Pick a calendar'], ...calendars.map((c) => [c.id, c.summary + (c.primary ? ' (primary)' : '')])]} />
        </Field>
      )}
      {calendarId && !calendars && <p className="small under">Connected to a calendar already. Test connection to change it.</p>}
    </div>
  )
}

