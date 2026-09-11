import type {
  ClientRow,
  DomainRow,
  HostingRow,
  EmailRow,
} from "./database";

export * from "./database";

export type ServiceKind = "domain" | "hosting" | "email" | "shared_hosting";

/** The precise, always-fresh renewal urgency tier computed from
 * expiration_date, independent of the cached `status` column. */
export type RenewalTier = "active" | "soon" | "warning" | "urgent" | "expired";

/** A client row enriched with counts of its services, used on the Clients
 * table and Client Details page. `worstRenewalTier` is the most urgent
 * renewal tier across all of the client's services (or null if they have
 * none yet) and drives the table's Status badge. */
export interface ClientWithCounts extends ClientRow {
  domain_count: number;
  hosting_count: number;
  email_count: number;
  worstRenewalTier: RenewalTier | null;
}

export interface RenewalInfo {
  tier: RenewalTier;
  label: string;
  daysRemaining: number;
}

/** A unified shape used to render the Overview page's "Upcoming Renewals"
 * table across all three service kinds. */
export interface UpcomingRenewal {
  id: string;
  kind: ServiceKind;
  clientName: string;
  serviceName: string;
  provider: string;
  expirationDate: string;
  annualCost: number;
  renewal: RenewalInfo;
}

export type AnyServiceRow = DomainRow | HostingRow | EmailRow;

/** A service row flattened with its owning client's name, as returned by
 * the service-layer list functions (via a Supabase foreign-table select). */
export type WithClientName<T> = T & { client_name: string | null };

export type DomainWithClient = WithClientName<DomainRow>;
export type HostingWithClient = WithClientName<HostingRow>;
export type EmailWithClient = WithClientName<EmailRow>;
