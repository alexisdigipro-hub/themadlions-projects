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
schema.sql (core), storage.sql (photos), library.sql (company library + storage policy update), todos.sql (general tasks), finance.sql (admin-only finance, recurring), audio.sql (song files), files.sql (project files), chat.sql (team chat); telegram-remove.sql drops the old Telegram mirror if it was ever created, notices.sql (targeted pop-up notices with confirmations), worklog.sql (personal work log), drives.sql (adds kind 'drive' to the library table for the drives archive), shares.sql (public share links + share_get RPC for anonymous readers), activity.sql (activity log, admins read, 180-day prune), profiles.sql (member profiles: members.profile + set_my_profile()), deliveries.sql (client replies on a delivery page: shares.responses + share_respond()), share_access.sql (my_perm() plus per-command policies on shares, so only members whose Share permission is edit can write a delivery link; call sheet links stay open to every member), share_track.sql (shares.opens / opened_at / closed / expires_at, and share_get rewritten in plpgsql so it counts each opening and refuses a closed or expired link), estimates.sql (widens share_respond from delivery only to delivery and estimate, so a client can accept a cost estimation). All are safe to re-run.

Two ordering traps, both noted inside the files themselves:
- **share_access.sql** goes after shares.sql, and again whenever shares.sql is re-run, because that file recreates the older wide-open shares_members policy. It now decides per kind: call sheets open to every member, estimates `is_admin()`, everything else the Share permission.
- **estimates.sql** goes after deliveries.sql, because that file recreates the delivery-only share_respond.

## Modules done
Projects (6 categories in this order: Music Video, Event, Editing, Ad, Visuals, IV; old names Events/Feature Film/Advertise are migrated on load; tall cards with square covers), script import + revisions (colours, compare), rule-based Greek/English scene detection, AI breakdown (Claude, BYO key in Settings), treatment/moodboard breakdown (PDF, images), keyword element hints, shot list + storyboard, stripboard + Day Out of Days, call sheets (StudioBinder-style layout, sun/weather, sides, Send message via WhatsApp/mail/copy), tasks (project + general, department chips), production reports, budget (cap bar, commitments, payments), equipment & vendors, post & deliverables, company Database page in the sidebar with tabs Locations / Crew / Cast (old /people and /locations routes redirect there), notices (admins send a pop-up to the whole team or chosen members from Chat > Send notice; it shows as a modal until the person taps Got it; senders see who confirmed under Sent notices; notices table), team Chat in the sidebar (messages table, realtime, unread badge), photo galleries (browser compression), Music tab (waveform, song map, Whisper lyrics/timing with BYO OpenAI key), Finance (admin-only: transactions, VAT, tax estimate, recurring, budget commitments), Home overview (mini calendar with day picker instead of a This week list), Events run of show, project covers, progress bars, light/dark themes with accents, text size.

- My work (sidebar, every non-admin member; Alex asked that administrators do not get it, they only see Team work in Finance): personal job log modelled on the crew's Google Sheet (status Paid/Pending, client, description, amount, shooting date, paid date and method, notes, optional project link), grouped by month with year tabs, totals, CSV. Admins see everyone under Finance > Team work (per-member cards, totals owed/paid, open a member to edit or mark paid). Table worklog, RLS own rows or admin.

- Drives archive (sidebar, permission module 'drives' in Team so Alex picks who sees it; existing members default to none): disks grouped by series (LION, SIMBA, TML…), capacity, free space, status (empty / in use / full / not around), where it is, and the list of projects on each disk (free title or a link to an app project); search answers "which disk has X". Stored as library rows kind 'drive'.
- Team: deactivated members can now be removed for good (members row deleted; their auth account stays but has no workspace).

- Call sheet Share link: Call sheets > Share link publishes a snapshot (no department requirements, no budget) to the shares table and gives a public URL /#/s/<token> that opens without login on a mobile-first page (PublicCallSheet.jsx: big call, times, weather, pinned note, location with Directions, cast+crew calls with name search, scenes, production contacts). Same link per day, re-sharing refreshes it. Anonymous read goes through the share_get() function only.

- Settings (admin): company logo (data URL in settings.logo, resized to 320px; shown in sidebar, login, call sheet header, shared link), call sheet defaults (settings.callsheet: crew call, wrap, lunch N hours after call, tagline, parking, hospital, footer; new shooting days and empty call sheet fields fall back to them), editable department list (settings.departments, used by crew, database, tasks via departmentsOf()), team rules (notices are admin-only, share links open to everyone; settings.newMemberLevel default permission for new teammates; settings.phoneVisibility everyone|admins hides cast/crew phones and emails inside the app via canSeeContacts(); settings.noticeVibrate), share link expiry (settings.shareExpiryDays, stamped into the snapshot as expiresAt), calendar week start (settings.weekStart, monthGrid/weekdayShort take it), default project category. Also: progress stages per category (settings.progress[cat] = {off, weights, custom}; projectProgress(p, settings); manual custom stages are ticked on the Overview into project.customStages), project lock (project.frozen; canEdit false for non-admins; Lock/Unlock link on Overview), budget currency/contingency defaults, default cast/crew call offsets, weather/sun toggles on call sheets, test notice button, drives archive 6 per row with series order in settings.driveSeriesOrder (arrows next to each series title). Settings page is tabbed: Company, Call sheets, Team, Calendar & projects, Display, Integrations, Data (sections carry data-tab, CSS shows the active one). Still planned: admin password reset (needs SMTP or an Edge Function), automatic notices (new chat message, new My work job, overdue task).

- Activity log: store.jsx logActivity() writes to the activity table from syncDiff (project created/updated with the changed sections merged per 4s, deleted, locked/unlocked; events; member removal). Settings > Data > Activity lists the latest 200 with a filter.

## Where we stopped (20 Sep 2026)

Read this first; the detail behind each line is in the pull request that carried it.

### Alex still has to do
- Run in Supabase, in this order: **estimates.sql**, then **share_access.sql** again (it changed when estimates became administrators only). Everything before that is confirmed run, since the Share page reported no missing columns after his own test.
- Never confirmed run, from older work: notices.sql, worklog.sql, drives.sql, activity.sql. If a feature complains, that is why.
- Delete the two test deliveries he made while checking the Share page.
- **registry.npmjs.org is still blocked** on the Alexkayne cloud environment, so `npm ci` and `npm run build` cannot run in a cloud session. The GitHub Actions build on each pull request is the only real build check. He was asked to open it and has not.

### Share, as it stands
One page in the sidebar holding every public link the company has out, with a filter: Deliveries, Estimates (administrators only), Status pages, Call sheets, Everything. Per link: whether it was opened and when, Close and Reopen, a date to close itself, Copy link, Copy for email, Delete.
- **Deliveries** (kind `delivery`): rough cut, prefinal, final cut, final files, treatment, lookbook. Credits and file list pre-filled from the project. The client presses Approve or Ask for changes.
- **Cost estimations** (kind `estimate`): his own cost lines, added and removed freely, grouped by a heading with a subtotal each, then discount, VAT, total, valid until, payment terms. The client presses Accept. **Administrators only**, in the app and in the database, because it is money. The arithmetic is in src/lib/estimate.js so the form and the client's page cannot disagree.
- **Status pages** (kind `status`): one living page per project, same link forever, updated in place.
- **Names under "Send it to"** turn any of these into one page per person: rows `<kind>:<id>:r1`, `:r2`. `removeShare` and `setShareState` act on the whole family (`ref.eq.<ref>,ref.like.<ref>:%`) unless `one: true`.
- A client's answer reaches Alex: badge on Share in the sidebar, and a toast if the app is open. store.jsx polls `shares` every 90s while the tab is visible, gated on the Share permission, silent when the column is missing.
- The client's page is a **bordered sheet with every part in its own band** (direction A of three that were drawn). Delivery, status and estimate pages share it.

### Permissions, as they stand
- **Share is its own module.** none hides it, view reads, edit sends.
- **Role presets** (ROLE_PRESETS in store.jsx): Producer, Director, Editor, 1st AD, Crew, Accountant, one click.
- **Access until**, a date at `permissions.accessUntil`: past it `accessEnded()` makes `can()` and `canAccessProject()` false for members. Administrators are exempt so the owner cannot lock himself out. No column, no SQL.
- **View as**: `viewAs` in the store (sessionStorage), `useCurrentUser()` returns that member with role forced to member and every edit capped at view, a red bar above the topbar, and `update()` / `updateProject()` / `replaceState()` all refuse to write. Both halves are needed: Chat, My profile and My work are visible to everyone and write through `update()`.

### Two traps worth not rediscovering
- **`memberToUser()` used to fill missing permission keys with `view`.** A member's stored row only carries the modules that existed when they were last saved, so every module added later was handed to the whole team the day it shipped. That is how Drives and Share reached people who were never given them. It fills with `none` now. If someone says a page disappeared, that is why: give it to them in Team.
- **Postgres writes a timestamp as `...+00:00`, the browser writes `...Z`.** Compared as text they are never equal and `Z` sorts above `+`, so the same instant compares differently depending on who wrote it. Everything asking "is this newer" goes through `whenMs()` in store.jsx.

### Easy to forget, still true
- **Supabase Auth has Confirm email OFF.** A new person registers, then Alex adds them in Team with **the exact email they registered with**, then they reopen the app.
- **A member writes only their own `profile` column**, through `set_my_profile()`. The members row also holds role, permissions and project access, which is why there is no plain "update your own row" policy: that would let anyone make themselves an administrator.
- Profile photos and the company logo are **data URLs inside the row**, resized in the browser. No storage bucket is involved in either.
- `canSeeProfileDetails()` in Profile.jsx is the single rule for who sees a phone and a birthday (the member chooses: whole team, or administrators only). Name, photo, position and bio are always visible to the team.

### Also shipped this day
- **Production sheet** (Breakdown > Sheet): scenes down, characters across, grouped by set / shooting day / day-night / script order, with a subtotal per group and a per-character count. Download .csv, with a BOM so Excel reads Greek.
- **Calendar export fixed**: `buildICS` ignored `endDate`, so a 19-22 shoot arrived as one day. All-day events now carry an exclusive DTEND; lines are folded by UTF-8 byte, not character.
- **Add to Home Screen**: manifest, icons rendered from Alex's logo, meta tags. No service worker on purpose; it comes with push.
- Small fixes: Share row buttons were glued to the title because `.grow` is only ever defined per component and the Share list had no rule of its own.

### Open, waiting on Alex
- **Push notifications on the phone**, step 2 of the PWA. Needs a service worker, VAPID keys and a Supabase Edge Function, and some setup from him beyond pasting SQL. iOS only delivers web push to a page that was added to the Home Screen first.
- iOS-style third theme (open question: amber accent or iOS blue). Presentation tab from his template, which he has not sent. Admin password reset. Crew cost per project, offered and declined for now.
- Optional extra lines on an estimate that do not count towards the total: offered, he said no.
- "IV" project category still unexplained; Elias Karatzogiannis's elias-2026.csv import never confirmed.

## Not done / ideas discussed
- Call sheet delivery with confirmation (email via Resend Edge Function, WhatsApp Business API; Alex dropped Telegram). Currently Send message opens WhatsApp/mail with prefilled text, and Share link gives a public page.
- Chat: no push notifications yet (only the sidebar badge while the app is open). The app can be installed on a phone now, which is what web push needs first.
- pCloud/Drive deep integration (browse folders in app). Currently: file uploads to Supabase bucket "files" (50 MB/file free plan) + per-project cloud folder link.
- Import of the old finance Google Sheet as history (needs a CSV from Alex).
- Move AI keys server-side (Edge Function) so teammates share them.

## Mobile layer
Everything under 820px lives in the last block of src/styles.css ("mobile app layer") plus useIsMobile() in ui.jsx: bottom tab bar (Home, Projects, Calendar, Chat, More opens the sidebar), 3 project cards per row with chips in one scrolling row, the Calendar page swaps the big grid for the MiniCalendar (dots + day list, tap a day to add). Alex wants desktop untouched when changing mobile.

## Conventions
UI text in English; Alex talks in Greek; no em dashes in replies to him. Test with Playwright against `npx vite preview --outDir dist-local` (see /tmp flow scripts pattern in past work: create workspace, add sample project, drive the UI). Keep everything in src/styles.css; theme via html[data-theme] and html[data-accent].
