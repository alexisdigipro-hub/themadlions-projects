-- THEMADLIONS Projects · usage numbers for Settings > Usage (administrators only)
-- Paste into Supabase > SQL Editor > New query > Run. Safe to run more than once.
--
-- One read-only function that reports how big the database and the file storage are, so the app
-- can show them against the plan's limits. It reads sizes and counts only, never any content, and
-- refuses anyone who is not an administrator.

create or replace function usage_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'administrators only';
  end if;
  return jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'tables', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', c.relname,
        'bytes', pg_total_relation_size(c.oid),
        'rows', greatest(c.reltuples, 0)::bigint
      ) order by pg_total_relation_size(c.oid) desc)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    ), '[]'::jsonb),
    'buckets', coalesce((
      select jsonb_agg(jsonb_build_object('name', b.bucket_id, 'bytes', b.bytes, 'files', b.files) order by b.bytes desc)
      from (
        select bucket_id, sum(coalesce((metadata ->> 'size')::bigint, 0)) as bytes, count(*) as files
        from storage.objects
        group by bucket_id
      ) b
    ), '[]'::jsonb),
    'accounts', (select count(*) from auth.users)
  );
end
$$;
revoke all on function usage_stats() from public, anon;
grant execute on function usage_stats() to authenticated;
