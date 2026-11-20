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

-- ---------------------------------------------------------------------------------------------------------------
-- RoarRef Pro (Alex, 16 Nov 2026: "a PRO version with no limit on the characters, make me PRO, and an admin panel
-- where I make anyone Pro for 3 or 6 months or for life"). Who is Pro and until when; an admin of RoarMe (roar_admins)
-- gives and takes it. Without Pro: 10 sheets, as before. When Pro ends the sheets stay; only new ones wait for room.
-- Safe to re-run.
create table if not exists roarref_pro (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  plan       text not null default 'life',          -- '3m', '6m' or 'life'
  until      timestamptz,                           -- null: for life
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  constraint roarref_pro_plan check (plan in ('3m','6m','life'))
);
alter table roarref_pro enable row level security;
drop policy if exists roarref_pro_own on roarref_pro;
create policy roarref_pro_own on roarref_pro for select to authenticated using (user_id = (select auth.uid()));

create or replace function roarref_is_pro(u uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from roarref_pro where user_id = u and (until is null or until > now()));
$$;
revoke execute on function roarref_is_pro(uuid) from public, anon, authenticated;

-- the limit: none for Pro, 10 for everyone else
create or replace function roarref_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if roarref_is_pro(new.owner) then return new; end if;
  if (select count(*) from roarref_sheets where owner = new.owner) >= 10 then
    raise exception 'roarref_limit: up to 10 sheets' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function roarref_limit() from public, anon, authenticated;

-- what the page asks about the person signed in
create or replace function roarref_me() returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'pro',   roarref_is_pro(auth.uid()),
    'plan',  (select plan from roarref_pro where user_id = auth.uid()),
    'until', (select until from roarref_pro where user_id = auth.uid()),
    'admin', exists (select 1 from roar_admins where user_id = auth.uid()));
$$;
revoke execute on function roarref_me() from public, anon;
grant execute on function roarref_me() to authenticated;

-- the admin's list: Roar Accounts by email, with their sheets and their Pro; q narrows it, without q the Pro ones and
-- those who have sheets come first
create or replace function roarref_admin_list(q text default '') returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from roar_admins where user_id = auth.uid()) then raise exception 'not allowed' using errcode = '42501'; end if;
  return coalesce((select json_agg(t) from (
    select u.id, u.email, u.created_at,
           (select count(*) from roarref_sheets s where s.owner = u.id) as sheets,
           p.plan, p.until, p.granted_at,
           (p.user_id is not null and (p.until is null or p.until > now())) as pro
    from auth.users u left join roarref_pro p on p.user_id = u.id
    where u.email is not null and (coalesce(q, '') = '' or u.email ilike '%' || replace(replace(q, '%', ''), '_', '') || '%')
    order by (p.user_id is not null) desc, (select count(*) from roarref_sheets s where s.owner = u.id) desc, u.created_at desc
    limit 60) t), '[]'::json);
end $$;
revoke execute on function roarref_admin_list(text) from public, anon;
grant execute on function roarref_admin_list(text) to authenticated;

-- the admin gives Pro ('3m', '6m', 'life') or takes it away ('off'); months count from today
create or replace function roarref_admin_set(target uuid, new_plan text) returns json language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from roar_admins where user_id = auth.uid()) then raise exception 'not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from auth.users where id = target) then raise exception 'no such account' using errcode = 'P0002'; end if;
  if new_plan = 'off' then delete from roarref_pro where user_id = target; return json_build_object('pro', false); end if;
  if new_plan not in ('3m','6m','life') then raise exception 'bad plan' using errcode = '22023'; end if;
  insert into roarref_pro (user_id, plan, until, granted_by, granted_at)
  values (target, new_plan, case new_plan when '3m' then now() + interval '3 months' when '6m' then now() + interval '6 months' else null end, auth.uid(), now())
  on conflict (user_id) do update set plan = excluded.plan, until = excluded.until, granted_by = excluded.granted_by, granted_at = excluded.granted_at;
  return json_build_object('pro', true, 'plan', new_plan, 'until', (select until from roarref_pro where user_id = target));
end $$;
revoke execute on function roarref_admin_set(uuid, text) from public, anon;
grant execute on function roarref_admin_set(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Folders on Home (Alex, 20 Nov 2026: "folders on Home, each about one person, with that person's projects in it").
-- A folder is only a name; a sheet points at one (or none). Deleting a folder keeps its sheets: they go back to Home.
-- Folders do not count toward the 10 sheets. Safe to re-run.
create table if not exists roarref_folders (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null default 'Folder',
  created_at timestamptz not null default now(),
  constraint roarref_folders_name check (char_length(name) between 1 and 60)
);
create index if not exists roarref_folders_owner on roarref_folders (owner, created_at);
alter table roarref_folders enable row level security;
drop policy if exists roarref_folders_own on roarref_folders;
create policy roarref_folders_own on roarref_folders for all to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

alter table roarref_sheets add column if not exists folder uuid references roarref_folders(id) on delete set null;
create index if not exists roarref_sheets_folder on roarref_sheets (folder);

-- a sheet may only point at its owner's own folder
create or replace function roarref_folder_own() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.folder is not null and not exists (select 1 from roarref_folders f where f.id = new.folder and f.owner = new.owner) then
    raise exception 'roarref_folder: not your folder' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function roarref_folder_own() from public, anon, authenticated;
drop trigger if exists roarref_folder_own on roarref_sheets;
create trigger roarref_folder_own before insert or update of folder on roarref_sheets for each row execute function roarref_folder_own();
