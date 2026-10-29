// Database > pCloud without the online database (the local build, for trying it out and for checks): a small made-up
// pCloud in memory that answers the function's filesX actions the same way, so the page works and can be tested.
let next = 100
const id = () => ++next
const day = (d) => new Date(d).toUTCString()
const GB = 1e9, MB = 1e6
// [name, size, date, hash] files; [name, [...]] folders
const TREE = ['', [
  ['Projects - FinalCuts', [
    ['Panic Records', [
      ['Alcatrash - Ακόμα λίγο', [
        ['Alcatrash -Ακόμα λίγο (TV).mp4', 1.75 * GB, '2022-06-08', 'h1'],
        ['Alcatrash -Ακόμα λίγο (Web).mp4', 410 * MB, '2022-06-08', 'h2'],
        ['Cover still.jpg', 3.2 * MB, '2022-06-07', 'h3'],
      ]],
      ['Ilie mou', [
        ['Ilie mou_YouTube_4K.mov', 6.4 * GB, '2026-10-16', 'h4'],
        ['Ilie mou_Social_9x16.mp4', 220 * MB, '2026-10-16', 'h5'],
      ]],
    ]],
    ['Boulevart Studios', [
      ['Spring campaign', [['Spring_30s_FINAL.mov', 2.1 * GB, '2026-04-02', 'h6'], ['Spring_15s.mp4', 90 * MB, '2026-04-02', 'h7']]],
    ]],
  ]],
  ['Projects - RoughCuts', [['Ilie mou RC2.mp4', 640 * MB, '2026-10-10', 'h8'], ['Spring_30s_v3.mp4', 300 * MB, '2026-03-28', 'h9']]],
  ['TML HUB', [['Deliveries', []], ['Backups', [['2026-10-29 09.00', [['themadlions-data-2026-10-29.json', 2.4 * MB, '2026-10-29', 'h10']]]]]]],
  ['Old Exports ', [
    ['Alcatrash TV copy.mp4', 1.75 * GB, '2022-07-01', 'h1'],
    ['Spring_30s_FINAL (1).mov', 2.1 * GB, '2026-05-10', 'h6'],
    ['notes.txt', 2000, '2025-01-01', 'h11'],
  ]],
  ['Photos', [['BTS_001.jpg', 5.1 * MB, '2026-10-12', 'h12'], ['BTS_002.jpg', 4.8 * MB, '2026-10-12', 'h13'], ['BTS_001 copy.jpg', 5.1 * MB, '2026-10-13', 'h12']]],
]]
const kind = (n) => (/\.(mp4|mov|mxf|m4v)$/i.test(n) ? ['video/mp4', 2] : /\.(jpe?g|png|heic)$/i.test(n) ? ['image/jpeg', 1] : /\.(wav|mp3)$/i.test(n) ? ['audio/mpeg', 3] : ['application/octet-stream', 4])
const build = ([name, kids]) => ({ folder: true, name, folderid: name ? id() : 0, kids: kids.map((k) => (Array.isArray(k[1]) ? build(k) : { folder: false, name: k[0], fileid: id(), size: Math.round(k[1]), modified: day(k[2]), created: day(k[2]), type: kind(k[0])[0], category: kind(k[0])[1], hash: k[3] })) })
const root = build(TREE)
const KEPT = ['/tml hub', '/projects - roughcuts', '/projects - finalcuts', '/']

function find(path) {
  let at = root
  for (const p of path.split('/').filter((x) => x !== '')) {
    at = at.kids.find((k) => k.folder && k.name === p)
    if (!at) throw new Error('pCloud: Directory does not exist.')
  }
  return at
}
function byId(n, key, v, path = '') {
  for (const k of n.kids) {
    const p = `${path}/${k.name}`
    if (k[key] === v) return { node: k, parent: n, path: p }
    if (k.folder) { const r = byId(k, key, v, p); if (r) return r }
  }
  return null
}
function pathOfFolder(f, n = root, path = '') {
  if (n === f) return path || '/'
  for (const k of n.kids) if (k.folder) { const r = pathOfFolder(f, k, `${path}/${k.name}`); if (r) return r }
  return null
}
const out = (k, base) => {
  const path = base === '/' ? `/${k.name}` : `${base}/${k.name}`
  if (k.folder) return { folder: true, name: k.name, path, folderid: k.folderid, modified: day('2026-10-01') }
  const { kids, ...f } = k // eslint-disable-line no-unused-vars
  return { ...f, path, thumb: false }
}
const wait = () => new Promise((ok) => setTimeout(ok, 120))
const uploads = new Map()

export async function demoCall(action, body = {}) {
  await wait()
  const target = (b) => (b.fileid ? byId(root, 'fileid', Number(b.fileid)) : byId(root, 'folderid', Number(b.folderid)))
  if (action === 'filesList') {
    const f = body.folderid ? byId(root, 'folderid', Number(body.folderid))?.node : find(body.path || '/')
    if (!f) throw new Error('pCloud: Directory does not exist.')
    const path = body.path || pathOfFolder(f)
    return { ok: true, ready: true, path, edit: true, admin: true, demo: true, items: f.kids.map((k) => out(k, path)) }
  }
  if (action === 'filesLink') {
    const t = byId(root, 'fileid', Number(body.fileid))
    // a photo shows a drawn stand-in; a video has no web copy here, so the page says so
    if (t?.node.category === 1) return { ok: true, url: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#2b3038"/><text x="640" y="370" fill="#eef0f3" font-size="40" font-family="sans-serif" text-anchor="middle">${t.node.name}</text></svg>`)}` }
    return { ok: true, url: '' }
  }
  if (action === 'filesShare') return { ok: true, url: 'https://u.pcloud.link/publink/show?code=DEMO' }
  if (action === 'filesMkdir') {
    const f = find(body.path)
    const name = String(body.name).trim()
    if (!f.kids.some((k) => k.folder && k.name === name)) f.kids.push({ folder: true, name, folderid: id(), kids: [] })
    return { ok: true }
  }
  if (action === 'filesRename' || action === 'filesMove' || action === 'filesTrash') {
    const t = target(body)
    if (!t) throw new Error('pCloud: File or folder not found.')
    if (t.node.folder && KEPT.includes(String(body.from || t.path).toLowerCase())) throw new Error('The hub writes into this folder; it stays.')
    if (action === 'filesRename') t.node.name = String(body.name).trim()
    else {
      if (action === 'filesMove') {
        if (t.node.folder && (body.to + '/').startsWith(t.path + '/')) throw new Error('A folder cannot go inside itself.')
        find(body.to).kids.push(t.node)
      }
      t.parent.kids = t.parent.kids.filter((k) => k !== t.node)
    }
    return { ok: true }
  }
  if (action === 'filesUploadStart') { const u = id(); uploads.set(u, 0); return { ok: true, uploadid: u } }
  if (action === 'filesChunk') { const u = Number(body.get('uploadid')); uploads.set(u, (uploads.get(u) || 0) + (body.get('file')?.size || 0)); return { ok: true } }
  if (action === 'filesUploadFinish') {
    const f = find(body.path)
    const k = { folder: false, name: body.name, fileid: id(), size: uploads.get(Number(body.uploadid)) || 0, modified: new Date().toUTCString(), created: new Date().toUTCString(), type: kind(body.name)[0], category: kind(body.name)[1], hash: `u${id()}` }
    f.kids.push(k)
    return { ok: true, item: out(k, body.path) }
  }
  throw new Error(`Unknown action "${action}".`)
}
