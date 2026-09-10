import type { DomainProvider, EmailProvider, HostingProvider } from "@/types";

/** Preset dropdown options per service type. "Other" reveals a free-text
 * field so custom providers can be entered without any code or schema
 * changes — `provider` is stored as plain text on every service row. */
export const DOMAIN_PROVIDERS: DomainProvider[] = [
  "Hostinger",
  "GoDaddy",
  "Namecheap",
  "Cloudflare",
  "Other",
];

export const HOSTING_PROVIDERS: HostingProvider[] = [
  "Hostinger",
  "GoDaddy",
  "Namecheap",
  "HostGator",
  "Bluehost",
  "Other",
];

export const EMAIL_PROVIDERS: EmailProvider[] = [
  "Google Workspace",
  "Microsoft 365",
  "Zoho Mail",
  "Hostinger Email",
  "Other",
];

export const RENEWAL_WINDOWS = [30, 21, 14, 7] as const;
