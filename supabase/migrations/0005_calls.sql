-- Phone call records (e.g. QUO call summaries) attached to clients.
-- Run after 0004.

create table if not exists calls (
  id               text primary key,
  client_id        text references clients(id) on delete set null,
  phone            text not null default '',
  direction        text not null default 'inbound',  -- inbound | outbound
  summary          text not null default '',
  transcript       text not null default '',
  recording_url    text not null default '',
  duration_seconds integer not null default 0,
  category         text,
  occurred_at      timestamptz not null default now()
);

create index if not exists calls_client_idx on calls (client_id, occurred_at desc);

alter table calls enable row level security;
drop policy if exists "authenticated full access" on calls;
create policy "authenticated full access" on calls
  for all to authenticated using (true) with check (true);

-- Realtime so call summaries appear under the client instantly.
alter table calls replica identity full;
do $$
begin
  alter publication supabase_realtime add table calls;
exception
  when duplicate_object then null;
  when undefined_object then
    create publication supabase_realtime for table calls;
end $$;
