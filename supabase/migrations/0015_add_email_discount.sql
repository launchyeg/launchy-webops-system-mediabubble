-- Adds `discount_percent` to `emails`, mirroring the one on `domains` and
-- `hosting`.
--
--  - Recurring (Expiration Date) emails: a percentage off the commission
--    only (never the email cost) — same rule as domains/hosting-private.
--    Since annual_cost/commission_usd are stored as totals (per-mailbox
--    rate × mailbox count), applying the discount before or after that
--    multiplication gives the same result, so it's simplest applied once
--    to the stored total.
--  - Lifetime emails: no commission concept, so it's a percentage off
--    lifetime_cost_egp directly instead — same rule as a Shared Host.
--
-- Run this once in the Supabase SQL editor for any project created before
-- this migration. Fresh projects can just run the updated
-- supabase/schema.sql instead — it already defines the column directly.
begin;

alter table if exists emails
  add column if not exists discount_percent numeric(5, 2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 100);

commit;
