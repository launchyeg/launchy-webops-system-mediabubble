import { useMemo } from "react";
import { useClients } from "./useClients";
import { useDomains } from "./useDomains";
import { useHosting } from "./useHosting";
import { useEmails } from "./useEmails";
import { useSharedHosting } from "./useSharedHosting";
import { useUsdToEgpRate } from "./useUsdToEgpRate";
import { getRenewalInfo } from "@/utils/dates";
import { applyDiscount, withBankFee } from "@/utils/pricing";
import type { SharedHostingRow, UpcomingRenewal } from "@/types";

export interface ServiceBucketStats {
  total: number;
  expiringSoon: number; // <= 21 days, not expired
  expired: number;
  /** Provider === "Unknown" — no real data was on hand for this row. */
  unknown: number;
}

export interface RenewalWindowStats {
  within30: number;
  within21: number;
  within14: number;
  within7: number;
  expired: number;
}

export interface FinancialStats {
  annualDomainCost: number;
  annualHostingCost: number;
  annualEmailCost: number;
  annualSharedHostingCost: number;
  totalAnnualCost: number;
  upcomingRenewalExpense: number; // sum of annual cost for services due within 30 days
  servicesNeedingRenewal: number; // count due within 30 days (incl. expired)
}

/** One shared hosting plan alongside which clients currently have a
 * "Shared Host"-type hosting account linked to it — the Overview page's
 * "Shared Hosting Usage" section is built directly from this. */
export interface SharedHostingUsage {
  plan: SharedHostingRow;
  clientNames: string[];
}

/** The Overview page's "Financial Analytics" P&L section — all figures in
 * USD, blending in EGP-priced services (Shared Hosting, Lifetime email) via
 * the live exchange rate. `null` while that rate is still loading/
 * unavailable, since these figures can't be blended without it. */
export interface ProfitStats {
  /** Total final price of every domain, (Private + Shared) hosting
   * account, recurring email, and Lifetime email — before any discount. */
  revenueUsd: number;
  /** Same services, after each one's own discount is applied. */
  netRevenueUsd: number;
  /** The mandatory cost the company itself pays: domains'/Private
   * hosting's/recurring emails' own annual_cost, plus every Shared Hosting
   * plan's own annual_cost — each of these including the bank's 5%
   * card-payment fee (see withBankFee in utils/pricing.ts), since each is
   * a direct payment the company makes (the plan's cost is fixed regardless
   * of how many clients are on it — unlike Private hosting, a Shared Host
   * has no per-client commission; its margin is the spread between what
   * clients on it are charged and what the plan itself costs, so its fee
   * isn't recovered from clients the way the others' is). A Lifetime
   * email's lifetime_cost has no bank fee and no tracked cost basis at all
   * — it contributes nothing here. */
  cogsUsd: number;
  /** netRevenueUsd - cogsUsd. */
  grossProfitUsd: number;
  /** Equal to grossProfitUsd — there's no further flat cut applied here.
   * (An earlier flat "Total Taxes" deduction used to reduce this below
   * Gross Profit, but it's been removed: the bank's 5% card fee it was
   * meant to represent is now already priced into each service's own
   * final price — see withBankFee in utils/pricing.ts — rather than
   * approximated as a blanket cut here.) */
  netProfitUsd: number;
}

export function useOverviewData() {
  const clients = useClients();
  const domains = useDomains();
  const hosting = useHosting();
  const emails = useEmails();
  const sharedHostingHook = useSharedHosting();
  const { rate: egpRate } = useUsdToEgpRate();

  const loading =
    clients.loading ||
    domains.loading ||
    hosting.loading ||
    emails.loading ||
    sharedHostingHook.loading;
  const error =
    clients.error || domains.error || hosting.error || emails.error || sharedHostingHook.error;

  const refetch = () => {
    clients.refetch();
    domains.refetch();
    hosting.refetch();
    emails.refetch();
    sharedHostingHook.refetch();
  };

  const bucketStats = (
    rows: { expiration_date: string | null; provider: string }[]
  ): ServiceBucketStats => {
    let expiringSoon = 0;
    let expired = 0;
    let unknown = 0;
    for (const row of rows) {
      if (row.provider === "Unknown") unknown += 1;
      // A lifetime email has no expiration_date and never expires — it
      // still counts toward `total`, just never toward the urgency buckets.
      if (!row.expiration_date) continue;
      const { tier } = getRenewalInfo(row.expiration_date);
      if (tier === "expired") expired += 1;
      else if (tier !== "active") expiringSoon += 1;
    }
    return { total: rows.length, expiringSoon, expired, unknown };
  };

  const domainStats = useMemo(() => bucketStats(domains.domains), [domains.domains]);
  const hostingStats = useMemo(() => bucketStats(hosting.hosting), [hosting.hosting]);
  const emailStats = useMemo(() => bucketStats(emails.emails), [emails.emails]);
  const sharedHostingStats = useMemo(
    () => bucketStats(sharedHostingHook.sharedHosting),
    [sharedHostingHook.sharedHosting]
  );

  const renewalWindowStats = useMemo<RenewalWindowStats>(() => {
    const all = [
      ...domains.domains.map((d) => d.expiration_date),
      ...hosting.hosting.map((h) => h.expiration_date),
      ...emails.emails.map((e) => e.expiration_date),
      ...sharedHostingHook.sharedHosting.map((s) => s.expiration_date),
    ];
    const stats: RenewalWindowStats = {
      within30: 0,
      within21: 0,
      within14: 0,
      within7: 0,
      expired: 0,
    };
    for (const date of all) {
      if (!date) continue; // lifetime email — never expires
      const { daysRemaining } = getRenewalInfo(date);
      if (daysRemaining < 0) stats.expired += 1;
      else {
        if (daysRemaining <= 30) stats.within30 += 1;
        if (daysRemaining <= 21) stats.within21 += 1;
        if (daysRemaining <= 14) stats.within14 += 1;
        if (daysRemaining <= 7) stats.within7 += 1;
      }
    }
    return stats;
  }, [domains.domains, hosting.hosting, emails.emails, sharedHostingHook.sharedHosting]);

  const upcomingRenewals = useMemo<UpcomingRenewal[]>(() => {
    const rows: UpcomingRenewal[] = [
      ...domains.domains.map((d) => ({
        id: d.id,
        kind: "domain" as const,
        clientName: d.client_name ?? "Unassigned",
        serviceName: d.domain_name,
        provider: d.provider,
        expirationDate: d.expiration_date,
        // The final price to the client — base cost (incl. the 5% bank
        // fee) plus the discounted commission, same figure the Domains
        // table/form show as "Final Price" — not the raw pass-through cost.
        annualCost: withBankFee(d.annual_cost) + applyDiscount(d.commission_usd, d.discount_percent),
        renewal: getRenewalInfo(d.expiration_date),
      })),
      ...hosting.hosting.map((h) => ({
        id: h.id,
        kind: "hosting" as const,
        clientName: h.client_name ?? "Unassigned",
        serviceName: h.account_name,
        provider: h.provider,
        expirationDate: h.expiration_date,
        // Final price to the client: Private = base cost (incl. the 5%
        // bank fee) + discounted commission. Shared = its own
        // shared_annual_cost, discounted directly (no commission concept,
        // no bank fee).
        annualCost:
          h.host_type === "shared"
            ? applyDiscount(h.shared_annual_cost, h.discount_percent)
            : withBankFee(h.annual_cost) + applyDiscount(h.commission_usd, h.discount_percent),
        renewal: getRenewalInfo(h.expiration_date),
      })),
      // Lifetime emails have no expiration_date and never renew, so they're
      // excluded from this list entirely rather than given a fake date.
      ...emails.emails
        .filter((e) => e.expiration_date !== null)
        .map((e) => ({
          id: e.id,
          kind: "email" as const,
          clientName: e.client_name ?? "Unassigned",
          serviceName: e.email_account,
          provider: e.provider,
          expirationDate: e.expiration_date!,
          // Final price to the client — base cost (incl. the 5% bank fee)
          // plus the discounted commission (recurring email only; Lifetime
          // is filtered out above).
          annualCost: withBankFee(e.annual_cost) + applyDiscount(e.commission_usd, e.discount_percent),
          renewal: getRenewalInfo(e.expiration_date!),
        })),
      // Shared hosting plans aren't tied to a client, and have no
      // commission/discount concept of their own — annual_cost is already
      // the final figure.
      ...sharedHostingHook.sharedHosting.map((s) => ({
        id: s.id,
        kind: "shared_hosting" as const,
        clientName: "—",
        serviceName: s.name,
        provider: s.provider,
        expirationDate: s.expiration_date,
        annualCost: s.annual_cost,
        renewal: getRenewalInfo(s.expiration_date),
      })),
    ];

    return rows.sort(
      (a, b) => a.renewal.daysRemaining - b.renewal.daysRemaining
    );
  }, [domains.domains, hosting.hosting, emails.emails, sharedHostingHook.sharedHosting]);

  const financials = useMemo<FinancialStats>(() => {
    // Domains, Private hosting, and recurring email all pay the bank's
    // card-payment fee on top of their own annual_cost (see withBankFee in
    // utils/pricing.ts) — a real cost, so it belongs in these Secondary
    // Expenses figures. A "Shared" hosting row's cost lives in
    // shared_annual_cost instead of annual_cost (which is forced to 0 for
    // that row — see HostingRow) and carries no such fee; withBankFee(0) is
    // still 0, so this stays correct for shared rows without a branch. A
    // Lifetime email's lifetime_cost carries no fee either — added raw.
    const emailCost = (e: { annual_cost: number; lifetime_cost: number }) =>
      withBankFee(e.annual_cost) + e.lifetime_cost;

    const annualDomainCost = domains.domains.reduce(
      (acc, d) => acc + withBankFee(d.annual_cost ?? 0),
      0
    );
    const hostingCost = (h: { annual_cost: number; shared_annual_cost: number }) =>
      withBankFee(h.annual_cost) + h.shared_annual_cost;
    const annualHostingCost = hosting.hosting.reduce((acc, h) => acc + hostingCost(h), 0);
    const annualEmailCost = emails.emails.reduce((acc, e) => acc + emailCost(e), 0);
    // A Shared Hosting plan's own annual_cost also pays the bank's 5% fee —
    // it's a direct card payment to the host, same as domains/hosting/email.
    const annualSharedHostingCost = sharedHostingHook.sharedHosting.reduce(
      (acc, s) => acc + withBankFee(s.annual_cost ?? 0),
      0
    );

    // Same set + same 30-day cutoff as the "Upcoming Renewals" table —
    // "Upcoming Renewal Expenses (30d)" is the total of its Final Price
    // (annualCost) column, the price billed to the client, not the raw
    // pass-through cost the Secondary Expenses figures above use.
    const dueSoon = upcomingRenewals.filter((r) => r.renewal.daysRemaining <= 30);
    const upcomingRenewalExpense = dueSoon.reduce((sum, r) => sum + r.annualCost, 0);
    const servicesNeedingRenewal = dueSoon.length;

    return {
      annualDomainCost,
      annualHostingCost,
      annualEmailCost,
      annualSharedHostingCost,
      totalAnnualCost:
        annualDomainCost + annualHostingCost + annualEmailCost + annualSharedHostingCost,
      upcomingRenewalExpense,
      servicesNeedingRenewal,
    };
  }, [domains.domains, hosting.hosting, emails.emails, sharedHostingHook.sharedHosting, upcomingRenewals]);

  const profitStats = useMemo<ProfitStats | null>(() => {
    if (egpRate === null) return null; // can't blend USD + EGP without it yet

    const recurringEmails = emails.emails.filter((e) => !e.is_lifetime);
    const lifetimeEmails = emails.emails.filter((e) => e.is_lifetime);
    const privateHosting = hosting.hosting.filter((h) => h.host_type !== "shared");
    const sharedHostingAccounts = hosting.hosting.filter((h) => h.host_type === "shared");

    // Domain, Private hosting, and recurring email: the client pays
    // annual_cost + commission — annual_cost is a pass-through cost, the
    // commission alone is our margin. All three also pass through the
    // bank's 5% card-payment fee on top of annual_cost (see withBankFee in
    // utils/pricing.ts) — it's added into this same field before
    // revenue/COGS are summed below, so it lands in both equally and never
    // affects Gross/Net Profit: it's a real cost fully billed to the
    // client, not company margin.
    type Commissioned = { annual_cost: number; commission_usd: number; discount_percent: number };
    const domainsWithFee = domains.domains.map((d) => ({
      ...d,
      annual_cost: withBankFee(d.annual_cost),
    }));
    const privateHostingWithFee = privateHosting.map((h) => ({
      ...h,
      annual_cost: withBankFee(h.annual_cost),
    }));
    const recurringEmailsWithFee = recurringEmails.map((e) => ({
      ...e,
      annual_cost: withBankFee(e.annual_cost),
    }));
    const grossUsd = (rows: Commissioned[]) =>
      rows.reduce((sum, r) => sum + r.annual_cost + r.commission_usd, 0);
    const netUsd = (rows: Commissioned[]) =>
      rows.reduce(
        (sum, r) => sum + r.annual_cost + applyDiscount(r.commission_usd, r.discount_percent),
        0
      );
    const costUsd = (rows: { annual_cost: number }[]) =>
      rows.reduce((sum, r) => sum + r.annual_cost, 0);

    const directRevenueUsd =
      grossUsd(domainsWithFee) + grossUsd(privateHostingWithFee) + grossUsd(recurringEmailsWithFee);
    const directNetRevenueUsd =
      netUsd(domainsWithFee) + netUsd(privateHostingWithFee) + netUsd(recurringEmailsWithFee);
    const directCogsUsd =
      costUsd(domainsWithFee) + costUsd(privateHostingWithFee) + costUsd(recurringEmailsWithFee);

    // Shared Hosting: no per-client commission — the margin is the spread
    // between what clients on a plan are charged (their own USD
    // shared_annual_cost, set independently by staff — not derived from
    // the plan's own cost, so there's no formula to pass the fee through
    // into it) and what the plan itself costs the company
    // (shared_hosting.annual_cost, which — like domains/hosting/email —
    // also pays the bank's 5% card fee). Unlike those other services, this
    // fee isn't automatically recovered from clients here, so it genuinely
    // shrinks this margin rather than netting out.
    const sharedRevenueUsd = sharedHostingAccounts.reduce(
      (sum, h) => sum + h.shared_annual_cost,
      0
    );
    const sharedNetRevenueUsd = sharedHostingAccounts.reduce(
      (sum, h) => sum + applyDiscount(h.shared_annual_cost, h.discount_percent),
      0
    );
    const sharedCogsUsd = sharedHostingHook.sharedHosting.reduce(
      (sum, s) => sum + withBankFee(s.annual_cost),
      0
    );

    // Lifetime email: a one-time USD payment (its own lifetime_cost
    // field), no bank fee, no commission, and no tracked cost basis of its
    // own (unlike Shared Hosting, there's no separate "plan" entity to
    // pull a cost from) — its full (discounted) value flows straight into
    // revenue, with nothing offsetting it in COGS.
    const lifetimeRevenueUsd = lifetimeEmails.reduce((sum, e) => sum + e.lifetime_cost, 0);
    const lifetimeNetRevenueUsd = lifetimeEmails.reduce(
      (sum, e) => sum + applyDiscount(e.lifetime_cost, e.discount_percent),
      0
    );

    const revenueUsd = directRevenueUsd + sharedRevenueUsd + lifetimeRevenueUsd;
    const netRevenueUsd = directNetRevenueUsd + sharedNetRevenueUsd + lifetimeNetRevenueUsd;
    const cogsUsd = directCogsUsd + sharedCogsUsd;
    const grossProfitUsd = netRevenueUsd - cogsUsd;
    // No further cut here — see the netProfitUsd doc comment above.
    const netProfitUsd = grossProfitUsd;

    return { revenueUsd, netRevenueUsd, cogsUsd, grossProfitUsd, netProfitUsd };
  }, [domains.domains, hosting.hosting, emails.emails, sharedHostingHook.sharedHosting, egpRate]);

  // For each shared hosting plan, which clients currently have a
  // "Shared Host"-type hosting account linked to it — drives the
  // Overview page's "Shared Hosting Usage" section.
  const sharedHostingUsage = useMemo<SharedHostingUsage[]>(() => {
    return sharedHostingHook.sharedHosting.map((plan) => {
      const clientNames = Array.from(
        new Set(
          hosting.hosting
            .filter((h) => h.host_type === "shared" && h.shared_hosting_id === plan.id)
            .map((h) => h.client_name ?? "Unassigned")
        )
      ).sort();
      return { plan, clientNames };
    });
  }, [sharedHostingHook.sharedHosting, hosting.hosting]);

  return {
    loading,
    error,
    refetch,
    totalClients: clients.clients.length,
    domainStats,
    hostingStats,
    emailStats,
    sharedHostingStats,
    renewalWindowStats,
    financials,
    upcomingRenewals,
    sharedHostingUsage,
    profitStats,
    egpRate,
  };
}
