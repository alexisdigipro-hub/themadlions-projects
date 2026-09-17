# THEMADLIONS Projects · handover

Read this first when continuing the work in a new conversation.

## What it is
Web-based film production app for The Mad Lions (Alex Konstantinidis, Athens). React + Vite, plain CSS (src/styles.css, theme variables), no UI framework. Frontend on GitHub Pages, backend on Supabase (auth, Postgres, Storage, Realtime).

- Repo: https://github.com/alexisdigipro-hub/themadlions-projects (owner: alexisdigipro-hub)
- Live: https://alexisdigipro-hub.github.io/themadlions-projects/ (auto-deploys on push to main via .github/workflows/deploy.yml, ~40 s)
- Supabase project: https://naibamqexcqnqhbbqafa.supabase.co (publishable key in src/lib/supabaseConfig.js; build with VITE_LOCAL_MODE=1 for a local-storage build used in tests)
- Pushing needs a GitHub token (classic, scopes repo + workflow) from Alex; pass it as a Basic auth header on git push, never commit it.

## Architecture in one paragraph
Every project is one JSON document (projects.data). Events, library (people, locations, general tasks), finance (admin-only) and members are their own tables. src/lib/store.jsx holds the whole state, persists to localStorage in local mode or syncs diffs to Supabase (debounced upserts, realtime merges). Pages call `update(fn)` / `updateProject(id, fn)` and mutate a draft. Permissions: per user, per module, view/edit, plus project access; RLS enforces membership, project access and edit rights.

## SQL files Alex must have run in Supabase (SQL Editor), in order
schema.sql (core), storage.sql (photos), library.sql (company library + storage policy update), todos.sql (general tasks), finance.sql (admin-only finance, recurring), audio.sql (song files), files.sql (project files), chat.sql (team chat + optional Telegram mirror via pg_net). All are safe to re-run.

## Modules done
Projects (5 categories in this order: Music Video, Events, Editing, Advertise, Feature Film; tall cards with square covers), script import + revisions (colours, compare), rule-based Greek/English scene detection, AI breakdown (Claude, BYO key in Settings), treatment/moodboard breakdown (PDF, images), keyword element hints, shot list + storyboard, stripboard + Day Out of Days, call sheets (StudioBinder-style layout, sun/weather, sides, Send message via WhatsApp/mail/copy), tasks (project + general, department chips), production reports, budget (cap bar, commitments, payments), equipment & vendors, post & deliverables, company Database page in the sidebar with tabs Locations / Crew / Cast (old /people and /locations routes redirect there), team Chat in the sidebar (messages table, realtime, unread badge; admins can connect a Telegram group: app -> Telegram through a pg_net trigger, Telegram -> app through supabase/functions/telegram-webhook, an Edge Function Alex deploys once from the Supabase dashboard), photo galleries (browser compression), Music tab (waveform, song map, Whisper lyrics/timing with BYO OpenAI key), Finance (admin-only: transactions, VAT, tax estimate, recurring, budget commitments), Home overview (mini calendar with day picker instead of a This week list), Events run of show, project covers, progress bars, light/dark themes with accents, text size.

## Not done / ideas discussed
- Call sheet delivery with confirmation (email via Resend Edge Function, Telegram bot, WhatsApp Business API). Currently Send message opens WhatsApp/mail with prefilled text.
- Chat: no push notifications yet (only the sidebar badge while the app is open); Telegram inbound needs the Edge Function deployed once.
- pCloud/Drive deep integration (browse folders in app). Currently: file uploads to Supabase bucket "files" (50 MB/file free plan) + per-project cloud folder link.
- Import of the old finance Google Sheet as history (needs a CSV from Alex).
- Move AI keys server-side (Edge Function) so teammates share them.

## Conventions
UI text in English; Alex talks in Greek; no em dashes in replies to him. Test with Playwright against `npx vite preview --outDir dist-local` (see /tmp flow scripts pattern in past work: create workspace, add sample project, drive the UI). Keep everything in src/styles.css; theme via html[data-theme] and html[data-accent].
