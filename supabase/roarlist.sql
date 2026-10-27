-- RoarList inside the hub (Alex, 27 Oct 2026): the shot list app of themadlions.com/roarlist, copied into the hub
-- (hub.themadlions.com/roarlist/, side menu RoarList). It replaces the project's Shotlist tab; the old shot lists in
-- projects.data are not moved (Alex: start from nothing) and stay there unused.
-- Who: the Shot list permission (my_perm('shots')): edit makes and changes, view reads; everyone on a project also
-- reads that project's lists. Needs share_access.sql (my_perm) and access_until.sql (can_view_project) before it.
-- Safe to re-run.

create table if not exists roarlist_lists (
  id           uuid primary key,
  workspace_id uuid not null default my_ws() references workspaces(id) on delete cascade,
  project_id   text,
  data         jsonb not null default '{}'::jsonb,
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint roarlist_lists_size check (octet_length(data::text) <= 2000000)
);
create index if not exists roarlist_lists_ws on roarlist_lists (workspace_id, updated_at desc);
create index if not exists roarlist_lists_project on roarlist_lists (project_id);

alter table roarlist_lists enable row level security;

drop policy if exists roarlist_select on roarlist_lists;
create policy roarlist_select on roarlist_lists for select to authenticated using (
  workspace_id = my_ws() and (
    (my_perm('shots') in ('view', 'edit') and (project_id is null or can_view_project(project_id)))
    or (project_id is not null and can_view_project(project_id))
  ));

drop policy if exists roarlist_insert on roarlist_lists;
create policy roarlist_insert on roarlist_lists for insert to authenticated with check (
  workspace_id = my_ws() and my_perm('shots') = 'edit' and (project_id is null or can_view_project(project_id)));

drop policy if exists roarlist_update on roarlist_lists;
create policy roarlist_update on roarlist_lists for update to authenticated
  using (workspace_id = my_ws() and my_perm('shots') = 'edit' and (project_id is null or can_view_project(project_id)))
  with check (workspace_id = my_ws() and my_perm('shots') = 'edit' and (project_id is null or can_view_project(project_id)));

drop policy if exists roarlist_delete on roarlist_lists;
create policy roarlist_delete on roarlist_lists for delete to authenticated using (
  workspace_id = my_ws() and my_perm('shots') = 'edit' and (project_id is null or can_view_project(project_id)));

revoke all on roarlist_lists from anon;
revoke insert, update on roarlist_lists from authenticated;
grant insert (id, project_id, data) on roarlist_lists to authenticated;
grant update (project_id, data) on roarlist_lists to authenticated;
grant select, delete on roarlist_lists to authenticated;

create or replace function roarlist_touch() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists roarlist_lists_touch on roarlist_lists;
create trigger roarlist_lists_touch before update on roarlist_lists for each row execute function roarlist_touch();
revoke all on function roarlist_touch() from public, anon, authenticated;

-- the frames: private bucket, <list id>/<file>; whoever can read the list reads its pictures, an editor writes them
-- (the page deletes a list's pictures before the list itself)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('roarlist-images', 'roarlist-images', false, 15728640, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists roarlist_images_read on storage.objects;
create policy roarlist_images_read on storage.objects for select to authenticated
  using (bucket_id = 'roarlist-images' and exists (select 1 from roarlist_lists l where l.id::text = (storage.foldername(name))[1]));
drop policy if exists roarlist_images_write on storage.objects;
create policy roarlist_images_write on storage.objects for insert to authenticated
  with check (bucket_id = 'roarlist-images' and my_perm('shots') = 'edit'
    and exists (select 1 from roarlist_lists l where l.id::text = (storage.foldername(name))[1]));
drop policy if exists roarlist_images_update on storage.objects;
create policy roarlist_images_update on storage.objects for update to authenticated
  using (bucket_id = 'roarlist-images' and my_perm('shots') = 'edit' and exists (select 1 from roarlist_lists l where l.id::text = (storage.foldername(name))[1]))
  with check (bucket_id = 'roarlist-images' and my_perm('shots') = 'edit' and exists (select 1 from roarlist_lists l where l.id::text = (storage.foldername(name))[1]));
drop policy if exists roarlist_images_delete on storage.objects;
create policy roarlist_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'roarlist-images' and my_perm('shots') = 'edit' and exists (select 1 from roarlist_lists l where l.id::text = (storage.foldername(name))[1]));
