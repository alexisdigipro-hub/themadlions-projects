'use strict';
/* =====================================================================================================================
   Roardino, the social place (Alex, 4 Nov 2026): "Facebook with Instagram" for the Greek film, theatre, dance and photo
   world. A feed (posts, bravo instead of like, comments, follow), people as photo tiles, a profile that is a portfolio
   (its posts as a grid in the order its owner sets), calls (casting and crew wanted, apply with one click) and seminars.
   Minors only through a parent's account, and their profiles are seen only by trusted productions (roardino_scouts).
   Its own thing: the only tie to the rest is the Roar Account. Data: RoarMe's Supabase project, tables roardino_people,
   _posts, _bravos, _comments, _follows, _calls, _applies, _seminars, _seminar_links, _seats, bucket roardino-people
   (supabase/roardino-social.sql in the hub repository).
   ===================================================================================================================== */

const SB_URL = 'https://bzmjhbnwhdwmncxkqkdl.supabase.co';
const SB_KEY = 'sb_publishable_7mQ3e0NH5lCmdoIKx2-FUA_EgCoXx9X'; // public by design
const BUCKET = 'roardino-people';
const MAX_VIDEO = 200 * 1024 * 1024;
const sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { storageKey: 'roardino-social-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

// what people do: in front (on camera, on stage) or behind
const KINDS = [
  ['actor', 'Ηθοποιός', 'front'], ['model', 'Μοντέλο', 'front'], ['dancer', 'Χορευτής', 'front'], ['extra', 'Κομπάρσος', 'front'],
  ['singer', 'Τραγούδι / Μουσική', 'front'],
  ['director', 'Σκηνοθέτης', 'back'], ['dop', 'Διευθ. φωτογραφίας', 'back'], ['camera', 'Κάμερα', 'back'], ['gaffer', 'Φώτα / Gaffer', 'back'],
  ['sound', 'Ήχος', 'back'], ['editor', 'Μοντάζ', 'back'], ['colorist', 'Colorist', 'back'], ['vfx', 'VFX / Motion', 'back'],
  ['art', 'Σκηνογραφία', 'back'], ['styling', 'Styling / Κοστούμια', 'back'], ['makeup', 'Μακιγιάζ / Μαλλιά', 'back'],
  ['producer', 'Παραγωγή', 'back'], ['ad', 'Βοηθός σκηνοθέτη', 'back'], ['casting', 'Casting', 'back'], ['choreo', 'Χορογραφία', 'back'],
  ['writer', 'Σενάριο', 'back'], ['photo', 'Φωτογράφος', 'photo'],
];
const KIND = Object.fromEntries(KINDS.map((k) => [k[0], k[1]]));
KIND.theatre = 'Ηθοποιός'; // "Theatre" was a kind for a few hours on 4 Nov; Alex: whoever plays theatre is an actor
const SIDE = Object.fromEntries(KINDS.map((k) => [k[0], k[2]]));
const HUE = { front: '#d40000', back: '#4f9dff', photo: '#f2c94c' };
// looks and an actor's skills belong only to these (Alex, 4 Nov: not to the crew); everything else gets equipment and tools
const PERFORMERS = ['actor', 'model', 'dancer', 'extra'];
const PERFORMER = (kinds) => (kinds || []).some((k) => PERFORMERS.includes(k) || k === 'theatre');
const CREW = (kinds) => (kinds || []).some((k) => !PERFORMERS.includes(k) && k !== 'theatre');
const FILTERS = [['all', 'Όλοι'], ['actor', 'Ηθοποιοί'], ['model', 'Μοντέλα'], ['dancer', 'Χορευτές'], ['extra', 'Κομπάρσοι'], ['back', 'Πίσω από την κάμερα'], ['photo', 'Φωτογράφοι']];
const GENDERS = [['', '—'], ['f', 'Γυναίκα'], ['m', 'Άνδρας'], ['x', 'Άλλο']];

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) { if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(kid)); }
  return el;
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); }
const fail = (e) => { console.error(e); toast(errText(e)); };
function errText(e) {
  const m = String(e?.message || e || '');
  if (/Invalid login/i.test(m)) return 'Λάθος email ή κωδικός.';
  if (/Email not confirmed/i.test(m)) return 'Άνοιξε πρώτα το link που σου στείλαμε στο email.';
  if (/already registered/i.test(m)) return 'Υπάρχει ήδη λογαριασμός με αυτό το email. Συνδέσου.';
  if (/under 18 needs/i.test(m)) return 'Κάτω των 18: χρειάζονται τα στοιχεία και η συγκατάθεση του γονέα.';
  if (/consent/i.test(m)) return 'Χρειάζεται η συγκατάθεσή σου για τα στοιχεία.';
  if (/No seats/i.test(m)) return 'Δεν υπάρχουν άλλες θέσεις.';
  if (/duplicate key/i.test(m)) return 'Το έχεις ήδη κάνει.';
  return m || 'Κάτι πήγε στραβά.';
}
const ICON = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  clap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13l-2.5-2.5a1.8 1.8 0 012.5-2.5l5 5"/><path d="M10 9.5L8.5 8a1.8 1.8 0 012.5-2.5l5.5 5.5c2 2 2 5 0 7s-5 2-7 0L5 13.5a1.8 1.8 0 012.5-2.5"/><path d="M16 3l.5 2M20 6l-2 .5M19 2l-1.2 1.6"/></svg>',
  talk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/></svg>',
  pic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
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
  if (s < 60) return 'τώρα';
  if (s < 3600) return `πριν ${Math.floor(s / 60)}'`;
  if (s < 86400) return `πριν ${Math.floor(s / 3600)} ώρ.`;
  if (s < 7 * 86400) return `πριν ${Math.floor(s / 86400)} μέρ.`;
  return new Date(iso).toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: s > 300 * 86400 ? 'numeric' : undefined });
}
const day = (iso, opt = {}) => new Date(iso).toLocaleString('el-GR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...opt });
const initials = (t) => String(t || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const kindChip = (k) => h('span', { class: 'chip', style: { '--c': HUE[SIDE[k]] || '#888' } }, h('i'), KIND[k] || k);
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
  const need = [...new Set(paths.filter(Boolean))].filter((p) => !(signed.get(p)?.until > Date.now()));
  for (let i = 0; i < need.length; i += 100) {
    const part = need.slice(i, i + 100);
    const { data } = await sb.storage.from(BUCKET).createSignedUrls(part, 3600);
    (data || []).forEach((d) => { if (d.signedUrl) signed.set(d.path, { url: d.signedUrl, until: Date.now() + 3300e3 }); });
  }
}
const urlOf = (p) => (p ? signed.get(p)?.url || '' : '');
const bg = (p) => (urlOf(p) ? { backgroundImage: `url("${urlOf(p)}")` } : {});
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
  if (/^video\//.test(file.type) && file.size > MAX_VIDEO) throw new Error('Το βίντεο είναι πάνω από 200 MB. Κράτα το έως 1-2 λεπτά.');
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
const field = (label, input, hint) => h('label', { class: 'field' }, h('span', {}, label), input, hint ? h('p', { class: 'hint' }, hint) : null);
const input = (value, extra = {}) => h('input', { class: 'input', value: value ?? '', ...extra });
const area = (value, extra = {}) => h('textarea', { class: 'textarea', ...extra }, value ?? '');
function select(options, value, extra = {}) {
  return h('select', { class: 'select', ...extra }, options.map(([v, t]) => h('option', { value: v, selected: v === (value ?? '') }, t)));
}

/* ---------- the frame: top row and routes ---------- */
function topBar(on) {
  const me = mine[0];
  return h('header', { class: 'top' },
    h('a', { href: '#/feed', 'aria-label': 'Roardino' }, h('span', { class: 'rm' }, h('span', { class: 'a' }, 'ROAR'), h('span', { class: 'b' }, 'DINO'))),
    h('nav', { class: 'tabs' },
      [['feed', 'Feed'], ['people', 'Άνθρωποι'], ['calls', 'Calls'], ['seminars', 'Σεμινάρια']].map(([k, t]) => h('a', { href: `#/${k}`, class: on === k ? 'on' : '' }, t))),
    h('span', { class: 'grow' }),
    h('a', { class: 'me-btn', href: '#/me', title: 'Εγώ', style: bg(me?.avatar) }, me?.avatar && urlOf(me.avatar) ? '' : initials(me?.name || session?.user?.email)));
}
function frame(on, ...content) { app.replaceChildren(topBar(on), h('main', { class: 'page' }, ...content)); window.scrollTo(0, 0); }

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
    if (a === 'edit') return await viewEdit(b || 'new');
    return await viewFeed();
  } catch (e) { fail(e); }
}
window.addEventListener('hashchange', route);

/* =====================================================================================================================
   Before sign-in
   ===================================================================================================================== */
async function viewFront() {
  document.title = 'Roardino · Όλο το σινάφι σε ένα μέρος';
  let mode = 'in';
  const f = { name: '', email: '', password: '' };
  const msg = h('p', { class: 'msg' });
  const say = (t, k = '') => { msg.textContent = t; msg.className = 'msg' + (k ? ' ' + k : ''); };
  const card = h('form', { class: 'card', novalidate: true });
  const draw = () => {
    const up = mode === 'up';
    card.replaceChildren(...[
      h('div', { class: 'tabs', style: { alignSelf: 'flex-start' } },
        h('button', { type: 'button', class: up ? '' : 'on', onclick: () => { mode = 'in'; say(''); draw(); } }, 'Σύνδεση'),
        h('button', { type: 'button', class: up ? 'on' : '', onclick: () => { mode = 'up'; say(''); draw(); } }, 'Νέος λογαριασμός')),
      up ? null : h('button', { type: 'button', class: 'btn main', onclick: () => roarAccount(say) }, 'Σύνδεση με Roar Account'),
      up ? null : h('p', { class: 'hint', style: { textAlign: 'center' } }, 'ή με email και κωδικό'),
      up ? field('Ονοματεπώνυμο', input(f.name, { autocomplete: 'name', oninput: (e) => { f.name = e.target.value; } })) : null,
      field('Email', input(f.email, { type: 'email', autocomplete: 'email', inputmode: 'email', oninput: (e) => { f.email = e.target.value; } })),
      field(up ? 'Κωδικός (τουλάχιστον 6 χαρακτήρες)' : 'Κωδικός', input(f.password, { type: 'password', autocomplete: up ? 'new-password' : 'current-password', oninput: (e) => { f.password = e.target.value; } })),
      h('button', { type: 'submit', class: up ? 'btn main' : 'btn' }, up ? 'Δημιουργία λογαριασμού' : 'Σύνδεση'),
      up ? null : h('button', { type: 'button', class: 'linkish', onclick: forgot }, 'Ξέχασες τον κωδικό;'),
      msg,
      h('p', { class: 'hint' }, up ? 'Ο λογαριασμός σου είναι Roar Account: με τα ίδια στοιχεία μπαίνεις και σε όποια άλλη εφαρμογή Roar θέλεις. Γονέας; Φτιάξε τον λογαριασμό με τα δικά σου στοιχεία και μετά πρόσθεσε το προφίλ του παιδιού σου.' : 'Αν έχεις Roar Account, μπαίνεις με τα ίδια στοιχεία.')].filter(Boolean));
  };
  async function forgot() {
    if (!f.email.trim()) return say('Γράψε πρώτα το email σου.', 'err');
    const { error } = await sb.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: location.origin + location.pathname });
    say(error ? errText(error) : 'Σου στείλαμε email με link για νέο κωδικό.', error ? 'err' : 'ok');
  }
  card.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = f.email.trim();
    if (!email || !f.password) return say('Συμπλήρωσε email και κωδικό.', 'err');
    if (mode === 'up') {
      if (!f.name.trim()) return say('Γράψε το όνομά σου.', 'err');
      say('Δημιουργία…');
      const { data, error } = await sb.auth.signUp({ email, password: f.password, options: { emailRedirectTo: location.origin + location.pathname, data: { name: f.name.trim() } } });
      if (error) return say(errText(error), 'err');
      if (!data.session) { mode = 'in'; draw(); say(`Σχεδόν έτοιμο: άνοιξε το link που σου στείλαμε στο ${email} και μετά συνδέσου.`, 'ok'); }
    } else {
      say('Σύνδεση…');
      const { error } = await sb.auth.signInWithPassword({ email, password: f.password });
      if (error) say(errText(error), 'err');
    }
  });
  draw();
  const counts = h('div', { class: 'counts' });
  sb.rpc('roardino_counts').then(({ data }) => {
    if (!data) return;
    counts.replaceChildren(...[[data.people, 'προφίλ'], [data.calls, 'ανοιχτά calls'], [data.seminars, 'σεμινάρια']].filter(([n]) => n > 0).map(([n, t]) => h('div', {}, h('b', {}, String(n)), h('small', {}, t))));
  });
  app.replaceChildren(
    h('header', { class: 'top' }, h('span', { class: 'rm' }, h('span', { class: 'a' }, 'ROAR'), h('span', { class: 'b' }, 'DINO'))),
    h('main', { class: 'front' },
      h('div', {},
        h('p', { class: 'kicker' }, 'Το σινάφι, online'),
        h('h1', { class: 'hero', html: 'Όλοι μαζί κάνουμε <b>τη δουλειά.</b>' }),
        h('p', { class: 'lede' }, 'Ηθοποιοί, μοντέλα, χορευτές, σκηνοθέτες, συνεργεία, φωτογράφοι, θέατρο. Δείξε τη δουλειά σου, βρες τον επόμενο ρόλο, βρες τον άνθρωπο που σου λείπει για το γύρισμα.'),
        h('div', { class: 'kinds-line' }, ['Ηθοποιοί', 'Μοντέλα', 'Χορευτές', 'Σκηνοθέτες', 'DoP', 'Συνεργεία', 'Φωτογράφοι', 'Θέατρο', 'Casting'].map((t) => h('span', {}, t))),
        counts),
      card),
    h('section', { class: 'three' },
      [['Το προφίλ σου, portfolio', 'Φωτογραφίες, showreel, self-tape, βιογραφικό. Οι δουλειές σου σε πλέγμα, με τη σειρά που θες εσύ.'],
        ['Calls', 'Castings και συνεργεία που ζητούνται τώρα. Κάνεις αίτηση με ένα πάτημα και ο άλλος βλέπει κατευθείαν το προφίλ σου.'],
        ['Και για παιδιά, με γονέα', 'Κάτω των 18 μπαίνουν μόνο από τον λογαριασμό του γονέα, και τα προφίλ τους τα βλέπουν μόνο επαληθευμένες παραγωγές.']]
        .map(([t, d], i) => h('div', {}, h('span', { class: 'no' }, '0' + (i + 1)), h('b', {}, t), h('p', {}, d)))));
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
    say('Σύνδεση…');
    const start = await call({ do: 'start', app: 'roardino' });
    let allowed = false;
    if (acct) { try { await call({ do: 'allow', code: start.code }, acct.access_token); allowed = true; } catch { /* ask */ } }
    if (!allowed) {
      if (tab) tab.location.href = start.url; else window.open(start.url, '_blank');
      say(`Πάτα «Επιτρέπω» στη σελίδα που άνοιξε. Κωδικός ${start.code}`);
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
    say('Ο κωδικός έληξε. Πάτα ξανά «Σύνδεση με Roar Account».', 'err');
  } catch (e) { try { if (tab && !tab.closed) tab.close(); } catch { /* gone */ } say(errText(e), 'err'); }
}

/* =====================================================================================================================
   Feed
   ===================================================================================================================== */
let feedOnly = 'all';
async function viewFeed() {
  document.title = 'Roardino · Feed';
  const list = h('div', { class: 'feed' }, h('p', { class: 'wait' }, 'Φόρτωση…'));
  const pills = h('div', { class: 'tabs' }, [['all', 'Όλοι'], ['follow', 'Όσους ακολουθώ']].map(([k, t]) => h('button', { type: 'button', class: feedOnly === k ? 'on' : '', onclick: () => { feedOnly = k; viewFeed(); } }, t)));
  frame('feed',
    h('div', { class: 'head' }, h('h1', {}, 'Feed'), pills, h('span', { class: 'grow' })),
    h('div', { class: 'feed-col' },
      mine.length ? composer(() => viewFeed()) : h('div', { class: 'sec' }, h('h2', {}, 'Φτιάξε το προφίλ σου'), h('p', { class: 'hint' }, 'Για να ανεβάσεις δουλειές, να κάνεις αίτηση σε calls και να σε βρουν, χρειάζεσαι προφίλ. Παίρνει δύο λεπτά.'),
        h('div', { class: 'acts' }, h('a', { class: 'btn main', href: '#/edit/new' }, 'Νέο προφίλ'), h('a', { class: 'btn', href: '#/edit/kid' }, 'Προφίλ για το παιδί μου'))),
      list));
  let q = sb.from('roardino_posts').select('*, person:roardino_people(id,name,avatar,kinds,headline)').order('created_at', { ascending: false }).limit(40);
  if (feedOnly === 'follow') {
    const ids = [...follows, ...mine.map((m) => m.id)];
    if (!ids.length) { list.replaceChildren(h('div', { class: 'empty' }, h('b', {}, 'Δεν ακολουθείς κανέναν ακόμα'), 'Βρες ανθρώπους στους Ανθρώπους και πάτα Ακολούθησε.')); return; }
    q = q.in('person_id', ids);
  }
  const { data, error } = await q;
  if (error) throw error;
  if (!data.length) { list.replaceChildren(h('div', { class: 'empty' }, h('b', {}, 'Δεν υπάρχει τίποτα ακόμα'), 'Ανέβασε την πρώτη σου δουλειά.')); return; }
  list.replaceChildren(...(await posts(data, () => viewFeed())));
}

// write a post: words and up to 6 pictures or videos, as one of my profiles
function composer(done) {
  let as = mine[0].id;
  const files = [];
  const text = area('', { placeholder: 'Τι γύρισες, τι ετοιμάζεις, τι ψάχνεις;', rows: 3 });
  const prev = h('div', { class: 'thumbs' });
  const pick = h('input', { type: 'file', accept: 'image/*,video/*', multiple: true, hidden: true, onchange: (e) => { for (const f of e.target.files) if (files.length < 6) files.push(f); e.target.value = ''; draw(); } });
  const draw = () => prev.replaceChildren(...files.map((f, i) => h('div', { class: 'thumb', style: /^image/.test(f.type) ? { backgroundImage: `url("${URL.createObjectURL(f)}")` } : {} },
    /^video/.test(f.type) ? h('span', { class: 'star' }, 'Βίντεο') : null,
    h('button', { type: 'button', class: 'x', html: ICON.x, 'aria-label': 'Βγάλε το', onclick: () => { files.splice(i, 1); draw(); } }))));
  const btn = h('button', { type: 'button', class: 'btn main', onclick: send }, 'Δημοσίευση');
  async function send() {
    if (!text.value.trim() && !files.length) return toast('Γράψε κάτι ή βάλε μια φωτογραφία.');
    btn.disabled = true; btn.textContent = 'Ανέβασμα…';
    try {
      const media = [];
      for (const f of files) media.push({ path: await upload(as, f, 'posts/'), type: /^video/.test(f.type) ? 'video' : 'image' });
      const { error } = await sb.from('roardino_posts').insert({ person_id: as, body: text.value.trim() || null, media });
      if (error) throw error;
      toast('Δημοσιεύτηκε');
      done();
    } catch (e) { fail(e); btn.disabled = false; btn.textContent = 'Δημοσίευση'; }
  }
  return h('div', { class: 'sec compose' },
    text, prev,
    h('div', { class: 'acts', style: { marginTop: 0 } },
      h('button', { type: 'button', class: 'btn', onclick: () => pick.click() }, icon('pic'), 'Φωτογραφία / βίντεο'), pick,
      mine.length > 1 ? select(mine.map((m) => [m.id, 'ως ' + m.name]), as, { style: { width: 'auto', borderRadius: '999px', height: '38px', padding: '0 14px' }, onchange: (e) => { as = e.target.value; } }) : null,
      h('span', { class: 'grow', style: { flex: 1 } }), btn));
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
function postCard(r, st, refresh) {
  const p = r.person || {};
  const talk = h('div', { class: 'talk hidden' });
  const bravoBtn = h('button', { type: 'button', class: 'react' + (st.mine ? ' on' : ''), onclick: async () => {
    st.mine = !st.mine; st.bravos += st.mine ? 1 : -1; drawBravo();
    const { error } = st.mine ? await sb.from('roardino_bravos').insert({ post_id: r.id }) : await sb.from('roardino_bravos').delete().eq('post_id', r.id).eq('user_id', session.user.id);
    if (error) fail(error);
  } });
  const drawBravo = () => { bravoBtn.replaceChildren(icon('clap'), st.bravos ? `Bravo · ${st.bravos}` : 'Bravo'); bravoBtn.classList.toggle('on', st.mine); };
  drawBravo();
  const talkBtn = h('button', { type: 'button', class: 'react', onclick: () => { talk.classList.toggle('hidden'); if (!talk.dataset.on) { talk.dataset.on = '1'; drawTalk(talk, r, st, () => { talkBtn.replaceChildren(icon('talk'), `Σχόλια · ${st.comments}`); }); } } }, icon('talk'), st.comments ? `Σχόλια · ${st.comments}` : 'Σχόλιο');
  const media = r.media || [];
  return h('article', { class: 'post' },
    h('div', { class: 'post-head' },
      h('a', { class: 'av', href: `#/p/${p.id}`, style: bg(p.avatar) }, urlOf(p.avatar) ? '' : initials(p.name)),
      h('div', { class: 'who-line' }, h('a', { href: `#/p/${p.id}` }, h('b', {}, p.name || '')), h('small', {}, [p.headline || (p.kinds || []).map((k) => KIND[k]).slice(0, 2).join(' · '), ago(r.created_at)].filter(Boolean).join(' · '))),
      r.owner === session.user.id ? h('button', { type: 'button', class: 'btn round', title: 'Διαγραφή', html: ICON.trash, onclick: async () => {
        if (!confirm('Να σβηστεί η ανάρτηση;')) return;
        const { error } = await sb.from('roardino_posts').delete().eq('id', r.id);
        if (error) return fail(error);
        removeFiles(media.map((m) => m.path)); refresh();
      } }) : null),
    r.body ? h('p', { class: 'post-body' }, r.body) : null,
    media.length ? h('div', { class: 'post-media n' + Math.min(media.length, 4) }, media.slice(0, 4).map((m) => m.type === 'video'
      ? h('video', { src: urlOf(m.path), controls: true, playsInline: true, preload: 'metadata' })
      : h('img', { src: urlOf(m.path), alt: '', loading: 'lazy' }))) : null,
    h('div', { class: 'post-acts' }, bravoBtn, talkBtn),
    talk);
}
async function drawTalk(box, r, st, recount) {
  box.replaceChildren(h('p', { class: 'hint' }, 'Φόρτωση…'));
  const { data } = await sb.from('roardino_comments').select('*, person:roardino_people(id,name,avatar)').eq('post_id', r.id).order('created_at');
  await sign((data || []).map((c) => c.person?.avatar));
  const text = input('', { placeholder: 'Γράψε ένα σχόλιο…', onkeydown: (e) => { if (e.key === 'Enter') send(); } });
  async function send() {
    const body = text.value.trim();
    if (!body) return;
    const { error } = await sb.from('roardino_comments').insert({ post_id: r.id, body, person_id: mine[0]?.id || null });
    if (error) return fail(error);
    st.comments++; recount(); drawTalk(box, r, st, recount);
  }
  box.replaceChildren(
    ...(data || []).map((c) => h('div', { class: 'cmt' },
      h('a', { class: 'av sm', href: c.person ? `#/p/${c.person.id}` : '#/feed', style: bg(c.person?.avatar) }, urlOf(c.person?.avatar) ? '' : initials(c.person?.name)),
      h('div', {}, h('b', {}, c.person?.name || 'Μέλος'), ' ', c.body, h('small', {}, ago(c.created_at))),
      c.owner === session.user.id || r.owner === session.user.id ? h('button', { type: 'button', class: 'linkish', onclick: async () => {
        await sb.from('roardino_comments').delete().eq('id', c.id); st.comments--; recount(); drawTalk(box, r, st, recount);
      } }, 'σβήσε') : null)),
    h('div', { class: 'cmt-new' }, text, h('button', { type: 'button', class: 'btn', onclick: send }, 'Στείλε')));
}

/* =====================================================================================================================
   People
   ===================================================================================================================== */
let peopleFilter = 'all', peopleQ = '';
async function viewPeople() {
  document.title = 'Roardino · Άνθρωποι';
  const grid = h('div', { class: 'faces' }, h('p', { class: 'wait' }, 'Φόρτωση…'));
  const search = input(peopleQ, { class: 'input search', placeholder: 'Όνομα, πόλη, ειδικότητα', 'aria-label': 'Αναζήτηση', oninput: (e) => { peopleQ = e.target.value; draw(); } });
  const pills = h('div', { class: 'pills' });
  frame('people', h('div', { class: 'head' }, h('h1', {}, 'Άνθρωποι'), search, h('span', { class: 'grow' })), h('div', { class: 'pills', style: { marginBottom: '16px' } }, pills), grid);
  const { data, error } = await sb.from('roardino_people').select('id,name,kinds,city,birth,avatar,headline,minor,data').eq('visible', true).order('updated_at', { ascending: false }).limit(500);
  if (error) throw error;
  await sign(data.map((p) => p.avatar));
  function draw() {
    pills.replaceChildren(...FILTERS.map(([k, t]) => h('button', { type: 'button', class: 'pill' + (peopleFilter === k ? ' on' : ''), onclick: () => { peopleFilter = k; draw(); } }, t)));
    const q = peopleQ.trim().toLowerCase();
    const shown = data.filter((p) => {
      if (peopleFilter === 'back' && !(p.kinds || []).some((k) => SIDE[k] === 'back')) return false;
      if (!['all', 'back'].includes(peopleFilter) && !(p.kinds || []).includes(peopleFilter)) return false;
      if (!q) return true;
      return [p.name, p.city, p.headline, ...(p.kinds || []).map((k) => KIND[k])].join(' ').toLowerCase().includes(q);
    });
    grid.replaceChildren(...(shown.length ? shown.map(faceTile) : [h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, h('b', {}, 'Κανείς ακόμα εδώ'), q ? `Τίποτα για «${peopleQ}».` : 'Μόλις ξεκινήσαμε. Κάλεσε τους δικούς σου.')]));
  }
  draw();
}
function faceTile(p) {
  const a = age(p.birth);
  return h('a', { class: 'face', href: `#/p/${p.id}` },
    h('div', { class: 'pic', style: bg(p.avatar) }, urlOf(p.avatar) ? '' : initials(p.name)),
    p.minor ? h('span', { class: 'tag' }, 'Κάτω των 18') : null,
    h('div', { class: 'txt' }, h('b', {}, p.name), h('small', {}, [(p.kinds || []).map((k) => KIND[k]).slice(0, 2).join(' · '), p.city, a != null && PERFORMER(p.kinds) ? `${a}` : ''].filter(Boolean).join(' · '))));
}

/* =====================================================================================================================
   A profile: a portfolio
   ===================================================================================================================== */
async function viewPerson(id) {
  const { data: p, error } = await sb.from('roardino_people').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!p) return frame('people', h('div', { class: 'empty' }, h('b', {}, 'Δεν βρέθηκε'), 'Το προφίλ δεν υπάρχει ή δεν φαίνεται σε σένα.'));
  document.title = `${p.name} · Roardino`;
  const own = p.owner === session.user.id;
  const photos = (p.photos || []).map((x) => x.path);
  const [{ data: stats }, { data: grid }, { data: ctRow }] = await Promise.all([
    sb.rpc('roardino_person_stats', { p: id }),
    sb.from('roardino_posts').select('*').eq('person_id', id).order('pos', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }).limit(120),
    sb.from('roardino_contacts').select('email,phone').eq('person_id', id).maybeSingle()]);
  await sign([p.avatar, ...photos, p.reel, p.cv, ...(grid || []).flatMap((g) => (g.media || []).slice(0, 1).map((m) => m.path))]);
  const d = p.data || {};
  const L = d.looks || {}, S = d.skills || {}, C = d.contact || {};
  const a = age(p.birth);
  const main = h('div', { class: 'main-pic', style: bg(photos[0] || p.avatar) });
  const gal = photos.length > 1 ? h('div', { class: 'gallery' }, photos.slice(0, 8).map((ph, i) => h('button', { type: 'button', class: i ? '' : 'on', style: bg(ph), 'aria-label': 'Φωτογραφία ' + (i + 1), onclick: (e) => { Object.assign(main.style, bg(ph)); gal.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); } }))) : null;
  const fact = (k, v) => (v ? h('div', { class: 'fact' }, h('small', {}, k), h('span', {}, v)) : null);
  const facts = [fact('Ηλικία', a != null ? `${a}` : ''), fact('Πόλη', p.city), fact('Ύψος', L.height ? `${L.height} cm` : ''), fact('Ρούχα', L.size), fact('Παπούτσι', L.shoe), fact('Μαλλιά', L.hair), fact('Μάτια', L.eyes), fact('Γλώσσες', S.languages), fact('Ατζέντης', d.agent)].filter(Boolean);
  const skillRows = [['Προφορές / διάλεκτοι', S.accents], ['Χορός', S.dance], ['Μουσική / τραγούδι', S.music], ['Σπορ', S.sports], ['Δίπλωμα', S.driving], ['Εξοπλισμός', d.gear], ['Προγράμματα', S.software], ['Άλλα', S.other]].filter(([, v]) => v);
  const followBtn = own ? null : h('button', { type: 'button', class: follows.has(id) ? 'btn' : 'btn main', onclick: async (e) => {
    const on = follows.has(id);
    const { error: er } = on ? await sb.from('roardino_follows').delete().eq('user_id', session.user.id).eq('person_id', id) : await sb.from('roardino_follows').insert({ person_id: id });
    if (er) return fail(er);
    on ? follows.delete(id) : follows.add(id);
    e.currentTarget.className = follows.has(id) ? 'btn' : 'btn main'; e.currentTarget.textContent = follows.has(id) ? 'Ακολουθείς' : 'Ακολούθησε';
  } }, follows.has(id) ? 'Ακολουθείς' : 'Ακολούθησε');
  const K = ctRow || {}; // email and phone, only when this account may see them
  const contact = p.minor
    ? [p.guardian?.email && h('a', { class: 'btn', href: `mailto:${p.guardian.email}` }, 'Email στον γονέα'), p.guardian?.phone && h('a', { class: 'btn', href: `tel:${p.guardian.phone}` }, 'Τηλέφωνο γονέα')]
    : [K.email && h('a', { class: 'btn', href: `mailto:${K.email}` }, 'Email'), K.phone && h('a', { class: 'btn', href: `tel:${K.phone}` }, 'Τηλέφωνο'), C.instagram && h('a', { class: 'btn', href: `https://instagram.com/${C.instagram.replace(/^@/, '')}`, target: '_blank', rel: 'noopener' }, 'Instagram'), C.site && h('a', { class: 'btn', href: /^https?:/.test(C.site) ? C.site : `https://${C.site}`, target: '_blank', rel: 'noopener' }, 'Site')];
  const reel = p.reel ? h('video', { class: 'reel', src: urlOf(p.reel), controls: true, playsInline: true, preload: 'metadata' }) : ytEmbed(p.reel_url) ? h('iframe', { class: 'reel', src: ytEmbed(p.reel_url), allow: 'autoplay; fullscreen; picture-in-picture', allowFullscreen: true, title: 'Showreel' }) : null;
  frame('people',
    h('div', { class: 'prof' },
      h('div', {}, main, gal),
      h('div', {},
        h('div', { class: 'chips' }, (p.kinds || []).map(kindChip), p.minor ? h('span', { class: 'chip', style: { '--c': '#f2c94c' } }, h('i'), 'Κάτω των 18 · με γονέα') : null),
        h('h1', {}, p.name),
        p.headline ? h('p', { class: 'line' }, p.headline) : null,
        stats ? h('div', { class: 'stats' }, [[stats.posts, 'δουλειές'], [stats.followers, 'ακολουθούν'], [stats.bravos, 'bravo']].map(([n, t]) => h('span', {}, h('b', {}, String(n)), ' ', t))) : null,
        h('div', { class: 'acts' }, followBtn, ...contact.filter(Boolean),
          own ? h('a', { class: 'btn main', href: `#/edit/${p.id}` }, 'Επεξεργασία') : null,
          p.cv ? h('a', { class: 'btn', href: urlOf(p.cv), target: '_blank', rel: 'noopener' }, 'Βιογραφικό') : null),
        facts.length ? h('div', { class: 'facts' }, facts) : null,
        p.bio ? h('div', { class: 'block' }, h('h2', {}, 'Λίγα λόγια'), h('p', {}, p.bio)) : null,
        reel ? h('div', { class: 'block' }, h('h2', {}, p.reel ? 'Self-tape' : 'Showreel'), reel) : null,
        skillRows.length ? h('div', { class: 'block' }, h('h2', {}, 'Δεξιότητες'), h('div', { class: 'facts', style: { marginTop: 0 } }, skillRows.map(([k, v]) => fact(k, v)))) : null,
        (d.credits || []).length ? h('div', { class: 'block' }, h('h2', {}, 'Δουλειές'), h('div', { class: 'credits' }, d.credits.map((c) => h('div', {}, c)))) : null,
        d.studies ? h('div', { class: 'block' }, h('h2', {}, 'Σπουδές'), h('p', {}, d.studies)) : null)),
    gridBlock(p, grid || [], own));
}

// the profile's posts as Instagram's grid; its owner can put them in any order
function gridBlock(p, rows, own) {
  let editing = false;
  const box = h('div', { class: 'grid' });
  const head = h('div', { class: 'head', style: { marginTop: '34px' } }, h('h1', { style: { fontSize: '22px' } }, 'Δουλειές'), h('span', { class: 'grow' }));
  if (own && rows.length > 1) head.append(h('button', { type: 'button', class: 'btn', onclick: (e) => { editing = !editing; e.currentTarget.textContent = editing ? 'Έτοιμο' : 'Σειρά'; if (!editing) save(); draw(); } }, 'Σειρά'));
  let drag = null;
  const move = (from, to) => { if (to < 0 || to >= rows.length) return; const [x] = rows.splice(from, 1); rows.splice(to, 0, x); draw(); };
  async function save() {
    const res = await Promise.all(rows.map((r, i) => (r.pos === i ? null : sb.from('roardino_posts').update({ pos: i }).eq('id', r.id))));
    const bad = res.find((x) => x?.error);
    if (bad) fail(bad.error); else { rows.forEach((r, i) => { r.pos = i; }); toast('Η σειρά κρατήθηκε'); }
  }
  function draw() {
    box.classList.toggle('editing', editing);
    if (!rows.length) { box.replaceChildren(h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, own ? 'Ανέβασε την πρώτη σου δουλειά από το Feed.' : 'Δεν έχει ανεβάσει δουλειές ακόμα.')); return; }
    box.replaceChildren(...rows.map((r, i) => {
      const m = (r.media || [])[0];
      const cell = h(editing ? 'div' : 'button', { type: editing ? null : 'button', class: 'cell', draggable: editing ? 'true' : null, style: m && m.type === 'image' ? bg(m.path) : {},
        onclick: editing ? null : () => openPost(r, p),
        ondragstart: () => { drag = i; }, ondragover: (e) => e.preventDefault(), ondrop: (e) => { e.preventDefault(); if (drag != null) move(drag, i); drag = null; } },
        m?.type === 'video' ? h('video', { src: urlOf(m.path) + '#t=0.5', muted: true, playsInline: true, preload: 'metadata' }) : null,
        m?.type === 'video' ? h('span', { class: 'play', html: ICON.play }) : null,
        !m ? h('p', {}, (r.body || '').slice(0, 140)) : null,
        editing ? h('span', { class: 'cell-move' },
          h('button', { type: 'button', class: 'btn round', html: ICON.left, 'aria-label': 'Πιο μπροστά', onclick: () => move(i, i - 1) }),
          h('button', { type: 'button', class: 'btn round', html: ICON.right, 'aria-label': 'Πιο πίσω', onclick: () => move(i, i + 1) })) : null);
      return cell;
    }));
  }
  draw();
  return h('div', {}, head, box);
}
async function openPost(r, p) {
  const cards = await posts([{ ...r, person: p }], () => route());
  const close = openWin(p.name, h('div', { class: 'in-win' }, cards), (c) => [h('button', { type: 'button', class: 'btn', onclick: c }, 'Κλείσε')]);
  return close;
}

/* =====================================================================================================================
   My things, and the profile form
   ===================================================================================================================== */
async function viewMe() {
  document.title = 'Roardino · Εγώ';
  const [{ data: applies }, { data: seats }] = await Promise.all([
    sb.from('roardino_applies').select('*, call:roardino_calls(id,title,city), person:roardino_people(name)').eq('owner', session.user.id).order('created_at', { ascending: false }),
    sb.from('roardino_seats').select('*, sem:roardino_seminars(id,title,starts_at)').eq('user_id', session.user.id)]);
  frame('', h('div', { class: 'head' }, h('h1', {}, 'Εγώ'), h('span', { class: 'hint' }, session.user.email), h('span', { class: 'grow' }),
    h('button', { type: 'button', class: 'btn', onclick: async () => { await sb.auth.signOut(); } }, 'Αποσύνδεση')),
  h('div', { class: 'block' }, h('h2', {}, 'Τα προφίλ μου')),
  h('div', { class: 'faces' }, mine.map(faceTile),
    h('a', { class: 'add-pic', href: '#/edit/new' }, 'Νέο προφίλ'),
    h('a', { class: 'add-pic', href: '#/edit/kid' }, 'Προφίλ για το παιδί μου')),
  h('p', { class: 'hint', style: { marginTop: '10px' } }, 'Ένας λογαριασμός μπορεί να έχει πολλά προφίλ: το δικό σου, και των παιδιών σου ως γονέας.'),
  (applies || []).length ? h('div', { class: 'block' }, h('h2', {}, 'Οι αιτήσεις μου'), h('div', { class: 'credits' }, applies.map((x) => h('a', { href: `#/c/${x.call?.id}` }, h('div', {}, `${x.call?.title || ''} · ως ${x.person?.name || ''} · ${x.status === 'shortlist' ? 'Στη shortlist' : x.status === 'no' ? 'Δεν προχώρησε' : 'Στάλθηκε'}`))))) : null,
  (seats || []).length ? h('div', { class: 'block' }, h('h2', {}, 'Οι θέσεις μου'), h('div', { class: 'credits' }, seats.map((x) => h('a', { href: '#/seminars' }, h('div', {}, `${x.sem?.title || ''}${x.sem?.starts_at ? ' · ' + day(x.sem.starts_at) : ''}`))))) : null);
}

async function viewEdit(which) {
  const kid = which === 'kid';
  const old = which === 'new' || kid ? null : mine.find((m) => m.id === which);
  if (!old && !['new', 'kid'].includes(which)) { location.hash = '#/me'; return; }
  document.title = old ? `${old.name} · Επεξεργασία` : 'Νέο προφίλ · Roardino';
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
  const guard = h('div');
  const looks = h('div');
  const kindsBox = h('div', { class: 'pills' });
  const drawKinds = () => {
    kindsBox.replaceChildren(...KINDS.map(([k, t]) => h('button', { type: 'button', class: 'pill' + (p.kinds.includes(k) ? ' on' : ''), onclick: () => { p.kinds = p.kinds.includes(k) ? p.kinds.filter((x) => x !== k) : [...p.kinds, k]; drawKinds(); drawLooks(); drawTools(); drawLimits(); drawPicHint(); } }, t)));
  };
  const sec = (no, title, ...kids) => h('section', { class: 'sec' }, h('h2', {}, title), ...kids); // no numbers: which sections show depends on what you do
  const drawGuard = () => {
    if (!isMinor()) { guard.replaceChildren(); return; }
    const g = p.guardian || (p.guardian = {});
    guard.replaceChildren(h('section', { class: 'sec guardian' },
      h('h2', {}, h('span', { class: 'no' }, '!'), 'Ο γονέας ή κηδεμόνας'),
      h('p', { class: 'hint' }, 'Το προφίλ είναι κάτω των 18. Το διαχειρίζεσαι εσύ, από τον δικό σου λογαριασμό, και φαίνεται μόνο σε επαληθευμένες παραγωγές και casting directors. Όποιος ενδιαφέρεται, μιλάει μόνο με σένα.'),
      h('div', { class: 'row' }, field('Ονοματεπώνυμο γονέα', bind(g, 'name', input(g.name))), field('Σχέση', select([['', '—'], ['Μητέρα', 'Μητέρα'], ['Πατέρας', 'Πατέρας'], ['Κηδεμόνας', 'Κηδεμόνας']], g.relation, { onchange: (e) => { g.relation = e.target.value; } }))),
      h('div', { class: 'row' }, field('Τηλέφωνο γονέα', bind(g, 'phone', input(g.phone, { type: 'tel' }))), field('Email γονέα', bind(g, 'email', input(g.email || session.user.email, { type: 'email' })))),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!g.consent_at, onchange: (e) => { g.consent_at = e.target.checked ? new Date().toISOString() : null; } }),
        h('span', {}, 'Είμαι ο γονέας ή ο νόμιμος κηδεμόνας και συναινώ να δημιουργηθεί το προφίλ και να το βλέπουν επαληθευμένες παραγωγές για castings.'))));
    if (!g.email) g.email = session.user.email;
  };
  const S = d.skills;
  // in front of the camera (actor, model, dancer, extra): looks and the skills a casting asks for
  const drawLooks = () => {
    if (!PERFORMER(p.kinds) && !kid) { looks.replaceChildren(); return; }
    const L = d.looks;
    looks.replaceChildren(
      sec('03', 'Εμφάνιση',
        h('div', { class: 'row' }, field('Ύψος (cm)', bind(L, 'height', input(L.height, { inputmode: 'numeric' }))), field('Μέγεθος ρούχων', bind(L, 'size', input(L.size, { placeholder: 'π.χ. M, 38' }))), field('Παπούτσι', bind(L, 'shoe', input(L.shoe, { inputmode: 'numeric' })))),
        h('div', { class: 'row' }, field('Μαλλιά', bind(L, 'hair', input(L.hair, { placeholder: 'π.χ. καστανά, μακριά' }))), field('Μάτια', bind(L, 'eyes', input(L.eyes))), field('Τατουάζ / piercing', bind(L, 'marks', input(L.marks, { placeholder: 'όχι / πού' }))))),
      sec('04', 'Δεξιότητες',
        h('div', { class: 'row' }, field('Γλώσσες', bind(S, 'languages', input(S.languages, { placeholder: 'Ελληνικά, Αγγλικά' }))), field('Προφορές / διάλεκτοι', bind(S, 'accents', input(S.accents, { placeholder: 'κρητικά, κυπριακά' })))),
        h('div', { class: 'row' }, field('Χορός', bind(S, 'dance', input(S.dance, { placeholder: 'hip hop, σύγχρονο, παραδοσιακοί' }))), field('Μουσική / τραγούδι', bind(S, 'music', input(S.music)))),
        h('div', { class: 'row' }, field('Σπορ', bind(S, 'sports', input(S.sports))), field('Δίπλωμα', bind(S, 'driving', input(S.driving, { placeholder: 'αυτοκίνητο, μηχανή' })))),
        field('Άλλα', bind(S, 'other', input(S.other, { placeholder: 'ό,τι άλλο ξέρεις να κάνεις' })))));
  };
  // behind the camera (and music): what they work with
  const tools = h('div');
  const drawTools = () => {
    if (!CREW(p.kinds)) { tools.replaceChildren(); return; }
    tools.replaceChildren(sec(PERFORMER(p.kinds) || kid ? '05' : '03', 'Εξοπλισμός και εργαλεία',
      field('Εξοπλισμός που έχεις', bind(d, 'gear', input(d.gear, { placeholder: 'π.χ. Sony FX6, φώτα Aputure, drone' }))),
      field('Προγράμματα', bind(S, 'software', input(S.software, { placeholder: 'π.χ. DaVinci Resolve, After Effects, Premiere' })))));
  };
  // pay and travel for everyone; swimwear only for whoever is in front of the camera
  const L2 = d.limits || (d.limits = {});
  const limits = h('div', { class: 'pills' });
  const drawLimits = () => limits.replaceChildren(...[['unpaid', 'Δέχομαι και δουλειές χωρίς αμοιβή'], ['travel', 'Ταξιδεύω'], ...(PERFORMER(p.kinds) || kid ? [['swim', 'Μαγιό / εσώρουχα: ναι']] : [])]
    .map(([k, t]) => h('button', { type: 'button', class: 'pill' + (L2[k] ? ' on' : ''), onclick: (e) => { L2[k] = !L2[k]; e.currentTarget.classList.toggle('on', !!L2[k]); } }, t)));
  const picHint = h('p', { class: 'hint' });
  const drawPicHint = () => { picHint.textContent = PERFORMER(p.kinds) || kid ? 'Βάλε ένα κοντινό στο πρόσωπο, μία ολόσωμη, ένα προφίλ και μία ελεύθερη, χωρίς φίλτρα. Η πρώτη είναι η κύρια.' : 'Η πρώτη είναι η φωτογραφία του προφίλ σου. Τις δουλειές σου τις ανεβάζεις από το Feed.'; };

  // pictures: the first one is the main one and the avatar
  const thumbs = h('div', { class: 'thumbs' });
  const pickPics = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: (e) => { for (const f of e.target.files) if (pics.length < 10) pics.push({ file: f, u: URL.createObjectURL(f) }); e.target.value = ''; drawThumbs(); } });
  const drawThumbs = () => {
    thumbs.replaceChildren(...pics.map((it, i) => h('div', { class: 'thumb', style: { backgroundImage: `url("${it.u || urlOf(it.path)}")` }, title: i ? 'Κάν’ την κύρια' : 'Η κύρια', onclick: () => { pics.splice(i, 1); pics.unshift(it); drawThumbs(); } },
      i === 0 ? h('span', { class: 'star' }, 'Κύρια') : null,
      h('button', { type: 'button', class: 'x', html: ICON.x, 'aria-label': 'Βγάλε τη', onclick: (e) => { e.stopPropagation(); pics.splice(i, 1); drawThumbs(); } }))),
    pics.length < 10 ? h('button', { type: 'button', class: 'add-pic', onclick: () => pickPics.click() }, '+ Φωτογραφίες') : null);
  };
  const reelName = h('span', { class: 'hint' }, p.reel ? 'Υπάρχει self-tape.' : '');
  const cvName = h('span', { class: 'hint' }, p.cv ? 'Υπάρχει βιογραφικό.' : '');
  const credits = area((d.credits || []).join('\n'), { rows: 4, placeholder: 'Μία δουλειά ανά γραμμή, π.χ.\nΚλιπ «Χ» του Υ, 2026, πρωταγωνίστρια\nΔιαφήμιση για Ζ, 2025' });
  const C = d.contact;
  const consent = !!p.consent_at;
  const consentBox = h('input', { type: 'checkbox', checked: consent });
  const msg = h('p', { class: 'msg' });
  const saveBtn = h('button', { type: 'button', class: 'btn main', onclick: save }, old ? 'Αποθήκευση' : 'Δημιουργία προφίλ');

  async function save() {
    if (!p.name?.trim()) return toast('Γράψε το όνομα.');
    if (!p.kinds.length) return toast('Διάλεξε τουλάχιστον μία ειδικότητα.');
    if (kid && !p.birth) return toast('Βάλε την ημερομηνία γέννησης του παιδιού.');
    if (isMinor()) {
      const g = p.guardian || {};
      if (!g.name || !g.phone || !g.email) return toast('Συμπλήρωσε τα στοιχεία του γονέα.');
      if (!g.consent_at) return toast('Χρειάζεται η συγκατάθεση του γονέα.');
    } else p.guardian = null;
    if (!consentBox.checked) return toast('Χρειάζεται η συγκατάθεσή σου για τα στοιχεία.');
    saveBtn.disabled = true; msg.textContent = 'Αποθήκευση…'; msg.className = 'msg';
    try {
      const todo = pics.filter((x) => x.file).length;
      let n = 0;
      for (const it of pics) if (it.file) { msg.textContent = `Ανέβασμα φωτογραφίας ${++n} από ${todo}…`; it.path = await upload(id, it.file, 'pics/'); delete it.file; }
      const allPics = pics.map((x) => ({ path: x.path }));
      let reel = p.reel, cv = p.cv;
      if (reelFile) { msg.textContent = 'Ανέβασμα βίντεο…'; reel = await upload(id, reelFile, 'tape/'); }
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
      toast(old ? 'Αποθηκεύτηκε' : 'Το προφίλ είναι έτοιμο');
      location.hash = `#/p/${id}`;
    } catch (e) { msg.textContent = errText(e); msg.className = 'msg err'; saveBtn.disabled = false; }
  }
  async function remove() {
    if (!confirm(`Να σβηστεί οριστικά το προφίλ «${old.name}», με τις φωτογραφίες και τις αναρτήσεις του;`)) return;
    const { data: ps } = await sb.from('roardino_posts').select('media').eq('person_id', id);
    const { error } = await sb.from('roardino_people').delete().eq('id', id);
    if (error) return fail(error);
    removeFiles([...(old.photos || []).map((x) => x.path), old.reel, old.cv, ...(ps || []).flatMap((x) => (x.media || []).map((m) => m.path))]);
    await loadMine(); toast('Σβήστηκε'); location.hash = '#/me';
  }

  drawKinds(); drawGuard(); drawLooks(); drawTools(); drawLimits(); drawPicHint(); drawThumbs();
  frame('', h('div', { class: 'form' },
    h('div', { class: 'head' }, h('h1', {}, old ? 'Το προφίλ' : kid ? 'Προφίλ για το παιδί μου' : 'Νέο προφίλ')),
    sec('01', kid ? 'Το παιδί' : 'Ποιος είσαι',
      h('div', { class: 'row' }, field(kid ? 'Ονοματεπώνυμο παιδιού' : 'Ονοματεπώνυμο ή καλλιτεχνικό όνομα', bind(p, 'name', input(p.name))), field('Πόλη', bind(p, 'city', input(p.city, { placeholder: 'π.χ. Αθήνα' })))),
      h('div', { class: 'row' },
        field('Ημερομηνία γέννησης', input(p.birth, { type: 'date', oninput: (e) => { p.birth = e.target.value; drawGuard(); } }), kid ? null : 'Δεν φαίνεται, φαίνεται μόνο η ηλικία, και μόνο σε όσους είναι μπροστά στην κάμερα.'),
        field('Φύλο', select(GENDERS, p.gender, { onchange: (e) => { p.gender = e.target.value; } }))),
      field('Μία γραμμή για σένα', bind(p, 'headline', input(p.headline, { maxlength: 120, placeholder: 'π.χ. Ηθοποιός θεάτρου και κινηματογράφου, χορεύει σύγχρονο' }))),
      field('Τι κάνεις', kindsBox, 'Διάλεξε όσα ισχύουν.')),
    guard,
    sec('02', 'Φωτογραφίες και βίντεο',
      picHint,
      thumbs, pickPics,
      h('div', { class: 'row' },
        field('Self-tape ή showreel (βίντεο έως 200 MB)', h('div', { class: 'acts', style: { marginTop: 0 } },
          h('button', { type: 'button', class: 'btn', onclick: () => $('#reelIn').click() }, p.reel ? 'Άλλαξε βίντεο' : 'Ανέβασε βίντεο'), reelName,
          h('input', { id: 'reelIn', type: 'file', accept: 'video/*', hidden: true, onchange: (e) => { reelFile = e.target.files[0] || null; reelName.textContent = reelFile ? reelFile.name : ''; } }))),
        field('ή link (YouTube, Vimeo)', bind(p, 'reel_url', input(p.reel_url, { type: 'url', placeholder: 'https://' }))))),
    looks,
    tools,
    sec('·', 'Εμπειρία',
      field('Λίγα λόγια', bind(p, 'bio', area(p.bio, { rows: 4 }))),
      field('Δουλειές', credits),
      h('div', { class: 'row' }, field('Σπουδές', bind(d, 'studies', input(d.studies, { placeholder: 'σχολή κινηματογράφου, δραματική, χορού…' }))), field('Ατζέντης', bind(d, 'agent', input(d.agent, { placeholder: 'αν έχεις' })))),
      field('Βιογραφικό (PDF)', h('div', { class: 'acts', style: { marginTop: 0 } },
        h('button', { type: 'button', class: 'btn', onclick: () => $('#cvIn').click() }, p.cv ? 'Άλλαξε PDF' : 'Ανέβασε PDF'), cvName,
        h('input', { id: 'cvIn', type: 'file', accept: 'application/pdf', hidden: true, onchange: (e) => { cvFile = e.target.files[0] || null; cvName.textContent = cvFile ? cvFile.name : ''; } })))),
    sec('·', 'Επαφή και όρια',
      isMinor() ? h('p', { class: 'hint' }, 'Για ανήλικο, η επαφή γίνεται μόνο με τον γονέα.') : h('div', {},
        h('div', { class: 'row' }, field('Email', bind(ct, 'email', input(ct.email, { type: 'email' }))), field('Τηλέφωνο', bind(ct, 'phone', input(ct.phone, { type: 'tel' })))),
        h('div', { class: 'row', style: { marginTop: '10px' } }, field('Instagram', bind(C, 'instagram', input(C.instagram, { placeholder: '@' }))), field('Site', bind(C, 'site', input(C.site)))),
        h('label', { class: 'check', style: { marginTop: '10px' } }, h('input', { type: 'checkbox', checked: ct.show, onchange: (e) => { ct.show = e.target.checked; } }), h('span', {}, 'Να φαίνονται το email και το τηλέφωνό μου στο προφίλ. Αλλιώς τα βλέπει μόνο όποιος ανοίγει call στο οποίο κάνεις αίτηση.'))),
      limits),
    sec('·', 'Ρυθμίσεις',
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.visible !== false, onchange: (e) => { p.visible = e.target.checked; } }), h('span', {}, 'Το προφίλ φαίνεται στους Ανθρώπους.')),
      h('label', { class: 'check' }, consentBox, h('span', {}, 'Συναινώ να κρατηθούν τα στοιχεία αυτά στο Roardino και να τα βλέπουν τα μέλη του, όπως ορίζεται παραπάνω. Μπορώ να τα σβήσω όλα όποτε θέλω.'))),
    h('div', { class: 'form-foot' }, old ? h('button', { type: 'button', class: 'btn red', onclick: remove }, 'Σβήσε το προφίλ') : null, msg, h('span', { class: 'grow' }),
      h('a', { class: 'btn', href: old ? `#/p/${id}` : '#/me' }, 'Άκυρο'), saveBtn)));
}

/* =====================================================================================================================
   Calls
   ===================================================================================================================== */
let callsFilter = 'all';
async function viewCalls() {
  document.title = 'Roardino · Calls';
  const box = h('div', { class: 'tiles' }, h('p', { class: 'wait' }, 'Φόρτωση…'));
  const pills = h('div', { class: 'tabs' }, [['all', 'Όλα'], ['casting', 'Casting'], ['crew', 'Συνεργείο'], ['mine', 'Δικά μου']].map(([k, t]) => h('button', { type: 'button', class: callsFilter === k ? 'on' : '', onclick: () => { callsFilter = k; viewCalls(); } }, t)));
  frame('calls', h('div', { class: 'head' }, h('h1', {}, 'Calls'), pills, h('span', { class: 'grow' }), h('button', { type: 'button', class: 'btn main', onclick: () => editCall() }, icon('plus'), 'Νέο call')), box);
  let q = sb.from('roardino_calls').select('*').order('created_at', { ascending: false }).limit(200);
  if (callsFilter === 'mine') q = q.eq('owner', session.user.id); else q = q.eq('open', true);
  if (['casting', 'crew'].includes(callsFilter)) q = q.eq('kind', callsFilter);
  const { data, error } = await q;
  if (error) throw error;
  box.replaceChildren(...(data.length ? data.map(callTile) : [h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, h('b', {}, 'Κανένα call ακόμα'), 'Ψάχνεις ηθοποιό, χορευτή ή gaffer; Άνοιξε το πρώτο.')]));
}
const callWho = (c) => [(c.wanted || []).map((k) => KIND[k]).join(', '), c.age_from || c.age_to ? `${c.age_from || ''}-${c.age_to || ''} ετών` : '', { f: 'γυναίκα', m: 'άνδρας' }[c.gender] || ''].filter(Boolean).join(' · ');
function callTile(c) {
  return h('a', { class: 'tile', href: `#/c/${c.id}` },
    h('span', { class: 'when' }, { casting: 'Casting', crew: 'Συνεργείο', other: 'Call' }[c.kind] + (c.open ? '' : ' · κλειστό')),
    h('h3', {}, c.title),
    callWho(c) ? h('p', {}, callWho(c)) : null,
    h('div', { class: 'meta' }, [c.city, c.dates, c.pay, c.closes ? `έως ${new Date(c.closes).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })}` : ''].filter(Boolean).map((x) => h('span', {}, x))));
}
function editCall(old) {
  const c = structuredClone(old || { kind: 'casting', wanted: [], open: true });
  const wanted = h('div', { class: 'pills' });
  const drawW = () => wanted.replaceChildren(...KINDS.map(([k, t]) => h('button', { type: 'button', class: 'pill' + (c.wanted.includes(k) ? ' on' : ''), onclick: () => { c.wanted = c.wanted.includes(k) ? c.wanted.filter((x) => x !== k) : [...c.wanted, k]; drawW(); } }, t)));
  drawW();
  const bind = (key, el) => { el.addEventListener('input', () => { c[key] = el.value; }); return el; };
  openWin(old ? 'Το call' : 'Νέο call', h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
    h('div', { class: 'tabs', style: { alignSelf: 'flex-start' } }, [['casting', 'Casting'], ['crew', 'Συνεργείο'], ['other', 'Άλλο']].map(([k, t]) => h('button', { type: 'button', class: c.kind === k ? 'on' : '', onclick: (e) => { c.kind = k; e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); } }, t))),
    field('Τίτλος', bind('title', input(c.title, { placeholder: 'π.χ. Ψάχνουμε χορεύτρια για βιντεοκλίπ' }))),
    field('Ποιον ψάχνεις', wanted),
    h('div', { class: 'row' }, field('Ηλικία από', bind('age_from', input(c.age_from, { inputmode: 'numeric' }))), field('έως', bind('age_to', input(c.age_to, { inputmode: 'numeric' }))), field('Φύλο', select([['', 'Οποιοδήποτε'], ['f', 'Γυναίκα'], ['m', 'Άνδρας']], c.gender, { onchange: (e) => { c.gender = e.target.value; } }))),
    h('div', { class: 'row' }, field('Πόλη', bind('city', input(c.city))), field('Πότε', bind('dates', input(c.dates, { placeholder: 'π.χ. 12-13 Δεκ.' }))), field('Αμοιβή', bind('pay', input(c.pay, { placeholder: 'π.χ. 150€ τη μέρα' })))),
    h('div', { class: 'row' }, field('Εταιρεία / παραγωγή', bind('company', input(c.company))), field('Αιτήσεις έως', bind('closes', input(c.closes, { type: 'date' })))),
    field('Περιγραφή', bind('about', area(c.about, { rows: 5, placeholder: 'Τι είναι η δουλειά, τι χρειάζεται να ξέρει, τι να στείλει.' }))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!c.minors_ok, onchange: (e) => { c.minors_ok = e.target.checked; } }), h('span', {}, 'Δεκτά και παιδιά κάτω των 18 (μέσω γονέα). Θα βλέπεις τα προφίλ όσων κάνουν αίτηση.'))),
  (close) => [
    old ? h('button', { type: 'button', class: 'btn red', onclick: async () => { if (!confirm('Να σβηστεί το call;')) return; const { error } = await sb.from('roardino_calls').delete().eq('id', old.id); if (error) return fail(error); close(); location.hash = '#/calls'; } }, 'Σβήσε') : null,
    h('button', { type: 'button', class: 'btn', onclick: close }, 'Άκυρο'),
    h('button', { type: 'button', class: 'btn main', onclick: async () => {
      if (!c.title?.trim()) return toast('Γράψε τίτλο.');
      const row = { kind: c.kind, title: c.title.trim(), about: c.about || null, company: c.company || null, city: c.city || null, dates: c.dates || null, pay: c.pay || null, wanted: c.wanted, age_from: +c.age_from || null, age_to: +c.age_to || null, gender: c.gender || null, minors_ok: !!c.minors_ok, closes: c.closes || null, open: c.open !== false };
      const res = old ? await sb.from('roardino_calls').update(row).eq('id', old.id).select().single() : await sb.from('roardino_calls').insert(row).select().single();
      if (res.error) return fail(res.error);
      close(); toast('Το call δημοσιεύτηκε');
      if (location.hash === `#/c/${res.data.id}`) route(); else location.hash = `#/c/${res.data.id}`;
    } }, old ? 'Αποθήκευση' : 'Δημοσίευση')]);
}
async function viewCall(id) {
  const { data: c, error } = await sb.from('roardino_calls').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!c) return frame('calls', h('div', { class: 'empty' }, h('b', {}, 'Δεν βρέθηκε'), 'Το call έκλεισε ή σβήστηκε.'));
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
  const drawWho = () => {
    const list = (applies || []).filter((a) => shown === 'all' || a.status === shown);
    who.replaceChildren(...(list.length ? list.map((a) => {
      const t = faceTile(a.person || {});
      t.append(h('span', { class: 'state ' + a.status }, { new: 'Νέα', shortlist: 'Shortlist', no: 'Όχι' }[a.status]));
      // the one who opened the call reaches the applicant: their own contact, or a minor's parent
      const ap = a.person || {}, ct = ap.minor ? { email: ap.guardian?.email, phone: ap.guardian?.phone } : (cts[a.person_id] || {});
      const wrap = h('div', { class: 'who-cell' }, t,
        a.note ? h('p', { class: 'hint' }, a.note) : null,
        ct.email || ct.phone ? h('p', { class: 'hint' }, ap.minor ? 'Γονέας: ' : '', ct.email ? h('a', { href: `mailto:${ct.email}` }, ct.email) : null, ct.email && ct.phone ? ' · ' : '', ct.phone ? h('a', { href: `tel:${ct.phone}` }, ct.phone) : null) : null,
        h('div', { class: 'pills' }, [['shortlist', 'Shortlist'], ['no', 'Όχι'], ['new', 'Νέα']].map(([k, label]) => h('button', { type: 'button', class: 'pill' + (a.status === k ? ' on' : ''), onclick: async () => {
          const { error: er } = await sb.from('roardino_applies').update({ status: k }).eq('id', a.id);
          if (er) return fail(er);
          a.status = k; drawWho();
        } }, label))));
      return wrap;
    }) : [h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, 'Καμία αίτηση εδώ ακόμα.')]));
  };
  if (own) drawWho();
  frame('calls',
    h('div', { class: 'prof call' },
      h('div', { class: 'tile' },
        h('span', { class: 'when' }, { casting: 'Casting', crew: 'Συνεργείο', other: 'Call' }[c.kind] + (c.open ? '' : ' · κλειστό')),
        h('h1', { style: { fontSize: '30px', margin: '4px 0' } }, c.title),
        callWho(c) ? h('p', { style: { color: 'var(--text)' } }, callWho(c)) : null,
        h('div', { class: 'facts', style: { margin: '6px 0' } }, [['Πόλη', c.city], ['Πότε', c.dates], ['Αμοιβή', c.pay], ['Παραγωγή', c.company], ['Αιτήσεις έως', c.closes && new Date(c.closes).toLocaleDateString('el-GR')]].filter(([, v]) => v).map(([k, v]) => h('div', { class: 'fact' }, h('small', {}, k), h('span', {}, v)))),
        c.about ? h('p', { style: { whiteSpace: 'pre-wrap', color: 'var(--text)' } }, c.about) : null,
        h('div', { class: 'acts' },
          own ? [h('button', { type: 'button', class: 'btn', onclick: () => editCall(c) }, 'Επεξεργασία'),
            h('button', { type: 'button', class: 'btn', onclick: async () => { const { error: er } = await sb.from('roardino_calls').update({ open: !c.open }).eq('id', c.id); if (er) return fail(er); route(); } }, c.open ? 'Κλείσε το call' : 'Άνοιξέ το ξανά')]
            : mineApplied.length ? h('span', { class: 'chip', style: { '--c': '#35c98b' } }, h('i'), `Έκανες αίτηση ως ${mineApplied.map((a) => a.person?.name).join(', ')}`)
              : c.open ? h('button', { type: 'button', class: 'btn main', onclick: () => apply(c) }, 'Κάνε αίτηση') : null))),
    own ? h('div', {},
      h('div', { class: 'head', style: { marginTop: '28px' } }, h('h1', { style: { fontSize: '22px' } }, `Αιτήσεις · ${(applies || []).length}`),
        h('div', { class: 'tabs' }, [['all', 'Όλες'], ['shortlist', 'Shortlist'], ['new', 'Νέες']].map(([k, t]) => h('button', { type: 'button', class: shown === k ? 'on' : '', onclick: (e) => { shown = k; e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); drawWho(); } }, t)))),
      who) : null);
}
function apply(c) {
  if (!mine.length) { toast('Φτιάξε πρώτα προφίλ.'); location.hash = '#/edit/new'; return; }
  const can = mine.filter((m) => c.minors_ok || !m.minor);
  if (!can.length) return toast('Το call δεν δέχεται κάτω των 18.');
  let as = can[0].id;
  const note = area('', { rows: 4, placeholder: 'Λίγα λόγια για το γιατί ταιριάζεις, πότε είσαι ελεύθερος.' });
  openWin('Αίτηση: ' + c.title, h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
    can.length > 1 ? field('Ποιο προφίλ', select(can.map((m) => [m.id, m.name]), as, { onchange: (e) => { as = e.target.value; } })) : h('p', { class: 'hint' }, can[0].minor ? `Ως ${can[0].name}. Ο άλλος θα δει το προφίλ και τα στοιχεία του γονέα.` : `Ως ${can[0].name}. Ο άλλος θα δει το προφίλ σου, μαζί με το email και το τηλέφωνό σου.`),
    field('Σημείωμα', note)),
  (close) => [h('button', { type: 'button', class: 'btn', onclick: close }, 'Άκυρο'), h('button', { type: 'button', class: 'btn main', onclick: async () => {
    const { error } = await sb.from('roardino_applies').insert({ call_id: c.id, person_id: as, note: note.value.trim() || null });
    if (error) return fail(error);
    close(); toast('Η αίτηση στάλθηκε'); route();
  } }, 'Στείλε')]);
}

/* =====================================================================================================================
   Seminars
   ===================================================================================================================== */
async function viewSeminars() {
  document.title = 'Roardino · Σεμινάρια';
  const box = h('div', { class: 'tiles' }, h('p', { class: 'wait' }, 'Φόρτωση…'));
  frame('seminars', h('div', { class: 'head' }, h('h1', {}, 'Σεμινάρια'), h('span', { class: 'grow' }), isAdmin ? h('button', { type: 'button', class: 'btn main', onclick: () => editSeminar() }, icon('plus'), 'Νέο σεμινάριο') : null), box);
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
  box.replaceChildren(...(list.length ? list.map((s) => {
    const left = s.seats ? s.seats - (taken[s.id] || 0) : null;
    return h('div', { class: 'tile' },
      h('span', { class: 'when' }, [s.starts_at ? day(s.starts_at) : 'Σύντομα', s.kind === 'online' ? 'Online' : 'Δια ζώσης', s.published ? '' : 'Πρόχειρο'].filter(Boolean).join(' · ')),
      h('h3', {}, s.title),
      s.teacher ? h('p', { style: { color: 'var(--text)' } }, 'Με ' + s.teacher) : null,
      s.about ? h('p', {}, s.about) : null,
      h('div', { class: 'meta' }, [s.minutes ? `${s.minutes}'` : '', s.place, s.price ? s.price : '', left != null ? `${Math.max(0, left)} θέσεις ελεύθερες` : '', (s.for_kinds || []).map((k) => KIND[k]).join(', ')].filter(Boolean).map((x) => h('span', {}, x))),
      h('div', { class: 'acts' },
        mineS.has(s.id)
          ? [h('span', { class: 'chip', style: { '--c': '#35c98b' } }, h('i'), 'Έχεις θέση'), link[s.id] ? h('a', { class: 'btn main', href: link[s.id], target: '_blank', rel: 'noopener' }, s.kind === 'online' ? 'Μπες στο webinar' : 'Λεπτομέρειες') : h('span', { class: 'hint' }, 'Θα σου στείλουμε τις λεπτομέρειες.')]
          : left === 0 ? h('span', { class: 'hint' }, 'Γέμισε.') : h('button', { type: 'button', class: 'btn main', onclick: () => takeSeat(s) }, 'Κράτα θέση'),
        isAdmin ? h('button', { type: 'button', class: 'btn', onclick: () => editSeminar(s, link[s.id]) }, `Επεξεργασία · ${taken[s.id] || 0} θέσεις`) : null));
  }) : [h('div', { class: 'empty', style: { gridColumn: '1/-1' } }, h('b', {}, 'Σύντομα'), 'Τα πρώτα σεμινάρια και webinars ετοιμάζονται.')]));
}
function takeSeat(s) {
  const name = input(mine[0]?.name || session.user.user_metadata?.name || '');
  const phone = input('', { type: 'tel' });
  openWin('Κράτα θέση', h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } }, h('p', { class: 'hint' }, s.title + (s.price ? ` · ${s.price}` : '')), field('Ονοματεπώνυμο', name), field('Τηλέφωνο', phone)),
    (close) => [h('button', { type: 'button', class: 'btn', onclick: close }, 'Άκυρο'), h('button', { type: 'button', class: 'btn main', onclick: async () => {
      if (!name.value.trim()) return toast('Γράψε το όνομά σου.');
      const { data, error } = await sb.rpc('roardino_take_seat', { p_seminar: s.id, p_name: name.value.trim(), p_phone: phone.value.trim() });
      if (error) return fail(error);
      close(); toast(data?.link ? 'Έτοιμο. Το link είναι στο σεμινάριο.' : 'Έτοιμο. Θα σου στείλουμε τις λεπτομέρειες.'); route();
    } }, 'Κράτα θέση')]);
}
function editSeminar(old, oldLink = '') {
  const s = structuredClone(old || { kind: 'online', for_kinds: [], published: false });
  if (s.starts_at) { const t = new Date(s.starts_at); s.local = new Date(t.getTime() - t.getTimezoneOffset() * 60e3).toISOString().slice(0, 16); }
  let url = oldLink || '';
  const bind = (key, el) => { el.addEventListener('input', () => { s[key] = el.value; }); return el; };
  const forK = h('div', { class: 'pills' });
  const drawF = () => forK.replaceChildren(...FILTERS.slice(1).map(([k, t]) => h('button', { type: 'button', class: 'pill' + (s.for_kinds.includes(k) ? ' on' : ''), onclick: () => { s.for_kinds = s.for_kinds.includes(k) ? s.for_kinds.filter((x) => x !== k) : [...s.for_kinds, k]; drawF(); } }, t)));
  drawF();
  openWin(old ? 'Σεμινάριο' : 'Νέο σεμινάριο', h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
    h('div', { class: 'tabs', style: { alignSelf: 'flex-start' } }, [['online', 'Online'], ['live', 'Δια ζώσης']].map(([k, t]) => h('button', { type: 'button', class: s.kind === k ? 'on' : '', onclick: (e) => { s.kind = k; e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); } }, t))),
    field('Τίτλος', bind('title', input(s.title))),
    field('Ποιος το κάνει', bind('teacher', input(s.teacher))),
    h('div', { class: 'row' }, field('Πότε', bind('local', input(s.local, { type: 'datetime-local' }))), field('Διάρκεια (λεπτά)', bind('minutes', input(s.minutes, { inputmode: 'numeric' })))),
    h('div', { class: 'row' }, field('Τιμή', bind('price', input(s.price, { placeholder: 'Δωρεάν ή π.χ. 40€' }))), field('Θέσεις', bind('seats', input(s.seats, { inputmode: 'numeric', placeholder: 'χωρίς όριο' })))),
    field('Πού', bind('place', input(s.place, { placeholder: s.kind === 'online' ? 'Zoom, YouTube Live…' : 'Διεύθυνση' }))),
    field('Link για όσους κρατούν θέση', input(url, { type: 'url', placeholder: 'https://', oninput: (e) => { url = e.target.value; } }), 'Το βλέπουν μόνο όσοι έχουν θέση. Σε δωρεάν σεμινάριο εμφανίζεται αμέσως μόλις κρατήσουν θέση.'),
    field('Για ποιους', forK),
    field('Περιγραφή', bind('about', area(s.about, { rows: 4 }))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!s.published, onchange: (e) => { s.published = e.target.checked; } }), h('span', {}, 'Δημοσιευμένο (το βλέπουν όλοι)'))),
  (close) => [
    old ? h('button', { type: 'button', class: 'btn red', onclick: async () => { if (!confirm('Να σβηστεί;')) return; const { error } = await sb.from('roardino_seminars').delete().eq('id', old.id); if (error) return fail(error); close(); route(); } }, 'Σβήσε') : null,
    h('button', { type: 'button', class: 'btn', onclick: close }, 'Άκυρο'),
    h('button', { type: 'button', class: 'btn main', onclick: async () => {
      if (!s.title?.trim()) return toast('Γράψε τίτλο.');
      const row = { title: s.title.trim(), teacher: s.teacher || null, kind: s.kind, starts_at: s.local ? new Date(s.local).toISOString() : null, minutes: +s.minutes || null, price: s.price || null, seats: +s.seats || null, place: s.place || null, about: s.about || null, for_kinds: s.for_kinds, published: !!s.published };
      const res = old ? await sb.from('roardino_seminars').update(row).eq('id', old.id).select().single() : await sb.from('roardino_seminars').insert(row).select().single();
      if (res.error) return fail(res.error);
      const l = await sb.from('roardino_seminar_links').upsert({ seminar_id: res.data.id, url: url.trim() || null });
      if (l.error) return fail(l.error);
      close(); toast('Αποθηκεύτηκε'); route();
    } }, 'Αποθήκευση')]);
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
