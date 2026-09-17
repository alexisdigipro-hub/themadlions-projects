-- THEMADLIONS Projects · audio storage for music videos
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql). Safe to run more than once.
-- Private bucket "audio"; files live at <projectId>/<trackId>.<ext>, readable or writable only by people who can see or edit that project.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', false, 104857600, array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'audio/flac'])
on conflict (id) do update set public = false, file_size_limit = 104857600, allowed_mime_types = array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'audio/flac'];

drop policy if exists audio_select on storage.objects;
drop policy if exists audio_insert on storage.objects;
drop policy if exists audio_update on storage.objects;
drop policy if exists audio_delete on storage.objects;
create policy audio_select on storage.objects for select using (bucket_id = 'audio' and can_view_project(split_part(name, '/', 1)));
create policy audio_insert on storage.objects for insert with check (bucket_id = 'audio' and can_edit_project(split_part(name, '/', 1)));
create policy audio_update on storage.objects for update using (bucket_id = 'audio' and can_edit_project(split_part(name, '/', 1)));
create policy audio_delete on storage.objects for delete using (bucket_id = 'audio' and can_edit_project(split_part(name, '/', 1)));
