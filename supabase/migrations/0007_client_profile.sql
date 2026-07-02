-- Client-profile enhancements: notes, goals, and per-section documents.
-- Run after 0006.

alter table clients add column if not exists notes text not null default '';
alter table clients add column if not exists goals jsonb not null default '[]'::jsonb;
alter table documents add column if not exists section text not null default 'general';
