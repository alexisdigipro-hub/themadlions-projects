-- THEMADLIONS Projects · photo storage
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql). Safe to run more than once.
-- Creates the private bucket "photos"; files live at <projectId>/<ownerId>/<photoId>.jpg
-- and are readable or writable only by people who can see or edit that project.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

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
