-- Add a display title / role label to employees (custom roles).
-- Run after 0005.

alter table employees add column if not exists title text not null default '';
