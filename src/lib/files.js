import { remote, supabase } from './supabase.js'
import { pcloudDelete, pcloudLink, pcloudUpload } from './pcloud.js'
const BUCKET = 'files'
const session = new Map()
export const fmtBytes = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`)
const safe = (name) => name.replace(/[^\w.\-()\u0370-\u03FF\u1F00-\u1FFF ]+/g, '_').slice(0, 120)

/* Uploads one file. Default: the private Supabase bucket at <projectId>/<id>-<name>. With
   `pcloud: { folder, scope }` (Settings > Integrations > File storage = pCloud) the file goes to
   Alex's pCloud through the pcloud function instead, and the record keeps `fileid` + `scope`
   so fileUrl() and deleteFile() know where to ask. */
export async function uploadFile({ projectId, id, file, onProgress, pcloud }) {
  if (!remote) {
    session.set(id, URL.createObjectURL(file))
    return { path: '' }
  }
  if (pcloud) {
    onProgress?.('Uploading to pCloud…')
    const r = await pcloudUpload({ file, folder: pcloud.folder, scope: pcloud.scope })
    return { path: '', fileid: r.fileid, scope: pcloud.scope }
  }
  const path = `${projectId}/${id}-${safe(file.name)}`
  onProgress?.('Uploading…')
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: true })
  if (error) throw new Error(/not found/i.test(error.message) ? 'Storage bucket "files" is missing. Run supabase/files.sql in the SQL editor.' : /exceeded|too large|maximum/i.test(error.message) ? 'File too large for the current plan (50 MB per file).' : error.message)
  return { path }
}
/* Takes the file record (or, from older code, its storage path). */
export async function deleteFile(f) {
  if (!remote || !f) return
  if (typeof f === 'string') return void (await supabase.storage.from(BUCKET).remove([f]))
  if (f.fileid) return void (await pcloudDelete(f.fileid, f.scope))
  if (f.path) await supabase.storage.from(BUCKET).remove([f.path])
}
export async function fileUrl(f, download = false) {
  if (!f) return ''
  if (!remote) return session.get(f.id) || ''
  if (f.fileid) {
    try { return (await pcloudLink(f.fileid, f.scope, download)).url || '' } catch { return '' }
  }
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(f.path, 3600, download ? { download: f.name } : undefined)
  return error ? '' : data?.signedUrl || ''
}
export const fileIcon = (name = '', type = '') => {
  const n = name.toLowerCase()
  if (type.startsWith('image/')) return '🖼'
  if (type.startsWith('video/')) return '🎬'
  if (type.startsWith('audio/')) return '🎵'
  if (n.endsWith('.pdf')) return '📄'
  if (/\.(docx?|pages|txt|md|fdx|fountain)$/.test(n)) return '📝'
  if (/\.(xlsx?|csv|numbers)$/.test(n)) return '📊'
  if (/\.(zip|rar|7z)$/.test(n)) return '🗜'
  return '📎'
}
