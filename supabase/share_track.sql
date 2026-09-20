-- THEMADLIONS Projects · did they open it, and closing a link when it should stop working
-- Paste into Supabase > SQL Editor > New query > Run (after schema.sql and shares.sql).
-- Safe to run more than once.
--
-- Two things at once, because both live on the same row:
--   1. every opening of a public link is counted, so the Share list can say whether the client
--      actually looked at it and when;
--   2. a link can be closed by hand, or given a date after which it closes itself.
-- This covers call sheet links as well as delivery links, since both go through share_get.

alter table shares add column if not exists opens integer not null default 0;
alter table shares add column if not exists opened_at timestamptz;
alter table shares add column if not exists closed boolean not null default false;
alter table shares add column if not exists expires_at date;

-- The only door an anonymous reader has. It now also records the visit, and refuses a link
-- that has been closed or has run past its date. It answers with {kind, closed: true} rather
-- than nothing, so the page can say "this link is closed" instead of "never existed".
create or replace function share_get(p_token text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare r shares%rowtype;
begin
  select * into r from shares where token = p_token;
  if not found then
    return null;
  end if;
  if r.closed or (r.expires_at is not null and r.expires_at < current_date) then
    return jsonb_build_object('kind', r.kind, 'closed', true);
  end if;
  update shares set opens = coalesce(opens, 0) + 1, opened_at = now() where token = p_token;
  return jsonb_build_object('kind', r.kind, 'data', r.data, 'updated_at', r.updated_at);
end
$$;
grant execute on function share_get(text) to anon, authenticated;

-- Note: share_respond (supabase/deliveries.sql) is deliberately left alone here, so that the two
-- files can be run in either order. A closed page never shows the reply form, because share_get
-- hands it nothing to show.
