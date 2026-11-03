// A visit to this page goes into the hub's site_events, like the home page and the Lab's pages (lab/fresh.js does the same),
// so Studio (themadlions.com/admin/) can count it. Anonymous: a random id kept in this browser, the page, where from, phone or
// computer, the language. Nothing is sent inside a frame or with ?nostats= in the address. (Alex, 3 Nov 2026)
(() => {
  if (/[?&](theme|nostats)=/.test(location.search) || window.top !== window) return
  let visitor = ''
  try { visitor = localStorage.getItem('tml_site_vid') || ''; if (!visitor) { visitor = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('tml_site_vid', visitor) } } catch (e) {}
  let referrer = ''
  try { referrer = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : '' } catch (e) {}
  if (referrer === location.hostname) referrer = ''
  const device = innerWidth < 700 ? 'phone' : innerWidth < 1100 ? 'tablet' : 'computer'
  const key = 'sb_publishable_o1OB_ohozPq1Xr2jg2ZSHA_3GsusXFL'
  fetch('https://naibamqexcqnqhbbqafa.supabase.co/rest/v1/site_events', { method: 'POST', keepalive: true,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ kind: 'view', path: location.pathname.slice(0, 200), referrer: referrer.slice(0, 200), device, lang: (document.documentElement.lang || '').slice(0, 10), visitor }) }).catch(() => {})
})()
