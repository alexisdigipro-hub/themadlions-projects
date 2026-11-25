-- The hub's chat taken out (Alex, 25 Nov 2026). Safe to run again.
-- Stops everything the chat still did by itself in the database: the triggers that made chat profiles and
-- project groups whenever a member or a project changed, the notification knock on every new message, and the
-- chat's timed jobs. The chat's tables, messages and files are NOT deleted; they just sit unused.
drop trigger if exists roar_hub_members on public.members;
drop trigger if exists roar_hub_projects_ins on public.projects;
drop trigger if exists roar_hub_projects_upd on public.projects;
drop trigger if exists roar_hub_projects_del on public.projects;
do $$ begin
  if to_regclass('public.roar_messages') is not null then
    execute 'drop trigger if exists roar_push on public.roar_messages';
  end if;
end $$;
do $$
declare j text;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    foreach j in array array['roar-auto-delete', 'roar-scheduled', 'roar-reminders', 'roar-cleanup', 'roar-hub-resync'] loop
      begin perform cron.unschedule(j); exception when others then null; end;
    end loop;
  end if;
end $$;
