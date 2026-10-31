# THEMADLIONS Projects · instructions for Claude Code

Start every session by reading HANDOVER.md (full state, what is done, where we stopped, what is pending). README.md describes every feature for users. Keep both current.

## Who you work with
Alex Konstantinidis, film director, owner of The Mad Lions (Athens). He is not a developer. Talk to him in Greek, friendly and concrete, no generalities. Never use em dashes in replies to him. UI text in the app is always English.
- **Anything he has to paste somewhere himself goes in the reply, as a ready code block.** SQL, an Edge Function, a config value, a command: write it out in the chat, complete, nothing left to look up. Never send him to a file in the repo, a GitHub link or an attachment to copy it from, and never make him piece it together from two messages.
- One answer, one thing to do. He is not a developer and does not hold a procedure in his head: say where to click, what to type, what to press, in that order, and leave out everything he does not need to act on.

## Names for the chat (agreed with Alex, 15 Oct; since 20 Oct Hub Chat is gone and these all open RoarMe, see RoarMe below)
- **Hub Chat, computer**: the Chat page of hub.themadlions.com from the side menu on a computer.
- **Hub Chat, phone**: the Chat tab in the hub's bottom bar on a phone (`html:not(.chat-window)`, not `.windowed`).
- **TML Chat**: the chat's own app on the phone's home screen (chat.html / `html.chat-window`), its own foot Chats · Calls · Notices · Settings.
- **Chat window**: the chat opened in its own window on a computer (the + menu's pop-out), laid out like TML Chat.
- **Chat colours**: Settings > Chat (Glass dark, Coral, Neo red…), separate from the hub's own skin.

## RoarMe
RoarMe (repository alexisdigipro-hub/roarme, Supabase project bzmjhbnwhdwmncxkqkdl) is a separate chat app. Its old copy in this database (`roar_*`, buckets `roar-files` / `roar-avatars`) was removed on 20 Oct 2026 at Alex's request. Since 20 Oct the hub is being linked to RoarMe step by step (HANDOVER.md, "Where we stopped"): members link their own RoarMe account (roarme_links, Edge Function roarme-link). Rules agreed with Alex: no RoarMe service key in the hub, only the narrow signed bridge; leaving a project must take a person out of its RoarMe chat; project tasks and calendar stay in the hub.

## Commands
- `npm ci` then `npm run build` must pass before every commit.
- Local-storage build for tests (no Supabase needed): `VITE_LOCAL_MODE=1 npx vite build --outDir dist-local`, then `npx vite preview --outDir dist-local`. Drive it with Playwright: create workspace, add a sample project, click through the changed screens on desktop and at 390px wide.
- `npm run dev` for a live dev server.

## Deploy
Pushing to `main` deploys to GitHub Pages in about 40 s through .github/workflows/deploy.yml. Live: https://hub.themadlions.com/ (since 13 Oct 2026; the old https://alexisdigipro-hub.github.io/themadlions-projects/ redirects there). Share links go out as https://go.themadlions.com/?<kind>/<token> (repository alexisdigipro-hub/tml-links).
- The company site https://themadlions.com/ is the repository alexisdigipro-hub/themadlions-site (Pages from main). Its source of truth is `public/site/` here: edit there, run `node scripts/site-seo.mjs public/site`, copy the files (el/ too) into that repository, run `node scripts/site-seo.mjs ../themadlions-site --live` (writes its head, Greek page, sitemap, llms.txt; keep its CNAME and robots) and push its main.
  - `public/site/roarlist/` is build output of the roarlist repository (`npm run build:renderer`, `dist/renderer/`): update it by rebuilding there and copying, never by editing here. `public/site/roarmail/` is only a redirect to `lab/roarmail/` (RoarMail's web demo was removed on 20 Oct 2026).
- The same workflow also runs `npm ci` and `npm run build` on every pull request into `main`, without deploying. A red check on a PR means do not merge it.
- Local session: commit and push to `main` with Alex's own git login. 
- Cloud session: push the branch, open a PR, wait for the green build check, then merge it yourself (merge = deploy). Alex asked on 10 Oct for Claude to always do the merge; never ask him to merge.
- Never ask Alex for a GitHub token, never paste, store or commit credentials of any kind. The Supabase publishable key in src/lib/supabaseConfig.js is public by design; service-role keys never go in the repo.

## Code rules
- Every app made for Alex that he installs (the Lab's desktop apps: RoarTwin, RoarMind and the ones to come) updates itself (Alex, 26 Oct: "ό,τι κάνουμε θα το κάνεις auto update"): the updater RoarTwin and RoarMind carry (electron/updater.js, from the newest GitHub release, Restart to update) and the offer to move itself to Applications, from the first release.
- React + Vite, plain CSS. All styles live in src/styles.css; themes through html[data-theme] and html[data-accent]. No UI framework, no new dependencies without asking Alex.
- State lives in src/lib/store.jsx. Pages mutate a draft through `update(fn)` / `updateProject(id, fn)`. Every project is one JSON document (projects.data).
- Design (Alex, 11 Oct): everything new, and everything changed, follows the Calendar, both the look and the UI design (how the screen is put together): one top row with a bold title and every control in it, nothing repeated in two places, the content filling the screen with no empty band under it; pill buttons alike in size, hover and press, the chosen option as glass with the sliding glass lens, content as soft rounded tiles with gaps instead of ruled tables, tinted chips with a colour dot. The recipe is "Alex's reference look" at the end of HANDOVER.md.
- Windows on a phone (Alex, 15 Oct): every window is the shared Modal, which carries `.sheet-card`: it pops in, fills the visible screen down to the keyboard's bar, scrolls inside, and every control in it is round glass (pill buttons, round icon buttons with line icons, soft glass boxes). Anything new built in a window follows that; never a bottom sheet, never coloured emoji as buttons. On a computer the windows keep their size and place but have the same glass card, pop and controls (Alex, 15 Oct: the desktop looks like the phone, layout untouched).
- Actions on a page (Alex, 15 Oct: "wherever it tidies, round icons, especially on the phone"): use `Act` from components/ui.jsx (a line icon from `ACT_ICON`, a label): a round glass icon on a phone, the icon and its word as a glass pill on a computer, `main` for the accent one. Rows of word buttons on a phone become round icons; Delete stands apart in red.
- Mobile lives in the last block of src/styles.css ("mobile app layer", under 820px) plus useIsMobile() in src/components/ui.jsx. When Alex asks for a mobile change, desktop must stay untouched, and the other way round.
- Permissions: per user, per module (none / view / edit) plus project access, enforced by RLS in Supabase and mirrored in the app. Finance is administrators only.
- Every database change is a new file in supabase/*.sql that is safe to re-run. Alex runs SQL by hand in the Supabase SQL Editor, so after adding one tell him exactly which file to run, and list it in HANDOVER.md and README.md.
- Migrate old data on load instead of breaking it (see how old category names are migrated).
- Pictures made with AI for the site and the apps (people, scenes, stand-in photos): always Higgsfield **Soul 2** (model soul_2), never GPT Image (Alex, 31 Oct: "always better in Soul 2"). Ask for no signs, writing or logos in the prompt, and look at every picture before it goes on a page.

## End of every session
Update "Where we stopped" in HANDOVER.md (date, what changed, what Alex still has to do, open questions), update README.md if a feature changed, commit with a message that says what the user gets, push.
