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
