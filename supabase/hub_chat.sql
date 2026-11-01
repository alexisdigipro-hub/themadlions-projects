-- =====================================================================================================================
-- THEMADLIONS Hub · its own chat, an exact copy of RoarMe's chat (Alex, 1 Nov 2026).
--
-- The hub gets its own internal chat, living in the hub's own Supabase project (naibamqexcqnqhbbqafa). It is a
-- functional copy of the RoarMe chat app (repository alexisdigipro-hub/roarme): the same roar_* tables, functions,
-- triggers, policies, grants, realtime entries and storage buckets (roar-files, roar-avatars, roar-walls), with the
-- same names and the same behaviour, so RoarMe's front-end chat code (src/*.jsx) can run unchanged against the hub.
-- RoarMe itself stays a separate app with its own database (bzmjhbnwhdwmncxkqkdl); nothing here talks to it.
--
-- What is different from RoarMe: the hub is the only source of people.
--   * Every active hub member (members, active, "Access until" not passed) gets a roar_profiles row by itself
--     (trigger on members + a backfill at the end of this file). @username from the email (or the name), display
--     name = members.name, picture = the hub profile photo; name and photo follow the member when they change.
--     Nobody else can have a chat profile, open a chat, be added to a group or be called.
--   * One team group "THEMADLIONS" (roar_rooms.hub_project = 'team', what RoarMe's front end already looks for) with
--     every active member, and one group per project (roar_rooms.hub_project = the project id, titled with the
--     project's title) with the active members who can see the project (administrator, access "all" or the project in
--     project_access; and, as the hub's own chat rule in roarme_sync.sql, data.chatMembers / data.chatExcluded).
--     Kept in step by triggers on members and projects; a deleted project's group is closed (everyone out, the chat
--     kept, as RoarMe's roar_hub_close_project); a Delivered project's group moves to everyone's Archived folder.
--     These groups are locked as in RoarMe's hub-bridge.sql / hub-owner.sql: no admins, nobody adds, removes, leaves,
--     sets auto-delete, deletes the group or turns on Encrypted Chat; only a hub administrator renames them or changes
--     their photo; only the sync functions here change who is in.
--   * "Two-step / blocked" rule (roar_aal_ok, on every table): the second step when an authenticator is set up, as in
--     RoarMe, and being an active hub member (instead of RoarMe's roar_suspended list).
--   * roar_is_admin() (RoarMe's site admins in roar_admins) means a hub administrator here.
--   * roar_delete_me refuses: the account is the hub's; an administrator takes a person off the team.
--   * Push (roar_push_hook, roar_fire_reminders) knocks on this project's Edge Function roar-push; the Edge Functions
--     themselves (roar-push, roar-livekit, roar-cleanup) are not part of this file. Until roar-push has made its keys
--     (roar_push_conf) the hook does nothing.
--   * Deleted messages leave the database by a pg_cron job calling roar_cleanup_rows() directly; orphaned files in
--     storage (roar_orphan_files) still need an Edge Function like RoarMe's roar-cleanup to remove them.
--
-- Deliberately left out (front-end feature they belong to; the front end either does not reach them in the chat or
-- already treats the error as "nothing"):
--   * roar_transfer_* tables/RPCs and bucket roar-transfers: RoarTransfer (files over 50 MB in Chat.jsx upload go to
--     TRANSFER_BUCKET; in the hub that upload fails until the hub port caps files at 50 MB or adds a big-file path);
--     roar_my_transfers, roar_transfer_stop, roar_admin_transfers, roar_admin_transfer_stats (transfer.jsx, admin.jsx).
--   * roar_official, roar_official_id/inbox/messages/send, roar_welcome: the official RoarMe account and RoarMe Inbox
--     (Chat.jsx reads roar_official for the official mark: an error there simply means no official account).
--   * roar_admins, roar_suspended, roar_admin_users, roar_admin_files, roar_admin_block, roar_admin_blocked,
--     roar_admin_delete, roar_file_size: RoarMe's own Admin page (admin.jsx). roar_is_admin() is true for hub admins,
--     so the hub port should hide the Admin page except Wallpapers (roar_wallpapers is here and works).
--   * roar_email_prefs and the roar-email job: email reminders (SettingsPages.jsx shows the switch as unavailable).
--   * roar_tasks: RoarMe's Tasks panel (tasks.jsx, taskCore.js); the hub has its own tasks.
--   * roar_hub_links, roar_hub_link_code, roar-hub-work and every hub-link / hub-bridge / hub-signin / hub-owner piece
--     of RoarMe (hubLink.jsx, Linked apps): the hub is the account here. roar_hub_rename (Profile.jsx, renaming a
--     project chat) IS here, rewritten for hub administrators.
--   * site stats, RoarMail transfers, roardino_* tables.
--
-- Safe to run again (create ... if not exists, create or replace, drop policy if exists, guarded publication and
-- cron changes). Run in the hub's Supabase SQL Editor after schema.sql, profiles.sql and access_until.sql.
-- =====================================================================================================================

create extension if not exists pgcrypto with schema extensions;

-- functions whose result shape may differ from an older copy (the hub held RoarMe's roar_* until 20 Oct): dropped and
-- made again below, so "create or replace" never stops on a changed return type
drop function if exists public.roar_my_rooms();
drop function if exists public.roar_push_targets(uuid);
drop function if exists public.roar_my_mentions();
drop function if exists public.roar_my_sessions();
drop function if exists public.roar_orphan_files();
drop function if exists public.roar_mentioned(uuid, text, uuid, boolean);
drop view if exists public.roar_people;

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Who is on the hub's team (the same rule as access_until.sql member_live: active, and an administrator or
--    "Access until" not passed)
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.roar_hub_ok(is_active boolean, member_role text, perms jsonb) returns boolean
language sql stable set search_path = public as $$
  select coalesce(is_active, false) and (member_role = 'admin'
    or coalesce(perms ->> 'accessUntil', '') = ''
    or (perms ->> 'accessUntil') >= to_char(current_date, 'YYYY-MM-DD'))
$$;

create or replace function public.roar_hub_member(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select u is not null and exists (select 1 from members m where m.user_id = u and public.roar_hub_ok(m.active, m.role, m.permissions))
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. Tables (RoarMe's final shape)
-- ---------------------------------------------------------------------------------------------------------------------
-- profiles: one per person, found by @username
create table if not exists public.roar_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null default '',
  bio text not null default '',
  avatar_url text not null default '',
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint roar_username_ok check (username ~ '^[a-z0-9_]{3,24}$')
);
create unique index if not exists roar_profiles_username on public.roar_profiles (username);
alter table public.roar_profiles add column if not exists privacy jsonb not null default '{}'::jsonb;
alter table public.roar_profiles add column if not exists name_color text not null default '';
alter table public.roar_profiles add column if not exists active_until timestamptz;
alter table public.roar_profiles drop constraint if exists roar_profile_sizes;
alter table public.roar_profiles add constraint roar_profile_sizes check (length(coalesce(display_name, '')) <= 64 and length(coalesce(bio, '')) <= 300
  and length(coalesce(name_color, '')) <= 16 and length(coalesce(privacy::text, '')) <= 2000);
-- pictures only from the hub's own storage (an outside address would reveal viewers' IP addresses), or the hub profile
-- photo itself, which the hub keeps as a small data: picture
alter table public.roar_profiles drop constraint if exists roar_avatar_own;
alter table public.roar_profiles add constraint roar_avatar_own check (coalesce(avatar_url, '') = ''
  or avatar_url like 'https://naibamqexcqnqhbbqafa.supabase.co/storage/v1/object/public/roar-avatars/%'
  or (avatar_url ~ '^data:image/(jpeg|png|webp|gif);base64,' and length(avatar_url) <= 200000));

-- rooms: a direct chat between two people, or a group
create table if not exists public.roar_rooms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct', 'group')),
  title text not null default '',
  avatar_url text not null default '',
  direct_key text unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
alter table public.roar_rooms add column if not exists auto_delete_hours int check (auto_delete_hours is null or auto_delete_hours between 1 and 8760);
-- the hub's own groups: 'team' for THEMADLIONS, else the project id
alter table public.roar_rooms add column if not exists hub_project text;
alter table public.roar_rooms add column if not exists hub_closed_at timestamptz;
alter table public.roar_rooms add column if not exists hub_title_custom boolean not null default false;
create unique index if not exists roar_rooms_hub_project on public.roar_rooms (hub_project) where hub_project is not null;
alter table public.roar_rooms drop constraint if exists roar_room_sizes;
alter table public.roar_rooms add constraint roar_room_sizes check (length(coalesce(title, '')) <= 80);
alter table public.roar_rooms drop constraint if exists roar_room_avatar_own;
alter table public.roar_rooms add constraint roar_room_avatar_own check (coalesce(avatar_url, '') = ''
  or avatar_url like 'https://naibamqexcqnqhbbqafa.supabase.co/storage/v1/object/public/roar-avatars/%');

create table if not exists public.roar_members (
  room_id uuid not null references public.roar_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  muted boolean not null default false,
  archived boolean not null default false,
  primary key (room_id, user_id)
);
create index if not exists roar_members_user on public.roar_members (user_id);
alter table public.roar_members add column if not exists cleared_at timestamptz;

create table if not exists public.roar_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.roar_rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  body text not null default '',
  kind text not null default 'text' check (kind in ('text', 'image', 'file', 'voice', 'system')),
  file jsonb,
  reply_to uuid references public.roar_messages(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists roar_messages_room on public.roar_messages (room_id, created_at desc);
create index if not exists roar_messages_reply_to on public.roar_messages (reply_to) where reply_to is not null;
create index if not exists roar_messages_user on public.roar_messages (user_id);
alter table public.roar_messages drop constraint if exists roar_body_size;
alter table public.roar_messages add constraint roar_body_size check (length(coalesce(body, '')) <= 20000);

-- the one pinned message a chat had before roar_pins (kept: the front end still reads the column)
alter table public.roar_rooms add column if not exists pinned_message_id uuid references public.roar_messages(id) on delete set null;
create index if not exists roar_rooms_pinned_message on public.roar_rooms (pinned_message_id) where pinned_message_id is not null;

-- reactions, one per person per message
create table if not exists public.roar_reactions (
  message_id uuid not null references public.roar_messages(id) on delete cascade,
  room_id uuid not null references public.roar_rooms(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index if not exists roar_reactions_room on public.roar_reactions (room_id);
alter table public.roar_reactions replica identity full;

-- pinned messages, as many as one likes
create table if not exists public.roar_pins (
  message_id uuid primary key references public.roar_messages(id) on delete cascade,
  room_id uuid not null references public.roar_rooms(id) on delete cascade,
  pinned_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pinned_at timestamptz not null default now()
);
create index if not exists roar_pins_room on public.roar_pins (room_id, pinned_at);

-- blocking: they cannot message or call you, or add you to groups
create table if not exists public.roar_blocks (
  blocker uuid not null default auth.uid() references auth.users(id) on delete cascade,
  blocked uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index if not exists roar_blocks_blocked on public.roar_blocks (blocked);

-- Edit Contact: my own name, photo and note for someone, only I see them
create table if not exists public.roar_contacts (
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  person uuid not null references auth.users(id) on delete cascade,
  photo_url text not null default '',
  nickname text not null default '',
  updated_at timestamptz not null default now(),
  primary key (owner, person)
);
alter table public.roar_contacts add column if not exists note text not null default '';
alter table public.roar_contacts drop constraint if exists roar_contact_sizes;
alter table public.roar_contacts add constraint roar_contact_sizes check (length(nickname) <= 64 and length(note) <= 2000
  and (photo_url = '' or photo_url like 'https://naibamqexcqnqhbbqafa.supabase.co/storage/v1/object/public/roar-avatars/%'));

-- calls: the call log for Recent Calls (the sound and picture go peer to peer or through LiveKit)
create table if not exists public.roar_calls (
  id uuid primary key default gen_random_uuid(),
  caller uuid not null default auth.uid() references auth.users(id) on delete cascade,
  callee uuid not null references auth.users(id) on delete cascade,
  room_id uuid references public.roar_rooms(id) on delete set null,
  video boolean not null default false,
  status text not null default 'ringing' check (status in ('ringing', 'answered', 'missed', 'declined', 'cancelled', 'busy')),
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz
);
create index if not exists roar_calls_caller on public.roar_calls (caller, started_at desc);
create index if not exists roar_calls_callee on public.roar_calls (callee, started_at desc);

create table if not exists public.roar_call_hides (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  call_id uuid not null references public.roar_calls (id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, call_id)
);

-- Delete for Me
create table if not exists public.roar_msg_hides (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  message_id uuid not null references public.roar_messages(id) on delete cascade,
  room_id uuid not null references public.roar_rooms(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, message_id)
);
create index if not exists roar_msg_hides_room on public.roar_msg_hides (user_id, room_id);
create index if not exists roar_msg_hides_message on public.roar_msg_hides (message_id);

-- Ask to Delete for Everyone
create table if not exists public.roar_delete_asks (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.roar_messages(id) on delete cascade,
  room_id uuid not null references public.roar_rooms(id) on delete cascade,
  asked_by uuid not null references auth.users(id) on delete cascade,
  owner uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create unique index if not exists roar_delete_asks_one on public.roar_delete_asks (message_id, asked_by) where status = 'pending';
create index if not exists roar_delete_asks_room on public.roar_delete_asks (room_id, status);

-- Encrypted Chat: devices and their public keys, each stretch and its key sealed for each device
create table if not exists public.roar_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  public_key text not null check (length(public_key) < 400),
  label text not null default '' check (length(label) <= 60),
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index if not exists roar_devices_user on public.roar_devices (user_id);

create table if not exists public.roar_e2e_sessions (
  id uuid primary key,
  room_id uuid not null references public.roar_rooms(id) on delete cascade,
  started_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_by uuid references auth.users(id) on delete set null,
  ended_at timestamptz
);
create unique index if not exists roar_e2e_one_on on public.roar_e2e_sessions (room_id) where ended_at is null;

create table if not exists public.roar_e2e_keys (
  session_id uuid not null references public.roar_e2e_sessions(id) on delete cascade,
  device_id uuid not null references public.roar_devices(id) on delete cascade,
  sealed text not null check (length(sealed) < 1000),
  primary key (session_id, device_id)
);

-- roles for @mentions (@montage, @μοντάζ)
create table if not exists public.roar_roles (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.roar_rooms(id) on delete cascade,
  name text not null check (name ~ '^[[:alnum:]_]{2,24}$' and name = lower(name) and name not in ('all', 'everyone', 'channel', 'here')),
  user_ids uuid[] not null default '{}' check (cardinality(user_ids) <= 500),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (room_id, name)
);

-- Remind Me
create table if not exists public.roar_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  room_id uuid not null references public.roar_rooms(id) on delete cascade,
  message_id uuid not null references public.roar_messages(id) on delete cascade,
  remind_at timestamptz not null,
  fired_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists roar_reminders_due on public.roar_reminders (remind_at) where fired_at is null;
create index if not exists roar_reminders_mine on public.roar_reminders (user_id, remind_at);
create index if not exists roar_reminders_message on public.roar_reminders (message_id);

-- scheduled messages
create table if not exists public.roar_scheduled (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.roar_rooms(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 8000),
  reply_to uuid references public.roar_messages(id) on delete set null,
  first_at timestamptz not null,
  send_at timestamptz not null,
  repeat text not null default 'never' check (repeat in ('never', 'day', 'week', '2weeks', 'month', '3months', '6months', 'year')),
  times int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists roar_scheduled_due on public.roar_scheduled (send_at);
create index if not exists roar_scheduled_mine on public.roar_scheduled (user_id, room_id);
create index if not exists roar_scheduled_reply_to on public.roar_scheduled (reply_to) where reply_to is not null;

-- Auto-Reply
create table if not exists public.roar_autoreply (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  body text not null default '' check (char_length(body) <= 2000),
  away_only boolean not null default false,
  until timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists public.roar_autoreply_sent (
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.roar_rooms(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (user_id, room_id)
);

-- chat folders kept with the account
create table if not exists public.roar_folder_sync (
  user_id uuid primary key default auth.uid(),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- notifications with the app closed (Web Push); roar_push_conf is written by the Edge Function roar-push only
create table if not exists public.roar_push_subs (
  endpoint text primary key check (endpoint like 'https://%' and char_length(endpoint) < 1000),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  p256dh text not null check (char_length(p256dh) < 200),
  auth text not null check (char_length(auth) < 100),
  preview boolean not null default true,
  ua text not null default '' check (char_length(ua) < 300),
  created_at timestamptz not null default now()
);
create index if not exists roar_push_subs_user on public.roar_push_subs (user_id);
create table if not exists public.roar_push_conf (
  id int primary key default 1 check (id = 1),
  public_key text not null,
  private_jwk jsonb not null,
  hook_token uuid not null default gen_random_uuid()
);

-- chat wallpapers (the built-in ones drawn by the app's CSS, and photos in the public bucket roar-walls)
create table if not exists public.roar_wallpapers (
  key text primary key,
  name text not null default 'Wallpaper',
  path text,
  position int not null default 0,
  hidden boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.roar_wallpapers (key, name, position) values
  ('soft', 'Plain', 0), ('dots', 'Pattern', 1), ('grid', 'Grid', 2), ('night', 'Night', 3),
  ('ocean', 'Ocean', 4), ('dusk', 'Dusk', 5), ('forest', 'Forest', 6), ('ember', 'Ember', 7)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. Helpers the policies use (security definer, so the policies do not loop)
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.roar_is_member(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from roar_members where room_id = r and user_id = auth.uid())
$$;

-- the second step when an authenticator is set up, and being an active member of the hub's team
create or replace function public.roar_aal_ok() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select (coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
    or not exists (select 1 from auth.mfa_factors where user_id = auth.uid() and status = 'verified'))
    and public.roar_hub_member(auth.uid())
$$;

create or replace function public.roar_is_admin(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.roar_aal_ok() and exists (select 1 from roar_members where room_id = r and user_id = auth.uid() and role = 'admin')
$$;

-- RoarMe's site admin is a hub administrator here
create or replace function public.roar_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.roar_aal_ok() and exists (select 1 from members m where m.user_id = auth.uid() and m.role = 'admin'
    and public.roar_hub_ok(m.active, m.role, m.permissions))
$$;

-- the app asks once on start, to show "blocked" instead of an empty chat: here, someone no longer on the team
create or replace function public.roar_am_blocked() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and not public.roar_hub_member(auth.uid())
$$;

-- who talks to whom and who blocked whom: only answerable about yourself
create or replace function public.roar_are_contacts(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and auth.uid() in (a, b)
    and exists (select 1 from roar_rooms r where r.kind = 'direct' and r.direct_key = least(a::text, b::text) || ':' || greatest(a::text, b::text))
$$;
create or replace function public.roar_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and auth.uid() in (a, b)
    and exists (select 1 from roar_blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a))
$$;
-- a one-to-one chat where either side blocked the other
create or replace function public.roar_blocked_in(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from roar_rooms x
    join roar_members m on m.room_id = x.id and m.user_id <> auth.uid()
    join roar_blocks b on (b.blocker = auth.uid() and b.blocked = m.user_id) or (b.blocker = m.user_id and b.blocked = auth.uid())
    where x.id = r and x.kind = 'direct')
$$;

-- someone one shares a chat with
create or replace function public.roar_shares_room(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from roar_members a join roar_members b on b.room_id = a.room_id where a.user_id = auth.uid() and b.user_id = u)
$$;

-- a privacy setting (everybody / contacts / nobody) of person u, as seen by me
create or replace function public.roar_privacy_lets(u uuid, setting text) returns boolean
language sql stable security definer set search_path = public as $$
  select u = auth.uid() or case coalesce(setting, 'everybody')
    when 'nobody' then false
    when 'contacts' then public.roar_are_contacts(auth.uid(), u)
    else true end
$$;

-- may I add this person to a group: a hub member, no block either way, their "Who Can Add Me to Groups"
create or replace function public.roar_may_add(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p is not null and auth.uid() is not null and p <> auth.uid() and public.roar_hub_member(p)
    and exists (select 1 from roar_profiles x where x.id = p and public.roar_privacy_lets(p, x.privacy->>'groups'))
    and not exists (select 1 from roar_blocks b where (b.blocker = auth.uid() and b.blocked = p) or (b.blocker = p and b.blocked = auth.uid()))
$$;

-- may I call this person: not myself, a hub member, no block either way, their "Who Can Call Me"
create or replace function public.roar_may_call(person uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select person is not null and auth.uid() is not null and person <> auth.uid() and public.roar_aal_ok() and public.roar_hub_member(person)
    and exists (select 1 from roar_profiles x where x.id = person and public.roar_privacy_lets(person, x.privacy->>'calls'))
    and not exists (select 1 from roar_blocks b where (b.blocker = auth.uid() and b.blocked = person) or (b.blocker = person and b.blocked = auth.uid()))
$$;

-- may I send to the Realtime inbox "call:<id>": may call them, or a call between the two in the last 4 hours
-- (so answers and hang-ups always get through)
create or replace function public.roar_may_signal(topic text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare t uuid;
begin
  if auth.uid() is null or topic is null or topic !~ '^call:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return false; end if;
  if not public.roar_aal_ok() then return false; end if;
  t := substr(topic, 6)::uuid;
  return public.roar_may_call(t) or exists (select 1 from roar_calls c
    where ((c.caller = auth.uid() and c.callee = t) or (c.callee = auth.uid() and c.caller = t)) and c.started_at > now() - interval '4 hours');
end $$;

-- the room is a chat file's first folder
create or replace function public.roar_file_ok(objname text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare f text := split_part(objname, '/', 1);
begin
  if f !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  return roar_aal_ok() and roar_is_member(f::uuid);
end $$;

-- who may make and change the roles of a group (admins; in a hub group, anyone in it)
create or replace function public.roar_roles_editor(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from roar_rooms x where x.id = r and x.kind = 'group'
    and (roar_is_admin(r) or (x.hub_project is not null and roar_is_member(r))))
$$;
-- a role holds only people of its group
create or replace function public.roar_roles_members_ok(r uuid, ids uuid[]) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from unnest(ids) u where not exists (select 1 from roar_members m where m.room_id = r and m.user_id = u))
$$;

-- true only inside the hub's sync functions below (a setting local to that one transaction)
create or replace function public.roar_hub_syncing() returns boolean
language sql stable set search_path = public as $$ select coalesce(current_setting('roar.hub_sync', true), '') = 'on' $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. Row level security, policies and grants
-- ---------------------------------------------------------------------------------------------------------------------
alter table public.roar_profiles enable row level security;
alter table public.roar_rooms enable row level security;
alter table public.roar_members enable row level security;
alter table public.roar_messages enable row level security;
alter table public.roar_reactions enable row level security;
alter table public.roar_pins enable row level security;
alter table public.roar_blocks enable row level security;
alter table public.roar_contacts enable row level security;
alter table public.roar_calls enable row level security;
alter table public.roar_call_hides enable row level security;
alter table public.roar_msg_hides enable row level security;
alter table public.roar_delete_asks enable row level security;
alter table public.roar_devices enable row level security;
alter table public.roar_e2e_sessions enable row level security;
alter table public.roar_e2e_keys enable row level security;
alter table public.roar_roles enable row level security;
alter table public.roar_reminders enable row level security;
alter table public.roar_scheduled enable row level security;
alter table public.roar_autoreply enable row level security;
alter table public.roar_autoreply_sent enable row level security;
alter table public.roar_folder_sync enable row level security;
alter table public.roar_push_subs enable row level security;
alter table public.roar_push_conf enable row level security;
alter table public.roar_wallpapers enable row level security;

-- profiles: one's own row (everyone else's is read through roar_people, which minds their privacy settings);
-- only a hub member may have one (normally made by the hub's trigger below)
drop policy if exists roar_profiles_read on public.roar_profiles;
create policy roar_profiles_read on public.roar_profiles for select to authenticated using (id = auth.uid());
drop policy if exists roar_profiles_insert on public.roar_profiles;
create policy roar_profiles_insert on public.roar_profiles for insert to authenticated
  with check (id = auth.uid() and public.roar_hub_member(auth.uid()));
drop policy if exists roar_profiles_update on public.roar_profiles;
create policy roar_profiles_update on public.roar_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists roar_rooms_read on public.roar_rooms;
create policy roar_rooms_read on public.roar_rooms for select to authenticated using (public.roar_is_member(id));
drop policy if exists roar_rooms_update on public.roar_rooms;
create policy roar_rooms_update on public.roar_rooms for update to authenticated using (kind = 'group' and public.roar_is_admin(id));

drop policy if exists roar_members_read on public.roar_members;
create policy roar_members_read on public.roar_members for select to authenticated using (public.roar_is_member(room_id));
drop policy if exists roar_members_update on public.roar_members;
create policy roar_members_update on public.roar_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists roar_messages_read on public.roar_messages;
create policy roar_messages_read on public.roar_messages for select to authenticated using (public.roar_is_member(room_id));
drop policy if exists roar_messages_insert on public.roar_messages;
create policy roar_messages_insert on public.roar_messages for insert to authenticated
  with check (user_id = auth.uid() and kind <> 'system' and public.roar_is_member(room_id) and not public.roar_blocked_in(room_id));
drop policy if exists roar_messages_update on public.roar_messages;
create policy roar_messages_update on public.roar_messages for update to authenticated
  using (user_id = (select auth.uid()) and kind <> 'system') with check (user_id = (select auth.uid()) and kind <> 'system');

drop policy if exists roar_reactions_read on public.roar_reactions;
create policy roar_reactions_read on public.roar_reactions for select to authenticated using (public.roar_is_member(room_id));
drop policy if exists roar_reactions_add on public.roar_reactions;
create policy roar_reactions_add on public.roar_reactions for insert to authenticated
  with check (user_id = auth.uid() and public.roar_is_member(room_id) and exists (select 1 from public.roar_messages m where m.id = message_id and m.room_id = roar_reactions.room_id));
drop policy if exists roar_reactions_change on public.roar_reactions;
create policy roar_reactions_change on public.roar_reactions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.roar_is_member(room_id)
    and exists (select 1 from public.roar_messages m where m.id = roar_reactions.message_id and m.room_id = roar_reactions.room_id));
drop policy if exists roar_reactions_remove on public.roar_reactions;
create policy roar_reactions_remove on public.roar_reactions for delete to authenticated using (user_id = auth.uid());

drop policy if exists roar_pins_read on public.roar_pins;
create policy roar_pins_read on public.roar_pins for select to authenticated using (public.roar_is_member(room_id));
drop policy if exists roar_pins_add on public.roar_pins;
create policy roar_pins_add on public.roar_pins for insert to authenticated
  with check (pinned_by = auth.uid() and public.roar_is_member(room_id) and exists (select 1 from public.roar_messages m where m.id = message_id and m.room_id = roar_pins.room_id));
drop policy if exists roar_pins_remove on public.roar_pins;
create policy roar_pins_remove on public.roar_pins for delete to authenticated using (public.roar_is_member(room_id));

drop policy if exists roar_blocks_read on public.roar_blocks;
create policy roar_blocks_read on public.roar_blocks for select to authenticated using (blocker = auth.uid());
drop policy if exists roar_blocks_add on public.roar_blocks;
create policy roar_blocks_add on public.roar_blocks for insert to authenticated with check (blocker = auth.uid() and blocked <> auth.uid());
drop policy if exists roar_blocks_remove on public.roar_blocks;
create policy roar_blocks_remove on public.roar_blocks for delete to authenticated using (blocker = auth.uid());

drop policy if exists roar_contacts_own on public.roar_contacts;
create policy roar_contacts_own on public.roar_contacts for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists roar_calls_read on public.roar_calls;
create policy roar_calls_read on public.roar_calls for select to authenticated using (auth.uid() in (caller, callee));
drop policy if exists roar_calls_start on public.roar_calls;
create policy roar_calls_start on public.roar_calls for insert to authenticated
  with check (caller = auth.uid() and public.roar_may_call(callee) and (room_id is null or public.roar_is_member(room_id)));
drop policy if exists roar_calls_change on public.roar_calls;
create policy roar_calls_change on public.roar_calls for update to authenticated
  using (auth.uid() in (caller, callee)) with check (auth.uid() in (caller, callee));

drop policy if exists roar_call_hides_select on public.roar_call_hides;
create policy roar_call_hides_select on public.roar_call_hides for select to authenticated using (user_id = auth.uid());
drop policy if exists roar_call_hides_insert on public.roar_call_hides;
create policy roar_call_hides_insert on public.roar_call_hides for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.roar_calls c where c.id = call_id and (c.caller = auth.uid() or c.callee = auth.uid())));
drop policy if exists roar_call_hides_delete on public.roar_call_hides;
create policy roar_call_hides_delete on public.roar_call_hides for delete to authenticated using (user_id = auth.uid());

drop policy if exists roar_msg_hides_mine on public.roar_msg_hides;
create policy roar_msg_hides_mine on public.roar_msg_hides for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.roar_is_member(room_id)
    and exists (select 1 from public.roar_messages m where m.id = message_id and m.room_id = roar_msg_hides.room_id));

drop policy if exists roar_delete_asks_read on public.roar_delete_asks;
create policy roar_delete_asks_read on public.roar_delete_asks for select to authenticated using (asked_by = auth.uid() or owner = auth.uid());

drop policy if exists roar_devices_read on public.roar_devices;
create policy roar_devices_read on public.roar_devices for select to authenticated using (user_id = auth.uid() or public.roar_shares_room(user_id));
drop policy if exists roar_devices_insert on public.roar_devices;
create policy roar_devices_insert on public.roar_devices for insert to authenticated with check (user_id = auth.uid());
drop policy if exists roar_devices_update on public.roar_devices;
create policy roar_devices_update on public.roar_devices for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists roar_devices_delete on public.roar_devices;
create policy roar_devices_delete on public.roar_devices for delete to authenticated using (user_id = auth.uid());

drop policy if exists roar_e2e_sessions_read on public.roar_e2e_sessions;
create policy roar_e2e_sessions_read on public.roar_e2e_sessions for select to authenticated using (public.roar_is_member(room_id));
drop policy if exists roar_e2e_keys_read on public.roar_e2e_keys;
create policy roar_e2e_keys_read on public.roar_e2e_keys for select to authenticated
  using (exists (select 1 from public.roar_devices d where d.id = device_id and d.user_id = auth.uid()));

drop policy if exists roar_roles_read on public.roar_roles;
create policy roar_roles_read on public.roar_roles for select to authenticated using (public.roar_is_member(room_id));
drop policy if exists roar_roles_add on public.roar_roles;
create policy roar_roles_add on public.roar_roles for insert to authenticated
  with check (public.roar_roles_editor(room_id) and public.roar_roles_members_ok(room_id, user_ids)
    and (select count(*) from public.roar_roles g where g.room_id = roar_roles.room_id) < 50);
drop policy if exists roar_roles_change on public.roar_roles;
create policy roar_roles_change on public.roar_roles for update to authenticated
  using (public.roar_roles_editor(room_id)) with check (public.roar_roles_editor(room_id) and public.roar_roles_members_ok(room_id, user_ids));
drop policy if exists roar_roles_remove on public.roar_roles;
create policy roar_roles_remove on public.roar_roles for delete to authenticated using (public.roar_roles_editor(room_id));

drop policy if exists roar_reminders_read on public.roar_reminders;
create policy roar_reminders_read on public.roar_reminders for select to authenticated using (user_id = auth.uid());
drop policy if exists roar_reminders_add on public.roar_reminders;
create policy roar_reminders_add on public.roar_reminders for insert to authenticated
  with check (user_id = auth.uid() and public.roar_is_member(room_id)
    and exists (select 1 from public.roar_messages m where m.id = message_id and m.room_id = roar_reminders.room_id)
    and remind_at < now() + interval '366 days'
    and (select count(*) from public.roar_reminders r where r.user_id = auth.uid()) < 300);
drop policy if exists roar_reminders_change on public.roar_reminders;
create policy roar_reminders_change on public.roar_reminders for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and remind_at < now() + interval '366 days');
drop policy if exists roar_reminders_remove on public.roar_reminders;
create policy roar_reminders_remove on public.roar_reminders for delete to authenticated using (user_id = auth.uid());

drop policy if exists roar_scheduled_read on public.roar_scheduled;
create policy roar_scheduled_read on public.roar_scheduled for select to authenticated using (user_id = auth.uid());
drop policy if exists roar_scheduled_add on public.roar_scheduled;
create policy roar_scheduled_add on public.roar_scheduled for insert to authenticated
  with check (user_id = auth.uid() and public.roar_is_member(room_id) and not public.roar_blocked_in(room_id)
    and (select count(*) from public.roar_scheduled s where s.user_id = auth.uid()) < 300);
drop policy if exists roar_scheduled_change on public.roar_scheduled;
create policy roar_scheduled_change on public.roar_scheduled for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.roar_is_member(room_id));
drop policy if exists roar_scheduled_remove on public.roar_scheduled;
create policy roar_scheduled_remove on public.roar_scheduled for delete to authenticated using (user_id = auth.uid());

drop policy if exists roar_autoreply_mine on public.roar_autoreply;
create policy roar_autoreply_mine on public.roar_autoreply for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists roar_folder_sync_own on public.roar_folder_sync;
create policy roar_folder_sync_own on public.roar_folder_sync for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists roar_push_subs_mine on public.roar_push_subs;
create policy roar_push_subs_mine on public.roar_push_subs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists roar_wallpapers_read on public.roar_wallpapers;
create policy roar_wallpapers_read on public.roar_wallpapers for select using (true);
drop policy if exists roar_wallpapers_admin on public.roar_wallpapers;
create policy roar_wallpapers_admin on public.roar_wallpapers for all to authenticated using (public.roar_is_admin()) with check (public.roar_is_admin());

-- the rule every table checks: the second step when set up, and an active hub member
do $$
declare t text;
begin
  foreach t in array array['roar_profiles', 'roar_rooms', 'roar_members', 'roar_messages', 'roar_reactions', 'roar_pins',
    'roar_blocks', 'roar_contacts', 'roar_calls', 'roar_call_hides', 'roar_msg_hides', 'roar_delete_asks', 'roar_devices',
    'roar_e2e_sessions', 'roar_e2e_keys', 'roar_roles', 'roar_reminders', 'roar_scheduled', 'roar_autoreply',
    'roar_folder_sync', 'roar_push_subs'] loop
    execute format('drop policy if exists roar_mfa on public.%I', t);
    execute format('create policy roar_mfa on public.%I as restrictive for all to authenticated using (public.roar_aal_ok()) with check (public.roar_aal_ok())', t);
  end loop;
end $$;

-- grants: only what the app does; rooms, members and the rest are changed through the functions below
revoke all on public.roar_profiles, public.roar_rooms, public.roar_members, public.roar_messages, public.roar_reactions,
  public.roar_pins, public.roar_blocks, public.roar_contacts, public.roar_calls, public.roar_call_hides, public.roar_msg_hides,
  public.roar_delete_asks, public.roar_devices, public.roar_e2e_sessions, public.roar_e2e_keys, public.roar_roles,
  public.roar_reminders, public.roar_scheduled, public.roar_autoreply, public.roar_autoreply_sent, public.roar_folder_sync,
  public.roar_push_subs, public.roar_push_conf, public.roar_wallpapers from anon, authenticated;

grant select on public.roar_profiles to authenticated;
grant insert (id, username, display_name) on public.roar_profiles to authenticated;
grant update (username, display_name, bio, avatar_url, last_seen, active_until, privacy, name_color) on public.roar_profiles to authenticated;
grant select on public.roar_rooms to authenticated;
grant update (title, avatar_url) on public.roar_rooms to authenticated;
grant select on public.roar_members to authenticated;
grant update (last_read_at, muted, archived, cleared_at) on public.roar_members to authenticated;
grant select, insert on public.roar_messages to authenticated;
grant update (body, edited_at, deleted_at) on public.roar_messages to authenticated;
grant select, insert, update, delete on public.roar_reactions to authenticated;
grant select, insert, delete on public.roar_pins to authenticated;
grant select, insert, delete on public.roar_blocks to authenticated;
grant select, insert, update, delete on public.roar_contacts to authenticated;
grant select on public.roar_calls to authenticated;
grant insert (caller, callee, room_id, video) on public.roar_calls to authenticated;
grant update (status, answered_at, ended_at) on public.roar_calls to authenticated;
grant select, insert, delete on public.roar_call_hides to authenticated;
grant select, insert, update, delete on public.roar_msg_hides to authenticated; -- update too: the app saves with an upsert
grant select on public.roar_delete_asks to authenticated;
grant select, insert, delete on public.roar_devices to authenticated;
grant update (last_seen, label) on public.roar_devices to authenticated;
grant select on public.roar_e2e_sessions, public.roar_e2e_keys to authenticated;
grant select, insert, delete on public.roar_roles to authenticated;
grant update (name, user_ids) on public.roar_roles to authenticated;
grant select, insert, delete on public.roar_reminders to authenticated;
grant update (remind_at, fired_at) on public.roar_reminders to authenticated;
grant select, insert, delete on public.roar_scheduled to authenticated;
grant update (body, first_at, send_at, repeat, times) on public.roar_scheduled to authenticated;
grant select, insert, update, delete on public.roar_autoreply to authenticated;
grant select, insert, update on public.roar_folder_sync to authenticated;
grant select, insert, update, delete on public.roar_push_subs to authenticated;
grant select on public.roar_wallpapers to anon, authenticated;
grant insert, update, delete on public.roar_wallpapers to authenticated;

-- the profile view everyone reads: the photo and last seen follow each person's privacy settings, the settings
-- themselves only for oneself. Reading only.
create view public.roar_people as
  select p.id, p.username, p.display_name, p.bio,
    case when public.roar_privacy_lets(p.id, p.privacy->>'photo') then p.avatar_url else '' end as avatar_url,
    case when public.roar_privacy_lets(p.id, p.privacy->>'last_seen') then p.last_seen end as last_seen,
    p.name_color, p.created_at,
    case when p.id = auth.uid() then p.privacy end as privacy
  from public.roar_profiles p
  where public.roar_aal_ok();
revoke all on public.roar_people from anon, authenticated, public;
grant select on public.roar_people to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 5. Triggers on messages: server time, the room to the top, auto-reply, push
-- ---------------------------------------------------------------------------------------------------------------------
-- a message always gets the server's time; an auto-reply a moment later, so it sorts under what it answers
create or replace function public.roar_message_stamp() returns trigger
language plpgsql set search_path = public as $$
begin
  new.created_at := case when coalesce(new.file, '{}'::jsonb) ? 'auto' then clock_timestamp() else now() end;
  new.edited_at := null;
  new.deleted_at := null;
  return new;
end $$;
drop trigger if exists roar_message_stamp on public.roar_messages;
create trigger roar_message_stamp before insert on public.roar_messages for each row execute function public.roar_message_stamp();

-- a new message moves its room to the top; one that goes out by itself (scheduled, auto-reply) does not mark the chat read
create or replace function public.roar_touch_room() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update roar_rooms set last_message_at = new.created_at where id = new.room_id;
  if not (coalesce(new.file, '{}'::jsonb) ?| array['scheduled', 'auto']) then
    update roar_members set last_read_at = new.created_at where room_id = new.room_id and user_id = new.user_id;
  end if;
  return new;
end $$;
drop trigger if exists roar_messages_touch on public.roar_messages;
create trigger roar_messages_touch after insert on public.roar_messages for each row execute function public.roar_touch_room();

-- auto-reply in one-to-one chats, once per chat every 12 hours
create or replace function public.roar_autoreply_send() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  o uuid;
  a record;
begin
  if new.kind = 'system' or new.user_id is null or coalesce(new.file, '{}'::jsonb) ?| array['auto', 'scheduled'] then return new; end if;
  if not exists (select 1 from roar_rooms where id = new.room_id and kind = 'direct') then return new; end if;
  select m.user_id into o from roar_members m where m.room_id = new.room_id and m.user_id <> new.user_id limit 1;
  if o is null then return new; end if;
  select * into a from roar_autoreply where user_id = o and enabled and body <> '' and (until is null or until > now());
  if not found then return new; end if;
  if a.away_only and exists (select 1 from roar_profiles where id = o and (active_until > now() - interval '10 minutes')) then return new; end if;
  if exists (select 1 from roar_autoreply_sent where user_id = o and room_id = new.room_id and sent_at > now() - interval '12 hours') then return new; end if;
  if exists (select 1 from roar_blocks where (blocker = o and blocked = new.user_id) or (blocker = new.user_id and blocked = o)) then return new; end if;
  if exists (select 1 from roar_e2e_sessions where room_id = new.room_id and ended_at is null) then return new; end if;
  insert into roar_autoreply_sent (user_id, room_id, sent_at) values (o, new.room_id, now())
    on conflict (user_id, room_id) do update set sent_at = excluded.sent_at;
  insert into roar_messages (room_id, user_id, kind, body, file) values (new.room_id, o, 'text', a.body, '{"auto": true}'::jsonb);
  return new;
end $$;
drop trigger if exists roar_autoreply on public.roar_messages;
create trigger roar_autoreply after insert on public.roar_messages for each row execute function public.roar_autoreply_send();

-- every new message knocks on this project's Edge Function roar-push (it answers only to the token in roar_push_conf);
-- a failed knock never stops the message
create or replace function public.roar_push_hook() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare tok uuid;
begin
  if new.kind = 'system' or new.user_id is null then return new; end if;
  select hook_token into tok from roar_push_conf where id = 1;
  if tok is null then return new; end if;
  if not exists (select 1 from roar_members mem join roar_push_subs s on s.user_id = mem.user_id
      where mem.room_id = new.room_id and mem.user_id <> new.user_id) then return new; end if;
  begin
    perform net.http_post(
      url := 'https://naibamqexcqnqhbbqafa.supabase.co/functions/v1/roar-push',
      body := jsonb_build_object('id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-roar-hook', tok::text)
    );
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists roar_push on public.roar_messages;
create trigger roar_push after insert on public.roar_messages for each row execute function public.roar_push_hook();

-- ---------------------------------------------------------------------------------------------------------------------
-- 6. The hub's groups are locked (RoarMe's hub-bridge.sql and hub-owner.sql)
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.roar_hub_guard_members() returns trigger
language plpgsql security definer set search_path = public as $$
declare rid uuid := coalesce(new.room_id, old.room_id);
begin
  if public.roar_hub_syncing() or not exists (select 1 from roar_rooms where id = rid and hub_project is not null) then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' then raise exception 'This project chat is managed by THEMADLIONS Hub.'; end if;
  if tg_op = 'UPDATE' and new.role is distinct from old.role then raise exception 'This project chat is managed by THEMADLIONS Hub.'; end if;
  -- a person's own row may go only with their account; taking others out is the hub's job
  if tg_op = 'DELETE' and auth.uid() is not null and old.user_id <> auth.uid() then raise exception 'This project chat is managed by THEMADLIONS Hub.'; end if;
  return coalesce(new, old);
end $$;
drop trigger if exists roar_hub_guard_members on public.roar_members;
create trigger roar_hub_guard_members before insert or update or delete on public.roar_members
  for each row execute function public.roar_hub_guard_members();

create or replace function public.roar_hub_guard_rooms() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.roar_hub_syncing() then return coalesce(new, old); end if;
  if tg_op = 'UPDATE' then
    if new.hub_project is distinct from old.hub_project or new.hub_closed_at is distinct from old.hub_closed_at then
      raise exception 'not allowed';
    end if;
    if old.hub_project is not null then
      if new.auto_delete_hours is distinct from old.auto_delete_hours or new.kind is distinct from old.kind then
        raise exception 'This project chat is managed by THEMADLIONS Hub.';
      end if;
      -- the name and the photo: only a hub administrator
      if new.title is distinct from old.title or new.avatar_url is distinct from old.avatar_url
          or new.hub_title_custom is distinct from old.hub_title_custom then
        if not public.roar_is_admin() then raise exception 'This project chat is managed by THEMADLIONS Hub.'; end if;
        if new.title is distinct from old.title then new.hub_title_custom := true; end if;
      end if;
    elsif new.hub_title_custom is distinct from old.hub_title_custom then
      raise exception 'not allowed';
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.hub_project is not null or new.hub_closed_at is not null or new.hub_title_custom then raise exception 'not allowed'; end if;
    return new;
  end if;
  -- DELETE: a hub group goes only once nobody is left in it
  if old.hub_project is not null and exists (select 1 from roar_members where room_id = old.id) then
    raise exception 'This project chat is managed by THEMADLIONS Hub.';
  end if;
  return old;
end $$;
drop trigger if exists roar_hub_guard_rooms on public.roar_rooms;
create trigger roar_hub_guard_rooms before insert or update or delete on public.roar_rooms
  for each row execute function public.roar_hub_guard_rooms();

create or replace function public.roar_hub_guard_e2e() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from roar_rooms where id = new.room_id and hub_project is not null) then
    raise exception 'Encrypted Chat is not available in project chats yet.';
  end if;
  return new;
end $$;
drop trigger if exists roar_hub_guard_e2e on public.roar_e2e_sessions;
create trigger roar_hub_guard_e2e before insert on public.roar_e2e_sessions
  for each row execute function public.roar_hub_guard_e2e();

-- ---------------------------------------------------------------------------------------------------------------------
-- 7. The app's actions (RoarMe's latest definitions; people only from the hub's team)
-- ---------------------------------------------------------------------------------------------------------------------
-- open (or find) the direct chat with someone
create or replace function public.roar_open_direct(other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); k text; r uuid;
begin
  if me is null or other is null or other = me or not roar_aal_ok() then raise exception 'not allowed'; end if;
  if not roar_hub_member(other) or not exists (select 1 from roar_profiles where id = other) then raise exception 'no such person'; end if;
  k := least(me::text, other::text) || ':' || greatest(me::text, other::text);
  select id into r from roar_rooms where direct_key = k;
  if r is null then
    insert into roar_rooms (kind, direct_key, created_by) values ('direct', k, me) returning id into r;
    insert into roar_members (room_id, user_id, role) values (r, me, 'admin'), (r, other, 'admin') on conflict do nothing;
  end if;
  return r;
end $$;

-- a new group with the people picked (people who may not be added are left out)
create or replace function public.roar_create_group(group_title text, people uuid[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r uuid;
begin
  if me is null or not roar_aal_ok() then raise exception 'not allowed'; end if;
  if coalesce(trim(group_title), '') = '' then raise exception 'a group needs a name'; end if;
  insert into roar_rooms (kind, title, created_by) values ('group', left(trim(group_title), 80), me) returning id into r;
  insert into roar_members (room_id, user_id, role) values (r, me, 'admin');
  insert into roar_members (room_id, user_id)
    select r, p from unnest(coalesce(people, '{}')) p where p <> me and roar_may_add(p)
    on conflict do nothing;
  return r;
end $$;

-- an admin adds people to a group
create or replace function public.roar_add_members(r uuid, people uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from roar_rooms where id = r and kind = 'group') or not roar_is_admin(r) then raise exception 'not allowed'; end if;
  if exists (select 1 from unnest(coalesce(people, '{}')) p
      where not exists (select 1 from roar_members m where m.room_id = r and m.user_id = p) and not roar_may_add(p)) then
    raise exception 'They cannot be added to this group by you';
  end if;
  insert into roar_members (room_id, user_id)
    select r, p from unnest(coalesce(people, '{}')) p where roar_may_add(p)
    on conflict do nothing;
end $$;

-- leave a group (the last one out takes the group with them); a hub group is left only by leaving the project / team
create or replace function public.roar_leave(r uuid) returns void
language plpgsql security definer set search_path = public as $$
declare k text;
begin
  select hub_project into k from roar_rooms where id = r;
  if k = 'team' then
    raise exception 'This chat is the whole THEMADLIONS team, managed by THEMADLIONS Hub. You leave it when you leave the team.';
  elsif k is not null then
    raise exception 'This project chat is managed by THEMADLIONS Hub. You leave it when you leave the project.';
  end if;
  delete from roar_members where room_id = r and user_id = auth.uid()
    and exists (select 1 from roar_rooms where id = r and kind = 'group');
  if not exists (select 1 from roar_members where room_id = r) then delete from roar_rooms where id = r; end if;
end $$;

-- an admin deletes a whole group, with its messages
create or replace function public.roar_delete_group(r uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from roar_rooms where id = r and kind = 'group') or not roar_is_admin(r) then raise exception 'not allowed'; end if;
  delete from roar_rooms where id = r;
end $$;

-- an admin takes someone out of a group
create or replace function public.roar_remove_member(r uuid, person uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if person = auth.uid() or not exists (select 1 from roar_rooms where id = r and kind = 'group') or not roar_is_admin(r) then raise exception 'not allowed'; end if;
  delete from roar_members where room_id = r and user_id = person;
end $$;

-- group admins: make someone admin, take it back, step down (another admin stays)
create or replace function public.roar_set_admin(r uuid, person uuid, admin boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from roar_rooms where id = r and kind = 'group') or not roar_is_admin(r) then raise exception 'not allowed'; end if;
  if not exists (select 1 from roar_members where room_id = r and user_id = person) then raise exception 'Not in this group'; end if;
  if not admin and not exists (select 1 from roar_members where room_id = r and role = 'admin' and user_id <> person) then
    raise exception 'A group needs at least one admin';
  end if;
  update roar_members set role = case when admin then 'admin' else 'member' end where room_id = r and user_id = person;
end $$;

-- the group photo: anyone in an ordinary group; in a hub group only a hub administrator
create or replace function public.roar_set_group_photo(r uuid, url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from roar_rooms where id = r and kind = 'group') then raise exception 'not allowed'; end if;
  if exists (select 1 from roar_rooms where id = r and hub_project is not null) then
    if not public.roar_is_admin() then raise exception 'This project chat is managed by THEMADLIONS Hub.'; end if;
  elsif not (roar_aal_ok() and roar_is_member(r)) then
    raise exception 'not allowed';
  end if;
  update roar_rooms set avatar_url = coalesce(url, '') where id = r;
end $$;

-- the name of a hub group, for a hub administrator (an ordinary group is renamed by its own admins)
create or replace function public.roar_hub_rename(r uuid, t text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.roar_is_admin() then raise exception 'not allowed'; end if;
  if nullif(trim(coalesce(t, '')), '') is null then raise exception 'A name is needed'; end if;
  update roar_rooms set title = left(trim(t), 80) where id = r and hub_project is not null;
end $$;

-- messages here go by themselves after a while (a group's admins; either person in a one-to-one chat)
create or replace function public.roar_set_auto_delete(r uuid, hours int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (roar_aal_ok() and roar_is_member(r)) then raise exception 'not allowed'; end if;
  if exists (select 1 from roar_rooms where id = r and kind = 'group') and not roar_is_admin(r) then raise exception 'Only an admin can change this'; end if;
  if hours is not null and (hours < 1 or hours > 8760) then raise exception 'not allowed'; end if;
  update roar_rooms set auto_delete_hours = hours where id = r;
end $$;

-- the old single pin (the app now uses roar_pins)
create or replace function public.roar_pin(r uuid, msg uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (roar_aal_ok() and roar_is_member(r)) then raise exception 'not allowed'; end if;
  if msg is not null and not exists (select 1 from roar_messages where id = msg and room_id = r) then raise exception 'not in this chat'; end if;
  update roar_rooms set pinned_message_id = msg where id = r;
end $$;

-- the account belongs to the hub: it is not deleted from the chat
create or replace function public.roar_delete_me() returns void
language plpgsql security definer set search_path = public as $$
begin
  raise exception 'Your account is your THEMADLIONS Hub account. An administrator takes you off the team on the Team page.';
end $$;

-- one's own devices, and signing one out
create or replace function public.roar_my_sessions()
returns table (id uuid, user_agent text, ip text, created_at timestamptz, last_active timestamptz, current boolean)
language sql stable security definer set search_path = public, auth as $$
  select s.id, coalesce(s.user_agent, ''), coalesce(host(s.ip), ''), s.created_at,
    coalesce(s.refreshed_at at time zone 'utc', s.updated_at, s.created_at),
    s.id::text = coalesce(auth.jwt()->>'session_id', '')
  from auth.sessions s
  where s.user_id = auth.uid() and public.roar_aal_ok()
  order by 5 desc
$$;
create or replace function public.roar_end_session(sid uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.sessions where id = sid and user_id = auth.uid();
end $$;

-- the list of one's chats, with the last message and the unread count, in one call
create or replace function public.roar_my_rooms()
returns table (room_id uuid, kind text, title text, avatar_url text, last_message_at timestamptz, muted boolean, archived boolean,
  last_read_at timestamptz, role text, unread int, last_body text, last_kind text, last_user uuid, last_deleted boolean, members uuid[])
language sql stable security definer set search_path = public as $$
  select r.id, r.kind, r.title, r.avatar_url, r.last_message_at, m.muted, m.archived, m.last_read_at, m.role,
    (select count(*)::int from roar_messages x where x.room_id = r.id and x.created_at > m.last_read_at
       and x.user_id is distinct from auth.uid() and x.deleted_at is null),
    l.body, l.kind, l.user_id, l.deleted_at is not null,
    (select array_agg(mm.user_id) from roar_members mm where mm.room_id = r.id)
  from roar_members m
  join roar_rooms r on r.id = m.room_id
  left join lateral (select y.body, y.kind, y.user_id, y.deleted_at from roar_messages y where y.room_id = r.id order by y.created_at desc limit 1) l on true
  where m.user_id = auth.uid() and public.roar_aal_ok()
  order by r.last_message_at desc
$$;

-- Delete for Everyone, asked of the writer
create or replace function public.roar_ask_delete(msg uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare m record; ask uuid;
begin
  select id, room_id, user_id, kind, deleted_at into m from roar_messages where id = msg;
  if m.id is null or not roar_aal_ok() or not roar_is_member(m.room_id) then raise exception 'not allowed'; end if;
  if m.user_id is null or m.user_id = auth.uid() or m.kind = 'system' or m.deleted_at is not null then raise exception 'This message cannot be asked for'; end if;
  if not exists (select 1 from roar_members where room_id = m.room_id and user_id = m.user_id) then raise exception 'They are no longer in this chat'; end if;
  select id into ask from roar_delete_asks where message_id = msg and asked_by = auth.uid() and status = 'pending';
  if ask is not null then return ask; end if;
  insert into roar_delete_asks (message_id, room_id, asked_by, owner) values (msg, m.room_id, auth.uid(), m.user_id) returning id into ask;
  return ask;
end $$;

create or replace function public.roar_answer_delete(ask uuid, accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from roar_delete_asks where id = ask;
  if a.id is null or a.owner <> auth.uid() or not roar_aal_ok() then raise exception 'not allowed'; end if;
  if a.status <> 'pending' then return; end if;
  update roar_delete_asks set status = case when accept then 'accepted' else 'declined' end, answered_at = now() where id = ask;
  if accept then
    update roar_messages set deleted_at = now(), body = '' where id = a.message_id and user_id = auth.uid() and deleted_at is null;
    update roar_delete_asks set status = 'accepted', answered_at = now() where message_id = a.message_id and status = 'pending';
  end if;
end $$;

-- Encrypted Chat on and off, each with a line in the chat
create or replace function public.roar_e2e_start(r uuid, sid uuid, keys jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if not (roar_aal_ok() and roar_is_member(r)) then raise exception 'You are not in this chat'; end if;
  if exists (select 1 from roar_e2e_sessions where room_id = r and ended_at is null) then raise exception 'Encrypted Chat is already on'; end if;
  if jsonb_typeof(keys) <> 'array' or jsonb_array_length(keys) = 0 or jsonb_array_length(keys) > 500 then raise exception 'No keys to share'; end if;
  insert into roar_e2e_sessions (id, room_id, started_by) values (sid, r, auth.uid());
  insert into roar_e2e_keys (session_id, device_id, sealed)
    select sid, d.id, x->>'sealed'
    from jsonb_array_elements(keys) x
    join roar_devices d on d.id = (x->>'device')::uuid
    where exists (select 1 from roar_members m where m.room_id = r and m.user_id = d.user_id)
    on conflict do nothing;
  if not exists (select 1 from roar_e2e_keys k join roar_devices d on d.id = k.device_id where k.session_id = sid and d.user_id = auth.uid()) then
    raise exception 'This device has no key';
  end if;
  insert into roar_messages (room_id, user_id, kind, body) values (r, auth.uid(), 'system', 'e2e:on');
  return sid;
end $$;

create or replace function public.roar_e2e_end(r uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (roar_aal_ok() and roar_is_member(r)) then raise exception 'You are not in this chat'; end if;
  update roar_e2e_sessions set ended_at = now(), ended_by = auth.uid() where room_id = r and ended_at is null;
  if found then insert into roar_messages (room_id, user_id, kind, body) values (r, auth.uid(), 'system', 'e2e:off'); end if;
end $$;

-- the people a message mentions (@all, @here, @role, @username); locked text mentions no one
create or replace function public.roar_mentioned(room uuid, body text, author uuid, with_here boolean default true)
returns setof uuid
language sql stable security definer set search_path = public as $$
  with w as (
    select distinct lower(x[2]) as w
    from regexp_matches(coalesce(body, ''), '(^|[^[:alnum:]_@])@([[:alnum:]_]{2,24})', 'g') x
    where body not like 'e2e1.%'
  )
  select mem.user_id from roar_members mem
  where mem.room_id = room and mem.user_id is distinct from author and exists (select 1 from w) and (
    exists (select 1 from w where w.w in ('all', 'everyone', 'channel'))
    or (with_here and exists (select 1 from w where w.w = 'here')
        and exists (select 1 from roar_profiles p where p.id = mem.user_id and (p.last_seen > now() - interval '10 minutes' or p.active_until > now())))
    or exists (select 1 from w join roar_profiles p on p.username = w.w where p.id = mem.user_id)
    or exists (select 1 from w join roar_roles g on g.room_id = room and g.name = w.w where mem.user_id = any (g.user_ids))
  )
$$;

-- one's chats with unread messages that mention them, and how many
create or replace function public.roar_my_mentions()
returns table (room_id uuid, n int)
language sql stable security definer set search_path = public as $$
  select x.room_id, count(*)::int
  from roar_members m
  join roar_messages x on x.room_id = m.room_id and x.created_at > m.last_read_at
  where m.user_id = auth.uid() and public.roar_aal_ok() and x.user_id is distinct from auth.uid() and x.deleted_at is null and x.kind <> 'system'
    and x.body like '%@%' and auth.uid() in (select public.roar_mentioned(x.room_id, x.body, x.user_id, false))
  group by x.room_id
$$;

-- who gets a notification for this message (the Edge Function asks, with the service key)
create or replace function public.roar_push_targets(msg uuid)
returns table (endpoint text, p256dh text, auth text, preview boolean, user_id uuid, unread int, mention boolean)
language sql stable security definer set search_path = public as $$
  with m as (select * from roar_messages where id = msg and kind <> 'system' and user_id is not null),
  men as (select public.roar_mentioned(m.room_id, m.body, m.user_id) as uid from m where m.body like '%@%')
  select s.endpoint, s.p256dh, s.auth, s.preview, s.user_id,
    (select count(*)::int from roar_members mm join roar_messages x on x.room_id = mm.room_id
       where mm.user_id = s.user_id and not mm.muted and x.created_at > mm.last_read_at
         and x.user_id is distinct from s.user_id and x.kind <> 'system' and x.deleted_at is null),
    mem.user_id in (select uid from men)
  from m
  join roar_members mem on mem.room_id = m.room_id and mem.user_id <> m.user_id
  join roar_push_subs s on s.user_id = mem.user_id
  left join roar_profiles p on p.id = mem.user_id
  where (not mem.muted or mem.user_id in (select uid from men))
    and (p.active_until is null or p.active_until < now())
    and public.roar_hub_member(mem.user_id)
    and not exists (select 1 from roar_blocks b where b.blocker = mem.user_id and b.blocked = m.user_id)
$$;

-- every minute: due reminders are marked and, for someone with notifications on, knock on roar-push
create or replace function public.roar_fire_reminders() returns int
language plpgsql security definer set search_path = public, extensions as $$
declare
  r record;
  n int := 0;
  tok uuid;
begin
  if auth.uid() is not null then raise exception 'not allowed'; end if;
  select hook_token into tok from roar_push_conf where id = 1;
  for r in select * from roar_reminders where fired_at is null and remind_at <= now() order by remind_at limit 500 for update skip locked loop
    update roar_reminders set fired_at = now() where id = r.id;
    if not exists (select 1 from roar_members where room_id = r.room_id and user_id = r.user_id) then continue; end if;
    if tok is not null and exists (select 1 from roar_push_subs where user_id = r.user_id) then
      begin
        perform net.http_post(
          url := 'https://naibamqexcqnqhbbqafa.supabase.co/functions/v1/roar-push',
          body := jsonb_build_object('reminder', r.id),
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-roar-hook', tok::text)
        );
        n := n + 1;
      exception when others then null;
      end;
    end if;
  end loop;
  delete from roar_reminders where fired_at < now() - interval '30 days';
  return n;
end $$;

-- every minute: scheduled messages that are due go out
create or replace function public.roar_send_scheduled() returns int
language plpgsql security definer set search_path = public as $$
declare
  s record;
  n int := 0;
  step interval;
  k int;
  nxt timestamptz;
begin
  if auth.uid() is not null then raise exception 'not allowed'; end if;
  for s in select * from roar_scheduled where send_at <= now() order by send_at limit 500 for update skip locked loop
    if not exists (select 1 from roar_members where room_id = s.room_id and user_id = s.user_id) then
      delete from roar_scheduled where id = s.id;
      continue;
    end if;
    if exists (select 1 from roar_e2e_sessions where room_id = s.room_id and ended_at is null) then continue; end if;
    if not exists (select 1 from roar_rooms x join roar_members m on m.room_id = x.id and m.user_id <> s.user_id
        join roar_blocks b on (b.blocker = s.user_id and b.blocked = m.user_id) or (b.blocker = m.user_id and b.blocked = s.user_id)
        where x.id = s.room_id and x.kind = 'direct') then
      insert into roar_messages (room_id, user_id, kind, body, reply_to, file)
        values (s.room_id, s.user_id, 'text', s.body, (select id from roar_messages where id = s.reply_to and room_id = s.room_id), '{"scheduled": true}'::jsonb);
      n := n + 1;
    end if;
    step := case s.repeat when 'day' then interval '1 day' when 'week' then interval '7 days' when '2weeks' then interval '14 days'
      when 'month' then interval '1 month' when '3months' then interval '3 months' when '6months' then interval '6 months'
      when 'year' then interval '1 year' end;
    if step is null then
      delete from roar_scheduled where id = s.id;
    else
      k := s.times + 1;
      loop
        nxt := s.first_at + step * k;
        exit when nxt > now();
        k := k + 1;
      end loop;
      update roar_scheduled set send_at = nxt, times = k, reply_to = null where id = s.id;
    end if;
  end loop;
  return n;
end $$;

-- what is deleted from a chat leaves the database (deleted for everyone 10 minutes ago, or taken out of every
-- member's own view)
create or replace function public.roar_cleanup_rows() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with gone as (
    select m.id from roar_messages m
    where (m.deleted_at is not null and m.deleted_at < now() - interval '10 minutes')
       or (m.created_at < now() - interval '10 minutes'
           and exists (select 1 from roar_members mm where mm.room_id = m.room_id)
           and not exists (
             select 1 from roar_members mm
             where mm.room_id = m.room_id
               and not exists (select 1 from roar_msg_hides h where h.user_id = mm.user_id and h.message_id = m.id)
               and not (mm.cleared_at is not null and mm.cleared_at >= m.created_at)))
    limit 5000
  )
  delete from roar_messages where id in (select id from gone);
  get diagnostics n = row_count;
  return n;
end $$;

-- chat files no message points to any more (for an Edge Function that removes them from storage)
create or replace function public.roar_orphan_files() returns table (bucket text, name text)
language sql stable security definer set search_path = public, storage as $$
  select o.bucket_id::text, o.name::text from storage.objects o
  where o.bucket_id = 'roar-files'
    and o.created_at < now() - interval '1 hour'
    and not exists (select 1 from roar_messages m
      where (m.file->>'path' = o.name or m.file->>'thumb' = o.name) and coalesce(m.file->>'bucket', 'roar-files') = o.bucket_id)
  limit 1000
$$;

-- who may call which function
revoke all on function public.roar_open_direct(uuid), public.roar_create_group(text, uuid[]), public.roar_add_members(uuid, uuid[]),
  public.roar_leave(uuid), public.roar_delete_group(uuid), public.roar_remove_member(uuid, uuid), public.roar_set_admin(uuid, uuid, boolean),
  public.roar_set_group_photo(uuid, text), public.roar_hub_rename(uuid, text), public.roar_set_auto_delete(uuid, int), public.roar_pin(uuid, uuid),
  public.roar_delete_me(), public.roar_my_sessions(), public.roar_end_session(uuid), public.roar_my_rooms(), public.roar_ask_delete(uuid),
  public.roar_answer_delete(uuid, boolean), public.roar_e2e_start(uuid, uuid, jsonb), public.roar_e2e_end(uuid), public.roar_my_mentions(),
  public.roar_is_admin(), public.roar_am_blocked(), public.roar_aal_ok(), public.roar_shares_room(uuid), public.roar_are_contacts(uuid, uuid),
  public.roar_blocked_between(uuid, uuid), public.roar_blocked_in(uuid), public.roar_roles_editor(uuid), public.roar_roles_members_ok(uuid, uuid[]),
  public.roar_may_call(uuid), public.roar_may_signal(text), public.roar_may_add(uuid), public.roar_privacy_lets(uuid, text),
  public.roar_is_member(uuid), public.roar_is_admin(uuid), public.roar_file_ok(text), public.roar_hub_member(uuid)
  from public, anon;
grant execute on function public.roar_open_direct(uuid), public.roar_create_group(text, uuid[]), public.roar_add_members(uuid, uuid[]),
  public.roar_leave(uuid), public.roar_delete_group(uuid), public.roar_remove_member(uuid, uuid), public.roar_set_admin(uuid, uuid, boolean),
  public.roar_set_group_photo(uuid, text), public.roar_hub_rename(uuid, text), public.roar_set_auto_delete(uuid, int), public.roar_pin(uuid, uuid),
  public.roar_delete_me(), public.roar_my_sessions(), public.roar_end_session(uuid), public.roar_my_rooms(), public.roar_ask_delete(uuid),
  public.roar_answer_delete(uuid, boolean), public.roar_e2e_start(uuid, uuid, jsonb), public.roar_e2e_end(uuid), public.roar_my_mentions(),
  public.roar_is_admin(), public.roar_am_blocked(), public.roar_aal_ok(), public.roar_shares_room(uuid), public.roar_are_contacts(uuid, uuid),
  public.roar_blocked_between(uuid, uuid), public.roar_blocked_in(uuid), public.roar_roles_editor(uuid), public.roar_roles_members_ok(uuid, uuid[]),
  public.roar_may_call(uuid), public.roar_may_signal(text), public.roar_may_add(uuid), public.roar_privacy_lets(uuid, text),
  public.roar_is_member(uuid), public.roar_is_admin(uuid), public.roar_file_ok(text), public.roar_hub_member(uuid)
  to authenticated;
-- trigger functions and server jobs are not something to call over the API
revoke all on function public.roar_touch_room(), public.roar_message_stamp(), public.roar_autoreply_send(), public.roar_push_hook(),
  public.roar_hub_guard_members(), public.roar_hub_guard_rooms(), public.roar_hub_guard_e2e(), public.roar_fire_reminders(),
  public.roar_send_scheduled(), public.roar_mentioned(uuid, text, uuid, boolean), public.roar_push_targets(uuid),
  public.roar_cleanup_rows(), public.roar_orphan_files() from public, anon, authenticated;
grant execute on function public.roar_push_targets(uuid), public.roar_cleanup_rows(), public.roar_orphan_files() to service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- 8. Live updates, and the call inboxes (Realtime broadcast "call:<user id>")
-- ---------------------------------------------------------------------------------------------------------------------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['roar_messages', 'roar_members', 'roar_rooms', 'roar_reactions', 'roar_pins', 'roar_roles',
      'roar_delete_asks', 'roar_calls'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists roar_call_inbox_read on realtime.messages';
    execute $p$create policy roar_call_inbox_read on realtime.messages for select to authenticated
      using (realtime.messages.extension = 'broadcast' and (select realtime.topic()) = 'call:' || auth.uid()::text and public.roar_aal_ok())$p$;
    execute 'drop policy if exists roar_call_inbox_send on realtime.messages';
    execute $p$create policy roar_call_inbox_send on realtime.messages for insert to authenticated
      with check (realtime.messages.extension = 'broadcast' and public.roar_may_signal((select realtime.topic())))$p$;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 9. Files: photos and files in a chat (roar-files/<room id>/...), profile and group pictures
--    (roar-avatars/<user id>/...), chat wallpapers (roar-walls, hub administrators)
-- ---------------------------------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit) values ('roar-files', 'roar-files', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('roar-avatars', 'roar-avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('roar-walls', 'roar-walls', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists roar_files_read on storage.objects;
create policy roar_files_read on storage.objects for select to authenticated
  using (bucket_id = 'roar-files' and public.roar_file_ok(name));
drop policy if exists roar_files_write on storage.objects;
create policy roar_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'roar-files' and public.roar_file_ok(name));
drop policy if exists roar_avatars_write on storage.objects;
create policy roar_avatars_write on storage.objects for insert to authenticated
  with check (bucket_id = 'roar-avatars' and (storage.foldername(name))[1] = auth.uid()::text and public.roar_aal_ok());
drop policy if exists roar_avatars_update on storage.objects;
create policy roar_avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'roar-avatars' and (storage.foldername(name))[1] = auth.uid()::text and public.roar_aal_ok());
drop policy if exists roar_walls_admin_ins on storage.objects;
create policy roar_walls_admin_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'roar-walls' and public.roar_is_admin());
drop policy if exists roar_walls_admin_upd on storage.objects;
create policy roar_walls_admin_upd on storage.objects for update to authenticated
  using (bucket_id = 'roar-walls' and public.roar_is_admin()) with check (bucket_id = 'roar-walls' and public.roar_is_admin());
drop policy if exists roar_walls_admin_del on storage.objects;
create policy roar_walls_admin_del on storage.objects for delete to authenticated
  using (bucket_id = 'roar-walls' and public.roar_is_admin());

-- ---------------------------------------------------------------------------------------------------------------------
-- 10. The hub is the source of people: profiles, the team group and the project groups, kept in step
-- ---------------------------------------------------------------------------------------------------------------------
-- the hub profile photo as a chat picture: the small copy (thumb) first, both kept by the hub as data: pictures
create or replace function public.roar_hub_pic(prof jsonb) returns text
language sql immutable set search_path = public as $$
  select case
    when x ~ '^data:image/(jpeg|png|webp|gif);base64,' and length(x) <= 200000 then x
    when x like 'https://naibamqexcqnqhbbqafa.supabase.co/storage/v1/object/public/roar-avatars/%' then x
    else '' end
  from (select coalesce(nullif(prof->>'thumb', ''), nullif(prof->>'photo', ''), '') as x) s
$$;

-- a free @username from the email's first part (or the name, Greek letters written in Latin), 3 to 24 of a-z 0-9 _
create or replace function public.roar_hub_username(u uuid, email text, full_name text) returns text
language plpgsql stable security definer set search_path = public as $$
declare base text; un text; n int := 1;
begin
  base := regexp_replace(lower(coalesce(split_part(email, '@', 1), '')), '[^a-z0-9_]+', '_', 'g');
  base := trim(both '_' from regexp_replace(base, '_+', '_', 'g'));
  if length(base) < 3 then
    base := lower(coalesce(full_name, ''));
    base := replace(replace(replace(replace(base, 'θ', 'th'), 'ψ', 'ps'), 'χ', 'ch'), 'ξ', 'x');
    base := translate(base, 'αβγδεζηικλμνοπρσςτυφωάέήίόύώϊϋΐΰ', 'avgdeziiklmnoprsstyfoaeiiouoiyiy');
    base := regexp_replace(base, '[^a-z0-9_]+', '_', 'g');
    base := trim(both '_' from regexp_replace(base, '_+', '_', 'g'));
  end if;
  if length(base) < 3 then base := 'member'; end if;
  base := left(base, 20);
  un := base;
  while exists (select 1 from roar_profiles where username = un and id <> u) loop
    n := n + 1;
    un := left(base, 24 - length(n::text)) || n::text;
  end loop;
  return un;
end $$;

-- an active hub member's chat profile, made when it is missing
create or replace function public.roar_hub_profile(u uuid) returns void
language plpgsql security definer set search_path = public as $$
declare j jsonb; un text;
begin
  if u is null or exists (select 1 from roar_profiles where id = u) then return; end if;
  select to_jsonb(m) into j from members m
    where m.user_id = u and public.roar_hub_ok(m.active, m.role, m.permissions)
    order by (m.role = 'admin') desc, m.created_at limit 1;
  if j is null then return; end if;
  un := public.roar_hub_username(u, j->>'email', j->>'name');
  insert into roar_profiles (id, username, display_name, avatar_url)
    values (u, un, left(coalesce(nullif(trim(j->>'name'), ''), un), 64), public.roar_hub_pic(j->'profile'))
    on conflict (id) do nothing;
end $$;

-- make a hub group if needed, set its name (unless a hub administrator named it), and make its members exactly
-- `wanted`; removal is part of the same step, so nobody stays in by mistake
create or replace function public.roar_hub_set_room(room_key text, group_title text, wanted uuid[], arch boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid; prev text := current_setting('roar.hub_sync', true); t text := left(coalesce(nullif(trim(group_title), ''), 'Project'), 80);
begin
  perform set_config('roar.hub_sync', 'on', true);
  wanted := coalesce(wanted, '{}');
  select id into rid from roar_rooms where hub_project = room_key;
  if rid is null then
    insert into roar_rooms (kind, title, created_by, hub_project) values ('group', t, null, room_key) returning id into rid;
  else
    update roar_rooms set title = case when hub_title_custom then title else t end, hub_closed_at = null
      where id = rid and ((not hub_title_custom and title is distinct from t) or hub_closed_at is not null);
  end if;
  delete from roar_members where room_id = rid and not (user_id = any (wanted));
  insert into roar_members (room_id, user_id, role, archived)
    select rid, w, 'member', coalesce(arch, false) from unnest(wanted) w on conflict do nothing;
  update roar_members set role = 'member' where room_id = rid and role <> 'member';
  perform set_config('roar.hub_sync', coalesce(prev, ''), true);
  return rid;
end $$;

-- everyone out of a hub group; the chat stays in the database but nobody sees it (a deleted project)
create or replace function public.roar_hub_close_project(project text) returns void
language plpgsql security definer set search_path = public as $$
declare rid uuid; prev text := current_setting('roar.hub_sync', true);
begin
  select id into rid from roar_rooms where hub_project = project;
  if rid is null then return; end if;
  perform set_config('roar.hub_sync', 'on', true);
  delete from roar_members where room_id = rid;
  update roar_rooms set hub_closed_at = now() where id = rid and hub_closed_at is null;
  perform set_config('roar.hub_sync', coalesce(prev, ''), true);
end $$;

-- the team group THEMADLIONS: every active member (the hub has one workspace, THEMADLIONS)
create or replace function public.roar_hub_sync_team() returns uuid
language plpgsql security definer set search_path = public as $$
begin
  return public.roar_hub_set_room('team', 'THEMADLIONS', (
    select coalesce(array_agg(distinct m.user_id), '{}') from members m
    where public.roar_hub_ok(m.active, m.role, m.permissions) and exists (select 1 from roar_profiles p where p.id = m.user_id)));
end $$;

-- who is in a project's group: the hub's own rule for a project's chat (as roarme_sync.sql): active members who can
-- see the project (administrator, access "all", or the project in project_access), and, unless an administrator,
-- on data.chatMembers when the project keeps that list, otherwise not on data.chatExcluded
create or replace function public.roar_hub_project_people(pid text) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct m.user_id), '{}')
  from projects p
  join members m on m.workspace_id = p.workspace_id
  where p.id = pid
    and public.roar_hub_ok(m.active, m.role, m.permissions)
    and (m.role = 'admin' or m.project_access = '"all"'::jsonb or m.project_access ? p.id)
    and (m.role = 'admin' or case when jsonb_typeof(p.data->'chatMembers') = 'array'
           then (p.data->'chatMembers') ? m.user_id::text
           else not coalesce((p.data->'chatExcluded') ? m.user_id::text, false) end)
    and exists (select 1 from roar_profiles x where x.id = m.user_id)
$$;

-- one project's group; a Delivered project's group sits in its people's Archived folder
create or replace function public.roar_hub_sync_project(pid text) returns uuid
language plpgsql security definer set search_path = public as $$
declare d jsonb;
begin
  if pid is null or pid = 'team' then return null; end if;
  select data into d from projects where id = pid;
  if d is null then
    perform public.roar_hub_close_project(pid);
    return null;
  end if;
  return public.roar_hub_set_room(pid, d->>'title', public.roar_hub_project_people(pid), coalesce(d->>'status', '') = 'Delivered');
end $$;

-- everything again: the team, every project, and the groups of projects that are gone (also run every night, for
-- an "Access until" date that passed without any change)
create or replace function public.roar_hub_sync_all() returns void
language plpgsql security definer set search_path = public as $$
declare x record;
begin
  perform public.roar_hub_sync_team();
  for x in select id from projects order by id loop
    perform public.roar_hub_sync_project(x.id);
  end loop;
  for x in select r.hub_project from roar_rooms r
      where r.hub_project is not null and r.hub_project <> 'team' and r.hub_closed_at is null
        and not exists (select 1 from projects p where p.id = r.hub_project) loop
    perform public.roar_hub_close_project(x.hub_project);
  end loop;
end $$;

revoke all on function public.roar_hub_pic(jsonb), public.roar_hub_username(uuid, text, text), public.roar_hub_profile(uuid),
  public.roar_hub_set_room(text, text, uuid[], boolean), public.roar_hub_close_project(text), public.roar_hub_sync_team(),
  public.roar_hub_project_people(text), public.roar_hub_sync_project(text), public.roar_hub_sync_all(), public.roar_hub_syncing(),
  public.roar_hub_ok(boolean, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.roar_hub_sync_all(), public.roar_hub_sync_project(text), public.roar_hub_close_project(text) to service_role;
grant execute on function public.roar_hub_ok(boolean, text, jsonb), public.roar_hub_syncing() to authenticated;

-- a member joins, changes or leaves: their chat profile (name and photo follow the hub), then who is in which group.
-- A problem in the chat never stops a save in the hub (it is written to the log, and the nightly run mends it).
create or replace function public.roar_hub_members_changed() returns trigger
language plpgsql security definer set search_path = public as $$
declare o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end; n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
begin
  begin
    if n is not null then
      perform public.roar_hub_profile(new.user_id);
      if o is not null and (o->>'name') is distinct from (n->>'name') and nullif(trim(n->>'name'), '') is not null then
        update roar_profiles set display_name = left(trim(n->>'name'), 64) where id = new.user_id;
      end if;
      if o is not null and public.roar_hub_pic(o->'profile') is distinct from public.roar_hub_pic(n->'profile') then
        update roar_profiles set avatar_url = public.roar_hub_pic(n->'profile') where id = new.user_id;
      end if;
    end if;
    if tg_op <> 'UPDATE'
        or (o->'active', o->'role', o->'project_access', o->'permissions'->'accessUntil', o->'workspace_id', o->'user_id')
           is distinct from (n->'active', n->'role', n->'project_access', n->'permissions'->'accessUntil', n->'workspace_id', n->'user_id') then
      perform public.roar_hub_sync_all();
    end if;
  exception when others then
    raise warning 'hub chat: members sync failed: %', sqlerrm;
  end;
  return null;
end $$;
drop trigger if exists roar_hub_members on public.members;
create trigger roar_hub_members after insert or update or delete on public.members
  for each row execute function public.roar_hub_members_changed();

-- a project is made, renamed, changes its chat list, is delivered or reopened, or is deleted
create or replace function public.roar_hub_projects_changed() returns trigger
language plpgsql security definer set search_path = public as $$
declare rid uuid; prev text;
begin
  begin
    if tg_op = 'DELETE' then
      perform public.roar_hub_close_project(old.id);
      return null;
    end if;
    rid := public.roar_hub_sync_project(new.id);
    -- Delivered or back in production: the group moves into, or out of, everyone's Archived folder
    if tg_op = 'UPDATE' and rid is not null
        and (coalesce(old.data->>'status', '') = 'Delivered') is distinct from (coalesce(new.data->>'status', '') = 'Delivered') then
      prev := current_setting('roar.hub_sync', true);
      perform set_config('roar.hub_sync', 'on', true);
      update roar_members set archived = (coalesce(new.data->>'status', '') = 'Delivered') where room_id = rid;
      perform set_config('roar.hub_sync', coalesce(prev, ''), true);
    end if;
  exception when others then
    raise warning 'hub chat: project sync failed: %', sqlerrm;
  end;
  return null;
end $$;
drop trigger if exists roar_hub_projects_ins on public.projects;
create trigger roar_hub_projects_ins after insert on public.projects
  for each row execute function public.roar_hub_projects_changed();
drop trigger if exists roar_hub_projects_upd on public.projects;
create trigger roar_hub_projects_upd after update on public.projects for each row
  when ((old.data->'title') is distinct from (new.data->'title')
     or (old.data->'status') is distinct from (new.data->'status')
     or (old.data->'chatMembers') is distinct from (new.data->'chatMembers')
     or (old.data->'chatExcluded') is distinct from (new.data->'chatExcluded')
     or old.workspace_id is distinct from new.workspace_id)
  execute function public.roar_hub_projects_changed();
drop trigger if exists roar_hub_projects_del on public.projects;
create trigger roar_hub_projects_del after delete on public.projects
  for each row execute function public.roar_hub_projects_changed();
revoke all on function public.roar_hub_members_changed(), public.roar_hub_projects_changed() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 11. Jobs (only where pg_cron is installed)
--   roar-auto-delete    every 10 min: messages past their chat's Auto-Delete time go
--   (no roar-old-sessions here: these are hub sign-ins, and the chat must never sign anyone out of the hub; an old
--    job of that name is removed)
--   roar-scheduled      every minute: scheduled messages go out
--   roar-reminders      every minute: Remind Me
--   roar-cleanup        every 15 min: deleted messages leave the database (rows only; see the header for files)
--   roar-hub-resync     every night: the team and project groups checked again
-- ---------------------------------------------------------------------------------------------------------------------
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job
      where jobname in ('roar-auto-delete', 'roar-old-sessions', 'roar-scheduled', 'roar-reminders', 'roar-cleanup', 'roar-hub-resync');
    perform cron.schedule('roar-auto-delete', '*/10 * * * *',
      $$delete from public.roar_messages m using public.roar_rooms r
        where m.room_id = r.id and r.auto_delete_hours is not null and m.created_at < now() - make_interval(hours => r.auto_delete_hours)$$);
    perform cron.schedule('roar-scheduled', '* * * * *', $$select public.roar_send_scheduled()$$);
    perform cron.schedule('roar-reminders', '* * * * *', $$select public.roar_fire_reminders()$$);
    perform cron.schedule('roar-cleanup', '*/15 * * * *', $$select public.roar_cleanup_rows()$$);
    perform cron.schedule('roar-hub-resync', '43 4 * * *', $$select public.roar_hub_sync_all()$$);
  end if;
end $cron$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 12. Backfill: a chat profile for every active member, then the team and project groups
-- ---------------------------------------------------------------------------------------------------------------------
do $$
declare x record;
begin
  for x in select distinct m.user_id from members m where public.roar_hub_ok(m.active, m.role, m.permissions) loop
    perform public.roar_hub_profile(x.user_id);
  end loop;
  perform public.roar_hub_sync_all();
end $$;
