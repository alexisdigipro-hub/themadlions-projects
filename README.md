# THEMADLIONS Projects

Web-based film production workspace for The Mad Lions. Dark mode, desktop first, works on phones and tablets.

**Phase 1 (this repo):** everything runs in the browser and is saved in that browser (localStorage). Works on GitHub Pages with zero backend.
**Phase 2:** Supabase (auth, Postgres, storage, edge function for the AI) so the whole team logs in from anywhere. Schema is already in `supabase/schema.sql`.

## What is inside

- Projects in four categories: Feature Film, Music Video, Advertise, Editing
- Script import: PDF, Word (.docx), Final Draft (.fdx), Fountain, plain text, or paste. Pages files: export to PDF first
- Script revisions: every new upload or edited save keeps the previous version with its revision colour (White, Blue, Pink, Yellow, Green…), side-by-side compare, restore. Re-running scene detection matches scenes by heading so breakdown tags, shots and schedule survive, and changed scenes are flagged on the strips
- Scene detection in English and Greek (INT./EXT., ΕΣΩΤ./ΕΞΩΤ., DAY/NIGHT, ΜΕΡΑ/ΝΥΧΤΑ), characters, page eighths
- AI breakdown with Claude: props, wardrobe, vehicles, SFX, extras, flags per scene, plus reports by character, location and element. CSV export
- Shot list per scene: size, angle, movement, gear, lens, camera, storyboard frames, list and board views, CSV and print
- Stripboard schedule: shoot days, scene assignment, industry strip colours, unscheduled pool
- Day Out of Days for cast (SW / W / WF / SWF / H) computed from the stripboard
- Call sheets generated per shoot day with sunrise, sunset, golden hour and a fetched weather forecast (open-meteo, no key), printable to PDF
- Script sides per shoot day, printable
- Budget top sheet: lines by category (above the line, production, post, other), quantity × rate or flat estimates, actuals and variance, contingency, client cap, CSV and print
- Daily production reports per shoot day: times, scenes completed / partial / pickups, setups, on-set counts, weather, incidents, pages shot to date and ahead / behind
- Equipment and vendors: items by category with vendor, rate, days, pickup and return dates, status (needed / quoted / booked / out / returned), CSV, one-click sync of booked items into the budget
- Post: cuts with review links and approval status (internal / client review / notes / approved / picture lock) and a deliverables list with specs, owners, due dates and standard presets per project category
- Tasks per project with assignee, department, due date, priority, and a cross-project Tasks page (mine / everyone, overdue / today / this week)
- Production calendar (per project and across projects) with shoot days mirrored automatically, ICS export
- Locations with Google Maps embed, directions, script set linking, coordinates for sun and weather, and photo galleries (compressed in the browser to 1600px JPEG, stored in a private Supabase bucket with signed links, thumbnails in the project document)
- Cast & crew with character casting and call offsets
- Files & notes: links to Drive, Frame.io, contracts, permits
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
2. SQL Editor → New query → paste all of `supabase/schema.sql` → Run. Then the same with `supabase/storage.sql` (photo bucket).
3. Authentication → Providers → Email: keep it enabled; turn **Confirm email** off if you want teammates to sign in immediately.
4. Project Settings → API: copy the Project URL and the publishable (anon) key into `src/lib/supabaseConfig.js`, commit, push. The site rebuilds in remote mode.
5. Open the site, create your account. The first account becomes the administrator and the workspace is created automatically.
6. Settings → Storage → "Import them into the team workspace" moves the projects from this browser's local mode into the database.
7. Team → Add teammate: enter their email and permissions. They create an account with that email and land straight in the workspace.

Data model: each project is one JSON document (`projects.data`), events one row each, members and invites per workspace. Row Level Security enforces workspace membership, per-project access and edit rights; per-module view/edit levels are applied by the app. Live updates come through Supabase Realtime.

The AI key stays in each browser (Settings) for now; moving it into a Supabase Edge Function is the next step.
