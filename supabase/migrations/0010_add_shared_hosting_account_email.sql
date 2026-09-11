-- Adds `account_email` to `shared_hosting` — the login/admin email for
-- that shared server, matching the account_email column already on
-- domains/hosting/emails. Once a hosting account is linked to a shared
-- host, its own Hosting Provider and Hosting Account Email fields are
-- auto-filled from this and the shared host's provider, and become
-- non-editable (the private, dedicated-host case is unaffected).
--
-- Run this once in the Supabase SQL editor for any project created before
-- this migration. Fresh projects can just run the updated
-- supabase/schema.sql instead — it already defines the column directly.
begin;

alter table if exists shared_hosting
  add column if not exists account_email text;

commit;
