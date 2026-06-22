-- KTMC Internal — initial schema
-- Run this in your Supabase project: SQL Editor → paste → Run.
-- It creates all tables, row-level-security policies, and the documents
-- storage bucket. The app uses a shared workspace model: any authenticated
-- KTMC user can read and write all records.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists clients (
  id                text primary key,
  category          text not null,
  name              text not null default '',
  company           text not null,
  email             text not null default '',
  phone             text not null default '',
  recurring_revenue numeric not null default 0,
  created_at        date not null default current_date
);

create table if not exists documents (
  id          text primary key,
  client_id   text not null references clients(id) on delete cascade,
  name        text not null,
  size        bigint not null default 0,
  type        text not null default 'application/octet-stream',
  path        text,                       -- storage object path
  uploaded_at date not null default current_date
);

create table if not exists leads (
  id              text primary key,
  category        text not null,
  name            text not null default '',
  company         text not null,
  email           text not null default '',
  phone           text not null default '',
  potential_value numeric not null default 0,
  status          text not null default 'new',
  source          text not null default 'manual',
  notes           text not null default '',
  created_at      date not null default current_date
);

create table if not exists sales (
  id          text primary key,
  category    text not null,
  client_id   text,
  description text not null,
  amount      numeric not null default 0,
  recurring   boolean not null default false,
  month       text not null,
  date        date not null default current_date
);

create table if not exists invoices (
  id         text primary key,
  number     text not null,
  category   text not null,
  client_id  text,
  issue_date date not null default current_date,
  due_date   date,
  status     text not null default 'draft',
  notes      text not null default ''
);

create table if not exists invoice_line_items (
  id          text primary key,
  invoice_id  text not null references invoices(id) on delete cascade,
  description text not null default '',
  quantity    numeric not null default 1,
  unit_price  numeric not null default 0
);

create table if not exists tasks (
  id          text primary key,
  title       text not null,
  description text not null default '',
  assignee    text not null default 'Unassigned',
  status      text not null default 'todo',
  priority    text not null default 'medium',
  due_date    date
);

create table if not exists events (
  id       text primary key,
  title    text not null,
  date     date not null,
  time     text not null default '09:00',
  category text,
  notes    text not null default ''
);

-- Integration configuration (QUO, Curator) stored as a single JSON row each.
create table if not exists settings (
  key   text primary key,
  value jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Row level security: authenticated users get full access (shared workspace)
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'clients','documents','leads','sales','invoices',
    'invoice_line_items','tasks','events','settings'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "authenticated full access" on %I;', t);
    execute format(
      'create policy "authenticated full access" on %I
         for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage bucket for client documents (private)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', false)
on conflict (id) do nothing;

drop policy if exists "auth read documents" on storage.objects;
create policy "auth read documents" on storage.objects
  for select to authenticated using (bucket_id = 'client-documents');

drop policy if exists "auth upload documents" on storage.objects;
create policy "auth upload documents" on storage.objects
  for insert to authenticated with check (bucket_id = 'client-documents');

drop policy if exists "auth delete documents" on storage.objects;
create policy "auth delete documents" on storage.objects
  for delete to authenticated using (bucket_id = 'client-documents');
