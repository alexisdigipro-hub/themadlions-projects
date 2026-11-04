-- Roardino, the social place of the Greek film, theatre, dance and photo world (Alex, 4 Nov 2026).
-- RUNS IN ROARME'S SUPABASE PROJECT (bzmjhbnwhdwmncxkqkdl), next to roardino_profiles / roardino_ordinos, with the
-- Roar Accounts as its sign-in. Not the hub's project. Safe to run again.
--
-- roardino_people     a profile: actor, model, dancer, director, DoP, crew, photographer, theatre... One account may
--                     hold several (a parent signs up their children: guardian is filled, the profile is a minor's).
-- roardino_scouts     accounts allowed to see minors' profiles (productions and casting directors Roar's admins trust).
-- roardino_calls      a call: casting or crew wanted, with who, where, when, pay.
-- roardino_applies    a profile answering a call; the call's owner then sees that profile, a minor's too.
-- roardino_seminars   seminars and webinars (made by Roar's admins), roardino_seminar_links their private join links,
--                     roardino_seats who took a seat.
-- bucket roardino-people  pictures, self-tapes and CVs: <account>/<profile>/<file>, read through signed links only.

-- ---------- profiles ----------
create table if not exists roardino_people (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  kinds text[] not null default '{}',
  city text,
  birth date,
  gender text,
  headline text,
  bio text,
  minor boolean not null default false,
  guardian jsonb,                       -- { name, relation, phone, email, consent_at } when minor
  data jsonb not null default '{}',     -- looks, skills, languages, equipment, credits, links, availability, limits
  avatar text,                          -- path in roardino-people
  photos jsonb not null default '[]',   -- [{ path, kind }]
  reel text,                            -- a self-tape uploaded (path)
  reel_url text,                        -- or a link (YouTube, Vimeo)
  cv text,                              -- path
  visible boolean not null default true,
  consent_at timestamptz
);
create index if not exists roardino_people_owner on roardino_people (owner);
create index if not exists roardino_people_kinds on roardino_people using gin (kinds);

-- under 18 on the birth date: a minor, and then a guardian with their consent is required
create or replace function roardino_people_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then new.owner := old.owner; new.created_at := old.created_at; end if;
  new.minor := new.birth is not null and new.birth > (current_date - interval '18 years');
  if new.minor then
    if coalesce(new.guardian ->> 'name', '') = '' or coalesce(new.guardian ->> 'phone', '') = ''
       or coalesce(new.guardian ->> 'email', '') = '' or coalesce(new.guardian ->> 'consent_at', '') = '' then
      raise exception 'A profile under 18 needs a parent or guardian, with their name, phone, email and consent';
    end if;
  end if;
  if new.consent_at is null then raise exception 'The consent to keep the data is required'; end if;
  return new;
end $$;
drop trigger if exists roardino_people_guard on roardino_people;
create trigger roardino_people_guard before insert or update on roardino_people for each row execute function roardino_people_guard();

create table if not exists roardino_scouts (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  note text
);

-- may this account see minors' profiles?
create or replace function roardino_is_scout() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (roar_is_admin() or exists (select 1 from roardino_scouts where user_id = auth.uid()))
$$;

-- ---------- calls ----------
create table if not exists roardino_calls (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  kind text not null default 'casting' check (kind in ('casting', 'crew', 'other')),
  title text not null check (char_length(title) between 1 and 160),
  about text,
  company text,
  city text,
  dates text,
  pay text,
  wanted text[] not null default '{}',
  age_from int,
  age_to int,
  gender text,
  minors_ok boolean not null default false,
  closes date,
  open boolean not null default true
);

create table if not exists roardino_applies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  call_id uuid not null references roardino_calls on delete cascade,
  person_id uuid not null references roardino_people on delete cascade,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  note text check (char_length(coalesce(note, '')) <= 2000),
  status text not null default 'new' check (status in ('new', 'shortlist', 'no')),
  unique (call_id, person_id)
);

-- who may see a profile: its own account, everyone signed in for an adult's visible profile, and for a minor's only
-- a scout, or the owner of a call the minor answered
drop function if exists roardino_can_see(uuid);
create or replace function roardino_can_see(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from roardino_people x where x.id::text = p and (
      x.owner = auth.uid()
      or (auth.uid() is not null and x.visible and not x.minor)
      or (x.visible and x.minor and roardino_is_scout())
      or exists (select 1 from roardino_applies a join roardino_calls c on c.id = a.call_id where a.person_id = x.id and c.owner = auth.uid())
    ))
$$;

-- ---------- seminars ----------
create table if not exists roardino_seminars (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  title text not null check (char_length(title) between 1 and 160),
  about text,
  teacher text,
  kind text not null default 'online' check (kind in ('online', 'live')),
  starts_at timestamptz,
  minutes int,
  place text,
  price text,
  seats int,
  for_kinds text[] not null default '{}',
  published boolean not null default false
);
create table if not exists roardino_seminar_links (
  seminar_id uuid primary key references roardino_seminars on delete cascade,
  url text
);
create table if not exists roardino_seats (
  seminar_id uuid not null references roardino_seminars on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  name text,
  phone text,
  primary key (seminar_id, user_id)
);

-- seats taken, for everyone's list (no names)
create or replace function roardino_seat_counts() returns table (seminar_id uuid, taken int)
language sql stable security definer set search_path = public as $$
  select seminar_id, count(*)::int from roardino_seats group by seminar_id
$$;

-- take a seat; a free seminar answers with its join link at once
create or replace function roardino_take_seat(p_seminar uuid, p_name text, p_phone text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s roardino_seminars; n int; link text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into s from roardino_seminars where id = p_seminar and published;
  if not found then raise exception 'This seminar is not open'; end if;
  select count(*) into n from roardino_seats where seminar_id = p_seminar;
  if s.seats is not null and n >= s.seats and not exists (select 1 from roardino_seats where seminar_id = p_seminar and user_id = auth.uid()) then
    raise exception 'No seats left';
  end if;
  insert into roardino_seats (seminar_id, user_id, name, phone) values (p_seminar, auth.uid(), left(p_name, 120), left(p_phone, 40))
    on conflict (seminar_id, user_id) do update set name = excluded.name, phone = excluded.phone;
  select url into link from roardino_seminar_links where seminar_id = p_seminar;
  return jsonb_build_object('ok', true, 'link', case when coalesce(nullif(trim(s.price), ''), '0') in ('0', 'free', 'Δωρεάν', 'δωρεάν') then link end);
end $$;

-- ---------- row level security ----------
alter table roardino_people enable row level security;
alter table roardino_scouts enable row level security;
alter table roardino_calls enable row level security;
alter table roardino_applies enable row level security;
alter table roardino_seminars enable row level security;
alter table roardino_seminar_links enable row level security;
alter table roardino_seats enable row level security;

grant select, insert, update, delete on roardino_people, roardino_calls, roardino_applies, roardino_seats to authenticated;
grant select, insert, update, delete on roardino_seminars, roardino_seminar_links, roardino_scouts to authenticated;

drop policy if exists rd_people_read on roardino_people;
create policy rd_people_read on roardino_people for select to authenticated using (roardino_can_see(id::text));
drop policy if exists rd_people_add on roardino_people;
create policy rd_people_add on roardino_people for insert to authenticated with check (owner = auth.uid());
drop policy if exists rd_people_edit on roardino_people;
create policy rd_people_edit on roardino_people for update to authenticated using (owner = auth.uid() or roar_is_admin()) with check (owner = auth.uid() or roar_is_admin());
drop policy if exists rd_people_delete on roardino_people;
create policy rd_people_delete on roardino_people for delete to authenticated using (owner = auth.uid() or roar_is_admin());

drop policy if exists rd_scouts_read on roardino_scouts;
create policy rd_scouts_read on roardino_scouts for select to authenticated using (user_id = auth.uid() or roar_is_admin());
drop policy if exists rd_scouts_admin on roardino_scouts;
create policy rd_scouts_admin on roardino_scouts for all to authenticated using (roar_is_admin()) with check (roar_is_admin());

drop policy if exists rd_calls_read on roardino_calls;
create policy rd_calls_read on roardino_calls for select to authenticated using (open or owner = auth.uid() or roar_is_admin());
drop policy if exists rd_calls_add on roardino_calls;
create policy rd_calls_add on roardino_calls for insert to authenticated with check (owner = auth.uid());
drop policy if exists rd_calls_edit on roardino_calls;
create policy rd_calls_edit on roardino_calls for update to authenticated using (owner = auth.uid() or roar_is_admin()) with check (owner = auth.uid() or roar_is_admin());
drop policy if exists rd_calls_delete on roardino_calls;
create policy rd_calls_delete on roardino_calls for delete to authenticated using (owner = auth.uid() or roar_is_admin());

drop policy if exists rd_applies_read on roardino_applies;
create policy rd_applies_read on roardino_applies for select to authenticated using (
  owner = auth.uid() or exists (select 1 from roardino_calls c where c.id = call_id and c.owner = auth.uid()));
drop policy if exists rd_applies_add on roardino_applies;
create policy rd_applies_add on roardino_applies for insert to authenticated with check (
  owner = auth.uid() and status = 'new'
  and exists (select 1 from roardino_people p where p.id = person_id and p.owner = auth.uid())
  and exists (select 1 from roardino_calls c where c.id = call_id and c.open
              and (c.minors_ok or not (select minor from roardino_people where id = person_id))));
drop policy if exists rd_applies_edit on roardino_applies;
create policy rd_applies_edit on roardino_applies for update to authenticated using (
  exists (select 1 from roardino_calls c where c.id = call_id and c.owner = auth.uid()));
drop policy if exists rd_applies_delete on roardino_applies;
create policy rd_applies_delete on roardino_applies for delete to authenticated using (owner = auth.uid());

drop policy if exists rd_sem_read on roardino_seminars;
create policy rd_sem_read on roardino_seminars for select to authenticated using (published or roar_is_admin());
drop policy if exists rd_sem_admin on roardino_seminars;
create policy rd_sem_admin on roardino_seminars for all to authenticated using (roar_is_admin()) with check (roar_is_admin());

drop policy if exists rd_link_read on roardino_seminar_links;
create policy rd_link_read on roardino_seminar_links for select to authenticated using (
  roar_is_admin() or exists (select 1 from roardino_seats s where s.seminar_id = roardino_seminar_links.seminar_id and s.user_id = auth.uid()));
drop policy if exists rd_link_admin on roardino_seminar_links;
create policy rd_link_admin on roardino_seminar_links for all to authenticated using (roar_is_admin()) with check (roar_is_admin());

drop policy if exists rd_seats_read on roardino_seats;
create policy rd_seats_read on roardino_seats for select to authenticated using (user_id = auth.uid() or roar_is_admin());
drop policy if exists rd_seats_leave on roardino_seats;
create policy rd_seats_leave on roardino_seats for delete to authenticated using (user_id = auth.uid() or roar_is_admin());
-- a seat is taken only through roardino_take_seat (seat limit)

revoke all on function roardino_take_seat(uuid, text, text) from public, anon;
grant execute on function roardino_take_seat(uuid, text, text) to authenticated;
revoke all on function roardino_seat_counts() from public, anon;
grant execute on function roardino_seat_counts() to authenticated;
revoke all on function roardino_can_see(text) from public, anon;
grant execute on function roardino_can_see(text) to authenticated;
revoke all on function roardino_is_scout() from public, anon;
grant execute on function roardino_is_scout() to authenticated;

-- how many are in, for the front page before sign-in (numbers only)
create or replace function roardino_counts() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'people', (select count(*) from roardino_people where visible),
    'calls', (select count(*) from roardino_calls where open),
    'seminars', (select count(*) from roardino_seminars where published and (starts_at is null or starts_at > now() - interval '1 day')))
$$;
grant execute on function roardino_counts() to anon, authenticated;

-- ---------- storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('roardino-people', 'roardino-people', false, 209715200,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists rd_files_read on storage.objects;
create policy rd_files_read on storage.objects for select to authenticated using (
  bucket_id = 'roardino-people' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or roardino_can_see((storage.foldername(name))[2])));
drop policy if exists rd_files_add on storage.objects;
create policy rd_files_add on storage.objects for insert to authenticated with check (
  bucket_id = 'roardino-people' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists rd_files_edit on storage.objects;
create policy rd_files_edit on storage.objects for update to authenticated using (
  bucket_id = 'roardino-people' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists rd_files_delete on storage.objects;
create policy rd_files_delete on storage.objects for delete to authenticated using (
  bucket_id = 'roardino-people' and ((storage.foldername(name))[1] = auth.uid()::text or roar_is_admin()));
