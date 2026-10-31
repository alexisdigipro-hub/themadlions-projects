// Search engines and AI assistants for the company site (Alex, 18 Oct 2026: "make the SEO very good, and the same
// for AI / LLMs"). The site draws its films, services, team and clients with JavaScript; Google runs it, most AI
// crawlers (GPTBot, ClaudeBot, PerplexityBot…) do not. This writes all of it into the HTML as plain text, between
// the <!--seo:name--> markers, plus the head (title, description, canonical, hreflang, Open Graph, JSON-LD), a
// Greek page at el/, and for the live site sitemap.xml, llms.txt and llms-full.txt.
//
//   node scripts/site-seo.mjs public/site                    the hub's preview copy (stays noindex)
//   node scripts/site-seo.mjs ../themadlions-site --live     themadlions.com, after copying public/site there
//
// Films, team and clients come from Supabase (site_works, site_team, site_clients) with the public key; where the
// network is closed it uses the last copy in scripts/site-seo-data.json (and refreshes that copy when it can).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = process.argv[2]
const live = process.argv.includes('--live')
if (!dir) { console.error('usage: node scripts/site-seo.mjs <site dir> [--live]'); process.exit(1) }
const HERE = dirname(fileURLToPath(import.meta.url))
const SNAP = join(HERE, 'site-seo-data.json')
const BASE = 'https://themadlions.com/'
const today = new Date().toISOString().slice(0, 10)

const SUPABASE_URL = 'https://naibamqexcqnqhbbqafa.supabase.co'
const SUPABASE_KEY = 'sb_publishable_o1OB_ohozPq1Xr2jg2ZSHA_3GsusXFL'
async function loadData() {
  const get = async (q) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: { apikey: SUPABASE_KEY }, signal: AbortSignal.timeout(8000) })
    if (!r.ok) throw new Error(`${q}: ${r.status}`)
    return r.json()
  }
  try {
    const [works, team, clients] = await Promise.all([
      get('site_works?visible=eq.true&video_id=not.is.null&select=title,client,categories,kind,video_id&order=position.asc,created_at.desc'),
      get('site_team?visible=eq.true&select=name,role,role_el&order=position.asc,created_at.asc'),
      get('site_clients?visible=eq.true&select=name&order=position.asc,created_at.asc'),
    ])
    const d = {
      works: works.map((w) => ({ t: w.title, client: w.client || null, c: w.categories || [], k: w.kind || 'yt', id: w.video_id })),
      team, clients: clients.map((c) => c.name),
    }
    writeFileSync(SNAP, JSON.stringify(d, null, 2) + '\n')
    console.log(`data: Supabase (${d.works.length} films)`)
    return d
  } catch (e) {
    const d = JSON.parse(readFileSync(SNAP, 'utf8'))
    console.log(`data: ${SNAP} (Supabase not reachable: ${e.message})`)
    return d
  }
}

// the page's own texts: T, CATS, SERVICES, STEPS, FAQ… are plain literals at the top of its script
function pageConsts(html) {
  const a = html.indexOf('const T = {'), b = html.indexOf("let lang = 'en'")
  const f = html.match(/const FOUNDED = new Date\((\d{4})/)
  if (a < 0 || b < 0) throw new Error('page script not found')
  const c = new Function(`${html.slice(a, b)}; return { T, CATS, SERVICES, STEPS, FAQ, AIB_CAPS: typeof AIB_CAPS === 'undefined' ? [] : AIB_CAPS }`)()
  const caps = html.match(/const AIB_CAPS = (\[[^\n]+\])/)
  if (caps) c.AIB_CAPS = JSON.parse(caps[1].replace(/'/g, '"'))
  c.FOUNDED = f ? f[1] : null
  return c
}

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
const strip = (v) => String(v).replace(/<[^>]+>/g, '')
const pcHost = (id) => id.startsWith('us:') ? ['api', id.slice(3)] : ['eapi', id]
const watch = (w) => w.k === 'vm' ? `https://vimeo.com/${w.id}` : w.k === 'pc' ? `https://e.pcloud.link/publink/show?code=${pcHost(w.id)[1]}` : `https://www.youtube.com/watch?v=${w.id}`
const still = (w) => w.k === 'yt' ? `https://i.ytimg.com/vi/${w.id}/hqdefault.jpg`
  : w.k === 'pc' ? `https://${pcHost(w.id)[0]}.pcloud.com/getpubthumb?code=${pcHost(w.id)[1]}&size=640x360` : `https://vumbnail.com/${w.id}.jpg`
// what a film is, in words: "Music video", "Commercial"…
const KIND = {
  en: { 'Commercials': 'Commercial', 'Music Videos': 'Music video', 'Corporate': 'Corporate film', 'Motion Graphics': 'Motion graphics', 'Events': 'Event film', 'AI Films': 'AI film', 'Films': 'Film', 'Showreels': 'Showreel', 'Behind the Scenes': 'Behind the scenes' },
  el: { 'Commercials': 'Διαφημιστικό', 'Music Videos': 'Βίντεο κλιπ', 'Corporate': 'Εταιρική ταινία', 'Motion Graphics': 'Motion graphics', 'Events': 'Event', 'AI Films': 'Ταινία με AI', 'Films': 'Ταινία', 'Showreels': 'Showreel', 'Behind the Scenes': 'Πίσω από τις κάμερες' },
}
const kindOf = (w, l) => (w.c || []).map((c) => KIND[l][c] || c).join(' · ')

const COPY = {
  en: {
    title: 'The Mad Lions · Film production house: commercials, music videos, films',
    desc: 'Film production house led by director Alex Konstantinidis: commercials, music videos, feature films, documentaries, corporate films and post-production, from the idea to the final master.',
    og: 'Film production house. Commercials, music videos, feature films, documentaries and post-production with Aibsent Studios.',
    locale: 'en_US', alt: 'el_GR',
  },
  el: {
    title: 'The Mad Lions · Εταιρεία παραγωγής: διαφημιστικά, βίντεο κλιπ, ταινίες',
    desc: 'Εταιρεία κινηματογραφικής παραγωγής με σκηνοθέτη τον Alex Konstantinidis: διαφημιστικά, βίντεο κλιπ, ταινίες, ντοκιμαντέρ, εταιρικές ταινίες και post-production, από την ιδέα ως το τελικό master.',
    og: 'Εταιρεία κινηματογραφικής παραγωγής. Διαφημιστικά, βίντεο κλιπ, ταινίες, ντοκιμαντέρ και post-production με την Aibsent Studios.',
    locale: 'el_GR', alt: 'en_US',
  },
}
// where the studio is: only in the structured data and llms.txt, never on the visible page (Alex, 18 Oct: "yes, Athens, Greece")
const PLACE = { '@type': 'PostalAddress', addressLocality: 'Athens', addressCountry: 'GR' }
const SOCIAL = ['https://www.instagram.com/themadlions/', 'https://www.youtube.com/channel/UCoPMSQpUYXNPSCMJV-ErfiA', 'https://www.facebook.com/themadlions/']

function jsonLd(l, c, d) {
  const url = l === 'el' ? `${BASE}el/` : BASE
  const svc = c.SERVICES.map((s) => (s[l] || s.en))
  const graph = [
    {
      '@type': 'Organization', '@id': `${BASE}#org`, name: 'The Mad Lions', alternateName: ['THEMADLIONS', 'The Mad Lions Film Production'],
      url: BASE, logo: `${BASE}wordmark.png`, image: `${BASE}og-image.png`, email: 'info@themadlions.com',
      description: COPY.en.desc, ...(c.FOUNDED ? { foundingDate: c.FOUNDED } : {}),
      founder: { '@id': `${BASE}#alex` }, sameAs: SOCIAL,
      address: PLACE, location: { '@type': 'Place', name: 'Athens, Greece', address: PLACE }, areaServed: ['Greece', 'Europe', 'Worldwide'], knowsLanguage: ['en', 'el'],
      knowsAbout: ['Film production', 'Commercials', 'TV commercials', 'Music videos', 'Feature films', 'Short films', 'Documentaries', 'Corporate films', 'Brand films', 'Stage visuals', 'Post-production', 'Editing', 'Color grading', 'Visual effects', 'Motion graphics', 'AI films'],
      contactPoint: { '@type': 'ContactPoint', contactType: 'sales', email: 'info@themadlions.com', availableLanguage: ['English', 'Greek'] },
      subOrganization: { '@type': 'Organization', '@id': `${BASE}#aibsent`, name: 'Aibsent Studios', url: `${BASE}#aibsent`, logo: `${BASE}aibsent.png`,
        description: 'Post-production and AI studio of The Mad Lions: editing, color grading, visual effects, motion graphics, compositing and films made with AI.' },
      hasOfferCatalog: { '@type': 'OfferCatalog', name: l === 'el' ? 'Υπηρεσίες' : 'Services',
        itemListElement: svc.map(([n, t]) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: n, description: t, provider: { '@id': `${BASE}#org` } } })) },
    },
    { '@type': 'Person', '@id': `${BASE}#alex`, name: 'Alex Konstantinidis', jobTitle: 'Producer and Film Director', worksFor: { '@id': `${BASE}#org` }, workLocation: { '@type': 'Place', name: 'Athens, Greece', address: PLACE },
      knowsAbout: ['Film directing', 'Commercials', 'Music videos', 'Feature films'] },
    { '@type': 'WebSite', '@id': `${BASE}#site`, url: BASE, name: 'The Mad Lions', inLanguage: ['en', 'el'], publisher: { '@id': `${BASE}#org` } },
    { '@type': 'WebPage', '@id': `${url}#page`, url, name: COPY[l].title, description: COPY[l].desc, inLanguage: l, isPartOf: { '@id': `${BASE}#site` },
      about: { '@id': `${BASE}#org` }, primaryImageOfPage: `${BASE}og-image.png` },
    { '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: l, mainEntity: c.FAQ.map((f) => { const [q, a] = f[l] || f.en; return { '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } } }) },
    { '@type': 'ItemList', '@id': `${url}#work`, name: l === 'el' ? 'Επιλεγμένη δουλειά' : 'Selected work',
      itemListElement: d.works.filter((w) => !(w.c || []).includes('Behind the Scenes')).map((w, i) => ({ '@type': 'ListItem', position: i + 1,
        item: { '@type': 'CreativeWork', name: w.t, url: watch(w), image: still(w), genre: kindOf(w, 'en') || undefined, creator: { '@id': `${BASE}#org` } } })) },
  ]
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`
}

function head(l, c, d, depth) {
  const url = l === 'el' ? `${BASE}el/` : BASE, k = COPY[l]
  const up = '../'.repeat(depth)
  return [
    live ? '' : '<meta name="robots" content="noindex, nofollow">',
    `<title>${esc(k.title)}</title>`,
    `<meta name="description" content="${esc(k.desc)}">`,
    live ? '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">' : '',
    `<link rel="canonical" href="${url}">`,
    `<link rel="alternate" hreflang="en" href="${BASE}">`,
    `<link rel="alternate" hreflang="el" href="${BASE}el/">`,
    `<link rel="alternate" hreflang="x-default" href="${BASE}">`,
    '<meta name="author" content="The Mad Lions">',
    '<meta name="theme-color" content="#0b0b0c">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="The Mad Lions">',
    `<meta property="og:title" content="${esc(k.title)}">`,
    `<meta property="og:description" content="${esc(k.og)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:locale" content="${k.locale}">`,
    `<meta property="og:locale:alternate" content="${k.alt}">`,
    `<meta property="og:image" content="${BASE}og-image.png">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="The Mad Lions · Film production house">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(k.title)}">`,
    `<meta name="twitter:description" content="${esc(k.og)}">`,
    `<meta name="twitter:image" content="${BASE}og-image.png">`,
    `<link rel="icon" href="${live ? up : '../' + up}favicon.svg" type="image/svg+xml">`,
    '<link rel="alternate" type="text/plain" title="llms.txt" href="/llms.txt">',
    jsonLd(l, c, d),
  ].filter(Boolean).join('\n')
}

// the blocks inside the page's containers: what a visitor without JavaScript (or a crawler) reads
function blocks(l, c, d) {
  const t = (key) => (c.T[l] && c.T[l][key]) || c.T.en[key] || key
  const byTitle = (title) => d.works.find((w) => w.t === title)
  return {
    grid: d.works.filter((w) => !(w.c || []).includes('Behind the Scenes')).map((w) =>
      `<a class="tile bare" href="${esc(watch(w))}"><img src="${esc(still(w))}" alt="${esc(w.t)}${kindOf(w, l) ? ' · ' + esc(kindOf(w, l)) : ''}" loading="lazy"></a>`).join(''),
    svcGrid: c.SERVICES.map((s, n) => { const [name, text] = s[l] || s.en, w = s.ex && byTitle(s.ex)
      return `<div class="svc"><div class="in"><small>0${n + 1}</small><h3>${esc(name)}</h3><p>${esc(text)}</p>${w ? `<a class="ex" href="${esc(watch(w))}"><span>${esc(t('svc.ex'))}: ${esc(w.t)}</span></a>` : ''}</div></div>` }).join(''),
    steps: c.STEPS.map((s) => { const [h, p] = s[l] || s.en; return `<div class="step"><h3>${esc(h)}</h3><p>${esc(p)}</p></div>` }).join(''),
    team: d.team.map((p) => `<div class="person"><strong>${esc(p.name)}</strong><span>${esc(l === 'el' ? p.role_el || p.role : p.role)}</span></div>`).join(''),
    logos: d.clients.map((n) => `<div class="logo"><span>${esc(n)}</span></div>`).join(''),
    faqList: c.FAQ.map((f) => { const [q, a] = f[l] || f.en; return `<details class="qa"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>` }).join(''),
  }
}

const fill = (html, name, body) => {
  const re = new RegExp(`<!--seo:${name}-->[\\s\\S]*?<!--/seo:${name}-->`)
  if (!re.test(html)) throw new Error(`marker seo:${name} not found`)
  return html.replace(re, () => `<!--seo:${name}-->${body}<!--/seo:${name}-->`)
}

function build(src, l, c, d) {
  let html = src
  html = fill(html, 'head', '\n' + head(l, c, d, l === 'el' ? 1 : 0) + '\n')
  for (const [name, body] of Object.entries(blocks(l, c, d))) html = fill(html, name, body)
  if (l === 'el') {
    // the same page, in Greek from the first byte; the language switch still works on it
    html = html.replace('<html lang="en">', '<html lang="el" data-lang="el">')
    html = html.replace(/(<(\w+)\b[^>]*\bdata-t="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g, (m, open, tag, key, inner, close) => {
      const v = c.T.el[key]
      if (v == null) return m
      return open + (/\bdata-html\b/.test(open) ? v : esc(v)) + close
    })
    html = html.replace(/(<[^>]+\bdata-ph="([^"]+)"[^>]*\bplaceholder=")[^"]*"/g, (m, a, key) => c.T.el[key] ? `${a}${esc(c.T.el[key])}"` : m)
    // one folder down: the page's own files are one level up
    html = html.replace(/(src|href)="((?:works\.js|wordmark\.png|aibsent\.png|aibsent\/|lab\/|roarme\/|roardino\/|roarmail\/|roarlist\/|legal\/)[^"]*)"/g, '$1="../$2"')
  }
  return html
}

function llms(c, d, full) {
  const svc = c.SERVICES.map((s) => `- **${s.en[0]}**: ${s.en[1]}`).join('\n')
  const show = d.works.filter((w) => !(w.c || []).some((x) => ['Behind the Scenes'].includes(x)))
  const list = (full ? show : show.slice(0, 30)).map((w) => `- [${w.t}](${watch(w)})${kindOf(w, 'en') ? ` · ${kindOf(w, 'en')}` : ''}${w.client ? ` · ${w.client}` : ''}`).join('\n')
  const faq = c.FAQ.map((f) => `### ${f.en[0]}\n${f.en[1]}`).join('\n\n')
  const faqEl = c.FAQ.map((f) => `### ${f.el[0]}\n${f.el[1]}`).join('\n\n')
  return `# The Mad Lions

> The Mad Lions is a film production house based in Athens, Greece, led by producer and film director Alex Konstantinidis. It makes commercials, music videos, feature and short films, documentaries, corporate films and stage visuals, and finishes them in house at Aibsent Studios, its post-production and AI studio. One team from the first idea to the final master. Contact: info@themadlions.com

- Website: ${BASE} (English) · ${BASE}el/ (Greek)
- Email for new projects: info@themadlions.com (answers within a working day)${c.FOUNDED ? `\n- Making films since ${c.FOUNDED}` : ''}
- Based in Athens, Greece; shoots wherever the film needs to be
- Languages: English, Greek
- Instagram: ${SOCIAL[0]} · YouTube: ${SOCIAL[1]} · Facebook: ${SOCIAL[2]}

## Services
${svc}

Aibsent Studios (post-production and AI): ${c.AIB_CAPS.map((x) => x[0]).join(', ')}.

## How a production runs
${c.STEPS.map((s, i) => `${i + 1}. **${s.en[0]}**: ${s.en[1]}`).join('\n')}

## Clients
Brands and labels: ${d.clients.join(', ')}.

## Team
${d.team.map((p) => `- ${p.name}: ${p.role}`).join('\n').replace('- Alex: ', '- Alex Konstantinidis: ')}

## ${full ? 'All work' : 'Selected work'}
${list}${full ? '' : `\n\nThe full list: ${BASE}llms-full.txt`}

## Questions
${faq}
${full ? `\n## Ερωτήσεις (Greek)\n${faqEl}\n` : ''}
## Other pages
- [Aibsent Studios](${BASE}aibsent/): the studio's post-production and AI studio, for its films and for others'
- [The Mad Lions Lab](${BASE}lab/): the tools and apps the studio builds between films
- [RoarMe](${BASE}roarme/): the messenger for teams by The Mad Lions
- [Roardino](${BASE}lab/roardino/): the shoot's call sheet in one link, with directions, weather, sunrise and sunset, calls by department and the day in the crew's calendar
- [RoarMail](${BASE}lab/roarmail/): the private mail app for Mac and Windows
- [RoarList](${BASE}lab/roarlist/): the shot list with a frame for every shot
- [RoarWriter](${BASE}lab/roarwriter/): screenwriting from the page to the shoot: nine formats (film, TV, sitcom, stage play, musical, audio drama, AV two-column, comic) in English and Greek, revisions and versions, a breakdown, a beat board, a storyboard and shot list, a stripboard shooting schedule, TV series with their bible, writing together, an AI that reads the whole script (coverage, continuity, budget pass, pitch package, translation), PDF, Final Draft, Fade In and Fountain, on Mac, Windows, the web and the phone
- [RoarKit](${BASE}lab/roarkit/): one app, sixteen tools for the computer and the shoot (RoarTwin until October 2026): a score for the computer and what needs care first; a space map, clean up of program caches and of finished projects' render and proxy media; duplicate files and the same video or sound in another file; card copies to several drives at once, read back byte for byte, with an ASC MHL; backup checks; media reports, clip check and contact sheets as PDF; clip renaming with Undo; a two-pane file manager with media info; ZIP, RAR, 7z and TAR archives; drive health and disk speed with the codecs a drive can take; computer stats with an internet speed test; a password vault with 2FA, sealed on the computer; only to the Trash; Mac and Windows
- [RoarMorph](${BASE}lab/roarmorph/) (Roarverter until October 2026): converts and compresses pictures, videos and sound on your own computer: JPG, PNG, WebP, AVIF, HEIC, TIFF, GIF, PSD, EXR, camera RAW on a Mac; MP4 in H.264, H.265 or AV1, WebM, MOV, MKV, MPG; for the edit ProRes (Proxy to 4444), DNxHR (LB to 444), MXF, XDCAM, FFV1; MP3, WAV 24-bit, AIFF, ALAC, FLAC; a LUT, HDR to Rec.709, reframing to 9:16, 1:1, 4:5 or 2.39:1, anamorphic desqueeze, loudness to −14, −16 or −23 LUFS; a target file size or bitrate with two passes, trims, stills, GIFs and a GIF to video; nothing is uploaded; Mac and Windows
- [RoarPlay](${BASE}lab/roarplay/): plays every video and every sound file on your own computer: ProRes, DNxHR, MXF, MKV, AVI, MPEG-2, H.264, HEVC, VP9, AV1, GIF; WAV, AIFF, FLAC, ALAC, AAC, MP3, Ogg, Opus, AC3, DTS; what the computer cannot decode is made playable on the fly, nothing written to disk; the file's own timecode (drop-frame too), J K L, one frame with the arrows, in and out and loop, the frame on screen saved as a PNG from the original, the file's facts (codec, profile, frame rate, colour, sound), every sound track, a queue; subtitles inside the file or beside it, speed 0.25x to 4x with the pitch kept, chapters, aspect masks and zoom, equalizer and output device, picture in picture, M3U; Resolume DXV, HAP, NotchLC, image sequences (DPX, EXR, PNG, DNG), web links; meters and EBU R128 loudness, scopes (waveform, parade, vectorscope, histogram), GOP and bitrate, a QC report (black, frozen, silence, missing frames, decode errors), a .cube LUT, compare two files, rating and markers as CSV or Resolve EDL; camera RAW named with the tool that opens it; English and Greek; free for Mac and Windows
- [RoarTransfer](https://roartransfer.com/about/): send large files free and secure at roartransfer.com, up to 5 GB with one short link, by email or link, with a password
`
}

// the Lab's apps (Alex, 25 Oct: "check every page is declared, with the Lab's apps"): each app page gets
// SoftwareApplication JSON-LD between <!--seo:app--> markers (added before </head> the first time), its own
// screen as the link preview when it has one, and the Lab page an ItemList of them all. All free (each page says so).
const APPS = [
  { path: 'roarme/', name: 'RoarMe', cat: 'CommunicationApplication', os: 'macOS, Windows, Web, iOS, Android', shot: 'lab/roarme.jpg' },
  { path: 'lab/roardino/', name: 'Roardino', cat: 'BusinessApplication', os: 'Web' },
  { path: 'lab/roarmail/', name: 'RoarMail', cat: 'CommunicationApplication', os: 'macOS, Windows', shot: 'lab/roarmail.jpg' },
  { path: 'lab/roarlist/', name: 'RoarList', cat: 'MultimediaApplication', os: 'macOS, Windows, Web' },
  { path: 'lab/roarwriter/', name: 'RoarWriter', cat: 'DesignApplication', os: 'macOS, Windows, Web', shot: 'lab/roarwriter.jpg' },
  { path: 'lab/roarkit/', name: 'RoarKit', cat: 'UtilitiesApplication', os: 'macOS, Windows', shot: 'lab/roarkit.jpg' },
  { path: 'lab/roarmorph/', name: 'RoarMorph', cat: 'MultimediaApplication', os: 'macOS, Windows', shot: 'lab/roarmorph.jpg' },
  { path: 'lab/roarplay/', name: 'RoarPlay', cat: 'MultimediaApplication', os: 'macOS, Windows', shot: 'lab/roarplay.jpg' },
]
const attr = (html, re) => { const m = html.match(re); return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") : '' }
const putBlock = (html, body) => /<!--seo:app-->/.test(html) ? fill(html, 'app', body) : html.replace('</head>', `<!--seo:app-->${body}<!--/seo:app-->\n</head>`)
const ld = (o) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...o }).replace(/</g, '\\u003c')}</script>`
function apps() {
  const done = []
  for (const a of APPS) {
    const f = join(dir, a.path, 'index.html')
    let html
    try { html = readFileSync(f, 'utf8') } catch (e) { continue }
    const desc = attr(html, /<meta name="description" content="([^"]*)"/)
    const img = `${BASE}${a.shot || 'og-image.png'}`
    a.desc = desc
    html = putBlock(html, ld({ '@type': 'SoftwareApplication', name: a.name, url: `${BASE}${a.path}`, description: desc,
      applicationCategory: a.cat, operatingSystem: a.os, image: img, ...(a.shot ? { screenshot: img } : {}),
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, isAccessibleForFree: true, inLanguage: ['en', 'el'],
      author: { '@id': `${BASE}#org` }, publisher: { '@type': 'Organization', '@id': `${BASE}#org`, name: 'The Mad Lions', url: BASE } }))
    if (a.shot) html = html.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${img}$2`)
    writeFileSync(f, html); done.push(a.name)
  }
  const lab = join(dir, 'lab', 'index.html')
  try {
    const html = readFileSync(lab, 'utf8')
    writeFileSync(lab, putBlock(html, ld({ '@type': 'CollectionPage', name: 'The Mad Lions Lab', url: `${BASE}lab/`, description: attr(html, /<meta name="description" content="([^"]*)"/),
      publisher: { '@type': 'Organization', '@id': `${BASE}#org`, name: 'The Mad Lions', url: BASE },
      mainEntity: { '@type': 'ItemList', itemListElement: [...APPS.filter((a) => a.desc != null), { name: 'RoarTransfer', path: null }].map((a, i) => ({ '@type': 'ListItem', position: i + 1,
        item: { '@type': 'SoftwareApplication', name: a.name, url: a.path ? `${BASE}${a.path}` : 'https://roartransfer.com/about/', applicationCategory: a.cat || 'UtilitiesApplication', operatingSystem: a.os || 'Web' } })) } })))
    done.push('Lab')
  } catch (e) {}
  console.log(`apps: ${done.join(', ')}`)
}

const d = await loadData()
apps()
const src = readFileSync(join(dir, 'index.html'), 'utf8')
const c = pageConsts(src)
writeFileSync(join(dir, 'index.html'), build(src, 'en', c, d))
mkdirSync(join(dir, 'el'), { recursive: true })
writeFileSync(join(dir, 'el', 'index.html'), build(src, 'el', c, d))
console.log(`wrote ${dir}/index.html and ${dir}/el/index.html`)
if (live) {
  writeFileSync(join(dir, 'llms.txt'), llms(c, d, false))
  writeFileSync(join(dir, 'llms-full.txt'), llms(c, d, true))
  const u = (loc, pri, freq, alt) => `  <url><loc>${BASE}${loc}</loc><lastmod>${today}</lastmod><changefreq>${freq}</changefreq><priority>${pri}</priority>${alt ? `
    <xhtml:link rel="alternate" hreflang="en" href="${BASE}"/>
    <xhtml:link rel="alternate" hreflang="el" href="${BASE}el/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}"/>` : ''}</url>`
  writeFileSync(join(dir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[u('', '1.0', 'weekly', true), u('el/', '1.0', 'weekly', true), u('aibsent/', '0.8', 'monthly'), u('lab/', '0.6', 'monthly'), u('roarme/', '0.6', 'monthly'), u('roardino/', '0.6', 'monthly'), u('lab/roardino/', '0.6', 'monthly'), u('lab/roarmail/', '0.6', 'monthly'), u('lab/roarlist/', '0.6', 'monthly'), u('lab/roarwriter/', '0.6', 'monthly'), u('lab/roarkit/', '0.6', 'monthly'), u('lab/roarmorph/', '0.6', 'monthly'), u('lab/roarplay/', '0.6', 'monthly'), ...['', 'roarmail/', 'roarlist/', 'roarwriter/', 'roarkit/', 'roarmorph/', 'roardino/', 'site/'].map((p) => u(`legal/${p}`, '0.3', 'yearly'))].join('\n')}
</urlset>
`)
  console.log('wrote llms.txt, llms-full.txt, sitemap.xml')
}
