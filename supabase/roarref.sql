-- RoarRef (themadlions.com/lab/roarref/app/), Alex 7 Nov 2026: sign in with a Roar Account, up to 10 sheets per person (5 at first),
-- the same on every computer. Runs on RoarMe's Supabase project (bzmjhbnwhdwmncxkqkdl), where the Roar Accounts live.
-- Only its own table roarref_sheets and bucket roarref; never touches roar_* tables. Safe to re-run.

create table if not exists roarref_sheets (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null default 'Character',
  data       jsonb not null default '{}'::jsonb,   -- the sheet: S (layout, look, names, covers) and photos [{path, w, h, s, ox, oy, flip, rot}]
  thumb      text,                                 -- storage path of a small picture of the sheet
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roarref_sheets_name check (char_length(name) <= 60),
  constraint roarref_sheets_size check (octet_length(data::text) <= 500000)
);
create index if not exists roarref_sheets_owner on roarref_sheets (owner, created_at);

alter table roarref_sheets enable row level security;
drop policy if exists roarref_own on roarref_sheets;
create policy roarref_own on roarref_sheets for all to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

-- at most 10 sheets a person (5 until 11 Nov 2026)
create or replace function roarref_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from roarref_sheets where owner = new.owner) >= 10 then
    raise exception 'roarref_limit: up to 10 sheets' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function roarref_limit() from public, anon, authenticated;
drop trigger if exists roarref_limit on roarref_sheets;
create trigger roarref_limit before insert on roarref_sheets for each row execute function roarref_limit();

-- the photos: private bucket, each person writes and reads only their own folder <user id>/<sheet id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('roarref', 'roarref', false, 15728640, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists roarref_files_read on storage.objects;
create policy roarref_files_read on storage.objects for select to authenticated
  using (bucket_id = 'roarref' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists roarref_files_write on storage.objects;
create policy roarref_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'roarref' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists roarref_files_update on storage.objects;
create policy roarref_files_update on storage.objects for update to authenticated
  using (bucket_id = 'roarref' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists roarref_files_delete on storage.objects;
create policy roarref_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'roarref' and (storage.foldername(name))[1] = (select auth.uid())::text);
