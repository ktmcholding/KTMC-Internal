-- Signable contracts. A contract is created internally, sent to a client via a
-- secret token link, and signed in the browser (typed + drawn signature).
-- Run after 0009.

create table if not exists contracts (
  id                 text primary key,
  title              text not null default '',
  body               text not null default '',
  client_id          text references clients(id) on delete set null,
  signer_name        text not null default '',
  signer_email       text not null default '',
  status             text not null default 'draft',  -- draft | sent | signed | declined
  token              text not null unique,
  signer_typed_name  text not null default '',
  signature          text not null default '',       -- drawn signature (data URL)
  signed_ip          text not null default '',
  signed_user_agent  text not null default '',
  created_by         text not null default '',
  created_at         timestamptz not null default now(),
  sent_at            timestamptz,
  signed_at          timestamptz
);

create index if not exists contracts_token_idx on contracts (token);
create index if not exists contracts_client_idx on contracts (client_id);

-- Only signed-in staff touch this table directly. Clients sign via the
-- sign-contract Edge Function (service role), never through the anon API.
alter table contracts enable row level security;
drop policy if exists "authenticated full access" on contracts;
create policy "authenticated full access" on contracts
  for all to authenticated using (true) with check (true);

-- Realtime so a signature flips the status to 'signed' in the app instantly.
alter table contracts replica identity full;
do $$
begin
  alter publication supabase_realtime add table contracts;
exception
  when duplicate_object then null;
  when undefined_object then
    create publication supabase_realtime for table contracts;
end $$;
