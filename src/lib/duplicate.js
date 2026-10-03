import { uid } from './store.jsx'
import { remote, supabase } from './supabase.js'
import { joinName, nameParts } from './projectName.js'

// arrays in a project whose items point at a file in Storage, and the bucket that file lives in
const BUCKET_FOR = { photos: 'photos', tracks: 'audio', files: 'files' }

/*
 * A full copy of a project under a new id: script, breakdown, shots, schedule, call sheets,
 * budget, cast, crew, locations, gear, tasks, notes, photos and songs. Files in Storage sit in
 * a folder named after the project, so each one is copied into the new project's folder; the
 * copy can then delete a photo without taking it from the original. A file that cannot be
 * copied keeps pointing at the original's and is counted in `shared`.
 *
 * Left behind on purpose: payments on budget lines (they are the original's Finance
 * transactions; the amounts stay, the copy's lines read as unpaid), the lock, and the code
 * (the caller gives the next one). Budget lines get new ids so a line paid to a team member
 * never shares its My work job with the original's line.
 */
export async function duplicateProject(src) {
  const copy = structuredClone(src)
  const id = uid()
  const now = new Date().toISOString()
  const { artist, shortTitle } = nameParts(src)
  Object.assign(copy, { id, code: '', artist, shortTitle: `${shortTitle || 'Untitled'} (copy)`, createdAt: now, updatedAt: now, frozen: false })
  copy.title = joinName(copy.artist, copy.shortTitle)
  delete copy.isNew

  for (const l of copy.budget?.lines || []) {
    l.id = uid()
    if (l.txId && (l.estimate === '' || l.estimate == null)) l.estimate = Number(l.actual) || 0
    delete l.txId
    delete l.payments
    l.actual = ''
  }

  const files = []
  const walk = (v, key) => {
    if (Array.isArray(v)) {
      v.forEach((x) => {
        if (BUCKET_FOR[key] && typeof x?.path === 'string' && x.path.startsWith(`${src.id}/`)) files.push({ bucket: BUCKET_FOR[key], item: x })
        walk(x, key)
      })
    } else if (v && typeof v === 'object') {
      for (const k in v) walk(v[k], k)
    }
  }
  walk(copy, '')

  let shared = 0
  if (remote) {
    const queue = [...files]
    const worker = async () => {
      for (let f = queue.shift(); f; f = queue.shift()) {
        const to = id + f.item.path.slice(src.id.length)
        const { error } = await supabase.storage.from(f.bucket).copy(f.item.path, to)
        if (error) shared += 1
        else f.item.path = to
      }
    }
    await Promise.all([worker(), worker(), worker(), worker()])
  }
  return { project: copy, files: files.length, shared }
}
