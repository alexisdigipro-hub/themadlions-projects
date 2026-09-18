# THEMADLIONS Projects · handover

Read this first when continuing the work in a new conversation.

## What it is
Web-based film production app for The Mad Lions (Alex Konstantinidis, Athens). React + Vite, plain CSS (src/styles.css, theme variables), no UI framework. Frontend on GitHub Pages, backend on Supabase (auth, Postgres, Storage, Realtime).

- Repo: https://github.com/alexisdigipro-hub/themadlions-projects (owner: alexisdigipro-hub)
- Live: https://alexisdigipro-hub.github.io/themadlions-projects/ (auto-deploys on push to main via .github/workflows/deploy.yml, ~40 s)
- Supabase project: https://naibamqexcqnqhbbqafa.supabase.co (publishable key in src/lib/supabaseConfig.js; build with VITE_LOCAL_MODE=1 for a local-storage build used in tests)
- Work continues in Claude Code (since 18 Sep 2026), see CLAUDE.md. Local sessions push to main with Alex's own git login; cloud sessions push a branch and Alex merges the PR. No GitHub tokens in chats, ever.

## Architecture in one paragraph
Every project is one JSON document (projects.data). Events, library (people, locations, general tasks), finance (admin-only) and members are their own tables. src/lib/store.jsx holds the whole state, persists to localStorage in local mode or syncs diffs to Supabase (debounced upserts, realtime merges). Pages call `update(fn)` / `updateProject(id, fn)` and mutate a draft. Permissions: per user, per module, view/edit, plus project access; RLS enforces membership, project access and edit rights.

## SQL files Alex must have run in Supabase (SQL Editor), in order
schema.sql (core), storage.sql (photos), library.sql (company library + storage policy update), todos.sql (general tasks), finance.sql (admin-only finance, recurring), audio.sql (song files), files.sql (project files), chat.sql (team chat); telegram-remove.sql drops the old Telegram mirror if it was ever created, notices.sql (targeted pop-up notices with confirmations), worklog.sql (personal work log), drives.sql (adds kind 'drive' to the library table for the drives archive), shares.sql (public share links + share_get RPC for anonymous readers), activity.sql (activity log, admins read, 180-day prune). All are safe to re-run.

## Modules done
Projects (6 categories in this order: Music Video, Event, Editing, Ad, Visuals, IV; old names Events/Feature Film/Advertise are migrated on load; tall cards with square covers), script import + revisions (colours, compare), rule-based Greek/English scene detection, AI breakdown (Claude, BYO key in Settings), treatment/moodboard breakdown (PDF, images), keyword element hints, shot list + storyboard, stripboard + Day Out of Days, call sheets (StudioBinder-style layout, sun/weather, sides, Send message via WhatsApp/mail/copy), tasks (project + general, department chips), production reports, budget (cap bar, commitments, payments), equipment & vendors, post & deliverables, company Database page in the sidebar with tabs Locations / Crew / Cast (old /people and /locations routes redirect there), notices (admins send a pop-up to the whole team or chosen members from Chat > Send notice; it shows as a modal until the person taps Got it; senders see who confirmed under Sent notices; notices table), team Chat in the sidebar (messages table, realtime, unread badge), photo galleries (browser compression), Music tab (waveform, song map, Whisper lyrics/timing with BYO OpenAI key), Finance (admin-only: transactions, VAT, tax estimate, recurring, budget commitments), Home overview (mini calendar with day picker instead of a This week list), Events run of show, project covers, progress bars, light/dark themes with accents, text size.

- My work (sidebar, every non-admin member; Alex asked that administrators do not get it, they only see Team work in Finance): personal job log modelled on the crew's Google Sheet (status Paid/Pending, client, description, amount, shooting date, paid date and method, notes, optional project link), grouped by month with year tabs, totals, CSV. Admins see everyone under Finance > Team work (per-member cards, totals owed/paid, open a member to edit or mark paid). Table worklog, RLS own rows or admin.

- Drives archive (sidebar, permission module 'drives' in Team so Alex picks who sees it; existing members default to none): disks grouped by series (LION, SIMBA, TML…), capacity, free space, status (empty / in use / full / not around), where it is, and the list of projects on each disk (free title or a link to an app project); search answers "which disk has X". Stored as library rows kind 'drive'.
- Team: deactivated members can now be removed for good (members row deleted; their auth account stays but has no workspace).

- Call sheet Share link: Call sheets > Share link publishes a snapshot (no department requirements, no budget) to the shares table and gives a public URL /#/s/<token> that opens without login on a mobile-first page (PublicCallSheet.jsx: big call, times, weather, pinned note, location with Directions, cast+crew calls with name search, scenes, production contacts). Same link per day, re-sharing refreshes it. Anonymous read goes through the share_get() function only.

- Settings (admin): company logo (data URL in settings.logo, resized to 320px; shown in sidebar, login, call sheet header, shared link), call sheet defaults (settings.callsheet: crew call, wrap, lunch N hours after call, tagline, parking, hospital, footer; new shooting days and empty call sheet fields fall back to them), editable department list (settings.departments, used by crew, database, tasks via departmentsOf()), team rules (notices are admin-only, share links open to everyone; settings.newMemberLevel default permission for new teammates; settings.phoneVisibility everyone|admins hides cast/crew phones and emails inside the app via canSeeContacts(); settings.noticeVibrate), share link expiry (settings.shareExpiryDays, stamped into the snapshot as expiresAt), calendar week start (settings.weekStart, monthGrid/weekdayShort take it), default project category. Also: progress stages per category (settings.progress[cat] = {off, weights, custom}; projectProgress(p, settings); manual custom stages are ticked on the Overview into project.customStages), project lock (project.frozen; canEdit false for non-admins; Lock/Unlock link on Overview), budget currency/contingency defaults, default cast/crew call offsets, weather/sun toggles on call sheets, test notice button, drives archive 6 per row with series order in settings.driveSeriesOrder (arrows next to each series title). Settings page is tabbed: Company, Call sheets, Team, Calendar & projects, Display, Integrations, Data (sections carry data-tab, CSS shows the active one). Still planned: admin password reset (needs SMTP or an Edge Function), automatic notices (new chat message, new My work job, overdue task).

- Activity log: store.jsx logActivity() writes to the activity table from syncDiff (project created/updated with the changed sections merged per 4s, deleted, locked/unlocked; events; member removal). Settings > Data > Activity lists the latest 200 with a filter.

## Where we stopped (18 Sep 2026)
- Commits pushed from outside this chat on 18 Sep ("Add files via upload"): Breakdown gained a paste-a-treatment panel (paste text straight into the page and run the AI breakdown), Shots gained manual setups from the rail and quick-add shots under a scene, small TasksAll tweak. Merged, builds clean.
- SQL files Alex still has to confirm he ran: notices.sql, worklog.sql, drives.sql, shares.sql, activity.sql (chat.sql is confirmed). If a feature complains, that is why.
- Team signups: Confirm email is now OFF in Supabase Auth. Members must be added in Team with the exact email they registered with, then they reopen the app.
- Elias Karatzogiannis: elias-2026.csv was prepared for import into his My work (Finance > Team work > his card > Import CSV); not confirmed imported.
- Categories: "Ad" was Alex's "Add" (confirmed as Ad in practice); "IV" still not explained by Alex, currently behaves like Ad and sits last.
- Next thing Alex asked about: an iOS-style UI theme (third theme next to Light/Dark: SF-like font, grouped lists, borderless buttons, toggles, segmented controls, large titles, Back button; call sheet print view stays as is). Not started. Open question: keep amber accent or go iOS blue.
- Also discussed, not built: Presentation tab inside projects from Alex's template (he has not sent it), production sheet view in Breakdown (Google Sheet-style scene x character grid; agreed useful, not started), admin password reset, automatic notices, PWA install + push.

## Not done / ideas discussed
- Call sheet delivery with confirmation (email via Resend Edge Function, WhatsApp Business API; Alex dropped Telegram). Currently Send message opens WhatsApp/mail with prefilled text, and Share link gives a public page.
- Chat: no push notifications yet (only the sidebar badge while the app is open).
- pCloud/Drive deep integration (browse folders in app). Currently: file uploads to Supabase bucket "files" (50 MB/file free plan) + per-project cloud folder link.
- Import of the old finance Google Sheet as history (needs a CSV from Alex).
- Move AI keys server-side (Edge Function) so teammates share them.

## Mobile layer
Everything under 820px lives in the last block of src/styles.css ("mobile app layer") plus useIsMobile() in ui.jsx: bottom tab bar (Home, Projects, Calendar, Chat, More opens the sidebar), 3 project cards per row with chips in one scrolling row, the Calendar page swaps the big grid for the MiniCalendar (dots + day list, tap a day to add). Alex wants desktop untouched when changing mobile.

## Conventions
UI text in English; Alex talks in Greek; no em dashes in replies to him. Test with Playwright against `npx vite preview --outDir dist-local` (see /tmp flow scripts pattern in past work: create workspace, add sample project, drive the UI). Keep everything in src/styles.css; theme via html[data-theme] and html[data-accent].
