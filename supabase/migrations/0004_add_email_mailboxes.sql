-- Adds a `mailboxes` column to `emails`: a JSON array of the individual
-- mailboxes created under that email service account (e.g. each
-- user@client.com inbox under a Google Workspace subscription), entered as
-- a repeatable Email / Password / Email Storage field group in the Add/Edit
-- Email form. Stored as JSONB rather than a child table since it's simple,
-- always edited together with its parent record, and never queried on its
-- own.
--
-- Run this once in the Supabase SQL editor for any project created before
-- this migration. Fresh projects can just run the updated
-- supabase/schema.sql instead — it already defines the column directly.
begin;

alter table if exists emails
  add column if not exists mailboxes jsonb not null default '[]'::jsonb;

commit;
