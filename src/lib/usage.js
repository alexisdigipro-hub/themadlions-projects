import { remote, supabase } from './supabase.js'
import { SUPABASE_URL } from './supabaseConfig.js'

// Plan limits as published by Supabase and GitHub in 2026. They change now and then: if a number
// here looks off, the dashboards linked from Settings > Usage are the source of truth.
export const SUPABASE_PLANS = {
  free: { label: 'Free', db: 500 * 2 ** 20, storage: 2 ** 30, egress: 5 * 2 ** 30, mau: 50000 },
  pro: { label: 'Pro', db: 8 * 2 ** 30, storage: 100 * 2 ** 30, egress: 250 * 2 ** 30, mau: 100000 },
}
export const GITHUB_LIMITS = { site: 2 ** 30, repo: 2 ** 30, bandwidth: 100 * 2 ** 30 }

const REPO = 'alexisdigipro-hub/themadlions-projects'
export const GITHUB_REPO_URL = `https://github.com/${REPO}`
export const SUPABASE_DASHBOARD_URL = SUPABASE_URL ? `https://supabase.com/dashboard/project/${new URL(SUPABASE_URL).hostname.split('.')[0]}` : ''

export const fmtSize = (b) => {
  const n = Number(b) || 0
  if (n >= 2 ** 30) return `${(n / 2 ** 30).toFixed(n >= 10 * 2 ** 30 ? 0 : 1).replace(/\.0$/, '')} GB`
  if (n >= 2 ** 20) return `${(n / 2 ** 20).toFixed(n >= 100 * 2 ** 20 ? 0 : 1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}

// 'ok' under 70%, 'warn' up to 90%, 'over' past it
export const tone = (used, limit) => (!limit ? '' : used / limit >= 0.9 ? 'over' : used / limit >= 0.7 ? 'warn' : 'ok')

const enc = new TextEncoder()
const bytesOf = (x) => enc.encode(JSON.stringify(x ?? null)).length
// pictures kept inside the data itself as text (data: URLs), as opposed to files in Storage
function inlineImageBytes(x) {
  let n = 0
  const walk = (v) => {
    if (typeof v === 'string') { if (v.startsWith('data:')) n += v.length }
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') for (const k in v) walk(v[k])
  }
  walk(x)
  return n
}

/* What comes down from the database every time someone opens the app, measured on what this
   browser holds right now. */
export function workspaceWeight(state) {
  const parts = [
    ['Projects', state.projects],
    ['Calendar events', state.events],
    ['Database', state.library],
    ['Finance', state.finance],
    ['Chat messages', state.chat],
    ['My work', state.worklog],
    ['Notices', state.notices],
    ['Team', state.users],
  ].map(([label, v]) => ({ label, bytes: bytesOf(v) })).sort((a, b) => b.bytes - a.bytes)
  const total = parts.reduce((a, p) => a + p.bytes, 0)
  const projects = (state.projects || []).map((p) => ({
    id: p.id,
    title: p.title || 'Untitled',
    bytes: bytesOf(p),
    images: inlineImageBytes(p),
    frames: (p.shots || []).filter((s) => typeof s.frame === 'string' && s.frame.startsWith('data:')).length,
  })).sort((a, b) => b.bytes - a.bytes)
  return { total, parts, projects, images: projects.reduce((a, p) => a + p.images, 0) }
}

export async function supabaseUsage() {
  if (!remote) throw new Error('Local mode: there is no online database to measure.')
  const { data, error } = await supabase.rpc('usage_stats')
  if (error) {
    if (error.code === 'PGRST202' || /usage_stats/.test(error.message || '')) throw new Error('Run supabase/usage.sql once in the Supabase SQL Editor to see these numbers.')
    throw new Error(error.message)
  }
  return data
}

/* Public repository, so GitHub answers without a login (60 checks an hour per network). */
export async function githubUsage() {
  const get = async (path) => {
    const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { headers: { Accept: 'application/vnd.github+json' } })
    if (r.status === 403 || r.status === 429) throw new Error('GitHub allows 60 checks an hour from one network. Try again in a while.')
    if (!r.ok) throw new Error(`GitHub answered ${r.status}.`)
    return r.json()
  }
  const [repo, runs, arts] = await Promise.all([
    get(''),
    get('/actions/runs?branch=main&event=push&per_page=30'),
    get('/actions/artifacts?name=github-pages&per_page=1'),
  ])
  const list = runs.workflow_runs || []
  const dayAgo = Date.now() - 864e5
  const last = list[0]
  return {
    repoBytes: (repo.size || 0) * 1024,
    siteBytes: arts.artifacts?.[0]?.size_in_bytes || 0,
    deploysToday: list.filter((r) => Date.parse(r.created_at) > dayAgo).length,
    failedRecent: list.filter((r) => r.conclusion === 'failure').length,
    last: last ? { title: last.display_title, status: last.status, conclusion: last.conclusion, at: last.updated_at, url: last.html_url } : null,
  }
}
