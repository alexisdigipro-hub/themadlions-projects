# THEMADLIONS Projects · instructions for Claude Code

Start every session by reading HANDOVER.md (full state, what is done, where we stopped, what is pending). README.md describes every feature for users. Keep both current.

## Who you work with
Alex Konstantinidis, film director, owner of The Mad Lions (Athens). He is not a developer. Talk to him in Greek, friendly and concrete, no generalities. Never use em dashes in replies to him. UI text in the app is always English.

## Commands
- `npm ci` then `npm run build` must pass before every commit.
- Local-storage build for tests (no Supabase needed): `VITE_LOCAL_MODE=1 npx vite build --outDir dist-local`, then `npx vite preview --outDir dist-local`. Drive it with Playwright: create workspace, add a sample project, click through the changed screens on desktop and at 390px wide.
- `npm run dev` for a live dev server.

## Deploy
Pushing to `main` deploys to GitHub Pages in about 40 s through .github/workflows/deploy.yml. Live: https://alexisdigipro-hub.github.io/themadlions-projects/
- The same workflow also runs `npm ci` and `npm run build` on every pull request into `main`, without deploying. A red check on a PR means do not merge it.
- Local session: commit and push to `main` with Alex's own git login. 
- Cloud session: push the branch, open a PR, tell Alex to merge it (merge = deploy).
- Never ask Alex for a GitHub token, never paste, store or commit credentials of any kind. The Supabase publishable key in src/lib/supabaseConfig.js is public by design; service-role keys never go in the repo.

## Code rules
- React + Vite, plain CSS. All styles live in src/styles.css; themes through html[data-theme] and html[data-accent]. No UI framework, no new dependencies without asking Alex.
- State lives in src/lib/store.jsx. Pages mutate a draft through `update(fn)` / `updateProject(id, fn)`. Every project is one JSON document (projects.data).
- Mobile lives in the last block of src/styles.css ("mobile app layer", under 820px) plus useIsMobile() in src/components/ui.jsx. When Alex asks for a mobile change, desktop must stay untouched, and the other way round.
- Permissions: per user, per module (none / view / edit) plus project access, enforced by RLS in Supabase and mirrored in the app. Finance is administrators only.
- Every database change is a new file in supabase/*.sql that is safe to re-run. Alex runs SQL by hand in the Supabase SQL Editor, so after adding one tell him exactly which file to run, and list it in HANDOVER.md and README.md.
- Migrate old data on load instead of breaking it (see how old category names are migrated).

## End of every session
Update "Where we stopped" in HANDOVER.md (date, what changed, what Alex still has to do, open questions), update README.md if a feature changed, commit with a message that says what the user gets, push.
