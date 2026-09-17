/*
  Sunrise / sunset for any date (NOAA algorithm, no network) and a free weather
  forecast from open-meteo.com (no API key, up to 16 days ahead).
  Default coordinates: Athens.
*/

export const ATHENS = { lat: 37.9838, lon: 23.7275, name: 'Athens' }

const rad = (d) => (d * Math.PI) / 180
const deg = (r) => (r * 180) / Math.PI

// Returns { sunrise: 'HH:MM', sunset: 'HH:MM', golden: {am, pm} } in local time of the browser.
export const TZ = 'Europe/Athens'

export function sunTimes(isoDate, lat = ATHENS.lat, lon = ATHENS.lon, tz = TZ) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const J1970 = 2440588, J2000 = 2451545
  const toJulian = (dt) => dt / 86400000 - 0.5 + J1970
  const n = Math.round(toJulian(date.getTime()) - J2000 - 0.0009 + lon / 360)
  const ds = J2000 + 0.0009 - lon / 360 + n
  const M = rad(357.5291 + 0.98560028 * (ds - J2000))
  const C = rad(1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M))
  const L = M + C + rad(102.9372) + Math.PI
  const Jtransit = ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L)
  const dec = Math.asin(Math.sin(L) * Math.sin(rad(23.4397)))
  const hourAngle = (h) => Math.acos((Math.sin(rad(h)) - Math.sin(rad(lat)) * Math.sin(dec)) / (Math.cos(rad(lat)) * Math.cos(dec)))
  const fromJulian = (j) => new Date((j + 0.5 - J1970) * 86400000)
  const fmt = (dt) => {
    try { return dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }) } catch { return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}` }
  }
  try {
    const w = hourAngle(-0.833)
    const set = Jtransit + deg(w) / 360
    const rise = Jtransit - deg(w) / 360
    const wg = hourAngle(6) // golden hour ends when the sun is 6° up
    return {
      sunrise: fmt(fromJulian(rise)),
      sunset: fmt(fromJulian(set)),
      goldenAmEnd: fmt(fromJulian(Jtransit - deg(wg) / 360)),
      goldenPmStart: fmt(fromJulian(Jtransit + deg(wg) / 360)),
    }
  } catch {
    return null
  }
}

const WMO = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Rain showers', 81: 'Showers', 82: 'Heavy showers',
  95: 'Thunderstorm', 96: 'Thunderstorm, hail', 99: 'Severe thunderstorm',
}

export async function geocode(query) {
  const q = (query || '').trim()
  if (!q) return null
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const r = data.results?.[0]
  return r ? { lat: r.latitude, lon: r.longitude, name: r.name } : null
}

// Pulls lat/lon out of a pasted Google Maps link (…/@37.98,23.72,15z or ?q=37.98,23.72).
export function coordsFromText(text) {
  const t = (text || '').trim()
  let m = t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || t.match(/[?&](?:q|ll|query)=(-?\d+\.\d+),(-?\d+\.\d+)/) || t.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/)
  return m ? { lat: Number(m[1]), lon: Number(m[2]) } : null
}

export async function forecast(isoDate, lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,sunrise,sunset` +
    `&timezone=auto&start_date=${isoDate}&end_date=${isoDate}`
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 400) throw new Error('Forecasts cover the next 16 days only. Sunrise and sunset still work for any date.')
    throw new Error(`Weather service error ${res.status}`)
  }
  const d = (await res.json()).daily
  if (!d || !d.time?.length) throw new Error('No forecast for that date yet.')
  const hhmm = (s) => (s ? s.slice(11, 16) : '')
  return {
    summary: WMO[d.weathercode[0]] || 'Unknown',
    tmax: Math.round(d.temperature_2m_max[0]),
    tmin: Math.round(d.temperature_2m_min[0]),
    rain: d.precipitation_probability_max?.[0] ?? null,
    wind: Math.round(d.windspeed_10m_max?.[0] ?? 0),
    sunrise: hhmm(d.sunrise[0]),
    sunset: hhmm(d.sunset[0]),
    fetchedAt: new Date().toISOString(),
  }
}
