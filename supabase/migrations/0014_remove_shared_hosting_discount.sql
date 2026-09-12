-- Removes `discount_percent` from `shared_hosting` (added in 0013) — the
-- Shared Hosting plan form no longer has a Discount field. This doesn't
-- affect `hosting.discount_percent` (the per-client Hosting form's
-- Private/Shared Host discount) or `domains.discount_percent`, which are
-- unrelated columns on different tables and are unchanged.
--
-- Run this once in the Supabase SQL editor for any project that already
-- ran 0013. Fresh projects can just run the updated supabase/schema.sql
-- instead — it never defines this column.
begin;

alter table if exists shared_hosting
  drop column if exists discount_percent;

commit;
