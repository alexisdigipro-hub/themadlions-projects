-- THEMADLIONS Projects · cost estimations sent as a page
-- Paste into Supabase > SQL Editor > New query > Run (after shares.sql and deliveries.sql).
-- Safe to run more than once.
--
-- A cost estimation is another kind of share page, so publishing and reading one needs nothing
-- new. What IS new: the client has to be able to accept it, and share_respond() only ever
-- accepted deliveries. This file widens it by exactly one kind and changes nothing else about it.

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
    and kind in ('delivery', 'estimate')
    and jsonb_array_length(coalesce(responses, '[]'::jsonb)) < 200
$$;

revoke all on function share_respond(text, text, text, text) from public;
grant execute on function share_respond(text, text, text, text) to anon, authenticated;

-- Everything else stays as deliveries.sql left it: the function can only ever append one response,
-- it never touches data, kind or ref, it clamps the status, it truncates the text, and it stops at
-- 200 replies. share_get still does not return responses, so one client cannot read another's.
--
-- Note: supabase/deliveries.sql creates the delivery-only version of this function, so if that file
-- is ever re-run, run this one after it.
