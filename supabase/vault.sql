-- THEMADLIONS Projects · Vault, each person's own passwords (28 Oct 2026)
-- Paste into Supabase > SQL Editor > New query > Run. Safe to run more than once.
--
-- One row per person. Everything in it is encrypted in the browser before it is sent (src/lib/vault.js): the
-- database only ever holds ciphertext and the salts. Only the owner can read or change their row; administrators
-- cannot, and nobody, Supabase included, can decrypt it without the person's master password or recovery key.

create table if not exists vaults (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  iter integer not null default 600000,
  salt text not null,
  wrapped text not null,
  r_salt text not null,
  r_wrapped text not null,
  data text not null default '',
  rev integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table vaults enable row level security;
drop policy if exists vaults_select on vaults;
drop policy if exists vaults_insert on vaults;
drop policy if exists vaults_update on vaults;
drop policy if exists vaults_delete on vaults;
create policy vaults_select on vaults for select to authenticated using (user_id = (select auth.uid()));
create policy vaults_insert on vaults for insert to authenticated with check (user_id = (select auth.uid()));
create policy vaults_update on vaults for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy vaults_delete on vaults for delete to authenticated using (user_id = (select auth.uid()));
revoke all on vaults from anon;
grant select, insert, update, delete on vaults to authenticated;
