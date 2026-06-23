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
