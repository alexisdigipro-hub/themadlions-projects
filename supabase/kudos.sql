-- THEMADLIONS Projects · kudos on a profile (Alex, 29 Oct 2026): a teammate leaves a short thank-you
-- ("🔥 great shoot on the Trailer"), optionally about one project. Everyone in the team reads them;
-- you write only as yourself and never to yourself; you delete your own, an administrator any.
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql). Safe to run more than once.

create table if not exists kudos (
  id           text primary key,
  workspace_id uuid not null default my_ws() references workspaces(id) on delete cascade,
  to_user      uuid not null,
  from_user    uuid not null default auth.uid(),
  data         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  constraint kudos_size check (octet_length(data::text) <= 2000)
);
create index if not exists kudos_to on kudos (workspace_id, to_user, created_at desc);

alter table kudos enable row level security;

drop policy if exists kudos_read on kudos;
create policy kudos_read on kudos for select to authenticated
  using (workspace_id = my_ws());

drop policy if exists kudos_write on kudos;
create policy kudos_write on kudos for insert to authenticated
  with check (workspace_id = my_ws() and from_user = auth.uid() and to_user <> auth.uid());

drop policy if exists kudos_delete on kudos;
create policy kudos_delete on kudos for delete to authenticated
  using (workspace_id = my_ws() and (from_user = auth.uid() or is_admin()));

revoke all on kudos from anon;
grant select, insert, delete on kudos to authenticated;
