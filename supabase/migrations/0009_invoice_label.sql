-- Optional custom label / title on invoices.
-- Run after 0008.

alter table invoices add column if not exists label text not null default '';
