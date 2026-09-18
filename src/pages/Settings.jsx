import { useEffect, useRef, useState } from 'react'
import { Button, Confirm, Field, Input, PageHead, Select, Textarea, useToast } from '../components/ui.jsx'
import { CATEGORIES, DEFAULT_DEPARTMENTS, STORAGE_KEY, callsheetDefaults, departmentsOf, emptyProject, sampleProject, uid, useCurrentUser, useStore } from '../lib/store.jsx'
import { projectProgress } from '../lib/progress.js'
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
    ['company', 'Company', true], ['callsheets', 'Call sheets', true], ['team', 'Team', true], ['calendar', 'Calendar & projects', true],
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
  const backup = () => download(`themadlions-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), 'application/json')
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
            <h2>Share links</h2>
            <Field label="Public call sheet links expire" hint="Counted from the shooting day. Expired links show a short 'this call sheet has expired' page. Sharing again always refreshes the link.">
              <Select value={String(state.settings.shareExpiryDays || 0)} onChange={(e) => setSetting('shareExpiryDays', Number(e.target.value))} options={[['0', 'Never'], ['1', 'The day after the shoot'], ['3', '3 days after the shoot'], ['7', 'A week after the shoot'], ['30', 'A month after the shoot']]} />
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
            <Field label="Week starts on">
              <Select value={state.settings.weekStart || 'monday'} onChange={(e) => setSetting('weekStart', e.target.value)} options={[['monday', 'Monday'], ['sunday', 'Sunday']]} />
            </Field>
          </section>
        )}
        {isAdmin && (
          <section className="panel" data-tab="calendar">
            <h2>Projects</h2>
            <div className="stack">
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
