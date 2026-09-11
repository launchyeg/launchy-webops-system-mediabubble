-- Adds a `domain_id` column to `emails`, linking an email service to one of
-- the same client's domains (from the `domains` table). Used purely by the
-- Add/Edit Email form to auto-append "@<domain>" while typing mailbox local
-- parts in the Mailboxes section — nothing else in the app reads it.
-- Nullable and on delete set null, matching how client_id is handled
-- elsewhere: deleting the linked domain just unlinks it rather than
-- blocking the delete or cascading.
--
-- Run this once in the Supabase SQL editor for any project created before
-- this migration. Fresh projects can just run the updated
-- supabase/schema.sql instead — it already defines the column directly.
begin;

alter table if exists emails
  add column if not exists domain_id uuid references domains (id) on delete set null;

create index if not exists emails_domain_id_idx on emails (domain_id);

commit;
