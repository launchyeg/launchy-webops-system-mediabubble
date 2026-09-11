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
  | "HostGator"
  | "Bluehost"
  | "Cloudflare"
  | "Other";

export type HostingProvider =
  | "Hostinger"
  | "GoDaddy"
  | "Namecheap"
  | "HostGator"
  | "Bluehost"
  | "Cloudflare"
  | "Other";

export type EmailProvider =
  | "Zoho Mail"
  | "Hostinger Email"
  | "Google Workspace"
  | "Microsoft 365"
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
  /** The company's commission for managing this domain, in USD. Purely
   * informational — displayed as the final price sent to the client
   * (annual_cost + commission_usd); nothing derives logic from it. */
  commission_usd: number;
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
  /** The company's commission for managing this hosting account, in USD.
   * Purely informational — displayed as the final price sent to the client
   * (annual_cost + commission_usd); nothing derives logic from it. */
  commission_usd: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type HostingInsert = Omit<
  HostingRow,
  "id" | "created_at" | "updated_at"
>;
export type HostingUpdate = Partial<HostingInsert>;

/** One link row in the hosting_domains join table — a hosting account can
 * link to any number of the same client's domains (a shared hosting
 * account often serves several), edited as a repeatable "+ Add Domain"
 * list in the Add/Edit Hosting form. */
export type HostingDomainRow = {
  id: string;
  hosting_id: string;
  domain_id: string;
  created_at: string;
};

export type HostingDomainInsert = Omit<HostingDomainRow, "id" | "created_at">;

/** One mailbox created under an email service account (e.g. a single
 * user@client.com inbox under a Google Workspace subscription). Stored as a
 * JSON array on the parent EmailRow since a service account can hold any
 * number of these, entered/edited together as a repeatable field group. */
export type EmailMailbox = {
  email: string;
  password: string;
  storage: string;
};

export type EmailRow = {
  id: string;
  client_id: string | null;
  /** Links this email service to one of the same client's domains, used
   * purely by the Add/Edit Email form to auto-append "@<domain>" while
   * typing mailbox local parts. Nothing else in the app reads it. */
  domain_id: string | null;
  provider: string;
  email_account: string;
  status: ServiceStatus;
  /** Null only when is_lifetime is true — a lifetime email service was paid
   * for once and never expires, so it has no renewal date. */
  expiration_date: string | null;
  /** True for a one-time purchase with no expiration_date; its cost lives
   * in lifetime_cost_egp instead of annual_cost, and it's excluded from all
   * renewal tracking and from the USD annual-cost dashboard totals. */
  is_lifetime: boolean;
  auto_renewal: boolean;
  account_email: string | null;
  /** "Email Cost": the recurring annual cost in USD. Used only when
   * is_lifetime is false (0 for lifetime rows). */
  annual_cost: number;
  /** The company's commission for managing this email service, in USD.
   * Purely informational — displayed as the final price sent to the client
   * (annual_cost + commission_usd). Used only when is_lifetime is false. */
  commission_usd: number;
  /** The one-time cost for a lifetime purchase, entered directly in EGP.
   * Used only when is_lifetime is true. */
  lifetime_cost_egp: number;
  mailboxes: EmailMailbox[];
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
      hosting_domains: {
        Row: HostingDomainRow;
        Insert: HostingDomainInsert;
        Update: Partial<HostingDomainInsert>;
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
