-- RoarMe is no longer part of the hub (Alex, 1 Nov 2026): the hub has its own chat (supabase/hub_chat.sql) and RoarMe
-- stays a separate app. This removes what linked the two: the members' RoarMe links and sign-in codes, the project
-- groups' sync to RoarMe (its triggers on projects, members and workspaces, which called the Edge Function roarme-sync)
-- and the hub tasks/calendar RoarMe read (roarme_member_work). Safe to run again.
-- The Edge Functions roarme-link, roarme-sync, roarme-work and roarme-signin can be deleted in Supabase > Edge Functions;
-- without these tables they answer with an error and nothing calls them any more.

drop trigger if exists roarme_projects_ins on public.projects;
drop trigger if exists roarme_projects_upd on public.projects;
drop trigger if exists roarme_projects_del on public.projects;
drop trigger if exists roarme_members_ins_del on public.members;
drop trigger if exists roarme_members_upd on public.members;
drop trigger if exists roarme_workspace_name on public.workspaces;

drop function if exists public.roarme_kick_trigger() cascade;
drop function if exists public.roarme_kick() cascade;
drop function if exists public.roarme_sync_plan() cascade;
drop function if exists public.roarme_member_work(uuid) cascade;

drop table if exists public.roarme_signin_codes cascade;
drop table if exists public.roarme_link_states cascade;
drop table if exists public.roarme_links cascade;
drop table if exists public.roarme_groups cascade;
drop table if exists public.roarme_conf cascade;
