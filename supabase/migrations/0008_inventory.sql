-- Formulation ingredient inventory.
-- Run after 0007.

create table if not exists inventory (
  id             text primary key,
  name           text not null default '',
  sku            text not null default '',
  quantity       numeric not null default 0,
  unit           text not null default '',
  reorder_level  numeric not null default 0,
  unit_cost      numeric not null default 0,
  supplier       text not null default '',
  notes          text not null default '',
  updated_at     date not null default current_date
);

alter table inventory enable row level security;
drop policy if exists "authenticated full access" on inventory;
create policy "authenticated full access" on inventory
  for all to authenticated using (true) with check (true);
