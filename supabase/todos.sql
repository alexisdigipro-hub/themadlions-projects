-- THEMADLIONS Projects · general tasks (to-dos outside projects), stored in the library table
-- Paste into Supabase > SQL Editor > New query > Run (after library.sql). Safe to run more than once.
alter table library drop constraint if exists library_kind_check;
alter table library add constraint library_kind_check check (kind in ('contact', 'location', 'task'));
