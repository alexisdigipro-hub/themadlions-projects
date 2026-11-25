-- The hub's chat locked shut (security review, 25 Nov 2026). Safe to run again. Run after hub_chat_off.sql.
-- The chat is gone from the hub, but its tables, functions and file buckets were still reachable by anyone signed in
-- (and its two picture buckets by anyone with a link). This closes all of it. Nothing is deleted: the messages and
-- files stay, unreachable, until Alex decides what to do with them. RoarList (roarlist_*) and Roardino (roardino_*)
-- are not touched: only names that start with roar_ exactly.
do $$
declare r record;
begin
  for r in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname ~ '^roar_' and c.relkind in ('r', 'v', 'm', 'p') loop
    execute format('revoke all on public.%I from anon, authenticated', r.relname);
  end loop;
  for r in select p.oid::regprocedure as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname ~ '^roar_' loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.f);
  end loop;
  for r in select schemaname, tablename, policyname from pg_policies
           where (schemaname = 'storage' and policyname ~ '^roar_(files|avatars|walls)')
              or (schemaname = 'realtime' and policyname ~ '^roar_call_') loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;
update storage.buckets set public = false where id in ('roar-files', 'roar-avatars', 'roar-walls');
