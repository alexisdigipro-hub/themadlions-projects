# THEMADLIONS Projects

Web-based film production workspace for The Mad Lions. Dark mode, desktop first, works on phones and tablets.

**Phase 1 (this repo):** everything runs in the browser and is saved in that browser (localStorage). Works on GitHub Pages with zero backend.
**Phase 2:** Supabase (auth, Postgres, storage, edge function for the AI) so the whole team logs in from anywhere. Schema is already in `supabase/schema.sql`.

## What is inside

- Projects in six categories: Music Video, Event, Editing, Ad, Visuals, IV
- Script import: PDF, Word (.docx), Final Draft (.fdx), Fountain, plain text, or paste. Pages files: export to PDF first
- Event category: no script, breakdown or shot list; the Schedule tab becomes a Run of show (event days with timed blocks and owners, standard blocks from load-in to load-out), call sheets show the run of show and talent calls, and progress counts venue, crew, run of show, event days and recap deliverables
- Music tab (Music Video projects only): upload the song (MP3, M4A, WAV, private Supabase bucket), waveform player drawn in the browser with click-to-seek and section loops, several versions (master, playback, instrumental), and a song map: sections (intro, verses, choruses) with start and end times, lyrics, notes and the setups from the breakdown that cover each one; paste the whole lyric to create sections at once, mark times while the song plays, export the map for the editor. Lyrics from the audio with OpenAI Whisper (own key in Settings): either writes the lyrics and creates sections at the pauses, or only times the sections you already pasted by matching what it heard. The AI treatment breakdown reads the song map and links setups to sections
- Script revisions: every new upload or edited save keeps the previous version with its revision colour (White, Blue, Pink, Yellow, Green…), side-by-side compare, restore. Re-running scene detection matches scenes by heading so breakdown tags, shots and schedule survive, and changed scenes are flagged on the strips
- Scene detection in English and Greek (INT./EXT., ΕΣΩΤ./ΕΞΩΤ., DAY/NIGHT, ΜΕΡΑ/ΝΥΧΤΑ), characters, page eighths
- Treatment, concept and moodboard breakdown: upload a director's treatment, a concept in plain words, a PDF moodboard with images or reference photos; Claude groups the material into shootable setups (location, time of day, talent, wardrobe, props, art, effects, equipment, look, time estimate), lists locations, talent and producer notes, and can draft a first shot list. Built for music videos and commercials that never had a screenplay
- AI breakdown with Claude: props, wardrobe, vehicles, SFX, extras, flags per scene, plus reports by character, location and element. CSV export
- Shot list per scene: size, angle, movement, gear, lens, camera, storyboard frames, list and board views, CSV and print
- Stripboard schedule: shoot days, scene assignment, industry strip colours, unscheduled pool
- Day Out of Days for cast (SW / W / WF / SWF / H) computed from the stripboard
- Share link: one tap turns the day's call sheet into a public link that opens on any phone without login, laid out for mobile (big call time, location with directions, pinned note, everyone's call, scenes). Department requirements stay private. Sharing again after edits refreshes the same link
- Send message: the call sheet as a WhatsApp-ready message (whole sheet for the group, or a personal message per cast and crew member with only their call time and location), mail with everyone in Bcc, or copy. WhatsApp links on cast and crew cards
- Project cover image (compressed, stored in the project) shown on the dashboard card, the project header, the Overview and the call sheet; Overview progress bar with weighted stages per category (script, breakdown, budget, cast, locations, shot list, schedule, shoot days reported, post and delivery; Editing projects use cut, approval and deliverables), each stage linking to its tab; dashboard cards carry a thin progress bar
- Transcript from the audio shown in the Script tab of music video projects, with copy and "use as script text"
- Home: this week (shoot and event days, calendar items), needs attention (overdue tasks, budgets over cap, unpaid invoices for admins), all projects with progress, next day, open tasks and budget vs cap, counts by status and type, finance snapshot for admins
- Project files: uploads to a private Supabase bucket (50 MB per file on the free plan) with open and download, plus a cloud folder link per project (pCloud, Drive, Dropbox) for footage and masters
- Light and dark themes with four accent colours (Settings → Display, per device); the light theme is the default
- Call sheets laid out like a professional call sheet: company block with producer, director and key crew, big general crew call with a one-line message, day and date with weather, sunrise and sunset, shooting call / lunch / wrap, a pinned note everyone reads, and a location grid with set location, parking and nearest hospital
- Call sheets generated per shoot day with sunrise, sunset, golden hour and a fetched weather forecast (open-meteo, no key), printable to PDF
- Script sides per shoot day, printable
- Budget top sheet: lines by category (above the line, production, post, other), quantity × rate or flat estimates, actuals and variance, contingency, client cap, CSV and print
- Daily production reports per shoot day: times, scenes completed / partial / pickups, setups, on-set counts, weather, incidents, pages shot to date and ahead / behind
- Equipment and vendors: items by category with vendor, rate, days, pickup and return dates, status (needed / quoted / booked / out / returned), CSV, one-click sync of booked items into the budget
- Post: cuts with review links and approval status (internal / client review / notes / approved / picture lock) and a deliverables list with specs, owners, due dates and standard presets per project category
- General tasks (to-dos outside any project) on the Tasks page, alongside project tasks
- Tasks per project with assignee, department, due date, priority, and a cross-project Tasks page (mine / everyone, overdue / today / this week)
- Production calendar (per project and across projects) with shoot days mirrored automatically, ICS export
- Locations with Google Maps embed, directions, script set linking, coordinates for sun and weather, and photo galleries (compressed in the browser to 1600px JPEG, stored in a private Supabase bucket with signed links, thumbnails in the project document)
- Team chat in the sidebar: one room for the whole team, live for everyone with the app open, unread badge.
- Drives archive: every hard disk and SSD of the company (LION 01, SIMBA 02, TML 05…) with capacity, free space, status and where it is, plus the projects stored on each one. Search by project or artist to find the disk. Visible only to the people the administrators allow (Team → permissions → Drives archive)
- My work: every member keeps their own list of jobs (client, description, amount, shooting date, paid or pending, how and when it was paid, notes), grouped by month with yearly totals and CSV export. Only they and the administrators see it; administrators get the whole team under Finance → Team work. That tab opens with **Owed right now**: every unpaid job across all years, the one that has waited longest first, with how many days it has been waiting and a Mark paid button, plus totals split into up to 30 days, 31 to 60 and over 60. Below it are the per-person cards for the chosen year
- Notices: administrators send a pop-up message to the whole team or to chosen people (Chat → Send notice). It appears on their screen as soon as they open the app and stays until they tap Got it; the sender sees who confirmed and when
- Settings: company logo, call sheet defaults (calls, lunch offset, tagline, parking, hospital, footer, cast/crew offsets, weather and sun), editable departments, team rules (default access, who sees phone numbers, notices), share link expiry, week start, default project category, budget defaults, progress stages per category with your own manual stages, project lock, and an activity log of who changed what
- Company database: Database in the sidebar with Locations, Crew and Cast tabs. Projects pick from the library or add to it automatically; shared fields (name, phone, email, agent, photos, address, notes) are edited once and update everywhere, while character, role, call offset and script sets stay per project. "Collect from projects" pulls existing entries in
- Cast & crew as headshot cards or a table, with character casting, call offsets, agent and notes, per-person photo galleries (headshots and looks), and the headshot printed on the call sheet
- Files & notes: links to Drive, Frame.io, contracts, permits
- Finance (administrators only, own table with admin-only Row Level Security): income and expenses for the company and per project, net / VAT / gross, document type (invoice, receipt, none), status (quoted, invoiced, to pay, paid), payment method; overview with profit for the year and estimated income tax, owed to us / we owe, this month, month-by-month bars, VAT balance, breakdowns by project (margin), client, category and project type; CSV export for the accountant. Recurring items (rent, salaries, subscriptions, retainers) monthly / quarterly / yearly, booked with one click when due, with a reminder on the overview. Budget lines are commitments: Finance lists what is still owed to crew and vendors (agreed minus paid) and payments, advances included, are recorded from Finance or from the project budget, landing as paid expenses linked to the line; other project expenses mirror into the budget as actuals; the project Budget page shows invoiced vs booked costs to administrators
- Team: administrators set per user, per module permissions (none / view / edit) and per project access
- Backup and restore as JSON

## Run locally

```bash
npm install
npm run dev
```

## Deploy on GitHub Pages

1. Create a new repository on GitHub (for example `themadlions-projects`).
2. Push this folder to the `main` branch.
3. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` builds and publishes on every push. The site appears at `https://<your-user>.github.io/themadlions-projects/`.

Routing uses hash URLs (`/#/p/...`) so it works on Pages without server rewrites.

## AI breakdown key (Phase 1)

Settings → AI breakdown → paste an Anthropic API key. It is stored only in that browser and calls the API directly. In Phase 2 the key moves to a Supabase Edge Function.

## Phase 2: Supabase (team logins, one shared database)

1. Create a project at supabase.com (region Frankfurt).
2. SQL Editor → New query → paste all of `supabase/schema.sql` → Run. Then the same with `supabase/storage.sql` (photo bucket) `supabase/library.sql` (company library), `supabase/todos.sql` (general tasks), `supabase/audio.sql` (song files), `supabase/files.sql` (project files), `supabase/finance.sql` (administrators-only finance) `supabase/chat.sql` (team chat) `supabase/notices.sql` (notices) `supabase/worklog.sql` (personal work logs), `supabase/drives.sql` (drives archive) `supabase/shares.sql` (public call sheet links) and `supabase/activity.sql` (activity log).
3. Authentication → Providers → Email: keep it enabled; turn **Confirm email** off if you want teammates to sign in immediately.
4. Project Settings → API: copy the Project URL and the publishable (anon) key into `src/lib/supabaseConfig.js`, commit, push. The site rebuilds in remote mode.
5. Open the site, create your account. The first account becomes the administrator and the workspace is created automatically.
6. Settings → Storage → "Import them into the team workspace" moves the projects from this browser's local mode into the database.
7. Team → Add teammate: enter their email and permissions. They create an account with that email and land straight in the workspace.

Data model: each project is one JSON document (`projects.data`), events one row each, members and invites per workspace. Row Level Security enforces workspace membership, per-project access and edit rights; per-module view/edit levels are applied by the app. Live updates come through Supabase Realtime.

The AI key stays in each browser (Settings) for now; moving it into a Supabase Edge Function is the next step.
