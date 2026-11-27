export const uid = (): string => Math.random().toString(36).slice(2, 9)
export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v))
export const DEG = Math.PI / 180

/** Greek number: comma for decimals. */
export function gr(n: number, digits = 1): string {
  return n.toFixed(digits).replace('.', ',')
}

/** Seconds for the prompt: 2 -> "2", 2.5 -> "2.5". */
export function sec(t: number): string {
  const r = Math.round(t * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

/** Timecode SS:FF */
export function timecode(t: number, fps: number): string {
  const total = Math.round(t * fps)
  const s = Math.floor(total / fps)
  const f = total % fps
  return `${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
}

export function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)
}
