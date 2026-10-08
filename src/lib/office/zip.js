/* A small zip reader and writer for Office files (.docx and .xlsx are zip archives of XML), on
   the browser's own CompressionStream / DecompressionStream: no library (Alex, 8 Oct, Office). */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}
const deflate = (bytes) => pipe(bytes, new CompressionStream('deflate-raw'))
const inflate = (bytes) => pipe(bytes, new DecompressionStream('deflate-raw'))

const enc = new TextEncoder()
const dec = new TextDecoder()

/* { name: Uint8Array } from a zip file's bytes. */
export async function readZip(buffer) {
  const b = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  // the end-of-central-directory record, searched from the end (a comment may follow it)
  let eocd = -1
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) throw new Error('This is not an Office file (no zip directory).')
  const count = v.getUint16(eocd + 10, true)
  let p = v.getUint32(eocd + 16, true)
  const files = {}
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('The file is damaged (zip directory).')
    const method = v.getUint16(p + 10, true)
    const csize = v.getUint32(p + 20, true)
    const nameLen = v.getUint16(p + 28, true)
    const extraLen = v.getUint16(p + 30, true)
    const commentLen = v.getUint16(p + 32, true)
    const local = v.getUint32(p + 42, true)
    const name = dec.decode(b.subarray(p + 46, p + 46 + nameLen))
    p += 46 + nameLen + extraLen + commentLen
    if (name.endsWith('/')) continue
    const lNameLen = v.getUint16(local + 26, true)
    const lExtraLen = v.getUint16(local + 28, true)
    const start = local + 30 + lNameLen + lExtraLen
    const data = b.subarray(start, start + csize)
    if (method === 0) files[name] = data.slice()
    else if (method === 8) files[name] = await inflate(data)
    else throw new Error(`The file uses a zip method this app cannot read (${method}).`)
  }
  return files
}
export const zipText = (files, name) => (files[name] ? dec.decode(files[name]) : '')

/* A zip file's bytes from [[name, string | Uint8Array], …], deflated. */
export async function writeZip(entries) {
  const parts = []
  const central = []
  let offset = 0
  const now = new Date()
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  for (const [name, content] of entries) {
    const raw = typeof content === 'string' ? enc.encode(content) : content
    const packed = await deflate(raw)
    const nameBytes = enc.encode(name)
    const crc = crc32(raw)
    const head = new Uint8Array(30 + nameBytes.length)
    const h = new DataView(head.buffer)
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 8, true)
    h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true)
    h.setUint32(18, packed.length, true); h.setUint32(22, raw.length, true); h.setUint16(26, nameBytes.length, true)
    head.set(nameBytes, 30)
    const dir = new Uint8Array(46 + nameBytes.length)
    const d = new DataView(dir.buffer)
    d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true); d.setUint16(8, 0x0800, true); d.setUint16(10, 8, true)
    d.setUint16(12, time, true); d.setUint16(14, date, true); d.setUint32(16, crc, true)
    d.setUint32(20, packed.length, true); d.setUint32(24, raw.length, true); d.setUint16(28, nameBytes.length, true)
    d.setUint32(42, offset, true)
    dir.set(nameBytes, 46)
    parts.push(head, packed)
    central.push(dir)
    offset += head.length + packed.length
  }
  const dirSize = central.reduce((a, x) => a + x.length, 0)
  const end = new Uint8Array(22)
  const e = new DataView(end.buffer)
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true)
  e.setUint32(12, dirSize, true); e.setUint32(16, offset, true)
  const all = [...parts, ...central, end]
  const out = new Uint8Array(all.reduce((a, x) => a + x.length, 0))
  let o = 0
  for (const x of all) { out.set(x, o); o += x.length }
  return out
}

/* Text for XML: & < > " escaped. */
export const xmlEsc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
