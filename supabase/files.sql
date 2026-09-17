-- THEMADLIONS Projects · project files
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql). Safe to run more than once.
-- Private bucket "files"; documents, references and small videos at <projectId>/<fileId>-<name>,
-- readable or writable only by people who can see or edit that project. Per-file size limit 50 MB (raise on a paid plan).

insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists files_select on storage.objects;
drop policy if exists files_insert on storage.objects;
drop policy if exists files_update on storage.objects;
drop policy if exists files_delete on storage.objects;
create policy files_select on storage.objects for select using (bucket_id = 'files' and can_view_project(split_part(name, '/', 1)));
create policy files_insert on storage.objects for insert with check (bucket_id = 'files' and can_edit_project(split_part(name, '/', 1)));
create policy files_update on storage.objects for update using (bucket_id = 'files' and can_edit_project(split_part(name, '/', 1)));
create policy files_delete on storage.objects for delete using (bucket_id = 'files' and can_edit_project(split_part(name, '/', 1)));
