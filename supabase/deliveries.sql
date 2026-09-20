-- THEMADLIONS Projects · delivery pages (rough cut / prefinal / final cut / final files)
-- Paste into Supabase > SQL Editor > New query > Run (after shares.sql). Safe to run more than once.
--
-- Delivery pages reuse the shares table with kind = 'delivery', so nothing new is needed to
-- publish or read one. What IS new: the client has no account, and they need to be able to
-- approve or ask for changes. This file is only about giving them that one narrow ability.

alter table shares add column if not exists responses jsonb not null default '[]'::jsonb;

-- The client writes through this function and nothing else. It is the only way anyone without
-- an account can change a row in shares, and it deliberately cannot do anything but append one
-- response to one delivery: it never touches data, kind, ref or any other column, it refuses a
-- token that is not a delivery, it clamps the status to the three we understand, it truncates
-- the text, and it stops accepting after 200 responses so an open link cannot be used to fill
-- the database.
create or replace function share_respond(p_token text, p_name text, p_status text, p_note text)
returns void
language sql security definer set search_path = public as $$
  update shares set responses = coalesce(responses, '[]'::jsonb) || jsonb_build_object(
      'at', now(),
      'name', left(coalesce(p_name, ''), 120),
      'status', case when p_status in ('approved', 'changes', 'seen') then p_status else 'seen' end,
      'note', left(coalesce(p_note, ''), 4000)
    )
  where token = p_token
    and kind = 'delivery'
    and jsonb_array_length(coalesce(responses, '[]'::jsonb)) < 200
$$;

revoke all on function share_respond(text, text, text, text) from public;
grant execute on function share_respond(text, text, text, text) to anon, authenticated;

-- share_get stays read-only and deliberately does NOT return responses, so one client can never
-- read what another client wrote on the same link. The team reads them from the table itself.
