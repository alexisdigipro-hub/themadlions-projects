-- THEMADLIONS Projects · company library (people and locations shared across projects)
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql). Safe to run more than once.

create table if not exists library (
  id text primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null check (kind in ('contact', 'location')),
  data jsonb not null,
  updated_at timestamptz default now(),
  updated_by uuid
);

drop trigger if exists library_touch on library;
create trigger library_touch before insert or update on library for each row execute function touch_updated_at();

alter table library enable row level security;
drop policy if exists library_select on library;
drop policy if exists library_write on library;
create policy library_select on library for select using (workspace_id = my_ws());
create policy library_write on library for all
  using (workspace_id = my_ws() and can_edit_any())
  with check (workspace_id = my_ws() and can_edit_any());

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'library') then
    alter publication supabase_realtime add table library;
  end if;
end $$;

-- photos of library entries live under photos/library/<entryId>/…, readable by every member
drop policy if exists photos_select on storage.objects;
drop policy if exists photos_insert on storage.objects;
drop policy if exists photos_update on storage.objects;
drop policy if exists photos_delete on storage.objects;
create policy photos_select on storage.objects for select
  using (bucket_id = 'photos' and ((split_part(name, '/', 1) = 'library' and my_ws() is not null) or can_view_project(split_part(name, '/', 1))));
create policy photos_insert on storage.objects for insert
  with check (bucket_id = 'photos' and ((split_part(name, '/', 1) = 'library' and can_edit_any()) or can_edit_project(split_part(name, '/', 1))));
create policy photos_update on storage.objects for update
  using (bucket_id = 'photos' and ((split_part(name, '/', 1) = 'library' and can_edit_any()) or can_edit_project(split_part(name, '/', 1))));
create policy photos_delete on storage.objects for delete
  using (bucket_id = 'photos' and ((split_part(name, '/', 1) = 'library' and can_edit_any()) or can_edit_project(split_part(name, '/', 1))));
