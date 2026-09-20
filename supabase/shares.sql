-- THEMADLIONS Projects · public share links (call sheets opened by anyone with the link, no login)
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql). Safe to run more than once.

create table if not exists shares (
  token text primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null default 'callsheet',
  ref text not null,                -- what it points to, e.g. callsheet:<projectId>:<dayId>
  data jsonb not null,              -- a snapshot of what the page shows
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists shares_ws_ref on shares (workspace_id, ref);

alter table shares enable row level security;
drop policy if exists shares_members on shares;
create policy shares_members on shares for all using (workspace_id = my_ws()) with check (workspace_id = my_ws());

-- anyone with the link reads through this function only (never the table itself)
create or replace function share_get(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('kind', kind, 'data', data, 'updated_at', updated_at) from shares where token = p_token
$$;
grant execute on function share_get(text) to anon, authenticated;

-- Note: supabase/share_access.sql replaces the shares_members policy above with a narrower one,
-- so that only members with the Share permission can send delivery links. Run it after this file.

-- Note: supabase/share_track.sql replaces share_get above with one that counts openings and
-- honours a closed or expired link. Run it after this file.
