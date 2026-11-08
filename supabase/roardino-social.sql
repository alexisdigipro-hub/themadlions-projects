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

-- ---------- the feed (Alex, 4 Nov: "Facebook with Instagram") ----------
-- a post belongs to a profile; it is seen by whoever may see that profile (a minor's only by scouts)
create table if not exists roardino_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  person_id uuid not null references roardino_people on delete cascade,
  body text check (char_length(coalesce(body, '')) <= 4000),
  media jsonb not null default '[]'          -- [{ path, type: 'image' | 'video' }], in roardino-people under the profile
);
create index if not exists roardino_posts_time on roardino_posts (created_at desc);
create index if not exists roardino_posts_person on roardino_posts (person_id, created_at desc);

create table if not exists roardino_bravos (
  post_id uuid not null references roardino_posts on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists roardino_comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  post_id uuid not null references roardino_posts on delete cascade,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  person_id uuid references roardino_people on delete set null,   -- which of the account's profiles speaks
  body text not null check (char_length(body) between 1 and 1500)
);
create index if not exists roardino_comments_post on roardino_comments (post_id, created_at);
create table if not exists roardino_follows (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  person_id uuid not null references roardino_people on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, person_id)
);

alter table roardino_posts enable row level security;
alter table roardino_bravos enable row level security;
alter table roardino_comments enable row level security;
alter table roardino_follows enable row level security;
grant select, insert, update, delete on roardino_posts, roardino_bravos, roardino_comments, roardino_follows to authenticated;

drop policy if exists rd_posts_read on roardino_posts;
create policy rd_posts_read on roardino_posts for select to authenticated using (roardino_can_see(person_id::text));
drop policy if exists rd_posts_add on roardino_posts;
create policy rd_posts_add on roardino_posts for insert to authenticated with check (
  owner = auth.uid() and exists (select 1 from roardino_people p where p.id = person_id and p.owner = auth.uid()));
drop policy if exists rd_posts_edit on roardino_posts;
create policy rd_posts_edit on roardino_posts for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists rd_posts_delete on roardino_posts;
create policy rd_posts_delete on roardino_posts for delete to authenticated using (owner = auth.uid() or roar_is_admin());

drop policy if exists rd_bravos_read on roardino_bravos;
create policy rd_bravos_read on roardino_bravos for select to authenticated using (
  exists (select 1 from roardino_posts p where p.id = post_id));
drop policy if exists rd_bravos_add on roardino_bravos;
create policy rd_bravos_add on roardino_bravos for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from roardino_posts p where p.id = post_id));
drop policy if exists rd_bravos_delete on roardino_bravos;
create policy rd_bravos_delete on roardino_bravos for delete to authenticated using (user_id = auth.uid());

drop policy if exists rd_comments_read on roardino_comments;
create policy rd_comments_read on roardino_comments for select to authenticated using (
  exists (select 1 from roardino_posts p where p.id = post_id));
drop policy if exists rd_comments_add on roardino_comments;
create policy rd_comments_add on roardino_comments for insert to authenticated with check (
  owner = auth.uid() and exists (select 1 from roardino_posts p where p.id = post_id)
  and (person_id is null or exists (select 1 from roardino_people x where x.id = person_id and x.owner = auth.uid())));
drop policy if exists rd_comments_delete on roardino_comments;
create policy rd_comments_delete on roardino_comments for delete to authenticated using (
  owner = auth.uid() or roar_is_admin()
  or exists (select 1 from roardino_posts p where p.id = post_id and p.owner = auth.uid()));

drop policy if exists rd_follows_read on roardino_follows;
create policy rd_follows_read on roardino_follows for select to authenticated using (
  user_id = auth.uid() or exists (select 1 from roardino_people x where x.id = person_id and x.owner = auth.uid()));
drop policy if exists rd_follows_add on roardino_follows;
create policy rd_follows_add on roardino_follows for insert to authenticated with check (
  user_id = auth.uid() and roardino_can_see(person_id::text));
drop policy if exists rd_follows_delete on roardino_follows;
create policy rd_follows_delete on roardino_follows for delete to authenticated using (user_id = auth.uid());

-- followers of a profile, and its posts, for its page
create or replace function roardino_person_stats(p uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when roardino_can_see(p::text) then jsonb_build_object(
    'followers', (select count(*) from roardino_follows where person_id = p),
    'posts', (select count(*) from roardino_posts where person_id = p),
    'bravos', (select count(*) from roardino_bravos b join roardino_posts x on x.id = b.post_id where x.person_id = p)) end
$$;
revoke all on function roardino_person_stats(uuid) from public, anon;
grant execute on function roardino_person_stats(uuid) to authenticated;

-- the profile's grid in the order its owner sets (Alex, 4 Nov: like Instagram's reorder); null = newest first after the placed ones
alter table roardino_posts add column if not exists pos double precision;
create index if not exists roardino_posts_grid on roardino_posts (person_id, pos);

-- email and phone apart from the profile (Alex's rule for privacy): its owner; everyone who sees the profile when the
-- owner shows them; and whoever opened a call the profile answered
create table if not exists roardino_contacts (
  person_id uuid primary key references roardino_people on delete cascade,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  email text check (char_length(coalesce(email, '')) <= 200),
  phone text check (char_length(coalesce(phone, '')) <= 40),
  show boolean not null default false
);
alter table roardino_contacts enable row level security;
grant select, insert, update, delete on roardino_contacts to authenticated;
drop policy if exists rd_contacts_read on roardino_contacts;
create policy rd_contacts_read on roardino_contacts for select to authenticated using (
  owner = auth.uid()
  or (show and roardino_can_see(person_id::text))
  or exists (select 1 from roardino_applies a join roardino_calls c on c.id = a.call_id where a.person_id = roardino_contacts.person_id and c.owner = auth.uid()));
drop policy if exists rd_contacts_write on roardino_contacts;
create policy rd_contacts_write on roardino_contacts for all to authenticated using (owner = auth.uid())
  with check (owner = auth.uid() and exists (select 1 from roardino_people p where p.id = person_id and p.owner = auth.uid()));

-- stories (Alex, 5 Nov: "like Instagram's"): a picture or a video for 24 hours, seen by whoever may see the profile
create table if not exists roardino_stories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  person_id uuid not null references roardino_people on delete cascade,
  media jsonb not null,                       -- { path, type: 'image' | 'video' }
  caption text check (char_length(coalesce(caption, '')) <= 300)
);
create index if not exists roardino_stories_live on roardino_stories (expires_at desc);
alter table roardino_stories enable row level security;
grant select, insert, delete on roardino_stories to authenticated;
drop policy if exists rd_stories_read on roardino_stories;
create policy rd_stories_read on roardino_stories for select to authenticated using (
  (expires_at > now() and roardino_can_see(person_id::text)) or owner = auth.uid());
drop policy if exists rd_stories_add on roardino_stories;
create policy rd_stories_add on roardino_stories for insert to authenticated with check (
  owner = auth.uid() and expires_at <= now() + interval '25 hours'
  and exists (select 1 from roardino_people p where p.id = person_id and p.owner = auth.uid()));
drop policy if exists rd_stories_delete on roardino_stories;
create policy rd_stories_delete on roardino_stories for delete to authenticated using (owner = auth.uid() or roar_is_admin());

-- what a post is (Alex, 5 Nov: "My Work, My Photos, My Bio"): work goes to My Work, a personal photo to My Photos
alter table roardino_posts add column if not exists kind text not null default 'work';
do $$ begin
  alter table roardino_posts add constraint roardino_posts_kind check (kind in ('work', 'photo'));
exception when duplicate_object then null; end $$;

-- notifications (Alex, 5 Nov: "who gave me a bravo, who commented, who wrote to me"): made by triggers, read by their
-- own account only; the chat's unread messages come from RoarMe's own tables through roardino_chat_unread()
create table if not exists roardino_notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users on delete cascade,      -- who it is for
  actor uuid references auth.users on delete cascade,                  -- who did it
  actor_person uuid references roardino_people on delete set null,    -- as which profile
  kind text not null check (kind in ('bravo', 'comment', 'follow', 'apply', 'shortlist')),
  post_id uuid references roardino_posts on delete cascade,
  call_id uuid references roardino_calls on delete cascade,
  person_id uuid references roardino_people on delete cascade,        -- my profile it concerns
  text text,
  read_at timestamptz
);
create index if not exists roardino_notifications_me on roardino_notifications (user_id, created_at desc);
alter table roardino_notifications enable row level security;
grant select, update, delete on roardino_notifications to authenticated;
drop policy if exists rd_notes_read on roardino_notifications;
create policy rd_notes_read on roardino_notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists rd_notes_edit on roardino_notifications;
create policy rd_notes_edit on roardino_notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists rd_notes_delete on roardino_notifications;
create policy rd_notes_delete on roardino_notifications for delete to authenticated using (user_id = auth.uid());

-- the profile that is someone (an adult's own before a child's)
create or replace function roardino_face_of(u uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from roardino_people where owner = u order by minor, created_at limit 1
$$;

create or replace function roardino_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare to_user uuid; p roardino_posts; c roardino_calls; who uuid;
begin
  if tg_table_name = 'roardino_bravos' then
    select * into p from roardino_posts where id = new.post_id;
    if p.owner is distinct from new.user_id then
      insert into roardino_notifications (user_id, actor, actor_person, kind, post_id, person_id)
      values (p.owner, new.user_id, roardino_face_of(new.user_id), 'bravo', p.id, p.person_id);
    end if;
  elsif tg_table_name = 'roardino_comments' then
    select * into p from roardino_posts where id = new.post_id;
    if p.owner is distinct from new.owner then
      insert into roardino_notifications (user_id, actor, actor_person, kind, post_id, person_id, text)
      values (p.owner, new.owner, coalesce(new.person_id, roardino_face_of(new.owner)), 'comment', p.id, p.person_id, left(new.body, 140));
    end if;
  elsif tg_table_name = 'roardino_follows' then
    select owner into to_user from roardino_people where id = new.person_id;
    if to_user is distinct from new.user_id then
      insert into roardino_notifications (user_id, actor, actor_person, kind, person_id)
      values (to_user, new.user_id, roardino_face_of(new.user_id), 'follow', new.person_id);
    end if;
  elsif tg_table_name = 'roardino_applies' and tg_op = 'INSERT' then
    select * into c from roardino_calls where id = new.call_id;
    insert into roardino_notifications (user_id, actor, actor_person, kind, call_id, text)
    values (c.owner, new.owner, new.person_id, 'apply', c.id, left(c.title, 140));
  elsif tg_table_name = 'roardino_applies' and tg_op = 'UPDATE' and new.status = 'shortlist' and old.status is distinct from 'shortlist' then
    select * into c from roardino_calls where id = new.call_id;
    insert into roardino_notifications (user_id, actor, actor_person, kind, call_id, person_id, text)
    values (new.owner, c.owner, roardino_face_of(c.owner), 'shortlist', c.id, new.person_id, left(c.title, 140));
  end if;
  return new;
end $$;
drop trigger if exists rd_notify on roardino_bravos;
create trigger rd_notify after insert on roardino_bravos for each row execute function roardino_notify();
drop trigger if exists rd_notify on roardino_comments;
create trigger rd_notify after insert on roardino_comments for each row execute function roardino_notify();
drop trigger if exists rd_notify on roardino_follows;
create trigger rd_notify after insert on roardino_follows for each row execute function roardino_notify();
drop trigger if exists rd_notify on roardino_applies;
create trigger rd_notify after insert or update on roardino_applies for each row execute function roardino_notify();

-- unread chat messages from RoarMe: per conversation, who wrote last, a few words, how many
create or replace function roardino_chat_unread() returns table (room_id uuid, sender text, avatar text, body text, at timestamptz, n int)
language sql stable security definer set search_path = public as $$
  select m.room_id,
         coalesce(nullif(pr.display_name, ''), '@' || pr.username) as sender,
         pr.avatar_url,
         left(coalesce(nullif(last.body, ''), case when last.file is not null then '📎' else '' end), 120),
         last.created_at,
         (select count(*)::int from roar_messages x where x.room_id = m.room_id and x.user_id <> auth.uid() and x.deleted_at is null
            and x.created_at > coalesce(m.last_read_at, m.joined_at, '-infinity'))
  from roar_members m
  cross join lateral (select * from roar_messages x where x.room_id = m.room_id and x.user_id <> auth.uid() and x.deleted_at is null
                        and x.created_at > coalesce(m.last_read_at, m.joined_at, '-infinity') order by x.created_at desc limit 1) last
  left join roar_profiles pr on pr.id = last.user_id
  where m.user_id = auth.uid() and not coalesce(m.muted, false) and not coalesce(m.archived, false)
  order by last.created_at desc limit 20
$$;
revoke all on function roardino_chat_unread() from public, anon;
grant execute on function roardino_chat_unread() to authenticated;

do $$ begin alter publication supabase_realtime add table roardino_notifications; exception when others then null; end $$;

-- ---------- Contact Roardino (5 Nov): messages from the Contact page; anyone may send, nobody reads them through the API
-- (the team reads them in the Supabase Table Editor until Roardino has its own inbox) ----------
create table if not exists public.roardino_messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  topic text not null default 'general' check (topic in ('general','report','child','privacy','account','partner')),
  name text check (char_length(name) <= 120),
  email text not null check (char_length(email) between 3 and 200),
  body text not null check (char_length(body) between 1 and 5000),
  page text check (char_length(page) <= 500),
  user_id uuid references auth.users(id) on delete set null,
  done boolean not null default false
);
alter table public.roardino_messages enable row level security;
drop policy if exists roardino_messages_send on public.roardino_messages;
create policy roardino_messages_send on public.roardino_messages for insert to anon, authenticated
  with check (done = false and (user_id is null or user_id = auth.uid()));
grant insert on public.roardino_messages to anon, authenticated;

-- ---------- Design (5 Nov): how Roardino looks for everyone (the font and its weights); everyone reads, admins write ----------
create table if not exists public.roardino_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.roardino_settings enable row level security;
drop policy if exists roardino_settings_read on public.roardino_settings;
create policy roardino_settings_read on public.roardino_settings for select to anon, authenticated using (true);
drop policy if exists roardino_settings_write on public.roardino_settings;
create policy roardino_settings_write on public.roardino_settings for all to authenticated using (public.roar_is_admin()) with check (public.roar_is_admin());
grant select on public.roardino_settings to anon, authenticated;
grant insert, update on public.roardino_settings to authenticated;

-- ---------- @usernames and tags (5 Nov, Alex: "tag a profile with @ in a new post") ----------
-- every profile has a handle: a-z, 0-9, dot and underscore, 3 to 30 long, unique; the old ones get one made from the name
alter table roardino_people add column if not exists handle text;
create or replace function roardino_slug(x text) returns text
language sql immutable set search_path = public as $$
  select trim(both '._' from regexp_replace(
    translate(
      replace(replace(replace(replace(replace(replace(lower(coalesce(x, '')), 'ου', 'ou'), 'θ', 'th'), 'χ', 'ch'), 'ψ', 'ps'), 'ξ', 'x'), 'μπ', 'b'),
      'αάβγδεέζηήιίϊΐκλμνοόπρσςτυύϋΰφωώàáâäãèéêëìíîïòóôöõùúûüçñ',
      'aavgdeeziiiiiiklmnooprsstyyyyfooaaaaaeeeeiiiiooooouuuucn'),
    '[^a-z0-9]+', '.', 'g'))
$$;
do $$
declare r record; base text; h text; n int;
begin
  for r in select id, name from roardino_people where handle is null order by created_at loop
    base := left(roardino_slug(r.name), 26);
    if char_length(base) < 3 then base := 'roar.' || left(replace(r.id::text, '-', ''), 6); end if;
    h := base; n := 1;
    while exists (select 1 from roardino_people where handle = h) loop n := n + 1; h := base || n; end loop;
    update roardino_people set handle = h where id = r.id;
  end loop;
end $$;
create unique index if not exists roardino_people_handle on roardino_people (handle);
do $$ begin
  alter table roardino_people add constraint roardino_handle_ok check (handle is null or handle ~ '^[a-z0-9._]{3,30}$');
exception when duplicate_object then null; end $$;

-- a tag in a post or a comment tells the profile's owner
alter table roardino_notifications drop constraint if exists roardino_notifications_kind_check;
alter table roardino_notifications add constraint roardino_notifications_kind_check check (kind in ('bravo', 'comment', 'follow', 'apply', 'shortlist', 'tag'));
create or replace function roardino_notify_tags() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid; actor uuid; post uuid;
begin
  if tg_table_name = 'roardino_posts' then actor := new.owner; post := new.id;
  else actor := new.owner; post := new.post_id; end if;
  insert into roardino_notifications (user_id, actor, actor_person, kind, post_id, person_id, text)
  select distinct on (p.owner) p.owner, actor, coalesce(new.person_id, roardino_face_of(actor)), 'tag', post, p.id, left(new.body, 140)
  from roardino_people p
  where p.handle in (select lower(m[1]) from regexp_matches(coalesce(new.body, ''), '@([A-Za-z0-9._]{3,30})', 'g') as m)
    and p.owner is distinct from actor;
  return new;
end $$;
drop trigger if exists rd_tags on roardino_posts;
create trigger rd_tags after insert on roardino_posts for each row execute function roardino_notify_tags();
drop trigger if exists rd_tags on roardino_comments;
create trigger rd_tags after insert on roardino_comments for each row execute function roardino_notify_tags();

-- ---------- story stickers (5 Nov): text, @tags and links on a story, placed in % of the picture ----------
alter table roardino_stories add column if not exists overlays jsonb not null default '[]'::jsonb;
-- a @tag on a story tells that profile's owner too
create or replace function roardino_notify_story_tags() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into roardino_notifications (user_id, actor, actor_person, kind, person_id, text)
  select distinct on (p.owner) p.owner, new.owner, new.person_id, 'tag', p.id, 'in a story'
  from roardino_people p
  where p.id in (select (o->>'id')::uuid from jsonb_array_elements(coalesce(new.overlays, '[]'::jsonb)) o where o->>'type' = 'tag' and (o->>'id') ~ '^[0-9a-f-]{36}$')
    and p.owner is distinct from new.owner;
  return new;
end $$;
drop trigger if exists rd_story_tags on roardino_stories;
create trigger rd_story_tags after insert on roardino_stories for each row execute function roardino_notify_story_tags();

-- ---------- saved posts (5 Nov): Save in a post's menu, seen only by whoever saved ----------
create table if not exists roardino_saves (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  post_id uuid not null references roardino_posts on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table roardino_saves enable row level security;
grant select, insert, delete on roardino_saves to authenticated;
drop policy if exists rd_saves_mine on roardino_saves;
create policy rd_saves_mine on roardino_saves for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- who follows, whom they follow, who liked (5 Nov, Alex: "tap followers / following to see who they are") ----------
-- the lists behind the numbers on a profile; only profiles the asker may see, an account shown as its adult profile
create or replace function roardino_people_of(p uuid, what text)
returns table (id uuid, name text, handle text, avatar text, kinds text[], headline text)
language sql stable security definer set search_path = public as $$
  with src as (
    select f.user_id as u from roardino_follows f where what = 'followers' and f.person_id = p
    union all select distinct b.user_id from roardino_bravos b join roardino_posts po on po.id = b.post_id where what = 'likes' and po.person_id = p
  ), faces as (select distinct roardino_face_of(u) as pid from src where u is not null)
  select q.id, q.name, q.handle, q.avatar, q.kinds, q.headline from roardino_people q
  where roardino_can_see(p::text) and q.visible and roardino_can_see(q.id::text)
    and (q.id in (select pid from faces)
      or (what = 'following' and q.id in (select f.person_id from roardino_follows f where f.user_id = (select owner from roardino_people where id = p))))
  order by q.name
  limit 500
$$;
revoke all on function roardino_people_of(uuid, text) from public, anon;
grant execute on function roardino_people_of(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- Personal kept private (Alex, 5 Nov: "the Personal tab can be closed to the public"): a profile with
-- data.personal_private = true shows its Personal posts (kind 'photo') only to its owner. Safe to run again.
create or replace function public.roardino_personal_hidden(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (data->>'personal_private')::boolean from roardino_people where id = pid), false)
$$;
grant execute on function public.roardino_personal_hidden(uuid) to anon, authenticated;
drop policy if exists rd_posts_read on public.roardino_posts;
create policy rd_posts_read on public.roardino_posts for select using (
  roardino_can_see((person_id)::text)
  and (owner = auth.uid() or coalesce(kind, 'work') <> 'photo' or not roardino_personal_hidden(person_id))
);

-- ---------------------------------------------------------------------------------------------------------------------
-- Saved can be shown on the profile (Alex, 5 Nov, privacy in Edit profile): when a grown-up profile of the account has
-- data.saved_public = true, anyone who may see posts may read which posts that account saved. Safe to run again.
create or replace function public.roardino_saved_public(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from roardino_people where owner = uid and coalesce(minor, false) = false
                 and coalesce((data->>'saved_public')::boolean, false))
$$;
grant execute on function public.roardino_saved_public(uuid) to anon, authenticated;
drop policy if exists rd_saves_public on public.roardino_saves;
create policy rd_saves_public on public.roardino_saves for select using (roardino_saved_public(user_id));

-- ---------------------------------------------------------------------------------------------------------------------
-- The profile's numbers as Instagram's (Alex, 6 Nov): posts, followers, following. Safe to run again.
create or replace function public.roardino_person_stats(p uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when roardino_can_see(p::text) then jsonb_build_object(
    'followers', (select count(*) from roardino_follows where person_id = p),
    'following', (select count(*) from roardino_follows where user_id = (select owner from roardino_people where id = p)),
    'posts', (select count(*) from roardino_posts where person_id = p),
    'bravos', (select count(*) from roardino_bravos b join roardino_posts x on x.id = b.post_id where x.person_id = p)) end
$$;

-- Video views (Alex, 8 Nov: "every time someone passes and sees it, count a view"): a number on the post, raised by
-- roardino_add_view each time a video comes into sight; anyone signed in may raise it, only by one
alter table public.roardino_posts add column if not exists views bigint not null default 0;
create or replace function public.roardino_add_view(p uuid) returns void
language sql security definer set search_path = public as $$
  update public.roardino_posts set views = views + 1 where id = p;
$$;
revoke all on function public.roardino_add_view(uuid) from public;
grant execute on function public.roardino_add_view(uuid) to authenticated, anon;

-- Messages from the company site's contact form (Alex, 9 Nov: "send them to me inside Roardino, an admin page"): the
-- form on themadlions.com writes here too (anyone may send one, checked); only RoarMe administrators read, mark and
-- delete them, on Roardino's Site messages page
create table if not exists public.roardino_site_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text, email text not null, company text, kind text, budget text, needed_by text, message text, lang text,
  seen boolean not null default false
);
alter table public.roardino_site_messages enable row level security;
drop policy if exists rd_site_msg_send on public.roardino_site_messages;
create policy rd_site_msg_send on public.roardino_site_messages for insert to anon, authenticated with check (
  seen = false and email ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' and char_length(email) <= 200
  and char_length(coalesce(name, '')) <= 200 and char_length(coalesce(company, '')) <= 200
  and char_length(coalesce(kind, '')) <= 100 and char_length(coalesce(budget, '')) <= 100
  and char_length(coalesce(needed_by, '')) <= 100 and char_length(coalesce(message, '')) <= 4000
  and char_length(coalesce(lang, '')) <= 10);
drop policy if exists rd_site_msg_read on public.roardino_site_messages;
create policy rd_site_msg_read on public.roardino_site_messages for select to authenticated using (public.roar_is_admin());
drop policy if exists rd_site_msg_mark on public.roardino_site_messages;
create policy rd_site_msg_mark on public.roardino_site_messages for update to authenticated using (public.roar_is_admin()) with check (public.roar_is_admin());
drop policy if exists rd_site_msg_del on public.roardino_site_messages;
create policy rd_site_msg_del on public.roardino_site_messages for delete to authenticated using (public.roar_is_admin());
grant insert on public.roardino_site_messages to anon, authenticated;
grant select, update, delete on public.roardino_site_messages to authenticated;
