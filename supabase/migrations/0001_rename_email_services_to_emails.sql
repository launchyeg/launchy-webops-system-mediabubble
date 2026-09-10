-- Renames the email_services table (and everything named after it) to
-- emails, dropping the "Service"/"Renewals" wording from the entity name
-- app-wide. Safe to run against a live project — ALTER ... RENAME preserves
-- all rows, constraints, the client_id foreign key, and RLS policies
-- (Postgres renames policies along with the table automatically only if
-- they're recreated; we do that explicitly below to keep their names tidy).
--
-- Run this once in the Supabase SQL editor for any project created before
-- this rename. Fresh projects can just run the updated supabase/schema.sql
-- instead — it already defines the `emails` table directly.
begin;

alter table if exists email_services rename to emails;

alter table if exists emails rename constraint email_services_client_id_fkey to emails_client_id_fkey;
alter table if exists emails rename constraint email_services_pkey to emails_pkey;
alter table if exists emails rename constraint email_services_status_check to emails_status_check;

alter index if exists email_services_client_id_idx rename to emails_client_id_idx;
alter index if exists email_services_expiration_date_idx rename to emails_expiration_date_idx;
alter index if exists email_services_status_idx rename to emails_status_idx;

alter trigger email_services_set_updated_at on emails rename to emails_set_updated_at;

drop policy if exists "Authenticated users can read email_services" on emails;
drop policy if exists "Authenticated users can insert email_services" on emails;
drop policy if exists "Authenticated users can update email_services" on emails;
drop policy if exists "Authenticated users can delete email_services" on emails;

create policy "Authenticated users can read emails"
  on emails for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert emails"
  on emails for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update emails"
  on emails for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete emails"
  on emails for delete using (auth.role() = 'authenticated');

-- Recreate the view so it reads from the renamed table.
create or replace view upcoming_renewals as
  select
    'domain'::text as service_kind,
    d.id as service_id,
    d.client_id,
    d.domain_name as service_name,
    d.provider,
    d.expiration_date,
    d.annual_cost,
    d.account_email
  from domains d
  union all
  select
    'hosting'::text as service_kind,
    h.id as service_id,
    h.client_id,
    h.account_name as service_name,
    h.provider,
    h.expiration_date,
    h.annual_cost,
    h.account_email
  from hosting h
  union all
  select
    'email'::text as service_kind,
    e.id as service_id,
    e.client_id,
    e.email_account as service_name,
    e.provider,
    e.expiration_date,
    e.annual_cost,
    e.account_email
  from emails e;

commit;
