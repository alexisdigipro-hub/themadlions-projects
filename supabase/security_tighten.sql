-- THEMADLIONS Projects · security check, 27 Oct 2026 (Alex: "are we safe?"). Safe to run more than once.
-- From Supabase's own security advisor:
-- 1. Functions that only make sense signed in are no longer callable without signing in (the anon role). The
--    public link pages keep theirs (share_get, share_respond, roardino_get), and so do the small helpers the
--    row rules call (is_admin, my_ws, my_perm, can_*), which answer "no" to someone signed out.
-- 2. Trigger functions are not callable through the API at all (a trigger runs them by itself).
-- 3. Five functions get a fixed search_path, so nothing can slip a look-alike table in front of theirs.

revoke execute on function public.ack_notice(text) from anon, public;
revoke execute on function public.add_receipt_line(text, jsonb) from anon, public;
revoke execute on function public.assign_worklog(text, uuid, jsonb) from anon, public;
revoke execute on function public.bootstrap(text) from anon, public;
revoke execute on function public.claim_budget_line(text, jsonb) from anon, public;
revoke execute on function public.set_my_profile(jsonb) from anon, public;
revoke execute on function public.unassign_worklog(text) from anon, public;
grant execute on function public.ack_notice(text) to authenticated;
grant execute on function public.add_receipt_line(text, jsonb) to authenticated;
grant execute on function public.assign_worklog(text, uuid, jsonb) to authenticated;
grant execute on function public.bootstrap(text) to authenticated;
grant execute on function public.claim_budget_line(text, jsonb) to authenticated;
grant execute on function public.set_my_profile(jsonb) to authenticated;
grant execute on function public.unassign_worklog(text) to authenticated;

revoke execute on function public.notes_link_refresh() from anon, authenticated, public;
revoke execute on function public.roarme_kick_trigger() from anon, authenticated, public;

alter function public.touch_updated_at() set search_path = public;
alter function public.notice_for_me(jsonb, uuid) set search_path = public;
alter function public.activity_prune() set search_path = public;
alter function public.notes_guard() set search_path = public;
alter function public.member_live(members) set search_path = public;
