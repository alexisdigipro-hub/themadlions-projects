-- THEMADLIONS Projects · a project for outside collaborators (18 Nov 2026). Safe to run again, after share_safety.sql.
-- The link is a row of shares with kind 'project' (src/lib/projectShare.js). The page reads it through share_get, which
-- already handles the code, its five tries, the closing date and Close. What is new: the collaborator can leave a
-- comment, so share_respond also takes a 'project' link, and there only a comment ('comment', with words). Everything
-- else stays as share_safety.sql made it: an open link, not past its date, with its code, at most 200 replies a link.

create or replace function share_respond(p_token text, p_name text, p_status text, p_note text, p_pin text default null) returns void
language sql security definer set search_path = public as $$
  update shares set responses = coalesce(responses, '[]'::jsonb) || jsonb_build_object(
      'at', now(),
      'name', left(coalesce(p_name, ''), 120),
      'status', case
        when kind = 'project' then 'comment'
        when p_status in ('approved', 'changes', 'seen') then p_status
        else 'seen' end,
      'note', left(coalesce(p_note, ''), 4000)
    )
  where token = p_token
    and kind in ('delivery', 'estimate', 'project')
    and (kind <> 'project' or length(btrim(coalesce(p_note, ''))) > 0)
    and not coalesce(closed, false)
    and (expires_at is null or expires_at >= current_date)
    and (coalesce(pin, '') = '' or pin = btrim(coalesce(p_pin, '')))
    and jsonb_array_length(coalesce(responses, '[]'::jsonb)) < 200
$$;
revoke all on function share_respond(text, text, text, text, text) from public;
grant execute on function share_respond(text, text, text, text, text) to anon, authenticated;
