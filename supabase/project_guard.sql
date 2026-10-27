-- THEMADLIONS Projects · security check, 27 Oct 2026. Safe to run more than once. Needs schema.sql.
-- A project is one JSON document, and the row rules can only say "may change this project". This guard keeps the
-- parts that need more than that as they were when someone without the right saves the project:
--   the budget, unless they have Budget = edit (or are an administrator);
--   who is in the project's RoarMe group (chatExcluded, chatMembers) and the RoarMe switch, administrators only.
-- It only steps in for a person saving through the app (role authenticated); the database's own functions (Add
-- Receipt, claiming a budget line) and the server are not touched.

create or replace function public.projects_guard() returns trigger
language plpgsql security invoker set search_path = public as $$
declare k text;
begin
  if current_user <> 'authenticated' or is_admin() then return new; end if;
  if coalesce(my_perm('budget'), 'none') <> 'edit' then
    new.data := case when old.data ? 'budget' then jsonb_set(new.data, '{budget}', old.data -> 'budget') else new.data - 'budget' end;
  end if;
  foreach k in array array['chatExcluded', 'chatMembers', 'roarme'] loop
    new.data := case when old.data ? k then jsonb_set(new.data, array[k], old.data -> k) else new.data - k end;
  end loop;
  return new;
end $$;
revoke all on function public.projects_guard() from public, anon, authenticated;

drop trigger if exists projects_guard on projects;
create trigger projects_guard before update on projects for each row execute function public.projects_guard();
