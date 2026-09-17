-- THEMADLIONS Projects · drives archive (which hard disk holds which project), stored in the library table
-- Paste into Supabase > SQL Editor > New query > Run (after library.sql and todos.sql). Safe to run more than once.
alter table library drop constraint if exists library_kind_check;
alter table library add constraint library_kind_check check (kind in ('contact', 'location', 'task', 'drive'));
