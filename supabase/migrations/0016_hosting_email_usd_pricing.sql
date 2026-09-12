-- Switches "Shared Host" (in `hosting`) and "Lifetime" email pricing from
-- EGP to USD entry — but keeps each as its own separate cost field, distinct
-- from the annual_cost/commission_usd pair a Private host / recurring email
-- uses, since neither has a commission concept of its own. EGP is still
-- shown everywhere in the UI, just as a live-converted display figure, never
-- a separate stored value.
--
--  - hosting.annual_cost_egp is dropped, replaced by hosting.shared_annual_cost
--    (same USD-entry, own-discount behavior, just no longer EGP-denominated).
--  - emails.lifetime_cost_egp is dropped, replaced by emails.lifetime_cost
--    (same USD-entry, own-discount behavior, just no longer EGP-denominated).
--
-- This does NOT touch shared_hosting.annual_cost (the plan's own cost) —
-- that was already USD-denominated.
--
-- Existing EGP amounts are not converted automatically — any row that was
-- priced in EGP starts at 0 in the new column after this migration runs.
-- Re-enter those rows' costs if you have any.
--
-- Run this once in the Supabase SQL editor for any project created before
-- this migration. Fresh projects can just run the updated
-- supabase/schema.sql instead — it already defines things this way. Safe to
-- re-run even if an earlier version of this same migration already ran.
begin;

alter table if exists hosting
  drop column if exists annual_cost_egp,
  add column if not exists shared_annual_cost numeric(10, 2) not null default 0;

alter table if exists emails
  drop column if exists lifetime_cost_egp,
  add column if not exists lifetime_cost numeric(10, 2) not null default 0;

commit;
