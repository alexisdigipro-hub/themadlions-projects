-- THEMADLIONS Projects · finance (administrators only)
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql). Safe to run more than once.
-- Every row is readable and writable only by administrators; other members cannot read it, not even through the API.

create table if not exists finance (
  id text primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null check (kind in ('tx', 'settings')),
  data jsonb not null,
  updated_at timestamptz default now(),
  updated_by uuid
);

drop trigger if exists finance_touch on finance;
create trigger finance_touch before insert or update on finance for each row execute function touch_updated_at();

alter table finance enable row level security;
drop policy if exists finance_admin on finance;
create policy finance_admin on finance for all
  using (workspace_id = my_ws() and is_admin())
  with check (workspace_id = my_ws() and is_admin());

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'finance') then
    alter publication supabase_realtime add table finance;
  end if;
end $$;
