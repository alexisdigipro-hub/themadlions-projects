-- THEMADLIONS Projects · weekly backups inside the database
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql; the other tables are
-- picked up if they exist). Safe to run more than once.
--
-- The free Supabase plan keeps no backups of its own. This file makes the database take a
-- snapshot of the whole workspace every Monday at 03:00 UTC (06:00 Athens) and keep the last
-- twelve, so an accidental delete or a bad edit can be undone from Settings > Data > Backups.
-- No credentials leave Supabase: the job runs inside Postgres with pg_cron. A copy on your own
-- disk is still worth having; the app downloads any snapshot as a file the Restore button reads.
--
-- If the first line fails with "extension pg_cron is not available", enable it once from the
-- dashboard: Database > Extensions > search "pg_cron" > enable, then run this file again.

create extension if not exists pg_cron with schema pg_catalog;

create table if not exists backups (
  id bigserial primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  taken_at timestamptz not null default now(),
  note text not null default 'weekly',
  bytes integer not null default 0,
  data jsonb not null
);
create index if not exists backups_ws_when on backups (workspace_id, taken_at desc);

-- Everything of one workspace, table by table, each row as it is. Tables added by later files
-- (worklog, notices, shares, finance, library, events) are read only if they exist, so this
-- file runs on a fresh install too.
create or replace function snapshot_workspace(p_ws uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  out jsonb := '{}'::jsonb;
  t text;
  part jsonb;
begin
  select to_jsonb(w) - 'id' into part from workspaces w where w.id = p_ws;
  out := out || jsonb_build_object('workspace', part);
  foreach t in array array['members', 'projects', 'events', 'library', 'finance', 'worklog', 'notices', 'shares'] loop
    if to_regclass('public.' || t) is not null then
      execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from %I x where x.workspace_id = $1', t) into part using p_ws;
      out := out || jsonb_build_object(t, part);
    end if;
  end loop;
  return out;
end $$;

create or replace function make_backup(p_ws uuid, p_note text default 'weekly') returns bigint
language plpgsql volatile security definer set search_path = public as $$
declare
  d jsonb := snapshot_workspace(p_ws);
  new_id bigint;
begin
  insert into backups (workspace_id, note, bytes, data)
  values (p_ws, coalesce(p_note, 'weekly'), octet_length(d::text), d)
  returning id into new_id;
  -- keep the last twelve per workspace
  delete from backups b
  where b.workspace_id = p_ws
    and b.id not in (select id from backups where workspace_id = p_ws order by taken_at desc limit 12);
  return new_id;
end $$;

-- what the weekly job runs: one snapshot per workspace
create or replace function backup_all() returns integer
language plpgsql volatile security definer set search_path = public as $$
declare
  n integer := 0;
  w record;
begin
  for w in select id from workspaces loop
    perform make_backup(w.id, 'weekly');
    n := n + 1;
  end loop;
  return n;
end $$;

-- the door for the app: an administrator takes a snapshot of their own workspace by hand
create or replace function make_backup_now() returns bigint
language plpgsql volatile security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'administrators only'; end if;
  return make_backup(my_ws(), 'manual');
end $$;

revoke all on function snapshot_workspace(uuid) from public;
revoke all on function make_backup(uuid, text) from public;
revoke all on function backup_all() from public;
revoke all on function make_backup_now() from public;
grant execute on function make_backup_now() to authenticated;

alter table backups enable row level security;
drop policy if exists backups_admin_read on backups;
create policy backups_admin_read on backups for select using (workspace_id = my_ws() and is_admin());
-- no insert / update / delete policy: rows are written by the functions above, never by the app

-- the schedule: Monday 03:00 UTC. Re-running this file replaces the job rather than doubling it.
do $$
begin
  perform cron.unschedule('themadlions-weekly-backup');
exception when others then null;
end $$;
select cron.schedule('themadlions-weekly-backup', '0 3 * * 1', 'select public.backup_all()');

-- a first snapshot right now, so the list is not empty until Monday
select backup_all();
