-- Adds "Lifetime" pricing support to `emails`, alongside the existing
-- recurring/expiring pricing:
--
--  - `is_lifetime`: when true, the email service was paid for once and never
--    expires, so `expiration_date` is null and it's excluded from all
--    renewal tracking (Upcoming Renewals, expiring-soon badges/filters) and
--    from the USD annual-cost dashboard totals — it's a one-time payment,
--    not a recurring expense.
--  - `lifetime_cost_egp`: the one-time cost, entered directly in EGP (used
--    only when is_lifetime is true).
--  - `commission_usd`: the company's commission for managing this email
--    service, in USD — mirrors the column already added to `domains` and
--    `hosting` (0002/0003). Purely informational, shown next to annual_cost
--    ("Email Cost") as the final price sent to the client. Used only when
--    is_lifetime is false.
--
-- Run this once in the Supabase SQL editor for any project created before
-- this migration. Fresh projects can just run the updated
-- supabase/schema.sql instead — it already defines these columns directly.
begin;

alter table if exists emails
  alter column expiration_date drop not null;

alter table if exists emails
  add column if not exists is_lifetime boolean not null default false;

alter table if exists emails
  add column if not exists lifetime_cost_egp numeric(10, 2) not null default 0;

alter table if exists emails
  add column if not exists commission_usd numeric(10, 2) not null default 0;

alter table if exists emails
  drop constraint if exists emails_lifetime_expiration_check;

alter table if exists emails
  add constraint emails_lifetime_expiration_check
    check (
      (is_lifetime and expiration_date is null)
      or (not is_lifetime and expiration_date is not null)
    );

commit;
