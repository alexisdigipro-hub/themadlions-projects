-- THEMADLIONS Projects · keys for apps that write into the hub (Alex, 22 Nov 2026: "a key from the hub, put in RoarMe,
-- and every location made there goes straight into the hub's locations"). An administrator makes a key in
-- Settings > Integrations > Connected apps; it is shown once, the hub keeps only its SHA-256. The Edge Function
-- hub-bridge takes the key and writes into this workspace's library (locations first). Safe to run again.

create table if not exists hub_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  label text not null default '',
  key_hash text not null unique,
  last4 text not null default '',
  created_by uuid,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
alter table hub_keys enable row level security;
drop policy if exists hub_keys_select on hub_keys;
create policy hub_keys_select on hub_keys for select using (workspace_id = my_ws() and is_admin());
revoke insert, update, delete on hub_keys from anon, authenticated;

-- a new key: 'tmlhub_' and 48 random hex letters, returned once
create or replace function hub_key_create(p_label text) returns text
language plpgsql security definer set search_path = public as $$
declare k text; ws uuid := my_ws();
begin
  if ws is null or not is_admin() then raise exception 'Only an administrator can make a key'; end if;
  if (select count(*) from hub_keys where workspace_id = ws and revoked_at is null) >= 20 then raise exception 'That is enough keys; remove one first'; end if;
  k := 'tmlhub_' || replace(gen_random_uuid()::text, '-', '') || left(replace(gen_random_uuid()::text, '-', ''), 16);
  insert into hub_keys (workspace_id, label, key_hash, last4, created_by)
    values (ws, left(coalesce(nullif(trim(p_label), ''), 'RoarMe'), 60), encode(sha256(convert_to(k, 'UTF8')), 'hex'), right(k, 4), auth.uid());
  return k;
end $$;
revoke all on function hub_key_create(text) from public, anon;
grant execute on function hub_key_create(text) to authenticated;

create or replace function hub_key_revoke(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only an administrator can remove a key'; end if;
  update hub_keys set revoked_at = now() where id = p_id and workspace_id = my_ws() and revoked_at is null;
end $$;
revoke all on function hub_key_revoke(uuid) from public, anon;
grant execute on function hub_key_revoke(uuid) to authenticated;

-- does this workspace have an app linked (a key that was used)? For the project's Create PROject button, any member
create or replace function hub_has_app() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from hub_keys where workspace_id = my_ws() and revoked_at is null and last_used_at is not null)
$$;
revoke all on function hub_has_app() from public, anon;
grant execute on function hub_has_app() to authenticated;
