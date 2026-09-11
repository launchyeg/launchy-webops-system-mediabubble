-- Adds a `hosting_domains` join table linking one hosting account to any
-- number of the same client's domains (a shared hosting account often
-- serves several domains). Unlike emails.domain_id (a single optional
-- link, used only to compose mailbox addresses), this is a true
-- many-to-many relationship edited as a repeatable "+ Add Domain" list in
-- the Add/Edit Hosting form, hence a real join table with FK integrity
-- rather than a denormalized array/JSONB column.
--
-- Both FKs cascade: deleting the hosting account or the domain just removes
-- the link row, never blocks the delete.
--
-- Run this once in the Supabase SQL editor for any project created before
-- this migration. Fresh projects can just run the updated
-- supabase/schema.sql instead — it already defines the table directly.
begin;

create table if not exists hosting_domains (
  id uuid primary key default gen_random_uuid(),
  hosting_id uuid not null references hosting (id) on delete cascade,
  domain_id uuid not null references domains (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (hosting_id, domain_id)
);

create index if not exists hosting_domains_hosting_id_idx on hosting_domains (hosting_id);
create index if not exists hosting_domains_domain_id_idx on hosting_domains (domain_id);

alter table hosting_domains enable row level security;

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

commit;
