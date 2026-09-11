-- Adds `annual_cost_egp` to `hosting` — for a "Shared Host" account, the
-- recurring annual cost is entered directly in EGP instead of USD, with no
-- commission/Final-Price breakdown (unlike Private, where annual_cost +
-- commission_usd still apply). Both stay recurring/annual either way —
-- unlike a Lifetime email, this isn't a one-time payment, just priced in a
-- different currency for shared hosting.
--
-- Run this once in the Supabase SQL editor for any project created before
-- this migration. Fresh projects can just run the updated
-- supabase/schema.sql instead — it already defines the column directly.
begin;

alter table if exists hosting
  add column if not exists annual_cost_egp numeric(10, 2) not null default 0;

commit;
