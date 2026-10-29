-- THEMADLIONS Projects · the Vault removed (Alex, 29 Oct 2026: "I don't think I want the Vault, delete it entirely").
-- The page is gone from the app; this takes its table, and every password kept in it, out of the database.
-- Paste into Supabase > SQL Editor > New query > Run. Safe to run more than once.
drop table if exists vaults;
