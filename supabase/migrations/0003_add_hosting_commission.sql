-- Adds a `commission_usd` column to `hosting`, mirroring the one added to
-- `domains` in 0002_add_domain_commission.sql: the company's commission for
-- managing that hosting account, entered in USD. It's purely informational —
-- shown alongside annual_cost in the Add/Edit Hosting form as "Final Price
-- to Client" (annual_cost + commission_usd), converted to EGP client-side at
-- display time via a live exchange rate. Nothing else in the app reads it.
--
-- Run this once in the Supabase SQL editor for any project created before
-- this migration. Fresh projects can just run the updated
-- supabase/schema.sql instead — it already defines the column directly.
begin;

alter table if exists hosting
  add column if not exists commission_usd numeric(10, 2) not null default 0;

commit;
