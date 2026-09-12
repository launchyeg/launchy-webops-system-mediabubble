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
];

export const HOSTING_PROVIDERS: HostingProvider[] = [
  "Hostinger",
  "GoDaddy",
  "Namecheap",
  "HostGator",
  "Bluehost",
  "Cloudflare",
  "Other",
];

export const EMAIL_PROVIDERS: EmailProvider[] = [
  "Zoho Mail",
  "Hostinger Email",
  "Google Workspace",
  "Microsoft 365",
  "Other",
];

export const RENEWAL_WINDOWS = [30, 21, 14, 7] as const;

/** The percentage deducted from Gross Profit to arrive at Net Profit, on
 * the Overview page's "Financial Analytics" section. Change this single
 * number whenever the actual rate changes. */
export const NET_PROFIT_DEDUCTION_PERCENT = 5;
