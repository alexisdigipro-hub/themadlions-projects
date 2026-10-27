-- THEMADLIONS Projects · daily backups (Alex, 27 Oct: "are we safe, do we have backups?")
-- Run after backups.sql. Safe to run more than once.
--
-- backups.sql took one snapshot a week of a few tables. This makes it every day at 03:00 UTC (06:00 Athens),
-- of every table that belongs to a workspace (any public table with a workspace_id column, so tables added later
-- are in it too), and keeps the last 21: three weeks to go back to. The pCloud copy (Settings > Data) stays the
-- one outside Supabase.

create extension if not exists pg_cron with schema pg_catalog;

create or replace function snapshot_workspace(p_ws uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  out jsonb := '{}'::jsonb;
  t text;
  part jsonb;
begin
  select to_jsonb(w) - 'id' into part from workspaces w where w.id = p_ws;
  out := out || jsonb_build_object('workspace', part);
  for t in
    select c.table_name from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
    where c.table_schema = 'public' and c.column_name = 'workspace_id' and c.table_name not in ('backups', 'activity')
    order by c.table_name
  loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from %I x where x.workspace_id = $1', t) into part using p_ws;
    out := out || jsonb_build_object(t, part);
  end loop;
  return out;
end $$;

create or replace function make_backup(p_ws uuid, p_note text default 'daily') returns bigint
language plpgsql volatile security definer set search_path = public as $$
declare
  d jsonb := snapshot_workspace(p_ws);
  new_id bigint;
begin
  insert into backups (workspace_id, note, bytes, data)
  values (p_ws, coalesce(p_note, 'daily'), octet_length(d::text), d)
  returning id into new_id;
  -- keep the last 21 per workspace
  delete from backups b
  where b.workspace_id = p_ws
    and b.id not in (select id from backups where workspace_id = p_ws order by taken_at desc limit 21);
  return new_id;
end $$;

create or replace function backup_all() returns integer
language plpgsql volatile security definer set search_path = public as $$
declare
  n integer := 0;
  w record;
begin
  for w in select id from workspaces loop
    perform make_backup(w.id, 'daily');
    n := n + 1;
  end loop;
  return n;
end $$;

revoke all on function snapshot_workspace(uuid) from public, anon, authenticated;
revoke all on function make_backup(uuid, text) from public, anon, authenticated;
revoke all on function backup_all() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('themadlions-weekly-backup');
exception when others then null;
end $$;
do $$
begin
  perform cron.unschedule('themadlions-daily-backup');
exception when others then null;
end $$;
select cron.schedule('themadlions-daily-backup', '0 3 * * *', 'select public.backup_all()');

select backup_all();
