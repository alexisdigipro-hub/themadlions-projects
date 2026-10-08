-- THEMADLIONS Projects · Notes (Apple Notes style), private to each person
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql). Safe to run more than once.
--
-- One row per note and one per folder (kind). Every row belongs to the person who wrote it and
-- nobody else can read it, administrators included: each policy is user_id = auth.uid().
-- deleted_at: in Recently Deleted (the app empties it after 30 days).

create table if not exists notes (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'folder')),
  folder_id text,
  title text not null default '',
  body text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists notes_user_updated on notes (user_id, updated_at desc);

alter table notes enable row level security;
drop policy if exists notes_select on notes;
drop policy if exists notes_insert on notes;
drop policy if exists notes_update on notes;
drop policy if exists notes_delete on notes;
create policy notes_select on notes for select using (user_id = auth.uid());
create policy notes_insert on notes for insert with check (user_id = auth.uid());
create policy notes_update on notes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notes_delete on notes for delete using (user_id = auth.uid());
