-- Everyone marks their own days off (Alex, 11 Oct): a member may add, change and remove a
-- "Not available" event that is about themselves (no project, personId = their own user id).
-- Everything else on the calendar still needs edit rights (events_write). Safe to run again.
drop policy if exists events_own_off_insert on events;
drop policy if exists events_own_off_update on events;
drop policy if exists events_own_off_delete on events;

create policy events_own_off_insert on events for insert
  with check (workspace_id = my_ws() and project_id is null and data->>'type' = 'unavailable' and data->>'personId' = auth.uid()::text);

create policy events_own_off_update on events for update
  using (workspace_id = my_ws() and project_id is null and data->>'type' = 'unavailable' and data->>'personId' = auth.uid()::text)
  with check (workspace_id = my_ws() and project_id is null and data->>'type' = 'unavailable' and data->>'personId' = auth.uid()::text);

create policy events_own_off_delete on events for delete
  using (workspace_id = my_ws() and project_id is null and data->>'type' = 'unavailable' and data->>'personId' = auth.uid()::text);
