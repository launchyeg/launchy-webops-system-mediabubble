import { useMemo } from "react";
import { useClients } from "./useClients";
import { useDomains } from "./useDomains";
import { useHosting } from "./useHosting";
import { useEmails } from "./useEmails";
import { getRenewalInfo } from "@/utils/dates";
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
  totalAnnualCost: number;
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
      totalAnnualCost: 0,
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
        ...g.domains.map((d) => ({ expiration_date: d.expiration_date, annual_cost: d.annual_cost })),
        ...g.hosting.map((h) => ({ expiration_date: h.expiration_date, annual_cost: h.annual_cost })),
        ...g.emails.map((e) => ({ expiration_date: e.expiration_date, annual_cost: e.annual_cost })),
      ];
      g.serviceCount = rows.length;
      g.totalAnnualCost = rows.reduce((sum, r) => sum + (r.annual_cost ?? 0), 0);
      g.worstTier = rows.reduce<RenewalTier | null>((worst, r) => {
        const tier = getRenewalInfo(r.expiration_date).tier;
        if (!worst || TIER_SEVERITY[tier] > TIER_SEVERITY[worst]) return tier;
        return worst;
      }, null);
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
