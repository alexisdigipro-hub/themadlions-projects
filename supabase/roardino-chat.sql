-- Roardino's own chat (Alex, 16 Nov 2026: "take the connection with RoarMe out; a basic chat as it is now, better not
-- to mix them"). Until now Roardino read and wrote RoarMe's conversations (roar_rooms, roar_messages…). From here on it
-- has its own: rdc_rooms, rdc_members, rdc_messages, rdc_reactions, rdc_hides and the private bucket roardino-chat.
-- RoarMe's tables are not touched and nothing is copied: Roardino's chat starts empty, the old conversations stay in
-- RoarMe. Safe to run again.

create table if not exists public.rdc_rooms (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct',
  title text,
  avatar_url text,
  direct_key text unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create table if not exists public.rdc_members (
  room_id uuid not null references public.rdc_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  muted boolean not null default false,
  archived boolean not null default false,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  cleared_at timestamptz,
  primary key (room_id, user_id)
);
create index if not exists rdc_members_user on public.rdc_members (user_id);
create table if not exists public.rdc_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rdc_rooms(id) on delete cascade,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  kind text not null default 'text',
  body text not null default '',
  file jsonb,
  reply_to uuid,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint rdc_messages_body_len check (char_length(body) <= 4000)
);
create index if not exists rdc_messages_room on public.rdc_messages (room_id, created_at desc);
create table if not exists public.rdc_reactions (
  message_id uuid not null references public.rdc_messages(id) on delete cascade,
  room_id uuid not null references public.rdc_rooms(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index if not exists rdc_reactions_room on public.rdc_reactions (room_id);
alter table public.rdc_reactions replica identity full;
create table if not exists public.rdc_hides (
  message_id uuid not null references public.rdc_messages(id) on delete cascade,
  room_id uuid not null references public.rdc_rooms(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (message_id, user_id)
);

create or replace function public.rdc_is_member(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rdc_members where room_id = r and user_id = auth.uid())
$$;
revoke all on function public.rdc_is_member(uuid) from public, anon;
grant execute on function public.rdc_is_member(uuid) to authenticated;

alter table public.rdc_rooms enable row level security;
alter table public.rdc_members enable row level security;
alter table public.rdc_messages enable row level security;
alter table public.rdc_reactions enable row level security;
alter table public.rdc_hides enable row level security;

drop policy if exists rdc_rooms_read on public.rdc_rooms;
create policy rdc_rooms_read on public.rdc_rooms for select to authenticated using (public.rdc_is_member(id));
drop policy if exists rdc_members_read on public.rdc_members;
create policy rdc_members_read on public.rdc_members for select to authenticated using (public.rdc_is_member(room_id));
drop policy if exists rdc_members_own on public.rdc_members;
create policy rdc_members_own on public.rdc_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists rdc_messages_read on public.rdc_messages;
create policy rdc_messages_read on public.rdc_messages for select to authenticated using (public.rdc_is_member(room_id));
drop policy if exists rdc_messages_add on public.rdc_messages;
create policy rdc_messages_add on public.rdc_messages for insert to authenticated with check (user_id = auth.uid() and public.rdc_is_member(room_id));
drop policy if exists rdc_messages_own on public.rdc_messages;
create policy rdc_messages_own on public.rdc_messages for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists rdc_reactions_read on public.rdc_reactions;
create policy rdc_reactions_read on public.rdc_reactions for select to authenticated using (public.rdc_is_member(room_id));
drop policy if exists rdc_reactions_add on public.rdc_reactions;
create policy rdc_reactions_add on public.rdc_reactions for insert to authenticated with check (user_id = auth.uid() and public.rdc_is_member(room_id));
drop policy if exists rdc_reactions_upd on public.rdc_reactions;
create policy rdc_reactions_upd on public.rdc_reactions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.rdc_is_member(room_id));
drop policy if exists rdc_reactions_del on public.rdc_reactions;
create policy rdc_reactions_del on public.rdc_reactions for delete to authenticated using (user_id = auth.uid());
drop policy if exists rdc_hides_own on public.rdc_hides;
create policy rdc_hides_own on public.rdc_hides for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.rdc_is_member(room_id));

revoke all on public.rdc_rooms, public.rdc_members, public.rdc_messages, public.rdc_reactions, public.rdc_hides from anon, authenticated;
grant select on public.rdc_rooms, public.rdc_members, public.rdc_messages, public.rdc_reactions, public.rdc_hides to authenticated;
grant update (muted, archived, last_read_at, cleared_at) on public.rdc_members to authenticated;
grant insert (room_id, user_id, kind, body, file, reply_to) on public.rdc_messages to authenticated;
grant update (body, edited_at, deleted_at) on public.rdc_messages to authenticated;
grant insert, delete on public.rdc_reactions to authenticated;
grant update (emoji) on public.rdc_reactions to authenticated;
grant insert, delete on public.rdc_hides to authenticated;

-- a new message moves its conversation to the top
create or replace function public.rdc_touch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update rdc_rooms set last_message_at = new.created_at where id = new.room_id;
  return new;
end $$;
drop trigger if exists rdc_touch on public.rdc_messages;
create trigger rdc_touch after insert on public.rdc_messages for each row execute function public.rdc_touch();

-- my conversations, in the shape the page reads
create or replace function public.rdc_my_rooms()
returns table (room_id uuid, kind text, title text, avatar_url text, last_message_at timestamptz, muted boolean, archived boolean,
  last_read_at timestamptz, role text, unread int, last_body text, last_kind text, last_user uuid, last_deleted boolean, members uuid[], created_by uuid)
language sql stable security definer set search_path = public as $$
  select r.id, r.kind, r.title, r.avatar_url, r.last_message_at, m.muted, m.archived, m.last_read_at, m.role,
    (select count(*)::int from rdc_messages x where x.room_id = r.id and x.created_at > m.last_read_at
       and x.user_id is distinct from auth.uid() and x.deleted_at is null),
    l.body, l.kind, l.user_id, l.deleted_at is not null,
    (select array_agg(mm.user_id) from rdc_members mm where mm.room_id = r.id), r.created_by
  from rdc_members m
  join rdc_rooms r on r.id = m.room_id
  left join lateral (select y.body, y.kind, y.user_id, y.deleted_at from rdc_messages y where y.room_id = r.id order by y.created_at desc limit 1) l on true
  where m.user_id = auth.uid()
    and (l.user_id is not null or r.created_by = auth.uid()) -- a conversation someone opened and never wrote in is not shown to the other
  order by r.last_message_at desc
$$;
revoke all on function public.rdc_my_rooms() from public, anon;
grant execute on function public.rdc_my_rooms() to authenticated;

-- the conversation with one person: found, or made. Only with someone who has a Roardino profile.
create or replace function public.rdc_open_direct(other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); k text; r uuid;
begin
  if me is null or other is null or other = me then raise exception 'not allowed'; end if;
  if not exists (select 1 from roardino_people where owner = other) then raise exception 'no such person'; end if;
  k := least(me::text, other::text) || ':' || greatest(me::text, other::text);
  select id into r from rdc_rooms where direct_key = k;
  if r is null then
    insert into rdc_rooms (kind, direct_key, created_by) values ('direct', k, me)
      on conflict (direct_key) do update set direct_key = excluded.direct_key returning id into r;
    insert into rdc_members (room_id, user_id) values (r, me), (r, other) on conflict do nothing;
  end if;
  update rdc_members set archived = false where room_id = r and user_id = me and archived;
  return r;
end $$;
revoke all on function public.rdc_open_direct(uuid) from public, anon;
grant execute on function public.rdc_open_direct(uuid) to authenticated;

-- the bell's unread messages and the Requests shelf now read Roardino's own chat
create or replace function public.roardino_chat_unread() returns table (room_id uuid, sender text, avatar text, body text, at timestamptz, n int)
language sql stable security definer set search_path = public as $$
  select m.room_id,
         coalesce((select p.name from roardino_people p where p.owner = last.user_id order by p.minor, p.created_at limit 1), 'Roardino') as sender,
         (select p.avatar from roardino_people p where p.owner = last.user_id order by p.minor, p.created_at limit 1),
         left(coalesce(nullif(last.body, ''), case when last.file is not null then '📎' else '' end), 120),
         last.created_at,
         (select count(*)::int from rdc_messages x where x.room_id = m.room_id and x.user_id <> auth.uid() and x.deleted_at is null
            and x.created_at > coalesce(m.last_read_at, m.joined_at, '-infinity'))
  from rdc_members m
  cross join lateral (select * from rdc_messages x where x.room_id = m.room_id and x.user_id <> auth.uid() and x.deleted_at is null
                        and x.created_at > coalesce(m.last_read_at, m.joined_at, '-infinity') order by x.created_at desc limit 1) last
  where m.user_id = auth.uid() and not m.muted and not m.archived
  order by last.created_at desc limit 20
$$;
revoke all on function public.roardino_chat_unread() from public, anon;
grant execute on function public.roardino_chat_unread() to authenticated;

create or replace function public.roardino_chat_known() returns setof uuid
language sql stable security definer set search_path = public as $$
  select mm.room_id from rdc_members mm join rdc_rooms r on r.id = mm.room_id
  where mm.user_id = auth.uid()
    and (r.kind <> 'direct' or r.created_by = auth.uid()
      or exists (select 1 from rdc_messages m where m.room_id = mm.room_id and m.user_id = auth.uid())
      or exists (select 1 from roardino_chat_ok k where k.room_id = mm.room_id and k.user_id = auth.uid()))
$$;
revoke all on function public.roardino_chat_known() from public, anon;
grant execute on function public.roardino_chat_known() to authenticated;

drop policy if exists rd_chat_jobs_read on public.roardino_chat_jobs;
create policy rd_chat_jobs_read on public.roardino_chat_jobs for select using (public.rdc_is_member(room_id));
drop policy if exists rd_chat_jobs_add on public.roardino_chat_jobs;
create policy rd_chat_jobs_add on public.roardino_chat_jobs for insert with check (from_user = auth.uid() and public.rdc_is_member(room_id));

-- photos and videos sent in a conversation: a private bucket, a file lives under its conversation's id
insert into storage.buckets (id, name, public, file_size_limit) values ('roardino-chat', 'roardino-chat', false, 52428800)
  on conflict (id) do nothing;
create or replace function public.rdc_file_ok(name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare r uuid;
begin
  begin r := split_part(name, '/', 1)::uuid; exception when others then return false; end;
  return exists (select 1 from rdc_members where room_id = r and user_id = auth.uid());
end $$;
revoke all on function public.rdc_file_ok(text) from public, anon;
grant execute on function public.rdc_file_ok(text) to authenticated;
drop policy if exists rdc_files_read on storage.objects;
create policy rdc_files_read on storage.objects for select to authenticated using (bucket_id = 'roardino-chat' and public.rdc_file_ok(name));
drop policy if exists rdc_files_add on storage.objects;
create policy rdc_files_add on storage.objects for insert to authenticated with check (bucket_id = 'roardino-chat' and public.rdc_file_ok(name));

do $$ begin
  begin alter publication supabase_realtime add table public.rdc_messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.rdc_reactions; exception when duplicate_object then null; end;
end $$;
