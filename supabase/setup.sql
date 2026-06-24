-- KTMC Internal — full database setup.
-- Paste this entire file into the Supabase SQL Editor and click Run (once).
-- It runs migrations 0001–0005 in order: tables, security, storage buckets,
-- realtime, employees + activity tracking, and call records.


-- =============================================================
-- supabase/migrations/0001_init.sql
-- =============================================================
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

-- =============================================================
-- supabase/migrations/0002_realtime_leads.sql
-- =============================================================
-- Enable Supabase Realtime for the leads table so leads created by the QUO
-- webhook appear in the app instantly, without a manual refresh.
--
-- Run this in the Supabase SQL Editor after 0001_init.sql.

-- Ensure UPDATE/DELETE events carry enough row data for the client.
alter table leads replica identity full;

-- Add the table to the realtime publication (ignore if already present).
do $$
begin
  alter publication supabase_realtime add table leads;
exception
  when duplicate_object then null;
  when undefined_object then
    -- Publication doesn't exist on this project; create it with the table.
    create publication supabase_realtime for table leads;
end $$;

-- =============================================================
-- supabase/migrations/0003_internal_documents.sql
-- =============================================================
-- Internal document vault: company-wide documents not tied to a client.
-- Run after 0002. Adds the table, RLS policy, and a private storage bucket.

create table if not exists internal_documents (
  id          text primary key,
  name        text not null,
  size        bigint not null default 0,
  type        text not null default 'application/octet-stream',
  folder      text not null default 'general',
  notes       text not null default '',
  uploaded_at date not null default current_date,
  uploaded_by text not null default '',
  path        text
);

alter table internal_documents enable row level security;
drop policy if exists "authenticated full access" on internal_documents;
create policy "authenticated full access" on internal_documents
  for all to authenticated using (true) with check (true);

-- Private storage bucket for the internal vault.
insert into storage.buckets (id, name, public)
values ('internal-documents', 'internal-documents', false)
on conflict (id) do nothing;

drop policy if exists "auth read internal" on storage.objects;
create policy "auth read internal" on storage.objects
  for select to authenticated using (bucket_id = 'internal-documents');

drop policy if exists "auth upload internal" on storage.objects;
create policy "auth upload internal" on storage.objects
  for insert to authenticated with check (bucket_id = 'internal-documents');

drop policy if exists "auth delete internal" on storage.objects;
create policy "auth delete internal" on storage.objects
  for delete to authenticated using (bucket_id = 'internal-documents');

-- =============================================================
-- supabase/migrations/0004_employees_activity.sql
-- =============================================================
-- Employee management (per-person access control) + silent activity tracking.
-- Run after 0003.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists employees (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null default '',
  name        text not null default '',
  role        text not null default 'employee',     -- 'admin' | 'employee'
  permissions jsonb not null default '[]'::jsonb,    -- SectionKey[]
  active      boolean not null default true,
  created_at  date not null default current_date
);

create table if not exists activity_events (
  id         text primary key,
  user_id    uuid not null,
  user_email text not null default '',
  type       text not null,                          -- navigate | heartbeat | action
  detail     text not null default '',
  path       text not null default '',
  at         timestamptz not null default now()
);

create index if not exists activity_events_user_at_idx
  on activity_events (user_id, at desc);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid recursive RLS on employees)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
  returns boolean language sql security definer stable
  set search_path = public as $$
  select exists (
    select 1 from public.employees e
    where e.id = auth.uid() and e.role = 'admin' and e.active
  );
$$;

create or replace function public.no_employees()
  returns boolean language sql security definer stable
  set search_path = public as $$
  select not exists (select 1 from public.employees);
$$;

-- ---------------------------------------------------------------------------
-- RLS: employees
-- ---------------------------------------------------------------------------

alter table employees enable row level security;

drop policy if exists "read own or admin" on employees;
create policy "read own or admin" on employees
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Self-provisioning: the first user becomes admin; later users may only add
-- themselves as a plain employee. Admins can add anyone.
drop policy if exists "self insert" on employees;
create policy "self insert" on employees
  for insert to authenticated
  with check (
    id = auth.uid()
    and (public.no_employees() or role = 'employee' or public.is_admin())
  );

drop policy if exists "admin update" on employees;
create policy "admin update" on employees
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin delete" on employees;
create policy "admin delete" on employees
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- RLS: activity_events (employees can write their own; only admins can read)
-- ---------------------------------------------------------------------------

alter table activity_events enable row level security;

drop policy if exists "self insert activity" on activity_events;
create policy "self insert activity" on activity_events
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "admin read activity" on activity_events;
create policy "admin read activity" on activity_events
  for select to authenticated using (public.is_admin());

-- =============================================================
-- supabase/migrations/0005_calls.sql
-- =============================================================
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

-- =============================================================
-- supabase/migrations/0006_employee_title.sql
-- =============================================================
-- Add a display title / role label to employees (custom roles).
alter table employees add column if not exists title text not null default '';
