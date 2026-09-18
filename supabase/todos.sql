-- THEMADLIONS Projects · general tasks (to-dos outside projects), stored in the library table
-- Paste into Supabase > SQL Editor > New query > Run (after library.sql). Safe to run more than once, in any order.
-- The kind list is kept identical in library.sql, todos.sql and drives.sql on purpose,
-- so re-running any of them in any order never drops a kind the others still use.
alter table library drop constraint if exists library_kind_check;
alter table library add constraint library_kind_check check (kind in ('contact', 'location', 'task', 'drive'));
