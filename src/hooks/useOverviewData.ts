import { useMemo } from "react";
import { useClients } from "./useClients";
import { useDomains } from "./useDomains";
import { useHosting } from "./useHosting";
import { useEmails } from "./useEmails";
import { getRenewalInfo } from "@/utils/dates";
import type { UpcomingRenewal } from "@/types";

export interface ServiceBucketStats {
  total: number;
  expiringSoon: number; // <= 21 days, not expired
  expired: number;
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
  totalAnnualCost: number;
  upcomingRenewalExpense: number; // sum of annual cost for services due within 30 days
  servicesNeedingRenewal: number; // count due within 30 days (incl. expired)
}

export function useOverviewData() {
  const clients = useClients();
  const domains = useDomains();
  const hosting = useHosting();
  const emails = useEmails();

  const loading =
    clients.loading || domains.loading || hosting.loading || emails.loading;
  const error =
    clients.error || domains.error || hosting.error || emails.error;

  const refetch = () => {
    clients.refetch();
    domains.refetch();
    hosting.refetch();
    emails.refetch();
  };

  const bucketStats = (
    rows: { expiration_date: string }[]
  ): ServiceBucketStats => {
    let expiringSoon = 0;
    let expired = 0;
    for (const row of rows) {
      const { tier } = getRenewalInfo(row.expiration_date);
      if (tier === "expired") expired += 1;
      else if (tier !== "active") expiringSoon += 1;
    }
    return { total: rows.length, expiringSoon, expired };
  };

  const domainStats = useMemo(() => bucketStats(domains.domains), [domains.domains]);
  const hostingStats = useMemo(() => bucketStats(hosting.hosting), [hosting.hosting]);
  const emailStats = useMemo(() => bucketStats(emails.emails), [emails.emails]);

  const renewalWindowStats = useMemo<RenewalWindowStats>(() => {
    const all = [
      ...domains.domains.map((d) => d.expiration_date),
      ...hosting.hosting.map((h) => h.expiration_date),
      ...emails.emails.map((e) => e.expiration_date),
    ];
    const stats: RenewalWindowStats = {
      within30: 0,
      within21: 0,
      within14: 0,
      within7: 0,
      expired: 0,
    };
    for (const date of all) {
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
  }, [domains.domains, hosting.hosting, emails.emails]);

  const financials = useMemo<FinancialStats>(() => {
    const sum = (rows: { annual_cost: number }[]) =>
      rows.reduce((acc, r) => acc + (r.annual_cost ?? 0), 0);

    const annualDomainCost = sum(domains.domains);
    const annualHostingCost = sum(hosting.hosting);
    const annualEmailCost = sum(emails.emails);

    const allWithCost = [
      ...domains.domains.map((d) => ({
        expiration_date: d.expiration_date,
        annual_cost: d.annual_cost,
      })),
      ...hosting.hosting.map((h) => ({
        expiration_date: h.expiration_date,
        annual_cost: h.annual_cost,
      })),
      ...emails.emails.map((e) => ({
        expiration_date: e.expiration_date,
        annual_cost: e.annual_cost,
      })),
    ];

    let upcomingRenewalExpense = 0;
    let servicesNeedingRenewal = 0;
    for (const row of allWithCost) {
      const { daysRemaining } = getRenewalInfo(row.expiration_date);
      if (daysRemaining <= 30) {
        upcomingRenewalExpense += row.annual_cost ?? 0;
        servicesNeedingRenewal += 1;
      }
    }

    return {
      annualDomainCost,
      annualHostingCost,
      annualEmailCost,
      totalAnnualCost: annualDomainCost + annualHostingCost + annualEmailCost,
      upcomingRenewalExpense,
      servicesNeedingRenewal,
    };
  }, [domains.domains, hosting.hosting, emails.emails]);

  const upcomingRenewals = useMemo<UpcomingRenewal[]>(() => {
    const rows: UpcomingRenewal[] = [
      ...domains.domains.map((d) => ({
        id: d.id,
        kind: "domain" as const,
        clientName: d.client_name ?? "Unassigned",
        serviceName: d.domain_name,
        provider: d.provider,
        expirationDate: d.expiration_date,
        annualCost: d.annual_cost,
        renewal: getRenewalInfo(d.expiration_date),
      })),
      ...hosting.hosting.map((h) => ({
        id: h.id,
        kind: "hosting" as const,
        clientName: h.client_name ?? "Unassigned",
        serviceName: h.account_name,
        provider: h.provider,
        expirationDate: h.expiration_date,
        annualCost: h.annual_cost,
        renewal: getRenewalInfo(h.expiration_date),
      })),
      ...emails.emails.map((e) => ({
        id: e.id,
        kind: "email" as const,
        clientName: e.client_name ?? "Unassigned",
        serviceName: e.email_account,
        provider: e.provider,
        expirationDate: e.expiration_date,
        annualCost: e.annual_cost,
        renewal: getRenewalInfo(e.expiration_date),
      })),
    ];

    return rows.sort(
      (a, b) => a.renewal.daysRemaining - b.renewal.daysRemaining
    );
  }, [domains.domains, hosting.hosting, emails.emails]);

  return {
    loading,
    error,
    refetch,
    totalClients: clients.clients.length,
    domainStats,
    hostingStats,
    emailStats,
    renewalWindowStats,
    financials,
    upcomingRenewals,
  };
}
