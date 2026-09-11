-- Adds `shared_hosting`, a new top-level entity for tracking shared
-- hosting plans/servers as infrastructure in their own right — unlike
-- `hosting`, `domains`, and `emails`, these aren't tied to a client
-- (no client_id), matching the "Shared Hosting" page's own Add/table view.
--
-- Run this once in the Supabase SQL editor for any project created before
-- this migration. Fresh projects can just run the updated
-- supabase/schema.sql instead — it already defines the table directly.
begin;

create table if not exists shared_hosting (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null,
  -- Cached, coarse status, same convention as the other service tables —
  -- the UI always recomputes the precise renewal urgency from
  -- expiration_date for display.
  status text not null default 'active' check (status in ('active', 'expiring_soon', 'expired')),
  expiration_date date not null,
  auto_renewal boolean not null default false,
  annual_cost numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists shared_hosting_set_updated_at on shared_hosting;
create trigger shared_hosting_set_updated_at
  before update on shared_hosting
  for each row execute procedure set_updated_at();

create index if not exists shared_hosting_expiration_date_idx on shared_hosting (expiration_date);
create index if not exists shared_hosting_status_idx on shared_hosting (status);

alter table shared_hosting enable row level security;

drop policy if exists "Authenticated users can read shared_hosting" on shared_hosting;
create policy "Authenticated users can read shared_hosting"
  on shared_hosting for select using (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can insert shared_hosting" on shared_hosting;
create policy "Authenticated users can insert shared_hosting"
  on shared_hosting for insert with check (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can update shared_hosting" on shared_hosting;
create policy "Authenticated users can update shared_hosting"
  on shared_hosting for update using (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can delete shared_hosting" on shared_hosting;
create policy "Authenticated users can delete shared_hosting"
  on shared_hosting for delete using (auth.role() = 'authenticated');

commit;
