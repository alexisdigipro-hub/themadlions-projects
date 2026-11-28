/**
 * A minimal MP4 writer for one H.264 video track with a constant frame rate.
 * Takes the encoder's samples (length-prefixed NAL units) and its avcC record; writes ftyp, moov, mdat,
 * with moov first so the file plays and uploads without a second pass.
 */
export interface Sample { data: Uint8Array; key: boolean }

const u32 = (n: number) => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255])
const u16 = (n: number) => new Uint8Array([(n >>> 8) & 255, n & 255])
const zeros = (n: number) => new Uint8Array(n)
const str = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0))

function cat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}
const box = (type: string, ...payload: Uint8Array[]) => {
  const body = cat(payload)
  return cat([u32(body.length + 8), str(type), body])
}
/** a "full box": version 0 and 24 bits of flags */
const full = (type: string, flags: number, ...payload: Uint8Array[]) => box(type, u32(flags), ...payload)
const MATRIX = cat([u32(0x10000), u32(0), u32(0), u32(0), u32(0x10000), u32(0), u32(0), u32(0), u32(0x40000000)])

export function muxMp4(samples: Sample[], o: { width: number; height: number; fps: number; avcC: Uint8Array }): Blob {
  const delta = 100
  const scale = o.fps * delta
  const n = samples.length
  const dur = n * delta
  const ftyp = box('ftyp', str('isom'), u32(0x200), str('isom'), str('iso2'), str('avc1'), str('mp41'))

  const moov = (dataOffset: number) => {
    const avc1 = box(
      'avc1',
      zeros(6), u16(1), // reserved, data reference index
      zeros(16), // pre_defined and reserved
      u16(o.width), u16(o.height),
      u32(0x480000), u32(0x480000), // 72 dpi
      u32(0), u16(1), // reserved, frames per sample
      zeros(32), // compressor name
      u16(0x18), u16(0xffff), // depth, pre_defined
      box('avcC', o.avcC),
    )
    const keys = samples.map((s, i) => (s.key ? i + 1 : 0)).filter(Boolean)
    const stbl = box(
      'stbl',
      full('stsd', 0, u32(1), avc1),
      full('stts', 0, u32(1), u32(n), u32(delta)),
      full('stss', 0, u32(keys.length), ...keys.map(u32)),
      full('stsc', 0, u32(1), u32(1), u32(n), u32(1)),
      full('stsz', 0, u32(0), u32(n), ...samples.map((s) => u32(s.data.length))),
      full('stco', 0, u32(1), u32(dataOffset)),
    )
    const minf = box(
      'minf',
      full('vmhd', 1, zeros(8)),
      box('dinf', full('dref', 0, u32(1), full('url ', 1))),
      stbl,
    )
    const mdia = box(
      'mdia',
      full('mdhd', 0, u32(0), u32(0), u32(scale), u32(dur), u16(0x55c4), u16(0)),
      full('hdlr', 0, u32(0), str('vide'), zeros(12), str('VideoHandler\0')),
      minf,
    )
    const tkhd = full('tkhd', 3, u32(0), u32(0), u32(1), u32(0), u32(dur), zeros(8), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(o.width << 16), u32(o.height << 16))
    const mvhd = full('mvhd', 0, u32(0), u32(0), u32(scale), u32(dur), u32(0x10000), u16(0x100), zeros(10), MATRIX, zeros(24), u32(2))
    return box('moov', mvhd, box('trak', tkhd, mdia))
  }

  // moov's size does not depend on the offset it carries, so measure it once, then write it with the real one
  const size = moov(0).length
  const head = moov(ftyp.length + size + 8)
  const total = samples.reduce((a, s) => a + s.data.length, 0)
  const parts: BlobPart[] = [ftyp as BlobPart, head as BlobPart, u32(total + 8) as BlobPart, str('mdat') as BlobPart]
  for (const s of samples) parts.push(s.data as BlobPart)
  return new Blob(parts, { type: 'video/mp4' })
}
