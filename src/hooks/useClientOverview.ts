import { useMemo } from "react";
import { useClients } from "./useClients";
import { useDomains } from "./useDomains";
import { useHosting } from "./useHosting";
import { useEmails } from "./useEmails";
import { getRenewalInfo } from "@/utils/dates";
import { applyDiscount } from "@/utils/pricing";
import type {
  ClientWithCounts,
  DomainWithClient,
  HostingWithClient,
  EmailWithClient,
  RenewalTier,
} from "@/types";

// Worst-first ordering, same as clients.service.ts — the most urgent tier
// among a client's services drives their rolled-up status.
const TIER_SEVERITY: Record<RenewalTier, number> = {
  expired: 4,
  urgent: 3,
  warning: 2,
  soon: 1,
  active: 0,
};

/** One client (or the synthetic "Unassigned" bucket for `client: null`) with
 * every domain, hosting account, and email linked to it — the data source
 * for the Client Overview page's expandable, per-client rollup table. */
export interface ClientOverviewGroup {
  client: ClientWithCounts | null;
  domains: DomainWithClient[];
  hosting: HostingWithClient[];
  emails: EmailWithClient[];
  serviceCount: number;
  /** Sum of every USD-priced service's final price (base + commission):
   * domains, Private hosting, Shared hosting (discounted annual_cost, no
   * commission), and recurring (non-Lifetime) email. A Lifetime email's
   * one-time cost is excluded — it's not a recurring annual cost. */
  totalAnnualCostUsd: number;
  worstTier: RenewalTier | null;
}

export function useClientOverview() {
  const clients = useClients();
  const domains = useDomains();
  const hosting = useHosting();
  const emails = useEmails();

  const loading =
    clients.loading || domains.loading || hosting.loading || emails.loading;
  const error = clients.error || domains.error || hosting.error || emails.error;

  const refetch = () => {
    clients.refetch();
    domains.refetch();
    hosting.refetch();
    emails.refetch();
  };

  const groups = useMemo<ClientOverviewGroup[]>(() => {
    const emptyGroup = (client: ClientWithCounts | null): ClientOverviewGroup => ({
      client,
      domains: [],
      hosting: [],
      emails: [],
      serviceCount: 0,
      totalAnnualCostUsd: 0,
      worstTier: null,
    });

    const byClientId = new Map<string, ClientOverviewGroup>();
    for (const c of clients.clients) byClientId.set(c.id, emptyGroup(c));
    const unassigned = emptyGroup(null);

    const bucketFor = (clientId: string | null) =>
      clientId && byClientId.has(clientId) ? byClientId.get(clientId)! : unassigned;

    domains.domains.forEach((d) => bucketFor(d.client_id).domains.push(d));
    hosting.hosting.forEach((h) => bucketFor(h.client_id).hosting.push(h));
    emails.emails.forEach((e) => bucketFor(e.client_id).emails.push(e));

    const finalize = (g: ClientOverviewGroup) => {
      const rows = [
        ...g.domains.map((d) => ({ expiration_date: d.expiration_date })),
        ...g.hosting.map((h) => ({ expiration_date: h.expiration_date })),
        ...g.emails.map((e) => ({ expiration_date: e.expiration_date })),
      ];
      g.serviceCount = rows.length;

      const privateHosting = g.hosting.filter((h) => h.host_type !== "shared");
      const sharedHosting = g.hosting.filter((h) => h.host_type === "shared");
      const recurringEmails = g.emails.filter((e) => !e.is_lifetime);

      g.totalAnnualCostUsd =
        g.domains.reduce(
          (sum, d) => sum + d.annual_cost + applyDiscount(d.commission_usd, d.discount_percent),
          0
        ) +
        privateHosting.reduce(
          (sum, h) => sum + h.annual_cost + applyDiscount(h.commission_usd, h.discount_percent),
          0
        ) +
        // Shared hosting has no commission concept — its own
        // shared_annual_cost field, discounted directly.
        sharedHosting.reduce(
          (sum, h) => sum + applyDiscount(h.shared_annual_cost, h.discount_percent),
          0
        ) +
        recurringEmails.reduce(
          (sum, e) => sum + e.annual_cost + applyDiscount(e.commission_usd, e.discount_percent),
          0
        );

      // A lifetime email (null expiration_date) never contributes to the
      // worst tier, but its mere presence still means this client has at
      // least an "active" service, not "no services" — hence starting the
      // reduce at "active" whenever there's at least one row, rather than
      // starting at null and leaving it null for an all-lifetime client.
      g.worstTier =
        rows.length === 0
          ? null
          : rows.reduce<RenewalTier>((worst, r) => {
              if (!r.expiration_date) return worst;
              const tier = getRenewalInfo(r.expiration_date).tier;
              return TIER_SEVERITY[tier] > TIER_SEVERITY[worst] ? tier : worst;
            }, "active");
    };

    const clientGroups = Array.from(byClientId.values());
    clientGroups.forEach(finalize);
    finalize(unassigned);

    clientGroups.sort((a, b) => a.client!.client_name.localeCompare(b.client!.client_name));

    // Only surface the "Unassigned" bucket when it actually has orphaned
    // services — most projects should never see it.
    return unassigned.serviceCount > 0 ? [...clientGroups, unassigned] : clientGroups;
  }, [clients.clients, domains.domains, hosting.hosting, emails.emails]);

  return { loading, error, refetch, groups };
}
