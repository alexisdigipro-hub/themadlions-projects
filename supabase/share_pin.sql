-- THEMADLIONS Projects · an access code on a public link
-- Paste into Supabase > SQL Editor > New query > Run (after shares.sql and share_track.sql).
-- Safe to run more than once.
--
-- A call sheet link carries everyone's phone number, and a link gets forwarded. With a code on it,
-- a forwarded link is useless without the six digits that went out separately. The code is checked
-- here, inside the function, so it never travels to the browser of someone who does not have it.

alter table shares add column if not exists pin text;

-- The old one-argument share_get must go, or it would stay callable and skip the code entirely.
drop function if exists share_get(text);

create or replace function share_get(p_token text, p_pin text default null) returns jsonb
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
  -- {kind, locked} and nothing else: the page shows the code prompt, the data stays here
  if coalesce(r.pin, '') <> '' and r.pin <> btrim(coalesce(p_pin, '')) then
    return jsonb_build_object('kind', r.kind, 'locked', true);
  end if;
  update shares set opens = coalesce(opens, 0) + 1, opened_at = now() where token = p_token;
  return jsonb_build_object('kind', r.kind, 'data', r.data, 'updated_at', r.updated_at);
end
$$;
grant execute on function share_get(text, text) to anon, authenticated;

-- Note: shares.sql and share_track.sql each recreate the one-argument share_get, which has no code
-- check. If either is ever re-run, run this file after it.
