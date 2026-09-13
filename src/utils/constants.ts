import type { DomainProvider, EmailProvider, HostingProvider } from "@/types";

/** Preset dropdown options per service type. "Other" reveals a free-text
 * field so custom providers can be entered without any code or schema
 * changes — `provider` is stored as plain text on every service row. */
export const DOMAIN_PROVIDERS: DomainProvider[] = [
  "Hostinger",
  "GoDaddy",
  "Namecheap",
  "HostGator",
  "Bluehost",
  "Cloudflare",
  "Other",
  "Unknown",
];

export const HOSTING_PROVIDERS: HostingProvider[] = [
  "Hostinger",
  "GoDaddy",
  "Namecheap",
  "HostGator",
  "Bluehost",
  "Cloudflare",
  "Other",
  "Unknown",
];

export const EMAIL_PROVIDERS: EmailProvider[] = [
  "Zoho Mail",
  "Hostinger Email",
  "Google Workspace",
  "Microsoft 365",
  "Other",
];

export const RENEWAL_WINDOWS = [30, 21, 14, 7] as const;

/** The bank's card-payment fee, charged whenever the company pays a
 * registrar or hosting/email provider directly — a real cost on top of the
 * listed price, not company markup. Folded into a domain's annual_cost, a
 * Private hosting account's annual_cost, a Shared Hosting plan's own
 * annual_cost, or a recurring email's annual_cost (see `withBankFee` in
 * utils/pricing.ts) wherever Final Price, Secondary Expenses, or Financial
 * Analytics figures are derived from it, so the client is billed for it
 * and it counts as a genuine cost (COGS) rather than profit. Does not
 * apply to a Lifetime email's lifetime_cost (a one-time purchase, no bank
 * fee) or to Shared hosting's client-billed shared_annual_cost (paid
 * differently — see withBankFee's own doc comment for why). */
export const BANK_FEE_PERCENT = 5;
