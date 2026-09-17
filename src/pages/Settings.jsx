import { useRef, useState } from 'react'
import { Button, Confirm, Field, Input, PageHead, useToast } from '../components/ui.jsx'
import { STORAGE_KEY, sampleProject, useCurrentUser, useStore } from '../lib/store.jsx'
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
  const applyTextSize = (v) => {
    setTextSize(v)
    localStorage.setItem('tml_text_size', v)
    document.documentElement.dataset.textSize = v
  }
  const isAdmin = me?.role === 'admin'

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
      <div className="cols">
        <section className="panel">
          <h2>Display</h2>
          <Field label="Text size" hint="Saved on this device only.">
            <div className="segmented small">
              {[['compact', 'Compact'], ['normal', 'Normal'], ['large', 'Large']].map(([v, l]) => (
                <button key={v} className={textSize === v ? 'on' : ''} onClick={() => applyTextSize(v)}>{l}</button>
              ))}
            </div>
          </Field>
        </section>

        <section className="panel">
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
          <section className="panel">
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
          <section className="panel">
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

        {isAdmin && (
          <section className="panel">
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

        <section className="panel">
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
