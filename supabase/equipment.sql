-- THEMADLIONS Projects · Database > Equipment: the company's own film equipment, stored in the library table
-- Paste into Supabase > SQL Editor > New query > Run (after library.sql). Safe to run more than once, in any order.
-- Alex (10 Oct): "a tab where I enter my film equipment, to send to whoever wants to rent it, with a rental price".
-- Each item is one row of kind 'gear'; it is read and written like the other library entries (every
-- member reads, members with an edit permission write).
-- The kind list is kept identical in library.sql, todos.sql, drives.sql and equipment.sql on purpose,
-- so re-running any of them in any order never drops a kind the others still use.
alter table library drop constraint if exists library_kind_check;
alter table library add constraint library_kind_check check (kind in ('contact', 'location', 'task', 'drive', 'gear'));
