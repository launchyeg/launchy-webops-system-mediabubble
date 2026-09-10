# mediaBubble OPS

An internal Client & Service Management system for mediaBubble. Track clients,
domains, hosting accounts, email accounts, renewal dates, annual costs, and
simple renewal analytics — all in one place.

**Stack:** React + TypeScript + Vite · Tailwind CSS · Framer Motion · Supabase
(Postgres + Auth) · Lucide React · deployed on Vercel.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
   This creates the `clients`, `domains`, `hosting`, `emails`, and
   `profiles` tables, indexes, `updated_at` triggers, and Row Level Security
   policies restricting all access to authenticated users.
   - **Upgrading an existing project?** `schema.sql` alone won't touch data
     already sitting in a table named `email_services` from before this was
     renamed — it would just create an empty `emails` table alongside it. Run
     [`supabase/migrations/0001_rename_email_services_to_emails.sql`](supabase/migrations/0001_rename_email_services_to_emails.sql)
     once instead; it renames the table (and its indexes/policies/trigger) in
     place, keeping every existing row.
3. Go to **Authentication → Providers** and confirm Email/Password sign-in is
   enabled.
4. Go to **Authentication → Users** and create your admin login(s) manually
   (this is an internal tool — there is no public sign-up flow by design).
5. Go to **Project Settings → API** and copy the **Project URL** and
   **anon/public key**.

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Only the public URL and anon key ever live in the frontend — never the
`service_role` key. Data access is enforced by the RLS policies in
`supabase/schema.sql`, not by keeping these values secret.

## 3. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` and sign in with the admin user you created.

## 4. Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket and import it in Vercel.
2. Framework preset: **Vite**.
3. Add the same two environment variables (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Deploy. `vercel.json` rewrites all routes to `index.html` so client-side
   routing (React Router) works on refresh/direct links.

## Project structure

```
src/
  components/   Reusable UI (ui/), layout (sidebar, header), and
                feature components (clients/, domains/, hosting/, email/, shared/)
  pages/        One component per route
  routes/       ProtectedRoute + route wiring
  contexts/     Auth, Theme, Toast providers
  hooks/        Data-fetching hooks per entity + analytics aggregation
  services/     All Supabase queries (the only place that talks to the DB)
  types/        TypeScript types mirroring the Postgres schema
  utils/        Renewal-urgency logic, date/currency formatting, constants
supabase/
  schema.sql    Full schema, RLS policies, and a view reserved for future
                automated renewal reminders
  migrations/   One-off SQL to run by hand in the SQL Editor against an
                already-deployed project (schema.sql alone only covers a
                fresh install)
```

## Client Overview page

`/client-overview` (right after Overview in the sidebar) rolls every domain,
hosting account, and email up under its client in one expandable table — the
fastest way to see everything one client owns, or to spot anything that
slipped through without a client attached (surfaced as an "Unassigned" group,
expanded by default, when one exists).

## Every domain, hosting account, and email requires a client

Adding a domain, hosting account, or email always prompts for the client it
belongs to — the dropdown has no "Unassigned" option and the field is
required, so nothing can be created without an owner. (Deleting a client
still unassigns their existing records rather than deleting them, so records
created before this requirement — or freed up by a client deletion — can
still show as "Unassigned" until reassigned from the Client Overview or
Client Details page.)

## Renewal urgency logic

Every domain, hosting account, and email has an `expiration_date`.
The badge and color shown for each service is always computed live from
that date (see `src/utils/dates.ts`) — never hardcoded or manually set:

| Days remaining | Badge         | Color                |
| -------------- | ------------- | -------------------- |
| > 21           | Active        | Neutral / green      |
| ≤ 21           | Renewing Soon | Light red            |
| ≤ 14           | Urgent        | Medium red           |
| ≤ 7            | Urgent        | Strong/dark red      |
| Expired        | Expired       | Dark, clearly marked |

## Extending later

- **Admin-only / read-only roles:** a `profiles` table with a `role` column
  already exists and is populated automatically on signup. Tighten the RLS
  policies in `supabase/schema.sql` to check `profiles.role` once a second
  role is needed — no schema migration required.
- **Automated renewal reminders (WhatsApp/SMS/Email):** the `upcoming_renewals`
  SQL view in `supabase/schema.sql` already unions all three service types
  with their expiration dates, ready for a scheduled Supabase Edge Function
  or external cron job to query and notify clients.
- **Custom providers:** every provider field is stored as plain text.
  Choosing "Other" in any provider dropdown reveals a free-text field, so new
  registrars/hosts/email providers never require a code change.
