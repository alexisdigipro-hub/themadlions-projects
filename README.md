# THEMADLIONS Projects

Web-based film production workspace for The Mad Lions. Dark mode, desktop first, works on phones and tablets.

**Phase 1 (this repo):** everything runs in the browser and is saved in that browser (localStorage). Works on GitHub Pages with zero backend.
**Phase 2:** Supabase (auth, Postgres, storage, edge function for the AI) so the whole team logs in from anywhere. Schema is already in `supabase/schema.sql`.

## What is inside

- Projects in four categories: Feature Film, Music Video, Advertise, Editing
- Script import: PDF, Word (.docx), Final Draft (.fdx), Fountain, plain text, or paste. Pages files: export to PDF first
- Scene detection in English and Greek (INT./EXT., ΕΣΩΤ./ΕΞΩΤ., DAY/NIGHT, ΜΕΡΑ/ΝΥΧΤΑ), characters, page eighths
- AI breakdown with Claude: props, wardrobe, vehicles, SFX, extras, flags per scene, plus reports by character, location and element. CSV export
- Shot list per scene: size, angle, movement, gear, lens, camera, storyboard frames, list and board views, CSV and print
- Stripboard schedule: shoot days, scene assignment, industry strip colours, unscheduled pool
- Day Out of Days for cast (SW / W / WF / SWF / H) computed from the stripboard
- Call sheets generated per shoot day with sunrise, sunset, golden hour and a fetched weather forecast (open-meteo, no key), printable to PDF
- Script sides per shoot day, printable
- Tasks per project with assignee, department, due date, priority, and a cross-project Tasks page (mine / everyone, overdue / today / this week)
- Production calendar (per project and across projects) with shoot days mirrored automatically, ICS export
- Locations with Google Maps embed, directions, script set linking
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

## Phase 2 plan

1. Create a Supabase project, run `supabase/schema.sql` in the SQL editor.
2. Enable Email and Google providers in Authentication.
3. Create a private Storage bucket `scripts`.
4. Add an Edge Function `breakdown` holding `ANTHROPIC_API_KEY`.
5. Replace the localStorage adapter in `src/lib/store.jsx` with the Supabase adapter and add `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as repository secrets for the workflow.
6. Import each user's JSON backup once.
