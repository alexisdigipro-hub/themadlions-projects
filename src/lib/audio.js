import { remote, supabase } from './supabase.js'
import { pcloudBlob, pcloudDelete, pcloudLink, pcloudUpload } from './pcloud.js'

const BUCKET = 'audio'
const sessionUrls = new Map() // local mode: object URLs for this session only

export const fmtTime = (s) => {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60), r = Math.floor(s % 60)
  return `${m}:${String(r).padStart(2, '0')}`
}
export const fmtTimeMs = (s) => `${fmtTime(s)}.${String(Math.floor((s % 1) * 10))}`
export const parseTime = (t) => {
  const m = String(t || '').trim().match(/^(\d+):(\d{1,2})(?:\.(\d))?$/)
  if (!m) return Number(t) || 0
  return Number(m[1]) * 60 + Number(m[2]) + (m[3] ? Number(m[3]) / 10 : 0)
}

/* Decode the file in the browser and reduce it to N peaks for the waveform. */
export async function analyze(file, buckets = 700) {
  const Ctx = window.AudioContext || window.webkitAudioContext
  const ctx = new Ctx()
  try {
    const buf = await ctx.decodeAudioData(await file.arrayBuffer())
    const ch = buf.numberOfChannels > 1 ? [buf.getChannelData(0), buf.getChannelData(1)] : [buf.getChannelData(0)]
    const len = buf.length
    const per = Math.max(1, Math.floor(len / buckets))
    const peaks = new Array(buckets).fill(0)
    for (let i = 0; i < buckets; i++) {
      const start = i * per, end = Math.min(len, start + per)
      let max = 0
      for (let j = start; j < end; j += 4) {
        for (const c of ch) { const v = Math.abs(c[j]); if (v > max) max = v }
      }
      peaks[i] = Math.round(max * 100) / 100
    }
    const top = Math.max(0.01, ...peaks)
    return { peaks: peaks.map((p) => Math.round((p / top) * 100) / 100), duration: buf.duration }
  } finally {
    ctx.close?.()
  }
}

/* With `pcloud` (Settings > Integrations > File storage = pCloud) the song goes to Alex's pCloud,
   in the project's Music folder, and the track keeps `fileid` + `scope` instead of a path. */
export async function uploadTrack({ projectId, id, file, pcloud }) {
  const ext = (file.name.split('.').pop() || 'mp3').toLowerCase()
  if (!remote) {
    sessionUrls.set(id, URL.createObjectURL(file))
    return { path: '', ext }
  }
  if (pcloud) {
    const r = await pcloudUpload({ file, folder: pcloud.folder, scope: pcloud.scope })
    return { path: '', ext, fileid: r.fileid, scope: pcloud.scope }
  }
  const path = `${projectId}/${id}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'audio/mpeg', upsert: true })
  if (error) throw new Error(/not found/i.test(error.message) ? 'Storage bucket "audio" is missing. Run supabase/audio.sql in the SQL editor.' : error.message)
  return { path, ext }
}
/* Takes the track (or, from older code, its storage path). */
export async function deleteTrack(t) {
  if (!remote || !t) return
  if (typeof t === 'object') {
    if (t.fileid) return void (await pcloudDelete(t.fileid, t.scope))
    t = t.path
  }
  if (!t) return
  await supabase.storage.from(BUCKET).remove([t])
}
/* The song's bytes (for Whisper and for saving it to the device). A pCloud song comes through
   the pcloud function; a stored one from its signed link. */
export async function trackBlob(track, url) {
  if (track?.fileid) return pcloudBlob(track.fileid, track.scope)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not download the song from storage (${res.status}). Reload the page and try again; the link may have expired.`)
  return res.blob()
}
const cache = new Map()
/* Why the last trackUrl() came back empty, for the page to show instead of a silent blank player. */
export let lastTrackError = ''
export async function trackUrl(track) {
  if (!track) return ''
  if (!remote) return sessionUrls.get(track.id) || ''
  if (track.fileid) {
    const c = cache.get(`pc:${track.fileid}`)
    if (c && c.exp > Date.now()) return c.url
    try {
      const { url } = await pcloudLink(track.fileid, track.scope)
      lastTrackError = ''
      cache.set(`pc:${track.fileid}`, { url, exp: Date.now() + 50 * 60 * 1000 })
      return url
    } catch (e) {
      lastTrackError = `pCloud did not give the song (${e.message}).`
      return ''
    }
  }
  if (!track.path) { lastTrackError = 'This track has no stored file. Remove it and upload the song again.'; return '' }
  const c = cache.get(track.path)
  if (c && c.exp > Date.now()) return c.url
  let data, error
  try {
    ;({ data, error } = await supabase.storage.from(BUCKET).createSignedUrl(track.path, 3600 * 3))
  } catch (e) {
    error = e
  }
  if (error || !data?.signedUrl) {
    const msg = error?.message || 'no link came back'
    lastTrackError = /not found|object/i.test(msg) ? `The file is missing from storage (${msg}).` : /jwt|token|auth|401|403|row-level|permission/i.test(msg) ? `Storage refused the request (${msg}). Sign out and in again.` : `Storage did not answer (${msg}). Check the connection and reload.`
    return ''
  }
  lastTrackError = ''
  cache.set(track.path, { url: data.signedUrl, exp: Date.now() + 170 * 60 * 1000 })
  return data.signedUrl
}
export const SECTION_NAMES = ['Intro', 'Verse 1', 'Pre-chorus', 'Chorus', 'Verse 2', 'Chorus 2', 'Bridge', 'Solo', 'Breakdown', 'Final chorus', 'Outro']

export const songMapText = (music, scenes = []) => {
  const secs = [...(music?.sections || [])].sort((a, b) => a.start - b.start)
  return secs.map((s) => {
    const setups = (s.sceneIds || []).map((id) => scenes.find((x) => x.id === id)).filter(Boolean).map((x) => `${x.number}. ${x.location || x.heading}`)
    return `${fmtTime(s.start)} - ${fmtTime(s.end)}  ${s.name}${setups.length ? `  [${setups.join('; ')}]` : ''}\n${s.lyrics || ''}`.trim()
  }).join('\n\n')
}
