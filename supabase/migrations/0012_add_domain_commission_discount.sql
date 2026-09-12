-- Adds `discount_percent` to `domains` — a percentage deducted from the
-- commission itself (never from the domain price or the total), entered
-- next to Commission in the Add/Edit Domain form. commission_usd keeps its
-- existing meaning (the gross commission as typed); the discount is
-- applied live wherever a domain's Final Price is computed, both in the
-- form and everywhere else it's already displayed (Domains table, Client
-- Details, Client Overview).
--
-- Run this once in the Supabase SQL editor for any project created before
-- this migration. Fresh projects can just run the updated
-- supabase/schema.sql instead — it already defines the column directly.
begin;

alter table if exists domains
  add column if not exists discount_percent numeric(5, 2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 100);

commit;
