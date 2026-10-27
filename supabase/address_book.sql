-- Contacts (Alex, 27 Oct 2026): the administrator's own address book, imported from a phone's or a mail program's
-- file (Database > Contacts). Administrators only, for reading and writing: it is never in the library, which every
-- member reads. A contact moved to Crew or Cast becomes a library entry, seen by whoever has Crew & cast.
-- Safe to re-run.

create table if not exists address_book (
  id           text primary key,
  workspace_id uuid not null default my_ws() references workspaces(id) on delete cascade,
  data         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint address_book_size check (octet_length(data::text) <= 20000)
);
create index if not exists address_book_ws on address_book (workspace_id);

alter table address_book enable row level security;
drop policy if exists address_book_admin on address_book;
create policy address_book_admin on address_book for all to authenticated
  using (workspace_id = my_ws() and is_admin())
  with check (workspace_id = my_ws() and is_admin());

revoke all on address_book from anon;
grant select, insert, update, delete on address_book to authenticated;

create or replace function address_book_touch() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists address_book_touch on address_book;
create trigger address_book_touch before update on address_book for each row execute function address_book_touch();
revoke all on function address_book_touch() from public, anon, authenticated;
