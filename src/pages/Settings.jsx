import { useEffect, useRef, useState } from 'react'
import { Button, Confirm, Field, Input, PageHead, Select, Textarea, useToast } from '../components/ui.jsx'
import { CATEGORIES, DEFAULT_DEPARTMENTS, STORAGE_KEY, callsheetDefaults, departmentsOf, emptyProject, sampleProject, today, uid, useCurrentUser, useStore } from '../lib/store.jsx'
import { projectProgress } from '../lib/progress.js'
import { EXPENSE_CATS } from '../lib/finance.js'
import { budgetGroups, categoryUses, moveLines, renameCategory } from '../lib/budgetCats.js'
import { remote, supabase } from '../lib/supabase.js'

import { testKey } from '../lib/ai.js'
import { download } from '../lib/dates.js'

export default function Settings() {
  const { state, update, replaceState, logout, mode, syncError, localBackup } = useStore()
  const me = useCurrentUser()
  const toast = useToast()
  const fileRef = useRef()
  const [ws, setWs] = useState(state.workspace)
  const [ai, setAi] = useState(state.settings)
  const [testing, setTesting] = useState(false)
  const [textSize, setTextSize] = useState(() => localStorage.getItem('tml_text_size') || 'normal')
  const [theme, setTheme] = useState(() => localStorage.getItem('tml_theme') || 'light')
  const [accent, setAccent] = useState(() => localStorage.getItem('tml_accent') || 'amber')
  const applyTheme = (v) => { setTheme(v); localStorage.setItem('tml_theme', v); document.documentElement.dataset.theme = v }
  const applyAccent = (v) => { setAccent(v); localStorage.setItem('tml_accent', v); document.documentElement.dataset.accent = v }
  const applyTextSize = (v) => {
    setTextSize(v)
    localStorage.setItem('tml_text_size', v)
    document.documentElement.dataset.textSize = v
  }
  const isAdmin = me?.role === 'admin'
  const TABS = [
    ['company', 'Company', true], ['callsheets', 'Call sheets', true], ['team', 'Team', true], ['calendar', 'Calendar & projects', true], ['budget', 'Budget', true],
    ['display', 'Display', false], ['integrations', 'Integrations', false], ['data', 'Data', false],
  ].filter(([, , admin]) => !admin || isAdmin)
  const [tab, setTab] = useState(() => (isAdmin ? 'company' : 'display'))
  const logoRef = useRef()
  const [cs, setCs] = useState(() => callsheetDefaults(state))
  const [depts, setDepts] = useState(() => departmentsOf(state).join('\n'))
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
      <nav className="tabs settings-tabs">
        {TABS.map(([k, l]) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </nav>
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
            <h2>Call sheet defaults</h2>
            <p className="small muted">Used for every new shooting day and wherever a call sheet field is left empty. Each day can still override them.</p>
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
              <Field label="Footer on every call sheet" hint="Also shown at the bottom of shared links."><Input value={cs.footer} onChange={(e) => setCs({ ...cs, footer: e.target.value })} placeholder="Παραγωγή The Mad Lions · production@themadlions.com · +30 69…" /></Field>
              <div className="row-2">
                <Field label="Cast call, minutes vs crew call" hint="Negative = earlier (makeup), positive = later. Applied to every new cast member, editable per person."><Input type="number" step={15} value={cs.castOffset ?? 0} onChange={(e) => setCs({ ...cs, castOffset: e.target.value })} /></Field>
                <Field label="Crew call, minutes vs crew call"><Input type="number" step={15} value={cs.crewOffset ?? 0} onChange={(e) => setCs({ ...cs, crewOffset: e.target.value })} /></Field>
              </div>
              <div className="row-2">
                <Field label="Weather on call sheets"><Select value={cs.showWeather === false ? 'no' : 'yes'} onChange={(e) => setCs({ ...cs, showWeather: e.target.value === 'yes' })} options={[['yes', 'Show forecast'], ['no', 'Hide']]} /></Field>
                <Field label="Sunrise and sunset"><Select value={cs.showSun === false ? 'no' : 'yes'} onChange={(e) => setCs({ ...cs, showSun: e.target.value === 'yes' })} options={[['yes', 'Show'], ['no', 'Hide']]} /></Field>
              </div>
              <div className="row-actions"><Button variant="primary" onClick={saveCs}>Save defaults</Button></div>
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="panel" data-tab="callsheets">
            <h2>Emergency numbers</h2>
            <p className="small muted">Printed on every call sheet and on the public link, so nobody has to look them up on set. Tap to dial on a phone.</p>
            <RowList
              rows={state.settings.emergency || []}
              onChange={(rows) => setSetting('emergency', rows)}
              fields={[{ k: 'label', placeholder: 'Ambulance (ΕΚΑΒ)' }, { k: 'number', placeholder: '166', inputMode: 'tel' }]}
              addLabel="Add a number"
              empty="No emergency numbers. Nothing will be printed on the call sheets."
            />
          </section>
        )}

        {isAdmin && (
          <section className="panel" data-tab="callsheets">
            <h2>Production contacts</h2>
            <p className="small muted">The people who are the same on every shoot. They appear under Production on every call sheet and on the public link, above the key crew picked from that project.</p>
            <RowList
              rows={state.settings.productionContacts || []}
              onChange={(rows) => setSetting('productionContacts', rows)}
              fields={[{ k: 'role', placeholder: '1st AD' }, { k: 'name', placeholder: 'Name' }, { k: 'phone', placeholder: '+30 69…', inputMode: 'tel' }]}
              addLabel="Add a contact"
              empty="None yet. Call sheets will show only the key crew of each project."
            />
          </section>
        )}

        {isAdmin && (
          <section className="panel" data-tab="callsheets">
            <h2>Share links</h2>
            <Field label="Public call sheet links expire" hint="Counted from the shooting day. Expired links show a short 'this call sheet has expired' page. Sharing again always refreshes the link.">
              <Select value={String(state.settings.shareExpiryDays || 0)} onChange={(e) => setSetting('shareExpiryDays', Number(e.target.value))} options={[['0', 'Never'], ['1', 'The day after the shoot'], ['3', '3 days after the shoot'], ['7', 'A week after the shoot'], ['30', 'A month after the shoot']]} />
            </Field>
            <Field label="Ask for a code on call sheet links" hint="The link carries everyone's phone number, and links get forwarded. With this on, each call sheet link gets a six digit code that you send separately; without it the page shows nothing. Crew type it once per phone.">
              <Select value={state.settings.sharePin ? 'yes' : 'no'} onChange={(e) => setSetting('sharePin', e.target.value === 'yes')} options={[['no', 'No, the link is enough'], ['yes', 'Yes, link plus a code']]} />
            </Field>
          </section>
        )}

        {isAdmin && (
          <section className="panel" data-tab="team">
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
          <section className="panel" data-tab="team">
            <h2>Team rules</h2>
            <div className="stack">
              <Field label="Default access for a new teammate" hint="What every module starts at when you add someone. Drives archive always starts at none. Notices are always administrators only; call sheet share links are open to everyone who can see call sheets.">
                <Select value={state.settings.newMemberLevel || 'view'} onChange={(e) => setSetting('newMemberLevel', e.target.value)} options={[['none', 'Nothing until you set it'], ['view', 'Can view'], ['edit', 'Can edit']]} />
              </Field>
              <Field label="Who sees phone numbers and emails of cast and crew" hint="Applies inside the app (project Cast & crew, Database). Call sheets and shared links keep showing the numbers they need.">
                <Select value={state.settings.phoneVisibility || 'everyone'} onChange={(e) => setSetting('phoneVisibility', e.target.value)} options={[['everyone', 'Everyone in the team'], ['admins', 'Administrators only']]} />
              </Field>
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
          <section className="panel" data-tab="calendar">
            <h2>Calendar</h2>
            <Field label="Show Greek public holidays" hint="New Year, Epiphany, Clean Monday, 25 March, Good Friday, Easter, Easter Monday, 1 May, Holy Spirit Monday, 15 August, 28 October, Christmas and 26 December. The movable ones follow Orthodox Easter.">
              <Select value={state.settings.greekHolidays === false ? 'no' : 'yes'} onChange={(e) => setSetting('greekHolidays', e.target.value === 'yes')} options={[['yes', 'Yes'], ['no', 'No']]} />
            </Field>
            <Field label="Week starts on">
              <Select value={state.settings.weekStart || 'monday'} onChange={(e) => setSetting('weekStart', e.target.value)} options={[['monday', 'Monday'], ['sunday', 'Sunday']]} />
            </Field>
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
              <div className="row-2">
                <Field label="Budget currency for new projects"><Select value={state.settings.budgetCurrency || 'EUR'} onChange={(e) => setSetting('budgetCurrency', e.target.value)} options={[['EUR', 'EUR €'], ['USD', 'USD $'], ['GBP', 'GBP £']]} /></Field>
                <Field label="Budget contingency % for new projects"><Input type="number" min={0} max={50} value={state.settings.budgetContingency ?? 10} onChange={(e) => setSetting('budgetContingency', Number(e.target.value) || 0)} /></Field>
              </div>
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
          <section className="panel" data-tab="budget">
            <h2>Budget categories</h2>
            <p className="small muted">What a budget line can be filed under, in groups, the same for every project. Click a name to rename it: every line already filed under it follows. A category with lines on it cannot be removed until you say where those lines go. The Finance column is where a payment on that category lands in Finance.</p>
            <BudgetCategoriesSettings state={state} update={update} toast={toast} />
          </section>
        )}

        <section className="panel" data-tab="display">
          <h2>Display</h2>
          <Field label="Theme">
            <div className="segmented small">
              {[['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => (
                <button key={v} className={theme === v ? 'on' : ''} onClick={() => applyTheme(v)}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label="Accent colour">
            <div className="accent-swatches">
              {[['amber', '#c9932f', 'Lion amber'], ['red', '#c8503f', 'Red'], ['slate', '#3f5578', 'Slate blue'], ['ink', '#1f2430', 'Ink']].map(([v, c, l]) => (
                <button key={v} className={`swatch ${accent === v ? 'on' : ''}`} style={{ '--sw': c }} onClick={() => applyAccent(v)} title={l}><span className="dot" />{l}</button>
              ))}
            </div>
          </Field>
          <Field label="Text size" hint="Display settings are saved on this device only.">
            <div className="segmented small">
              {[['compact', 'Compact'], ['normal', 'Normal'], ['large', 'Large']].map(([v, l]) => (
                <button key={v} className={textSize === v ? 'on' : ''} onClick={() => applyTextSize(v)}>{l}</button>
              ))}
            </div>
          </Field>
        </section>

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

        <section className="panel" data-tab="integrations">
          <h2>Transcription</h2>
          <p className="muted small">Lyrics and timings from the song file with OpenAI Whisper, in the Music tab of music video projects. About $0.006 per minute of audio. The key stays in this browser.</p>
          <Field label="OpenAI API key">
            <Input type="password" value={state.settings.openaiKey || ''} onChange={(e) => update((s) => { s.settings.openaiKey = e.target.value.trim(); return s })} placeholder="sk-…" autoComplete="off" />
          </Field>
          {state.settings.openaiKey && <p className="small under">Key saved on this device.</p>}
        </section>

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
        <section className="panel" data-tab="data">
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
    </>
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
  const swap = (arr, i, j) => {
    if (j < 0 || j >= arr.length) return arr
    const a = [...arr]
    const t = a[i]; a[i] = a[j]; a[j] = t
    return a
  }

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
  const moveCat = (gi, ci, dir) => save(groups.map((g, i) => (i === gi ? { ...g, cats: swap(g.cats, ci, ci + dir) } : g)))
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
        <div className="bcat-group" key={g.name}>
          <div className="bcat-head">
            <input className="input bcat-name" defaultValue={g.name} onBlur={(e) => renameGroup(gi, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} aria-label="Group name" />
            <button className="bcat-btn" title="Move up" disabled={gi === 0} onClick={() => save(swap(groups, gi, gi - 1))}>↑</button>
            <button className="bcat-btn" title="Move down" disabled={gi === groups.length - 1} onClick={() => save(swap(groups, gi, gi + 1))}>↓</button>
            <button className="bcat-btn bcat-x" title={g.cats.length ? 'Empty the group first' : 'Remove group'} disabled={!!g.cats.length} onClick={() => removeGroup(gi)}>×</button>
          </div>
          <ul className="plain bcat-list">
            {g.cats.map((c, ci) => (
              <li key={c.name} className="bcat-row">
                <input className="input" defaultValue={c.name} onBlur={(e) => { if (e.target.value.trim() !== c.name) { const v = e.target.value; e.target.value = c.name; renameCat(c.name, v) } }} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} aria-label="Category name" />
                <Select value={c.fin || 'Other expense'} onChange={(e) => setFin(gi, ci, e.target.value)} options={EXPENSE_CATS} aria-label="Finance column" />
                <button className="bcat-btn" title="Move up" disabled={ci === 0} onClick={() => moveCat(gi, ci, -1)}>↑</button>
                <button className="bcat-btn" title="Move down" disabled={ci === g.cats.length - 1} onClick={() => moveCat(gi, ci, 1)}>↓</button>
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

/* A short editable list of rows, used for the emergency numbers and the standing production
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
