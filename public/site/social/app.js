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

/* ---------- words: English is the key, Greek comes later in EL ---------- */
let LANG = 'en';
try { LANG = localStorage.getItem('roardino-lang') || 'en'; } catch { /* private window */ }
const EL = {};
const t = (s, vars) => { let x = (LANG === 'el' && EL[s]) || s; if (vars) for (const [k, v] of Object.entries(vars)) x = x.replaceAll(`{${k}}`, v); return x; };
const LOCALE = () => (LANG === 'el' ? 'el-GR' : 'en-GB');

/* ---------- settings kept on this device (Alex, 5 Nov) ---------- */
const PREFS_KEY = 'roardino-prefs';
const PREF_DEFAULTS = { theme: 'auto', text: 'normal', feedCalls: true, mutedVideos: true };
let prefs = { ...PREF_DEFAULTS };
try { prefs = { ...PREF_DEFAULTS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch { /* private window */ }
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
function wearPrefs() {
  const dark = prefs.theme === 'dark' || (prefs.theme === 'auto' && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.text = prefs.text;
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
const HUE = { front: '#d40000', back: '#6f8fbf', creative: '#e0a33a' }; // Cast, Crew, Creatives
// looks and an actor's skills belong only to these (Alex, 4 Nov: not to the crew); everything else gets equipment and tools
const PERFORMERS = ['actor', 'model', 'dancer', 'extra'];
const PERFORMER = (kinds) => (kinds || []).some((k) => PERFORMERS.includes(k) || k === 'theatre');
const CREW = (kinds) => (kinds || []).some((k) => !PERFORMERS.includes(k) && k !== 'theatre');
const FILTERS = [['all', 'Everyone'], ['actor', 'Actors'], ['model', 'Models'], ['dancer', 'Dancers'], ['extra', 'Extras'], ['back', 'Crew'], ['creative', 'Creatives']]; // for whom a seminar is
const GENDERS = [['', '—'], ['f', 'Woman'], ['m', 'Man'], ['x', 'Other']];

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
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
const put = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false));
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
const SVG = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const ICON = {
  home: SVG('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
  people: SVG('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
  calls: SVG('<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12.5h18"/>'),
  cal: SVG('<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>'),
  user: SVG('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  search: SVG('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  down: SVG('<path d="m6 9 6 6 6-6"/>'),
  plus: SVG('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2.2"'),
  x: SVG('<path d="M6 6l12 12M18 6 6 18"/>', 'stroke-width="2.2"'),
  clap: SVG('<path d="M8 13l-2.5-2.5a1.8 1.8 0 012.5-2.5l5 5"/><path d="M10 9.5L8.5 8a1.8 1.8 0 012.5-2.5l5.5 5.5c2 2 2 5 0 7s-5 2-7 0L5 13.5a1.8 1.8 0 012.5-2.5"/><path d="M16 3l.5 2M20 6l-2 .5M19 2l-1.2 1.6"/>'),
  talk: SVG('<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/>'),
  pic: SVG('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'),
  trash: SVG('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  left: SVG('<path d="M15 18l-6-6 6-6"/>', 'stroke-width="2.2"'),
  right: SVG('<path d="M9 6l6 6-6 6"/>', 'stroke-width="2.2"'),
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  star: SVG('<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'),
  edit: SVG('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  out: SVG('<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>'),
  send: SVG('<path d="M22 3 11 14"/><path d="M22 3 15 21l-4-7-7-4z"/>'),
  grid: SVG('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  gear: SVG('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  sun: SVG('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: SVG('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  child: SVG('<circle cx="12" cy="7" r="3"/><path d="M7 21v-5a5 5 0 0 1 10 0v5"/>'),
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
const bg = (p) => (urlOf(p) ? { backgroundImage: `url("${urlOf(p)}")` } : {});
const avatar = (p, cls = '') => h('span', { class: 'av ' + cls, style: bg(p?.avatar) }, urlOf(p?.avatar) ? '' : initials(p?.name));
// a picture made lighter in the browser (long side 1800px, JPEG); anything it cannot read goes as it is
async function shrink(file) {
  if (!/^image\//.test(file.type) || /gif/.test(file.type)) return file;
  try {
    const img = await createImageBitmap(file);
    const k = Math.min(1, 1800 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch { return file; }
}
async function upload(personId, file, sub = '') {
  if (/^video\//.test(file.type) && file.size > MAX_VIDEO) throw new Error(t('The video is over 200 MB. Keep it to a minute or two.'));
  const f = await shrink(file);
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
const app = $('#app');
const me = () => mine.find((m) => !m.minor) || mine[0] || null; // the profile that is me (a parent's own, not a child's)

async function loadMine() {
  const { data, error } = await sb.from('roardino_people').select('*').eq('owner', session.user.id).order('created_at');
  if (error) throw error;
  mine = data || [];
  const f = await sb.from('roardino_follows').select('person_id').eq('user_id', session.user.id);
  follows = new Set((f.data || []).map((x) => x.person_id));
  await sign(mine.map((p) => p.avatar));
}

/* ---------- the window ---------- */
function openWin(title, body, foot) {
  const veil = h('div', { class: 'veil', onclick: (e) => { if (e.target === veil) close(); } });
  const close = () => { veil.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  veil.append(h('div', { class: 'win', role: 'dialog', 'aria-label': title }, h('h2', {}, title), body, foot ? h('div', { class: 'foot' }, foot(close)) : null));
  document.body.append(veil);
  return close;
}
// a <label> only around a real field: around a row of pills a browser (Safari above all) passes every tap on to the
// first pill too, which kept turning "Actor" on (Alex, 5 Nov)
const field = (label, el, hint) => h(/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) ? 'label' : 'div', { class: 'field' }, h('span', {}, label), el, hint ? h('p', { class: 'hint' }, hint) : null);
const input = (value, extra = {}) => h('input', { class: 'input', value: value ?? '', ...extra });
const area = (value, extra = {}) => h('textarea', { class: 'textarea', ...extra }, value ?? '');
const select = (options, value, extra = {}) => h('select', { class: 'select', ...extra }, options.map(([v, s]) => h('option', { value: v, selected: v === (value ?? '') }, s)));
const seg = (items, on, pick) => h('div', { class: 'seg' }, items.map(([k, s]) => h('button', { type: 'button', class: on === k ? 'on' : '', onclick: () => pick(k) }, s)));

/* ---------- the frame: top bar, bottom bar on a phone ---------- */
const NAV = [['feed', 'Feed', 'home'], ['people', 'Cast & Crew', 'people'], ['calls', 'Calls', 'calls'], ['seminars', 'Seminars', 'cal'], ['chat', 'Chat', 'talk']];
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
  const find = h('input', { type: 'search', placeholder: t('Search cast, crew & creatives'), 'aria-label': t('Search cast, crew & creatives'), value: on === 'people' ? peopleQ : '', onkeydown: (e) => { if (e.key === 'Enter') { peopleQ = e.target.value; if (location.hash === '#/people') viewPeople(); else location.hash = '#/people'; } } });
  return h('header', { class: 'bar' }, h('div', { class: 'bar-in' },
    h('a', { href: '#/feed', 'aria-label': 'Roardino' }, mark()),
    h('label', { class: 'find' }, icon('search'), find),
    h('span', { class: 'grow' }),
    h('nav', { class: 'icons' }, NAV.map(([k, s, ic]) => h('a', { class: 'ico' + (on === k ? ' on' : ''), href: `#/${k}`, title: t(s), 'aria-label': t(s), html: ICON[ic] }))),
    h('button', { type: 'button', class: 'ico', title: t('Light or dark'), 'aria-label': t('Light or dark'), html: document.documentElement.dataset.theme === 'dark' ? ICON.sun : ICON.moon, onclick: (e) => { setPref('theme', document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); e.currentTarget.innerHTML = document.documentElement.dataset.theme === 'dark' ? ICON.sun : ICON.moon; } }),
    h('span', { class: 'sep' }),
    h('button', { type: 'button', class: 'who-me', onclick: toggle, 'aria-label': t('Me') }, avatar(m || { name: session.user.user_metadata?.name || session.user.email }), h('span', { class: 'nm' }, m?.name || session.user.user_metadata?.name || t('Me')), icon('down')),
    menu));
}
function tabBar(on) {
  const m = me();
  return h('nav', { class: 'tabbar' }, NAV.map(([k, s, ic]) => h('a', { href: `#/${k}`, class: on === k ? 'on' : '' }, icon(ic), t(s))),
    h('a', { href: m ? `#/p/${m.id}` : '#/edit/new', class: on === 'me' ? 'on' : '' }, icon('user'), t('Me')));
}
function frame(on, ...content) { put(app, topBar(on), h('main', { class: 'page' }, ...content), tabBar(on)); window.scrollTo(0, 0); }

async function route() {
  document.querySelectorAll('.veil').forEach((v) => v.remove()); // a window never outlives its page
  if (!session) return viewFront();
  const [, a = 'feed', b] = (location.hash || '#/feed').split('/');
  try {
    if (a === 'people') return await viewPeople();
    if (a === 'p' && b) return await viewPerson(b);
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
window.addEventListener('hashchange', route);

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
    h('header', { class: 'bar' }, h('div', { class: 'bar-in' }, mark())),
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
        .map(([a, b], i) => h('div', {}, h('span', { class: 'no' }, '0' + (i + 1)), h('b', {}, t(a)), h('p', {}, t(b))))));
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
let feedOnly = 'all';
async function viewFeed() {
  document.title = 'Roardino';
  const left = h('aside', { class: 'side left' }, meCard());
  const mid = h('div', { class: 'mid' }, h('p', { class: 'wait' }, t('Loading…')));
  // two columns (Alex, 4 Nov): my card with the week and the calls under it on the left, the work wide on the right
  put(app, topBar('feed'), h('main', { class: 'page' }, h('div', { class: 'two' }, left, mid)), tabBar('feed'));
  window.scrollTo(0, 0);
  const [people, calls, seminars, stories] = await Promise.all([
    sb.from('roardino_people').select('id,name,avatar,kinds').eq('visible', true).order('updated_at', { ascending: false }).limit(30),
    sb.from('roardino_calls').select('*').eq('open', true).order('created_at', { ascending: false }).limit(30),
    sb.from('roardino_seminars').select('*').order('starts_at', { ascending: true, nullsFirst: false }).limit(30),
    loadStories()]);
  const others = (people.data || []).filter((p) => !mine.some((m) => m.id === p.id) && !follows.has(p.id)).slice(0, 14);
  await sign(others.map((p) => p.avatar));
  left.append(weekCard(calls.data || [], seminars.data || []), callsForMe(calls.data || []));

  let q = sb.from('roardino_posts').select('*, person:roardino_people(id,name,avatar,kinds,headline)').order('created_at', { ascending: false }).limit(40);
  if (feedOnly === 'follow') q = q.in('person_id', [...follows, ...mine.map((m) => m.id), '00000000-0000-0000-0000-000000000000']);
  const { data, error } = await q;
  if (error) throw error;
  const cards = data.length ? await posts(data, () => viewFeed()) : [h('div', { class: 'empty' }, h('b', {}, feedOnly === 'follow' ? t('Nobody to show yet') : t('Nothing here yet')), feedOnly === 'follow' ? t('Follow people from People and their work shows here.') : t('Post your first work.'))];
  // calls ride in the feed, one after every three posts, as Alex's reference shows a job among the posts
  const openCalls = (calls.data || []).slice(0, 6);
  const stream = [];
  cards.forEach((c, i) => { stream.push(c); if (prefs.feedCalls && i % 3 === 2 && openCalls.length) stream.push(callTile(openCalls.shift())); });
  if (prefs.feedCalls && stream.length < 4) openCalls.slice(0, 2).forEach((c) => stream.push(callTile(c)));
  put(mid, 
    storiesCard(stories, others),
    mine.length ? composer(() => viewFeed()) : null,
    h('div', { class: 'head', style: { margin: '2px 0 -4px' } }, seg([['all', t('Everyone')], ['follow', t('Following')]], feedOnly, (k) => { feedOnly = k; viewFeed(); })),
    ...stream);
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
  const stats = h('div', { class: 'me-stats' }, h('div', {}, h('b', {}, '·'), h('small', {}, t('Followers'))), h('div', {}, h('b', {}, String(follows.size)), h('small', {}, t('Following'))), h('div', {}, h('b', {}, '·'), h('small', {}, t('Works'))));
  const work = h('div', { class: 'mini-grid' });
  const skills = [...(m.kinds || []).map(kindName), ...tags(m.data?.skills?.dance), ...tags(m.data?.skills?.languages), ...tags(m.data?.skills?.software), ...tags(m.data?.gear)].slice(0, 10);
  (async () => {
    const [{ data: st }, { data: ps }] = await Promise.all([
      sb.rpc('roardino_person_stats', { p: m.id }),
      sb.from('roardino_posts').select('*').eq('person_id', m.id).neq('kind', 'photo').order('pos', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }).limit(4)]);
    if (st) { stats.children[0].firstChild.textContent = String(st.followers); stats.children[2].firstChild.textContent = String(st.posts); }
    const pics = (ps || []).map((p) => (p.media || []).find((x) => x.type === 'image')).filter(Boolean);
    await sign(pics.map((x) => x.path));
    put(work, ...pics.map((x) => h('a', { href: `#/p/${m.id}`, style: bg(x.path) })));
    if (!pics.length) work.replaceWith(h('p', { class: 'hint' }, t('Post a photo of your work and it shows here.')));
  })();
  return h('section', { class: 'card me-card' },
    h('div', { class: 'me-cover' }),
    h('a', { class: 'me-top', href: `#/p/${m.id}` }, avatar(m, 'lg'), h('div', {}, h('b', {}, m.name), h('small', {}, m.headline || (m.kinds || []).map(kindName).slice(0, 2).join(' · ')))),
    stats,
    h('div', { class: 'me-in' },
      h('hr'),
      skills.length ? [h('h3', {}, t('Skills'), h('a', { href: `#/edit/${m.id}` }, t('Edit'))), h('div', { class: 'chips' }, skills.map((s) => h('span', { class: 'tag' }, s))), h('hr')] : null,
      h('h3', {}, t('Your work'), h('a', { href: `#/p/${m.id}` }, t('All'))),
      work,
      h('div', { style: { marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' } },
        h('a', { class: 'btn main', href: `#/p/${m.id}` }, icon('user'), t('View my profile')))));
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
function composer(done) {
  let as = me().id;
  let kind = 'work'; // Alex, 5 Nov: every upload says what it is, Work (My Work) or My photo (My Photos)
  const kindBox = h('div');
  const drawKind = () => put(kindBox, seg([['work', t('Work')], ['photo', t('My photo')]], kind, (k) => { kind = k; drawKind(); }));
  drawKind();
  const files = [];
  const text = area('', { placeholder: t('What did you shoot, what are you preparing, what are you looking for?'), rows: 2 });
  const prev = h('div', { class: 'thumbs' });
  const pick = h('input', { type: 'file', accept: 'image/*,video/*', multiple: true, hidden: true, onchange: (e) => { for (const f of e.target.files) if (files.length < 6) files.push(f); e.target.value = ''; draw(); } });
  const draw = () => put(prev, ...files.map((f, i) => h('div', { class: 'thumb', style: /^image/.test(f.type) ? { backgroundImage: `url("${URL.createObjectURL(f)}")` } : {} },
    /^video/.test(f.type) ? h('span', { class: 'star' }, t('Video')) : null,
    h('button', { type: 'button', class: 'x', html: ICON.x, 'aria-label': t('Remove'), onclick: () => { files.splice(i, 1); draw(); } }))));
  const btn = h('button', { type: 'button', class: 'btn main', onclick: send }, t('Post'));
  async function send() {
    if (!text.value.trim() && !files.length) return toast(t('Write something or add a photo.'));
    btn.disabled = true; btn.textContent = t('Uploading…');
    try {
      const media = [];
      for (const f of files) media.push({ path: await upload(as, f, 'posts/'), type: /^video/.test(f.type) ? 'video' : 'image' });
      const { error } = await sb.from('roardino_posts').insert({ person_id: as, body: text.value.trim() || null, media, kind });
      if (error) throw error;
      toast(t('Posted'));
      done();
    } catch (e) { fail(e); btn.disabled = false; btn.textContent = t('Post'); }
  }
  return h('div', { class: 'compose' },
    h('div', { class: 'c-top' }, avatar(me()), text),
    prev,
    h('div', { class: 'acts' },
      h('button', { type: 'button', class: 'btn sm', onclick: () => pick.click() }, icon('pic'), t('Photo / video')), pick, kindBox,
      mine.length > 1 ? select(mine.map((m) => [m.id, t('as {name}', { name: m.name })]), as, { style: { width: 'auto', height: '34px', padding: '0 14px' }, onchange: (e) => { as = e.target.value; } }) : null,
      h('span', { style: { flex: 1 } }), btn));
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
function postCard(r, st, refresh) {
  const p = r.person || {};
  const media = r.media || [];
  const own = r.owner === session.user.id;
  const talk = h('div', { class: 'talk hidden' });
  const count = h('p', { class: 'ig-count' });
  const drawCount = () => { count.textContent = st.bravos ? (st.bravos === 1 ? t('1 bravo') : t('{n} bravo', { n: st.bravos })) : ''; count.classList.toggle('hidden', !st.bravos); };
  drawCount();
  const bravoBtn = h('button', { type: 'button', class: 'ig-ico' + (st.mine ? ' on' : ''), title: 'Bravo', 'aria-label': 'Bravo', html: ICON.clap, onclick: async () => {
    st.mine = !st.mine; st.bravos += st.mine ? 1 : -1; bravoBtn.classList.toggle('on', st.mine); bravoBtn.classList.remove('pop'); void bravoBtn.offsetWidth; if (st.mine) bravoBtn.classList.add('pop'); drawCount();
    const { error } = st.mine ? await sb.from('roardino_bravos').insert({ post_id: r.id }) : await sb.from('roardino_bravos').delete().eq('post_id', r.id).eq('user_id', session.user.id);
    if (error) fail(error);
  } });
  const openTalk = () => { talk.classList.remove('hidden'); if (!talk.dataset.on) { talk.dataset.on = '1'; drawTalk(talk, r, st, drawMore); } talk.querySelector('input')?.focus(); };
  const more = h('button', { type: 'button', class: 'ig-more', onclick: () => { if (talk.classList.contains('hidden')) openTalk(); else talk.classList.add('hidden'); } });
  const drawMore = () => put(more, st.comments ? (st.comments === 1 ? t('View 1 comment') : t('View all {n} comments', { n: st.comments })) : t('Add a comment…'));
  drawMore();
  const share = async () => {
    const url = `${location.origin}${location.pathname}#/p/${p.id}`;
    try { if (navigator.share) await navigator.share({ title: p.name, url }); else { await navigator.clipboard.writeText(url); toast(t('Link copied')); } } catch { /* closed */ }
  };
  const slides = media.length ? h('div', { class: 'ig-media' + (media.length > 1 ? ' many' : '') }, media.map((m) => (m.type === 'video'
    ? h('video', { src: urlOf(m.path), controls: true, playsInline: true, preload: 'metadata', muted: prefs.mutedVideos })
    : h('img', { src: urlOf(m.path), alt: '', loading: 'lazy', ondblclick: () => { if (!st.mine) bravoBtn.click(); } })))) : null;
  const dots = media.length > 1 ? h('div', { class: 'ig-dots' }, media.map((_, i) => h('i', { class: i ? '' : 'on' }))) : null;
  if (slides && dots) slides.addEventListener('scroll', () => { const i = Math.round(slides.scrollLeft / slides.clientWidth); dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === i)); });
  return h('article', { class: 'post ig' },
    h('div', { class: 'post-head' },
      h('a', { href: `#/p/${p.id}`, class: 'ring-sm' }, avatar(p)),
      h('div', { class: 'who-line' }, h('a', { href: `#/p/${p.id}` }, h('b', {}, p.name || '')), h('small', {}, p.headline || (p.kinds || []).map(kindName).slice(0, 2).join(' · '))),
      own ? h('button', { type: 'button', class: 'ig-ico sm', title: t('Delete'), 'aria-label': t('Delete'), html: ICON.trash, onclick: async () => {
        if (!confirm(t('Delete this post?'))) return;
        const { error } = await sb.from('roardino_posts').delete().eq('id', r.id);
        if (error) return fail(error);
        removeFiles(media.map((m) => m.path)); refresh();
      } }) : null),
    slides, dots,
    !media.length && r.body ? h('p', { class: 'post-body big' }, r.body) : null,
    h('div', { class: 'ig-bar' }, bravoBtn,
      h('button', { type: 'button', class: 'ig-ico', title: t('Comment'), 'aria-label': t('Comment'), html: ICON.talk, onclick: openTalk }),
      h('button', { type: 'button', class: 'ig-ico', title: t('Share'), 'aria-label': t('Share'), html: ICON.send, onclick: share }),
      h('span', { class: 'grow' }),
      own ? null : h('a', { class: 'btn sm main', href: `#/p/${p.id}` }, t('Work with me'))),
    count,
    media.length && r.body ? h('p', { class: 'ig-cap' }, h('a', { href: `#/p/${p.id}` }, h('b', {}, p.name)), ' ', r.body) : null,
    more,
    h('p', { class: 'ig-time' }, ago(r.created_at)),
    talk);
}
async function drawTalk(box, r, st, recount) {
  put(box, h('p', { class: 'hint' }, t('Loading…')));
  const { data } = await sb.from('roardino_comments').select('*, person:roardino_people(id,name,avatar)').eq('post_id', r.id).order('created_at');
  await sign((data || []).map((c) => c.person?.avatar));
  const text = input('', { placeholder: t('Write a comment…'), onkeydown: (e) => { if (e.key === 'Enter') send(); } });
  async function send() {
    const body = text.value.trim();
    if (!body) return;
    const { error } = await sb.from('roardino_comments').insert({ post_id: r.id, body, person_id: me()?.id || null });
    if (error) return fail(error);
    st.comments++; recount(); drawTalk(box, r, st, recount);
  }
  put(box, 
    ...(data || []).map((c) => h('div', { class: 'cmt' },
      h('a', { href: c.person ? `#/p/${c.person.id}` : '#/feed' }, avatar(c.person || {}, 'sm')),
      h('div', {}, h('b', {}, c.person?.name || t('Member')), ' ', c.body, h('small', {}, ago(c.created_at))),
      c.owner === session.user.id || r.owner === session.user.id ? h('button', { type: 'button', class: 'linkish', onclick: async () => {
        await sb.from('roardino_comments').delete().eq('id', c.id); st.comments--; recount(); drawTalk(box, r, st, recount);
      } }, t('delete')) : null)),
    h('div', { class: 'cmt-new' }, avatar(me() || { name: '?' }, 'sm'), text, h('button', { type: 'button', class: 'btn sm', onclick: send }, t('Send'))));
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
function storiesCard(groups, others) {
  const m = me();
  const myGroup = m && groups.find((g) => g.person.id === m.id);
  const rest = groups.filter((g) => g !== myGroup);
  const pick = h('input', { type: 'file', accept: 'image/*,video/*', hidden: true, onchange: async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) await addStory(f); } });
  const ringOf = (g) => (g.items.some((x) => !seenStories.has(x.id)) ? 'r' : 'r seen');
  const face = (p, cls) => h('span', { class: cls }, h('i', { style: bg(p.avatar) }, urlOf(p.avatar) ? '' : initials(p.name)));
  return h('section', { class: 'card stories' },
    h('div', { class: 'ring-row' },
      m ? h('div', { class: 'ring me', role: 'button', tabIndex: 0, onclick: () => (myGroup ? openStories([myGroup, ...rest], 0) : pick.click()) },
        face(m, myGroup ? ringOf(myGroup) : 'r plain'),
        h('button', { type: 'button', class: 'add', 'aria-label': t('Add to your story'), html: ICON.plus, onclick: (e) => { e.stopPropagation(); pick.click(); } }),
        h('em', {}, t('Your story')), pick) : null,
      rest.map((g, i) => h('button', { type: 'button', class: 'ring', onclick: () => openStories(rest, i) }, face(g.person, ringOf(g)), h('em', {}, g.person.name.split(' ')[0]))),
      others.filter((p) => !groups.some((g) => g.person.id === p.id)).map((p) => h('a', { class: 'ring', href: `#/p/${p.id}`, title: t('Just for you') }, face(p, 'r plain'), h('em', {}, p.name.split(' ')[0])))));
}
async function addStory(file) {
  const m = me();
  if (!m) return;
  toast(t('Uploading…'));
  try {
    const path = await upload(m.id, file, 'stories/');
    const { error } = await sb.from('roardino_stories').insert({ person_id: m.id, media: { path, type: /^video/.test(file.type) ? 'video' : 'image' } });
    if (error) throw error;
    toast(t('Added to your story'));
    viewFeed();
  } catch (e) { fail(e); }
}
function openStories(groups, gi) {
  if (!groups.length) return;
  let g = gi, i = Math.max(0, groups[gi].items.findIndex((x) => !seenStories.has(x.id)));
  let timer = null, started = 0, left = 0, paused = false;
  const bars = h('div', { class: 'st-bars' });
  const head = h('div', { class: 'st-head' });
  const stage = h('div', { class: 'st-stage' });
  const cap = h('p', { class: 'st-cap' });
  const card = h('div', { class: 'st-card' }, stage, bars, head, cap,
    h('button', { type: 'button', class: 'st-tap prev', 'aria-label': t('Previous'), onclick: () => step(-1) }),
    h('button', { type: 'button', class: 'st-tap next', 'aria-label': t('Next'), onclick: () => step(1) }));
  const veil = h('div', { class: 'st-veil', onclick: (e) => { if (e.target === veil) close(); } }, card,
    h('button', { type: 'button', class: 'st-x', 'aria-label': t('Close'), html: ICON.x, onclick: () => close() }));
  const onKey = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
  document.addEventListener('keydown', onKey);
  // hold to pause, as on a phone
  card.addEventListener('pointerdown', () => { paused = true; clearTimeout(timer); left -= Date.now() - started; stage.querySelector('video')?.pause(); bars.classList.add('paused'); });
  const resume = () => { if (!paused) return; paused = false; bars.classList.remove('paused'); stage.querySelector('video')?.play().catch(() => {}); run(Math.max(300, left)); };
  card.addEventListener('pointerup', resume); card.addEventListener('pointerleave', resume);
  function close() { clearTimeout(timer); veil.remove(); document.removeEventListener('keydown', onKey); if (location.hash === '#/feed' || location.hash === '') viewFeed(); }
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
        if (!confirm(t('Delete this story?'))) return;
        const { error } = await sb.from('roardino_stories').delete().eq('id', st.id);
        if (error) return fail(error);
        if (!/^https?:/.test(st.media?.path || '')) removeFiles([st.media?.path]);
        grp.items.splice(i, 1);
        if (!grp.items.length) { groups.splice(g, 1); if (!groups.length) return close(); if (g >= groups.length) return close(); i = 0; } else if (i >= grp.items.length) i = grp.items.length - 1;
        show();
      } }) : null);
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
const sideOf = (k) => (k === 'theatre' ? 'front' : SIDE[k]);
const SIDES = { cast: 'front', crew: 'back', creatives: 'creative' };
async function viewPeople() {
  document.title = 'Roardino · ' + t('Cast, Crew & Creatives');
  const grid = h('div', { class: 'faces' }, h('p', { class: 'wait' }, t('Loading…')));
  const sideBox = h('div');
  const pills = h('div', { class: 'pills' });
  const search = input(peopleQ, { type: 'search', class: 'input search', placeholder: t('Name, city, what they do'), 'aria-label': t('Search cast & crew'), oninput: (e) => { peopleQ = e.target.value; draw(); } });
  frame('people', h('div', { class: 'head' }, h('h1', {}, t('Cast, Crew & Creatives')), sideBox, search, h('span', { class: 'grow' })), h('div', { style: { marginBottom: '16px' } }, pills), grid);
  const { data, error } = await sb.from('roardino_people').select('id,name,kinds,city,birth,avatar,headline,minor,data').eq('visible', true).order('updated_at', { ascending: false }).limit(500);
  if (error) throw error;
  await sign(data.map((p) => p.avatar));
  function draw() {
    put(sideBox, seg([['all', t('All')], ['cast', t('Cast')], ['crew', t('Crew')], ['creatives', t('Creatives')]], peopleSide, (k) => { peopleSide = k; peopleKind = ''; draw(); }));
    const kinds = KINDS.filter(([k]) => peopleSide === 'all' || SIDE[k] === SIDES[peopleSide]);
    put(pills, kinds.map(([k, s]) => h('button', { type: 'button', class: 'pill' + (peopleKind === k ? ' on' : ''), onclick: (e) => { e.preventDefault(); e.stopPropagation(); peopleKind = peopleKind === k ? '' : k; draw(); } }, t(s))));
    const q = peopleQ.trim().toLowerCase();
    const shown = data.filter((p) => {
      const ks = p.kinds || [];
      if (peopleSide !== 'all' && !ks.some((k) => sideOf(k) === SIDES[peopleSide])) return false;
      if (peopleKind && !ks.includes(peopleKind)) return false;
      if (!q) return true;
      return [p.name, p.city, p.headline, ...ks.map(kindName)].join(' ').toLowerCase().includes(q);
    });
    put(grid, shown.length ? shown.map(faceTile) : h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, h('b', {}, t('Nobody here yet')), q ? t('Nothing for "{q}".', { q: peopleQ }) : t('We have just started. Invite your people.')));
  }
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
  await sign([p.avatar, ...photos, p.reel, p.cv, ...(grid || []).flatMap((g) => (g.media || []).slice(0, 1).map((m) => m.path))]);
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
  const contact = p.minor
    ? [p.guardian?.email && h('a', { class: 'btn', href: `mailto:${p.guardian.email}` }, t('Email the parent')), p.guardian?.phone && h('a', { class: 'btn', href: `tel:${p.guardian.phone}` }, t('Call the parent'))]
    : [K.email && h('a', { class: 'btn', href: `mailto:${K.email}` }, t('Email')), K.phone && h('a', { class: 'btn', href: `tel:${K.phone}` }, t('Phone')), C.instagram && h('a', { class: 'btn', href: `https://instagram.com/${C.instagram.replace(/^@/, '')}`, target: '_blank', rel: 'noopener' }, 'Instagram'), C.site && h('a', { class: 'btn', href: /^https?:/.test(C.site) ? C.site : `https://${C.site}`, target: '_blank', rel: 'noopener' }, t('Website'))];
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
  const pics = h('div', { class: 'grid' }, photos.length || photoPosts.length ? [...photoPosts.map((g) => { const m0 = (g.media || [])[0]; return h('button', { type: 'button', class: 'cell', style: m0?.type === 'image' ? bg(m0.path) : {}, 'aria-label': t('Photo'), onclick: () => openPost(g, p) }, m0?.type === 'video' ? h('video', { src: urlOf(m0.path) + '#t=0.5', muted: true, playsInline: true, preload: 'metadata' }) : null); }), ...photos.map((ph) => h('button', { type: 'button', class: 'cell', style: bg(ph), 'aria-label': t('Photo'), onclick: () => openWin(p.name, h('img', { src: urlOf(ph), alt: '', style: { width: '100%', borderRadius: '12px' } }), (c) => [h('button', { type: 'button', class: 'btn', onclick: c }, t('Close'))]) }))] : h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, t('No photos yet.')));
  const work = gridBlock(p, (grid || []).filter((g) => g.kind !== 'photo'), own);
  const body = h('div');
  const tabRow = h('div', { class: 'ig-tabs' });
  let tab = 'work';
  const drawTab = () => {
    // My Work, My Photos, My Bio on my own profile; Work, Photos, Bio on someone else's (Alex, 5 Nov)
    put(tabRow, [['work', own ? t('My Work') : t('Work'), 'grid'], ['photos', own ? t('My Photos') : t('Photos'), 'pic'], ['details', own ? t('My Bio') : t('Bio'), 'user']].map(([k, s2, ic]) => h('button', { type: 'button', class: tab === k ? 'on' : '', onclick: () => { tab = k; drawTab(); } }, icon(ic), s2)));
    put(body, tab === 'work' ? work : tab === 'photos' ? pics : details);
  };
  drawTab();
  frame(mineTab,
    h('section', { class: 'ig-head' },
      h('div', { class: 'ig-av' + (theirStories.length ? ' has' : ''), role: theirStories.length ? 'button' : null, title: theirStories.length ? t('Stories') : null, onclick: theirStories.length ? () => openStories(theirStories, 0) : null },
        h('span', { class: 'r big' + (theirStories.length ? '' : ' plain') }, h('i', { style: bg(photos[0] || p.avatar) }, urlOf(photos[0] || p.avatar) ? '' : initials(p.name)))),
      h('div', { class: 'ig-info' },
        h('div', { class: 'ig-name' }, h('h1', {}, p.name),
          own ? h('a', { class: 'btn sm main', href: `#/edit/${p.id}` }, icon('edit'), t('Edit profile')) : followBtn),
        stats ? h('div', { class: 'ig-stats' }, [[stats.posts, t('works')], [stats.followers, t('followers')], [stats.bravos, 'bravo']].map(([n, s2]) => h('span', {}, h('b', {}, String(n)), ' ', s2))) : null,
        h('div', { class: 'chips' }, (p.kinds || []).map(kindChip), p.minor ? h('span', { class: 'chip', style: { '--c': '#e0a33a' } }, h('i'), t('Under 18 · with a parent')) : null),
        p.headline ? h('p', { class: 'ig-line' }, p.headline) : null,
        p.bio ? h('p', { class: 'ig-bio' }, p.bio) : null,
        h('p', { class: 'ig-meta' }, [p.city, a != null && PERFORMER(p.kinds) ? t('{n} years', { n: a }) : '', L.height ? `${L.height} cm` : ''].filter(Boolean).join(' · ')),
        contact.filter(Boolean).length ? h('div', { class: 'acts', style: { marginTop: 0 } }, contact.filter(Boolean).map((b2) => { b2.classList.add('sm'); return b2; })) : null)),
    tabRow, body);
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
    if (!rows.length) { put(box, h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, own ? t('Post your first work from the Feed.') : t('No work posted yet.'))); return; }
    put(box, ...rows.map((r, i) => {
      const m = (r.media || [])[0];
      return h(editing ? 'div' : 'button', { type: editing ? null : 'button', class: 'cell', draggable: editing ? 'true' : null, style: m && m.type === 'image' ? bg(m.path) : {},
        onclick: editing ? null : () => openPost(r, p),
        ondragstart: () => { drag = i; }, ondragover: (e) => e.preventDefault(), ondrop: (e) => { e.preventDefault(); if (drag != null) move(drag, i); drag = null; } },
        m?.type === 'video' ? h('video', { src: urlOf(m.path) + '#t=0.5', muted: true, playsInline: true, preload: 'metadata' }) : null,
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
    h('a', { class: 'add-pic', href: '#/edit/new' }, t('+ New profile')),
    h('a', { class: 'add-pic', href: '#/edit/kid' }, t('+ My child\'s profile'))),
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
  // pictures in their order, the first the main one: { path } already uploaded or { file } picked now (uploaded on Save)
  const pics = (p.photos || []).map((x) => ({ path: x.path }));
  let reelFile = null, cvFile = null;
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
  const pickPics = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: (e) => { for (const f of e.target.files) if (pics.length < 10) pics.push({ file: f, u: URL.createObjectURL(f) }); e.target.value = ''; drawThumbs(); } });
  const drawThumbs = () => {
    put(thumbs, ...pics.map((it, i) => h('div', { class: 'thumb', style: { backgroundImage: `url("${it.u || urlOf(it.path)}")` }, title: i ? t('Make it the main one') : t('The main one'), onclick: () => { pics.splice(i, 1); pics.unshift(it); drawThumbs(); } },
      i === 0 ? h('span', { class: 'star' }, t('Main')) : null,
      h('button', { type: 'button', class: 'x', html: ICON.x, 'aria-label': t('Remove'), onclick: (e) => { e.stopPropagation(); pics.splice(i, 1); drawThumbs(); } }))),
    pics.length < 10 ? h('button', { type: 'button', class: 'add-pic', onclick: () => pickPics.click() }, t('+ Photos')) : null);
  };
  const reelName = h('span', { class: 'hint' }, p.reel ? t('A self-tape is up.') : '');
  const cvName = h('span', { class: 'hint' }, p.cv ? t('A CV is up.') : '');
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
      let reel = p.reel, cv = p.cv;
      if (reelFile) { msg.textContent = t('Uploading video…'); reel = await upload(id, reelFile, 'tape/'); }
      if (cvFile) cv = await upload(id, cvFile, 'cv/');
      d.credits = credits.value.split('\n').map((x) => x.trim()).filter(Boolean);
      const row = {
        id, name: p.name.trim(), kinds: p.kinds, city: p.city || null, birth: p.birth || null, gender: p.gender || null,
        headline: p.headline || null, bio: p.bio || null, guardian: p.guardian, data: d,
        photos: allPics, avatar: allPics[0]?.path || null, reel, reel_url: p.reel_url || null, cv,
        visible: p.visible !== false, consent_at: p.consent_at || new Date().toISOString(),
      };
      const { error } = old ? await sb.from('roardino_people').update(row).eq('id', id) : await sb.from('roardino_people').insert(row);
      if (error) throw error;
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
    if (!confirm(t('Delete the profile "{name}" for good, with its photos and posts?', { name: old.name }))) return;
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
      h('div', { class: 'row' }, field(kid ? t('Child\'s full name') : t('Full name or stage name'), bind(p, 'name', input(p.name))), field(t('City'), bind(p, 'city', input(p.city, { placeholder: t('e.g. Athens') })))),
      h('div', { class: 'row' },
        field(t('Date of birth'), input(p.birth, { type: 'date', oninput: (e) => { p.birth = e.target.value; drawGuard(); } }), kid ? null : t('Not shown; only the age shows, and only for people in front of the camera.')),
        field(t('Gender'), select(GENDERS.map(([v, s]) => [v, t(s)]), p.gender, { onchange: (e) => { p.gender = e.target.value; } }))),
      field(t('One line about you'), bind(p, 'headline', input(p.headline, { maxlength: 120, placeholder: t('e.g. Stage and screen actor, dances contemporary') }))),
      field(t('What you do'), kindsBox, t('Pick all that apply.'))),
    guard,
    sec(t('Photos and video'),
      picHint, thumbs, pickPics,
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
        h('div', { class: 'row', style: { marginTop: '10px' } }, field('Instagram', bind(C, 'instagram', input(C.instagram, { placeholder: '@' }))), field(t('Website'), bind(C, 'site', input(C.site)))),
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
  frame('calls', h('div', { class: 'head' }, h('h1', {}, t('Calls')), seg([['all', t('All')], ['casting', t('Casting')], ['crew', t('Crew')], ['mine', t('Mine')]], callsFilter, (k) => { callsFilter = k; viewCalls(); }), h('span', { class: 'grow' }), h('button', { type: 'button', class: 'btn main', onclick: () => editCall() }, icon('plus'), t('New call'))), box);
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
    old ? h('button', { type: 'button', class: 'btn red', onclick: async () => { if (!confirm(t('Delete the call?'))) return; const { error } = await sb.from('roardino_calls').delete().eq('id', old.id); if (error) return fail(error); close(); location.hash = '#/calls'; } }, t('Delete')) : null,
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
        h('h1', { style: { fontSize: '30px', margin: '4px 0', fontWeight: 650 } }, c.title),
        callWho(c) ? h('p', { style: { color: 'var(--ink2)' } }, callWho(c)) : null,
        h('div', { class: 'facts', style: { margin: '6px 0' } }, [['City', c.city], ['When', c.dates], ['Pay', c.pay], ['Production', c.company], ['Applications until', c.closes && new Date(c.closes).toLocaleDateString(LOCALE())]].filter(([, v]) => v).map(([k, v]) => h('div', { class: 'fact' }, h('small', {}, t(k)), h('span', {}, v)))),
        c.about ? h('p', { style: { whiteSpace: 'pre-wrap', color: 'var(--ink2)' } }, c.about) : null,
        h('div', { class: 'acts' },
          own ? [h('button', { type: 'button', class: 'btn', onclick: () => editCall(c) }, icon('edit'), t('Edit')),
            h('button', { type: 'button', class: 'btn', onclick: async () => { const { error: er } = await sb.from('roardino_calls').update({ open: !c.open }).eq('id', c.id); if (er) return fail(er); route(); } }, c.open ? t('Close the call') : t('Open it again'))]
            : mineApplied.length ? h('span', { class: 'chip', style: { '--c': '#35c98b' } }, h('i'), t('You applied as {names}', { names: mineApplied.map((a) => a.person?.name).join(', ') }))
              : c.open ? h('button', { type: 'button', class: 'btn main', onclick: () => apply(c) }, t('Apply')) : null))),
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
   Settings (Alex, 5 Nov: "light and dark, and some settings it may need")
   ===================================================================================================================== */
function viewSettings() {
  document.title = 'Roardino · ' + t('Settings');
  const row = (title, hint, control) => h('div', { class: 'set-row' }, h('div', {}, h('b', {}, title), hint ? h('small', {}, hint) : null), control);
  const choice = (k, items) => { const box = h('div'); const draw = () => put(box, seg(items, prefs[k], (v) => { setPref(k, v); draw(); })); draw(); return box; };
  const toggle = (k) => h('input', { type: 'checkbox', class: 'switch', checked: !!prefs[k], onchange: (e) => setPref(k, e.target.checked) });
  const msg = h('p', { class: 'msg' });
  frame('me', h('div', { class: 'form' },
    h('div', { class: 'head' }, h('h1', {}, t('Settings'))),
    h('section', { class: 'sec' }, h('h2', {}, t('Appearance')),
      row(t('Theme'), t('Auto follows your phone or computer.'), choice('theme', [['light', t('Light')], ['dark', t('Dark')], ['auto', t('Auto')]])),
      row(t('Text size'), null, choice('text', [['normal', t('Normal')], ['large', t('Large')]])),
      row(t('Language'), t('Greek is on the way.'), h('div', { class: 'seg' }, h('button', { type: 'button', class: 'on' }, 'English'), h('button', { type: 'button', disabled: true, title: t('Soon') }, 'Ελληνικά')))),
    h('section', { class: 'sec' }, h('h2', {}, t('Feed')),
      row(t('Calls in the feed'), t('Open calls show between the posts.'), toggle('feedCalls')),
      row(t('Videos start muted'), null, toggle('mutedVideos')),
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
function viewChat() {
  document.title = 'Roardino · ' + t('Chat');
  // one frame kept for the whole visit, so going back to the chat is instant and keeps the conversation open
  chatFrame ||= h('iframe', { class: 'chat-frame', src: ROARME, title: 'RoarMe', allow: 'camera; microphone; clipboard-write; autoplay; fullscreen; display-capture' });
  frame('chat', h('div', { class: 'chat-wrap' }, chatFrame));
}

/* =====================================================================================================================
   Seminars
   ===================================================================================================================== */
async function viewSeminars() {
  document.title = 'Roardino · ' + t('Seminars');
  const box = h('div', { class: 'tiles' }, h('p', { class: 'wait' }, t('Loading…')));
  frame('seminars', h('div', { class: 'head' }, h('h1', {}, t('Seminars')), h('span', { class: 'grow' }), isAdmin ? h('button', { type: 'button', class: 'btn main', onclick: () => editSeminar() }, icon('plus'), t('New seminar')) : null), box);
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
          : left === 0 ? h('span', { class: 'hint' }, t('Full.')) : h('button', { type: 'button', class: 'btn main', onclick: () => takeSeat(s) }, t('Keep a seat')),
        isAdmin ? h('button', { type: 'button', class: 'btn', onclick: () => editSeminar(s, link[s.id]) }, icon('edit'), t('Edit · {n} seats taken', { n: taken[s.id] || 0 })) : null));
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
    old ? h('button', { type: 'button', class: 'btn red', onclick: async () => { if (!confirm(t('Delete it?'))) return; const { error } = await sb.from('roardino_seminars').delete().eq('id', old.id); if (error) return fail(error); close(); route(); } }, t('Delete')) : null,
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
  if (!s) { mine = []; isAdmin = false; return route(); }
  try {
    await loadMine();
    const { data } = await sb.rpc('roar_is_admin');
    isAdmin = data === true;
  } catch (e) { fail(e); }
  route();
}
sb.auth.onAuthStateChange((ev, s) => {
  if (ev === 'INITIAL_SESSION') { started = true; enter(s); return; }
  if (!started) return;
  if (ev === 'SIGNED_IN' && session?.user?.id === s?.user?.id) { session = s; return; } // a token refresh on focus
  if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') enter(s);
  if (ev === 'TOKEN_REFRESHED') session = s;
});
