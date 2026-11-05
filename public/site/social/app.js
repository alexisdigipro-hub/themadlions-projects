'use strict';
/* =====================================================================================================================
   Roardino, the social place (Alex, 4 Nov 2026): "Facebook with Instagram" for the film, theatre, dance and photo
   world. A feed (posts, Bravo instead of like, comments, follow, calls among the posts), people as photo tiles, a profile
   that is a portfolio (its posts as a grid in the order its owner sets), calls (casting and crew wanted, apply with one
   click) and seminars. Minors only through a parent's account; their profiles are seen only by trusted productions.
   Its own thing: the only tie to the rest is the Roar Account. Data: RoarMe's Supabase project, tables roardino_*,
   bucket roardino-people (supabase/roardino-social.sql in the hub repository).
   Layout (Alex's reference, 4 Nov): a glass top bar, my card on the left, the feed in the middle, the week and the calls
   for me on the right; a glass bar at the bottom on a phone. English first; every text goes through t() so Greek can
   be added in EL (Alex: "all in English to start, then translate it all to Greek").
   ===================================================================================================================== */

const SB_URL = 'https://bzmjhbnwhdwmncxkqkdl.supabase.co';
const SB_KEY = 'sb_publishable_7mQ3e0NH5lCmdoIKx2-FUA_EgCoXx9X'; // public by design
const BUCKET = 'roardino-people';
const MAX_VIDEO = 200 * 1024 * 1024;
const sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { storageKey: 'roardino-social-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

/* ---------- the look of the letters for everyone (Alex, 5 Nov: "fonts from Google Fonts, the boldness and the thickness", only he
   changes it): roardino_settings 'look' = { font, text, strong }, kept on the device too so the next start paints it at once ---------- */
const FONTS = [['', 'System (San Francisco / Segoe)'], ['Inter', 'Inter'], ['Manrope', 'Manrope'], ['Roboto', 'Roboto'], ['Open Sans', 'Open Sans'], ['Noto Sans', 'Noto Sans'],
  ['Commissioner', 'Commissioner'], ['Ubuntu', 'Ubuntu'], ['Fira Sans', 'Fira Sans'], ['Source Sans 3', 'Source Sans 3'], ['Comfortaa', 'Comfortaa'], ['Advent Pro', 'Advent Pro'],
  ['Literata', 'Literata (serif)'], ['Noto Serif', 'Noto Serif (serif)'], ['GFS Didot', 'GFS Didot (serif)']]; // all of them write Greek too
const LOOK_DEFAULT = { font: '', text: 400, strong: 600 };
let look = { ...LOOK_DEFAULT };
try { look = { ...LOOK_DEFAULT, ...JSON.parse(localStorage.getItem('roardino-look') || '{}') }; } catch { /* private window */ }
function wearLook() {
  const r = document.documentElement.style;
  r.setProperty('--w-text', String(look.text)); r.setProperty('--w-strong', String(look.strong));
  r.setProperty('--w-mid', String(Math.round((+look.text + +look.strong) / 2 / 50) * 50));
  let link = document.getElementById('look-font');
  if (look.font) {
    const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(look.font).replace(/%20/g, '+')}:wght@300;400;500;600;700;800&display=swap`;
    if (!link) { link = document.createElement('link'); link.id = 'look-font'; link.rel = 'stylesheet'; document.head.append(link); }
    if (link.href !== href) link.href = href;
    r.setProperty('--font', `'${look.font}',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`);
  } else { link?.remove(); r.removeProperty('--font'); }
}
wearLook();
async function loadLook() {
  const { data } = await sb.from('roardino_settings').select('value').eq('key', 'look').maybeSingle();
  look = { ...LOOK_DEFAULT, ...(data?.value || {}) };
  try { localStorage.setItem('roardino-look', JSON.stringify(look)); } catch { /* full */ }
  wearLook();
}
loadLook().catch(() => { /* keep what the device had */ });
let lookTimer = null;
function setLook(k, v) {
  look[k] = v; wearLook();
  try { localStorage.setItem('roardino-look', JSON.stringify(look)); } catch { /* full */ }
  clearTimeout(lookTimer);
  lookTimer = setTimeout(async () => { const { error } = await sb.from('roardino_settings').upsert({ key: 'look', value: look, updated_at: new Date().toISOString() }); if (error) toast(errText(error)); }, 500);
}

/* ---------- words: English is the key, Greek comes later in EL ---------- */
let LANG = 'en';
try { LANG = localStorage.getItem('roardino-lang') || 'en'; } catch { /* private window */ }
const EL = {};
const t = (s, vars) => { let x = (LANG === 'el' && EL[s]) || s; if (vars) for (const [k, v] of Object.entries(vars)) x = x.replaceAll(`{${k}}`, v); return x; };
const LOCALE = () => (LANG === 'el' ? 'el-GR' : 'en-GB');

/* ---------- settings kept on this device (Alex, 5 Nov) ---------- */
const PREFS_KEY = 'roardino-prefs';
const PREF_DEFAULTS = { theme: 'auto', text: 'normal', feedCalls: true, mutedVideos: true, showStories: true, accent: 'red', showSeen: false };
// the accent colours (Alex, 5 Nov: "10 nice colours with the same gradient"); their light and dark shades live in social.css
const ACCENTS = [['red', 'Red', '#e2766d,#d40000 55%,#8f0000'], ['orange', 'Orange', '#f0a070,#e05a00 55%,#9a3a00'], ['gold', 'Gold', '#d9b45a,#b88400 55%,#7a5500'],
  ['emerald', 'Emerald', '#6fcf97,#0f9d58 55%,#06623a'], ['teal', 'Teal', '#6cd4d0,#00a3a3 55%,#006466'], ['ocean', 'Ocean', '#7fb2f0,#1a6fe0 55%,#0b3f8f'],
  ['indigo', 'Indigo', '#9a9cf0,#4b4fd9 55%,#2a2c8f'], ['violet', 'Violet', '#c18cf0,#8a2be2 55%,#541a8f'], ['pink', 'Pink', '#f08cc4,#e0157a 55%,#8f0a4c'], ['steel', 'Steel', '#7d8fb0,#4a6390 55%,#2b3a5c']];
let prefs = { ...PREF_DEFAULTS };
try { prefs = { ...PREF_DEFAULTS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch { /* private window */ }
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
function wearPrefs() {
  setTimeout(() => typeof chatLook === 'function' && chatLook());
  const dark = prefs.theme === 'dark' || (prefs.theme === 'auto' && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.text = prefs.text;
  if (ACCENTS.some(([k]) => k === prefs.accent) && prefs.accent !== 'red') document.documentElement.dataset.accent = prefs.accent; else delete document.documentElement.dataset.accent;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#15171b' : '#eceef1');
}
function setPref(k, v) { prefs[k] = v; try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* full */ } wearPrefs(); }
darkQuery.addEventListener?.('change', wearPrefs);
wearPrefs();

// what people do: in front (on camera, on stage) or behind
const KINDS = [
  ['actor', 'Actor', 'front'], ['model', 'Model', 'front'], ['dancer', 'Dancer', 'front'], ['extra', 'Extra', 'front'],
  ['singer', 'Singer / Musician', 'front'],
  ['director', 'Film director', 'back'], ['dop', 'Director of photography (DoP)', 'back'], ['camera', 'Camera', 'back'], ['gaffer', 'Lighting / Gaffer', 'back'],
  ['sound', 'Sound', 'back'], ['editor', 'Editor', 'back'], ['colorist', 'Colorist', 'back'], ['producer', 'Producer', 'back'],
  ['ad', 'Assistant director', 'back'], ['casting', 'Casting', 'back'],
  ['photo', 'Photographer', 'creative'], ['styling', 'Styling / Wardrobe', 'creative'], ['makeup', 'Make-up / Hair', 'creative'],
  ['art', 'Art department', 'creative'], ['vfx', 'VFX / Motion', 'creative'], ['writer', 'Writer', 'creative'], ['choreo', 'Choreographer', 'creative'],
];
const KIND = Object.fromEntries(KINDS.map((k) => [k[0], k[1]]));
KIND.theatre = 'Actor'; // "Theatre" was a kind for a few hours on 4 Nov; Alex: whoever plays theatre is an actor
const kindName = (k) => t(KIND[k] || k);
const SIDE = Object.fromEntries(KINDS.map((k) => [k[0], k[2]]));

/* ---------- search in Greek and in Greeklish (Alex, 5 Nov: "Eleni finds Ελένη, without accents too") ----------
   fold() brings Greek, Greeklish and English spellings of a word to one Latin skeleton: no accents, Greek letters to
   Latin, and the usual ways of writing a sound made one (ει/οι/η/υ/y = i, αι = e, ου = u, μπ = b = v, ντ = d, χ/ch/kh = h,
   φ/ph = f, ξ/x = ks, γι/yi/gi before a vowel = i, double letters single). Both the profile and the words typed go
   through it, so Ελένη, Ελενη, Eleni and Elenh all meet. */
const GR = { α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'ks', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'i', φ: 'f', χ: 'h', ψ: 'ps', ω: 'o' };
function fold(x) {
  let s = String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/ου/g, 'u').replace(/αυ(?=[θκξπσςτφχψ]|$|\s)/g, 'af').replace(/ευ(?=[θκξπσςτφχψ]|$|\s)/g, 'ef').replace(/αυ/g, 'av').replace(/ευ/g, 'ev')
    .replace(/μπ/g, 'b').replace(/ντ/g, 'd').replace(/γ[γκ]/g, 'g').replace(/τσ/g, 'ts').replace(/τζ/g, 'dz')
    .replace(/γι(?=[αεοουω])/g, 'i').replace(/[α-ω]/g, (c) => GR[c] ?? c);
  return s.replace(/ou/g, 'u').replace(/ph/g, 'f').replace(/[ck]h|kh/g, 'h').replace(/x/g, 'ks').replace(/[cq]/g, 'k').replace(/w/g, 'o')
    .replace(/\b[gy]i(?=[aeou])/g, 'i').replace(/\by(?=[aeou])/g, 'i').replace(/ai/g, 'e').replace(/(ei|oi|ee|y)/g, 'i')
    .replace(/h\b/g, 'i').replace(/n(?=[gk])/g, '').replace(/mp/g, 'b').replace(/nt/g, 'd').replace(/b/g, 'v').replace(/(gg|gk)/g, 'g').replace(/j/g, 'dz').replace(/([a-z])\1+/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
// the words in Greek for what people do and for the big cities, so ηθοποιος finds actors and Αθήνα finds Athens
const KIND_EL = { actor: 'ηθοποιός ηθοποιοί', model: 'μοντέλο', dancer: 'χορευτής χορεύτρια χορός', extra: 'κομπάρσος', singer: 'τραγουδιστής τραγουδίστρια μουσικός',
  director: 'σκηνοθέτης σκηνοθέτρια', dop: 'διευθυντής φωτογραφίας', camera: 'κάμερα κάμεραμαν οπερατέρ', gaffer: 'φωτισμός ηλεκτρολόγος', sound: 'ήχος ηχολήπτης',
  editor: 'μοντέρ μοντάζ', colorist: 'χρώμα', producer: 'παραγωγός παραγωγή', ad: 'βοηθός σκηνοθέτη', casting: 'κάστινγκ', photo: 'φωτογράφος φωτογραφία',
  styling: 'στυλίστας ενδυματολόγος κοστούμια', makeup: 'μακιγιάζ κομμώσεις', art: 'σκηνογράφος σκηνογραφία', vfx: 'εφέ', writer: 'σεναριογράφος σενάριο συγγραφέας', choreo: 'χορογράφος χορογραφία' };
const CITY_ALSO = { athens: 'athina', athina: 'athens', thessaloniki: 'salonika', patra: 'patras', patras: 'patra', heraklion: 'iraklio', iraklio: 'heraklion', larisa: 'larissa', chania: 'hania', crete: 'kriti', kriti: 'crete' };
const words = (v) => (v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v.map(words).join(' ') : typeof v === 'object' ? Object.values(v).map(words).join(' ') : String(v));
function personKeys(p) {
  const ks = (p.kinds || []).map((k) => (k === 'theatre' ? 'actor' : k));
  const city = fold(p.city);
  return ' ' + fold([p.name, p.city, CITY_ALSO[city] || '', p.headline, ...ks.map((k) => KIND[k] || k), ...ks.map((k) => KIND_EL[k] || ''), words(p.data?.skills), words(p.data?.languages), words(p.data?.tools)].join(' ')) + ' ';
}
// every word typed must be found at the start of a word of the profile (Ελ finds Ελένη, not Μιχαέλα)
const matchesOne = (keys, q) => fold(q).split(' ').filter(Boolean).every((w) => keys.includes(' ' + w));
// in Greeklish x is χ as often as ξ (xoreftria, xristos): both are tried
const matches = (keys, q) => matchesOne(keys, q) || (/x/i.test(q) && matchesOne(keys, q.replace(/x/gi, 'h')));

/* ---------- @usernames and tags (Alex, 5 Nov: "tag a profile with @ in a new post") ---------- */
const HANDLE_RE = /^[a-z0-9._]{3,30}$/;
const GRH = { α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o' };
const slugOf = (name) => String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ου/g, 'ou').replace(/μπ/g, 'b')
  .replace(/[α-ω]/g, (c) => GRH[c] ?? c).replace(/[^a-z0-9]+/g, '.').replace(/^[._]+|[._]+$/g, '').slice(0, 30);
// text with @handles made into links to the profile
function tagText(text) {
  const out = []; let last = 0; const re = /@([A-Za-z0-9._]{3,30})/g; let m;
  const str = String(text || '');
  while ((m = re.exec(str))) {
    const hd = m[1].toLowerCase().replace(/[._]+$/, '');
    if (m.index > last) out.push(str.slice(last, m.index));
    out.push(h('a', { class: 'tag', href: `#/u/${hd}`, onclick: (e) => e.stopPropagation() }, '@' + hd));
    last = m.index + 1 + hd.length;
  }
  if (last < str.length) out.push(str.slice(last));
  return out;
}
// everyone who can be tagged, read once
let tagPeople = null;
async function loadTagPeople() {
  if (tagPeople) return tagPeople;
  const { data } = await sb.from('roardino_people').select('id,name,handle,avatar,kinds,minor').eq('visible', true).eq('minor', false).not('handle', 'is', null).order('updated_at', { ascending: false }).limit(1000);
  tagPeople = data || []; await sign(tagPeople.map((p) => p.avatar)); return tagPeople;
}
// typing @ in a field opens a list of people; a click or Enter puts their @username in
function withMentions(field) {
  const list = h('div', { class: 'mention-list hidden', role: 'listbox' });
  const wrap = h('div', { class: 'mention-wrap' });
  let items = [], at = -1, sel = 0;
  const close = () => { list.classList.add('hidden'); items = []; at = -1; };
  const pick = (p) => {
    const v = field.value, pos = field.selectionStart;
    field.value = v.slice(0, at) + '@' + p.handle + ' ' + v.slice(pos);
    const c = at + p.handle.length + 2; field.setSelectionRange(c, c); field.focus(); close();
    field.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const draw = () => put(list, items.map((p, i) => h('button', { type: 'button', class: 'mention' + (i === sel ? ' on' : ''), onmousedown: (e) => { e.preventDefault(); pick(p); } },
    avatar(p, 'sm'), h('span', {}, h('b', {}, p.name), h('small', {}, '@' + p.handle + (p.kinds?.length ? ' · ' + kindName(p.kinds[0]) : ''))))));
  field.addEventListener('input', async () => {
    const pos = field.selectionStart, before = field.value.slice(0, pos), m = before.match(/(^|\s)@([^\s@]{0,30})$/);
    if (!m) return close();
    at = pos - m[2].length - 1;
    const q = m[2], ppl = await loadTagPeople(), fq = fold(q);
    items = ppl.filter((p) => !q || p.handle.startsWith(q.toLowerCase()) || matches(p._keys ??= ' ' + fold(p.name) + ' ', q) || fold(p.handle).includes(fq)).slice(0, 6);
    sel = 0;
    if (!items.length) return close();
    list.classList.remove('hidden'); draw();
  });
  field.addEventListener('keydown', (e) => {
    if (list.classList.contains('hidden') || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopImmediatePropagation(); sel = (sel + 1) % items.length; draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); sel = (sel - 1 + items.length) % items.length; draw(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopImmediatePropagation(); pick(items[sel]); }
    else if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); }
  }, true);
  field.addEventListener('blur', () => setTimeout(close, 150));
  wrap.append(field, list);
  return wrap;
}
const HUE = { front: '#d40000', back: '#6f8fbf', creative: '#e0a33a' }; // Cast, Crew, Creatives
// looks and an actor's skills belong only to these (Alex, 4 Nov: not to the crew); everything else gets equipment and tools
const PERFORMERS = ['actor', 'model', 'dancer', 'extra'];
const PERFORMER = (kinds) => (kinds || []).some((k) => PERFORMERS.includes(k) || k === 'theatre');
const CREW = (kinds) => (kinds || []).some((k) => !PERFORMERS.includes(k) && k !== 'theatre');
const FILTERS = [['all', 'Everyone'], ['actor', 'Actors'], ['model', 'Models'], ['dancer', 'Dancers'], ['extra', 'Extras'], ['back', 'Crew'], ['creative', 'Creatives']]; // for whom a seminar is
const GENDERS = [['', '—'], ['f', 'Woman'], ['m', 'Man'], ['x', 'Other']];

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) { if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(kid)); }
  return el;
}
// replaceChildren that leaves out what is not there (a bare null used to show as the word "null", Alex 4 Nov)
// a list drawn again in place (a tap on a pill, a letter typed in a search) does not play its entrance again
const put = (el, ...kids) => {
  // a whole new page: let go of the old one's pictures at once (an iPhone keeps a removed picture decoded for a while)
  if (el.id === 'app') el.querySelectorAll('img').forEach((im) => { im.removeAttribute('srcset'); im.src = 'data:,'; });
  if (el.childElementCount && !el.firstElementChild.classList.contains('wait')) el.classList.add('still');
  el.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false));
};
// the wordmark: R O A R D I N O with O, R and DINO heavy, so the heavy letters read ORDINO (Alex, 4 Nov)
const mark = () => h('span', { class: 'rm', 'aria-label': 'Roardino' }, h('span', { class: 'a' }, 'R'), h('span', { class: 'b' }, 'O'), h('span', { class: 'a' }, 'A'), h('span', { class: 'b' }, 'RDINO'), h('i'));
function toast(msg) { const x = $('#toast'); x.textContent = msg; x.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => x.classList.remove('on'), 2200); }
const fail = (e) => { console.error(e); toast(errText(e)); };
function errText(e) {
  const m = String(e?.message || e || '');
  if (/Invalid login/i.test(m)) return t('Wrong email or password.');
  if (/Email not confirmed/i.test(m)) return t('Open the link we sent to your email first.');
  if (/already registered/i.test(m)) return t('There is already an account with this email. Sign in.');
  if (/under 18 needs/i.test(m)) return t('Under 18: the parent\'s details and consent are needed.');
  if (/consent/i.test(m)) return t('Your consent for the details is needed.');
  if (/No seats/i.test(m)) return t('No seats left.');
  if (/duplicate key/i.test(m)) return t('You have already done that.');
  return m || t('Something went wrong.');
}
const SVG = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const ICON = {
  home: SVG('<path d="M3.6 10.2 12 3.6l8.4 6.6v9.6a.7.7 0 0 1-.7.7H15v-5.6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.6H4.3a.7.7 0 0 1-.7-.7z"/>'),
  people: SVG('<circle cx="12" cy="12" r="8.6"/><path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1z"/>'),
  calls: SVG('<rect x="3" y="7.2" width="18" height="13" rx="2.2"/><path d="M8.6 7.2V5.4a1.6 1.6 0 0 1 1.6-1.6h3.6a1.6 1.6 0 0 1 1.6 1.6v1.8M3 12.6h18"/>'),
  cal: SVG('<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>'),
  user: SVG('<circle cx="12" cy="8.2" r="4.2"/><path d="M4.3 20.5a7.7 7.7 0 0 1 15.4 0"/>'),
  search: SVG('<circle cx="10.8" cy="10.8" r="7.3"/><path d="m16.2 16.2 4.6 4.6"/>'),
  down: SVG('<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>'),
  plus: SVG('<path d="M12 5v14M5 12h14"/>'),
  x: SVG('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
  heart: SVG('<path d="M12 20.2 4.4 12.8a4.9 4.9 0 0 1 0-7 4.8 4.8 0 0 1 6.9 0l.7.7.7-.7a4.8 4.8 0 0 1 6.9 0 4.9 4.9 0 0 1 0 7z"/>'),
  clap: SVG('<path d="M8 13l-2.5-2.5a1.8 1.8 0 012.5-2.5l5 5"/><path d="M10 9.5L8.5 8a1.8 1.8 0 012.5-2.5l5.5 5.5c2 2 2 5 0 7s-5 2-7 0L5 13.5a1.8 1.8 0 012.5-2.5"/><path d="M16 3l.5 2M20 6l-2 .5M19 2l-1.2 1.6"/>'),
  talk: SVG('<path d="M20.6 12.1a8.6 8.6 0 1 0-3.8 7.1l3.9 1.2-1-3.8a8.5 8.5 0 0 0 .9-4.5z"/>'),
  pic: SVG('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="9" cy="9.2" r="1.7"/><path d="m20.5 15.5-4.6-4.6-9.4 9.6"/>'),
  pin: SVG('<path d="M12 21s-6.8-6.1-6.8-11.6a6.8 6.8 0 0 1 13.6 0C18.8 14.9 12 21 12 21z"/><circle cx="12" cy="9.4" r="2.5"/>'),
  bookmark: SVG('<path d="M6 3.5h12v17.2l-6-5.6-6 5.6z"/>'),
  dots: SVG('<circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/>'),
  flag: SVG('<path d="M5.5 21V4.5M5.5 4.5h11.3a.6.6 0 0 1 .5.9l-2.2 3.7 2.2 3.7a.6.6 0 0 1-.5.9H5.5"/>'),
  unfollow: SVG('<circle cx="10" cy="8.2" r="4"/><path d="M3 20.5a7 7 0 0 1 12.6-4.2M16.5 18.5h5"/>'),
  follow: SVG('<circle cx="10" cy="8.2" r="4"/><path d="M3 20.5a7 7 0 0 1 12.6-4.2M19 15.5v6M16 18.5h6"/>'),
  check: SVG('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  link: SVG('<path d="M10.2 13.8a4.2 4.2 0 0 0 6 0l3-3a4.2 4.2 0 0 0-6-6l-1.2 1.2"/><path d="M13.8 10.2a4.2 4.2 0 0 0-6 0l-3 3a4.2 4.2 0 0 0 6 6l1.2-1.2"/>'),
  trash: SVG('<path d="M4 6.5h16M9.5 6.5V4.4a.9.9 0 0 1 .9-.9h3.2a.9.9 0 0 1 .9.9v2.1M6.2 6.5l.9 13a1.6 1.6 0 0 0 1.6 1.5h6.6a1.6 1.6 0 0 0 1.6-1.5l.9-13M10 11v5.5M14 11v5.5"/>'),
  left: SVG('<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>'),
  right: SVG('<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>'),
  play: SVG('<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M10 8.6v6.8a.6.6 0 0 0 .9.5l5.4-3.4a.6.6 0 0 0 0-1l-5.4-3.4a.6.6 0 0 0-.9.5z"/>'),
  star: SVG('<path d="m12 3.6 2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.6l-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>'),
  edit: SVG('<path d="M4 20h4.2L19.4 8.8a2.1 2.1 0 0 0 0-3L18.2 4.6a2.1 2.1 0 0 0-3 0L4 15.8z"/><path d="m13.6 6.2 4.2 4.2"/>'),
  out: SVG('<path d="M14.5 4h3.8a1.7 1.7 0 0 1 1.7 1.7v12.6a1.7 1.7 0 0 1-1.7 1.7h-3.8"/><path d="M4 12h11M10.5 7.5 15 12l-4.5 4.5"/>'),
  sliders: SVG('<path d="M4 7h9M18 7h2M4 12h3M11 12h9M4 17h11M19 17h1"/><circle cx="15.5" cy="7" r="2.2"/><circle cx="8.8" cy="12" r="2.2"/><circle cx="17" cy="17" r="2.2"/>'),
  mail: SVG('<rect x="3" y="5" width="18" height="14" rx="2.4"/><path d="m3.6 6.6 8.4 6.4 8.4-6.4"/>'),
  phone: SVG('<rect x="6.5" y="2.8" width="11" height="18.4" rx="2.6"/><path d="M10.5 17.6h3"/>'),
  insta: SVG('<rect x="3.5" y="3.5" width="17" height="17" rx="4.8"/><circle cx="12" cy="12" r="3.8"/><circle cx="16.9" cy="7.1" r=".5" fill="currentColor"/>'),
  globe: SVG('<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.3-3.6-8.6S9.6 5.8 12 3.4z"/>'),
  ticket: SVG('<path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5v2.2a2.3 2.3 0 0 0 0 4.6v2.2A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5v-2.2a2.3 2.3 0 0 0 0-4.6z"/><path d="M14.5 6v12" stroke-dasharray="1.8 2"/>'),
  send: SVG('<path d="M4.2 4h15.6a.8.8 0 0 1 .7 1.2l-7.6 14.3a.8.8 0 0 1-1.4-.1l-2.8-7.6L3.6 5.3A.8.8 0 0 1 4.2 4z"/><path d="m8.7 11.8 6.1-3.6"/>'),
  grid: SVG('<rect x="3.5" y="3.5" width="17" height="17" rx="1"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/>'),
  gear: SVG('<circle cx="12" cy="12" r="3"/><path d="M19.4 13.6a7.6 7.6 0 0 0 0-3.2l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-2.8-1.6L14 2.4h-4l-.4 2.4a7.5 7.5 0 0 0-2.8 1.6l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3.2l-2 1.5 2 3.4 2.3-.9a7.5 7.5 0 0 0 2.8 1.6l.4 2.4h4l.4-2.4a7.5 7.5 0 0 0 2.8-1.6l2.3.9 2-3.4z"/>'),
  sun: SVG('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>'),
  moon: SVG('<path d="M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2z"/>'),
  cam: SVG('<path d="M4 7.6h3.4l1.5-2.4a1 1 0 0 1 .8-.4h4.6a1 1 0 0 1 .8.4l1.5 2.4H20a1.6 1.6 0 0 1 1.6 1.6v9.3A1.6 1.6 0 0 1 20 20.1H4a1.6 1.6 0 0 1-1.6-1.6V9.2A1.6 1.6 0 0 1 4 7.6z"/><circle cx="12" cy="13.6" r="3.6"/>'),
  flip: SVG('<path d="M20 11a8 8 0 0 0-14.3-4.6M4 13a8 8 0 0 0 14.3 4.6"/><path d="M5.2 3.6v3.4h3.4M18.8 20.4V17h-3.4"/>'),
  bell: SVG('<path d="M6.2 9.4a5.8 5.8 0 0 1 11.6 0c0 5.9 2.4 7.6 2.4 7.6H3.8s2.4-1.7 2.4-7.6z"/><path d="M10 20.4a2.3 2.3 0 0 0 4 0"/>'),
  eyeoff: SVG('<path d="M3.5 3.5l17 17"/><path d="M10.4 6.1A9.6 9.6 0 0 1 12 6c5.6 0 9 6 9 6a15 15 0 0 1-2.6 3.3M6.5 7.6A15 15 0 0 0 3 12s3.4 6 9 6a9 9 0 0 0 4.4-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  rings: SVG('<circle cx="12" cy="12" r="8.6" stroke-dasharray="3.6 2.2"/><circle cx="12" cy="12" r="4.2"/>'),
  zoomin: SVG('<circle cx="10.8" cy="10.8" r="7.3"/><path d="m16.2 16.2 4.6 4.6M8 10.8h5.6M10.8 8v5.6"/>'),
  zoomout: SVG('<circle cx="10.8" cy="10.8" r="7.3"/><path d="m16.2 16.2 4.6 4.6M8 10.8h5.6"/>'),
  child: SVG('<circle cx="12" cy="7" r="3"/><path d="M7.5 20.5v-4a4.5 4.5 0 0 1 9 0v4"/>'),
};
const icon = (n) => h('span', { html: ICON[n], style: { display: 'inline-flex' } });
function age(birth) {
  if (!birth) return null;
  const b = new Date(birth), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}
function ago(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return t('now');
  if (s < 3600) return t('{n} min ago', { n: Math.floor(s / 60) });
  if (s < 86400) return t('{n} h ago', { n: Math.floor(s / 3600) });
  if (s < 7 * 86400) return t('{n} d ago', { n: Math.floor(s / 86400) });
  return new Date(iso).toLocaleDateString(LOCALE(), { day: 'numeric', month: 'short', year: s > 300 * 86400 ? 'numeric' : undefined });
}
const when = (iso, opt = {}) => new Date(iso).toLocaleString(LOCALE(), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...opt });
const shortDate = (iso) => new Date(iso).toLocaleDateString(LOCALE(), { day: 'numeric', month: 'short' });
const initials = (s) => String(s || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const kindChip = (k) => h('span', { class: 'chip', style: { '--c': HUE[SIDE[k]] || '#6f8fbf' } }, h('i'), kindName(k));
const tags = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
function ytEmbed(url) {
  const u = String(url || '');
  let m = u.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return null;
}

/* ---------- pictures and files: private bucket, signed links ---------- */
const signed = new Map(); // path -> { url, until }
async function sign(paths) {
  const need = [...new Set(paths.filter(Boolean))].filter((p) => !/^https?:/.test(p) && !(signed.get(p)?.until > Date.now()));
  for (let i = 0; i < need.length; i += 100) {
    const part = need.slice(i, i + 100);
    const { data } = await sb.storage.from(BUCKET).createSignedUrls(part, 3600);
    (data || []).forEach((d) => { if (d.signedUrl) signed.set(d.path, { url: d.signedUrl, until: Date.now() + 3300e3 }); });
  }
}
// a full address is used as it is (the sample profiles' pictures); a path in the bucket gets a signed link
const urlOf = (p) => (!p ? '' : /^https?:/.test(p) ? p : signed.get(p)?.url || '');
// videos on a phone (Alex, 5 Nov: "the site gets stuck on the phone and keeps refreshing"): an iPhone's Safari gives up and
// reloads the page when many videos play or load at once, so in the feed only the one mostly on screen plays (it loads
// nothing before it comes near), and a video in a grid gets its source only when its cell comes into sight
const vidNear = 'IntersectionObserver' in window ? new IntersectionObserver((list) => list.forEach((en) => {
  const v = en.target;
  if (en.isIntersecting && !v.src && v.dataset.src) { v.src = v.dataset.src; v.preload = 'metadata'; }
}), { rootMargin: '400px 0px' }) : null;
const vidPlay = 'IntersectionObserver' in window ? new IntersectionObserver((list) => list.forEach((en) => {
  const v = en.target;
  if (en.intersectionRatio >= 0.6) { document.querySelectorAll('video.fv').forEach((o) => { if (o !== v && !o.paused) o.pause(); }); v.play().catch(() => {}); }
  else if (!v.paused) v.pause();
}), { threshold: [0, 0.6] }) : null;
function feedVideo(src) {
  const v = h('video', { class: 'fv', playsInline: true, preload: 'none', muted: prefs.mutedVideos, loop: true });
  if (vidNear && vidPlay) { v.dataset.src = src; vidNear.observe(v); vidPlay.observe(v); } else v.src = src;
  return v;
}
function cellVideo(src) {
  const v = h('video', { muted: true, playsInline: true, preload: 'none' });
  if (vidNear) { v.dataset.src = src + '#t=0.5'; vidNear.observe(v); } else { v.src = src + '#t=0.5'; v.preload = 'metadata'; }
  return v;
}
const bg = (p) => (urlOf(p) ? { backgroundImage: `url("${urlOf(p)}")` } : {});
const avatar = (p, cls = '') => h('span', { class: 'av ' + cls, style: bg(p?.avatar) }, urlOf(p?.avatar) ? '' : initials(p?.name));
// everything that goes up is made light first (Alex, 5 Nov: "whatever people upload, photos and videos, compress it").
// A picture: long side 1440px, JPEG 0.82 (a few hundred KB; a phone's 5 MB photo looks the same in the feed).
// Anything it cannot read goes as it is.
const PIC_SIDE = 1440, PIC_Q = 0.82;
async function shrink(file) {
  if (/^video\//.test(file.type)) return shrinkVideo(file);
  if (!/^image\//.test(file.type) || /gif|svg/.test(file.type)) return file;
  try {
    const img = await createImageBitmap(file);
    const k = Math.min(1, PIC_SIDE / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    img.close?.();
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', PIC_Q));
    c.width = c.height = 0;
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch { return file; }
}
// A video: played once, out of sight, onto a canvas of at most 1080px on its long side and recorded again at about
// 2.5 Mbit/s with its sound (H.264 MP4 on iPhones and Macs, WebM elsewhere). It takes as long as the video lasts, with
// the progress in a small note. A video already light (under ~3.5 Mbit/s and 1080px) or one the browser cannot
// play or record goes as it is, so nothing is ever lost.
const VID_SIDE = 1080, VID_BPS = 2500000;
function shrinkVideo(file) {
  return new Promise((done) => {
    const keep = () => { clean(); done(file); };
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return done(file);
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.src = url; v.muted = false; v.playsInline = true; v.preload = 'auto';
    v.style.cssText = 'position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
    document.body.append(v);
    let ac = null, rec = null, timer = 0, raf = 0;
    const note = h('div', { class: 'vid-note' }, h('span', { class: 'vid-note-bar' }, h('i')), h('b', {}, t('Making the video lighter…')));
    const clean = () => { cancelAnimationFrame(raf); clearInterval(timer); try { ac?.close(); } catch { /* gone */ } v.pause(); v.remove(); note.remove(); URL.revokeObjectURL(url); };
    v.onerror = keep;
    v.onloadedmetadata = async () => {
      const W = v.videoWidth, H = v.videoHeight, dur = v.duration;
      if (!W || !H || !isFinite(dur) || !dur) return keep();
      const bps = (file.size * 8) / dur;
      if (bps < VID_BPS * 1.4 && Math.max(W, H) <= VID_SIDE) return keep();
      const k = Math.min(1, VID_SIDE / Math.max(W, H));
      const c = document.createElement('canvas');
      c.width = Math.round(W * k / 2) * 2; c.height = Math.round(H * k / 2) * 2;
      const g = c.getContext('2d');
      const stream = c.captureStream(30);
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        const src = ac.createMediaElementSource(v), dest = ac.createMediaStreamDestination();
        src.connect(dest);
        dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
      } catch { v.muted = true; }
      const type = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find((x) => MediaRecorder.isTypeSupported?.(x)) || '';
      try { rec = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), videoBitsPerSecond: VID_BPS, audioBitsPerSecond: 128000 }); } catch { return keep(); }
      const parts = [];
      rec.ondataavailable = (e) => { if (e.data?.size) parts.push(e.data); };
      rec.onstop = () => {
        const out = new Blob(parts, { type: rec.mimeType || type || 'video/mp4' });
        clean();
        const ext = /mp4/.test(out.type) ? 'mp4' : 'webm';
        done(out.size > 10000 && out.size < file.size ? new File([out], file.name.replace(/\.\w+$/, '') + '.' + ext, { type: out.type.split(';')[0] }) : file);
      };
      document.body.append(note);
      const bar = note.querySelector('i');
      const paint = () => { g.drawImage(v, 0, 0, c.width, c.height); if (!v.ended) raf = requestAnimationFrame(paint); };
      timer = setInterval(() => { bar.style.width = `${Math.min(100, (v.currentTime / dur) * 100)}%`; }, 250);
      v.onended = () => { g.drawImage(v, 0, 0, c.width, c.height); setTimeout(() => rec.state !== 'inactive' && rec.stop(), 120); };
      try { await ac?.resume(); await v.play(); } catch { return keep(); }
      rec.start(1000); paint();
    };
  });
}
/* the picture editor (Alex, 5 Nov: "every photo needs scale, resize, zoom"): before a picture goes up it opens in a
   glass window with the frame it will have; drag to move it, zoom with the slider, the wheel or two fingers, pick a
   shape where there is a choice; Use photo gives back the framed picture, Cancel nothing */
const SHAPES = {
  post: [['4:5', 4 / 5], ['1:1', 1], ['16:9', 16 / 9], ['Original', 0]],
  portrait: [['3:4', 3 / 4]],
  cover: [['3:1', 3]],
  story: [['9:16', 9 / 16]],
};
function cropImage(file, shapes = SHAPES.post) {
  return new Promise((done) => {
    if (!/^image\//.test(file.type) || /gif/.test(file.type)) return done(file);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => done(file); // a format this browser cannot draw (HEIC outside Safari): it goes as it is
    img.onload = () => {
      const W = img.naturalWidth, H = img.naturalHeight;
      let shape = shapes[0], ratio = shape[1] || W / H;
      let scale = 1, min = 1, x = 0, y = 0; // the picture's scale and its top-left inside the frame, in frame pixels
      const pic = h('img', { src: url, alt: '', draggable: false });
      const frameBox = h('div', { class: 'crop-frame' }, pic, h('span', { class: 'crop-grid' }));
      const zoom = h('input', { type: 'range', class: 'crop-zoom', min: '1', max: '4', step: '0.01', value: '1', 'aria-label': t('Zoom') });
      const fw = () => frameBox.clientWidth, fh = () => frameBox.clientHeight;
      const clamp = () => { const w = W * scale, hh = H * scale; x = Math.min(0, Math.max(fw() - w, x)); y = Math.min(0, Math.max(fh() - hh, y)); };
      const draw = () => { clamp(); pic.style.width = `${W * scale}px`; pic.style.height = `${H * scale}px`; pic.style.transform = `translate(${x}px, ${y}px)`; };
      const fit = () => {
        const maxW = Math.min(560, window.innerWidth - 80), maxH = Math.min(window.innerHeight * 0.55, 560);
        let w = maxW, hh = w / ratio; if (hh > maxH) { hh = maxH; w = hh * ratio; }
        frameBox.style.width = `${Math.round(w)}px`; frameBox.style.height = `${Math.round(hh)}px`;
        min = Math.max(w / W, hh / H); scale = min; zoom.value = '1';
        x = (w - W * scale) / 2; y = (hh - H * scale) / 2; draw();
      };
      const zoomTo = (k, cx = fw() / 2, cy = fh() / 2) => {
        const next = Math.max(min, Math.min(min * 4, k));
        x = cx - (cx - x) * (next / scale); y = cy - (cy - y) * (next / scale); scale = next; zoom.value = String(scale / min); draw();
      };
      zoom.oninput = () => zoomTo(min * +zoom.value);
      frameBox.addEventListener('wheel', (e) => { e.preventDefault(); const r = frameBox.getBoundingClientRect(); zoomTo(scale * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
      // drag with one pointer, pinch with two
      const pts = new Map(); let last = null, pinch = null;
      frameBox.addEventListener('pointerdown', (e) => { frameBox.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); last = { x: e.clientX, y: e.clientY }; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: scale }; } });
      frameBox.addEventListener('pointermove', (e) => {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; const r = frameBox.getBoundingClientRect(); zoomTo(pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); return; }
        x += e.clientX - last.x; y += e.clientY - last.y; last = { x: e.clientX, y: e.clientY }; draw();
      });
      const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; const rest = [...pts.values()][0]; last = rest || null; };
      frameBox.addEventListener('pointerup', up); frameBox.addEventListener('pointercancel', up);
      const shapeBox = h('div');
      const drawShapes = () => put(shapeBox, shapes.length > 1 ? seg(shapes.map(([k]) => [k, t(k)]), shape[0], (k) => { shape = shapes.find((z) => z[0] === k); ratio = shape[1] || W / H; drawShapes(); fit(); }) : null);
      drawShapes();
      let answered = false;
      const close = openWin(t('Frame your picture'), h('div', { class: 'crop' }, shapeBox, h('div', { class: 'crop-stage' }, frameBox),
        h('div', { class: 'crop-tools' }, h('span', { html: ICON.zoomout }), zoom, h('span', { html: ICON.zoomin }), h('button', { type: 'button', class: 'btn sm', onclick: fit }, t('Reset'))),
        h('p', { class: 'hint', style: { textAlign: 'center' } }, t('Drag to move it, zoom with the slider, the wheel or two fingers.'))),
      (c) => [h('button', { type: 'button', class: 'btn', onclick: () => { answered = true; c(); URL.revokeObjectURL(url); done(null); } }, t('Cancel')),
        h('button', { type: 'button', class: 'btn main', onclick: () => {
          // the part inside the frame, at up to 2000 pixels on its long side
          const sx = -x / scale, sy = -y / scale, sw = fw() / scale, sh = fh() / scale;
          const k = Math.min(1, 2000 / Math.max(sw, sh));
          const c2 = document.createElement('canvas'); c2.width = Math.round(sw * k); c2.height = Math.round(sh * k);
          c2.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c2.width, c2.height);
          c2.toBlob((b) => { answered = true; c(); URL.revokeObjectURL(url); done(b ? new File([b], (file.name || 'photo').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.9);
        } }, t('Use photo'))]);
      const veil = document.querySelector('.veil:last-of-type');
      veil?.classList.add('cropper');
      new MutationObserver((_, o) => { if (veil && !veil.isConnected) { o.disconnect(); if (!answered) { URL.revokeObjectURL(url); done(null); } } }).observe(document.body, { childList: true });
      requestAnimationFrame(fit);
    };
    img.src = url;
  });
}
// several pictures one after the other through the editor; videos and what cannot be drawn pass as they are
async function cropAll(list, shapes) { const out = []; for (const f of list) { const c = await cropImage(f, shapes); if (c) out.push(c); } return out; }
async function upload(personId, file, sub = '') {
  const f = await shrink(file);
  if (/^video\//.test(f.type) && f.size > MAX_VIDEO) throw new Error(t('The video is over 200 MB. Keep it to a minute or two.'));
  const ext = (f.name.match(/\.(\w+)$/) || [, 'bin'])[1].toLowerCase();
  const path = `${session.user.id}/${personId}/${sub}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, f, { contentType: f.type || undefined, upsert: false });
  if (error) throw error;
  return path;
}
const removeFiles = (paths) => { const p = paths.filter(Boolean); return p.length ? sb.storage.from(BUCKET).remove(p) : null; };

/* ---------- state ---------- */
let session = null;
let mine = [];          // my profiles
let isAdmin = false;
let follows = new Set();
let saved = new Set(); // posts I saved (Alex, 5 Nov)
const app = $('#app');
const me = () => mine.find((m) => !m.minor) || mine[0] || null; // the profile that is me (a parent's own, not a child's)

async function loadMine() {
  const { data, error } = await sb.from('roardino_people').select('*').eq('owner', session.user.id).order('created_at');
  if (error) throw error;
  mine = data || [];
  const f = await sb.from('roardino_follows').select('person_id').eq('user_id', session.user.id);
  follows = new Set((f.data || []).map((x) => x.person_id));
  const sv = await sb.from('roardino_saves').select('post_id').eq('user_id', session.user.id);
  saved = new Set((sv.data || []).map((x) => x.post_id));
  await sign(mine.flatMap((p) => [p.avatar, p.data?.cover]));
}

/* ---------- the window ---------- */
function openWin(title, body, foot) {
  const veil = h('div', { class: 'veil', onclick: (e) => { if (e.target === veil) close(); } });
  const close = () => { veil.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  // every window has its X too (Alex, 5 Nov), even though a tap outside or Esc also closes it
  veil.append(h('div', { class: 'win', role: 'dialog', 'aria-label': title }, h('div', { class: 'win-head' }, h('h2', {}, title), h('button', { type: 'button', class: 'win-x', 'aria-label': t('Close'), title: t('Close'), html: ICON.x, onclick: () => close() })), body, foot ? h('div', { class: 'foot' }, foot(close)) : null));
  document.body.append(veil);
  return close;
}
// a <label> only around a real field: around a row of pills a browser (Safari above all) passes every tap on to the
// first pill too, which kept turning "Actor" on (Alex, 5 Nov)
// a question in our own glass window, not the browser's white box (Alex, 5 Nov); resolves true for yes
function ask(question, yes = t('Delete'), danger = true) {
  return new Promise((done) => {
    let answered = false;
    const close = openWin(question, h('p', { class: 'hint', style: { fontSize: '14.5px' } }, t('This cannot be undone.')), (c) => [
      h('button', { type: 'button', class: 'btn', onclick: () => { answered = true; c(); done(false); } }, t('Cancel')),
      h('button', { type: 'button', class: 'btn main' + (danger ? ' red' : ''), onclick: () => { answered = true; c(); done(true); } }, yes)]);
    const veil = document.querySelector('.veil:last-of-type');
    veil?.classList.add('ask');
    new MutationObserver((_, o) => { if (!veil.isConnected) { o.disconnect(); if (!answered) done(false); } }).observe(document.body, { childList: true });
    void close;
  });
}
const field = (label, el, hint) => h(/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) ? 'label' : 'div', { class: 'field' }, h('span', {}, label), el, hint ? h('p', { class: 'hint' }, hint) : null);
const input = (value, extra = {}) => h('input', { class: 'input', value: value ?? '', ...extra });
const area = (value, extra = {}) => h('textarea', { class: 'textarea', ...extra }, value ?? '');
const select = (options, value, extra = {}) => h('select', { class: 'select', ...extra }, options.map(([v, s]) => h('option', { value: v, selected: v === (value ?? '') }, s)));
// a switch with the hub's glass lens (Alex, 5 Nov: "animation everywhere"): the lens remembers where it last stood for
// the same set of choices and glides from there to the chosen one, even when the page around it is drawn anew
const lensAt = new Map();
function seg(items, on, pick) {
  const key = items.map((x) => x[0]).join('|');
  const lens = h('span', { class: 'lens', 'aria-hidden': 'true' });
  const box = h('div', { class: 'seg has-lens' }, lens, items.map(([k, s]) => h('button', { type: 'button', class: on === k ? 'on' : '', onclick: (e) => {
    const b = e.currentTarget;
    lens.style.transform = `translateX(${b.offsetLeft}px)`; lens.style.width = `${b.offsetWidth}px`;
    box.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    pick(k); // at once: the redrawn switch glides from where the lens last stood
  } }, s)));
  requestAnimationFrame(() => {
    const b = box.querySelector('button.on');
    if (!b) { lens.style.opacity = '0'; return; }
    const prev = lensAt.get(key), now = { x: b.offsetLeft, w: b.offsetWidth };
    if (prev && (prev.x !== now.x || prev.w !== now.w)) {
      lens.style.transition = 'none'; lens.style.transform = `translateX(${prev.x}px)`; lens.style.width = `${prev.w}px`;
      void lens.offsetWidth; lens.style.transition = '';
    }
    lens.style.transform = `translateX(${now.x}px)`; lens.style.width = `${now.w}px`;
    lensAt.set(key, now);
  });
  return box;
}

/* ---------- the frame: top bar, bottom bar on a phone ---------- */
const NAV = [['feed', 'Feed', 'home'], ['people', 'Industry', 'people'], ['search', 'Search', 'search'], ['calls', 'Calls', 'calls'], ['seminars', 'Seminars', 'cal'], ['chat', 'Chat', 'talk']];
// the chat is RoarMe (Alex, 4 Nov): the same Roar Accounts, so it lives here in a frame
const ROARME = 'https://alexisdigipro-hub.github.io/roarme/';
function topBar(on) {
  const m = me();
  const menu = h('div', { class: 'menu hidden' });
  const fill = () => put(menu, 
    h('small', {}, session.user.email),
    m ? h('a', { href: `#/p/${m.id}` }, icon('user'), t('My profile')) : h('a', { href: '#/edit/new' }, icon('plus'), t('Create your profile')),
    m ? h('a', { href: `#/edit/${m.id}` }, icon('edit'), t('Edit my profile')) : null,
    ...mine.filter((x) => x !== m).map((x) => h('a', { href: `#/p/${x.id}` }, avatar(x, 'sm'), x.name)),
    h('a', { href: '#/edit/kid' }, icon('child'), t('Add my child\'s profile')),
    h('a', { href: '#/me' }, icon('star'), t('My applications and seats')),
    h('a', { href: '#/settings' }, icon('gear'), t('Settings')),
    h('hr'),
    h('button', { type: 'button', onclick: () => sb.auth.signOut() }, icon('out'), t('Sign out')));
  const toggle = (e) => { e.stopPropagation(); fill(); menu.classList.toggle('hidden'); if (!menu.classList.contains('hidden')) setTimeout(() => document.addEventListener('click', () => menu.classList.add('hidden'), { once: true })); };
  const find = h('input', { type: 'search', placeholder: t('Search cast, crew & creatives'), 'aria-label': t('Search cast, crew & creatives'), value: on === 'people' ? peopleQ : '', oninput: (e) => { if (location.hash === '#/people') { peopleQ = e.target.value; peopleRedraw?.(); } }, onkeydown: (e) => { if (e.key === 'Enter') { peopleQ = e.target.value; if (location.hash === '#/people') peopleRedraw?.(); else location.hash = '#/people'; } } });
  return h('header', { class: 'bar' }, h('div', { class: 'bar-in' },
    h('a', { href: '#/feed', class: 'brand', 'aria-label': 'Roardino', onclick: goHome }, mark()),
    // the menu in words, a glass capsule with the gliding lens, as Qubi's (Alex, 5 Nov); the search takes the rest
    h('nav', { class: 'words', 'aria-label': t('Menu') }, seg(NAV.filter(([k]) => k !== 'search').map(([k, s2]) => [k, k === 'feed' ? t('Home') : t(s2)]), on, (k) => { if (k === 'feed') goHome(); else location.hash = `#/${k}`; })),
    h('label', { class: 'find' }, icon('search'), find),
    h('button', { type: 'button', class: 'ico create-btn', title: t('Create'), 'aria-label': t('Create'), html: ICON.plus, onclick: createMenu }),
    bellButton(),
    h('button', { type: 'button', class: 'who-me', onclick: toggle, 'aria-label': t('Me') }, avatar(m || { name: session.user.user_metadata?.name || session.user.email }), h('span', { class: 'nm' }, m?.name || session.user.user_metadata?.name || t('Me')), icon('down')),
    h('button', { type: 'button', class: 'ico theme', title: t('Light or dark'), 'aria-label': t('Light or dark'), html: document.documentElement.dataset.theme === 'dark' ? ICON.sun : ICON.moon, onclick: (e) => { setPref('theme', document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); e.currentTarget.innerHTML = document.documentElement.dataset.theme === 'dark' ? ICON.sun : ICON.moon; } }),
    menu));
}
function tabBar(on) {
  const m = me();
  // on a phone (Alex, 5 Nov): Feed, Industry, Chat and me with my own picture; Calls and Seminars live on my profile's tiles
  return h('nav', { class: 'tabbar' }, NAV.filter(([k]) => k !== 'calls' && k !== 'seminars').map(([k, s, ic]) => h('a', { href: `#/${k}`, class: on === k ? 'on' : '', onclick: k === 'feed' ? goHome : null }, icon(ic), t(s))),
    h('a', { href: m ? `#/p/${m.id}` : '#/edit/new', class: 'tab-me' + (on === 'me' ? ' on' : '') }, m ? avatar(m, 'tab-av') : icon('user'), t('Me')));
}
// the footer (Alex, 5 Nov): Roardino by THE MAD LIONS, themadlions.com and its places
function footBar() {
  return h('footer', { class: 'foot' }, h('div', { class: 'foot-in' },
    h('span', { class: 'foot-mark' }, mark(), h('small', {}, 'by ', h('b', {}, 'THE ', h('strong', {}, 'MAD'), ' LIONS'))),
    h('span', { class: 'grow' }),
    h('nav', {},
      h('a', { href: 'https://themadlions.com/', target: '_blank', rel: 'noopener' }, 'themadlions.com'),
      h('a', { href: 'https://themadlions.com/lab/', target: '_blank', rel: 'noopener' }, t('Lab')),
      h('a', { href: '#/legal/contact' }, t('Contact')),
      h('a', { href: '#/legal/privacy' }, t('Privacy')),
      h('a', { href: '#/legal/terms' }, t('Terms'))),
    h('small', { class: 'foot-c' }, `© ${new Date().getFullYear()} The Mad Lions`)));
}
function frame(on, ...content) { put(app, topBar(on), h('main', { class: 'page' }, ...content), footBar(), tabBar(on)); window.scrollTo(0, 0); }

/* ---------- the black box (Alex, 5 Nov: the iPhone keeps reloading Home, "check it in detail") ----------
   Each step of drawing Home is written on this device as it happens. If the page dies before Home has stood for 6 s, the
   next opening knows: Home is drawn light (no stories, three posts) and a small card says where it stopped, so Alex can
   send a screenshot. The steps are kept only here, nothing is sent anywhere. */
const CRUMB_KEY = 'roardino-crumbs';
let lastRun = null;
try { lastRun = JSON.parse(localStorage.getItem(CRUMB_KEY) || 'null'); } catch { /* none */ }
const crashedBefore = !!(lastRun && lastRun.home && !lastRun.ok);
const run = { at: Date.now(), home: false, ok: false, steps: [] };
function crumb(step) {
  run.steps.push(`${((Date.now() - run.at) / 1000).toFixed(1)}s ${step}`);
  if (run.steps.length > 40) run.steps.splice(0, run.steps.length - 40);
  try { localStorage.setItem(CRUMB_KEY, JSON.stringify(run)); } catch { /* full or private */ }
}
crumb(crashedBefore ? 'start (safe mode)' : 'start');
let homeOkT = 0;
function homeStanding() { clearTimeout(homeOkT); homeOkT = setTimeout(() => { run.ok = true; crumb('home stood 6s'); }, 6000); }
function safeCard() {
  if (!crashedBefore) return null;
  const steps = (lastRun.steps || []).slice(-6);
  return h('div', { class: 'card safe-card' },
    h('b', {}, t('Roardino restarted after a problem on this phone')),
    h('p', { class: 'hint' }, t('Home is shown light for now. Last steps before it stopped:')),
    h('pre', {}, steps.join('\n')));
}

async function route() {
  document.querySelectorAll('.veil').forEach((v) => v.remove()); // a window never outlives its page
  if (location.hash.startsWith('#/legal')) return viewLegal(['terms', 'contact'].includes(location.hash.split('/')[2]) ? location.hash.split('/')[2] : 'privacy');
  if (!session) return viewFront();
  const [, a = 'feed', b] = (location.hash || '#/feed').split('/');
  try {
    if (a === 'people') return await viewPeople();
    if (a === 'search') return await viewSearch();
    if (a === 'p' && b) return await viewPerson(b);
    if (a === 'post' && b) { const { data: one } = await sb.from('roardino_posts').select('*, person:roardino_people(id,name,avatar,kinds,headline)').eq('id', b).maybeSingle(); if (!one) return await viewFeed(); await viewPerson(one.person_id); await sign([one.person?.avatar, ...(one.media || []).map((m) => m.path)]); return openPost(one, one.person); }
    if (a === 'u' && b) { const { data: u } = await sb.from('roardino_people').select('id').eq('handle', decodeURIComponent(b).toLowerCase()).maybeSingle(); return await viewPerson(u?.id || '00000000-0000-0000-0000-000000000000'); }
    if (a === 'calls') return await viewCalls();
    if (a === 'c' && b) return await viewCall(b);
    if (a === 'seminars') return await viewSeminars();
    if (a === 'me') return await viewMe();
    if (a === 'chat') return viewChat();
    if (a === 'settings') return viewSettings();
    if (a === 'edit') return await viewEdit(b || 'new');
    return await viewFeed();
  } catch (e) { fail(e); }
}
window.addEventListener('hashchange', () => { crumb('go ' + location.hash); route(); });
// windows fit what the keyboard leaves of the screen (Alex, 5 Nov: "the keyboard must not cover it"): the visible part of
// the page (visualViewport) goes into --vvh / --vvt, and the window's veil sits exactly there
(() => {
  const vv = window.visualViewport;
  if (!vv) return;
  let last = '';
  const fit = () => {
    // only when it changed: a write on every scroll restyles the whole page, and iPhones gave up under it (Alex, 5 Nov)
    const hgt = Math.round(vv.height), top = Math.round(vv.offsetTop), kb = vv.height < window.innerHeight * 0.8, key = `${hgt}/${top}/${kb}`;
    if (key === last) return; last = key;
    const r = document.documentElement.style;
    r.setProperty('--vvh', `${hgt}px`);
    r.setProperty('--vvt', `${top}px`);
    document.documentElement.classList.toggle('kb-open', kb);
  };
  vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); fit();
  // a field that gets the focus inside a window stays in sight once the keyboard is up
  document.addEventListener('focusin', (e) => { if (e.target.closest?.('.win')) setTimeout(() => e.target.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 350); });
})();
// pull down from the top to refresh, as in an app (Alex, 5 Nov): the installed web app on a phone has no pull-to-refresh of its own
(() => {
  if (!('ontouchstart' in window)) return;
  const tip = h('div', { class: 'ptr', 'aria-hidden': 'true' }, h('span', { class: 'ptr-spin' }));
  document.body.append(tip);
  let y0 = null, x0 = 0, pull = 0, busy = false;
  const atTop = () => (window.scrollY || document.documentElement.scrollTop) <= 0;
  const blocked = (el) => el.closest?.('.veil, .st-veil, .up-veil, .notes-panel, .menu, textarea, input');
  window.addEventListener('touchstart', (e) => { y0 = !busy && atTop() && e.touches.length === 1 && !blocked(e.target) ? e.touches[0].clientY : null; x0 = e.touches[0]?.clientX || 0; pull = 0; }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (y0 == null) return;
    const dx = Math.abs(e.touches[0].clientX - x0), dy = e.touches[0].clientY - y0;
    if (pull < 10 && dx > Math.abs(dy)) { y0 = null; tip.style.cssText = ''; return; } // a swipe sideways (photos, stories) is not a pull
    pull = Math.max(0, dy);
    if (pull <= 0 || !atTop()) { tip.style.cssText = ''; return; }
    const d = Math.min(90, pull * 0.5);
    tip.style.transform = `translate(-50%, ${d}px) rotate(${pull * 2}deg)`; tip.style.opacity = String(Math.min(1, pull / 120));
    tip.classList.toggle('ready', pull > 130);
  }, { passive: true });
  window.addEventListener('touchend', async () => {
    if (y0 == null) return;
    y0 = null;
    if (pull > 130 && atTop()) {
      busy = true; tip.classList.add('spin'); tip.style.transform = 'translate(-50%, 70px)'; tip.style.opacity = '1';
      feedFresh = true;
      crumb('pull to refresh');
      try { await route(); } finally { setTimeout(() => { busy = false; tip.classList.remove('spin', 'ready'); tip.style.cssText = ''; }, 350); }
    } else tip.style.cssText = '';
    pull = 0;
  });
})();

/* =====================================================================================================================
   Before sign-in
   ===================================================================================================================== */
async function viewFront() {
  document.title = 'Roardino · ' + t('The whole crew in one place');
  let mode = 'in';
  const f = { name: '', email: '', password: '' };
  const msg = h('p', { class: 'msg' });
  const say = (s, k = '') => { msg.textContent = s; msg.className = 'msg' + (k ? ' ' + k : ''); };
  const card = h('form', { class: 'auth', novalidate: true });
  const draw = () => {
    const up = mode === 'up';
    put(card, ...[
      seg([['in', t('Sign in')], ['up', t('New account')]], mode, (k) => { mode = k; say(''); draw(); }),
      up ? null : h('button', { type: 'button', class: 'btn main', onclick: () => roarAccount(say) }, t('Sign in with Roar Account')),
      up ? null : h('p', { class: 'hint', style: { textAlign: 'center' } }, t('or with email and password')),
      up ? field(t('Full name'), input(f.name, { autocomplete: 'name', oninput: (e) => { f.name = e.target.value; } })) : null,
      field(t('Email'), input(f.email, { type: 'email', autocomplete: 'email', inputmode: 'email', oninput: (e) => { f.email = e.target.value; } })),
      field(up ? t('Password (at least 6 characters)') : t('Password'), input(f.password, { type: 'password', autocomplete: up ? 'new-password' : 'current-password', oninput: (e) => { f.password = e.target.value; } })),
      h('button', { type: 'submit', class: 'btn' + (up ? ' main' : '') }, up ? t('Create account') : t('Sign in')),
      up ? null : h('button', { type: 'button', class: 'linkish', style: { alignSelf: 'center' }, onclick: forgot }, t('Forgot your password?')),
      msg,
      h('p', { class: 'hint' }, up ? t('Your account is a Roar Account: the same details sign you in to every Roar app. A parent? Make the account with your own details, then add your child\'s profile.') : t('If you have a Roar Account, sign in with the same details.'))].filter(Boolean));
  };
  async function forgot() {
    if (!f.email.trim()) return say(t('Write your email first.'), 'err');
    const { error } = await sb.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: location.origin + location.pathname });
    say(error ? errText(error) : t('We sent you an email with a link for a new password.'), error ? 'err' : 'ok');
  }
  card.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = f.email.trim();
    if (!email || !f.password) return say(t('Fill in email and password.'), 'err');
    if (mode === 'up') {
      if (!f.name.trim()) return say(t('Write your name.'), 'err');
      say(t('Creating…'));
      const { data, error } = await sb.auth.signUp({ email, password: f.password, options: { emailRedirectTo: location.origin + location.pathname, data: { name: f.name.trim() } } });
      if (error) return say(errText(error), 'err');
      if (!data.session) { mode = 'in'; draw(); say(t('Almost there: open the link we sent to {email}, then sign in.', { email }), 'ok'); }
    } else {
      say(t('Signing in…'));
      const { error } = await sb.auth.signInWithPassword({ email, password: f.password });
      if (error) say(errText(error), 'err');
    }
  });
  draw();
  const counts = h('div', { class: 'counts' });
  sb.rpc('roardino_counts').then(({ data }) => {
    if (!data) return;
    put(counts, ...[[data.people, t('profiles')], [data.calls, t('open calls')], [data.seminars, t('seminars')]].filter(([n]) => n > 0).map(([n, s]) => h('div', {}, h('b', {}, String(n)), h('small', {}, s))));
  });
  put(app, 
    h('header', { class: 'bar' }, h('div', { class: 'bar-in' }, h('span', { class: 'brand' }, mark()))),
    h('main', { class: 'front' },
      h('div', {},
        h('p', { class: 'kicker' }, t('The crew, online')),
        h('h1', { class: 'hero', html: t('Together we make <b>the work.</b>') }),
        h('p', { class: 'lede' }, t('Actors, models, dancers, directors, crews, photographers. Show your work, find your next role, find the person your shoot is missing.')),
        h('div', { class: 'chips' }, ['Actors', 'Models', 'Dancers', 'Film directors', 'DoP', 'Crew', 'Photographers', 'Casting'].map((s) => h('span', { class: 'tag' }, t(s)))),
        counts),
      card),
    h('section', { class: 'why' },
      [['Your profile, a portfolio', 'Photos, showreel, self-tape, CV. Your work as a grid, in the order you choose.'],
        ['Calls', 'Castings and crews wanted right now. Apply with one tap and they see your profile straight away.'],
        ['For children too, with a parent', 'Under 18 only from a parent\'s account, and their profiles are seen only by trusted productions.']]
        .map(([a, b], i) => h('div', {}, h('span', { class: 'no' }, '0' + (i + 1)), h('b', {}, t(a)), h('p', {}, t(b))))),
    footBar());
}

// one sign-in for every Roar app: a code, Allow on themadlions.com/account/, then this page's own session
async function roarAccount(say) {
  const FN = SB_URL + '/functions/v1/roar-connect';
  const call = async (body, token) => {
    const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY, ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error || 'HTTP ' + r.status);
    return j;
  };
  let acct = null;
  try { acct = JSON.parse(localStorage.getItem('roar-account') || 'null'); } catch { /* none */ }
  if (!(acct && acct.access_token && (acct.expires_at || 0) * 1000 > Date.now() + 30e3)) acct = null;
  const tab = acct ? null : window.open('', '_blank');
  try {
    say(t('Signing in…'));
    const start = await call({ do: 'start', app: 'roardino' });
    let allowed = false;
    if (acct) { try { await call({ do: 'allow', code: start.code }, acct.access_token); allowed = true; } catch { /* ask */ } }
    if (!allowed) {
      if (tab) tab.location.href = start.url; else window.open(start.url, '_blank');
      say(t('Press Allow on the page that opened. Code {code}', { code: start.code }));
    }
    const until = Date.now() + 10 * 60e3;
    while (Date.now() < until) {
      const a = await call({ do: 'poll', code: start.code, secret: start.secret });
      if (a.expired) break;
      if (a.token_hash) {
        const { error } = await sb.auth.verifyOtp({ type: 'magiclink', token_hash: a.token_hash });
        if (error) throw error;
        say('');
        return;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    say(t('The code expired. Press Sign in with Roar Account again.'), 'err');
  } catch (e) { try { if (tab && !tab.closed) tab.close(); } catch { /* gone */ } say(errText(e), 'err'); }
}

/* =====================================================================================================================
   Home: my card, the feed, what is coming
   ===================================================================================================================== */
// Everyone or Following, remembered by the account (Alex, 5 Nov): kept in the Roar Account's own data, so every
// device opens the feed the way it was left; this device's copy answers at once
let feedOnly = (() => { try { return localStorage.getItem('roardino-feed') || 'all'; } catch { return 'all'; } })();
function setFeedOnly(k) {
  feedOnly = k;
  try { localStorage.setItem('roardino-feed', k); } catch { /* private window */ }
  if (session?.user?.user_metadata?.roardino_feed !== k) sb.auth.updateUser?.({ data: { roardino_feed: k } }).then(({ data }) => { if (data?.user) session.user = data.user; }).catch(() => {});
}
/* ---------- posts I have seen (Alex, 5 Nov: "on refresh, the posts you have seen do not show again") ----------
   A post counts as seen once half of it has been on screen for 0.8 s; kept on this device. A fresh feed (opening the app,
   pulling down, Home) leaves the seen ones out and offers them after "You're all caught up"; a feed drawn again for a like or
   a follow keeps what it showed, so nothing jumps away under the finger. */
let seenPosts = new Set();
try { seenPosts = new Set(JSON.parse(localStorage.getItem('roardino-seen-posts') || '[]')); } catch { /* none */ }
let feedFresh = true, feedKeep = new Set(), showOlder = false;
const keepSeen = () => { try { localStorage.setItem('roardino-seen-posts', JSON.stringify([...seenPosts].slice(-3000))); } catch { /* full */ } };
const seenWatch = 'IntersectionObserver' in window ? new IntersectionObserver((list) => list.forEach((en) => {
  const el = en.target;
  if (en.isIntersecting) el._seenT ||= setTimeout(() => { seenPosts.add(el.dataset.post); keepSeen(); seenWatch.unobserve(el); }, 800);
  else { clearTimeout(el._seenT); el._seenT = null; }
}), { threshold: 0.5 }) : null;
// Home: to the top of a fresh feed, from anywhere
function goHome(e) {
  e?.preventDefault?.();
  crumb('home tapped');
  feedFresh = true; showOlder = false;
  if (location.hash === '#/feed' || location.hash === '' || location.hash === '#/') { window.scrollTo({ top: 0, behavior: 'smooth' }); viewFeed(); }
  else location.hash = '#/feed';
}
async function viewFeed() {
  document.title = 'Roardino';
  run.home = true; run.ok = false; crumb('home: draw shell');
  // Home already on screen (a refresh, Show older, Everyone / Following): the new posts replace the old ones in place,
  // the bars stay; only a first visit draws the page (Alex, 5 Nov: the iPhone died redrawing it all)
  let mid = app.querySelector('main.page .mid.feed-mid');
  if (!mid) {
    const left = h('aside', { class: 'side left' }, meCard(), me() ? null : meTiles());
    // while the posts come: soft grey shapes of a post, not an empty page (Alex, 5 Nov: "the menu sits in the middle at the start")
    mid = h('div', { class: 'mid feed-mid' }, h('div', { class: 'wait feed-skel', 'aria-label': t('Loading…') }, [0, 1].map(() => h('div', { class: 'sk-post' }, h('div', { class: 'sk-head' }, h('i', { class: 'sk-av' }), h('i', { class: 'sk-line' })), h('div', { class: 'sk-pic' })))));
    // two columns (Alex, 4 Nov): my card with the week and the calls under it on the left, the work wide on the right
    put(app, topBar('feed'), h('main', { class: 'page' }, h('div', { class: 'two' }, left, mid)), footBar(), tabBar('feed'));
    window.scrollTo(0, 0);
  } else crumb('home: refresh in place');
  const [people, calls, seminars, stories] = await Promise.all([
    sb.from('roardino_people').select('id,name,avatar,kinds').eq('visible', true).order('updated_at', { ascending: false }).limit(30),
    sb.from('roardino_calls').select('*').eq('open', true).order('created_at', { ascending: false }).limit(30),
    sb.from('roardino_seminars').select('*').order('starts_at', { ascending: true, nullsFirst: false }).limit(30),
    loadStories()]);
  crumb('home: data');
  const others = (people.data || []).filter((p) => !mine.some((m) => m.id === p.id) && !follows.has(p.id)).slice(0, 14);
  await sign(others.map((p) => p.avatar));
  // the week and the calls under my card are out for now (Alex, 5 Nov: "not yet, take them out"); weekCard and
  // callsForMe stay here for when they come back
  void weekCard; void callsForMe;

  let q = sb.from('roardino_posts').select('*, person:roardino_people(id,name,avatar,kinds,headline)').order('created_at', { ascending: false }).limit(40);
  if (feedOnly === 'follow') q = q.in('person_id', [...follows, ...mine.map((m) => m.id), '00000000-0000-0000-0000-000000000000']);
  const { data: all, error } = await q;
  if (error) throw error;
  if (feedFresh) { feedKeep = new Set(); feedFresh = false; showOlder = false; }
  const isNew = (r) => prefs.showSeen || !seenPosts.has(r.id) || feedKeep.has(r.id);
  const fresh = all.filter(isNew), older = all.filter((r) => !isNew(r));
  const data = showOlder ? [...fresh, ...older] : fresh;
  feedKeep = new Set(data.map((r) => r.id));
  const caught = older.length && !showOlder ? h('div', { class: 'caught card' }, h('span', { class: 'caught-ic', html: ICON.check }), h('b', {}, t('You\'re all caught up')),
    h('p', { class: 'hint' }, fresh.length ? t('You have seen the posts of the last days.') : t('Nothing new since you last looked.')),
    h('button', { type: 'button', class: 'btn sm', onclick: () => { showOlder = true; viewFeed(); } }, t('Show older posts'))) : null;
  crumb(`home: ${data.length} posts to draw`);
  const cards = data.length ? await posts(data, () => viewFeed()) : older.length ? [] : [h('div', { class: 'empty' }, h('b', {}, feedOnly === 'follow' ? t('Nobody to show yet') : t('Nothing here yet')), feedOnly === 'follow' ? t('Follow people from People and their work shows here.') : t('Post your first work.'))];
  // calls ride in the feed, one after every three posts, as Alex's reference shows a job among the posts
  const openCalls = (calls.data || []).slice(0, 6);
  const stream = [];
  cards.forEach((c, i) => { stream.push(c); if (prefs.feedCalls && i % 3 === 2 && openCalls.length) stream.push(callTile(openCalls.shift())); });
  if (prefs.feedCalls && stream.length < 4) openCalls.slice(0, 2).forEach((c) => stream.push(callTile(c)));
  crumb('home: cards built');
  // on a phone the posts come a few at a time, the next ones as the end comes near (Alex, 5 Nov: the iPhone reloaded
  // Home); after a crash, light: no stories and three posts
  const phone = isPhone();
  const firstN = crashedBefore ? 3 : phone ? 5 : stream.length;
  const later = stream.splice(firstN);
  const more = later.length ? h('div', { class: 'feed-more' }) : null;
  if (more) {
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((en) => {
      if (!en.some((e) => e.isIntersecting)) return;
      const next = later.splice(0, crashedBefore ? 3 : 5);
      crumb(`home: +${next.length} posts`);
      more.before(...next);
      next.forEach((el) => { if (seenWatch && el.dataset?.post && !seenPosts.has(el.dataset.post)) seenWatch.observe(el); });
      if (!later.length) { io.disconnect(); more.remove(); return; }
      io.unobserve(more); requestAnimationFrame(() => io.observe(more)); // still near the end: look again
    }, { rootMargin: crashedBefore ? '0px' : '700px 0px' }) : null;
    if (io) requestAnimationFrame(() => io.observe(more)); else { stream.push(...later); later.length = 0; }
  }
  mid.querySelectorAll('img').forEach((im) => { im.src = 'data:,'; });
  put(mid, safeCard(),
    crashedBefore ? null : storiesCard(stories, others),
    // the composer waits behind New post, on the line of Everyone / Following (Alex, 5 Nov), and opens as a glass window
    h('div', { class: 'head feed-head' }, seg([['all', t('Everyone')], ['follow', t('Following')]], feedOnly, (k) => { setFeedOnly(k); viewFeed(); }), h('span', { class: 'grow' }),
      // stories on or off, a small square next to New post (Alex, 5 Nov)
      h('button', { type: 'button', class: 'btn st-toggle' + (prefs.showStories ? ' on' : ''), title: prefs.showStories ? t('Hide stories') : t('Show stories'), 'aria-label': prefs.showStories ? t('Hide stories') : t('Show stories'), html: ICON.rings + `<span>${esc(t('Stories'))}</span>`, onclick: () => { setShowStories(!prefs.showStories); toast(prefs.showStories ? t('Stories on') : t('Stories hidden')); viewFeed(); } }),
      mine.length ? h('button', { type: 'button', class: 'btn main new-post', title: t('New post'), 'aria-label': t('New post'), onclick: () => composeWin('work') }, icon('plus'), h('span', {}, t('New post'))) : null),
    ...stream, more, later.length ? null : caught);
  if (more && caught) more.after(caught);
  crumb('home: on screen');
  if (seenWatch) mid.querySelectorAll('.post[data-post]').forEach((el) => { if (!seenPosts.has(el.dataset.post)) seenWatch.observe(el); });
  // how the pictures arrive
  const imgs = [...mid.querySelectorAll('img')]; let loaded = 0;
  imgs.forEach((im) => im.addEventListener('load', () => { loaded += 1; if (loaded === imgs.length || loaded % 3 === 0) crumb(`home: pictures ${loaded}/${imgs.length}`); }, { once: true }));
  homeStanding();
}

// my card, left: who I am, my numbers, my skills, my latest work
function meCard() {
  const m = me();
  if (!m) {
    return h('section', { class: 'card me-card' }, h('div', { class: 'me-cover' }),
      h('div', { class: 'me-in', style: { marginTop: '16px' } },
        h('h3', {}, t('Make your profile')),
        h('p', { class: 'hint', style: { marginBottom: '14px' } }, t('To post your work, apply to calls and be found, you need a profile. It takes two minutes.')),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
          h('a', { class: 'btn main', href: '#/edit/new' }, icon('plus'), t('Create your profile')),
          h('a', { class: 'btn', href: '#/edit/kid' }, icon('child'), t('My child\'s profile')))));
  }
  const stats = h('div', { class: 'me-stats' }, h('button', { type: 'button', class: 'stat-btn', onclick: () => peopleList(m, 'followers') }, h('b', {}, '·'), h('small', {}, t('Followers'))), h('button', { type: 'button', class: 'stat-btn', onclick: () => peopleList(m, 'following') }, h('b', {}, String(follows.size)), h('small', {}, t('Following'))), h('a', { class: 'stat-btn', href: `#/p/${m.id}` }, h('b', {}, '·'), h('small', {}, t('Works'))));
  // the card stays small (Alex, 5 Nov): who I am, my numbers, View my profile; skills and work live on the profile
  (async () => {
    const { data: st } = await sb.rpc('roardino_person_stats', { p: m.id });
    if (st) { stats.children[0].firstChild.textContent = String(st.followers); stats.children[2].firstChild.textContent = String(st.posts); }
  })();
  return [h('section', { class: 'card me-card small' },
    coverOf(m, true),
    h('a', { class: 'me-top', href: `#/p/${m.id}` }, avatar(m, 'lg'), h('div', {}, h('b', {}, m.name), h('small', {}, m.headline || (m.kinds || []).map(kindName).slice(0, 2).join(' · ')))),
    stats,
    h('div', { class: 'me-in', style: { marginTop: '16px' } },
      h('a', { class: 'btn main', href: `#/p/${m.id}` }, icon('user'), t('View my profile')))), meTiles()];
}
// the cover over a profile (Alex, 5 Nov: "can I put something of my own?"): a picture of the person's choosing, else
// the standard lines; on my own card a camera button changes it there and then
function coverOf(p, editable = false) {
  const cov = p?.data?.cover;
  const y = p?.data?.coverY ?? 50; // where the picture sits up or down in the banner, kept with the profile
  const box = h('div', { class: 'me-cover' + (cov && urlOf(cov) ? ' pic' : ''), style: cov ? { ...bg(cov), backgroundPosition: `center ${y}%` } : {} });
  if (editable && p) {
    const pick = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => { const f = e.target.files[0]; e.target.value = ''; const c = f && await cropImage(f, SHAPES.cover); if (c) await setCover(p, c); } });
    // the camera asks first (Alex, 5 Nov): move the picture up or down, or put another one, or take it away
    const menu = () => {
      if (!cov) return pick.click();
      let close;
      const row = (ic, label, fn, cls = '') => h('button', { type: 'button', class: 'pm-row ' + cls, onclick: () => { close(); fn(); } }, h('span', { class: 'pm-ic', html: ICON[ic] }), label);
      close = openWin(t('Cover'), h('div', { class: 'pm' }, h('div', { class: 'pm-group' },
        row('sliders', t('Reposition'), () => reposition()),
        row('pic', t('Change photo'), () => pick.click()),
        row('trash', t('Remove'), async () => { if (await ask(t('Remove the cover?'), t('Remove'))) setCover(p, null); }, 'red'))), null);
    };
    // drag the picture up or down inside the banner, then Save
    const reposition = () => {
      let cur = y, startY = 0, startPos = 0, dragging = false;
      box.classList.add('repos');
      const hint = h('div', { class: 'repos-hint' }, h('span', { html: ICON.sliders }), t('Drag to move the picture'));
      const bar = h('div', { class: 'repos-bar' },
        h('button', { type: 'button', class: 'btn sm', onclick: (e) => { e.stopPropagation(); done(false); } }, t('Cancel')),
        h('button', { type: 'button', class: 'btn sm main', onclick: (e) => { e.stopPropagation(); done(true); } }, t('Save')));
      box.append(hint, bar);
      const down = (e) => { if (e.target.closest('.repos-bar')) return; dragging = true; startY = e.clientY; startPos = cur; box.setPointerCapture?.(e.pointerId); e.preventDefault(); };
      const move = (e) => { if (!dragging) return; const hgt = box.clientHeight || 1; cur = Math.max(0, Math.min(100, startPos - ((e.clientY - startY) / hgt) * 100)); box.style.backgroundPosition = `center ${cur}%`; };
      const up = () => { dragging = false; };
      box.addEventListener('pointerdown', down); box.addEventListener('pointermove', move); box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
      async function done(save) {
        box.removeEventListener('pointerdown', down); box.removeEventListener('pointermove', move); box.removeEventListener('pointerup', up); box.removeEventListener('pointercancel', up);
        hint.remove(); bar.remove(); box.classList.remove('repos');
        if (!save) { box.style.backgroundPosition = `center ${y}%`; return; }
        const data = { ...(p.data || {}), coverY: Math.round(cur) };
        const { error } = await sb.from('roardino_people').update({ data }).eq('id', p.id);
        if (error) return fail(error);
        p.data = data; await loadMine(); toast(t('Cover moved'));
      }
    };
    box.append(pick, h('button', { type: 'button', class: 'cov-btn', title: t('Change the cover'), 'aria-label': t('Change the cover'), html: ICON.cam, onclick: (e) => { e.preventDefault(); e.stopPropagation(); menu(); } }));
  }
  return box;
}
async function setCover(p, file) {
  try {
    toast(t('Uploading…'));
    const path = file ? await upload(p.id, file, 'cover/') : null;
    const old = p.data?.cover;
    const data = { ...(p.data || {}), cover: path, coverY: 50 };
    const { error } = await sb.from('roardino_people').update({ data }).eq('id', p.id);
    if (error) throw error;
    if (old && !/^https?:/.test(old)) removeFiles([old]);
    await loadMine();
    toast(path ? t('Cover changed') : t('Cover removed'));
    route();
  } catch (e) { fail(e); }
}
// my things as small glass tiles under my card (Alex, 5 Nov: the name menu and light / dark move here from the top bar)
function meTiles() {
  // one row of round glass icons; the word shows in a small glass label on hover (Alex, 5 Nov: "only the icons, one row")
  const m = me();
  const dark = () => document.documentElement.dataset.theme === 'dark';
  const inner = (ic, label) => [h('span', { class: 'ic', html: ICON[ic] }), h('span', { class: 'tip' }, label)];
  const themeTile = h('button', { type: 'button', class: 'btn main mt no-phone' });
  const drawTheme = () => { const l = dark() ? t('Light') : t('Dark'); themeTile.setAttribute('aria-label', l); put(themeTile, ...inner(dark() ? 'sun' : 'moon', l)); };
  themeTile.onclick = () => { setPref('theme', dark() ? 'light' : 'dark'); drawTheme(); };
  drawTheme();
  const tile = (href, ic, label) => h('a', { class: 'btn main mt', href, 'aria-label': label }, ...inner(ic, label));
  const noPhone = (el) => { el.classList.add('no-phone'); return el; };
  const phoneTile = (href, ic, label) => h('a', { class: 'btn main mt phone-only', href, 'aria-label': label }, ...inner(ic, label));
  return h('section', { class: 'card me-tiles' },
    m ? noPhone(tile(`#/edit/${m.id}`, 'edit', t('Edit'))) : tile('#/edit/new', 'plus', t('Profile')),
    themeTile,
    tile('#/settings', 'gear', t('Settings')),
    phoneTile('#/calls', 'calls', t('Calls')),
    phoneTile('#/seminars', 'cal', t('Seminars')),
    tile('#/me', 'star', t('Applied')),
    tile('#/edit/kid', 'child', t('Child')),
    h('button', { type: 'button', class: 'btn main mt out', 'aria-label': t('Sign out'), onclick: () => sb.auth.signOut() }, ...inner('out', t('Sign out'))));
}

// the week, with dots for seminars and calls that close, and what comes next
function weekCard(calls, seminars) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const items = [
    ...seminars.filter((s) => s.starts_at && new Date(s.starts_at) >= now).map((s) => ({ at: new Date(s.starts_at), title: s.title, sub: [s.kind === 'online' ? t('Online') : t('In person'), new Date(s.starts_at).toLocaleTimeString(LOCALE(), { hour: '2-digit', minute: '2-digit' })].join(' · '), c: '#6f8fbf', href: '#/seminars' })),
    ...calls.filter((c) => c.closes && new Date(c.closes) >= now).map((c) => ({ at: new Date(c.closes), title: c.title, sub: t('Applications close'), c: '#d40000', href: `#/c/${c.id}` })),
  ].sort((a, b) => a.at - b.at);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  return h('section', { class: 'card' },
    h('div', { class: 'cal-head' }, h('b', {}, now.toLocaleDateString(LOCALE(), { month: 'long', year: 'numeric' }))),
    h('div', { class: 'week' }, Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const dots = items.filter((x) => sameDay(x.at, d)).slice(0, 3);
      return h('div', { class: sameDay(d, now) ? 'today' : '' }, d.toLocaleDateString(LOCALE(), { weekday: 'short' }), h('b', {}, String(d.getDate())), h('i', {}, dots.map((x) => h('em', { style: { '--c': x.c } }))));
    })),
    h('hr'),
    h('h3', {}, t('Coming up'), h('a', { href: '#/seminars' }, t('All'))),
    items.length ? h('div', { class: 'up' }, items.slice(0, 4).map((x) => h('a', { href: x.href },
      h('span', { class: 'd' }, x.at.toLocaleDateString(LOCALE(), { weekday: 'short' }), h('b', {}, String(x.at.getDate()))),
      h('span', { class: 'e', style: { '--c': x.c } }, h('b', {}, x.title), h('small', {}, x.sub))))) : h('p', { class: 'hint' }, t('Nothing planned yet.')));
}
function callsForMe(calls) {
  const kinds = new Set(mine.flatMap((m) => m.kinds || []));
  const fit = calls.filter((c) => (c.wanted || []).some((k) => kinds.has(k)));
  const list = (fit.length ? fit : calls).slice(0, 4);
  return h('section', { class: 'card' },
    h('h3', {}, fit.length ? t('Calls for you') : t('Latest calls'), h('a', { href: '#/calls' }, t('All'))),
    list.length ? h('div', { class: 'list-mini' }, list.map((c) => h('a', { href: `#/c/${c.id}` }, h('span', { class: 'sq', html: ICON.calls }), h('div', {}, h('b', {}, c.title), h('small', {}, [c.city, c.pay].filter(Boolean).join(' · ') || t('Open')))))) : h('p', { class: 'hint' }, t('No open calls yet.')),
    h('div', { style: { marginTop: '14px' } }, h('a', { class: 'btn sm', href: '#/calls' }, icon('plus'), t('Post a call'))));
}

// write a post: words and up to 6 pictures or videos, as one of my profiles
function composer(done, kind0 = 'work', asId = null) {
  let as = asId || me().id;
  let kind = kind0; // Alex, 5 Nov: every upload says what it is, Work (My Work) or My photo (My Photos)
  const kindBox = h('div');
  const drawKind = () => put(kindBox, seg([['work', t('Work')], ['photo', t('My photo')]], kind, (k) => { kind = k; drawKind(); }));
  drawKind();
  const files = [];
  const text = area('', { placeholder: t('What did you shoot, what are you preparing, what are you looking for? Tag people with @'), rows: 2 });
  const prev = h('div', { class: 'thumbs' });
  const pick = h('input', { type: 'file', accept: 'image/*,video/*', multiple: true, hidden: true, onchange: async (e) => { const list = [...e.target.files].slice(0, 6 - files.length); e.target.value = ''; for (const f of await cropAll(list, SHAPES.post)) files.push(f); draw(); } });
  const draw = () => put(prev, ...files.map((f, i) => h('div', { class: 'thumb', style: /^image/.test(f.type) ? { backgroundImage: `url("${URL.createObjectURL(f)}")` } : {} },
    /^video/.test(f.type) ? h('span', { class: 'star' }, t('Video')) : null,
    h('button', { type: 'button', class: 'x', html: ICON.x, 'aria-label': t('Remove'), onclick: () => { files.splice(i, 1); draw(); } }))));
  const postFace = () => [icon('send'), h('span', { class: 'lbl' }, t('Post'))];
  const btn = h('button', { type: 'button', class: 'btn main c-post', title: t('Post'), 'aria-label': t('Post'), onclick: send }, ...postFace());
  async function send() {
    if (!text.value.trim() && !files.length) return toast(t('Write something or add a photo.'));
    btn.disabled = true; btn.classList.add('busy'); btn.textContent = t('Uploading…');
    try {
      const media = [];
      for (const f of files) media.push({ path: await upload(as, f, 'posts/'), type: /^video/.test(f.type) ? 'video' : 'image' });
      const { error } = await sb.from('roardino_posts').insert({ person_id: as, body: text.value.trim() || null, media, kind });
      if (error) throw error;
      toast(t('Posted'));
      done();
    } catch (e) { fail(e); btn.disabled = false; btn.classList.remove('busy'); put(btn, ...postFace()); }
  }
  return h('div', { class: 'compose' },
    h('div', { class: 'c-top' }, avatar(me()), withMentions(text)),
    prev,
    h('div', { class: 'acts' },
      h('button', { type: 'button', class: 'btn sm c-pic', title: t('Photo / video'), 'aria-label': t('Photo / video'), onclick: () => pick.click() }, icon('pic'), h('span', { class: 'lbl' }, t('Photo / video'))), pick, kindBox,
      mine.length > 1 ? select(mine.map((m) => [m.id, t('as {name}', { name: m.name })]), as, { style: { width: 'auto', height: '34px', padding: '0 14px' }, onchange: (e) => { as = e.target.value; } }) : null,
      h('span', { style: { flex: 1 } }), btn));
}

// the composer in a glass window (New post on the feed, Add work / Add photo on my profile)
// the + on top of a phone, left (Alex, 5 Nov, as Instagram's): one place to make anything
function createMenu() {
  const m = me();
  if (!m) { location.hash = '#/edit/new'; return; }
  let close;
  const pick = h('input', { type: 'file', accept: 'image/*,video/*', hidden: true, onchange: async (e) => { const f0 = e.target.files[0]; e.target.value = ''; const f = f0 && (/^video/.test(f0.type) ? f0 : await cropImage(f0, SHAPES.story)); const ed = f && await storyEditor(f); if (ed) await addStory(ed.file, ed.overlays); } });
  const tile = (ic, label, sub, fn) => h('button', { type: 'button', class: 'pm-tile cr-tile', onclick: () => { close(); fn(); } }, h('span', { class: 'pm-ic', html: ICON[ic] }), h('b', {}, label), h('small', {}, sub));
  close = openWin(t('Create'), h('div', { class: 'pm' }, h('div', { class: 'pm-tiles' },
    tile('grid', t('Work'), t('A post of your work'), () => composeWin('work', m.id, () => route())),
    tile('pic', t('My photo'), t('A photo of you'), () => composeWin('photo', m.id, () => route())),
    tile('rings', t('Story'), t('For 24 hours'), () => storySource(pick)),
    tile('calls', t('Call'), t('Casting or crew'), () => { location.hash = '#/calls'; setTimeout(() => editCall(), 400); })), pick), null);
}
function composeWin(kind = 'work', asId = null, after = () => viewFeed()) {
  let close = null;
  const c = composer(() => { close?.(); after(); }, kind, asId);
  close = openWin(kind === 'photo' ? t('Add a photo') : t('New post'), c);
  c.querySelector('textarea')?.focus();
}
// posts as cards: who, words, pictures, Bravo and comments
async function posts(rows, refresh) {
  const ids = rows.map((r) => r.id);
  const [b, c] = await Promise.all([
    sb.from('roardino_bravos').select('post_id,user_id').in('post_id', ids),
    sb.from('roardino_comments').select('post_id').in('post_id', ids)]);
  const bravos = {}, mineB = new Set(), comments = {};
  (b.data || []).forEach((x) => { bravos[x.post_id] = (bravos[x.post_id] || 0) + 1; if (x.user_id === session.user.id) mineB.add(x.post_id); });
  (c.data || []).forEach((x) => { comments[x.post_id] = (comments[x.post_id] || 0) + 1; });
  await sign(rows.flatMap((r) => [r.person?.avatar, ...(r.media || []).map((m) => m.path)]));
  return rows.map((r) => postCard(r, { bravos: bravos[r.id] || 0, mine: mineB.has(r.id), comments: comments[r.id] || 0 }, refresh));
}
// a post as Instagram shows one (Alex, 4 Nov: "more Instagram"): who, the picture edge to edge (swipe when there are
// several), icons, the bravos, the caption under the name, the comments behind a line, the time
// the arrow under a post: send it to people on RoarMe (Alex, 5 Nov). Same Roar Account, same database: my recent chats
// first, then anyone found by name or @username; each gets a message with a link that opens this post
async function sendToRoarMe(r, p) {
  const meId = session.user.id;
  const url = `${location.origin}${location.pathname}#/post/${r.id}`;
  const picked = new Map(); // key -> { kind: 'room' | 'user', id, name, avatar }
  const list = h('div', { class: 'stm-list' }, h('p', { class: 'wait' }, t('Loading…')));
  const note = h('input', { class: 'input', placeholder: t('Write a message…'), maxlength: 500 });
  const sendBtn = h('button', { type: 'button', class: 'btn main', disabled: true }, icon('send'), t('Send'));
  const avOf = (x) => (x.avatar && /^https?:/.test(x.avatar) ? { name: x.name, avatar: x.avatar } : { name: x.name });
  let recent = [], everyone = null;
  const row = (x) => h('button', { type: 'button', class: 'stm-row' + (picked.has(x.key) ? ' on' : ''), onclick: () => { if (picked.has(x.key)) picked.delete(x.key); else picked.set(x.key, x); sendBtn.disabled = !picked.size; draw(found); } },
    avatar(avOf(x)), h('span', { class: 'stm-who' }, h('b', {}, x.name, x.rm ? h('em', { class: 'rm-badge' }, 'RoarMe') : null), x.sub ? h('small', {}, x.sub) : null), h('span', { class: 'stm-tick', html: ICON.check }));
  let found = null;
  // Roardino's people first, then whoever is only on RoarMe, marked so (Alex, 5 Nov)
  let rdPeople = [], rdFollow = [];
  const sec = (label, rows) => (rows.length ? [h('p', { class: 'stm-sec' }, label), ...rows.map(row)] : []);
  const draw = (res) => {
    const a = res ? res.rd : rdFollow, b = res ? res.rm : recent;
    put(list, ...sec(t('On Roardino'), a), ...sec(t('On RoarMe'), b), !a.length && !b.length ? h('p', { class: 'hint' }, res ? t('Nobody by that name.') : t('Search for someone above.')) : null);
  };
  const search = h('input', { class: 'input', type: 'search', placeholder: t('Search people'), oninput: async (e) => {
    const q = e.target.value.trim();
    if (!q) { found = null; return draw(); }
    const rd = rdPeople.filter((x) => matches(x._k, q)).slice(0, 15);
    // RoarMe's people read once, then found the Roardino way: Greek, Greeklish, with or without accents
    everyone ||= ((await sb.from('roar_profiles').select('id,username,display_name,avatar_url').neq('id', meId).limit(2000)).data || []).map((u) => ({ ...u, _k: ' ' + fold(`${u.display_name} ${u.username.replace(/_/g, ' ')} ${u.username}`) + ' ' }));
    if (e.target.value.trim() !== q) return;
    const onRd = new Set(rdPeople.map((x) => x.id));
    const data = everyone.filter((u) => !onRd.has(u.id) && matches(u._k, q)).slice(0, 15);
    found = { rd, rm: data.map((u) => ({ key: 'u:' + u.id, kind: 'user', id: u.id, name: u.display_name || u.username, sub: '@' + u.username, avatar: u.avatar_url, rm: true })) };
    draw(found);
  } });
  const close = openWin(t('Send'), h('div', { class: 'stm' }, search, list, note), (c) => [h('button', { type: 'button', class: 'btn', onclick: c }, t('Cancel')), sendBtn]);
  sendBtn.onclick = async () => {
    sendBtn.disabled = true;
    const text = (note.value.trim() ? note.value.trim() + '\n' : '') + `${p.name || 'Roardino'} · ${url}`;
    let ok = 0;
    for (const x of picked.values()) {
      try {
        let room = x.kind === 'room' ? x.id : null;
        if (!room) { const { data, error } = await sb.rpc('roar_open_direct', { other: x.id }); if (error) throw error; room = typeof data === 'string' ? data : data?.id || data; }
        const { error } = await sb.from('roar_messages').insert({ room_id: room, user_id: meId, body: text });
        if (error) throw error;
        ok++;
      } catch (e) { console.warn('send to RoarMe', e); }
    }
    close();
    toast(ok ? (ok === 1 ? t('Sent on RoarMe') : t('Sent to {n} chats on RoarMe', { n: ok })) : t('Could not send. Try again.'));
  };
  // Roardino's people (one row per account, its adult profile), the ones I follow shown before any search
  try {
    const { data: ppl } = await sb.from('roardino_people').select('id,name,handle,avatar,kinds,owner,minor').eq('visible', true).eq('minor', false).neq('owner', meId).order('created_at').limit(1500);
    const seen = new Set();
    await sign((ppl || []).map((x) => x.avatar));
    rdPeople = (ppl || []).filter((x) => !seen.has(x.owner) && seen.add(x.owner)).map((x) => ({ key: 'u:' + x.owner, kind: 'user', id: x.owner, pid: x.id, name: x.name, sub: x.handle ? '@' + x.handle : (x.kinds || []).map(kindName).slice(0, 2).join(' · '), avatar: urlOf(x.avatar) || '', _k: ' ' + fold(`${x.name} ${x.handle || ''}`) + ' ' }));
    rdFollow = rdPeople.filter((x) => follows.has(x.pid)).slice(0, 20);
  } catch (e) { console.warn('Roardino people', e); }
  // my chats, newest first: a direct chat shows the other person, a group its name
  try {
    const { data: mem } = await sb.from('roar_members').select('room_id, archived, room:roar_rooms(id,kind,title,avatar_url,last_message_at)').eq('user_id', meId).limit(200);
    const rooms = (mem || []).filter((m) => m.room && !m.archived).sort((a, b) => String(b.room.last_message_at).localeCompare(String(a.room.last_message_at))).slice(0, 30);
    const directIds = rooms.filter((m) => m.room.kind === 'direct').map((m) => m.room_id);
    const others = directIds.length ? (await sb.from('roar_members').select('room_id,user_id').in('room_id', directIds).neq('user_id', meId)).data || [] : [];
    const profIds = [...new Set(others.map((o) => o.user_id))];
    const profs = profIds.length ? (await sb.from('roar_profiles').select('id,username,display_name,avatar_url').in('id', profIds)).data || [] : [];
    recent = rooms.map((m) => {
      if (m.room.kind === 'group') return { key: 'r:' + m.room_id, kind: 'room', id: m.room_id, name: m.room.title || t('Group'), sub: t('Group'), avatar: m.room.avatar_url };
      const o = others.find((x) => x.room_id === m.room_id); const pr = profs.find((x) => x.id === o?.user_id);
      return pr && !rdPeople.some((x) => x.id === pr.id) ? { key: 'r:' + m.room_id, kind: 'room', id: m.room_id, name: pr.display_name || pr.username, sub: '@' + pr.username, avatar: pr.avatar_url, rm: true } : null;
    }).filter(Boolean);
  } catch (e) { console.warn('RoarMe chats', e); }
  draw();
}
const isPhone = () => window.matchMedia('(max-width:820px)').matches;
// who is behind a number (Alex, 5 Nov: "tap followers / following to see who they are"): followers, following, likes
async function peopleList(p, what) {
  const title = { followers: t('Followers'), following: t('Following'), likes: t('Liked by') }[what];
  const list = h('div', { class: 'pl-list' }, h('p', { class: 'hint cmt-wait' }, h('span', { class: 'dots3' }, h('i'), h('i'), h('i'))));
  const find = h('input', { class: 'input', type: 'search', placeholder: t('Search'), oninput: () => draw() });
  openWin(`${title} · ${p.name}`, h('div', { class: 'pm' }, find, list), null);
  const { data, error } = await sb.rpc('roardino_people_of', { p: p.id, what });
  if (error) { put(list, h('p', { class: 'hint' }, errText(error))); return; }
  const rows = (data || []).map((x) => ({ x, k: ' ' + fold(`${x.name} ${x.handle || ''}`) + ' ' }));
  await sign(rows.map(({ x }) => x.avatar));
  function draw() {
    const q = find.value.trim();
    const shown = rows.filter(({ k }) => !q || matches(k, q)).map(({ x }) => x);
    put(list, shown.length ? shown.map((x, i) => h('div', { class: 'pl-row', style: { animationDelay: `${Math.min(i, 10) * 50}ms` } },
      h('a', { href: `#/p/${x.id}`, class: 'pl-who', onclick: () => document.querySelectorAll('.veil').forEach((v) => v.remove()) }, avatar(x), h('span', {}, h('b', {}, x.name), h('small', {}, x.handle ? '@' + x.handle : (x.kinds || []).map(kindName).slice(0, 2).join(' · ')))),
      mine.some((m) => m.id === x.id) ? null : h('button', { type: 'button', class: 'btn sm' + (follows.has(x.id) ? '' : ' main'), onclick: async (e) => { const b = e.currentTarget; if (await toggleFollow(x.id)) { b.className = 'btn sm' + (follows.has(x.id) ? '' : ' main'); b.textContent = follows.has(x.id) ? t('Following') : t('Follow'); } } }, follows.has(x.id) ? t('Following') : t('Follow'))))
      : h('p', { class: 'hint', style: { textAlign: 'center', padding: '18px 0' } }, q ? t('Nobody by that name.') : { followers: t('No followers yet.'), following: t('Not following anyone yet.'), likes: t('No likes yet.') }[what]));
  }
  draw();
}
// the picture large, over everything (Alex, 5 Nov): arrows or keys for the others, a click outside, the X or Esc closes
function lightbox(media, start = 0) {
  if (!media.length) return;
  let i = Math.max(0, Math.min(media.length - 1, start));
  const stage = h('div', { class: 'lb-stage' });
  const count = h('span', { class: 'lb-count' });
  const show = () => {
    const m = media[i];
    put(stage, m.type === 'video' ? h('video', { src: urlOf(m.path), controls: true, autoplay: true, playsInline: true }) : h('img', { src: urlOf(m.path), alt: '' }));
    count.textContent = media.length > 1 ? `${i + 1} / ${media.length}` : '';
  };
  const go = (d) => { i = (i + d + media.length) % media.length; show(); };
  const close = () => { veil.classList.add('out'); setTimeout(() => veil.remove(), 280); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
  const veil = h('div', { class: 'lb', onclick: (e) => { if (e.target === veil || e.target === stage) close(); } }, stage, count,
    h('button', { type: 'button', class: 'lb-x', 'aria-label': t('Close'), html: ICON.x, onclick: close }),
    media.length > 1 ? h('button', { type: 'button', class: 'lb-nav prev', 'aria-label': t('Previous'), html: ICON.left, onclick: () => go(-1) }) : null,
    media.length > 1 ? h('button', { type: 'button', class: 'lb-nav next', 'aria-label': t('Next'), html: ICON.right, onclick: () => go(1) }) : null);
  document.addEventListener('keydown', onKey);
  document.body.append(veil); show();
}
async function toggleFollow(id) {
  const on = follows.has(id);
  const { error } = on ? await sb.from('roardino_follows').delete().eq('user_id', session.user.id).eq('person_id', id) : await sb.from('roardino_follows').insert({ person_id: id });
  if (error) { fail(error); return false; }
  if (on) follows.delete(id); else follows.add(id);
  toast(on ? t('Unfollowed') : t('Following'));
  return true;
}
async function toggleSave(postId, btn) {
  const on = saved.has(postId);
  const { error } = on ? await sb.from('roardino_saves').delete().eq('user_id', session.user.id).eq('post_id', postId) : await sb.from('roardino_saves').insert({ post_id: postId });
  if (error) return fail(error);
  if (on) saved.delete(postId); else saved.add(postId);
  btn?.classList.toggle('on', !on);
  toast(on ? t('Removed from Saved') : t('Saved. Find it on your profile, under Saved.'));
}
// the ⋯ menu of a post: Save on top; Follow or Unfollow, About this account; Report account at the bottom, in red
function postMenu(r, p, { own, media, refresh, saveBtn }) {
  let close;
  const row = (ic, label, fn, cls = '') => h('button', { type: 'button', class: 'pm-row ' + cls, onclick: () => { close(); fn(); } }, h('span', { class: 'pm-ic', html: ICON[ic] }), label);
  const isSaved = saved.has(r.id);
  const body = h('div', { class: 'pm' },
    h('div', { class: 'pm-tiles' },
      h('button', { type: 'button', class: 'pm-tile', onclick: () => { close(); toggleSave(r.id, saveBtn); } }, h('span', { class: 'pm-ic', html: ICON.bookmark }), isSaved ? t('Saved') : t('Save')),
      h('button', { type: 'button', class: 'pm-tile', onclick: async () => { close(); const url = `${location.origin}${location.pathname}#/p/${p.id}`; try { if (navigator.share) await navigator.share({ title: p.name, url }); else { await navigator.clipboard.writeText(url); toast(t('Link copied')); } } catch { /* closed */ } } }, h('span', { class: 'pm-ic', html: ICON.send }), t('Share'))),
    own ? h('div', { class: 'pm-group' },
      row('edit', t('Edit profile'), () => { location.hash = `#/edit/${p.id}`; }),
      row('trash', t('Delete post'), async () => {
        if (!(await ask(t('Delete this post?')))) return;
        const { error } = await sb.from('roardino_posts').delete().eq('id', r.id);
        if (error) return fail(error);
        removeFiles(media.map((m) => m.path)); refresh();
      }, 'red'))
      : [h('div', { class: 'pm-group' },
        follows.has(p.id) ? row('unfollow', t('Unfollow'), () => toggleFollow(p.id).then((ok) => ok && refresh?.())) : row('follow', t('Follow'), () => toggleFollow(p.id).then((ok) => ok && refresh?.()))),
      h('div', { class: 'pm-group' },
        row('user', t('About this account'), () => aboutAccount(p.id)),
        row('flag', t('Report account'), () => reportAccount(p, r), 'red'))]);
  close = openWin(p.name || t('Post'), body, null);
  document.querySelector('.veil:last-of-type')?.classList.add('pm-veil');
}
async function aboutAccount(id) {
  const [{ data: q }, { data: stats }] = await Promise.all([sb.from('roardino_people').select('id,name,handle,avatar,kinds,city,created_at,minor').eq('id', id).maybeSingle(), sb.rpc('roardino_person_stats', { p: id })]);
  if (!q) return;
  await sign([q.avatar]);
  const since = new Date(q.created_at).toLocaleDateString(LOCALE(), { month: 'long', year: 'numeric' });
  const line = (ic, k, v) => (v ? h('div', { class: 'pm-row static' }, h('span', { class: 'pm-ic', html: ICON[ic] }), h('span', {}, h('small', {}, k), h('b', {}, v))) : null);
  openWin(t('About this account'), h('div', { class: 'pm about' },
    h('div', { class: 'about-top' }, avatar(q, 'big'), h('b', {}, q.name), q.handle ? h('small', {}, '@' + q.handle) : null),
    h('div', { class: 'pm-group' },
      line('cal', t('On Roardino since'), since),
      line('pin', t('Based in'), q.city),
      line('star', t('What they do'), (q.kinds || []).map(kindName).join(', ')),
      line('grid', t('Works shared'), stats ? String(stats.posts) : ''),
      line('user', t('Followers'), stats ? String(stats.followers) : '')),
    h('a', { class: 'btn main', href: `#/p/${q.id}` }, t('View profile'))), null);
}
function reportAccount(p, r) {
  const reasons = [['spam', 'Spam or scam'], ['fake', 'Fake account, pretending to be someone'], ['nude', 'Nudity or sexual content'], ['harass', 'Harassment or hate'], ['child', 'A child may be at risk'], ['other', 'Something else']];
  let pick = '';
  const note = h('textarea', { class: 'textarea', rows: 3, placeholder: t('Anything we should know (optional)') });
  const list = h('div', { class: 'pm-group' });
  const draw = () => put(list, reasons.map(([k, label]) => h('button', { type: 'button', class: 'pm-row' + (pick === k ? ' on' : ''), onclick: () => { pick = k; draw(); } }, h('span', { class: 'pm-radio' }), t(label))));
  draw();
  openWin(t('Report {name}', { name: p.name }), h('div', { class: 'pm' }, h('p', { class: 'hint' }, t('Your report is private. The person will not know who sent it.')), list, note), (c) => [
    h('button', { type: 'button', class: 'btn', onclick: c }, t('Cancel')),
    h('button', { type: 'button', class: 'btn main red', onclick: async () => {
      if (!pick) { toast(t('Pick a reason')); return; }
      const label = reasons.find((x) => x[0] === pick)[1];
      const { error } = await sb.from('roardino_messages').insert({ topic: pick === 'child' ? 'child' : 'report', email: session.user.email, user_id: session.user.id, name: me()?.name || null,
        body: `Report account: ${p.name}${p.handle ? ' (@' + p.handle + ')' : ''} [${p.id}]\nReason: ${label}${r?.id ? '\nPost: ' + r.id : ''}${note.value.trim() ? '\n\n' + note.value.trim() : ''}`, page: location.href.slice(0, 500) });
      if (error) return fail(error);
      c(); toast(t('Thank you. We will look at it.'));
    } }, t('Report'))]);
}
function postCard(r, st, refresh) {
  const p = r.person || {};
  const media = r.media || [];
  const own = r.owner === session.user.id;
  const talk = h('div', { class: 'talk hidden' });
  // the numbers sit next to their icons, no lines of likes and comments under the post (Alex, 5 Nov)
  const likeN = h('span', { class: 'ig-n' }), talkN = h('span', { class: 'ig-n' });
  const short = (n) => (n >= 10000 ? Math.round(n / 1000) + 'K' : n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'K' : String(n));
  const drawCount = () => { likeN.textContent = st.bravos ? short(st.bravos) : ''; };
  drawCount();
  const bravoBtn = h('button', { type: 'button', class: 'ig-ico like' + (st.mine ? ' on' : ''), title: t('Like'), 'aria-label': t('Like'), html: ICON.heart, onclick: async () => {
    st.mine = !st.mine; st.bravos += st.mine ? 1 : -1; bravoBtn.classList.toggle('on', st.mine); bravoBtn.classList.remove('pop'); void bravoBtn.offsetWidth; if (st.mine) bravoBtn.classList.add('pop'); drawCount();
    const { error } = st.mine ? await sb.from('roardino_bravos').insert({ post_id: r.id }) : await sb.from('roardino_bravos').delete().eq('post_id', r.id).eq('user_id', session.user.id);
    if (error) fail(error);
  } });
  const openTalk = () => { talk.classList.remove('hidden'); if (!talk.dataset.on) { talk.dataset.on = '1'; drawTalk(talk, r, st, drawMore); } talk.querySelector('input')?.focus(); };
  // the caption under a picture shows with the comments, when the comment icon is tapped (Alex, 5 Nov)
  const cap = media.length && r.body ? h('p', { class: 'ig-cap hidden' }, h('a', { href: `#/p/${p.id}` }, h('b', {}, p.name)), ' ', ...tagText(r.body)) : null;
  const drawMore = () => { talkN.textContent = st.comments ? short(st.comments) : ''; };
  drawMore();
  const saveBtn = h('button', { type: 'button', class: 'ig-ico save' + (saved.has(r.id) ? ' on' : ''), title: t('Save'), 'aria-label': t('Save'), html: ICON.bookmark, onclick: () => toggleSave(r.id, saveBtn) });
  const share = async () => {
    const url = `${location.origin}${location.pathname}#/p/${p.id}`;
    try { if (navigator.share) await navigator.share({ title: p.name, url }); else { await navigator.clipboard.writeText(url); toast(t('Link copied')); } } catch { /* closed */ }
  };
  const slides = media.length ? h('div', { class: 'ig-media' + (media.length > 1 ? ' many' : '') }, media.map((m) => (m.type === 'video'
    ? (isPhone() ? feedVideo(urlOf(m.path)) : h('video', { src: urlOf(m.path), controls: true, playsInline: true, preload: 'metadata', muted: prefs.mutedVideos }))
    : h('img', { src: urlOf(m.path), alt: '', loading: 'lazy', decoding: 'async', ondblclick: (e) => { if (!st.mine) bravoBtn.click(); const hh = h('span', { class: 'big-heart', html: ICON.heart }); e.target.parentElement.parentElement.append(hh); setTimeout(() => hh.remove(), 900); } })))) : null;
  const dots = media.length > 1 ? h('div', { class: 'ig-dots' }, media.map((_, i) => h('i', { class: i ? '' : 'on' }))) : null;
  if (slides && dots) slides.addEventListener('scroll', () => { const i = Math.round(slides.scrollLeft / slides.clientWidth); dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === i)); });
  const head =
    h('div', { class: 'post-head' },
      h('a', { href: `#/p/${p.id}`, class: 'ring-sm' }, avatar(p)),
      h('div', { class: 'who-line' }, h('a', { href: `#/p/${p.id}` }, h('b', {}, p.name || '')), h('small', {}, p.headline || (p.kinds || []).map(kindName).slice(0, 2).join(' · '))),
      // Follow when I don't follow them yet, and the ⋯ menu (Alex, 5 Nov, as Instagram's)
      !own && p.id && !follows.has(p.id) ? h('button', { type: 'button', class: 'btn sm post-follow', onclick: async (e) => { const b = e.currentTarget; const ok = await toggleFollow(p.id); if (ok) b.remove(); } }, t('Follow')) : null,
      h('button', { type: 'button', class: 'ig-ico sm', title: t('More'), 'aria-label': t('More'), html: ICON.dots, onclick: () => postMenu(r, p, { own, media, refresh, saveBtn }) }));
  const bar =
    h('div', { class: 'ig-bar' }, h('span', { class: 'ig-pair' }, bravoBtn, likeN),
      h('span', { class: 'ig-pair' }, h('button', { type: 'button', class: 'ig-ico', title: t('Comment'), 'aria-label': t('Comment'), html: ICON.talk, onclick: () => { if (talk.classList.contains('hidden')) { openTalk(); cap?.classList.remove('hidden'); } else { talk.classList.add('hidden'); cap?.classList.add('hidden'); } } }), talkN),
      h('button', { type: 'button', class: 'ig-ico', title: t('Send on RoarMe'), 'aria-label': t('Send on RoarMe'), html: ICON.send, onclick: () => sendToRoarMe(r, p) }),
      h('span', { class: 'grow' }),
      own ? null : h('a', { class: 'btn sm main', href: `#/p/${p.id}` }, t('Work with me')), saveBtn);
  const time = h('p', { class: 'ig-time' }, ago(r.created_at));
  if (!media.length) return h('article', { class: 'post ig', 'data-post': r.id }, head, r.body ? h('p', { class: 'post-body big' }, ...tagText(r.body)) : null, bar, cap, time, talk);
  // a picture or a video only, on a phone (Alex, 5 Nov): one tap slides in who it is (top) and the icons (bottom) over it,
  // with the caption and the comments under it; another tap puts them away; a double tap is still a like
  const art = h('article', { class: 'post ig has-media', 'data-post': r.id });
  const wrap = h('div', { class: 'mwrap' }, head, slides, dots, bar);
  let tapT = null;
  const setOpen = (on) => {
    art.classList.toggle('open', on);
    slides.querySelectorAll('video').forEach((v) => { v.controls = on || !isPhone(); });
    if (on) { openTalk(); cap?.classList.remove('hidden'); } else { talk.classList.add('hidden'); cap?.classList.add('hidden'); }
  };
  wrap.addEventListener('click', (e) => {
    if (e.target.closest('.post-head, .ig-bar, a, button')) return;
    // on a computer a click on the picture opens it large (Alex, 5 Nov)
    if (!isPhone()) { clearTimeout(tapT); tapT = setTimeout(() => lightbox(media, Math.round((slides.scrollLeft || 0) / (slides.clientWidth || 1))), 260); return; }
    clearTimeout(tapT); tapT = setTimeout(() => setOpen(!art.classList.contains('open')), 260);
  });
  wrap.addEventListener('dblclick', () => clearTimeout(tapT));
  // scrolled away, an open post folds itself back to the picture (Alex, 5 Nov)
  if ('IntersectionObserver' in window) new IntersectionObserver((list) => list.forEach((en) => {
    if (art.classList.contains('open') && en.intersectionRatio < 0.25 && !art.contains(document.activeElement)) setOpen(false);
  }), { threshold: [0, 0.25] }).observe(wrap);
  // the time rides at the end of the caption, right aligned, on its last line if it fits, else on the next (Alex, 5 Nov)
  if (cap) cap.append(h('span', { class: 'cap-time' }, ago(r.created_at)));
  put(art, wrap, cap, cap ? null : time, talk);
  return art;
}
// the comments, with motion (Alex, 5 Nov): they rise in one after another when opened, a new one slides in lit up and the
// field clears without a reload, a deleted one folds away
async function drawTalk(box, r, st, recount) {
  put(box, h('p', { class: 'hint cmt-wait' }, h('span', { class: 'dots3' }, h('i'), h('i'), h('i'))));
  const { data } = await sb.from('roardino_comments').select('*, person:roardino_people(id,name,avatar)').eq('post_id', r.id).order('created_at');
  await sign((data || []).map((c) => c.person?.avatar));
  const list = h('div', { class: 'cmt-list' });
  const row = (c, i, fresh) => {
    const el = h('div', { class: 'cmt' + (fresh ? ' cmt-fresh' : ''), style: fresh ? null : { animationDelay: `${Math.min(i, 8) * 90}ms` } },
      h('a', { href: c.person ? `#/p/${c.person.id}` : '#/feed' }, avatar(c.person || {}, 'sm')),
      h('div', {}, h('b', {}, c.person?.name || t('Member')), ' ', ...tagText(c.body), h('small', {}, ago(c.created_at))),
      c.owner === session.user.id || r.owner === session.user.id ? h('button', { type: 'button', class: 'cmt-del', title: t('Delete'), 'aria-label': t('Delete'), html: ICON.trash, onclick: async () => {
        const { error } = await sb.from('roardino_comments').delete().eq('id', c.id);
        if (error) return fail(error);
        st.comments--; recount();
        el.style.height = el.offsetHeight + 'px'; void el.offsetHeight; el.classList.add('cmt-gone');
        setTimeout(() => el.remove(), 750);
      } }) : null);
    return el;
  };
  put(list, ...(data || []).map((c, i) => row(c, i, false)));
  const text = input('', { placeholder: t('Add a comment…'), onkeydown: (e) => { if (e.key === 'Enter') send(); } });
  const sendBtn = h('button', { type: 'button', class: 'btn sm', onclick: send }, t('Send'));
  async function send() {
    const body = text.value.trim();
    if (!body) { text.parentElement?.classList.remove('shake'); void text.offsetWidth; text.parentElement?.classList.add('shake'); return; }
    sendBtn.disabled = true;
    const { data: made, error } = await sb.from('roardino_comments').insert({ post_id: r.id, body, person_id: me()?.id || null }).select('*').maybeSingle();
    sendBtn.disabled = false;
    if (error) return fail(error);
    st.comments++; recount();
    const m = me();
    list.append(row({ ...(made || {}), body, owner: session.user.id, created_at: made?.created_at || new Date().toISOString(), person: m ? { id: m.id, name: m.name, avatar: m.avatar } : null }, 0, true));
    text.value = '';
  }
  put(box, list, h('div', { class: 'cmt-new' }, avatar(me() || { name: '?' }, 'sm'), withMentions(text), sendBtn));
}

/* =====================================================================================================================
   Stories (Alex, 5 Nov: "like Instagram's"): a picture or a video for 24 hours. The row on top of the feed: my story
   with its +, then whoever has stories (seen ones grey, kept on this device), then people to discover. Full screen,
   bars on top, tap right for the next, left for the one before, hold to pause.
   ===================================================================================================================== */
let seenStories = new Set();
try { seenStories = new Set(JSON.parse(localStorage.getItem('roardino-seen') || '[]')); } catch { /* none */ }
const markSeen = (id) => { seenStories.add(id); try { localStorage.setItem('roardino-seen', JSON.stringify([...seenStories].slice(-500))); } catch { /* full */ } };
// stories grouped by profile: [{ person, items: [story…] }], mine first, then the unseen, then the seen
async function loadStories(personId) {
  let q = sb.from('roardino_stories').select('*, person:roardino_people(id,name,avatar,kinds)').gt('expires_at', new Date().toISOString()).order('created_at');
  if (personId) q = q.eq('person_id', personId);
  const { data } = await q;
  const by = new Map();
  for (const st of data || []) { if (!st.person) continue; if (!by.has(st.person_id)) by.set(st.person_id, { person: st.person, items: [] }); by.get(st.person_id).items.push(st); }
  const groups = [...by.values()];
  await sign(groups.flatMap((g) => [g.person.avatar, ...g.items.map((x) => x.media?.path)]));
  const isMine = (g) => mine.some((m) => m.id === g.person.id);
  const unseen = (g) => g.items.some((x) => !seenStories.has(x.id));
  return groups.sort((a, b) => (isMine(b) - isMine(a)) || (unseen(b) - unseen(a)) || (new Date(b.items.at(-1).created_at) - new Date(a.items.at(-1).created_at)));
}
// stories can be hidden (Alex, 5 Nov), kept by the account like the feed's choice
function setShowStories(v) {
  setPref('showStories', v);
  if (session?.user?.user_metadata?.roardino_stories !== v) sb.auth.updateUser?.({ data: { roardino_stories: v } }).then(({ data }) => { if (data?.user) session.user = data.user; }).catch(() => {});
}
function storiesCard(groups, others) {
  if (!prefs.showStories) return null;
  const m = me();
  const myGroup = m && groups.find((g) => g.person.id === m.id);
  const rest = groups.filter((g) => g !== myGroup);
  const pick = h('input', { type: 'file', accept: 'image/*,video/*', hidden: true, onchange: async (e) => { const f0 = e.target.files[0]; e.target.value = ''; const f = f0 && (/^video/.test(f0.type) ? f0 : await cropImage(f0, SHAPES.story)); const ed = f && await storyEditor(f); if (ed) await addStory(ed.file, ed.overlays); } });
  const ringOf = (g) => (g.items.some((x) => !seenStories.has(x.id)) ? 'r' : 'r seen');
  const face = (p, cls, g) => h('span', { class: cls, 'data-st': g ? g.items.map((x) => x.id).join(',') : null }, h('i', { style: bg(p.avatar) }, urlOf(p.avatar) ? '' : initials(p.name)));
  return h('section', { class: 'card stories' },
    h('button', { type: 'button', class: 'st-hide', title: t('Hide stories'), 'aria-label': t('Hide stories'), html: ICON.eyeoff, onclick: () => { setShowStories(false); toast(t('Stories hidden. The round button next to New post brings them back.')); viewFeed(); } }),
    h('div', { class: 'ring-row' },
      m ? h('div', { class: 'ring me', role: 'button', tabIndex: 0, onclick: () => (myGroup ? openStories([myGroup, ...rest], 0) : storySource(pick)) },
        face(m, myGroup ? ringOf(myGroup) : 'r plain', myGroup),
        h('button', { type: 'button', class: 'add', 'aria-label': t('Add to your story'), html: ICON.plus, onclick: (e) => { e.stopPropagation(); storySource(pick); } }),
        h('em', {}, t('Your story')), pick) : null,
      rest.map((g, i) => h('button', { type: 'button', class: 'ring', onclick: () => openStories(rest, i) }, face(g.person, ringOf(g), g), h('em', {}, g.person.name.split(' ')[0]))),
      others.filter((p) => !groups.some((g) => g.person.id === p.id)).map((p) => h('a', { class: 'ring', href: `#/p/${p.id}`, title: t('Just for you') }, face(p, 'r plain'), h('em', {}, p.name.split(' ')[0])))));
}
// where a story comes from (Alex, 5 Nov): the camera, live, on a laptop or a phone, or the gallery
function storySource(pick) {
  const close = openWin(t('Add to your story'), h('div', { class: 'src-two' },
    navigator.mediaDevices?.getUserMedia ? h('button', { type: 'button', class: 'mt big', onclick: () => { close(); storyCamera(); } }, h('span', { html: ICON.cam }), t('Camera')) : null,
    h('button', { type: 'button', class: 'mt big', onclick: () => { close(); pick.click(); } }, h('span', { html: ICON.pic }), t('Gallery'))), null);
}
// the camera: tap for a photo, hold for a video up to 15 seconds, flip front / back, then Share or Retake
async function storyCamera() {
  let facing = 'user', stream = null, rec = null, chunks = [], holdTimer = null, stopTimer = null, startedAt = 0, ticker = null, shot = null;
  const video = h('video', { class: 'cam-live', autoplay: true, muted: true, playsInline: true });
  const ring = h('span', { class: 'cam-ring' });
  const shutter = h('button', { type: 'button', class: 'cam-shutter', 'aria-label': t('Tap for a photo, hold for a video') }, ring);
  const flip = h('button', { type: 'button', class: 'cam-btn', 'aria-label': t('Flip camera'), html: ICON.flip, onclick: () => { facing = facing === 'user' ? 'environment' : 'user'; start(); } });
  const hint = h('p', { class: 'cam-hint' }, t('Tap for a photo, hold for a video'));
  const stage = h('div', { class: 'st-stage' }, video);
  const controls = h('div', { class: 'cam-controls' }, h('span', { style: { width: '46px' } }), shutter, flip);
  const card = h('div', { class: 'st-card cam' }, stage, hint, controls);
  const veil = h('div', { class: 'st-veil' }, card, h('button', { type: 'button', class: 'st-x', 'aria-label': t('Close'), html: ICON.x, onclick: () => close() }));
  document.body.append(veil);
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  function stopStream() { stream?.getTracks().forEach((tr) => tr.stop()); stream = null; }
  function close() { clearTimeout(holdTimer); clearTimeout(stopTimer); clearInterval(ticker); try { rec?.state === 'recording' && rec.stop(); } catch { /* done */ } stopStream(); veil.remove(); document.removeEventListener('keydown', onKey); }
  async function start() {
    stopStream();
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: true })
        .catch(() => navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false }));
      video.srcObject = stream;
      video.classList.toggle('mirror', facing === 'user');
    } catch (e) { put(stage, h('p', { class: 'cam-hint', style: { position: 'static', marginTop: '45%' } }, t('The camera is not allowed. Allow it in the browser and try again.'))); }
  }
  function takePhoto() {
    if (!video.videoWidth) return;
    // the frame as 9:16, cut from the middle of what the camera sees
    const vw = video.videoWidth, vh = video.videoHeight, want = 9 / 16;
    let sw = vw, sh = vh; if (vw / vh > want) sw = vh * want; else sh = vw / want;
    const c = h('canvas'); c.width = Math.round(Math.min(1080, sw)); c.height = Math.round(c.width / want);
    const g = c.getContext('2d');
    if (facing === 'user') { g.translate(c.width, 0); g.scale(-1, 1); }
    g.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, c.width, c.height);
    c.toBlob((b) => review(new File([b], 'story.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.9);
  }
  function startVideo() {
    if (!stream || !window.MediaRecorder) return;
    const type = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find((x) => MediaRecorder.isTypeSupported?.(x)) || '';
    rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => { const tp = rec.mimeType || 'video/webm'; review(new File([new Blob(chunks, { type: tp })], /mp4/.test(tp) ? 'story.mp4' : 'story.webm', { type: tp.split(';')[0] })); };
    rec.start();
    startedAt = Date.now();
    card.classList.add('rec');
    ticker = setInterval(() => ring.style.setProperty('--p', Math.min(1, (Date.now() - startedAt) / 15000)), 100);
    stopTimer = setTimeout(stopVideo, 15000);
  }
  function stopVideo() { clearTimeout(stopTimer); clearInterval(ticker); card.classList.remove('rec'); if (rec?.state === 'recording') rec.stop(); }
  shutter.addEventListener('pointerdown', (e) => { e.preventDefault(); holdTimer = setTimeout(() => { holdTimer = null; startVideo(); }, 350); });
  shutter.addEventListener('pointerup', () => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; takePhoto(); } else stopVideo(); });
  shutter.addEventListener('pointerleave', () => { if (!holdTimer && rec?.state === 'recording') stopVideo(); });
  function review(file) {
    shot = file;
    stopStream();
    const url = URL.createObjectURL(file);
    put(stage, /^video/.test(file.type) ? h('video', { src: url, autoplay: true, loop: true, playsInline: true }) : h('img', { src: url, alt: '' }));
    hint.classList.add('hidden');
    put(controls,
      h('button', { type: 'button', class: 'btn', onclick: () => { put(stage, video); hint.classList.remove('hidden'); put(controls, h('span', { style: { width: '46px' } }), shutter, flip); start(); } }, t('Retake')),
      h('button', { type: 'button', class: 'btn main', onclick: async () => { close(); const ed = await storyEditor(shot); if (ed) await addStory(ed.file, ed.overlays); } }, t('Next')));
  }
  start();
}
async function addStory(file, overlays = []) {
  const m = me();
  if (!m) return;
  // the upload shows in the middle of the screen, with the picture (Alex, 5 Nov)
  const url = URL.createObjectURL(file);
  const card = h('div', { class: 'up-card' },
    h('div', { class: 'up-thumb' }, /^video/.test(file.type) ? h('video', { src: url, muted: true, autoplay: true, loop: true, playsInline: true }) : h('img', { src: url, alt: '' }), h('span', { class: 'up-spin' })),
    h('b', {}, t('Uploading your story…')), h('small', {}, t('Keep this page open for a moment.')));
  const veil = h('div', { class: 'up-veil' }, card);
  document.body.append(veil);
  try {
    const path = await upload(m.id, file, 'stories/');
    const { error } = await sb.from('roardino_stories').insert({ person_id: m.id, media: { path, type: /^video/.test(file.type) ? 'video' : 'image' }, overlays });
    if (error) throw error;
    put(card, h('div', { class: 'up-done', html: ICON.check || ICON.send }), h('b', {}, t('Added to your story')));
    await new Promise((r) => setTimeout(r, 900));
    viewFeed();
  } catch (e) { fail(e); } finally { veil.remove(); URL.revokeObjectURL(url); }
}
// before a story goes out: text, a @tag and a link on it, as on Instagram (Alex, 5 Nov); each is dragged where it should sit and
// kept as { type, x, y (in % of the picture), text, color, box | handle, id | url } so it works on videos too
const ST_COLORS = ['#ffffff', '#111111', '#d40000', '#f2c94c', '#35c98b', '#4a90e2', '#c06bf0'];
function storyEditor(file) {
  return new Promise((done) => {
    const url = URL.createObjectURL(file);
    const overlays = [];
    const media = /^video/.test(file.type) ? h('video', { src: url, autoplay: true, loop: true, muted: true, playsInline: true }) : h('img', { src: url, alt: '' });
    const layer = h('div', { class: 'st-layer' });
    const stage = h('div', { class: 'st-stage ed' }, media, layer);
    const panel = h('div', { class: 'ed-panel hidden' });
    const tool = (label, ic, onclick) => h('button', { type: 'button', class: 'cam-btn ed-tool', title: label, 'aria-label': label, onclick }, ic.length < 3 ? h('b', {}, ic) : h('span', { html: ICON[ic] }));
    const tools = h('div', { class: 'ed-tools' }, tool(t('Text'), 'Aa', () => editText()), tool(t('Tag someone'), '@', () => editTag()), tool(t('Link'), 'link', () => editLink()));
    const finish = (v) => { veil.remove(); URL.revokeObjectURL(url); done(v); };
    const controls = h('div', { class: 'cam-controls' },
      h('button', { type: 'button', class: 'btn', onclick: () => finish(null) }, t('Cancel')),
      h('button', { type: 'button', class: 'btn main', onclick: () => finish({ file, overlays: overlays.map(({ el, ...o }) => o) }) }, t('Share to my story')));
    const card = h('div', { class: 'st-card cam editor' }, stage, tools, controls, panel);
    const veil = h('div', { class: 'st-veil' }, card, h('button', { type: 'button', class: 'st-x', 'aria-label': t('Close'), html: ICON.x, onclick: () => finish(null) }));
    document.body.append(veil);
    function place(o) {
      o.el?.remove();
      const el = stickerEl(o, true);
      el.style.left = o.x + '%'; el.style.top = o.y + '%';
      // drag to move; a tap without moving edits it
      let sx, sy, moved = false;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); sx = e.clientX; sy = e.clientY; moved = false; el.classList.add('drag'); });
      el.addEventListener('pointermove', (e) => {
        if (!el.hasPointerCapture(e.pointerId)) return;
        if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 4) moved = true;
        const r = layer.getBoundingClientRect();
        o.x = Math.max(4, Math.min(96, ((e.clientX - r.left) / r.width) * 100)); o.y = Math.max(4, Math.min(96, ((e.clientY - r.top) / r.height) * 100));
        el.style.left = o.x + '%'; el.style.top = o.y + '%';
      });
      el.addEventListener('pointerup', () => { el.classList.remove('drag'); if (!moved) (o.type === 'text' ? editText : o.type === 'tag' ? editTag : editLink)(o); });
      o.el = el; layer.append(el);
    }
    function openPanel(...kids) { put(panel, ...kids); panel.classList.remove('hidden'); panel.querySelector('input')?.focus(); }
    const closePanel = () => panel.classList.add('hidden');
    const remove = (o) => { o.el?.remove(); const k = overlays.indexOf(o); if (k >= 0) overlays.splice(k, 1); closePanel(); };
    const panelFoot = (o, ok) => h('div', { class: 'ed-foot' }, o ? h('button', { type: 'button', class: 'btn red', onclick: () => remove(o) }, icon('trash'), t('Remove')) : h('button', { type: 'button', class: 'btn', onclick: closePanel }, t('Cancel')), h('button', { type: 'button', class: 'btn main', onclick: ok }, t('Done')));
    function editText(o) {
      const cur = o || { type: 'text', x: 50, y: 40, text: '', color: '#ffffff', box: false };
      const inp = h('input', { class: 'input', maxlength: 120, value: cur.text, placeholder: t('Write something') });
      const sw = h('div', { class: 'ed-swatches' });
      const drawSw = () => put(sw, ST_COLORS.map((c) => h('button', { type: 'button', class: 'swatch' + (cur.color === c ? ' on' : ''), style: { '--sw': c }, 'aria-label': c, onclick: () => { cur.color = c; drawSw(); } })),
        h('button', { type: 'button', class: 'btn sm' + (cur.box ? ' main' : ''), onclick: () => { cur.box = !cur.box; drawSw(); } }, t('Box')));
      drawSw();
      const ok = () => { cur.text = inp.value.trim(); if (!cur.text) return remove(cur); if (!o) overlays.push(cur); place(cur); closePanel(); };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
      openPanel(h('b', {}, t('Text')), inp, sw, panelFoot(o, ok));
    }
    function editTag(o) {
      const cur = o || { type: 'tag', x: 50, y: 60, handle: '', id: '' };
      const inp = h('input', { class: 'input', value: cur.handle ? '@' + cur.handle : '@', placeholder: '@username', autocapitalize: 'off' });
      const ok = async () => {
        const hd = inp.value.replace(/^@/, '').trim().toLowerCase();
        const p = (await loadTagPeople()).find((x) => x.handle === hd);
        if (!p) { toast(t('No profile with that username.')); return; }
        cur.handle = p.handle; cur.id = p.id; if (!o) overlays.push(cur); place(cur); closePanel();
      };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !document.querySelector('.ed-panel .mention-list:not(.hidden)')) ok(); });
      openPanel(h('b', {}, t('Tag someone')), withMentions(inp), panelFoot(o, ok));
      inp.setSelectionRange(inp.value.length, inp.value.length); inp.dispatchEvent(new Event('input'));
    }
    function editLink(o) {
      const cur = o || { type: 'link', x: 50, y: 75, url: '', text: '' };
      const u = h('input', { class: 'input', type: 'url', value: cur.url, placeholder: 'https://', autocapitalize: 'off' });
      const lbl = h('input', { class: 'input', value: cur.text, maxlength: 40, placeholder: t('What it says (optional)') });
      const ok = () => {
        let v = u.value.trim(); if (!v) return remove(cur);
        if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
        try { new URL(v); } catch { toast(t('That link does not look right.')); return; }
        cur.url = v; cur.text = lbl.value.trim(); if (!o) overlays.push(cur); place(cur); closePanel();
      };
      openPanel(h('b', {}, t('Link')), u, lbl, panelFoot(o, ok));
    }
  });
}
// one sticker on a story: text, @tag (opens the profile) or a link (opens in a new tab)
function stickerEl(o, editing) {
  if (o.type === 'tag') return h(editing ? 'div' : 'a', { class: 'stk stk-tag', href: editing ? null : `#/p/${o.id}` }, '@' + o.handle);
  if (o.type === 'link') { let host = ''; try { host = new URL(o.url).hostname.replace(/^www\./, ''); } catch { /* bad */ } return h(editing ? 'div' : 'a', { class: 'stk stk-link', href: editing ? null : o.url, target: '_blank', rel: 'noopener nofollow' }, h('span', { html: ICON.link }), o.text || host); }
  const light = ['#ffffff', '#f2c94c'].includes(o.color);
  return h('div', { class: 'stk stk-text' + (o.box ? ' box' : ''), style: o.box ? { background: o.color, color: light ? '#111' : '#fff' } : { color: o.color } }, o.text);
}
function openStories(groups, gi) {
  if (!groups.length) return;
  let g = gi, i = Math.max(0, groups[gi].items.findIndex((x) => !seenStories.has(x.id)));
  let timer = null, started = 0, left = 0, paused = false;
  const bars = h('div', { class: 'st-bars' });
  const head = h('div', { class: 'st-head' });
  const stage = h('div', { class: 'st-stage' });
  const cap = h('p', { class: 'st-cap' });
  const stickers = h('div', { class: 'st-layer view' });
  const card = h('div', { class: 'st-card' }, stage, bars, head, cap,
    h('button', { type: 'button', class: 'st-tap prev', 'aria-label': t('Previous'), onclick: () => step(-1) }),
    h('button', { type: 'button', class: 'st-tap next', 'aria-label': t('Next'), onclick: () => step(1) }), stickers);
  const veil = h('div', { class: 'st-veil', onclick: (e) => { if (e.target === veil) close(); } }, card,
    h('button', { type: 'button', class: 'st-x', 'aria-label': t('Close'), html: ICON.x, onclick: () => close() }));
  const onKey = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
  document.addEventListener('keydown', onKey);
  // hold to pause, as on a phone
  card.addEventListener('pointerdown', () => { paused = true; clearTimeout(timer); left -= Date.now() - started; stage.querySelector('video')?.pause(); bars.classList.add('paused'); });
  const resume = () => { if (!paused) return; paused = false; bars.classList.remove('paused'); stage.querySelector('video')?.play().catch(() => {}); run(Math.max(300, left)); };
  card.addEventListener('pointerup', resume); card.addEventListener('pointerleave', resume);
  // closing marks the rings seen where they are; no redraw of the whole feed (Alex, 5 Nov: the iPhone died on that redraw)
  function close() { clearTimeout(timer); veil.remove(); document.removeEventListener('keydown', onKey); crumb('story closed');
    document.querySelectorAll('.stories [data-st]').forEach((el) => { if (el.dataset.st.split(',').every((id) => seenStories.has(id))) el.className = 'r seen'; }); }
  function run(ms) { started = Date.now(); left = ms; clearTimeout(timer); timer = setTimeout(() => step(1), ms); }
  function step(d) {
    i += d;
    if (i < 0) { if (g > 0) { g--; i = groups[g].items.length - 1; } else i = 0; }
    if (i >= groups[g].items.length) { g++; i = 0; if (g >= groups.length) return close(); }
    show();
  }
  function show() {
    const grp = groups[g], st = grp.items[i];
    markSeen(st.id);
    put(bars, grp.items.map((x, k) => h('i', { class: k < i ? 'done' : k === i ? 'now' : '' }, h('b'))));
    const own = st.owner === session.user.id;
    put(head, h('a', { href: `#/p/${grp.person.id}`, onclick: () => close() }, avatar(grp.person, 'sm')), h('b', {}, grp.person.name), h('small', {}, ago(st.created_at)),
      own ? h('button', { type: 'button', class: 'st-del', 'aria-label': t('Delete'), html: ICON.trash, onclick: async (e) => {
        e.stopPropagation();
        clearTimeout(timer); stage.querySelector('video')?.pause();
        if (!(await ask(t('Delete this story?')))) { stage.querySelector('video')?.play().catch(() => {}); run(Math.max(800, left - (Date.now() - started))); return; }
        const { error } = await sb.from('roardino_stories').delete().eq('id', st.id);
        if (error) return fail(error);
        if (!/^https?:/.test(st.media?.path || '')) removeFiles([st.media?.path]);
        grp.items.splice(i, 1);
        if (!grp.items.length) { groups.splice(g, 1); if (!groups.length) return close(); if (g >= groups.length) return close(); i = 0; } else if (i >= grp.items.length) i = grp.items.length - 1;
        show();
      } }) : null);
    put(stickers, (st.overlays || []).map((o) => { const el = stickerEl(o, false); el.style.left = o.x + '%'; el.style.top = o.y + '%'; if (el.tagName === 'A') el.addEventListener('click', (e) => { e.stopPropagation(); if (o.type === 'tag') close(); }); el.addEventListener('pointerdown', (e) => e.stopPropagation()); return el; }));
    cap.textContent = st.caption || '';
    cap.classList.toggle('hidden', !st.caption);
    const m = st.media || {};
    if (m.type === 'video') {
      const v = h('video', { src: urlOf(m.path), autoplay: true, muted: true, playsInline: true });
      v.addEventListener('loadedmetadata', () => { bars.style.setProperty('--d', `${Math.min(30, v.duration || 15)}s`); run(Math.min(30, v.duration || 15) * 1000); });
      v.addEventListener('click', () => { v.muted = !v.muted; });
      put(stage, v);
      bars.style.setProperty('--d', '15s'); run(15000);
    } else {
      put(stage, h('img', { src: urlOf(m.path), alt: '' }));
      bars.style.setProperty('--d', '5s'); run(5000);
    }
  }
  document.body.append(veil);
  show();
}

/* =====================================================================================================================
   People
   ===================================================================================================================== */
// Cast, Crew & Creatives (Alex, 4 Nov: "People" becomes the industry's own words): Cast in front of the camera or on
// stage, Crew who makes the film, Creatives around it (photo, styling, make-up, art, VFX, writing, choreography);
// under the pick, the kinds of that side
let peopleSide = 'all', peopleKind = '', peopleQ = '';
let peopleKinds = new Set(); // the specialties picked, more than one at a time
let castF = { from: '', to: '', hFrom: '', hTo: '', gender: '', cities: new Set(), hair: new Set(), eyes: new Set() };
let castOpen = !matchMedia('(max-width:820px)').matches; // the cast filters start folded on a phone
let peopleRedraw = null; // the top bar's search filters the Industry page as you type
const sideOf = (k) => (k === 'theatre' ? 'front' : SIDE[k]);
const SIDES = { cast: 'front', crew: 'back', creatives: 'creative' };
const SIDE_NAME = { front: 'Cast', back: 'Crew', creative: 'Creatives' };
// whoever stands in front (actor, model, dancer, extra, singer) gets the cast filters (Alex, 5 Nov)
const CAST_KINDS = KINDS.filter((k) => k[2] === 'front').map((k) => k[0]);
// hair and eyes are written freely, so each choice is a set of words in English and Greek
const HAIRS = [['blonde', 'Blonde', 'blond blonde ξανθ'], ['brown', 'Brown', 'brown καστ chestnut'], ['black', 'Black', 'black μαυρ dark σκουρ'], ['red', 'Red', 'red ginger κοκκιν πυρρ'], ['grey', 'Grey', 'grey gray γκρι ασπρ white silver']];
const EYES = [['brown', 'Brown', 'brown καστ'], ['blue', 'Blue', 'blue γαλαν μπλε'], ['green', 'Green', 'green πρασ'], ['hazel', 'Hazel', 'hazel μελ honey'], ['black', 'Black', 'black μαυρ dark']];
const hasWord = (text, words) => { const f = ' ' + fold(text) + ' '; return words.split(' ').some((w) => f.includes(' ' + fold(w))); };
const cityKey = (c) => { const f = fold(c); return f === 'athens' ? 'athina' : f === 'salonika' ? 'thessaloniki' : f === 'patras' ? 'patra' : f; };
/* =====================================================================================================================
   Search (Alex, 5 Nov: "a search in the bottom bar, a machine that searches with filters, dedicated to it"): one big field,
   then People (with every Industry filter), Posts or Calls; Greek, Greeklish, with or without accents
   ===================================================================================================================== */
let searchScope = 'people';
function searchHead(onType) {
  const inp = h('input', { type: 'search', class: 'input s-input', placeholder: t('Search Roardino'), 'aria-label': t('Search'), value: peopleQ, enterkeyhint: 'search',
    oninput: (e) => onType(e.target.value) });
  const clear = h('button', { type: 'button', class: 's-clear', 'aria-label': t('Clear'), html: ICON.x, onclick: () => { inp.value = ''; onType(''); inp.focus(); } });
  setTimeout(() => { if (!peopleQ) inp.focus({ preventScroll: true }); }, 350);
  return h('div', { class: 's-top' },
    h('label', { class: 's-field' }, h('span', { class: 's-ic', html: ICON.search }), inp, clear),
    seg([['people', t('People')], ['posts', t('Posts')], ['calls', t('Calls')]], searchScope, (k) => { searchScope = k; viewSearch(); }));
}
async function viewSearch() {
  if (searchScope === 'people') return viewPeople({ search: true });
  document.title = 'Roardino · ' + t('Search');
  const box = h('div', { class: searchScope === 'posts' ? 'grid s-grid' : 's-calls' }, h('p', { class: 'wait' }, t('Loading…')));
  const count = h('span', { class: 'hint people-count' });
  const chips = h('div', { class: 'kind-rows' });
  let draw = () => {};
  frame('search', searchHead((q) => { peopleQ = q; draw(); }), h('div', { class: 'head s-side' }, chips, h('span', { class: 'grow' }), count), box);
  if (searchScope === 'posts') {
    const { data } = await sb.from('roardino_posts').select('*, person:roardino_people(id,name,handle,avatar,kinds,headline,city)').order('created_at', { ascending: false }).limit(300);
    const rows = (data || []).map((r) => ({ r, k: ' ' + fold([r.body, r.person?.name, r.person?.handle, r.person?.city, ...(r.person?.kinds || []).flatMap((k) => [KIND[k], KIND_EL[k]])].join(' ')) + ' ' }));
    await sign(rows.flatMap(({ r }) => [(r.media || [])[0]?.path, r.person?.avatar]));
    let kind = '';
    draw = () => {
      put(chips, h('div', { class: 'fbody' }, [['', t('All')], ['work', t('Work')], ['photo', t('Photos')], ['video', t('Videos')]].map(([k, l]) => h('button', { type: 'button', class: 'fchip' + (kind === k ? ' on' : ''), onclick: () => { kind = k; draw(); } }, l))));
      const q = peopleQ.trim();
      const shown = rows.filter(({ r, k }) => (!q || matches(k, q)) && (!kind || (kind === 'video' ? (r.media || []).some((m) => m.type === 'video') : (r.kind || 'work') === kind))).map(({ r }) => r);
      count.textContent = shown.length === 1 ? t('1 post') : t('{n} posts', { n: shown.length });
      put(box, shown.length ? shown.map((g) => { const m0 = (g.media || [])[0]; return h('button', { type: 'button', class: 'cell', style: m0?.type === 'image' ? bg(m0.path) : {}, 'aria-label': t('Post'), onclick: () => openPost(g, g.person) },
        m0?.type === 'video' ? [cellVideo(urlOf(m0.path)), h('span', { class: 'play', html: ICON.play })] : !m0 ? h('span', { class: 'cell-text' }, (g.body || '').slice(0, 90)) : null); })
        : h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, h('b', {}, t('Nothing found')), t('Try other words, in Greek or English.')));
    };
  } else {
    const { data } = await sb.from('roardino_calls').select('*').order('created_at', { ascending: false }).limit(200);
    const rows = (data || []).map((c) => ({ c, k: ' ' + fold([c.title, c.about, c.company, c.city, c.pay, ...(c.wanted || []).flatMap((k) => [KIND[k], KIND_EL[k]])].join(' ')) + ' ' }));
    let kind = '', openOnly = true;
    draw = () => {
      put(chips, h('div', { class: 'fbody' },
        [['', t('All')], ['casting', t('Casting')], ['crew', t('Crew')]].map(([k, l]) => h('button', { type: 'button', class: 'fchip' + (kind === k ? ' on' : ''), onclick: () => { kind = k; draw(); } }, l)),
        h('button', { type: 'button', class: 'fchip' + (openOnly ? ' on' : ''), onclick: () => { openOnly = !openOnly; draw(); } }, t('Open only'))));
      const q = peopleQ.trim();
      const shown = rows.filter(({ c, k }) => (!q || matches(k, q)) && (!kind || c.kind === kind) && (!openOnly || (c.open !== false && (!c.closes || new Date(c.closes) >= new Date(new Date().toDateString()))))).map(({ c }) => c);
      count.textContent = shown.length === 1 ? t('1 call') : t('{n} calls', { n: shown.length });
      put(box, shown.length ? shown.map(callTile) : h('div', { class: 'empty' }, h('b', {}, t('Nothing found')), t('Try other words, or show the closed calls too.')));
    };
  }
  draw();
}
async function viewPeople(opts = {}) {
  document.title = 'Roardino · ' + (opts.search ? t('Search') : t('Industry'));
  const grid = h('div', { class: 'faces' }, h('p', { class: 'wait' }, t('Loading…')));
  const sideBox = h('div'), countBox = h('span', { class: 'hint people-count' }), kindsBox = h('div', { class: 'kind-rows' }), filterBox = h('div');
  // the top bar has the search on a computer; a phone has no search in its bar, so it gets one here
  const search = input(peopleQ, { type: 'search', class: 'input search only-phone', placeholder: t('Name, city, what they do'), 'aria-label': t('Search cast & crew'), oninput: (e) => { peopleQ = e.target.value; draw(); } });
  if (opts.search) frame('search', searchHead((q) => { peopleQ = q; draw(); }), h('div', { class: 'head s-side' }, sideBox, h('span', { class: 'grow' }), countBox), kindsBox, filterBox, grid);
  else frame('people', h('div', { class: 'head' }, h('h1', {}, t('Industry')), sideBox, h('span', { class: 'grow' }), countBox), search, kindsBox, filterBox, grid);
  const { data, error } = await sb.from('roardino_people').select('id,name,kinds,city,birth,gender,avatar,headline,minor,data').eq('visible', true).order('updated_at', { ascending: false }).limit(500);
  if (error) throw error;
  await sign(data.map((p) => p.avatar));
  // the cities people are in, the most common first; Athens and Αθήνα are one
  const cityCount = new Map();
  data.forEach((p) => { if (!p.city) return; const k = cityKey(p.city); const e = cityCount.get(k) || { name: p.city, n: 0 }; e.n++; cityCount.set(k, e); });
  const cities = [...cityCount.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 10);
  const castOn = () => peopleSide === 'cast' || [...peopleKinds].some((k) => CAST_KINDS.includes(k));
  const filtersUsed = () => !!(castF.from || castF.to || castF.hFrom || castF.hTo || castF.gender || castF.cities.size || castF.hair.size || castF.eyes.size);
  const toggle = (set, k) => { if (set.has(k)) set.delete(k); else set.add(k); draw(); };
  const chip = (on, label, onclick, hue) => h('button', { type: 'button', class: 'fchip' + (on ? ' on' : ''), style: hue ? { '--c': hue } : null, onclick: (e) => { e.preventDefault(); e.stopPropagation(); onclick(); } }, hue ? h('i') : null, label);
  const num = (k, ph) => h('input', { class: 'input num', type: 'number', inputmode: 'numeric', min: '0', placeholder: ph, value: castF[k], 'aria-label': ph, oninput: (e) => { castF[k] = e.target.value; drawGrid(); } });
  function drawFilters() {
    if (!castOn()) { put(filterBox); return; }
    const row = (label, ...kids) => h('div', { class: 'frow' }, h('span', { class: 'flabel' }, label), h('div', { class: 'fbody' }, ...kids));
    const used = [castF.from || castF.to, castF.hFrom || castF.hTo, castF.gender, castF.cities.size, castF.hair.size, castF.eyes.size].filter(Boolean).length;
    const opener = h('button', { type: 'button', class: 'btn sm filters-btn' + (castOpen ? ' on' : ''), onclick: () => { castOpen = !castOpen; drawFilters(); } }, icon('sliders'), t('Filters'), used ? h('b', { class: 'fcount' }, String(used)) : null);
    if (!castOpen) { put(filterBox, h('div', { class: 'filters-line' }, opener)); return; }
    put(filterBox, h('div', { class: 'filters-line only-phone' }, opener), h('section', { class: 'card cast-filters' },
      row(t('Age'), num('from', t('from')), h('span', { class: 'dash' }, '–'), num('to', t('to'))),
      row(t('Height'), num('hFrom', t('cm from')), h('span', { class: 'dash' }, '–'), num('hTo', t('cm to'))),
      row(t('Gender'), ...[['', t('Any')], ['f', t('Woman')], ['m', t('Man')]].map(([v, l]) => chip(castF.gender === v, l, () => { castF.gender = v; draw(); }))),
      cities.length ? row(t('Location'), ...cities.map(([k, e]) => chip(castF.cities.has(k), e.name, () => toggle(castF.cities, k)))) : null,
      row(t('Hair'), ...HAIRS.map(([k, l]) => chip(castF.hair.has(k), t(l), () => toggle(castF.hair, k)))),
      row(t('Eyes'), ...EYES.map(([k, l]) => chip(castF.eyes.has(k), t(l), () => toggle(castF.eyes, k)))),
      filtersUsed() ? h('div', { class: 'fclear' }, h('button', { type: 'button', class: 'btn sm', onclick: () => { castF = { from: '', to: '', hFrom: '', hTo: '', gender: '', cities: new Set(), hair: new Set(), eyes: new Set() }; draw(); } }, icon('x'), t('Clear filters'))) : null));
  }
  function passCast(p) {
    if (!castOn()) return true;
    const L = p.data?.looks || {}, a = age(p.birth), ht = parseInt(L.height, 10);
    if ((castF.from || castF.to) && a == null) return false;
    if (castF.from && a < +castF.from) return false;
    if (castF.to && a > +castF.to) return false;
    if ((castF.hFrom || castF.hTo) && !ht) return false;
    if (castF.hFrom && ht < +castF.hFrom) return false;
    if (castF.hTo && ht > +castF.hTo) return false;
    if (castF.gender && p.gender !== castF.gender) return false;
    if (castF.cities.size && !castF.cities.has(cityKey(p.city))) return false;
    if (castF.hair.size && !HAIRS.some(([k, , w]) => castF.hair.has(k) && hasWord(L.hair, w))) return false;
    if (castF.eyes.size && !EYES.some(([k, , w]) => castF.eyes.has(k) && hasWord(L.eyes, w))) return false;
    return true;
  }
  function drawGrid() {
    const q = peopleQ.trim();
    const shown = data.filter((p) => {
      const ks = (p.kinds || []).map((k) => (k === 'theatre' ? 'actor' : k));
      if (peopleSide !== 'all' && !ks.some((k) => sideOf(k) === SIDES[peopleSide])) return false;
      if (peopleKinds.size && !ks.some((k) => peopleKinds.has(k))) return false;
      if (castOn() && peopleSide === 'cast' && !peopleKinds.size && !PERFORMER(ks) && !ks.includes('singer')) return false;
      if (!passCast(p)) return false;
      return !q || matches(p._keys ??= personKeys(p), q);
    });
    countBox.textContent = shown.length === 1 ? t('1 person') : t('{n} people', { n: shown.length });
    put(grid, shown.length ? shown.map(faceTile) : h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, h('b', {}, t('Nobody here yet')), q || filtersUsed() || peopleKinds.size ? t('Nobody matches all of these. Take a filter away.') : t('We have just started. Invite your people.')));
  }
  function draw() {
    put(sideBox, seg([['all', t('All')], ['cast', t('Cast')], ['crew', t('Crew')], ['creatives', t('Creatives')]], peopleSide, (k) => { peopleSide = k; peopleKinds = new Set(); draw(); }));
    // the specialties as small tinted chips, one tidy line per side (Alex, 5 Nov: "more tidy, no need for glass")
    const sides = peopleSide === 'all' ? ['front', 'back', 'creative'] : [SIDES[peopleSide]];
    put(kindsBox, sides.map((sd) => h('div', { class: 'kind-row' }, peopleSide === 'all' ? h('span', { class: 'flabel' }, t(SIDE_NAME[sd])) : null,
      h('div', { class: 'fbody' }, KINDS.filter((k) => k[2] === sd).map(([k, name]) => chip(peopleKinds.has(k), t(name), () => toggle(peopleKinds, k), HUE[sd]))))));
    drawFilters(); drawGrid();
  }
  peopleRedraw = () => { if (search.isConnected || opts.search) { search.value = peopleQ; draw(); } };
  draw();
}
function faceTile(p) {
  const a = age(p.birth);
  return h('a', { class: 'face', href: `#/p/${p.id}` },
    h('div', { class: 'pic', style: bg(p.avatar) }, urlOf(p.avatar) ? '' : initials(p.name)),
    p.minor ? h('span', { class: 'flag' }, t('Under 18')) : null,
    h('div', { class: 'txt' }, h('b', {}, p.name), h('small', {}, [(p.kinds || []).map(kindName).slice(0, 2).join(' · '), p.city, a != null && PERFORMER(p.kinds) ? `${a}` : ''].filter(Boolean).join(' · '))));
}

/* =====================================================================================================================
   A profile: a portfolio
   ===================================================================================================================== */
// what I saved, newest first, as a grid like the works
function savedGrid() {
  const box = h('div', { class: 'grid' }, h('p', { class: 'wait', style: { gridColumn: '1/-1' } }, t('Loading…')));
  (async () => {
    const { data } = await sb.from('roardino_saves').select('created_at, post:roardino_posts(*, person:roardino_people(id,name,avatar,kinds,headline))').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(120);
    const posts = (data || []).map((x) => x.post).filter(Boolean);
    await sign(posts.flatMap((g) => [(g.media || [])[0]?.path, g.person?.avatar]));
    put(box, posts.length ? posts.map((g) => { const m0 = (g.media || [])[0]; return h('button', { type: 'button', class: 'cell', style: m0?.type === 'image' ? bg(m0.path) : {}, 'aria-label': t('Post'), onclick: () => openPost(g, g.person) }, m0?.type === 'video' ? cellVideo(urlOf(m0.path)) : !m0 ? h('span', { class: 'cell-text' }, (g.body || '').slice(0, 90)) : null); })
      : h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, h('b', {}, t('Nothing saved yet')), t('Tap the bookmark under a post to keep it here. Only you see it.')));
  })();
  return box;
}
async function viewPerson(id) {
  const { data: p, error } = await sb.from('roardino_people').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  const mineTab = mine.some((m) => m.id === id) ? 'me' : 'people';
  if (!p) return frame(mineTab, h('div', { class: 'empty' }, h('b', {}, t('Not found')), t('This profile does not exist or is not shown to you.')));
  document.title = `${p.name} · Roardino`;
  const own = p.owner === session.user.id;
  const photos = (p.photos || []).map((x) => x.path);
  const [{ data: stats }, { data: grid }, { data: ctRow }, theirStories] = await Promise.all([
    sb.rpc('roardino_person_stats', { p: id }),
    sb.from('roardino_posts').select('*').eq('person_id', id).order('pos', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }).limit(120),
    sb.from('roardino_contacts').select('email,phone').eq('person_id', id).maybeSingle(),
    loadStories(id)]);
  await sign([p.avatar, p.data?.cover, ...photos, p.reel, p.cv, ...(grid || []).flatMap((g) => (g.media || []).slice(0, 1).map((m) => m.path))]);
  const d = p.data || {};
  const L = d.looks || {}, S = d.skills || {}, C = d.contact || {};
  const a = age(p.birth);
  const fact = (k, v) => (v ? h('div', { class: 'fact' }, h('small', {}, t(k)), h('span', {}, v)) : null);
  const facts = [fact('Age', a != null && PERFORMER(p.kinds) ? `${a}` : ''), fact('City', p.city), fact('Height', L.height ? `${L.height} cm` : ''), fact('Clothes', L.size), fact('Shoe', L.shoe), fact('Hair', L.hair), fact('Eyes', L.eyes), fact('Languages', S.languages), fact('Agent', d.agent)].filter(Boolean);
  const skillRows = [['Accents / dialects', S.accents], ['Dance', S.dance], ['Music / singing', S.music], ['Sports', S.sports], ['Driving licence', S.driving], ['Equipment', d.gear], ['Software', S.software], ['Other', S.other]].filter(([, v]) => v);
  const followBtn = own ? null : h('button', { type: 'button', class: 'btn' + (follows.has(id) ? '' : ' main'), onclick: async (e) => {
    const on = follows.has(id);
    const btn = e.currentTarget;
    const { error: er } = on ? await sb.from('roardino_follows').delete().eq('user_id', session.user.id).eq('person_id', id) : await sb.from('roardino_follows').insert({ person_id: id });
    if (er) return fail(er);
    if (on) follows.delete(id); else follows.add(id);
    btn.className = 'btn' + (follows.has(id) ? '' : ' main'); btn.textContent = follows.has(id) ? t('Following') : t('Follow');
  } }, follows.has(id) ? t('Following') : t('Follow'));
  const K = ctRow || {}; // email and phone, only when this account may see them
  // Contact (Alex, 5 Nov): Message through RoarMe first, then Email, then Call; no Instagram. Made afresh each time it is
  // shown, so the phone's Contact window gets working buttons too
  const contactList = () => (own ? [] : p.minor
    ? [h('button', { type: 'button', class: 'btn sm', onclick: () => messageOnRoarMe(p) }, icon('talk'), t('Message the parent')), p.guardian?.email && h('a', { class: 'btn sm', href: `mailto:${p.guardian.email}` }, icon('mail'), t('Email the parent')), p.guardian?.phone && h('a', { class: 'btn sm', href: `tel:${p.guardian.phone}` }, icon('phone'), t('Call the parent'))]
    : [h('button', { type: 'button', class: 'btn sm main', onclick: () => messageOnRoarMe(p) }, icon('talk'), t('Message')), K.email && h('a', { class: 'btn sm', href: `mailto:${K.email}` }, icon('mail'), t('Email')), K.phone && h('a', { class: 'btn sm', href: `tel:${K.phone}` }, icon('phone'), t('Call')), C.site && h('a', { class: 'btn sm', href: /^https?:/.test(C.site) ? C.site : `https://${C.site}`, target: '_blank', rel: 'noopener' }, icon('globe'), t('Website'))]).filter(Boolean);
  const contact = contactList();
  const reel = p.reel ? h('video', { class: 'reel', src: urlOf(p.reel), controls: true, playsInline: true, preload: 'metadata' }) : ytEmbed(p.reel_url) ? h('iframe', { class: 'reel', src: ytEmbed(p.reel_url), allow: 'autoplay; fullscreen; picture-in-picture', allowFullscreen: true, title: 'Showreel' }) : null;
  // Instagram's profile (Alex, 4 Nov): the round picture, the name with the buttons, the numbers, the bio; then Work,
  // Photos and Details as tabs under one line
  const details = h('div', { class: 'ig-details' },
    p.bio ? h('div', { class: 'block', style: { marginTop: 0, marginBottom: '18px' } }, h('h2', {}, t('About')), h('p', {}, p.bio)) : null,
    facts.length ? h('div', { class: 'facts' }, facts) : null,
    reel ? h('div', { class: 'block' }, h('h2', {}, p.reel ? t('Self-tape') : 'Showreel'), reel) : null,
    skillRows.length ? h('div', { class: 'block' }, h('h2', {}, t('Skills and tools')), h('div', { class: 'facts', style: { marginTop: 0 } }, skillRows.map(([k, v]) => fact(k, v)))) : null,
    (d.credits || []).length ? h('div', { class: 'block' }, h('h2', {}, t('Credits')), h('div', { class: 'credits' }, d.credits.map((c) => h('div', {}, c)))) : null,
    d.studies ? h('div', { class: 'block' }, h('h2', {}, t('Studies')), h('p', {}, d.studies)) : null,
    p.cv ? h('div', { class: 'acts' }, h('a', { class: 'btn', href: urlOf(p.cv), target: '_blank', rel: 'noopener' }, t('Open the CV'))) : null,
    !p.bio && !facts.length && !reel && !skillRows.length && !(d.credits || []).length && !d.studies ? h('div', { class: 'empty' }, t('No details yet.')) : null);
  const photoPosts = (grid || []).filter((g) => g.kind === 'photo');
  const pics = h('div', { class: 'grid' }, photos.length || photoPosts.length ? [...photoPosts.map((g) => { const m0 = (g.media || [])[0]; return h('button', { type: 'button', class: 'cell', style: m0?.type === 'image' ? bg(m0.path) : {}, 'aria-label': t('Photo'), onclick: () => openPost(g, p) }, m0?.type === 'video' ? cellVideo(urlOf(m0.path)) : null); }), ...photos.map((ph) => h('button', { type: 'button', class: 'cell', style: bg(ph), 'aria-label': t('Photo'), onclick: () => openWin(p.name, h('img', { src: urlOf(ph), alt: '', style: { width: '100%', borderRadius: '12px' } }), (c) => [h('button', { type: 'button', class: 'btn', onclick: c }, t('Close'))]) }))] : h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, t('No photos yet.')));
  const work = gridBlock(p, (grid || []).filter((g) => g.kind !== 'photo'), own);
  const body = h('div');
  const tabRow = h('div', { class: 'ig-tabs' });
  let tab = 'work';
  const drawTab = () => {
    // My Work, My Photos, My Bio on my own profile; Work, Photos, Bio on someone else's (Alex, 5 Nov)
    put(tabRow, [['work', t('Portfolio'), 'grid'], ['photos', own ? t('My Photos') : t('Photos'), 'pic'], ['details', own ? t('My Bio') : t('Bio'), 'user'], ...(own ? [['saved', t('Saved'), 'bookmark']] : [])].map(([k, s2, ic]) => h('button', { type: 'button', class: tab === k ? 'on' : '', onclick: () => { tab = k; drawTab(); } }, icon(ic), s2)));
    // on my own profile each tab adds or edits in place (Alex, 5 Nov)
    // as a round glass plus at the left of the tabs, its words only on hover (Alex, 5 Nov: "a plus on the left, the plus alone says Add work")
    const plus = (label, ic, extra) => h(extra.href ? 'a' : 'button', { type: extra.href ? null : 'button', class: 'btn main tab-plus', title: label, 'aria-label': label, ...extra }, icon(ic), h('span', { class: 'lbl' }, label));
    const act = !own ? null
      : tab === 'work' ? plus(t('Add work'), 'plus', { onclick: () => composeWin('work', p.id, () => route()) })
        : tab === 'photos' ? plus(t('Add photo'), 'plus', { onclick: () => composeWin('photo', p.id, () => route()) })
          : tab === 'saved' ? null : plus(t('Edit bio'), 'edit', { href: `#/edit/${p.id}` });
    if (act) tabRow.append(act);
    put(body, tab === 'work' ? work : tab === 'photos' ? pics : tab === 'saved' ? savedGrid() : details);
  };
  drawTab();
  frame(mineTab,
    (p.data?.cover || own) ? h('div', { class: 'ig-cover' }, coverOf(p, own)) : null,
    h('section', { class: 'ig-head' + (p.data?.cover || own ? ' under-cover' : '') },
      h('div', { class: 'ig-av' + (theirStories.length ? ' has' : ''), role: theirStories.length ? 'button' : null, title: theirStories.length ? t('Stories') : null, onclick: theirStories.length ? () => openStories(theirStories, 0) : null },
        h('span', { class: 'r big' + (theirStories.length ? '' : ' plain') }, h('i', { style: bg(photos[0] || p.avatar) }, urlOf(photos[0] || p.avatar) ? '' : initials(p.name)))),
      // a tidier head (Alex, 5 Nov): the name with Edit profile and + on the right; the numbers, what they do and the city on one line
      h('div', { class: 'ig-info' },
        h('div', { class: 'ig-name' }, h('h1', {}, p.name), p.handle ? h('span', { class: 'ig-handle' }, '@' + p.handle) : null, h('span', { class: 'grow' }),
          own ? h('div', { class: 'ig-acts' }, h('a', { class: 'btn sm main', href: `#/edit/${p.id}` }, icon('edit'), t('Edit profile')), h('button', { type: 'button', class: 'btn sm main round', title: t('Create'), 'aria-label': t('Create'), onclick: createMenu }, icon('plus'))) : followBtn),
        h('div', { class: 'ig-row' },
          stats ? h('div', { class: 'ig-stats' }, [[stats.posts, t('works'), null], [stats.followers, t('followers'), 'followers'], [stats.bravos, t('likes'), 'likes']].map(([n, s2, w]) => h(w ? 'button' : 'span', { type: w ? 'button' : null, class: w ? 'stat-btn' : null, onclick: w ? () => peopleList(p, w) : null }, h('b', {}, String(n)), ' ', s2))) : null,
          h('div', { class: 'chips' }, (p.kinds || []).map(kindChip), p.minor ? h('span', { class: 'chip', style: { '--c': '#e0a33a' } }, h('i'), t('Under 18 · with a parent')) : null),
          h('span', { class: 'ig-meta' }, [p.city, a != null && PERFORMER(p.kinds) ? t('{n} years', { n: a }) : '', L.height ? `${L.height} cm` : ''].filter(Boolean).join(' · '))),
        p.headline ? h('p', { class: 'ig-line' }, p.headline) : null,
        p.bio ? h('p', { class: 'ig-bio' }, p.bio) : null,
        contact.filter(Boolean).length ? h('div', { class: 'acts', style: { marginTop: 0 } }, contact.filter(Boolean).map((b2) => { b2.classList.add('sm'); return b2; })) : null)),
    phoneHead(p, { own, stats, theirStories, photos, followBtn, contactList, a, L }),
    tabRow, body);
}
// a profile on a phone, as Instagram's (Alex, 5 Nov): the picture with the numbers beside it, the name, the lines about them,
// then two equal buttons (mine: Edit profile and Settings; someone else's: Follow and Contact); no cover there
function phoneHead(p, { own, stats, theirStories, photos, followBtn, contactList, a, L }) {
  const pic = photos[0] || p.avatar;
  const pick = own ? h('input', { type: 'file', accept: 'image/*,video/*', hidden: true, onchange: async (e) => { const f0 = e.target.files[0]; e.target.value = ''; const f = f0 && (/^video/.test(f0.type) ? f0 : await cropImage(f0, SHAPES.story)); const ed = f && await storyEditor(f); if (ed) await addStory(ed.file, ed.overlays); } }) : null;
  const av = h('div', { class: 'igm-av' + (theirStories.length ? ' has' : ''), onclick: theirStories.length ? () => openStories(theirStories, 0) : null },
    h('span', { class: 'r' + (theirStories.length ? '' : ' plain') }, h('i', { style: bg(pic) }, urlOf(pic) ? '' : initials(p.name))),
    own ? h('button', { type: 'button', class: 'igm-add', 'aria-label': t('Add to your story'), html: ICON.plus, onclick: (e) => { e.stopPropagation(); storySource(pick); } }) : null, pick);
  const num = (n, label, w) => h(w ? 'button' : 'div', { type: w ? 'button' : null, class: 'igm-n' + (w ? ' stat-btn' : ''), onclick: w ? () => peopleList(p, w) : null }, h('b', {}, String(n ?? 0)), h('small', {}, label));
  const site = p.data?.contact?.site;
  const cBtns = contactList();
  const second = own ? h('a', { class: 'btn igm-btn', href: '#/settings' }, t('Settings'))
    : cBtns.length ? h('button', { type: 'button', class: 'btn igm-btn', onclick: () => openWin(t('Contact {name}', { name: p.name }), h('div', { class: 'acts contact-acts', style: { marginTop: 0 } }, contactList()), (c) => [h('button', { type: 'button', class: 'btn', onclick: c }, t('Close'))]) }, t('Contact'))
      : h('button', { type: 'button', class: 'btn igm-btn', onclick: async () => { const url = `${location.origin}${location.pathname}#/p/${p.id}`; try { if (navigator.share) await navigator.share({ title: p.name, url }); else { await navigator.clipboard.writeText(url); toast(t('Link copied')); } } catch { /* closed */ } } }, t('Share profile'));
  const first = own ? h('a', { class: 'btn igm-btn', href: `#/edit/${p.id}` }, t('Edit profile')) : followBtn ? followBtn.cloneNode(true) : null;
  if (first && !own) {
    // the phone's Follow works through the page's own Follow button and shows what it shows
    first.classList.add('igm-btn');
    first.addEventListener('click', () => followBtn.click());
    new MutationObserver(() => { first.className = followBtn.className + ' igm-btn'; first.textContent = followBtn.textContent; }).observe(followBtn, { childList: true, attributes: true });
  }
  return h('section', { class: 'igm' },
    h('div', { class: 'igm-top' }, av, h('div', { class: 'igm-right' }, h('b', { class: 'igm-name' }, p.name),
      h('div', { class: 'igm-nums' }, num(stats?.posts, t('works')), num(stats?.followers, t('followers'), 'followers'), num(stats?.bravos, t('likes'), 'likes')))),
    p.handle ? h('p', { class: 'igm-handle' }, '@' + p.handle) : null,
    p.headline ? h('p', { class: 'igm-line' }, p.headline) : null,
    p.bio ? h('p', { class: 'igm-bio' }, p.bio) : null,
    (p.kinds || []).length || p.minor ? h('div', { class: 'chips' }, (p.kinds || []).map(kindChip), p.minor ? h('span', { class: 'chip', style: { '--c': '#e0a33a' } }, h('i'), t('Under 18 · with a parent')) : null) : null,
    h('p', { class: 'igm-meta' }, [p.city, a != null && PERFORMER(p.kinds) ? t('{n} years', { n: a }) : '', L.height ? `${L.height} cm` : ''].filter(Boolean).join(' · ')),
    site ? h('a', { class: 'igm-link', href: /^https?:/.test(site) ? site : `https://${site}`, target: '_blank', rel: 'noopener' }, h('span', { html: ICON.link }), site.replace(/^https?:\/\//, '').replace(/\/$/, '')) : null,
    h('div', { class: 'igm-btns' }, first, second));
}

// the profile's posts as Instagram's grid; its owner can put them in any order
function gridBlock(p, rows, own) {
  let editing = false;
  const box = h('div', { class: 'grid' });
  const head = h('div', { class: 'head', style: { margin: '0 0 10px', justifyContent: 'flex-end' } });
  if (own && rows.length > 1) head.append(h('button', { type: 'button', class: 'btn sm', onclick: (e) => { editing = !editing; e.currentTarget.textContent = editing ? t('Done') : t('Reorder'); if (!editing) save(); draw(); } }, t('Reorder')));
  let drag = null;
  const move = (from, to) => { if (to < 0 || to >= rows.length) return; const [x] = rows.splice(from, 1); rows.splice(to, 0, x); draw(); };
  async function save() {
    const res = await Promise.all(rows.map((r, i) => (r.pos === i ? null : sb.from('roardino_posts').update({ pos: i }).eq('id', r.id))));
    const bad = res.find((x) => x?.error);
    if (bad) fail(bad.error); else { rows.forEach((r, i) => { r.pos = i; }); toast(t('Order kept')); }
  }
  function draw() {
    box.classList.toggle('editing', editing);
    if (!rows.length) { put(box, h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, own ? t('Add your first work.') : t('No work posted yet.'))); return; }
    put(box, ...rows.map((r, i) => {
      const m = (r.media || [])[0];
      return h(editing ? 'div' : 'button', { type: editing ? null : 'button', class: 'cell', draggable: editing ? 'true' : null, style: m && m.type === 'image' ? bg(m.path) : {},
        onclick: editing ? null : () => openPost(r, p),
        ondragstart: () => { drag = i; }, ondragover: (e) => e.preventDefault(), ondrop: (e) => { e.preventDefault(); if (drag != null) move(drag, i); drag = null; } },
        m?.type === 'video' ? cellVideo(urlOf(m.path)) : null,
        m?.type === 'video' ? h('span', { class: 'play', html: ICON.play }) : null,
        !m ? h('p', {}, (r.body || '').slice(0, 140)) : null,
        editing ? h('span', { class: 'cell-move' },
          h('button', { type: 'button', class: 'btn sm round', html: ICON.left, 'aria-label': t('Earlier'), onclick: () => move(i, i - 1) }),
          h('button', { type: 'button', class: 'btn sm round', html: ICON.right, 'aria-label': t('Later'), onclick: () => move(i, i + 1) })) : null);
    }));
  }
  draw();
  return h('div', {}, head, box);
}
async function openPost(r, p) {
  const cards = await posts([{ ...r, person: p }], () => route());
  openWin(p.name, h('div', { class: 'in-win' }, cards), (c) => [h('button', { type: 'button', class: 'btn', onclick: c }, t('Close'))]);
}

/* =====================================================================================================================
   My applications and seats, and the profile form
   ===================================================================================================================== */
async function viewMe() {
  document.title = 'Roardino · ' + t('Me');
  const [{ data: applies }, { data: seats }] = await Promise.all([
    sb.from('roardino_applies').select('*, call:roardino_calls(id,title,city), person:roardino_people(name)').eq('owner', session.user.id).order('created_at', { ascending: false }),
    sb.from('roardino_seats').select('*, sem:roardino_seminars(id,title,starts_at)').eq('user_id', session.user.id)]);
  const state = { new: 'Sent', shortlist: 'On the shortlist', no: 'Not this time' };
  frame('me', h('div', { class: 'head' }, h('h1', {}, t('Me')), h('span', { class: 'hint' }, session.user.email), h('span', { class: 'grow' }),
    h('button', { type: 'button', class: 'btn', onclick: () => sb.auth.signOut() }, icon('out'), t('Sign out'))),
  h('div', { class: 'block' }, h('h2', {}, t('My profiles'))),
  h('div', { class: 'faces' }, mine.map(faceTile),
    h('a', { class: 'add-pic', href: '#/edit/new' }, h('span', { class: 'add-ic', html: ICON.plus }), t('New profile')),
    h('a', { class: 'add-pic', href: '#/edit/kid' }, h('span', { class: 'add-ic', html: ICON.child }), t('My child\'s profile'))),
  h('p', { class: 'hint', style: { marginTop: '10px' } }, t('One account can hold several profiles: your own, and your children\'s as their parent.')),
  (applies || []).length ? h('div', { class: 'block' }, h('h2', {}, t('My applications')), h('div', { class: 'credits' }, applies.map((x) => h('a', { href: `#/c/${x.call?.id}` }, `${x.call?.title || ''} · ${t('as {name}', { name: x.person?.name || '' })} · ${t(state[x.status])}`)))) : null,
  (seats || []).length ? h('div', { class: 'block' }, h('h2', {}, t('My seats')), h('div', { class: 'credits' }, seats.map((x) => h('a', { href: '#/seminars' }, `${x.sem?.title || ''}${x.sem?.starts_at ? ' · ' + when(x.sem.starts_at) : ''}`)))) : null);
}

async function viewEdit(which) {
  const kid = which === 'kid';
  const old = which === 'new' || kid ? null : mine.find((m) => m.id === which);
  if (!old && !['new', 'kid'].includes(which)) { location.hash = '#/me'; return; }
  document.title = (old ? t('Edit profile') : t('New profile')) + ' · Roardino';
  const id = old?.id || crypto.randomUUID();
  const p = structuredClone(old || { id, name: kid ? '' : (session.user.user_metadata?.name || ''), kinds: [], data: {}, photos: [], visible: true, guardian: kid ? {} : null });
  const d = p.data || (p.data = {});
  d.looks ||= {}; d.skills ||= {}; d.contact ||= {}; d.credits ||= [];
  p.kinds = [...new Set((p.kinds || []).map((k) => (k === 'theatre' ? 'actor' : k)))];
  const { data: ctRow } = old ? await sb.from('roardino_contacts').select('*').eq('person_id', id).maybeSingle() : { data: null };
  const ct = { email: ctRow?.email ?? (kid ? '' : session.user.email), phone: ctRow?.phone || '', show: !!ctRow?.show };
  delete d.contact.email; delete d.contact.phone; delete d.contact.show; // they live in roardino_contacts
  let handleTouched = !!p.handle;
  const handleIn = h('div', { class: 'handle-in' }, h('span', {}, '@'), input(p.handle || slugOf(p.name), { autocapitalize: 'off', autocomplete: 'off', spellcheck: false, maxlength: 30,
    oninput: (e) => { handleTouched = true; e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''); p.handle = e.target.value; } }));
  if (!p.handle) p.handle = slugOf(p.name);
  const followName = () => { if (!handleTouched) { p.handle = slugOf(p.name); const f = handleIn.querySelector('input'); if (f) f.value = p.handle; } };
  // pictures in their order, the first the main one: { path } already uploaded or { file } picked now (uploaded on Save)
  const pics = (p.photos || []).map((x) => ({ path: x.path }));
  let reelFile = null, cvFile = null, coverFile = null, coverGone = false;
  await sign(pics.map((x) => x.path));

  const bind = (obj, key, el) => { el.addEventListener('input', () => { obj[key] = el.value; }); return el; };
  const isMinor = () => { const a = age(p.birth); return kid || (a != null && a < 18); };
  const sec = (title, ...kids) => h('section', { class: 'sec' }, h('h2', {}, title), ...kids);
  const guard = h('div');
  const looks = h('div');
  const kindsBox = h('div', { class: 'pills' });
  const drawKinds = () => {
    put(kindsBox, ...KINDS.map(([k, s]) => h('button', { type: 'button', class: 'pill' + (p.kinds.includes(k) ? ' on' : ''), onclick: (e) => { e.preventDefault(); e.stopPropagation(); p.kinds = p.kinds.includes(k) ? p.kinds.filter((x) => x !== k) : [...p.kinds, k]; drawKinds(); drawLooks(); drawTools(); drawLimits(); drawPicHint(); } }, t(s))));
  };
  const drawGuard = () => {
    if (!isMinor()) { put(guard, ); return; }
    const g = p.guardian || (p.guardian = {});
    if (!g.email) g.email = session.user.email;
    put(guard, h('section', { class: 'sec guardian' },
      h('h2', {}, t('The parent or guardian')),
      h('p', { class: 'hint' }, t('This profile is under 18. You manage it from your own account, and it is seen only by trusted productions and casting directors. Anyone interested talks only to you.')),
      h('div', { class: 'row' }, field(t('Parent\'s full name'), bind(g, 'name', input(g.name))), field(t('Relation'), select([['', '—'], ['Mother', t('Mother')], ['Father', t('Father')], ['Guardian', t('Guardian')]], g.relation, { onchange: (e) => { g.relation = e.target.value; } }))),
      h('div', { class: 'row' }, field(t('Parent\'s phone'), bind(g, 'phone', input(g.phone, { type: 'tel' }))), field(t('Parent\'s email'), bind(g, 'email', input(g.email, { type: 'email' })))),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!g.consent_at, onchange: (e) => { g.consent_at = e.target.checked ? new Date().toISOString() : null; } }),
        h('span', {}, t('I am the parent or legal guardian and I agree that this profile is made and seen by trusted productions for castings.')))));
  };
  const S = d.skills;
  // in front of the camera (actor, model, dancer, extra): looks and the skills a casting asks for
  const drawLooks = () => {
    if (!PERFORMER(p.kinds) && !kid) { put(looks, ); return; }
    const L = d.looks;
    put(looks, 
      sec(t('Looks'),
        h('div', { class: 'row' }, field(t('Height (cm)'), bind(L, 'height', input(L.height, { inputmode: 'numeric' }))), field(t('Clothes size'), bind(L, 'size', input(L.size, { placeholder: t('e.g. M, 38') }))), field(t('Shoe size'), bind(L, 'shoe', input(L.shoe, { inputmode: 'numeric' })))),
        h('div', { class: 'row' }, field(t('Hair'), bind(L, 'hair', input(L.hair, { placeholder: t('e.g. brown, long') }))), field(t('Eyes'), bind(L, 'eyes', input(L.eyes))), field(t('Tattoos / piercings'), bind(L, 'marks', input(L.marks, { placeholder: t('none / where') }))))),
      sec(t('Skills'),
        h('div', { class: 'row' }, field(t('Languages'), bind(S, 'languages', input(S.languages, { placeholder: t('Greek, English') }))), field(t('Accents / dialects'), bind(S, 'accents', input(S.accents, { placeholder: t('Cretan, Cypriot') })))),
        h('div', { class: 'row' }, field(t('Dance'), bind(S, 'dance', input(S.dance, { placeholder: t('hip hop, contemporary, folk') }))), field(t('Music / singing'), bind(S, 'music', input(S.music)))),
        h('div', { class: 'row' }, field(t('Sports'), bind(S, 'sports', input(S.sports))), field(t('Driving licence'), bind(S, 'driving', input(S.driving, { placeholder: t('car, motorbike') })))),
        field(t('Other'), bind(S, 'other', input(S.other, { placeholder: t('anything else you can do') })))));
  };
  // behind the camera (and music): what they work with
  const tools = h('div');
  const drawTools = () => {
    if (!CREW(p.kinds)) { put(tools, ); return; }
    put(tools, sec(t('Equipment and tools'),
      field(t('Equipment you own'), bind(d, 'gear', input(d.gear, { placeholder: t('e.g. Sony FX6, Aputure lights, drone') }))),
      field(t('Software'), bind(S, 'software', input(S.software, { placeholder: t('e.g. DaVinci Resolve, After Effects, Premiere') })))));
  };
  // pay and travel for everyone; swimwear only for whoever is in front of the camera
  const L2 = d.limits || (d.limits = {});
  const limits = h('div', { class: 'pills' });
  const drawLimits = () => put(limits, ...[['unpaid', 'I also take unpaid work'], ['travel', 'I travel'], ...(PERFORMER(p.kinds) || kid ? [['swim', 'Swimwear / underwear: yes']] : [])]
    .map(([k, s]) => h('button', { type: 'button', class: 'pill' + (L2[k] ? ' on' : ''), onclick: (e) => { e.preventDefault(); e.stopPropagation(); L2[k] = !L2[k]; e.currentTarget.classList.toggle('on', !!L2[k]); } }, t(s))));
  const picHint = h('p', { class: 'hint' });
  const drawPicHint = () => { picHint.textContent = PERFORMER(p.kinds) || kid ? t('Add a close-up of the face, a full-length, a profile and a free one, no filters. The first is the main one.') : t('The first is your profile picture. Your work goes up from the Feed.'); };

  // pictures: the first one is the main one and the avatar
  const thumbs = h('div', { class: 'thumbs' });
  const pickPics = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: async (e) => { const list = [...e.target.files].slice(0, 10 - pics.length); e.target.value = ''; for (const f of await cropAll(list, SHAPES.portrait)) pics.push({ file: f, u: URL.createObjectURL(f) }); drawThumbs(); } });
  const drawThumbs = () => {
    put(thumbs, ...pics.map((it, i) => h('div', { class: 'thumb', style: { backgroundImage: `url("${it.u || urlOf(it.path)}")` }, title: i ? t('Make it the main one') : t('The main one'), onclick: () => { pics.splice(i, 1); pics.unshift(it); drawThumbs(); } },
      i === 0 ? h('span', { class: 'star' }, t('Main')) : null,
      h('button', { type: 'button', class: 'x', html: ICON.x, 'aria-label': t('Remove'), onclick: (e) => { e.stopPropagation(); pics.splice(i, 1); drawThumbs(); } }))),
    pics.length < 10 ? h('button', { type: 'button', class: 'add-pic', onclick: () => pickPics.click() }, t('+ Photos')) : null);
  };
  const reelName = h('span', { class: 'hint' }, p.reel ? t('A self-tape is up.') : '');
  const cvName = h('span', { class: 'hint' }, p.cv ? t('A CV is up.') : '');
  const coverName = h('span', { class: 'hint' }, d.cover ? t('A cover is up.') : '');
  const credits = area((d.credits || []).join('\n'), { rows: 4, placeholder: t('One per line, e.g.\nMusic video "X" by Y, 2026, lead\nCommercial for Z, 2025') });
  const C = d.contact;
  const consentBox = h('input', { type: 'checkbox', checked: !!p.consent_at });
  const msg = h('p', { class: 'msg' });
  const saveBtn = h('button', { type: 'button', class: 'btn main', onclick: save }, old ? t('Save') : t('Create profile'));

  async function save() {
    if (!p.name?.trim()) return toast(t('Write the name.'));
    if (!p.kinds.length) return toast(t('Pick at least one thing you do.'));
    if (kid && !p.birth) return toast(t('Add the child\'s date of birth.'));
    if (isMinor()) {
      const g = p.guardian || {};
      if (!g.name || !g.phone || !g.email) return toast(t('Fill in the parent\'s details.'));
      if (!g.consent_at) return toast(t('The parent\'s consent is needed.'));
    } else p.guardian = null;
    if (!consentBox.checked) return toast(t('Your consent for the details is needed.'));
    saveBtn.disabled = true; msg.textContent = t('Saving…'); msg.className = 'msg';
    try {
      const todo = pics.filter((x) => x.file).length;
      let n = 0;
      for (const it of pics) if (it.file) { msg.textContent = t('Uploading photo {n} of {all}…', { n: ++n, all: todo }); it.path = await upload(id, it.file, 'pics/'); delete it.file; }
      const allPics = pics.map((x) => ({ path: x.path }));
      const oldCover = d.cover;
      if (coverFile) { msg.textContent = t('Uploading cover…'); d.cover = await upload(id, coverFile, 'cover/'); } else if (coverGone) d.cover = null;
      if (oldCover && oldCover !== d.cover && !/^https?:/.test(oldCover)) removeFiles([oldCover]);
      let reel = p.reel, cv = p.cv;
      if (reelFile) { msg.textContent = t('Uploading video…'); reel = await upload(id, reelFile, 'tape/'); }
      if (cvFile) cv = await upload(id, cvFile, 'cv/');
      d.credits = credits.value.split('\n').map((x) => x.trim()).filter(Boolean);
      const row = {
        id, name: p.name.trim(), kinds: p.kinds, city: p.city || null, birth: p.birth || null, gender: p.gender || null,
        handle: p.handle || null, headline: p.headline || null, bio: p.bio || null, guardian: p.guardian, data: d,
        photos: allPics, avatar: allPics[0]?.path || null, reel, reel_url: p.reel_url || null, cv,
        visible: p.visible !== false, consent_at: p.consent_at || new Date().toISOString(),
      };
      if (row.handle && !HANDLE_RE.test(row.handle)) { const e2 = new Error(t('The username needs 3 to 30 letters a-z, numbers, dots or underscores.')); throw e2; }
      const { error } = old ? await sb.from('roardino_people').update(row).eq('id', id) : await sb.from('roardino_people').insert(row);
      if (error?.code === '23505' && /handle/.test(error.message || '')) throw new Error(t('@{h} is taken. Try another username.', { h: row.handle }));
      if (error) throw error;
      tagPeople = null;
      const minor = isMinor();
      const c2 = await sb.from('roardino_contacts').upsert({ person_id: id, email: minor ? null : ct.email?.trim() || null, phone: minor ? null : ct.phone?.trim() || null, show: !minor && ct.show });
      if (c2.error) throw c2.error;
      // pictures taken out, the old self-tape or CV replaced: away from the bucket
      const gone = (old?.photos || []).map((x) => x.path).filter((x) => !allPics.some((y) => y.path === x));
      if (old?.reel && old.reel !== reel) gone.push(old.reel);
      if (old?.cv && old.cv !== cv) gone.push(old.cv);
      removeFiles(gone);
      await loadMine();
      toast(old ? t('Saved') : t('Your profile is ready'));
      location.hash = `#/p/${id}`;
    } catch (e) { msg.textContent = errText(e); msg.className = 'msg err'; saveBtn.disabled = false; }
  }
  async function remove() {
    if (!(await ask(t('Delete the profile "{name}" for good, with its photos and posts?', { name: old.name })))) return;
    const { data: ps } = await sb.from('roardino_posts').select('media').eq('person_id', id);
    const { error } = await sb.from('roardino_people').delete().eq('id', id);
    if (error) return fail(error);
    removeFiles([...(old.photos || []).map((x) => x.path), old.reel, old.cv, ...(ps || []).flatMap((x) => (x.media || []).map((m) => m.path))]);
    await loadMine(); toast(t('Deleted')); location.hash = '#/me';
  }

  drawKinds(); drawGuard(); drawLooks(); drawTools(); drawLimits(); drawPicHint(); drawThumbs();
  frame('me', h('div', { class: 'form' },
    h('div', { class: 'head' }, h('h1', {}, old ? t('Your profile') : kid ? t('My child\'s profile') : t('New profile'))),
    sec(kid ? t('The child') : t('Who you are'),
      h('div', { class: 'row' }, field(kid ? t('Child\'s full name') : t('Full name or stage name'), bind(p, 'name', input(p.name, { oninput: () => setTimeout(followName) }))), field(t('City'), bind(p, 'city', input(p.city, { placeholder: t('e.g. Athens') })))),
      h('div', { class: 'row' },
        field(t('Date of birth'), input(p.birth, { type: 'date', oninput: (e) => { p.birth = e.target.value; drawGuard(); } }), kid ? null : t('Not shown; only the age shows, and only for people in front of the camera.')),
        field(t('Gender'), select(GENDERS.map(([v, s]) => [v, t(s)]), p.gender, { onchange: (e) => { p.gender = e.target.value; } }))),
      field(t('Username'), handleIn, t('People tag you with it: @{h}. Letters a-z, numbers, dots.', { h: p.handle || 'your.name' })),
      field(t('One line about you'), bind(p, 'headline', input(p.headline, { maxlength: 120, placeholder: t('e.g. Stage and screen actor, dances contemporary') }))),
      field(t('What you do'), kindsBox, t('Pick all that apply.'))),
    guard,
    sec(t('Photos and video'),
      picHint, thumbs, pickPics,
      field(t('Cover picture'), h('div', { class: 'acts', style: { marginTop: 0 } },
        h('button', { type: 'button', class: 'btn sm', onclick: () => $('#coverIn').click() }, icon('pic'), d.cover ? t('Change cover') : t('Upload cover')), coverName,
        d.cover ? h('button', { type: 'button', class: 'btn sm red', onclick: (e) => { coverGone = true; coverFile = null; coverName.textContent = t('The cover goes on Save.'); e.currentTarget.remove(); } }, t('Remove')) : null,
        h('input', { id: 'coverIn', type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => { const f = e.target.files[0]; e.target.value = ''; coverFile = f ? await cropImage(f, SHAPES.cover) : null; coverGone = false; coverName.textContent = coverFile ? t('A new cover, ready to save.') : ''; } })), t('The wide picture over your card and your profile.')),
      h('div', { class: 'row' },
        field(t('Self-tape or showreel (video up to 200 MB)'), h('div', { class: 'acts', style: { marginTop: 0 } },
          h('button', { type: 'button', class: 'btn sm', onclick: () => $('#reelIn').click() }, p.reel ? t('Change video') : t('Upload video')), reelName,
          h('input', { id: 'reelIn', type: 'file', accept: 'video/*', hidden: true, onchange: (e) => { reelFile = e.target.files[0] || null; reelName.textContent = reelFile ? reelFile.name : ''; } }))),
        field(t('or a link (YouTube, Vimeo)'), bind(p, 'reel_url', input(p.reel_url, { type: 'url', placeholder: 'https://' }))))),
    looks,
    tools,
    sec(t('Experience'),
      field(t('About you'), bind(p, 'bio', area(p.bio, { rows: 4 }))),
      field(t('Credits'), credits),
      h('div', { class: 'row' }, field(t('Studies'), bind(d, 'studies', input(d.studies, { placeholder: t('film school, drama, dance…') }))), field(t('Agent'), bind(d, 'agent', input(d.agent, { placeholder: t('if you have one') })))),
      field(t('CV (PDF)'), h('div', { class: 'acts', style: { marginTop: 0 } },
        h('button', { type: 'button', class: 'btn sm', onclick: () => $('#cvIn').click() }, p.cv ? t('Change PDF') : t('Upload PDF')), cvName,
        h('input', { id: 'cvIn', type: 'file', accept: 'application/pdf', hidden: true, onchange: (e) => { cvFile = e.target.files[0] || null; cvName.textContent = cvFile ? cvFile.name : ''; } })))),
    sec(t('Contact and limits'),
      isMinor() ? h('p', { class: 'hint' }, t('For a minor, contact goes only through the parent.')) : h('div', {},
        h('div', { class: 'row' }, field(t('Email'), bind(ct, 'email', input(ct.email, { type: 'email' }))), field(t('Phone'), bind(ct, 'phone', input(ct.phone, { type: 'tel' })))),
        h('div', { class: 'row', style: { marginTop: '10px' } }, field(t('Website'), bind(C, 'site', input(C.site, { placeholder: 'www…' })))),
        h('label', { class: 'check', style: { marginTop: '10px' } }, h('input', { type: 'checkbox', checked: ct.show, onchange: (e) => { ct.show = e.target.checked; } }), h('span', {}, t('Show my email and phone on my profile. Otherwise only whoever runs a call you apply to sees them.')))),
      limits),
    sec(t('Settings'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.visible !== false, onchange: (e) => { p.visible = e.target.checked; } }), h('span', {}, t('My profile shows in People.'))),
      h('label', { class: 'check' }, consentBox, h('span', {}, t('I agree that these details are kept on Roardino and seen by its members as set above. I can delete them all whenever I want.')))),
    h('div', { class: 'form-foot' }, old ? h('button', { type: 'button', class: 'btn red', onclick: remove }, t('Delete profile')) : null, msg, h('span', { class: 'grow' }),
      h('a', { class: 'btn', href: old ? `#/p/${id}` : '#/feed' }, t('Cancel')), saveBtn)));
}

/* =====================================================================================================================
   Calls
   ===================================================================================================================== */
let callsFilter = 'all';
const CALL_KIND = { casting: 'Casting', crew: 'Crew', other: 'Call' };
async function viewCalls() {
  document.title = 'Roardino · ' + t('Calls');
  const box = h('div', { class: 'tiles' }, h('p', { class: 'wait' }, t('Loading…')));
  frame('calls', h('div', { class: 'head' }, h('h1', {}, t('Calls')), seg([['all', t('All')], ['casting', t('Casting')], ['crew', t('Crew')], ['mine', t('Mine')]], callsFilter, (k) => { callsFilter = k; viewCalls(); }), h('span', { class: 'grow' }), h('button', { type: 'button', class: 'btn main head-new', title: t('New call'), 'aria-label': t('New call'), onclick: () => editCall() }, icon('plus'), h('span', { class: 'lbl' }, t('New call')))), box);
  let q = sb.from('roardino_calls').select('*').order('created_at', { ascending: false }).limit(200);
  if (callsFilter === 'mine') q = q.eq('owner', session.user.id); else q = q.eq('open', true);
  if (['casting', 'crew'].includes(callsFilter)) q = q.eq('kind', callsFilter);
  const { data, error } = await q;
  if (error) throw error;
  put(box, ...(data.length ? data.map(callTile) : [h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, h('b', {}, t('No calls yet')), t('Looking for an actor, a dancer or a gaffer? Post the first one.'))]));
}
const callWho = (c) => [(c.wanted || []).map(kindName).join(', '), c.age_from || c.age_to ? t('{a}-{b} years', { a: c.age_from || '', b: c.age_to || '' }) : '', { f: t('woman'), m: t('man') }[c.gender] || ''].filter(Boolean).join(' · ');
function callTile(c) {
  return h('a', { class: 'tile', href: `#/c/${c.id}` },
    h('div', { class: 't-top' }, h('span', { class: 't-ico', html: c.kind === 'casting' ? ICON.star : ICON.calls }),
      h('div', { style: { minWidth: 0 } }, h('span', { class: 'when' }, t(CALL_KIND[c.kind]) + (c.open ? '' : ' · ' + t('closed'))), h('h3', {}, c.title))),
    h('div', { class: 'meta' }, [c.company, c.city, c.pay].filter(Boolean).map((x) => h('span', {}, x))),
    callWho(c) ? h('p', {}, callWho(c)) : null,
    h('div', { class: 'foot-line' }, [ago(c.created_at), c.dates, c.closes ? t('until {d}', { d: shortDate(c.closes) }) : ''].filter(Boolean).join(' · ')));
}
function editCall(old) {
  const c = structuredClone(old || { kind: 'casting', wanted: [], open: true });
  const wanted = h('div', { class: 'pills' });
  const drawW = () => put(wanted, ...KINDS.map(([k, s]) => h('button', { type: 'button', class: 'pill' + (c.wanted.includes(k) ? ' on' : ''), onclick: (e) => { e.preventDefault(); e.stopPropagation(); c.wanted = c.wanted.includes(k) ? c.wanted.filter((x) => x !== k) : [...c.wanted, k]; drawW(); } }, t(s))));
  drawW();
  const bind = (key, el) => { el.addEventListener('input', () => { c[key] = el.value; }); return el; };
  const kindSeg = h('div');
  const drawK = () => put(kindSeg, seg([['casting', t('Casting')], ['crew', t('Crew')], ['other', t('Other')]], c.kind, (k) => { c.kind = k; drawK(); }));
  drawK();
  openWin(old ? t('The call') : t('New call'), h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
    kindSeg,
    field(t('Title'), bind('title', input(c.title, { placeholder: t('e.g. Looking for a dancer for a music video') }))),
    field(t('Who you are looking for'), wanted),
    h('div', { class: 'row' }, field(t('Age from'), bind('age_from', input(c.age_from, { inputmode: 'numeric' }))), field(t('to'), bind('age_to', input(c.age_to, { inputmode: 'numeric' }))), field(t('Gender'), select([['', t('Any')], ['f', t('Woman')], ['m', t('Man')]], c.gender, { onchange: (e) => { c.gender = e.target.value; } }))),
    h('div', { class: 'row' }, field(t('City'), bind('city', input(c.city))), field(t('When'), bind('dates', input(c.dates, { placeholder: t('e.g. 12-13 Dec') }))), field(t('Pay'), bind('pay', input(c.pay, { placeholder: t('e.g. €150 a day') })))),
    h('div', { class: 'row' }, field(t('Company / production'), bind('company', input(c.company))), field(t('Applications until'), bind('closes', input(c.closes, { type: 'date' })))),
    field(t('Description'), bind('about', area(c.about, { rows: 5, placeholder: t('What the job is, what they need to know, what to send.') }))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!c.minors_ok, onchange: (e) => { c.minors_ok = e.target.checked; } }), h('span', {}, t('Children under 18 welcome too (through a parent). You will see the profiles of those who apply.')))),
  (close) => [
    old ? h('button', { type: 'button', class: 'btn red', onclick: async () => { if (!(await ask(t('Delete the call?')))) return; const { error } = await sb.from('roardino_calls').delete().eq('id', old.id); if (error) return fail(error); close(); location.hash = '#/calls'; } }, t('Delete')) : null,
    h('button', { type: 'button', class: 'btn', onclick: close }, t('Cancel')),
    h('button', { type: 'button', class: 'btn main', onclick: async () => {
      if (!c.title?.trim()) return toast(t('Write a title.'));
      const row = { kind: c.kind, title: c.title.trim(), about: c.about || null, company: c.company || null, city: c.city || null, dates: c.dates || null, pay: c.pay || null, wanted: c.wanted, age_from: +c.age_from || null, age_to: +c.age_to || null, gender: c.gender || null, minors_ok: !!c.minors_ok, closes: c.closes || null, open: c.open !== false };
      const res = old ? await sb.from('roardino_calls').update(row).eq('id', old.id).select().single() : await sb.from('roardino_calls').insert(row).select().single();
      if (res.error) return fail(res.error);
      close(); toast(t('The call is up'));
      if (location.hash === `#/c/${res.data.id}`) route(); else location.hash = `#/c/${res.data.id}`;
    } }, old ? t('Save') : t('Post'))]);
}
async function viewCall(id) {
  const { data: c, error } = await sb.from('roardino_calls').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!c) return frame('calls', h('div', { class: 'empty' }, h('b', {}, t('Not found')), t('The call closed or was deleted.')));
  document.title = `${c.title} · Roardino`;
  const own = c.owner === session.user.id;
  const { data: applies } = await sb.from('roardino_applies').select('*, person:roardino_people(id,name,kinds,city,birth,avatar,minor,data,guardian)').eq('call_id', id).order('created_at');
  const mineApplied = (applies || []).filter((a) => a.owner === session.user.id);
  await sign((applies || []).map((a) => a.person?.avatar));
  const cts = {};
  if (own && (applies || []).length) {
    const { data: cr } = await sb.from('roardino_contacts').select('*').in('person_id', applies.map((a) => a.person_id));
    (cr || []).forEach((x) => { cts[x.person_id] = x; });
  }
  let shown = 'all';
  const who = h('div', { class: 'who' });
  const labels = { new: 'New', shortlist: 'Shortlist', no: 'No' };
  const drawWho = () => {
    const list = (applies || []).filter((a) => shown === 'all' || a.status === shown);
    put(who, ...(list.length ? list.map((a) => {
      const tile = faceTile(a.person || {});
      tile.append(h('span', { class: 'state ' + a.status }, t(labels[a.status])));
      // the one who opened the call reaches the applicant: their own contact, or a minor's parent
      const ap = a.person || {}, ct = ap.minor ? { email: ap.guardian?.email, phone: ap.guardian?.phone } : (cts[a.person_id] || {});
      return h('div', { class: 'who-cell' }, tile,
        a.note ? h('p', { class: 'hint' }, a.note) : null,
        ct.email || ct.phone ? h('p', { class: 'hint' }, ap.minor ? t('Parent: ') : '', ct.email ? h('a', { href: `mailto:${ct.email}` }, ct.email) : null, ct.email && ct.phone ? ' · ' : '', ct.phone ? h('a', { href: `tel:${ct.phone}` }, ct.phone) : null) : null,
        h('div', { class: 'pills' }, ['shortlist', 'no', 'new'].map((k) => h('button', { type: 'button', class: 'pill' + (a.status === k ? ' on' : ''), onclick: async () => {
          const { error: er } = await sb.from('roardino_applies').update({ status: k }).eq('id', a.id);
          if (er) return fail(er);
          a.status = k; drawWho();
        } }, t(labels[k])))));
    }) : [h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, t('No applications here yet.'))]));
  };
  const segBox = h('div');
  const drawSeg = () => put(segBox, seg([['all', t('All')], ['shortlist', t('Shortlist')], ['new', t('New')]], shown, (k) => { shown = k; drawSeg(); drawWho(); }));
  if (own) { drawWho(); drawSeg(); }
  frame('calls',
    h('div', { style: { maxWidth: '820px' } },
      h('div', { class: 'tile' },
        h('div', { class: 't-top' }, h('span', { class: 't-ico', html: c.kind === 'casting' ? ICON.star : ICON.calls }), h('span', { class: 'when' }, t(CALL_KIND[c.kind]) + (c.open ? '' : ' · ' + t('closed')))),
        h('h1', { style: { fontSize: '30px', margin: '4px 0', fontWeight: 'var(--w-strong)' } }, c.title),
        callWho(c) ? h('p', { style: { color: 'var(--ink2)' } }, callWho(c)) : null,
        h('div', { class: 'facts', style: { margin: '6px 0' } }, [['City', c.city], ['When', c.dates], ['Pay', c.pay], ['Production', c.company], ['Applications until', c.closes && new Date(c.closes).toLocaleDateString(LOCALE())]].filter(([, v]) => v).map(([k, v]) => h('div', { class: 'fact' }, h('small', {}, t(k)), h('span', {}, v)))),
        c.about ? h('p', { style: { whiteSpace: 'pre-wrap', color: 'var(--ink2)' } }, c.about) : null,
        h('div', { class: 'acts' },
          own ? [h('button', { type: 'button', class: 'btn', onclick: () => editCall(c) }, icon('edit'), t('Edit')),
            h('button', { type: 'button', class: 'btn', onclick: async () => { const { error: er } = await sb.from('roardino_calls').update({ open: !c.open }).eq('id', c.id); if (er) return fail(er); route(); } }, c.open ? t('Close the call') : t('Open it again'))]
            : mineApplied.length ? h('span', { class: 'chip', style: { '--c': '#35c98b' } }, h('i'), t('You applied as {names}', { names: mineApplied.map((a) => a.person?.name).join(', ') }))
              : c.open ? h('button', { type: 'button', class: 'btn main', onclick: () => apply(c) }, icon('send'), t('Apply')) : null))),
    own ? h('div', {},
      h('div', { class: 'head', style: { marginTop: '28px' } }, h('h1', { style: { fontSize: '22px' } }, t('Applications · {n}', { n: (applies || []).length })), segBox),
      who) : null);
}
function apply(c) {
  if (!mine.length) { toast(t('Make your profile first.')); location.hash = '#/edit/new'; return; }
  const can = mine.filter((m) => c.minors_ok || !m.minor);
  if (!can.length) return toast(t('This call does not take under 18s.'));
  let as = can[0].id;
  const note = area('', { rows: 4, placeholder: t('A few words on why you fit and when you are free.') });
  openWin(t('Apply: {title}', { title: c.title }), h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
    can.length > 1 ? field(t('Which profile'), select(can.map((m) => [m.id, m.name]), as, { onchange: (e) => { as = e.target.value; } }))
      : h('p', { class: 'hint' }, can[0].minor ? t('As {name}. They will see the profile and the parent\'s details.', { name: can[0].name }) : t('As {name}. They will see your profile, with your email and phone.', { name: can[0].name })),
    field(t('Note'), note)),
  (close) => [h('button', { type: 'button', class: 'btn', onclick: close }, t('Cancel')), h('button', { type: 'button', class: 'btn main', onclick: async () => {
    const { error } = await sb.from('roardino_applies').insert({ call_id: c.id, person_id: as, note: note.value.trim() || null });
    if (error) return fail(error);
    close(); toast(t('Application sent')); route();
  } }, t('Send'))]);
}

/* =====================================================================================================================
   Notifications (Alex, 5 Nov: "who gave me a bravo, who did what, who sent me a message"): a bell in the top bar with a
   red count; its glass list shows the chat's unread messages (RoarMe) and what happened here (roardino_notifications,
   made by triggers), live through Realtime; opening it marks everything read
   ===================================================================================================================== */
let notes = [], chatUnread = [], notesChannel = null, chatTimer = null;
const unreadCount = () => notes.filter((n) => !n.read_at).length + chatUnread.reduce((a, c) => a + (c.n || 0), 0);
function drawBadges() {
  const n = unreadCount();
  document.querySelectorAll('.bell b').forEach((b) => { b.textContent = n > 99 ? '99+' : String(n); b.classList.toggle('hidden', !n); });
  document.title = document.title.replace(/^\(\d+\+?\) /, '');
  if (n) document.title = `(${n > 99 ? '99+' : n}) ${document.title}`;
}
async function loadNotes() {
  const [{ data: ns }, { data: cu }] = await Promise.all([
    sb.from('roardino_notifications').select('*, who:roardino_people!roardino_notifications_actor_person_fkey(id,name,avatar), post:roardino_posts(id,media,person_id), call:roardino_calls(id,title)').order('created_at', { ascending: false }).limit(60),
    sb.rpc('roardino_chat_unread')]);
  notes = ns || [];
  chatUnread = cu || [];
  await sign([...notes.flatMap((n) => [n.who?.avatar, (n.post?.media || [])[0]?.path]), ...chatUnread.map((c) => c.avatar)]);
  drawBadges();
}
function startNotes() {
  stopNotes();
  loadNotes().catch(() => {});
  chatTimer = setInterval(() => sb.rpc('roardino_chat_unread').then(({ data }) => { chatUnread = data || []; drawBadges(); }), 60000);
  try {
    notesChannel = sb.channel('rd-notes-' + session.user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'roardino_notifications', filter: `user_id=eq.${session.user.id}` }, async () => {
        await loadNotes();
        const n = notes[0];
        if (n && !n.read_at) toast(noteText(n));
      }).subscribe();
  } catch { /* no live updates: the bell still fills on every page load */ }
}
function stopNotes() { clearInterval(chatTimer); try { notesChannel && sb.removeChannel(notesChannel); } catch { /* gone */ } notesChannel = null; }
function noteText(n) {
  const who = n.who?.name || t('Someone');
  return {
    bravo: t('{who} liked your work', { who }),
    comment: t('{who} commented: {text}', { who, text: n.text || '' }),
    follow: t('{who} started following you', { who }),
    apply: t('{who} applied to your call "{text}"', { who, text: n.text || '' }),
    shortlist: t('You are on the shortlist for "{text}"', { text: n.text || '' }),
    tag: t('{who} tagged you: {text}', { who, text: n.text || '' }),
  }[n.kind] || who;
}
function bellButton() {
  const btn = h('button', { type: 'button', class: 'ico bell', title: t('Notifications'), 'aria-label': t('Notifications'), onclick: (e) => { e.stopPropagation(); openNotes(btn); } },
    h('span', { html: ICON.bell, style: { display: 'inline-flex' } }), h('b', { class: 'hidden' }));
  setTimeout(drawBadges);
  return btn;
}
async function openNotes(anchor) {
  document.querySelectorAll('.notes-panel').forEach((x) => x.remove());
  const panel = h('div', { class: 'notes-panel', onclick: (e) => e.stopPropagation() });
  const bar = anchor.closest('.bar-in');
  bar.append(panel);
  const closeAll = () => { panel.remove(); document.removeEventListener('click', closeAll); };
  setTimeout(() => document.addEventListener('click', closeAll));
  put(panel, h('p', { class: 'wait' }, t('Loading…')));
  await loadNotes().catch(fail);
  const go = (href) => { closeAll(); location.hash = href; };
  const row = (av, text, sub, when, thumb, onclick, unread) => h('button', { type: 'button', class: 'note' + (unread ? ' new' : ''), onclick },
    av, h('span', { class: 'note-t' }, h('span', {}, text), h('small', {}, [sub, when].filter(Boolean).join(' · '))), thumb ? h('span', { class: 'note-pic', style: bg(thumb) }) : null);
  const msgs = chatUnread.map((c) => row(avatar({ name: c.sender, avatar: c.avatar }), h('b', {}, c.sender), (c.n > 1 ? t('{n} new messages', { n: c.n }) + ' · ' : '') + (c.body || ''), ago(c.at), null, () => go('#/chat'), true));
  const rows = notes.map((n) => {
    const thumb = (n.post?.media || [])[0];
    const target = n.kind === 'follow' ? `#/p/${n.who?.id || ''}` : n.post_id ? `#/p/${n.post?.person_id || n.person_id}` : n.call_id ? `#/c/${n.call_id}` : '#/feed';
    return row(avatar(n.who || {}), noteText(n), null, ago(n.created_at), thumb?.type === 'image' ? thumb.path : null, () => {
      if (n.post_id && n.post) { closeAll(); sb.from('roardino_posts').select('*, person:roardino_people(id,name,avatar,kinds,headline)').eq('id', n.post_id).maybeSingle().then(({ data }) => data && openPost(data, data.person)); }
      else go(target);
    }, !n.read_at);
  });
  put(panel,
    h('div', { class: 'notes-head' }, h('b', {}, t('Notifications')), h('span', { class: 'grow' }), notes.length ? h('button', { type: 'button', class: 'linkish', onclick: async () => { await sb.from('roardino_notifications').delete().eq('user_id', session.user.id); notes = []; drawBadges(); closeAll(); toast(t('Cleared')); } }, t('Clear all')) : null, h('button', { type: 'button', class: 'win-x', 'aria-label': t('Close'), title: t('Close'), html: ICON.x, onclick: () => closeAll() })),
    msgs.length ? [h('p', { class: 'notes-sec' }, t('Messages')), ...msgs] : null,
    rows.length ? [h('p', { class: 'notes-sec' }, t('Activity')), ...rows] : null,
    !msgs.length && !rows.length ? h('div', { class: 'notes-empty' }, h('span', { html: ICON.bell }), t('Nothing new. Likes, comments, follows, calls and messages show here.')) : null);
  // seen now: everything read, the count gone (the chat's own messages are read in the chat)
  const unread = notes.filter((n) => !n.read_at).map((n) => n.id);
  if (unread.length) { await sb.from('roardino_notifications').update({ read_at: new Date().toISOString() }).in('id', unread); notes.forEach((n) => { n.read_at ||= new Date().toISOString(); }); drawBadges(); }
}

/* =====================================================================================================================
   Privacy Policy and Terms (Alex, 5 Nov: "what else is needed"). Only what Roardino's code does; readable without an
   account, from the footer. English first, through t() like the rest.
   ===================================================================================================================== */
const LEGAL_DATE = '5 November 2026';
const INFO_MAIL = 'info@themadlions.com';
const PRIVACY = [
  ['In short', ['Roardino is a place to show your work and to find people for film, theatre, dance and photography. What you put on a profile is seen by the members of Roardino, as you choose. Children under 18 join only through a parent, and their profiles are seen only by trusted productions. We do not sell data and we show no ads.']],
  ['Who we are', [`The Mad Lions, a film production house in Athens, Greece, is responsible for your data on Roardino. Write to ${INFO_MAIL}.`]],
  ['What we keep', [
    'Your account: your name, your email and your password as a secure hash. It is your Roar Account, the same one that signs you in to the other Roar apps.',
    'Your profiles: name, what you do, city, date of birth, gender, a line about you, a text about you, and, as you choose, your looks, skills, languages, equipment, software, credits, studies, agent and website.',
    'Your pictures, your self-tape or showreel, your cover picture and your CV.',
    'Your email and phone for contact, kept apart from the profile.',
    'What you do on Roardino: posts with their pictures and videos, stories, comments, likes, who you follow, the calls you post and the applications you send or receive, the seats you keep at seminars (with the name and phone you give), and the notifications made from all of these.',
    'Choices remembered with your account (Everyone or Following, stories shown or hidden) and on your device only (light or dark, text size, the stories you have seen).',
  ]],
  ['Who sees what', [
    'Profiles and posts are seen only by signed-in members. A profile you turn off in Settings does not show in Industry.',
    'Your date of birth is never shown; only your age, and only on profiles in front of the camera.',
    'Your email and phone show on your profile only if you choose so. Whoever runs a call you apply to sees them, so they can reach you.',
    'A child\'s profile is seen only by productions and casting directors we trust, and by whoever runs a call the child applied to. The only contact shown is the parent\'s.',
    'Applications are seen by you and by whoever runs the call. Seats at a seminar are seen by you and by its organisers.',
  ]],
  ['Children', ['A profile under 18 can be made only from the account of a parent or legal guardian, with their name, phone, email and consent. The parent manages the profile and is the only contact. The parent can delete it at any time.']],
  ['Pictures and files', ['Pictures, videos and CVs are kept in private storage and shown through links that expire within an hour. Pictures are made lighter in your browser before they go up.']],
  ['The camera', ['The camera is used only when you choose Camera for a story, and nothing is recorded until you press the button. Nothing goes up until you press Share.']],
  ['The chat', ['The chat inside Roardino is RoarMe, with the same account. Its own privacy policy applies to your messages: alexisdigipro-hub.github.io/roarme/?legal=privacy.']],
  ['Other services', [
    'Accounts, data and files are stored with Supabase, our database and storage provider, in London, United Kingdom (covered by the EU\'s adequacy decision for the UK). It acts on our behalf and keeps short technical logs.',
    'Fonts load from Google Fonts and code from jsDelivr, so they see your IP address. A showreel from YouTube or Vimeo plays in their player, under their own rules.',
  ]],
  ['No ads, no selling', ['We do not sell your data, show ads, or use what you post to train AI.']],
  ['How to delete', [
    'Delete a post, a story, a comment, a call or an application whenever you like. Deleting a profile deletes its pictures, videos, CV and posts too.',
    'To delete everything, delete your Roar Account at themadlions.com/account (Settings, Delete account): your profiles and everything in them go with it.',
  ]],
  ['Your rights', [`Under the GDPR you can ask to see, correct, export or delete your data, and you can object to its use. Write to ${INFO_MAIL} and we answer within one month. You can also complain to the Hellenic Data Protection Authority (www.dpa.gr).`]],
  ['Changes', ['If this policy changes, the date at the top changes too, and anything important is shown on Roardino before it applies.']],
];
const TERMS = [
  ['Roardino', ['Roardino is a place for people who make film, theatre, dance and photography: to show their work, to find work, and to find each other. It is run by The Mad Lions, Athens, Greece.']],
  ['Your account', ['You must be 15 or older to have an account. Children under 18 join only through the account of a parent or legal guardian. Keep your password to yourself; what happens through your account is your responsibility.']],
  ['Be real', ['A profile is you, or your child if you are their parent or guardian. Do not make profiles for other people, do not pretend to be someone else, and keep what you say about your work true.']],
  ['What you post is yours', ['Your pictures, videos and words stay yours. You let us keep them and show them to members as you set, only to run Roardino. Post only what you have the right to post, and only pictures of people who agree to be shown.']],
  ['Not allowed', ['Nudity or sexual content; harassment, threats or hate; spam, scams or fake calls; asking a child for anything except through their parent; sharing someone else\'s contact details without their consent; anything against the law.']],
  ['Calls', ['A call is between the person who posts it and the people who apply. We are not part of the deal. Check a call before you go, and never pay to apply. A production that works with children follows the law on children at work, with the parent present.']],
  ['Seminars', ['Each seminar shows who gives it, when, where and its price. A paid seminar is settled with its organiser.']],
  ['When things go wrong', ['We may remove content or close an account that breaks these terms, and we will tell you why where we can. Tell us about anything wrong at ' + INFO_MAIL + '.']],
  ['Free, and in beta', ['Roardino is free and still in beta. It may change, gain or lose features, or stop, and we will try to tell you in good time.']],
  ['No guarantee', ['Roardino is given as it is. We work hard for it to be right and safe, but we cannot promise it will always work. Keep your own copies of anything that matters to you.']],
  ['Liability', ['As far as the law allows, we are not liable for indirect losses, lost data, lost profit or lost work from using Roardino. Nothing here limits rights you have as a consumer that cannot be limited.']],
  ['Law', ['These terms follow Greek law, and the courts of Athens decide any dispute, unless the law where you live as a consumer says otherwise.']],
  ['Contact', [`The Mad Lions, Athens, Greece · ${INFO_MAIL}`]],
];
const CONTACT_TOPICS = [['general', 'A question'], ['report', 'Report a profile or post'], ['child', 'A child\'s safety'], ['privacy', 'My data'], ['account', 'My account'], ['partner', 'Press and partners']];
// Roardino's own Contact page (Alex, 5 Nov: "a page of Roardino, not of The Mad Lions"): the message goes to roardino_messages
function contactBody() {
  const topic = { v: 'general' }; const email = h('input', { class: 'input', type: 'email', required: true, value: session?.user?.email || '', placeholder: 'you@example.com' });
  const name = h('input', { class: 'input', value: me()?.name || '', placeholder: t('Your name') });
  const text = h('textarea', { class: 'textarea', rows: 6, required: true, placeholder: t('Tell us what happened, with a link to the profile or post if there is one.') });
  const msg = h('p', { class: 'msg' }); const topics = h('div');
  const drawTopics = () => put(topics, h('div', { class: 'pills' }, CONTACT_TOPICS.map(([k, label]) => h('button', { type: 'button', class: 'pill' + (topic.v === k ? ' on' : ''), onclick: (e) => { e.preventDefault(); topic.v = k; drawTopics(); } }, t(label)))));
  drawTopics();
  const form = h('form', { class: 'contact-form', onsubmit: async (e) => {
    e.preventDefault(); const btn = form.querySelector('button[type=submit]');
    if (!text.value.trim() || !email.value.trim()) { msg.textContent = t('Write your email and your message.'); msg.className = 'msg err'; return; }
    btn.disabled = true;
    const { error } = await sb.from('roardino_messages').insert({ topic: topic.v, name: name.value.trim() || null, email: email.value.trim(), body: text.value.trim(), page: document.referrer || null, user_id: session?.user?.id || null });
    btn.disabled = false;
    if (error) { msg.textContent = errText(error); msg.className = 'msg err'; return; }
    put(form, h('div', { class: 'contact-done' }, h('span', { html: ICON.send }), h('h2', {}, t('Thank you, we got it')), h('p', {}, t('We answer at {e}, usually within two working days. Anything about a child\'s safety is read first.', { e: email.value.trim() }))));
  } },
    field(t('What is it about'), topics),
    h('div', { class: 'duo' }, field(t('Name'), name), field(t('Email for our answer'), email)),
    field(t('Message'), text), msg,
    h('div', { class: 'actions' }, h('button', { type: 'submit', class: 'btn main' }, icon('send'), t('Send'))));
  return [h('h1', {}, t('Contact Roardino')), h('p', { class: 'hint' }, t('Questions, a profile or post to report, a child\'s safety, your data: write to us here and a person from the Roardino team answers.')), form];
}
function viewLegal(which) {
  const text = which === 'terms' ? TERMS : which === 'privacy' ? PRIVACY : null;
  document.title = 'Roardino · ' + ({ terms: t('Terms'), privacy: t('Privacy Policy'), contact: t('Contact') })[which];
  const tabs = h('div', { class: 'head', style: { marginBottom: 0 } }, seg([['privacy', t('Privacy Policy')], ['terms', t('Terms')], ['contact', t('Contact')]], which, (k) => { location.hash = `#/legal/${k}`; }));
  const body = !text ? h('article', { class: 'legal sec' }, tabs, ...contactBody()) : h('article', { class: 'legal sec' },
    tabs,
    h('h1', {}, which === 'terms' ? t('Terms of use') : t('Privacy Policy')),
    h('p', { class: 'hint' }, t('Updated {d}', { d: LEGAL_DATE })),
    text.map(([title, paras]) => h('section', {}, h('h2', {}, t(title)), paras.map((x) => h('p', { html: esc(t(x)).replace(/info@themadlions\.com/g, '<a href="mailto:info@themadlions.com">info@themadlions.com</a>').replace(/www\.dpa\.gr/g, '<a href="https://www.dpa.gr/" target="_blank" rel="noopener">www.dpa.gr</a>') })))));
  if (session) frame('', h('div', { class: 'form' }, body));
  else put(app, h('header', { class: 'bar' }, h('div', { class: 'bar-in' }, h('a', { href: '#/', class: 'brand' }, mark()))), h('main', { class: 'page' }, h('div', { class: 'form' }, body)), footBar());
  window.scrollTo(0, 0);
}

/* =====================================================================================================================
   Settings (Alex, 5 Nov: "light and dark, and some settings it may need")
   ===================================================================================================================== */
// Design: only for the people who run Roardino; what is set here is how everyone sees it
function designSection(row) {
  const range = (k, min, max, step) => { const out = h('output', {}, String(look[k])); return h('div', { class: 'design-range' }, h('input', { type: 'range', min, max, step, value: look[k], oninput: (e) => { out.textContent = e.target.value; setLook(k, +e.target.value); } }), out); };
  const fontSel = select(FONTS, look.font, { class: 'select design-font', onchange: (e) => setLook('font', e.target.value) });
  return h('section', { class: 'sec' }, h('h2', {}, t('Design')), h('p', { class: 'hint', style: { margin: '-4px 0 4px' } }, t('Only you see this. What you set here is how everyone sees Roardino.')),
    row(t('Font'), t('From Google Fonts; every one writes Greek too.'), fontSel),
    row(t('Text thickness'), t('The weight of ordinary text.'), range('text', 300, 500, 50)),
    row(t('Bold'), t('The weight of titles, names and buttons. The menu stays bold.'), range('strong', 500, 800, 50)),
    h('div', { class: 'design-sample' }, h('b', {}, 'Ελένη Σταματοπούλου · Actor'), h('span', {}, t('Αθήνα · 27 · Looking for a short film this winter. The quick brown fox jumps over the lazy dog.'))),
    row(t('Back to the default'), null, h('button', { type: 'button', class: 'btn sm', onclick: () => { look = { ...LOOK_DEFAULT }; setLook('font', ''); viewSettings(); } }, t('Reset'))));
}
function viewSettings() {
  document.title = 'Roardino · ' + t('Settings');
  const row = (title, hint, control) => h('div', { class: 'set-row' }, h('div', {}, h('b', {}, title), hint ? h('small', {}, hint) : null), control);
  const choice = (k, items) => { const box = h('div'); const draw = () => put(box, seg(items, prefs[k], (v) => { setPref(k, v); draw(); })); draw(); return box; };
  const toggle = (k) => h('input', { type: 'checkbox', class: 'switch', checked: !!prefs[k], onchange: (e) => setPref(k, e.target.checked) });
  const msg = h('p', { class: 'msg' });
  frame('me', h('div', { class: 'form' },
    h('div', { class: 'head' }, h('h1', {}, t('Settings'))),
    h('div', { class: 'phone-tiles on-settings' }, meTiles()),
    h('section', { class: 'sec' }, h('h2', {}, t('Appearance')),
      row(t('Theme'), t('Auto follows your phone or computer.'), choice('theme', [['light', t('Light')], ['dark', t('Dark')], ['auto', t('Auto')]])),
      row(t('Accent colour'), t('The colour of buttons, the chosen tab and the glow, in light and dark.'), (() => { const box = h('div', { class: 'swatches', role: 'radiogroup' }); const draw = () => put(box, ACCENTS.map(([k, name, g]) => h('button', { type: 'button', class: 'swatch' + (prefs.accent === k ? ' on' : ''), role: 'radio', 'aria-checked': String(prefs.accent === k), 'aria-label': t(name), title: t(name), style: { '--sw': `linear-gradient(135deg,${g})` }, onclick: () => { setPref('accent', k); draw(); } }))); draw(); return box; })()),
      row(t('Text size'), null, choice('text', [['normal', t('Normal')], ['large', t('Large')]])),
      row(t('Language'), t('Greek is on the way.'), h('div', { class: 'seg' }, h('button', { type: 'button', class: 'on' }, 'English'), h('button', { type: 'button', disabled: true, title: t('Soon') }, 'Ελληνικά')))),
    isAdmin ? designSection(row) : null,
    h('section', { class: 'sec' }, h('h2', {}, t('Chat')),
      row(t('Chat settings'), t('Notifications, privacy, chats and folders, blocked people, the look of the chat.'), h('button', { type: 'button', class: 'btn sm', onclick: () => openChat('settings') }, icon('gear'), t('Open'))),
      row(t('Contacts'), t('Everyone you talk to.'), h('button', { type: 'button', class: 'btn sm', onclick: () => openChat('contacts') }, icon('user'), t('Open'))),
      row(t('Calls'), t('Voice and video calls you made and missed.'), h('button', { type: 'button', class: 'btn sm', onclick: () => openChat('calls') }, icon('phone'), t('Open')))),
    h('section', { class: 'sec' }, h('h2', {}, t('Feed')),
      row(t('Calls in the feed'), t('Open calls show between the posts.'), toggle('feedCalls')),
      row(t('Videos start muted'), null, toggle('mutedVideos')),
      // a setting for everyone (Alex, 5 Nov): the feed with every post, also the ones already seen, kept on the account; and a clean start
      row(t('Show posts I\'ve seen'), t('On: the feed always shows every post. Off: a refresh shows only what is new.'), h('input', { type: 'checkbox', class: 'switch', checked: !!prefs.showSeen, onchange: (e) => { setPref('showSeen', e.target.checked); feedFresh = true; sb.auth.updateUser?.({ data: { roardino_show_seen: e.target.checked } }).then(({ data }) => { if (data?.user) session.user = data.user; }).catch(() => {}); } })),
      row(t('Posts I\'ve seen'), t('Forget them on this device, so every post shows as new again.'), h('button', { type: 'button', class: 'btn sm', onclick: () => { seenPosts = new Set(); keepSeen(); feedFresh = true; toast(t('Every post shows as new again')); } }, t('Reset'))),
      row(t('Stories'), t('Show the stories row on top of the feed.'), h('input', { type: 'checkbox', class: 'switch', checked: !!prefs.showStories, onchange: (e) => setShowStories(e.target.checked) })),
      row(t('Stories you have seen'), t('Seen stories turn grey on this device.'), h('button', { type: 'button', class: 'btn sm', onclick: () => { seenStories = new Set(); try { localStorage.removeItem('roardino-seen'); } catch { /* none */ } toast(t('All stories show as new again')); } }, t('Reset')))),
    h('section', { class: 'sec' }, h('h2', {}, t('Privacy')),
      row(t('Who sees my profile, email and phone'), t('Set it in your profile, under Contact and Settings.'), me() ? h('a', { class: 'btn sm', href: `#/edit/${me().id}` }, t('Edit profile')) : h('a', { class: 'btn sm', href: '#/edit/new' }, t('Create your profile'))),
      row(t('Children\'s profiles'), t('Seen only by trusted productions and by whoever runs a call they apply to.'), h('a', { class: 'btn sm', href: '#/me' }, t('My profiles')))),
    h('section', { class: 'sec' }, h('h2', {}, t('Account')),
      row(t('Signed in as'), session.user.email, null),
      row(t('Password'), t('We email you a link to set a new one.'), h('button', { type: 'button', class: 'btn sm', onclick: async () => { const { error } = await sb.auth.resetPasswordForEmail(session.user.email, { redirectTo: location.origin + location.pathname }); msg.textContent = error ? errText(error) : t('Check your email for the link.'); msg.className = 'msg ' + (error ? 'err' : 'ok'); } }, t('Change password'))),
      row(t('Other devices'), t('Sign out everywhere else; this device stays signed in.'), h('button', { type: 'button', class: 'btn sm', onclick: async () => { const { error } = await sb.auth.signOut({ scope: 'others' }); toast(error ? errText(error) : t('Signed out on other devices')); } }, t('Sign out others'))),
      row(t('This device'), null, h('button', { type: 'button', class: 'btn sm red', onclick: () => sb.auth.signOut() }, icon('out'), t('Sign out'))),
      msg)));
}

/* =====================================================================================================================
   Chat: RoarMe in a frame, the same account (signed in once inside it, then remembered)
   ===================================================================================================================== */
let chatFrame = null;
const ROARME_ORIGIN = new URL(ROARME).origin;
function viewChat() {
  document.title = 'Roardino · ' + t('Chat');
  // one frame kept for the whole visit, so going back to the chat is instant and keeps the conversation open;
  // ?embed=roardino: RoarMe wears Roardino's look, hides its own brand, and asks Roardino to sign it in (Alex, 5 Nov)
  chatFrame ||= h('iframe', { class: 'chat-frame', src: ROARME + '?embed=roardino', title: 'RoarMe', allow: 'camera; microphone; clipboard-write; autoplay; fullscreen; display-capture' });
  // put on the page the frame loads afresh and says roarme:ready; the page asked for (chatPending) is sent then
  frame('chat', h('div', { class: 'chat-wrap' }, chatFrame));
}
// what Roardino says to the framed RoarMe: its look, and a one-time sign-in token for the same Roar Account
const toChat = (msg) => { try { chatFrame?.contentWindow?.postMessage(msg, ROARME_ORIGIN); } catch { /* not there */ } };
// Message on a profile (Alex, 5 Nov): the direct chat on RoarMe with the profile's account (a child's: the parent's)
async function messageOnRoarMe(p) {
  if (!p.owner || p.owner === session.user.id) return;
  const { data: room, error } = await sb.rpc('roar_open_direct', { other: p.owner });
  if (error || !room) { toast(t('{name} is not on RoarMe yet.', { name: p.name })); return; }
  document.querySelectorAll('.veil').forEach((v) => v.remove());
  openChat({ page: 'room', room: typeof room === 'string' ? room : room.id || room });
}
// which page of the chat to show (Alex, 5 Nov: the chat's settings live in Roardino's Settings; on a phone RoarMe's own bar is hidden)
let chatReady = false, chatPending = null;
function openChat(page) {
  chatPending = page;
  if (location.hash !== '#/chat') location.hash = '#/chat'; else viewChat();
}
const chatLook = () => toChat({ type: 'roardino:look', theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light' });
let handingOver = false;
// the same handover the Roar Account gives every Roar app (roar-connect): a code started here, allowed with this
// session, then traded for a one-time token_hash that RoarMe turns into its own session; no password, no refresh token
async function handOverToChat() {
  if (handingOver || !session) return;
  handingOver = true;
  try {
    const FN = SB_URL + '/functions/v1/roar-connect';
    const call = async (body, token) => {
      const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY, ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.error) throw new Error(j.error || 'HTTP ' + r.status);
      return j;
    };
    const { data: cur } = await sb.auth.getSession();
    const token = cur.session?.access_token;
    if (!token) return;
    const start = await call({ do: 'start', app: 'roardino' });
    await call({ do: 'allow', code: start.code }, token);
    for (let i = 0; i < 10; i++) {
      const a = await call({ do: 'poll', code: start.code, secret: start.secret });
      if (a.token_hash) { toChat({ type: 'roardino:signin', token_hash: a.token_hash }); return; }
      if (a.expired) return;
      await new Promise((r) => setTimeout(r, 800));
    }
  } catch (e) { console.warn('chat handover', e); } finally { handingOver = false; }
}
window.addEventListener('message', (e) => {
  if (e.origin !== ROARME_ORIGIN || !chatFrame || e.source !== chatFrame.contentWindow) return;
  const d = e.data || {};
  if (d.type === 'roarme:ready') { chatReady = !!d.signedIn; chatLook(); if (d.signedIn === false) handOverToChat(); else if (chatPending) { toChat(typeof chatPending === 'object' ? { type: 'roardino:open', ...chatPending } : { type: 'roardino:open', page: chatPending }); chatPending = null; } }
});

/* =====================================================================================================================
   Seminars
   ===================================================================================================================== */
async function viewSeminars() {
  document.title = 'Roardino · ' + t('Seminars');
  const box = h('div', { class: 'tiles' }, h('p', { class: 'wait' }, t('Loading…')));
  frame('seminars', h('div', { class: 'head' }, h('h1', {}, t('Seminars')), h('span', { class: 'grow' }), isAdmin ? h('button', { type: 'button', class: 'btn main head-new', title: t('New seminar'), 'aria-label': t('New seminar'), onclick: () => editSeminar() }, icon('plus'), h('span', { class: 'lbl' }, t('New seminar'))) : null), box);
  const [{ data, error }, { data: counts }, { data: seats }, { data: links }] = await Promise.all([
    sb.from('roardino_seminars').select('*').order('starts_at', { ascending: true, nullsFirst: false }),
    sb.rpc('roardino_seat_counts'),
    sb.from('roardino_seats').select('seminar_id').eq('user_id', session.user.id),
    sb.from('roardino_seminar_links').select('*')]);
  if (error) throw error;
  const taken = Object.fromEntries((counts || []).map((x) => [x.seminar_id, x.taken]));
  const mineS = new Set((seats || []).map((x) => x.seminar_id));
  const link = Object.fromEntries((links || []).map((x) => [x.seminar_id, x.url]));
  const now = Date.now() - 86400e3;
  const list = data.filter((s) => isAdmin || !s.starts_at || new Date(s.starts_at).getTime() > now || mineS.has(s.id));
  put(box, ...(list.length ? list.map((s) => {
    const left = s.seats ? s.seats - (taken[s.id] || 0) : null;
    return h('div', { class: 'tile' },
      h('div', { class: 't-top' }, h('span', { class: 't-ico', html: ICON.cal }),
        h('div', { style: { minWidth: 0 } }, h('span', { class: 'when' }, [s.starts_at ? when(s.starts_at) : t('Soon'), s.kind === 'online' ? t('Online') : t('In person'), s.published ? '' : t('Draft')].filter(Boolean).join(' · ')), h('h3', {}, s.title))),
      s.teacher ? h('p', { style: { color: 'var(--ink2)' } }, t('With {name}', { name: s.teacher })) : null,
      s.about ? h('p', {}, s.about) : null,
      h('div', { class: 'meta' }, [s.minutes ? `${s.minutes}'` : '', s.place, s.price || '', left != null ? t('{n} seats left', { n: Math.max(0, left) }) : '', (s.for_kinds || []).map((k) => t((FILTERS.find((f) => f[0] === k) || [k, KIND[k] || k])[1])).join(', ')].filter(Boolean).map((x) => h('span', {}, x))),
      h('div', { class: 'acts' },
        mineS.has(s.id)
          ? [h('span', { class: 'chip', style: { '--c': '#35c98b' } }, h('i'), t('You have a seat')), link[s.id] ? h('a', { class: 'btn main', href: link[s.id], target: '_blank', rel: 'noopener' }, s.kind === 'online' ? t('Join the webinar') : t('Details')) : h('span', { class: 'hint' }, t('We will send you the details.'))]
          : left === 0 ? h('span', { class: 'hint' }, t('Full.')) : h('button', { type: 'button', class: 'btn main', onclick: () => takeSeat(s) }, icon('ticket'), t('Keep a seat')),
        isAdmin ? h('span', { class: 'grow' }) : null,
        isAdmin ? h('span', { class: 'hint' }, t('{n} seats taken', { n: taken[s.id] || 0 })) : null,
        isAdmin ? h('button', { type: 'button', class: 'btn round', title: t('Edit'), 'aria-label': t('Edit'), onclick: () => editSeminar(s, link[s.id]) }, icon('edit')) : null));
  }) : [h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, h('b', {}, t('Soon')), t('The first seminars and webinars are on the way.'))]));
}
function takeSeat(s) {
  const name = input(me()?.name || session.user.user_metadata?.name || '');
  const phone = input('', { type: 'tel' });
  openWin(t('Keep a seat'), h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } }, h('p', { class: 'hint' }, s.title + (s.price ? ` · ${s.price}` : '')), field(t('Full name'), name), field(t('Phone'), phone)),
    (close) => [h('button', { type: 'button', class: 'btn', onclick: close }, t('Cancel')), h('button', { type: 'button', class: 'btn main', onclick: async () => {
      if (!name.value.trim()) return toast(t('Write your name.'));
      const { data, error } = await sb.rpc('roardino_take_seat', { p_seminar: s.id, p_name: name.value.trim(), p_phone: phone.value.trim() });
      if (error) return fail(error);
      close(); toast(data?.link ? t('Done. The link is on the seminar.') : t('Done. We will send you the details.')); route();
    } }, t('Keep a seat'))]);
}
function editSeminar(old, oldLink = '') {
  const s = structuredClone(old || { kind: 'online', for_kinds: [], published: false });
  if (s.starts_at) { const d = new Date(s.starts_at); s.local = new Date(d.getTime() - d.getTimezoneOffset() * 60e3).toISOString().slice(0, 16); }
  let url = oldLink || '';
  const bind = (key, el) => { el.addEventListener('input', () => { s[key] = el.value; }); return el; };
  const forK = h('div', { class: 'pills' });
  const drawF = () => put(forK, ...FILTERS.slice(1).map(([k, x]) => h('button', { type: 'button', class: 'pill' + (s.for_kinds.includes(k) ? ' on' : ''), onclick: (e) => { e.preventDefault(); e.stopPropagation(); s.for_kinds = s.for_kinds.includes(k) ? s.for_kinds.filter((y) => y !== k) : [...s.for_kinds, k]; drawF(); } }, t(x))));
  drawF();
  const kindSeg = h('div');
  const drawK = () => put(kindSeg, seg([['online', t('Online')], ['live', t('In person')]], s.kind, (k) => { s.kind = k; drawK(); }));
  drawK();
  openWin(old ? t('Seminar') : t('New seminar'), h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
    kindSeg,
    field(t('Title'), bind('title', input(s.title))),
    field(t('Who gives it'), bind('teacher', input(s.teacher))),
    h('div', { class: 'row' }, field(t('When'), bind('local', input(s.local, { type: 'datetime-local' }))), field(t('Length (minutes)'), bind('minutes', input(s.minutes, { inputmode: 'numeric' })))),
    h('div', { class: 'row' }, field(t('Price'), bind('price', input(s.price, { placeholder: t('Free, or e.g. €40') }))), field(t('Seats'), bind('seats', input(s.seats, { inputmode: 'numeric', placeholder: t('no limit') })))),
    field(t('Where'), bind('place', input(s.place, { placeholder: t('Zoom, YouTube Live, or an address') }))),
    field(t('Link for those with a seat'), input(url, { type: 'url', placeholder: 'https://', oninput: (e) => { url = e.target.value; } }), t('Only people with a seat see it. For a free seminar it shows the moment they keep a seat.')),
    field(t('For whom'), forK),
    field(t('Description'), bind('about', area(s.about, { rows: 4 }))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!s.published, onchange: (e) => { s.published = e.target.checked; } }), h('span', {}, t('Published (everyone sees it)')))),
  (close) => [
    old ? h('button', { type: 'button', class: 'btn red', onclick: async () => { if (!(await ask(t('Delete it?')))) return; const { error } = await sb.from('roardino_seminars').delete().eq('id', old.id); if (error) return fail(error); close(); route(); } }, t('Delete')) : null,
    h('button', { type: 'button', class: 'btn', onclick: close }, t('Cancel')),
    h('button', { type: 'button', class: 'btn main', onclick: async () => {
      if (!s.title?.trim()) return toast(t('Write a title.'));
      const row = { title: s.title.trim(), teacher: s.teacher || null, kind: s.kind, starts_at: s.local ? new Date(s.local).toISOString() : null, minutes: +s.minutes || null, price: s.price || null, seats: +s.seats || null, place: s.place || null, about: s.about || null, for_kinds: s.for_kinds, published: !!s.published };
      const res = old ? await sb.from('roardino_seminars').update(row).eq('id', old.id).select().single() : await sb.from('roardino_seminars').insert(row).select().single();
      if (res.error) return fail(res.error);
      const l = await sb.from('roardino_seminar_links').upsert({ seminar_id: res.data.id, url: url.trim() || null });
      if (l.error) return fail(l.error);
      close(); toast(t('Saved')); route();
    } }, t('Save'))]);
}

/* =====================================================================================================================
   Start
   ===================================================================================================================== */
let started = false;
async function enter(s) {
  session = s;
  if (!s) { mine = []; isAdmin = false; stopNotes(); return route(); }
  const savedSeen = s.user?.user_metadata?.roardino_show_seen;
  if (typeof savedSeen === 'boolean' && savedSeen !== prefs.showSeen) setPref('showSeen', savedSeen);
  const savedStories = s.user?.user_metadata?.roardino_stories;
  if (typeof savedStories === 'boolean' && savedStories !== prefs.showStories) setPref('showStories', savedStories);
  const savedFeed = s.user?.user_metadata?.roardino_feed;
  if (savedFeed === 'all' || savedFeed === 'follow') { feedOnly = savedFeed; try { localStorage.setItem('roardino-feed', savedFeed); } catch { /* private */ } }
  try {
    await loadMine();
    const { data } = await sb.rpc('roar_is_admin');
    isAdmin = data === true;
  } catch (e) { fail(e); }
  crumb('signed in, drawing');
  await route();
  // the first screen comes in at once; motion only from now on (Alex, 5 Nov: "it flashes and blinks when it opens")
  setTimeout(() => document.documentElement.classList.remove('booting'), 450);
  startNotes();
}
sb.auth.onAuthStateChange((ev, s) => {
  crumb('auth ' + ev);
  if (ev === 'INITIAL_SESSION') { started = true; enter(s); return; }
  if (!started) return;
  if (ev === 'SIGNED_IN' && session?.user?.id === s?.user?.id) { session = s; return; } // a token refresh on focus
  if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') enter(s);
  if (ev === 'TOKEN_REFRESHED') session = s;
});
