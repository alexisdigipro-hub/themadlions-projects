-- RoarMe link (Alex, 20 Oct 2026): phase 1 of moving the hub's chat onto RoarMe. Safe to run again.
--
-- Each member links their own RoarMe account once, from Settings > My profile > RoarMe. Nothing here is
-- written by the app directly: the Edge Function "roarme-link" does it all with the member's own sign-in,
-- and talks to RoarMe's function roar-hub-link with a shared secret kept in roarme_conf (no member can read it).
-- The hub never holds a RoarMe password, sign-in token or RoarMe's service key. RoarMe keeps the consent on
-- its side too (roar_hub_links): if the person removes the link there, the hub's row goes on the next check.

create table if not exists public.roarme_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  roar_user_id uuid not null unique,
  roar_username text not null default '',
  roar_name text not null default '',
  linked_at timestamptz not null default now()
);
alter table public.roarme_links enable row level security;
drop policy if exists roarme_links_read on public.roarme_links;
-- a member sees their own link; an administrator sees who in the workspace is linked (needed to build project chats later)
create policy roarme_links_read on public.roarme_links for select to authenticated
  using (user_id = auth.uid() or (workspace_id = public.my_ws() and public.is_admin()));
-- no insert, update or delete policy: only the roarme-link function writes

-- the "state" a member's Connect started: the code RoarMe hands back is only redeemed for the same member, within 10 minutes
create table if not exists public.roarme_link_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.roarme_link_states enable row level security;
-- no policies

-- the secret shared with RoarMe's roar-hub-link function (the same value sits in RoarMe's roar_hub_conf)
create table if not exists public.roarme_conf (
  id int primary key default 1 check (id = 1),
  secret text not null
);
alter table public.roarme_conf enable row level security;
-- no policies
