-- Fixes the Supabase Advisor "Security Definer view" warning on
-- upcoming_renewals. Views default to running with the creator's
-- permissions (postgres), which bypasses the RLS policies on domains/
-- hosting/emails for anyone who queries the view via the API. Setting
-- security_invoker makes it run with the querying user's own permissions/
-- RLS instead, matching the underlying tables' access rules.
--
-- Run this once in the Supabase SQL editor for any project created before
-- this migration. Fresh projects can just run the updated
-- supabase/schema.sql instead — it already defines the view this way. Safe
-- to re-run.
begin;

alter view if exists upcoming_renewals set (security_invoker = on);

commit;
