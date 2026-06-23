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
