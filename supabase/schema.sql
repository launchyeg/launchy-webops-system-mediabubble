-- mediaBubble OPS — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a
-- fresh project. Safe to re-run: every statement is guarded.

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============================================================================
-- Helper: keep updated_at current on every row update
-- ============================================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- profiles
-- One row per authenticated user, created automatically on signup. Reserved
-- for future role-based access (e.g. a future read-only "member" role)
-- without requiring any schema changes later — the app currently treats
-- every authenticated user as an admin.
-- ============================================================================
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'member')),
  full_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "Users can view their own profile" on profiles;
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Automatically create a profile row whenever a new auth user signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================================
-- clients
-- ============================================================================
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  agency_name text,
  email text,
  phone text,
  start_project_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists clients_set_updated_at on clients;
create trigger clients_set_updated_at
  before update on clients
  for each row execute procedure set_updated_at();

create index if not exists clients_client_name_idx on clients (client_name);

-- ============================================================================
-- domains
-- ============================================================================
create table if not exists domains (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients (id) on delete set null,
  domain_name text not null,
  provider text not null,
  -- Cached, coarse status. The frontend always recomputes the precise
  -- renewal urgency from expiration_date for display; this column exists
  -- so future SQL-side jobs (renewal reminders, reporting) can filter
  -- without recomputing dates.
  status text not null default 'active' check (status in ('active', 'expiring_soon', 'expired')),
  expiration_date date not null,
  auto_renewal boolean not null default false,
  account_email text,
  annual_cost numeric(10, 2) not null default 0,
  -- The company's commission for managing this domain, in USD. Purely
  -- informational — shown in the UI next to annual_cost as the final price
  -- sent to the client; nothing in the app derives logic from it.
  commission_usd numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists domains_set_updated_at on domains;
create trigger domains_set_updated_at
  before update on domains
  for each row execute procedure set_updated_at();

create index if not exists domains_client_id_idx on domains (client_id);
create index if not exists domains_expiration_date_idx on domains (expiration_date);
create index if not exists domains_status_idx on domains (status);

-- ============================================================================
-- hosting
-- ============================================================================
create table if not exists hosting (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients (id) on delete set null,
  provider text not null,
  account_name text not null,
  status text not null default 'active' check (status in ('active', 'expiring_soon', 'expired')),
  expiration_date date not null,
  auto_renewal boolean not null default false,
  account_email text,
  annual_cost numeric(10, 2) not null default 0,
  -- The company's commission for managing this hosting account, in USD.
  -- Purely informational — shown in the UI next to annual_cost as the final
  -- price sent to the client; nothing in the app derives logic from it.
  commission_usd numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists hosting_set_updated_at on hosting;
create trigger hosting_set_updated_at
  before update on hosting
  for each row execute procedure set_updated_at();

create index if not exists hosting_client_id_idx on hosting (client_id);
create index if not exists hosting_expiration_date_idx on hosting (expiration_date);
create index if not exists hosting_status_idx on hosting (status);

-- ============================================================================
-- hosting_domains
-- Join table linking one hosting account to any number of the same
-- client's domains (a shared hosting account often serves several
-- domains) — edited as a repeatable "+ Add Domain" list in the Add/Edit
-- Hosting form. Both FKs cascade: deleting the hosting account or the
-- domain just removes the link row, never blocks the delete.
-- ============================================================================
create table if not exists hosting_domains (
  id uuid primary key default gen_random_uuid(),
  hosting_id uuid not null references hosting (id) on delete cascade,
  domain_id uuid not null references domains (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (hosting_id, domain_id)
);

create index if not exists hosting_domains_hosting_id_idx on hosting_domains (hosting_id);
create index if not exists hosting_domains_domain_id_idx on hosting_domains (domain_id);

-- ============================================================================
-- emails
-- ============================================================================
create table if not exists emails (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients (id) on delete set null,
  -- Links this email service to one of the same client's domains, used
  -- purely by the Add/Edit Email form to auto-append "@<domain>" while
  -- typing mailbox local parts. Nothing else in the app reads it.
  domain_id uuid references domains (id) on delete set null,
  provider text not null,
  email_account text not null,
  status text not null default 'active' check (status in ('active', 'expiring_soon', 'expired')),
  -- Null only when is_lifetime is true — a lifetime email service was paid
  -- for once and never expires, so it has no renewal date.
  expiration_date date,
  -- When true, this was a one-time purchase (no expiration_date); its cost
  -- lives in lifetime_cost_egp instead of annual_cost, and it's excluded
  -- from all renewal tracking and from the USD annual-cost dashboard totals.
  is_lifetime boolean not null default false,
  auto_renewal boolean not null default false,
  account_email text,
  -- "Email Cost": the recurring annual cost in USD. Used only when
  -- is_lifetime is false (0 for lifetime rows).
  annual_cost numeric(10, 2) not null default 0,
  -- The company's commission for managing this email service, in USD.
  -- Purely informational — shown next to annual_cost as the final price
  -- sent to the client. Used only when is_lifetime is false.
  commission_usd numeric(10, 2) not null default 0,
  -- The one-time cost for a lifetime purchase, entered directly in EGP.
  -- Used only when is_lifetime is true.
  lifetime_cost_egp numeric(10, 2) not null default 0,
  check (
    (is_lifetime and expiration_date is null)
    or (not is_lifetime and expiration_date is not null)
  ),
  -- The individual mailboxes created under this account (e.g. each
  -- user@client.com inbox under a Google Workspace subscription), as a JSON
  -- array of { email, password, storage }. Edited together with the parent
  -- record; never queried on its own, so a JSONB column rather than a
  -- child table.
  mailboxes jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists emails_set_updated_at on emails;
create trigger emails_set_updated_at
  before update on emails
  for each row execute procedure set_updated_at();

create index if not exists emails_client_id_idx on emails (client_id);
create index if not exists emails_domain_id_idx on emails (domain_id);
create index if not exists emails_expiration_date_idx on emails (expiration_date);
create index if not exists emails_status_idx on emails (status);

-- ============================================================================
-- Row Level Security
--
-- Every table is readable/writable only by authenticated users. There is
-- currently a single "admin" role for every signed-in user (see `profiles`
-- above) — if a future read-only "member" role is introduced, tighten these
-- policies to check profiles.role instead of just auth.uid() being present.
-- ============================================================================
alter table clients enable row level security;
alter table domains enable row level security;
alter table hosting enable row level security;
alter table hosting_domains enable row level security;
alter table emails enable row level security;

drop policy if exists "Authenticated users can read clients" on clients;
create policy "Authenticated users can read clients"
  on clients for select using (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can insert clients" on clients;
create policy "Authenticated users can insert clients"
  on clients for insert with check (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can update clients" on clients;
create policy "Authenticated users can update clients"
  on clients for update using (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can delete clients" on clients;
create policy "Authenticated users can delete clients"
  on clients for delete using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can read domains" on domains;
create policy "Authenticated users can read domains"
  on domains for select using (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can insert domains" on domains;
create policy "Authenticated users can insert domains"
  on domains for insert with check (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can update domains" on domains;
create policy "Authenticated users can update domains"
  on domains for update using (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can delete domains" on domains;
create policy "Authenticated users can delete domains"
  on domains for delete using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can read hosting" on hosting;
create policy "Authenticated users can read hosting"
  on hosting for select using (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can insert hosting" on hosting;
create policy "Authenticated users can insert hosting"
  on hosting for insert with check (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can update hosting" on hosting;
create policy "Authenticated users can update hosting"
  on hosting for update using (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can delete hosting" on hosting;
create policy "Authenticated users can delete hosting"
  on hosting for delete using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can read hosting_domains" on hosting_domains;
create policy "Authenticated users can read hosting_domains"
  on hosting_domains for select using (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can insert hosting_domains" on hosting_domains;
create policy "Authenticated users can insert hosting_domains"
  on hosting_domains for insert with check (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can update hosting_domains" on hosting_domains;
create policy "Authenticated users can update hosting_domains"
  on hosting_domains for update using (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can delete hosting_domains" on hosting_domains;
create policy "Authenticated users can delete hosting_domains"
  on hosting_domains for delete using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can read emails" on emails;
create policy "Authenticated users can read emails"
  on emails for select using (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can insert emails" on emails;
create policy "Authenticated users can insert emails"
  on emails for insert with check (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can update emails" on emails;
create policy "Authenticated users can update emails"
  on emails for update using (auth.role() = 'authenticated');
drop policy if exists "Authenticated users can delete emails" on emails;
create policy "Authenticated users can delete emails"
  on emails for delete using (auth.role() = 'authenticated');

-- ============================================================================
-- Future automated renewal reminders
--
-- This view is not used by the app today, but gives a ready-made surface
-- for a future scheduled job (Supabase Edge Function + pg_cron, or an
-- external scheduler) to query everything expiring within the 21/14/7-day
-- windows across all three service types, ready to notify clients over
-- WhatsApp/SMS/Email once that channel is built.
-- ============================================================================
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
