import { supabase as sb } from '../src/lib/supabase.js';
import { fromProject, nextDay, roardinoLink, shootDatesOf, withLibrary } from '../src/lib/roardino.js';
/* =========================================================
   Roardino inside the hub (Alex, 23 Oct 2026): a copy of
   themadlions.com/roardino (public/site/roardino) on the hub's
   database. Same origin as the hub, so it is signed in as the
   hub member; ordinos are rows of roardino_ordinos, each with
   its hub project (project_id). The Ordino permission decides:
   edit makes and sends, view only sees. Send publishes a copy
   behind ?t=<token> (go.themadlions.com/?o/<token>), read
   through roardino_get(); #o= links (whole ordino packed in
   the URL) remain as the offline fallback.
   ?embed=hub   opened in the hub's frame
   ?project=id  a project's Ordino tab: only its ordinos
   ?see=1       the Overview's Ordino button: the project's
                ordino as the crew get it, nothing to edit
   ========================================================= */
const Q = new URLSearchParams(location.search);
const EMBED = Q.get('embed') === 'hub';
const SCOPE = Q.get('project') || '';
const SEE = Q.has('see');
const BASE = location.pathname + location.search.replace(/[?&]t=[^&]*/, '').replace(/^&/, '?');
async function rpc(fn, args){ const { data, error } = await sb.rpc(fn, args); if (error) throw error; return data; }
/* The hub's look (Alex, 23 Oct): framed in the hub, Roardino takes the hub's theme, skin, accent and typeface from
   the page around it (the same address, so it can read it) and follows it live when it changes in Settings > Display.
   Only the app around the ordinos: an ordino keeps the look chosen for it, and the crew's link page (?t=) its own. */
function hubTheme(){
  let top;
  try { top = window.parent !== window && window.parent.document; } catch { top = null; }
  if (!EMBED || !top) return;
  const root = document.documentElement;
  const apply = () => {
    const cs = top.defaultView.getComputedStyle(top.documentElement);
    const v = k => cs.getPropertyValue(k).trim();
    const light = top.documentElement.dataset.theme === 'light';
    const text = v('--text') || '#eef0f3';
    const set = (k, val) => { if (val) root.style.setProperty(k, val); };
    set('--bg', v('--bg'));
    set('--text', text);
    set('--muted', v('--muted'));
    set('--brand', v('--accent'));
    set('--brand-ink', v('--accent-ink'));
    set('--hi', light ? '#ffffff' : text);
    set('--line', v('--gl-edge') || v('--line'));
    set('--panel', v('--gl-fill') || `color-mix(in srgb, ${v('--panel')} 82%, transparent)`);
    set('--panel2', `color-mix(in srgb, ${text} 5%, transparent)`);
    set('--glass', v('--gl-fill') || `color-mix(in srgb, ${text} 6%, transparent)`);
    set('--glass-edge', v('--gl-edge') || v('--line'));
    set('--field', v('--gl-input') || `color-mix(in srgb, ${text} ${light ? 4 : 6}%, transparent)`);
    set('--lit', light ? '0 1px 2px rgba(20,24,40,.05), 0 8px 26px rgba(20,24,40,.08)' : 'inset 0 1px 0 rgba(255,255,255,.08), 0 30px 70px rgba(0,0,0,.28)');
    set('--font', v('--font'));
    if (v('--radius-lg')) set('--radius', v('--radius-lg'));
    root.style.colorScheme = light ? 'light' : 'dark';
    // the backdrop: the hub's own (a skin's gradient), else its plain background
    const bs = top.defaultView.getComputedStyle(top.body), hs = cs;
    const img = [hs, bs].map(x => x.backgroundImage).find(x => x && x !== 'none');
    const col = [bs, hs].map(x => x.backgroundColor).find(x => x && !/rgba\(0, 0, 0, 0\)|transparent/.test(x));
    root.style.setProperty('--hub-backdrop', img ? `${img}, ${col || v('--bg')}` : (col || v('--bg')));
    root.classList.add('hub-theme');
    root.classList.toggle('hub-light', light);
    // the hub's typeface: its Google Fonts sheets, once each
    top.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]').forEach(l => {
      if (!document.querySelector(`link[href="${CSS.escape(l.href)}"]`)) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: l.href }));
    });
  };
  apply();
  // the hub writes a few sizes on its root while the page scrolls or the keyboard moves: look again at most once a
  // frame, and only redo the look when something it reads has changed (it was redone many times a second)
  let queued = false, last = '';
  const sig = () => { const cs = top.defaultView.getComputedStyle(top.documentElement); const d = top.documentElement.dataset; return [d.theme, d.skin, d.accent, cs.getPropertyValue('--accent'), cs.getPropertyValue('--bg'), cs.getPropertyValue('--text'), cs.getPropertyValue('--font'), cs.getPropertyValue('--gl-fill')].join('|'); };
  last = sig();
  const watch = new top.defaultView.MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; const now = sig(); if (now !== last) { last = now; apply(); } });
  });
  watch.observe(top.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-skin', 'data-accent', 'style'] });
  top.head && watch.observe(top.head, { childList: true });
}
hubTheme();

let session = null, me = null, canEdit = false, canView = false, projects = [], library = {}; // me: the member row in the hub
let flushEditor = null; // set while the editor is open, so leaving it saves first
const projectOf = id => projects.find(p => p.id === id) || null;
const projectName = p => !p ? '' : (p.artist ? p.artist + ' - ' : '') + (p.shortTitle || p.title || '');
const ACCENTS = ['#d40000','#C8503F','#E0A33A','#3F8F6B','#3D6FD8','#8A5CD6','#D9467A','#FFFFFF'];
const BLOCK_DEFS = {
  groupcalls: 'Calls ανά ομάδα',
  location:   'Τοποθεσία',
  program:    'Πρόγραμμα',
  scenes:     'Σκηνές',
  cast:       'Cast',
  crew:       'Crew',
  contacts:   'Επαφές παραγωγής',
  note:       'Σημείωση',
};
// what has a switch (Alex, 23 Oct): only what comes on its own (weather, sun) and the cover photo;
// every typed field shows when it is filled and stays out when empty
const OLD_DETAILS = { wrap: o => { o.day.wrapTime = ''; }, lunch: o => { o.lunch = ''; }, tagline: o => { o.tagline = ''; },
  parking: o => { o.loc.parking = ''; }, hospital: o => { o.loc.hospital = ''; } };

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 1800); }
function h(tag, attrs = {}, ...kids){
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})){
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()){ if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(kid)); }
  return el;
}
const ICON = {
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>',
  dup:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1"/></svg>',
  stats:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 15l6-6 6 6"/></svg>',
  down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  set:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 18a5 5 0 00-10 0"/><path d="M12 9V2M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4M23 22H1M16 5l-4 4-4-4"/></svg>',
  drop:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7l5.7 5.6a8 8 0 11-11.4 0z"/></svg>',
  nav:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>',
};

/* ---------- model ---------- */
function blankOrdino(){
  const today = new Date(); const d = today.toISOString().slice(0, 10);
  return {
    v: 1, id: uid(), createdAt: Date.now(), updatedAt: Date.now(),
    look: { theme: 'glass', accent: '#d40000', size: 'normal', header: 'centred' },
    project: { title: '', artist: '', company: '', logo: '', cover: '', coverPos: { x: 50, y: 40, z: 1, o: 0.25 } },
    day: { date: d, index: 1, count: 1, callTime: '08:00', wrapTime: '', label: 'GENERAL ORDINO', unit: '' },
    details: { cover: true, weather: true, sun: true },
    blocks: Object.keys(BLOCK_DEFS).map(key => ({ key, on: ['groupcalls','location','program','note'].includes(key), title: '' })),
    groupCalls: [ { who: 'Production crew', time: '07:00' }, { who: 'Cast / Make-up', time: '07:30' } ],
    loc: { name: '', address: '', link: '', contact: '', phone: '', parking: '', hospital: '', lat: '', lon: '' },
    lunch: '',
    program: [ { from: '08:00', to: '09:00', what: 'Προετοιμασία' }, { from: '09:00', to: '13:00', what: 'Γύρισμα' } ],
    scenes: [], cast: [], crew: [], contacts: [], extraLocs: [],
    notes: '', tagline: '',
  };
}
function normalize(o){
  const b = blankOrdino();
  const out = Object.assign(b, o || {});
  for (const k of ['look','project','day','details','loc']) out[k] = Object.assign(clone(blankOrdino()[k]), (o || {})[k] || {});
  out.project.coverPos = Object.assign({ x: 50, y: 40, z: 1, o: 0.25 }, out.project.coverPos || {});
  const known = new Set((out.blocks || []).map(x => x.key));
  out.blocks = (out.blocks || []).filter(x => BLOCK_DEFS[x.key]);
  for (const key of Object.keys(BLOCK_DEFS)) if (!known.has(key)) out.blocks.push({ key, on: false, title: '' });
  for (const k of ['groupCalls','program','scenes','cast','crew','contacts','extraLocs']) if (!Array.isArray(out[k])) out[k] = [];
  // before 23 Oct these had a switch: a value typed but switched off stays hidden, so it is cleared, then the switch goes
  const was = (o || {}).details || {};
  for (const [k, clear] of Object.entries(OLD_DETAILS)){ if (was[k] === false) clear(out); delete out.details[k]; }
  return out;
}

/* ---------- storage: the signed-in account's ordinos ---------- */
const COLS = 'id,project_id,data,token,published_at,updated_at';
const rowToOrdino = r => { const o = normalize(r.data); o.id = r.id; o.projectId = r.project_id || ''; o.token = r.token; o.publishedAt = r.published_at; o.updatedAt = Date.parse(r.updated_at); return o; };
const toData = o => { const d = clone(o); for (const k of ['id','projectId','token','publishedAt','updatedAt','pub']) delete d[k]; return d; };
async function listOrdinos(){ const { data, error } = await sb.from('roardino_ordinos').select(COLS).order('updated_at', { ascending: false }); if (error) throw error; return data.map(rowToOrdino); }
async function getOrdino(id){ const { data, error } = await sb.from('roardino_ordinos').select(COLS).eq('id', id).maybeSingle(); if (error) throw error; return data && rowToOrdino(data); }
async function createOrdino(o){ const { data, error } = await sb.from('roardino_ordinos').insert({ data: toData(o), project_id: o.projectId || null }).select(COLS).single(); if (error) throw error; return rowToOrdino(data); }
async function saveOrdino(o){ const { error } = await sb.from('roardino_ordinos').update({ data: toData(o), project_id: o.projectId || null, updated_at: new Date().toISOString() }).eq('id', o.id); if (error) throw error; }
// Duplicate (Alex, 23 Oct): a new ordino with everything in it, not yet sent (no link of its own)
async function duplicateOrdino(o){ const c = clone(o); c.project.title = (c.project.title || 'Ordino') + ' (αντίγραφο)'; return createOrdino(c); }
async function deleteOrdino(id){ const { error } = await sb.from('roardino_ordinos').delete().eq('id', id); if (error) throw error; }
// the member, what they may do, and the projects they can see (the database shows only those)
async function loadMe(){
  const { data: m } = await sb.from('members').select('name,role,permissions').eq('user_id', session.user.id).eq('active', true).maybeSingle();
  me = m || null;
  const level = !me ? 'none' : me.role === 'admin' ? 'edit' : ((me.permissions || {}).callsheets || 'none');
  canEdit = level === 'edit'; canView = level !== 'none';
  const [{ data: ps }, ev, lib] = await Promise.all([
    sb.from('projects').select('id,data'),
    sb.from('events').select('id,data').then(r => r, () => ({ data: [] })),
    sb.from('library').select('id,kind,data').in('kind', ['contact', 'location']).then(r => r, () => ({ data: [] })),
  ]);
  const rows = (lib && lib.data) || [];
  library = { contacts: rows.filter(r => r.kind === 'contact').map(r => ({ ...r.data, id: r.id })), locations: rows.filter(r => r.kind === 'location').map(r => ({ ...r.data, id: r.id })) };
  const events = ((ev && ev.data) || []).map(r => r.data || {});
  projects = (ps || []).map(r => ({ ...r.data, id: r.id, shootDates: shootDatesOf(r.id, events) })).filter(p => !p.deleted).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}
// an ordino filled from a hub project (its next shoot day): name, cover, date, call, location, people
function fillFromProject(o, p){
  const f = fromProject(withLibrary(p, library), { day: nextDay(p) });
  Object.assign(o.project, f.project);
  for (const [k, v] of Object.entries(f.day)) if (v !== '') o.day[k] = v; // a day from the Calendar has no call: the ordino's stays
  Object.assign(o.loc, f.loc);
  for (const k of ['cast', 'crew', 'contacts']) if (f[k].length){ o[k] = f[k]; const b = o.blocks.find(x => x.key === k); if (b) b.on = true; }
  o.projectId = p.id;
  return o;
}

/* ---------- images ---------- */
function readImage(file, maxW, quality = 0.78, type = 'image/jpeg'){
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = rej;
    fr.onload = () => {
      const img = new Image();
      img.onerror = rej;
      img.onload = () => res(downscale(img, maxW, quality, type));
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
function downscale(img, maxW, quality, type){
  const s = Math.min(1, maxW / img.naturalWidth);
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
  const ctx = c.getContext('2d');
  if (type === 'image/jpeg'){ ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL(type, quality);
}
function shrinkDataUrl(src, maxW, quality, type){
  return new Promise(res => {
    if (!src) return res('');
    const img = new Image();
    img.crossOrigin = 'anonymous'; // covers live in the hub's storage now, drawn on a canvas here
    img.onload = () => res(downscale(img, maxW, quality, type));
    img.onerror = () => res('');
    img.src = src;
  });
}

/* ---------- share link (compressed into the URL fragment) ---------- */
const b64u = {
  enc(bytes){ let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); },
  dec(str){ const s = atob(str.replace(/-/g,'+').replace(/_/g,'/')); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; },
};
async function pack(obj){
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  if (window.CompressionStream){
    const cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return 'z' + b64u.enc(new Uint8Array(await new Response(cs).arrayBuffer()));
  }
  return 'j' + b64u.enc(bytes);
}
async function unpack(str){
  const kind = str[0], bytes = b64u.dec(str.slice(1));
  if (kind === 'z'){
    const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return JSON.parse(await new Response(ds).text());
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
// Saves, then publishes the working copy behind the ordino's short link (the same link on every republish).
async function publishOrdino(o){
  await saveOrdino(o);
  const token = await rpc('roardino_publish', { p_id: o.id });
  o.token = token; o.publishedAt = new Date().toISOString();
  return linkFor(token);
}
const linkFor = token => roardinoLink(token);
// Offline fallback: the whole ordino packed into the URL fragment.
async function buildShareUrl(o){
  const s = clone(o);
  delete s.id; delete s.createdAt; delete s.pub; delete s.token; delete s.publishedAt; delete s.updatedAt;
  // Smaller images so the link stays light enough for WhatsApp / Viber / SMS.
  s.project.cover = (s.details.cover && s.project.cover) ? await shrinkDataUrl(s.project.cover, 640, 0.55, 'image/jpeg') : '';
  s.project.logo = s.project.logo ? await shrinkDataUrl(s.project.logo, 220, 0.9, 'image/png') : '';
  s.blocks = s.blocks.filter(b => b.on);
  return location.origin + location.pathname + '#o=' + await pack(s);
}

/* ---------- weather (Open-Meteo, no key) ---------- */
const wxCache = new Map();
const WX = {0:'Αίθριος',1:'Κυρίως αίθριος',2:'Λίγα σύννεφα',3:'Συννεφιά',45:'Ομίχλη',48:'Ομίχλη',51:'Ψιχάλες',53:'Ψιχάλες',55:'Ψιχάλες',61:'Βροχή',63:'Βροχή',65:'Δυνατή βροχή',66:'Παγωμένη βροχή',67:'Παγωμένη βροχή',71:'Χιόνι',73:'Χιόνι',75:'Πυκνό χιόνι',77:'Χιόνι',80:'Μπόρες',81:'Μπόρες',82:'Δυνατές μπόρες',85:'Χιονόπτωση',86:'Χιονόπτωση',95:'Καταιγίδα',96:'Καταιγίδα',99:'Καταιγίδα'};
async function getWeather(lat, lon, date){
  if (!lat || !lon || !date) return null;
  const key = `${lat},${lon},${date}`;
  if (wxCache.has(key)) return wxCache.get(key);
  const p = (async () => {
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=auto&start_date=${date}&end_date=${date}`;
      const r = await fetch(u); if (!r.ok) throw 0;
      const j = await r.json(); const d = j.daily; if (!d || !d.time || !d.time.length) throw 0;
      return { code: d.weather_code[0], max: Math.round(d.temperature_2m_max[0]), min: Math.round(d.temperature_2m_min[0]), rain: d.precipitation_probability_max[0], sunrise: (d.sunrise[0] || '').slice(11, 16), sunset: (d.sunset[0] || '').slice(11, 16) };
    } catch {
      // Forecast only reaches ~16 days ahead; fall back to sunrise/sunset from the calculator.
      return { sunOnly: true, ...sunTimes(+lat, +lon, date) };
    }
  })();
  wxCache.set(key, p);
  return p;
}
// NOAA-style sunrise/sunset approximation (local time of the browser's zone offset for that date).
function sunTimes(lat, lon, dateStr){
  const d = new Date(dateStr + 'T12:00:00');
  const rad = Math.PI / 180, day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  const g = 2 * Math.PI / 365 * (day - 1);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl)) / rad;
  if (isNaN(ha)) return {};
  const tz = -d.getTimezoneOffset();
  const fmt = m => { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(Math.round(m % 60)).padStart(2, '0').replace('60', '59'); };
  return { sunrise: fmt(720 - 4 * (lon + ha) - eq + tz), sunset: fmt(720 - 4 * (lon - ha) - eq + tz) };
}
async function geocode(q){
  const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=el&q=' + encodeURIComponent(q));
  const j = await r.json();
  return j && j[0] ? { lat: (+j[0].lat).toFixed(5), lon: (+j[0].lon).toFixed(5), label: j[0].display_name } : null;
}

/* ---------- ordino renderer (shared by preview + link) ---------- */
function fmtDate(iso){
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  const s = d.toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function initials(n){ return String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?'; }
function telHref(p){ return 'tel:' + String(p).replace(/[^\d+]/g, ''); }
function linkify(text){
  return esc(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/(\+?\d[\d\s]{8,}\d)/g, m => `<a href="${telHref(m)}">${m}</a>`);
}
// a Google Maps link pasted in (Alex, 19 Oct): the map button opens exactly that place
const MAPS_LINK = /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.[a-z.]+|(www\.)?google\.[a-z.]+\/maps)\//i;
function mapsLink(loc){ const u = String(loc.link || '').trim(); return MAPS_LINK.test(u) ? u : ''; }
// the coordinates inside a long Google Maps link, for the weather and the sunset (a short maps.app.goo.gl link has none)
function coordsOf(u){
  const m = String(u || '').match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || String(u || '').match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || String(u || '').match(/[?&](?:q|query|ll|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  return m ? { lat: (+m[1]).toFixed(5), lon: (+m[2]).toFixed(5) } : null;
}
// Directions and Open in Maps come only from the pasted Google Maps link (Alex, 19 Oct): never from the address or the looked-up spot
function mapsUrl(loc){ return mapsLink(loc); }
function dirUrl(loc){
  const u = mapsLink(loc), c = coordsOf(u);
  return c ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}` : u;
}
function isBreak(what){ return /break|διάλειμμα|φαγητ|lunch|γεύμα/i.test(what || ''); }

function renderOrdino(o, { wx = null, interactive = true, updatedAt = null } = {}){
  const L = o.look, P = o.project, D = o.day, det = o.details;
  const cover = det.cover && P.cover;
  const cp = P.coverPos;
  const blockTitle = b => esc(b.title || BLOCK_DEFS[b.key]);
  const sec = (b, inner) => `<section class="o-card"><h3 class="o-h">${blockTitle(b)}</h3>${inner}</section>`;

  const chips = [];
  if (wx && !wx.sunOnly && det.weather) chips.push(`<span class="o-chip">${ICON.sun}${esc(WX[wx.code] || '')} · ${wx.max}° / ${wx.min}°</span>`, wx.rain != null ? `<span class="o-chip">${ICON.drop}${wx.rain}%</span>` : '');
  if (wx && det.sun && wx.sunrise) chips.push(`<span class="o-chip">${ICON.sun}${esc(wx.sunrise)}</span><span class="o-chip">${ICON.set}${esc(wx.sunset)}</span>`);

  const blocks = o.blocks.filter(b => b.on).map(b => {
    switch (b.key){
      case 'groupcalls': {
        const rows = o.groupCalls.filter(r => r.who || r.time);
        if (!rows.length) return '';
        return sec(b, `<div class="o-rows">${rows.map(r => `<div class="o-r"><span class="t">${esc(r.time)}</span><span class="w">${esc(r.who)}</span></div>`).join('')}</div>`);
      }
      case 'location': {
        const l = o.loc;
        // more places of the day (Alex, 19 Oct): name · address, and Directions to each
        const extra = (o.extraLocs || []).filter(x => x.name || x.address || mapsLink(x));
        if (!l.name && !l.address && !mapsLink(l) && !extra.length) return '';
        const m = mapsUrl(l), d = dirUrl(l);
        return sec(b, `
          ${l.name ? `<div class="o-loc-name">${esc(l.name)}</div>` : ''}
          ${l.address ? `<div class="o-loc-addr">${esc(l.address)}</div>` : ''}
          ${l.contact || l.phone ? `<div class="o-loc-who">${esc(l.contact || '')}${l.contact && l.phone ? ' · ' : ''}${l.phone ? `<a href="${telHref(l.phone)}">${esc(l.phone)}</a>` : ''}</div>` : ''}
          ${d || m ? `<div class="o-btns o-btns-2">
            ${d ? `<a class="o-btn acc" href="${esc(d)}" target="_blank" rel="noopener">Directions</a>` : ''}
            ${m ? `<a class="o-btn" href="${esc(m)}" target="_blank" rel="noopener">Open in Maps</a>` : ''}
          </div>` : ''}

          ${l.parking ? `<div class="o-kv"><span class="k">Parking</span><span class="v">${esc(l.parking)}</span></div>` : ''}
          ${l.hospital ? `<div class="o-kv"><span class="k">Πλησιέστερο νοσοκομείο</span><span class="v">${linkify(l.hospital)}</span></div>` : ''}
          ${extra.length ? `<div class="o-xloc"><div class="o-xloc-h">Extra Locations</div>${extra.map(x => {
            const xd = dirUrl(x);
            return `<div class="o-xloc-r"><span>${x.name ? `<b>${esc(x.name)}</b>` : ''}${x.name && x.address ? ' · ' : ''}${esc(x.address || '')}</span>${xd ? `<a href="${esc(xd)}" target="_blank" rel="noopener">Directions</a>` : ''}</div>`;
          }).join('')}</div>` : ''}`);
      }
      case 'program': {
        const rows = o.program.filter(r => r.what || r.from);
        if (!rows.length) return '';
        return sec(b, `<div class="o-tl">${rows.map(r => `<div class="o-tl-i${isBreak(r.what) ? ' brk' : ''}"><div class="o-tl-time">${esc(r.from)}${r.to ? ' – ' + esc(r.to) : ''}</div><div class="o-tl-what">${esc(r.what)}</div></div>`).join('')}</div>`);
      }
      case 'scenes': {
        const rows = o.scenes.filter(r => r.num || r.desc);
        if (!rows.length) return '';
        return sec(b, `<div class="o-rows">${rows.map(r => `<div class="o-r"><span class="t">${esc(r.num)}</span><span class="w">${esc(r.desc)}${r.meta ? `<small>${esc(r.meta)}</small>` : ''}</span></div>`).join('')}</div>`);
      }
      case 'cast': case 'crew': case 'contacts': {
        const rows = o[b.key].filter(r => r.name);
        if (!rows.length) return '';
        return sec(b, `<div class="o-people">${rows.map(r => {
          const tag = r.phone && interactive ? 'a' : 'div';
          const href = r.phone && interactive ? ` href="${telHref(r.phone)}"` : '';
          const end = r.time ? esc(r.time) : (r.phone ? ICON.phone : '');
          return `<${tag} class="o-p"${href}><span class="o-av">${esc(initials(r.name))}</span><span><div class="n">${esc(r.name)}</div>${r.role ? `<div class="r">${esc(r.role)}</div>` : ''}</span><span class="e">${end}</span></${tag}>`;
        }).join('')}</div>`);
      }
      case 'note':
        return o.notes ? sec(b, `<div class="o-note">${linkify(o.notes)}</div>`) : '';
    }
    return '';
  }).join('');

  const accent = L.accent && L.accent.toLowerCase() !== '#ffffff' ? L.accent : (L.theme === 'light' ? '#1b1a18' : '#ffffff');
  const accentStyle = `--acc:${esc(accent)}`;
  const labelInk = /^#(fff|ffffff)$/i.test(accent) ? '#111' : '#fff';

  return `
  <div class="ord t-${esc(L.theme)} s-${esc(L.size)}" style="${accentStyle}">
    ${cover ? `<div class="bgblur" style="background-image:url('${P.cover}')"></div><div class="glassveil"></div>` : ''}
    <header class="o-hero${cover ? '' : ' nocover'}">
      ${cover ? `<div class="o-cover" style="background-image:url('${P.cover}');background-position:${cp.x}% ${cp.y}%;transform:scale(${cp.z});transform-origin:${cp.x}% ${cp.y}%"></div><div class="o-shade-dim" style="opacity:${cp.o}"></div><div class="o-shade"></div>` : ''}
      ${P.logo ? `<img class="o-logo" src="${P.logo}" alt="">` : ''}
      <div class="o-head ${L.header === 'centred' ? 'centred' : ''}">
        ${D.label ? `<span class="o-label" style="color:${labelInk}">${esc(D.label)}</span>` : ''}
        <h1 class="o-title">${esc(P.title || 'Χωρίς τίτλο')}</h1>
        ${P.artist ? `<div class="o-artist">${esc(P.artist)}</div>` : ''}
        ${D.date ? `<div><span class="o-date">${ICON.cal.replace('<svg', '<svg width="15" height="15"')}${esc(fmtDate(D.date))}${D.count > 1 ? ` · Ημέρα ${esc(D.index)}/${esc(D.count)}` : ''}</span></div>` : ''}
      </div>
    </header>
    <main class="o-body">
      <section class="o-card">
        <div class="o-call">
          <div><div class="o-call-k">Call</div><div class="o-call-time">${esc(D.callTime || '--:--')}</div></div>
          <div class="o-call-side">
            ${D.wrapTime ? `<span>Wrap <b>${esc(D.wrapTime)}</b></span>` : ''}
            ${o.lunch ? `<span>Break <b>${esc(o.lunch)}</b></span>` : ''}
            ${D.unit ? `<span>${esc(D.unit)}</span>` : ''}
          </div>
        </div>
        ${chips.length ? `<div class="o-chips">${chips.join('')}</div>` : ''}
      </section>
      ${o.tagline ? `<div class="o-tag">${esc(o.tagline)}</div>` : ''}
      ${blocks}
      <footer class="o-foot">
        ${interactive ? `<div class="o-btns"><button class="o-btn" data-act="ics" type="button">${ICON.cal}Στο ημερολόγιο</button>${navigator.share ? `<button class="o-btn" data-act="share" type="button">${ICON.share}Κοινοποίηση</button>` : ''}</div>` : ''}
        ${P.company ? `<div class="o-made">${esc(P.company)}</div>` : ''}
        ${updatedAt ? `<div class="o-made" style="letter-spacing:.04em;text-transform:none">Ενημερώθηκε ${esc(new Date(updatedAt).toLocaleString('el-GR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</div>` : ''}
        <a class="o-made" href="${esc(location.origin + location.pathname)}#home" target="_blank" rel="noopener">Made with <b>ROAR</b>DINO</a>
      </footer>
    </main>
  </div>`;
}

function icsFor(o){
  const D = o.day, d = (D.date || '').replace(/-/g, '');
  const t = s => (s || '').replace(':', '') + '00';
  const start = d + 'T' + t(D.callTime || '08:00');
  let endDate = d;
  if (D.wrapTime && D.wrapTime < (D.callTime || '')){ const n = new Date(D.date + 'T12:00:00'); n.setDate(n.getDate() + 1); endDate = n.toISOString().slice(0, 10).replace(/-/g, ''); }
  const end = D.wrapTime ? endDate + 'T' + t(D.wrapTime) : start.slice(0, 9) + String(Math.min(23, +(D.callTime || '08').slice(0, 2) + 10)).padStart(2, '0') + '0000';
  const clean = s => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const desc = [D.label, o.project.artist, ...o.program.map(p => `${p.from}${p.to ? '-' + p.to : ''} ${p.what}`), o.notes].filter(Boolean).join('\n');
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Roardino//EL','BEGIN:VEVENT','UID:' + uid() + '@roardino',
    'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
    'DTSTART:' + start, 'DTEND:' + end, 'SUMMARY:' + clean((o.project.title || 'Γύρισμα') + ' — Call ' + (D.callTime || '')),
    'LOCATION:' + clean([o.loc.name, o.loc.address].filter(Boolean).join(', ')), 'DESCRIPTION:' + clean(desc),
    'BEGIN:VALARM','TRIGGER:-PT90M','ACTION:DISPLAY','DESCRIPTION:Call','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
}
function wireOrdinoActions(root, o){
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'ics'){
      const blob = new Blob([icsFor(o)], { type: 'text/calendar' });
      const a = h('a', { href: URL.createObjectURL(blob), download: (o.project.title || 'ordino').replace(/[^\p{L}\d]+/gu, '-') + '.ics' });
      document.body.append(a); a.click(); a.remove();
    }
    if (b.dataset.act === 'share') navigator.share({ title: o.project.title || 'Ordino', url: location.href }).catch(() => {});
  });
}

/* =========================================================
   Views
   ========================================================= */
const app = $('#app');
const brandMark = (compact) => h('a', { class: 'brand', href: BASE + '#home', 'aria-label': 'Roardino' },
  h('span', { class: 'rm', html: '<span class="a">ROAR</span><span class="b">DINO</span>' }),
  compact ? null : h('span', { class: 'by', html: 'by <b>THE<strong>MAD</strong>LIONS</b>' }));

/* In the hub's Share (Alex, 27 Oct: "Roardino in Share with the same navigation and buttons, one row, no Roardino
   title"): the hub says so ('roardino:host', share), the home's own top row hides on a computer (roardino.css
   html.in-share) and Share draws the filters, the search and New ordino in its own top row instead. The home tells
   Share what to draw ('roardino:home': the filters with their counts, the one chosen, the search) and Share sends
   back what was pressed ('roardino:do'). */
let homeApi = null;
const tellHost = msg => { if (EMBED) try { window.parent.postMessage({ type: 'roardino:home', ...msg }, location.origin); } catch {} };
window.addEventListener('message', e => {
  if (e.origin !== location.origin || e.source !== window.parent) return;
  const d = e.data || {};
  if (d.type === 'roardino:host'){ document.documentElement.classList.toggle('in-share', !!d.share); if (homeApi) { homeApi.redraw(); homeApi.announce(); } else tellHost({ view: 'other' }); }
  if (d.type === 'roardino:do' && homeApi){ if (d.filter) homeApi.pick(d.filter); if (typeof d.search === 'string') homeApi.search(d.search); if (d.create) homeApi.create(); }
});

async function route(){
  if (flushEditor){ const f = flushEditor; flushEditor = null; f(); }
  homeApi = null; tellHost({ view: 'other' });
  const hash = location.hash;
  const t = Q.get('t');
  if (t && !hash.startsWith('#edit/') && hash !== '#home') return viewToken(t);
  if (hash.startsWith('#o=')) return viewLink(hash.slice(3));
  if (hash === '#demo') return viewLink(null, demoOrdino());
  document.body.className = EMBED ? 'embedded' : '';
  if (!sb){ app.innerHTML = '<div class="v-error"><div><h2>Δεν φόρτωσε</h2><p>Το Roardino του hub θέλει τη βάση του hub.</p></div></div>'; return; }
  if (!session) return viewNote('Μπες πρώτα στο hub', 'Το Roardino ανοίγει με τον λογαριασμό σου στο THEMADLIONS Hub.', true);
  if (!me) return viewNote('Δεν είσαι μέλος της ομάδας', 'Ζήτα από τον administrator να σε προσθέσει στο hub.');
  if (SEE) return viewSee();
  if (!canView && !SCOPE) return viewNote('Δεν έχεις πρόσβαση στο Roardino', 'Το ανοίγει όποιος έχει το δικαίωμα Ordino στο Team.');
  if (hash.startsWith('#edit/') || hash.startsWith('#see/')){
    app.replaceChildren(h('div', { class: 'center-note' }, 'Φόρτωση…'));
    try {
      const o = await getOrdino(hash.slice(hash.indexOf('/') + 1));
      if (o) return canEdit && hash.startsWith('#edit/') ? viewEditor(o) : viewSee([o]);
    } catch {}
  }
  return viewHome();
}
window.addEventListener('hashchange', route);

function viewNote(title, text, signin){
  app.replaceChildren(h('div', { class: 'v-error' }, h('div', {}, h('h2', {}, title), h('p', {}, text),
    signin ? h('a', { class: 'btn primary', href: '../#/login', target: '_top' }, 'Σύνδεση στο hub') : null)));
}

if (sb){
  sb.auth.onAuthStateChange((event, s) => {
    const was = session && session.user.id;
    session = s;
    // Supabase advises against awaiting its own calls inside this callback, so the work runs on the next tick.
    setTimeout(async () => {
      if (!booted) return;
      const now = s && s.user.id;
      if (now !== was){ me = null; if (now) { try { await loadMe(); } catch {} } route(); }
    }, 0);
  });
}
let booted = false;
async function boot(){
  if (sb){
    try { const { data } = await sb.auth.getSession(); session = data.session; } catch {}
    if (session){ try { await loadMe(); } catch {} }
  }
  booted = true;
  await route();
  // framed in the hub: say it is drawn, so the hub shows the frame now and not half-way (Alex, 25 Oct)
  if (EMBED) try { window.parent.postMessage({ type: 'roardino:ready' }, location.origin); } catch {}
}

/* ---------- link viewer (what the crew opens) ---------- */
// A sample ordino for the Lab page and for first-time visitors: drawn cover, no stored data.
function demoOrdino(){
  const c = document.createElement('canvas'); c.width = 640; c.height = 430;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 640, 430); g.addColorStop(0, '#4b525d'); g.addColorStop(.55, '#2b3038'); g.addColorStop(1, '#15171b');
  x.fillStyle = g; x.fillRect(0, 0, 640, 430);
  const r = x.createRadialGradient(470, 150, 10, 470, 150, 260); r.addColorStop(0, 'rgba(212,0,0,.85)'); r.addColorStop(1, 'rgba(212,0,0,0)');
  x.fillStyle = r; x.fillRect(0, 0, 640, 430);
  for (let i = 0; i < 9; i++){ x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(i * 74, 300 - ((i * 41) % 90), 56, 200); }
  const o = blankOrdino();
  const d = new Date(); d.setDate(d.getDate() + 3);
  Object.assign(o.project, { title: 'Night Shoot', artist: 'Music video · Athens', company: 'THEMADLIONS', cover: c.toDataURL('image/jpeg', .7), coverPos: { x: 50, y: 40, z: 1, o: .15 } });
  Object.assign(o.day, { date: d.toISOString().slice(0, 10), callTime: '18:30', wrapTime: '02:00', index: 1, count: 2 });
  o.groupCalls = [ { who: 'Production crew', time: '16:30' }, { who: 'Camera & lighting', time: '17:00' }, { who: 'Cast / Make-up', time: '18:30' } ];
  Object.assign(o.loc, { name: 'Rouf Railway', address: 'Konstantinoupoleos Ave, Athens 118 54', lat: '37.97640', lon: '23.70610' });
  o.program = [ { from: '18:30', to: '19:30', what: 'Set up' }, { from: '19:30', to: '22:00', what: 'Shoot · Playback' }, { from: '22:00', to: '22:30', what: 'Break' }, { from: '22:30', to: '02:00', what: 'Shoot · Story' } ];
  o.notes = 'Warm clothes, it gets cold after midnight.';
  return o;
}

// An anonymous id per browser, so the admin panel can count how many different people opened a link.
function visitorId(){
  try {
    let v = localStorage.getItem('roardino-visitor');
    if (!v){ v = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('roardino-visitor', v); }
    return v;
  } catch { return ''; }
}
async function viewToken(token){
  document.body.className = 'viewer';
  app.innerHTML = '<div class="v-error">Φόρτωση…</div>';
  let res;
  try { res = await rpc('roardino_get', { p_token: token, p_visitor: visitorId() }); }
  catch { app.innerHTML = '<div class="v-error"><div><h2>Δεν υπάρχει σύνδεση</h2><p>Έλεγξε το internet και άνοιξε ξανά το link.</p></div></div>'; return; }
  if (!res || !res.data){ app.innerHTML = '<div class="v-error"><div><h2>Αυτό το ordino δεν υπάρχει πια</h2><p>Ζήτα από την παραγωγή το τρέχον link.</p></div></div>'; return; }
  const o = normalize(res.data);
  o.blocks.forEach(b => b.on = true);
  return viewLink(null, o, res.updatedAt);
}

async function viewLink(packed, given, updatedAt){
  document.body.className = 'viewer';
  app.innerHTML = '<div class="v-error">Φόρτωση…</div>';
  let o = given;
  if (!o){
    try { o = normalize(await unpack(packed)); }
    catch { app.innerHTML = '<div class="v-error"><div><h2>Το link δεν άνοιξε</h2><p>Μάλλον κόπηκε στην αντιγραφή. Ζήτα να σου το ξαναστείλουν.</p></div></div>'; return; }
    o.blocks.forEach(b => b.on = true);
  }
  if (o.look.theme === 'light') document.body.classList.add('v-light');
  document.title = (o.project.title ? o.project.title + ' · ' : '') + (o.day.label || 'Ordino');
  const root = h('div', { class: 'viewer-root' });
  app.replaceChildren(root);
  root.innerHTML = renderOrdino(o, { updatedAt });
  wireOrdinoActions(root, o);
  if (o.details.weather || o.details.sun){
    const wx = await getWeather(o.loc.lat, o.loc.lon, o.day.date);
    if (wx){ root.innerHTML = renderOrdino(o, { wx, updatedAt }); }
  }
}

/* ---------- home ---------- */
// a new ordino: in a project's tab for that project, else the project is picked first
function pickProject(then){
  const q = h('input', { class: 'input', placeholder: 'Αναζήτηση project…', oninput: () => draw() });
  const list = h('div', { class: 'pick-list' });
  const close = () => bg.remove();
  const draw = () => {
    const w = q.value.trim().toLowerCase();
    list.replaceChildren(
      ...projects.filter(p => !w || projectName(p).toLowerCase().includes(w)).slice(0, 60).map(p =>
        h('button', { class: 'pick-row', type: 'button', onclick: () => { close(); then(p); } },
          p.coverThumb ? h('img', { src: p.coverThumb, alt: '' }) : h('span', { class: 'pick-dot', style: `background:${p.color || '#d40000'}` }),
          h('span', {}, h('b', {}, projectName(p) || 'Χωρίς τίτλο'), h('small', {}, [p.category, nextDay(p) && fmtDate(nextDay(p).date)].filter(Boolean).join(' · '))))),
      h('button', { class: 'pick-row', type: 'button', onclick: () => { close(); then(null); } }, h('span', { class: 'pick-dot' }), h('span', {}, h('b', {}, 'Χωρίς project'), h('small', {}, 'κενό ordino'))));
  };
  const bg = h('div', { class: 'modal-bg', onclick: e => { if (e.target === bg) close(); } },
    h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
      h('h3', {}, 'Για ποιο project;'), h('p', {}, 'Παίρνει από το project τίτλο, cover, μέρα, call, τοποθεσία και άτομα.'), q, list,
      h('button', { class: 'btn ghost', onclick: close }, 'Κλείσιμο')));
  draw();
  document.body.append(bg);
  setTimeout(() => q.focus(), 50);
}
async function newOrdino(p){
  const o = blankOrdino();
  o.project.company = 'THEMADLIONS';
  if (p) fillFromProject(o, p);
  try { const c = await createOrdino(o); location.hash = '#edit/' + c.id; } catch { toast('Δεν δημιουργήθηκε. Έλεγξε τη σύνδεση.'); }
}
/* The home (Alex, 24 Oct: "a different panel, more 2026"), laid out like the hub's Calendar: one top row with the
   title, the filters as pills with a sliding glass lens, search and New ordino; under it the ordinos as one grid of
   tiles in time order filling the page, the next shoot ringed, chips for the call, when and place, and the link. */
const HOME_FILTERS = [['all', 'Όλα'], ['next', 'Επόμενα'], ['sent', 'Σε link'], ['draft', 'Πρόχειρα'], ['past', 'Περασμένα']];
let homeFilter = (() => { try { return localStorage.getItem('roardino-filter') || 'all'; } catch { return 'all'; } })();
let homeSearch = '';
const isoToday = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const daysTo = iso => Math.round((Date.parse(iso + 'T12:00:00') - Date.parse(isoToday() + 'T12:00:00')) / 86400000);
const whenWords = n => n === 0 ? 'Σήμερα' : n === 1 ? 'Αύριο' : n === -1 ? 'Χθες' : n > 1 ? `σε ${n} μέρες` : `πριν ${-n} μέρες`;
function lensRow(cls, options, current, pick){
  const row = h('div', { class: 'pills ' + cls, role: 'tablist' });
  const lens = h('span', { class: 'pill-lens', 'aria-hidden': 'true' });
  const place = () => { const on = row.querySelector('button.on'); if (!on) return; lens.style.width = on.offsetWidth + 'px'; lens.style.transform = `translateX(${on.offsetLeft}px)`; };
  row.append(lens, ...options.map(([k, l, n]) => h('button', { type: 'button', role: 'tab', class: k === current ? 'on' : '', onclick: e => {
    row.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.currentTarget)); place(); pick(k);
  } }, l, n != null ? h('span', { class: 'pill-n' }, String(n)) : null)));
  requestAnimationFrame(place); window.addEventListener('resize', place);
  return row;
}
async function viewHome(){
  document.title = 'Roardino';
  const scoped = projectOf(SCOPE);
  const create = () => SCOPE ? newOrdino(scoped) : pickProject(newOrdino);
  const body = h('div', { class: 'home2' }, h('div', { class: 'center-note' }, 'Φόρτωση…'));
  const search = h('label', { class: 'pill-search' }, h('span', { html: ICON.search }),
    h('input', { type: 'search', placeholder: 'Αναζήτηση', value: homeSearch, oninput: e => { homeSearch = e.target.value; draw(); } }));
  const head = h('header', { class: 'topbar home-top' },
    brandMark(true),
    h('h1', { class: scoped ? 'home-title' : 'home-title plain' }, scoped ? projectName(scoped) : 'Ordino'), // .plain: on a computer the ROARDINO mark is the title (Alex, 27 Oct)
    h('div', { class: 'home-filters' }),
    search,
    canEdit ? h('button', { class: 'btn primary pill-new', onclick: create }, h('span', { html: ICON.plus }), h('span', { class: 'lbl' }, 'Νέο ordino')) : null);
  app.replaceChildren(head, body);
  let list;
  try { list = await listOrdinos(); }
  catch { body.replaceChildren(h('div', { class: 'home-empty' }, h('b', {}, 'Δεν φόρτωσαν τα ordino'), h('span', {}, 'Έλεγξε τη σύνδεση και ανανέωσε.'))); return; }
  if (SCOPE) list = list.filter(o => o.projectId === SCOPE);
  const today = isoToday();
  const test = { all: () => true, next: o => (o.day.date || '') >= today, sent: o => !!o.token, draft: o => !o.token, past: o => o.day.date && o.day.date < today };
  const counts = Object.fromEntries(HOME_FILTERS.map(([k]) => [k, list.filter(test[k]).length]));
  head.querySelector('.home-filters').replaceWith(lensRow('home-filters', HOME_FILTERS.map(([k, l]) => [k, l, counts[k]]), homeFilter, k => {
    homeFilter = k; try { localStorage.setItem('roardino-filter', k); } catch {} draw();
  }));
  // the same, pressed in the hub's Share (above)
  homeApi = {
    announce: () => tellHost({ view: 'home', filters: HOME_FILTERS.map(([k]) => [k, counts[k]]), current: homeFilter, search: homeSearch, canEdit }),
    pick: k => {
      homeFilter = k; try { localStorage.setItem('roardino-filter', k); } catch {}
      head.querySelectorAll('.home-filters button').forEach((b, i) => b.classList.toggle('on', HOME_FILTERS[i][0] === k));
      draw(); homeApi.announce();
    },
    search: w => { homeSearch = w; const i = search.querySelector('input'); if (i) i.value = w; draw(); },
    create,
    redraw: () => draw(),
  };
  homeApi.announce();
  // the next shoot to come: ringed in the accent
  const next = list.filter(o => (o.day.date || '') >= today).sort((a, b) => a.day.date.localeCompare(b.day.date) || (a.day.callTime || '').localeCompare(b.day.callTime || ''))[0];
  // in the hub's Share on a computer: one soft row per ordino, as Share's own list (Alex, 27 Oct: "the same list mode")
  const listMode = () => document.documentElement.classList.contains('in-share') && window.matchMedia('(min-width:821px)').matches;
  const row = o => {
    const p = projectOf(o.projectId), n = o.day.date ? daysTo(o.day.date) : null;
    const d = o.day.date ? new Date(o.day.date + 'T12:00:00') : null;
    const open = () => { location.hash = (canEdit ? '#edit/' : '#see/') + o.id; };
    return h('article', { class: 'orow' + (o === next ? ' is-next' : '') + (n != null && n < 0 ? ' is-past' : ''), tabindex: 0, onclick: open, onkeydown: e => { if (e.key === 'Enter') open(); } },
      h('div', { class: 'orow-cover', style: o.project.cover ? `background-image:url('${o.project.cover}')` : `background-image:linear-gradient(135deg,${o.look.accent},#111)` }),
      d ? h('div', { class: 'orow-date' }, h('b', {}, String(d.getDate())), h('span', {}, d.toLocaleDateString('el-GR', { month: 'short' }).replace('.', '') + ' · ' + d.toLocaleDateString('el-GR', { weekday: 'short' }))) : h('div', { class: 'orow-date none' }, '—'),
      h('div', { class: 'orow-main' },
        h('strong', {}, o.project.title || 'Χωρίς τίτλο'),
        p && !SCOPE ? h('span', { class: 'otile-proj' }, h('i', { style: `background:${p.color || 'var(--brand)'}` }), projectName(p)) : null,
        h('div', { class: 'otile-chips' },
          o === next ? h('span', { class: 'mchip acc' }, 'Επόμενο') : null,
          h('span', { class: 'mchip ' + (o.token ? 'ok' : '') }, o.token ? 'Σε link' : 'Πρόχειρο'),
          o.day.callTime ? h('span', { class: 'mchip' }, 'Call ', h('b', {}, o.day.callTime)) : null,
          n != null ? h('span', { class: 'mchip' + (n === 0 ? ' acc' : '') }, whenWords(n)) : null,
          o.loc.name ? h('span', { class: 'mchip' }, h('span', { html: ICON.pin }), o.loc.name) : null)),
      canEdit ? h('div', { class: 'orow-acts' },
        h('button', { class: 'ibtn', type: 'button', title: 'Duplicate', 'aria-label': 'Duplicate', html: ICON.dup, onclick: async e => { e.stopPropagation(); try { await duplicateOrdino(o); toast('Έγινε αντίγραφο'); viewHome(); } catch { toast('Δεν έγινε αντίγραφο'); } } }),
        h('button', { class: 'ibtn danger', type: 'button', title: 'Διαγραφή', 'aria-label': 'Διαγραφή', html: ICON.trash, onclick: async e => {
          e.stopPropagation();
          if (!confirm(o.token ? 'Να διαγραφεί αυτό το ordino; Το link που έστειλες θα σταματήσει να ανοίγει.' : 'Να διαγραφεί αυτό το ordino;')) return;
          try { await deleteOrdino(o.id); viewHome(); } catch { toast('Δεν διαγράφηκε'); }
        } })) : null);
  };
  const tile = o => {
    if (listMode()) return row(o);
    const p = projectOf(o.projectId), n = o.day.date ? daysTo(o.day.date) : null;
    const d = o.day.date ? new Date(o.day.date + 'T12:00:00') : null;
    const open = () => { location.hash = (canEdit ? '#edit/' : '#see/') + o.id; };
    return h('article', { class: 'otile' + (o === next ? ' is-next' : '') + (n != null && n < 0 ? ' is-past' : ''), tabindex: 0, onclick: open, onkeydown: e => { if (e.key === 'Enter') open(); } },
      h('div', { class: 'otile-cover', style: o.project.cover ? `background-image:url('${o.project.cover}')` : `background-image:linear-gradient(135deg,${o.look.accent},#111)` },
        d ? h('div', { class: 'otile-date' }, h('b', {}, String(d.getDate())), h('span', {}, d.toLocaleDateString('el-GR', { month: 'short' }).replace('.', '')), h('small', {}, d.toLocaleDateString('el-GR', { weekday: 'short' }))) : null,
        h('div', { class: 'otile-tags' },
          o === next ? h('span', { class: 'tchip acc' }, h('i'), 'Επόμενο') : null,
          h('span', { class: 'tchip ' + (o.token ? 'ok' : 'draft') }, h('i'), o.token ? 'Σε link' : 'Πρόχειρο')),
        canEdit ? h('div', { class: 'otile-acts' },
          h('button', { class: 'ibtn', type: 'button', title: 'Duplicate', 'aria-label': 'Duplicate', html: ICON.dup, onclick: async e => { e.stopPropagation(); try { await duplicateOrdino(o); toast('Έγινε αντίγραφο'); viewHome(); } catch { toast('Δεν έγινε αντίγραφο'); } } }),
          h('button', { class: 'ibtn danger', type: 'button', title: 'Διαγραφή', 'aria-label': 'Διαγραφή', html: ICON.trash, onclick: async e => {
            e.stopPropagation();
            if (!confirm(o.token ? 'Να διαγραφεί αυτό το ordino; Το link που έστειλες θα σταματήσει να ανοίγει.' : 'Να διαγραφεί αυτό το ordino;')) return;
            try { await deleteOrdino(o.id); viewHome(); } catch { toast('Δεν διαγράφηκε'); }
          } })) : null),
      h('div', { class: 'otile-body' },
        p && !SCOPE ? h('div', { class: 'otile-proj' }, h('i', { style: `background:${p.color || 'var(--brand)'}` }), projectName(p)) : null,
        h('div', { class: 'otile-title' }, o.project.title || 'Χωρίς τίτλο'),
        h('div', { class: 'otile-chips' },
          o.day.callTime ? h('span', { class: 'mchip' }, 'Call ', h('b', {}, o.day.callTime)) : null,
          n != null ? h('span', { class: 'mchip' + (n === 0 ? ' acc' : '') }, whenWords(n)) : h('span', { class: 'mchip' }, 'Χωρίς ημερομηνία'),
          o.loc.name ? h('span', { class: 'mchip' }, h('span', { html: ICON.pin }), o.loc.name) : null)));
  };
  // one grid in time order: the coming ones first (soonest first), then those without a date, then the past (latest first)
  const ordered = l => {
    const rank = o => !o.day.date ? 1 : o.day.date >= today ? 0 : 2;
    return [...l].sort((a, b) => rank(a) - rank(b) || (rank(a) === 2 ? (b.day.date || '').localeCompare(a.day.date || '') : (a.day.date || '').localeCompare(b.day.date || '')) || (a.day.callTime || '').localeCompare(b.day.callTime || ''));
  };
  function draw(){
    const w = homeSearch.trim().toLowerCase();
    const shown = list.filter(test[homeFilter] || test.all).filter(o => !w || [o.project.title, o.project.artist, o.loc.name, projectName(projectOf(o.projectId))].join(' ').toLowerCase().includes(w));
    if (!shown.length){
      body.replaceChildren(h('div', { class: 'home-empty' },
        h('b', {}, list.length ? 'Κανένα ordino εδώ' : 'Δεν υπάρχει ordino ακόμα'),
        h('span', {}, list.length ? 'Δοκίμασε άλλο φίλτρο ή άλλη αναζήτηση.' : 'Φτιάξε το πρώτο: παίρνει από το project μέρα, call, τοποθεσία και άτομα.'),
        canEdit && !list.length ? h('button', { class: 'btn primary', onclick: create }, '+ Νέο ordino') : null));
      return;
    }
    body.replaceChildren(h('div', { class: listMode() ? 'olist' : 'ogrid' }, ...ordered(shown).map(tile)));
  }
  draw();
}

/* ---------- see (no editing): the Overview's Ordino button, and people with view only ---------- */
// the project's ordinos by date, the next to come first shown; or the one ordino given
async function viewSee(given){
  app.replaceChildren(h('div', { class: 'center-note' }, 'Φόρτωση…'));
  let list = given;
  if (!list){
    try { list = (await listOrdinos()).filter(o => o.projectId === SCOPE); } catch { list = []; }
    list.sort((a, b) => (a.day.date || '').localeCompare(b.day.date || ''));
  }
  if (!list.length) return viewNote('Δεν υπάρχει ordino ακόμα', 'Μόλις η παραγωγή φτιάξει το ordino του project, θα είναι εδώ.');
  const today = new Date().toISOString().slice(0, 10);
  let at = Math.max(0, list.findIndex(o => (o.day.date || '') >= today));
  if (list.every(o => (o.day.date || '') < today)) at = list.length - 1;
  const root = h('div', { class: 'viewer-root' });
  const tabs = list.length > 1 ? h('div', { class: 'see-tabs seg' }) : null;
  const draw = async () => {
    const o = list[at];
    document.body.className = 'viewer' + (EMBED ? ' embedded' : '') + (o.look.theme === 'light' ? ' v-light' : '');
    if (tabs) tabs.replaceChildren(...list.map((x, i) => h('button', { type: 'button', class: i === at ? 'on' : '', onclick: () => { at = i; draw(); } }, fmtDate(x.day.date) || 'Ordino')));
    const view = { ...o, blocks: o.blocks };
    root.innerHTML = renderOrdino(view, {});
    wireOrdinoActions(root, view);
    if (o.details.weather || o.details.sun){
      const wx = await getWeather(o.loc.lat, o.loc.lon, o.day.date);
      if (wx && list[at] === o){ root.innerHTML = renderOrdino(view, { wx }); wireOrdinoActions(root, view); }
    }
  };
  app.replaceChildren(...[!SEE ? h('header', { class: 'topbar' }, h('a', { class: 'btn icon ghost', href: BASE + '#home', title: 'Πίσω', html: ICON.back }), brandMark(true)) : null, tabs, root].filter(Boolean));
  draw();
}

/* ---------- editor ---------- */
function viewEditor(o){
  o = normalize(o);
  let wxTimer, saveTimer, dirty = false;
  const saveState = h('span', { class: 'save-state' }, 'Αποθηκεύτηκε');
  const flush = async () => {
    clearTimeout(saveTimer);
    if (!dirty) return;
    dirty = false; saveState.textContent = 'Αποθήκευση…';
    try { await saveOrdino(o); saveState.textContent = 'Αποθηκεύτηκε'; }
    catch { dirty = true; saveState.textContent = 'Δεν αποθηκεύτηκε, ξαναδοκιμάζω…'; saveTimer = setTimeout(flush, 4000); }
  };
  const save = () => { dirty = true; saveState.textContent = 'Αλλαγές…'; clearTimeout(saveTimer); saveTimer = setTimeout(flush, 900); };
  flushEditor = flush;
  window.onbeforeunload = () => { if (dirty){ flush(); return 'Αποθήκευση σε εξέλιξη'; } };
  const phoneScroll = h('div', { class: 'phone-scroll' });
  const refresh = async () => {
    const top = phoneScroll.scrollTop;
    phoneScroll.innerHTML = renderOrdino(o, { interactive: false });
    phoneScroll.scrollTop = top;
    clearTimeout(wxTimer);
    if ((o.details.weather || o.details.sun) && o.loc.lat){
      wxTimer = setTimeout(async () => {
        const wx = await getWeather(o.loc.lat, o.loc.lon, o.day.date);
        if (wx){ const t = phoneScroll.scrollTop; phoneScroll.innerHTML = renderOrdino(o, { wx, interactive: false }); phoneScroll.scrollTop = t; }
      }, 400);
    }
  };
  const changed = () => { save(); refresh(); };

  /* field factories bound to an object path */
  const txt = (obj, key, label, opts = {}) => h('label', { class: 'field' }, h('span', {}, label),
    h(opts.area ? 'textarea' : 'input', { class: opts.area ? 'textarea' : 'input', type: opts.type || 'text', value: obj[key] ?? '', placeholder: opts.ph || '', inputmode: opts.inputmode,
      oninput: e => { obj[key] = opts.type === 'number' ? Math.max(1, +e.target.value || 1) : e.target.value; changed(); if (opts.after) opts.after(); } }));
  const seg = (obj, key, options) => h('div', { class: 'seg' }, options.map(([v, l]) =>
    h('button', { type: 'button', class: obj[key] === v ? 'on' : '', onclick: e => { obj[key] = v; [...e.target.parentNode.children].forEach(c => c.classList.toggle('on', c === e.target)); changed(); } }, l)));
  const tog = (obj, key, label) => h('label', { class: 'toggle' }, label, h('input', { type: 'checkbox', class: 'switch', checked: !!obj[key], onchange: e => { obj[key] = e.target.checked; changed(); } }));
  const section = (title, sub, open, ...body) => h('details', { class: 'section', open }, h('summary', {}, title, sub ? h('span', { class: 'sub' }, sub) : null, h('span', { class: 'chev', html: ICON.down.replace('<svg', '<svg width="18" height="18"') })), h('div', { class: 'inner' }, ...body));

  const blockSection = (key, open, ...body) => {
    const b = o.blocks.find(x => x.key === key);
    const sw = h('input', { type: 'checkbox', class: 'switch', checked: b.on, title: 'Φαίνεται στο ordino', 'aria-label': 'Φαίνεται στο ordino',
      onclick: e => e.stopPropagation(), onchange: e => { b.on = e.target.checked; node.classList.toggle('off', !b.on); changed(); } });
    const node = h('details', { class: 'section' + (b.on ? '' : ' off'), open }, h('summary', {}, BLOCK_DEFS[key], h('span', { class: 'sub off-note' }, 'κρυφό'), h('span', { class: 'head-sw', onclick: e => e.stopPropagation() }, sw),
      h('span', { class: 'chev', html: ICON.down.replace('<svg', '<svg width="18" height="18"') })), h('div', { class: 'inner' }, ...body));
    return node;
  };

  /* repeatable list editor */
  function listEditor(arrKey, cols, blank, addLabel){
    const wrap = h('div', { class: 'list' });
    const draw = () => {
      wrap.replaceChildren(...o[arrKey].map((row, i) => h('div', { class: 'li', style: `grid-template-columns:${cols.map(c => c.w || '1fr').join(' ')} auto` },
        cols.map(c => h('input', { class: 'input', type: c.type || 'text', value: row[c.key] ?? '', placeholder: c.ph, 'aria-label': c.ph, inputmode: c.inputmode,
          oninput: e => { row[c.key] = e.target.value; changed(); } })),
        h('div', { class: 'li-tools' },
          h('button', { class: 'btn ghost', type: 'button', title: 'Πάνω', html: ICON.up, disabled: i === 0, onclick: () => { [o[arrKey][i - 1], o[arrKey][i]] = [o[arrKey][i], o[arrKey][i - 1]]; draw(); changed(); } }),
          h('button', { class: 'btn ghost danger', type: 'button', title: 'Αφαίρεση', html: ICON.x, onclick: () => { o[arrKey].splice(i, 1); draw(); changed(); } })))),
        h('button', { class: 'btn small', type: 'button', onclick: () => { o[arrKey].push({ ...blank }); draw(); changed(); const ins = wrap.querySelectorAll('.li'); ins[ins.length - 1]?.querySelector('input')?.focus(); } }, '+ ' + addLabel));
    };
    draw();
    return wrap;
  }

  /* image pickers */
  function imagePicker(label, key, maxW, type, isLogo){
    const thumb = h('div', { class: 'img-thumb' + (isLogo ? ' logo' : '') });
    const paint = () => { thumb.style.backgroundImage = o.project[key] ? `url('${o.project[key]}')` : ''; clearBtn.classList.toggle('hidden', !o.project[key]); };
    const file = h('input', { type: 'file', accept: 'image/*', class: 'hidden', onchange: async e => {
      const f = e.target.files[0]; if (!f) return;
      try { o.project[key] = await readImage(f, maxW, 0.8, type); paint(); changed(); } catch { toast('Η εικόνα δεν διαβάστηκε'); }
      e.target.value = '';
    } });
    const clearBtn = h('button', { class: 'btn small ghost danger', type: 'button', onclick: () => { o.project[key] = ''; paint(); changed(); } }, 'Αφαίρεση');
    const node = h('div', { class: 'field' }, h('span', {}, label), h('div', { class: 'img-pick' }, thumb,
      h('button', { class: 'btn small', type: 'button', onclick: () => file.click() }, o.project[key] ? 'Αλλαγή' : 'Επιλογή'), clearBtn, file));
    paint();
    return node;
  }
  const range = (label, key, min, max, step) => h('label', { class: 'field' }, h('span', {}, label),
    h('input', { class: 'range', type: 'range', min, max, step, value: o.project.coverPos[key], oninput: e => { o.project.coverPos[key] = +e.target.value; changed(); } }));

  /* blocks: the order and an own title here, on/off on each section's own head */
  const blocksWrap = h('div', { class: 'list blocks-order' });
  const drawBlocks = () => blocksWrap.replaceChildren(...o.blocks.map((b, i) => h('div', { class: 'li' },
    h('input', { class: 'input', value: b.title, placeholder: BLOCK_DEFS[b.key], 'aria-label': 'Τίτλος ενότητας', oninput: e => { b.title = e.target.value; changed(); } }),
    h('div', { class: 'li-tools' },
      h('button', { class: 'btn ghost', type: 'button', html: ICON.up, disabled: i === 0, title: 'Πάνω', onclick: () => { [o.blocks[i - 1], o.blocks[i]] = [o.blocks[i], o.blocks[i - 1]]; drawBlocks(); changed(); } }),
      h('button', { class: 'btn ghost', type: 'button', html: ICON.down, disabled: i === o.blocks.length - 1, title: 'Κάτω', onclick: () => { [o.blocks[i + 1], o.blocks[i]] = [o.blocks[i], o.blocks[i + 1]]; drawBlocks(); changed(); } })))));
  drawBlocks();

  /* accent swatches */
  const colorIn = h('input', { type: 'color', class: 'color-in', value: o.look.accent, oninput: e => { o.look.accent = e.target.value; markSw(); changed(); } });
  const sws = ACCENTS.map(c => h('button', { type: 'button', class: 'sw', style: `background:${c}`, title: c, onclick: () => { o.look.accent = c; colorIn.value = c; markSw(); changed(); } }));
  const markSw = () => sws.forEach((s, i) => s.classList.toggle('on', ACCENTS[i].toLowerCase() === o.look.accent.toLowerCase()));
  markSw();

  /* geocode: finds the spot by itself from the address (weather, sunset), unless the Maps link already has coordinates */
  const geoStatus = h('div', { class: 'hint' }, o.loc.lat ? `Καιρός και δύση για 📍 ${o.loc.lat}, ${o.loc.lon}` : 'Γράψε διεύθυνση για καιρό και ώρα δύσης.');
  const mapNote = () => !o.loc.link ? 'Directions και Open in Maps εμφανίζονται μόνο με link Google Maps.'
    : !MAPS_LINK.test(o.loc.link) ? 'Αυτό δεν είναι link του Google Maps.' : 'Directions και Open in Maps ανοίγουν ακριβώς στο σημείο του link.';
  const mapHint = h('div', { class: 'hint' }, mapNote());
  let geoT = 0;
  const autoGeo = () => {
    clearTimeout(geoT);
    if (coordsOf(o.loc.link || '')) return;
    const q = [o.loc.address, o.loc.name].filter(Boolean).join(', ');
    if (!q){ o.loc.lat = o.loc.lon = null; return; }
    geoT = setTimeout(async () => {
      geoStatus.textContent = 'Αναζήτηση τοποθεσίας…';
      try {
        let r = await geocode(q);
        if (!r && o.loc.address) r = await geocode(o.loc.address);
        if (r){ o.loc.lat = r.lat; o.loc.lon = r.lon; geoStatus.textContent = 'Καιρός και δύση για 📍 ' + r.label; changed(); }
        else geoStatus.textContent = 'Δεν βρέθηκε για τον καιρό. Γράψε οδό, αριθμό και πόλη, ή βάλε το μεγάλο link Google Maps.';
      } catch { geoStatus.textContent = 'Δεν υπάρχει σύνδεση για αναζήτηση.'; }
    }, 900);
  };

  // Fill from project: name, cover, the next shoot day, its location and the people, over what is typed
  const fillBtn = h('button', { class: 'btn', type: 'button', disabled: !o.projectId, onclick: () => {
    const p = projectOf(o.projectId); if (!p) return;
    if (!confirm('Να γεμίσει από το project; Τίτλος, cover, μέρα, call, τοποθεσία και άτομα θα γραφτούν από πάνω.')) return;
    fillFromProject(o, p); save(); flush().then(() => viewEditor(o));
  } }, 'Γέμισε από το project');
  const form = h('div', { class: 'form' },
    section('Project', 'πελάτης, τίτλος, εταιρεία', true,
      h('div', { class: 'row' },
        h('label', { class: 'field' }, h('span', {}, 'Project του hub'),
          h('select', { class: 'input', onchange: e => { o.projectId = e.target.value; save(); fillBtn.disabled = !o.projectId; } },
            h('option', { value: '' }, 'Χωρίς project'),
            ...projects.map(p => h('option', { value: p.id, selected: p.id === o.projectId }, projectName(p) || 'Χωρίς τίτλο')))),
        h('div', { class: 'field' }, h('span', {}, '\u00a0'), fillBtn)),
      h('div', { class: 'row' }, txt(o.project, 'artist', 'Πελάτης / Καλλιτέχνης', { ph: 'π.χ. Disney' }), txt(o.project, 'title', 'Τίτλος project', { ph: 'π.χ. The Lion King' })),
      txt(o.project, 'company', 'Εταιρεία (υπογραφή στο τέλος)', { ph: 'π.χ. THEMADLIONS' })),

    section('Η μέρα', 'επικεφαλίδα, ημερομηνία, unit', true,
      h('div', { class: 'row' }, txt(o.day, 'label', 'Επικεφαλίδα', { ph: 'GENERAL ORDINO' }), txt(o.day, 'date', 'Ημερομηνία', { type: 'date' })),
      h('div', { class: 'row' }, txt(o.day, 'index', 'Ημέρα', { type: 'number', inputmode: 'numeric' }), txt(o.day, 'count', 'από', { type: 'number', inputmode: 'numeric' }),
        txt(o.day, 'unit', 'Unit', { ph: 'Main unit' }))),

    section('Ώρες', 'call, wrap, break', true,
      h('div', { class: 'row' }, txt(o.day, 'callTime', 'General call', { type: 'time' }), txt(o.day, 'wrapTime', 'Εκτιμώμενο wrap', { type: 'time' }),
        txt(o, 'lunch', 'Break / Φαγητό', { type: 'time' })),
      txt(o, 'tagline', 'Γραμμή κάτω από το call', { ph: 'π.χ. Φροντίστε για ζεστά ρούχα.' }),
      h('div', { class: 'hint' }, 'Ό,τι συμπληρώνεις φαίνεται στο ordino, ό,τι αφήνεις κενό δεν φαίνεται.')),

    blockSection('groupcalls', true,
      listEditor('groupCalls', [{ key: 'time', ph: 'Ώρα', type: 'time', w: '110px' }, { key: 'who', ph: 'Ποιος / ομάδα' }], { time: '', who: '' }, 'Ομάδα')),

    blockSection('location', true,
      h('div', { class: 'row' }, txt(o.loc, 'name', 'Όνομα χώρου', { ph: 'π.χ. Boulevart Studios', after: autoGeo }), txt(o.loc, 'address', 'Διεύθυνση', { ph: 'Οδός, αριθμός, πόλη', after: autoGeo })),
      h('label', { class: 'field' }, h('span', {}, 'Link Google Maps'),
        h('input', { class: 'input', type: 'url', inputmode: 'url', value: o.loc.link || '', placeholder: 'https://maps.app.goo.gl/…',
          oninput: e => {
            o.loc.link = e.target.value.trim();
            const c = coordsOf(o.loc.link);
            if (c){ o.loc.lat = c.lat; o.loc.lon = c.lon; geoStatus.textContent = `Καιρός και δύση για 📍 ${c.lat}, ${c.lon}`; }
            mapHint.textContent = mapNote();
            changed();
            if (!c) autoGeo();
          } })),
      mapHint, geoStatus,
      h('div', { class: 'toggles' }, tog(o.details, 'weather', 'Καιρός'), tog(o.details, 'sun', 'Ανατολή / Δύση')),
      h('div', { class: 'row' }, txt(o.loc, 'contact', 'Υπεύθυνος χώρου'), txt(o.loc, 'phone', 'Τηλέφωνο', { type: 'tel', inputmode: 'tel' })),
      txt(o.loc, 'parking', 'Parking', { area: true, ph: 'Πού παρκάρουμε, οδηγίες πρόσβασης…' }),
      txt(o.loc, 'hospital', 'Πλησιέστερο νοσοκομείο', { ph: 'Όνομα, διεύθυνση, τηλέφωνο' }),
      h('div', { class: 'field' }, h('span', {}, 'Extra locations'),
        h('div', { class: 'hint' }, 'Κι άλλοι χώροι της μέρας (π.χ. parking, base, catering). Το καθένα βγαίνει με δικό του Directions.'),
        listEditor('extraLocs', [{ key: 'name', ph: 'Όνομα' }, { key: 'address', ph: 'Διεύθυνση' }, { key: 'link', ph: 'Link Google Maps', type: 'url' }], { name: '', address: '', link: '' }, 'Τοποθεσία'))),

    blockSection('program', true,
      listEditor('program', [{ key: 'from', ph: 'Από', type: 'time', w: '100px' }, { key: 'to', ph: 'Έως', type: 'time', w: '100px' }, { key: 'what', ph: 'Τι γίνεται' }], { from: '', to: '', what: '' }, 'Γραμμή')),

    blockSection('scenes', false,
      listEditor('scenes', [{ key: 'num', ph: 'Σκ.', w: '70px' }, { key: 'desc', ph: 'Περιγραφή' }, { key: 'meta', ph: 'INT/EXT · Μέρα', w: '1fr' }], { num: '', desc: '', meta: '' }, 'Σκηνή')),
    blockSection('cast', false,
      listEditor('cast', [{ key: 'name', ph: 'Όνομα' }, { key: 'role', ph: 'Ρόλος' }, { key: 'time', ph: 'Call', type: 'time', w: '100px' }], { name: '', role: '', time: '' }, 'Ηθοποιός')),
    blockSection('crew', false,
      listEditor('crew', [{ key: 'name', ph: 'Όνομα' }, { key: 'role', ph: 'Θέση' }, { key: 'time', ph: 'Call', type: 'time', w: '100px' }], { name: '', role: '', time: '' }, 'Μέλος')),
    blockSection('contacts', false,
      listEditor('contacts', [{ key: 'name', ph: 'Όνομα' }, { key: 'role', ph: 'Θέση' }, { key: 'phone', ph: 'Τηλέφωνο', type: 'tel', inputmode: 'tel' }], { name: '', role: '', phone: '' }, 'Επαφή')),
    blockSection('note', false,
      txt(o, 'notes', 'Σημείωση', { area: true, ph: 'Πληροφορίες, τηλέφωνα επικοινωνίας… (τα τηλέφωνα γίνονται κλικ)' })),

    section('Εμφάνιση', 'θέμα, χρώμα, cover, σειρά', false,
      h('div', { class: 'field' }, h('span', {}, 'Θέμα'), seg(o.look, 'theme', [['dark','Dark'],['glass','Glass'],['light','Light']])),
      h('div', { class: 'field' }, h('span', {}, 'Χρώμα'), h('div', { class: 'swatches' }, sws, colorIn)),
      h('div', { class: 'row' },
        h('div', { class: 'field' }, h('span', {}, 'Κεφαλίδα'), seg(o.look, 'header', [['centred','Κέντρο'],['left','Αριστερά']])),
        h('div', { class: 'field' }, h('span', {}, 'Μέγεθος γραμμάτων'), seg(o.look, 'size', [['normal','Κανονικό'],['small','Μικρό']]))),
      h('div', { class: 'row' }, imagePicker('Φωτογραφία cover', 'cover', 1400, 'image/jpeg'), imagePicker('Λογότυπο', 'logo', 400, 'image/png', true)),
      tog(o.details, 'cover', 'Δείξε τη φωτογραφία cover'),
      h('div', { class: 'row' }, range('Θέση οριζόντια', 'x', 0, 100, 1), range('Θέση κάθετα', 'y', 0, 100, 1)),
      h('div', { class: 'row' }, range('Zoom', 'z', 1, 2.5, 0.05), range('Σκοτείνιασμα', 'o', 0, 0.85, 0.05)),
      h('div', { class: 'field' }, h('span', {}, 'Σειρά ενοτήτων'),
        h('div', { class: 'hint' }, 'Άλλαξε τη σειρά με τα βελάκια και, αν θες, δώσε δικό σου τίτλο. Ποια φαίνονται το ανοίγεις και το κλείνεις στον τίτλο κάθε ενότητας.'),
        blocksWrap)),
  );

  const ed = h('div', { class: 'editor', 'data-view': 'edit' },
    form,
    h('aside', { class: 'preview-wrap' }, h('div', { class: 'preview-label' }, 'Έτσι θα το δουν στο κινητό'), h('div', { class: 'phone' }, phoneScroll)));
  const tabs = h('div', { class: 'mobile-tabs' },
    h('button', { class: 'on', type: 'button', onclick: e => setView('edit', e.target) }, 'Επεξεργασία'),
    h('button', { type: 'button', onclick: e => setView('preview', e.target) }, 'Προεπισκόπηση'));
  function setView(v, btn){ ed.dataset.view = v; [...tabs.children].forEach(c => c.classList.toggle('on', c === btn)); window.scrollTo({ top: 0 }); }

  app.replaceChildren(
    h('header', { class: 'topbar' },
      h('a', { class: 'btn icon ghost', href: BASE + '#home', title: 'Πίσω', html: ICON.back }),
      brandMark(true),
      h('div', { class: 'spacer' }),
      saveState,
      h('button', { class: 'btn tb', title: 'Duplicate: νέο ordino με όλα αυτά μέσα', 'aria-label': 'Duplicate', onclick: async e => {
        const b = e.currentTarget; b.disabled = true; await flush();
        try { const c = await duplicateOrdino(o); toast('Έγινε αντίγραφο, τώρα είσαι σε αυτό'); location.hash = '#edit/' + c.id; } catch { toast('Δεν έγινε αντίγραφο'); }
        b.disabled = false;
      } }, h('span', { html: ICON.dup }), h('span', { class: 'lbl' }, 'Duplicate')),
      h('button', { class: 'btn primary tb', 'aria-label': 'Αποστολή link', onclick: () => openShare(o) }, h('span', { html: ICON.share }), h('span', { class: 'lbl' }, 'Αποστολή link'))),
    ed, tabs);
  document.title = (o.project.title || 'Νέο ordino') + ' · Roardino';
  refresh();
}

/* ---------- share modal ---------- */
async function openShare(o){
  const input = h('input', { class: 'input', readonly: true, value: 'Ανέβασμα…', onfocus: e => e.target.select() });
  const status = h('p', {}, o.token ? 'Ενημερώνω το ίδιο link με τις αλλαγές σου…' : 'Φτιάχνω το link…');
  const close = () => bg.remove();
  const btns = h('div', { class: 'linkbox' },
    h('button', { class: 'btn primary', style: 'flex:1', onclick: async () => { try { await navigator.clipboard.writeText(input.value); toast('Αντιγράφηκε'); } catch { input.select(); document.execCommand('copy'); toast('Αντιγράφηκε'); } } }, 'Αντιγραφή'),
    navigator.share ? h('button', { class: 'btn', style: 'flex:1', onclick: () => navigator.share({ title: o.project.title || 'Ordino', text: `${o.day.label || 'Ordino'} · ${o.project.title || ''} · Call ${o.day.callTime || ''}`, url: input.value }).catch(() => {}) }, 'Κοινοποίηση') : null,
    h('a', { class: 'btn', style: 'flex:1', target: '_blank', rel: 'noopener', href: '#', onclick: e => { e.currentTarget.href = input.value; } }, 'Άνοιγμα'));
  btns.style.visibility = 'hidden';
  const bg = h('div', { class: 'modal-bg', onclick: e => { if (e.target === bg) close(); } },
    h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
      h('h3', {}, 'Στείλε το ordino'), status,
      h('div', { class: 'linkbox' }, input), btns,
      h('button', { class: 'btn ghost', onclick: close }, 'Κλείσιμο')));
  document.body.append(bg);
  const had = !!o.token;
  try {
    input.value = await publishOrdino(o);
    status.textContent = had
      ? 'Έτοιμο. Το link είναι το ίδιο, όποιος το ανοίξει βλέπει πια τις αλλαγές.'
      : 'Όποιος έχει το link βλέπει το ordino στο κινητό του, χωρίς λογαριασμό. Αν αλλάξεις κάτι, πάτα ξανά «Αποστολή link»: το ίδιο link ενημερώνεται.';
  } catch {
    input.value = await buildShareUrl(o);
    status.textContent = 'Δεν υπήρχε σύνδεση με τον server, οπότε έφτιαξα link που κουβαλάει όλο το ordino μέσα του. Δουλεύει κανονικά, αλλά δεν ενημερώνεται αν αλλάξεις κάτι. Όταν επανέλθει η σύνδεση, πάτα ξανά «Αποστολή link».';
  }
  btns.style.visibility = '';
}

boot();
