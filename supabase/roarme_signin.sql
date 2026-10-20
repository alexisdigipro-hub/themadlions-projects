-- "Sign in with THEMADLIONS Hub" in RoarMe (Alex, 20 Oct 2026: one account for the team, the hub's email and
-- password, and a RoarMe account for everyone in the team). Safe to run again. Needs roarme_link.sql.
--
-- RoarMe sends a person to hub.themadlions.com/#/roarme-signin?state=…; signed in to the hub, the page asks the
-- Edge Function roarme-signin for a one-time code (2 minutes, single use, tied to the member and to RoarMe's state)
-- and goes back to RoarMe with it. RoarMe's server redeems the code with this hub's server (shared secret) and
-- learns only: this hub member, their email and name. No password leaves the hub. Nothing here is readable from the app.

create table if not exists public.roarme_signin_codes (
  code text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  state text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
alter table public.roarme_signin_codes enable row level security;
-- no policies
