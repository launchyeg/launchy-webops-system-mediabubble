-- Adds `host_type` + `shared_hosting_id` to `hosting`, replacing free-text
-- account naming with an explicit choice: a "private" (dedicated) host
-- keeps the typed Name/Identifier as before, while a "shared" host instead
-- links to one row in `shared_hosting` (added in 0008) — letting the app
-- show which clients share a host vs. which have a dedicated one.
--
-- account_name stays NOT NULL and is still what every existing view/table
-- displays as the row's name: for a shared host it's auto-set to the
-- linked shared_hosting.name at save time (a snapshot, not a live join) so
-- nothing else needs to change to keep working.
--
-- Run this once in the Supabase SQL editor for any project created before
-- this migration. Fresh projects can just run the updated
-- supabase/schema.sql instead — it already defines these columns directly.
begin;

alter table if exists hosting
  add column if not exists host_type text not null default 'private'
    check (host_type in ('private', 'shared'));

alter table if exists hosting
  add column if not exists shared_hosting_id uuid references shared_hosting (id) on delete set null;

create index if not exists hosting_shared_hosting_id_idx on hosting (shared_hosting_id);

alter table if exists hosting
  drop constraint if exists hosting_shared_link_check;

alter table if exists hosting
  add constraint hosting_shared_link_check
    check (host_type = 'private' or shared_hosting_id is not null);

commit;
