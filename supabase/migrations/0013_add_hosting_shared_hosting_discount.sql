-- Adds `discount_percent` to `hosting` and `shared_hosting`, mirroring the
-- one already on `domains` (0002 / 0012).
--
--  - hosting.discount_percent: for a Private host, a percentage off
--    commission_usd only (never annual_cost) — same rule as domains. For a
--    Shared host (no commission concept), it's a percentage off
--    annual_cost_egp directly instead.
--  - shared_hosting.discount_percent: a percentage off the plan's own
--    annual_cost directly — plans have no commission concept either.
--
-- Run this once in the Supabase SQL editor for any project created before
-- this migration. Fresh projects can just run the updated
-- supabase/schema.sql instead — it already defines these columns directly.
begin;

alter table if exists hosting
  add column if not exists discount_percent numeric(5, 2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 100);

alter table if exists shared_hosting
  add column if not exists discount_percent numeric(5, 2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 100);

commit;
