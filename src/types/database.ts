/**
 * Hand-written types mirroring the Supabase Postgres schema in
 * supabase/schema.sql. If you regenerate types with the Supabase CLI
 * (`supabase gen types typescript`), this file's shape is compatible with
 * that output — the app only relies on the `Database` generic surface.
 */

/** Coarse status cached on each service row. The UI always recomputes the
 * precise renewal urgency (Active / Renewing Soon / Urgent / Expired) from
 * `expiration_date` at render time — this column exists so future
 * server-side jobs (renewal reminders, reporting) can query by status
 * without recomputing dates in SQL. */
export type ServiceStatus = "active" | "expiring_soon" | "expired";

export type DomainProvider =
  | "Hostinger"
  | "GoDaddy"
  | "Namecheap"
  | "Cloudflare"
  | "Other";

export type HostingProvider =
  | "Hostinger"
  | "GoDaddy"
  | "Namecheap"
  | "HostGator"
  | "Bluehost"
  | "Other";

export type EmailProvider =
  | "Google Workspace"
  | "Microsoft 365"
  | "Zoho Mail"
  | "Hostinger Email"
  | "Other";

// Note: these are declared with `type`, not `interface`. @supabase/postgrest-js
// checks each table's Row/Insert/Update against `Record<string, unknown>` via
// a conditional-type `extends` — and TypeScript only considers a `type`
// alias's object shape structurally assignable to an index-signature type
// this way, not an `interface`'s (interfaces support declaration merging, so
// the compiler won't assume their shape is closed). Using `interface` here
// silently breaks all typed `.insert()`/`.update()`/`.select()` calls.
export type ClientRow = {
  id: string;
  client_name: string;
  agency_name: string | null;
  email: string | null;
  phone: string | null;
  start_project_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientInsert = Omit<ClientRow, "id" | "created_at" | "updated_at">;
export type ClientUpdate = Partial<ClientInsert>;

export type DomainRow = {
  id: string;
  client_id: string | null;
  domain_name: string;
  provider: string;
  status: ServiceStatus;
  expiration_date: string;
  auto_renewal: boolean;
  account_email: string | null;
  annual_cost: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DomainInsert = Omit<DomainRow, "id" | "created_at" | "updated_at">;
export type DomainUpdate = Partial<DomainInsert>;

export type HostingRow = {
  id: string;
  client_id: string | null;
  provider: string;
  account_name: string;
  status: ServiceStatus;
  expiration_date: string;
  auto_renewal: boolean;
  account_email: string | null;
  annual_cost: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type HostingInsert = Omit<HostingRow, "id" | "created_at" | "updated_at">;
export type HostingUpdate = Partial<HostingInsert>;

export type EmailRow = {
  id: string;
  client_id: string | null;
  provider: string;
  email_account: string;
  status: ServiceStatus;
  expiration_date: string;
  auto_renewal: boolean;
  account_email: string | null;
  annual_cost: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailInsert = Omit<EmailRow, "id" | "created_at" | "updated_at">;
export type EmailUpdate = Partial<EmailInsert>;

/** Reserved for future role-based access (e.g. "admin" vs a future
 * read-only collaborator role) without needing schema changes. */
export type ProfileRow = {
  id: string;
  role: "admin" | "member";
  full_name: string | null;
  created_at: string;
};

// Minimal Supabase-client-compatible Database surface. `Relationships: []`
// is required by @supabase/postgrest-js's GenericTable shape even though we
// don't rely on typed foreign-table joins (see the services/*.service.ts
// files, which cast joined rows manually).
export type Database = {
  public: {
    Tables: {
      clients: {
        Row: ClientRow;
        Insert: ClientInsert;
        Update: ClientUpdate;
        Relationships: [];
      };
      domains: {
        Row: DomainRow;
        Insert: DomainInsert;
        Update: DomainUpdate;
        Relationships: [];
      };
      hosting: {
        Row: HostingRow;
        Insert: HostingInsert;
        Update: HostingUpdate;
        Relationships: [];
      };
      emails: {
        Row: EmailRow;
        Insert: EmailInsert;
        Update: EmailUpdate;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
