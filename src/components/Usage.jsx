import { useEffect, useMemo, useState } from 'react'
import { Button, Field, Select } from './ui.jsx'
import { pcloudOn } from '../lib/pcloud.js'
import { gcalOn } from '../lib/googleCalendar.js'
import { GITHUB_LIMITS, GITHUB_REPO_URL, SUPABASE_DASHBOARD_URL, SUPABASE_PLANS, fmtSize, githubUsage, supabaseUsage, tone, workspaceWeight } from '../lib/usage.js'

function Meter({ label, used, limit, note }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0
  return (
    <div className="usage-meter">
      <div className="usage-meter-top">
        <span>{label}</span>
        <span><strong>{fmtSize(used)}</strong>{limit ? <span className="muted"> of {fmtSize(limit)} · {pct < 1 && used ? '<1' : Math.round(pct)}%</span> : null}</span>
      </div>
      {limit ? <div className="usage-track"><div className={`usage-fill ${tone(used, limit)}`} style={{ width: `${Math.max(pct, used ? 1 : 0)}%` }} /></div> : null}
      {note && <div className="muted small">{note}</div>}
    </div>
  )
}

const ago = (iso) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000)
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`
}

export default function Usage({ state, setSetting }) {
  const plan = SUPABASE_PLANS[state.settings.supabasePlan] || SUPABASE_PLANS.free
  const weight = useMemo(() => workspaceWeight(state), [state])
  const [sb, setSb] = useState(null)
  const [gh, setGh] = useState(null)
  const [loading, setLoading] = useState(false)
  const load = () => {
    setLoading(true)
    Promise.all([
      supabaseUsage().then((d) => setSb({ data: d }), (e) => setSb({ error: e.message })),
      githubUsage().then((d) => setGh({ data: d }), (e) => setGh({ error: e.message })),
    ]).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const storageBytes = (sb?.data?.buckets || []).reduce((a, b) => a + Number(b.bytes || 0), 0)
  const openings = weight.total ? Math.floor(plan.egress / weight.total) : 0
  const s = state.settings
  const services = [
    ['Google Fonts', 'The typefaces', 'Free, no limit', ''],
    ['Open-Meteo', 'Weather and sun times on call sheets', 'Free up to 10,000 requests a day', ''],
    ['Anthropic (Claude)', 'AI breakdown of scripts and treatments', s.aiKey ? 'Key set on this device' : 'No key on this device', 'https://console.anthropic.com'],
    ['OpenAI (Whisper)', 'Lyrics and timing in the Music tab', s.openaiKey ? 'Key set on this device' : 'No key on this device', 'https://platform.openai.com/usage'],
    ['pCloud', 'Photos, songs, chat files', pcloudOn(s) ? 'Connected' : 'Not connected', ''],
    ['Google Calendar', 'Calendar sync', gcalOn(s) ? 'Connected' : 'Not connected', ''],
  ]

  return (
    <div className="usage">
      <div className="row-actions usage-refresh">
        <Button variant="ghost" onClick={load} disabled={loading}>{loading ? 'Checking…' : 'Check again'}</Button>
      </div>

      <section className="panel">
        <h2>What loads when you open the app</h2>
        <p className="small muted">Everything below comes down from Supabase each time someone opens the app, so it decides how fast the app starts. Under 2 MB is quick, above 5 MB starts to feel slow on a phone.</p>
        <Meter label="Workspace data" used={weight.total} note={openings ? `With the ${plan.label} plan's ${fmtSize(plan.egress)} of downloads a month, that is roughly ${openings.toLocaleString('en-GB')} openings of the app, before saves, photos and chat.` : ''} />
        <ul className="usage-parts">
          {weight.parts.filter((p) => p.bytes > 64).map((p) => (
            <li key={p.label}>
              <span>{p.label}</span>
              <span className="usage-part-bar"><span style={{ width: `${(p.bytes / weight.total) * 100}%` }} /></span>
              <span className="num">{fmtSize(p.bytes)}</span>
            </li>
          ))}
        </ul>
        {weight.images > weight.total * 0.25 && (
          <p className="notice">{fmtSize(weight.images)} of it ({Math.round((weight.images / weight.total) * 100)}%) is pictures kept inside the projects themselves: storyboard frames, covers and photo previews.</p>
        )}
        {weight.projects.length > 0 && (
          <>
            <h3 className="usage-sub">Heaviest projects</h3>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Project</th><th className="num">Size</th><th className="num">Pictures inside</th><th className="num">Storyboard frames</th></tr></thead>
              <tbody>
                {weight.projects.slice(0, 6).map((p) => (
                  <tr key={p.id}><td>{p.title}</td><td className="num">{fmtSize(p.bytes)}</td><td className="num">{p.images ? fmtSize(p.images) : ''}</td><td className="num">{p.frames || ''}</td></tr>
                ))}
              </tbody>
            </table></div>
          </>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Supabase</h2>
          {SUPABASE_DASHBOARD_URL && <a className="btn btn-ghost btn-sm" href={SUPABASE_DASHBOARD_URL} target="_blank" rel="noreferrer">Open dashboard</a>}
        </div>
        <Field label="Your plan" hint="Sets the limits the bars measure against.">
          <Select value={state.settings.supabasePlan || 'free'} onChange={(e) => setSetting('supabasePlan', e.target.value)} options={Object.entries(SUPABASE_PLANS).map(([k, v]) => [k, v.label])} />
        </Field>
        {!sb ? <p className="muted small">Checking…</p> : sb.error ? <p className="notice">{sb.error}</p> : (
          <>
            <Meter label="Database" used={sb.data.db_bytes} limit={plan.db} />
            <Meter label="File storage (photos, files, songs)" used={storageBytes} limit={plan.storage}
              note={(sb.data.buckets || []).map((b) => `${b.name}: ${fmtSize(b.bytes)}, ${b.files} files`).join(' · ')} />
            <div className="usage-meter">
              <div className="usage-meter-top"><span>Accounts</span><span><strong>{sb.data.accounts}</strong><span className="muted"> of {plan.mau.toLocaleString('en-GB')} monthly active users</span></span></div>
            </div>
            <details className="usage-tables">
              <summary className="small">Biggest tables</summary>
              <table className="table">
                <thead><tr><th>Table</th><th className="num">Rows</th><th className="num">Size</th></tr></thead>
                <tbody>{(sb.data.tables || []).slice(0, 8).map((t) => <tr key={t.name}><td>{t.name}</td><td className="num">{Number(t.rows).toLocaleString('en-GB')}</td><td className="num">{fmtSize(t.bytes)}</td></tr>)}</tbody>
              </table>
            </details>
          </>
        )}
        <p className="small muted">Downloads (egress, {fmtSize(plan.egress)} a month on {plan.label}) and monthly active users are counted only in the Supabase dashboard, under Usage. {plan === SUPABASE_PLANS.free ? 'A Free project pauses after a week with nobody using it.' : ''}</p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>GitHub</h2>
          <a className="btn btn-ghost btn-sm" href={`${GITHUB_REPO_URL}/actions`} target="_blank" rel="noreferrer">Open Actions</a>
        </div>
        {!gh ? <p className="muted small">Checking…</p> : gh.error ? <p className="notice">{gh.error}</p> : (
          <>
            {gh.data.last && (
              <p className="small">
                Last update of the live site: <strong className={gh.data.last.conclusion === 'success' ? 'under' : gh.data.last.conclusion ? 'over' : ''}>{gh.data.last.status !== 'completed' ? 'in progress' : gh.data.last.conclusion === 'success' ? 'published' : 'failed'}</strong>
                {' '}{ago(gh.data.last.at)} · <a href={gh.data.last.url} target="_blank" rel="noreferrer">{gh.data.last.title}</a>
              </p>
            )}
            <Meter label="Published site (compressed)" used={gh.data.siteBytes} limit={GITHUB_LIMITS.site} />
            <Meter label="Code repository" used={gh.data.repoBytes} limit={GITHUB_LIMITS.repo} />
            <p className="small muted">{gh.data.deploysToday} update{gh.data.deploysToday === 1 ? '' : 's'} of the site in the last 24 hours{gh.data.failedRecent ? `, ${gh.data.failedRecent} failed among the last 30` : ', none of the last 30 failed'}. Build minutes are free for a public repository. Traffic (about {fmtSize(GITHUB_LIMITS.bandwidth)} a month) is not reported by GitHub.</p>
          </>
        )}
      </section>

      <section className="panel">
        <h2>Other services</h2>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Service</th><th>Used for</th><th>Status</th><th /></tr></thead>
          <tbody>
            {services.map(([name, use, status, url]) => (
              <tr key={name}><td>{name}</td><td className="muted">{use}</td><td>{status}</td><td>{url && <a href={url} target="_blank" rel="noreferrer">Usage</a>}</td></tr>
            ))}
          </tbody>
        </table></div>
        <p className="small muted">pCloud and Google Calendar go through Supabase Edge Functions (500,000 calls a month on Free). Anthropic and OpenAI bill your own key directly; their usage is on their own sites.</p>
      </section>
    </div>
  )
}
