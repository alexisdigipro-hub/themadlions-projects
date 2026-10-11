-- Chat read state that follows you across devices (Alex, 11 Oct: "the chat notifications have no
-- memory"): when each person last read each room, one row per person and room. Before this it lived
-- only in each browser, so a room read on the phone still showed unread on the computer.
-- Everyone reads and writes only their own rows. Safe to run again.

create table if not exists chat_reads (
  user_id uuid not null default auth.uid(),
  room text not null,
  read_at timestamptz not null,
  primary key (user_id, room)
);

alter table chat_reads enable row level security;
drop policy if exists chat_reads_own on chat_reads;
create policy chat_reads_own on chat_reads for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- another device of yours hears it the moment you read a room
do $$ begin
  alter publication supabase_realtime add table chat_reads;
exception when others then null;
end $$;

-- mark a room read; never moves the time backwards (an older device catching up cannot undo a newer read)
create or replace function mark_chat_read(p_room text, p_at timestamptz) returns void
language sql security invoker set search_path = public as $$
  insert into chat_reads (user_id, room, read_at) values (auth.uid(), p_room, p_at)
  on conflict (user_id, room) do update set read_at = greatest(chat_reads.read_at, excluded.read_at);
$$;
