-- Small pictures out of the project JSON (Alex, 25 Oct: "the hub still feels heavy"). Project covers and the
-- small pictures of people and locations were kept inside each project's JSON as data URLs: 3.4 of the
-- 3.7 MB every open downloaded. They now live in the bucket "thumbs" and the JSON keeps only their link.
-- Public to read, like a pCloud public link: a file's name is the SHA-256 of its bytes, so it cannot be
-- guessed; only members who can edit write, only the workspace's own folder. Safe to run again.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('thumbs', 'thumbs', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists thumbs_insert on storage.objects;
drop policy if exists thumbs_update on storage.objects;
create policy thumbs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'thumbs' and split_part(name, '/', 1) = my_ws()::text and can_edit_any());
create policy thumbs_update on storage.objects for update to authenticated
  using (bucket_id = 'thumbs' and split_part(name, '/', 1) = my_ws()::text and can_edit_any());
