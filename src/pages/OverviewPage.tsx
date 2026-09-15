import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  DollarSign,
  Globe,
  Mail,
  Server,
  Share2,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { PageTransition } from "@/components/shared/PageTransition";
import { StatCard } from "@/components/overview/StatCard";
import {
  FinancialBreakdownCard,
  type BreakdownItem,
} from "@/components/overview/FinancialBreakdownCard";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { StatCardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useOverviewData, type ProfitLineItem } from "@/hooks/useOverviewData";
import { formatCurrency, formatEgp } from "@/utils/format";
import { getRenewalInfo, formatDate, daysRemainingLabel } from "@/utils/dates";
import { withBankFee } from "@/utils/pricing";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  domain: Globe,
  hosting: Server,
  email: Mail,
  shared_hosting: Share2,
} as const;
const KIND_ROUTE = {
  domain: "/domains",
  hosting: "/hosting",
  email: "/emails",
  shared_hosting: "/shared-hosting",
} as const;

export default function OverviewPage() {
  const {
    loading,
    totalClients,
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
  } = useOverviewData();
  const navigate = useNavigate();

  // EGP-primary, "≈ $USD" secondary display for the Secondary Expenses
  // stat cards, matching the Financial Analytics cards' treatment.
  const egpValue = (usd: number) =>
    egpRate !== null ? formatEgp(usd * egpRate) : formatCurrency(usd);
  const egpSubtext = (usd: number) =>
    egpRate !== null ? `≈ ${formatCurrency(usd)}` : undefined;

  // Same 30-day cutoff as "Upcoming Renewal Expenses (30d)" /
  // "Services Requiring Renewal (30d)" above — the table below shows
  // exactly the services that make up those two figures.
  const dueSoon = upcomingRenewals.filter((r) => r.renewal.daysRemaining <= 30);

  // Per-card breakdown lists for the Financial Analytics section — each
  // filtered to only the services that actually contribute to that card's
  // figure, and sorted so the biggest contributor (or, for the profit
  // cards, the biggest loss) is easiest to spot first.
  const profitStatsLineItems = profitStats?.lineItems ?? [];
  const toBreakdownItem = (
    item: ProfitLineItem,
    amountUsd: number,
  ): BreakdownItem => ({
    id: item.id,
    serviceName: item.serviceName,
    clientName: item.clientName,
    kind: item.kind,
    amountUsd,
  });
  const revenueItems = profitStatsLineItems
    .filter((item) => item.revenueUsd !== 0)
    .map((item) => toBreakdownItem(item, item.revenueUsd))
    .sort((a, b) => b.amountUsd - a.amountUsd);
  const netRevenueItems = profitStatsLineItems
    .filter((item) => item.revenueUsd !== 0)
    .map((item) => toBreakdownItem(item, item.netRevenueUsd))
    .sort((a, b) => b.amountUsd - a.amountUsd);
  const cogsItems = profitStatsLineItems
    .filter((item) => item.cogsUsd !== 0)
    .map((item) => toBreakdownItem(item, item.cogsUsd))
    .sort((a, b) => b.amountUsd - a.amountUsd);
  // Gross Profit and Net Profit are always equal here (see ProfitStats'
  // own doc comment), so both cards share this same list — sorted
  // ascending, worst (most negative) contributor first, since that's the
  // one most worth investigating.
  const marginItems = profitStatsLineItems
    .map((item) => toBreakdownItem(item, item.marginUsd))
    .sort((a, b) => a.amountUsd - b.amountUsd);

  return (
    <PageTransition>
      <div className="flex flex-col gap-8">
        {/* Top-level totals */}
        <section>
          <SectionHeading title="Business at a Glance" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))
            ) : (
              <>
                <StatCard
                  label="Total Clients"
                  value={totalClients}
                  icon={Users}
                  index={0}
                />
                <StatCard
                  label="Total Domains"
                  value={domainStats.total}
                  icon={Globe}
                  index={1}
                  subtext={`${domainStats.expiringSoon} expiring soon · ${domainStats.expired} expired · ${domainStats.unknown} unknown`}
                />
                <StatCard
                  label="Total Hosting Accounts"
                  value={hostingStats.total}
                  icon={Server}
                  index={2}
                  subtext={`${hostingStats.expiringSoon} expiring soon · ${hostingStats.expired} expired · ${hostingStats.unknown} unknown`}
                />
                <StatCard
                  label="Total Email Accounts"
                  value={emailStats.total}
                  icon={Mail}
                  index={3}
                  subtext={`${emailStats.expiringSoon} expiring soon · ${emailStats.expired} expired`}
                />
                <StatCard
                  label="Shared Hosting Plans"
                  value={sharedHostingStats.total}
                  icon={Share2}
                  index={4}
                  subtext={`${sharedHostingStats.expiringSoon} expiring soon · ${sharedHostingStats.expired} expired`}
                />
              </>
            )}
          </div>
        </section>

        {/* Renewal windows */}
        <section>
          <SectionHeading
            title="Renewals Due"
            description="How many services need attention, by urgency window"
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))
            ) : (
              <>
                <StatCard
                  label="Within 30 Days"
                  value={renewalWindowStats.within30}
                  icon={CalendarClock}
                  index={0}
                />
                <StatCard
                  label="Within 21 Days"
                  value={renewalWindowStats.within21}
                  icon={CalendarClock}
                  tone="amber"
                  index={1}
                />
                <StatCard
                  label="Within 14 Days"
                  value={renewalWindowStats.within14}
                  icon={AlertTriangle}
                  tone="amber"
                  index={2}
                />
                <StatCard
                  label="Within 7 Days"
                  value={renewalWindowStats.within7}
                  icon={AlertTriangle}
                  tone="red"
                  index={3}
                />
                <StatCard
                  label="Already Expired"
                  value={renewalWindowStats.expired}
                  icon={XCircle}
                  tone="red"
                  index={4}
                />
              </>
            )}
          </div>
        </section>

        {/* Financial Analytics */}
        <section>
          <SectionHeading
            title="Financial Analytics"
            description="Revenue, cost, and profit across every client service"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {loading || !profitStats ? (
              Array.from({ length: 5 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))
            ) : (
              <>
                <FinancialBreakdownCard
                  label="Total Revenue"
                  value={
                    egpRate !== null
                      ? formatEgp(profitStats.revenueUsd * egpRate)
                      : formatCurrency(profitStats.revenueUsd)
                  }
                  icon={DollarSign}
                  index={0}
                  subtext={
                    egpRate !== null
                      ? `≈ ${formatCurrency(profitStats.revenueUsd)}`
                      : undefined
                  }
                  items={revenueItems}
                />
                <FinancialBreakdownCard
                  label="Net Revenue"
                  value={
                    egpRate !== null
                      ? formatEgp(profitStats.netRevenueUsd * egpRate)
                      : formatCurrency(profitStats.netRevenueUsd)
                  }
                  icon={DollarSign}
                  index={1}
                  subtext={
                    egpRate !== null
                      ? `≈ ${formatCurrency(profitStats.netRevenueUsd)}`
                      : undefined
                  }
                  items={netRevenueItems}
                />
                <FinancialBreakdownCard
                  label="COGS"
                  value={
                    egpRate !== null
                      ? formatEgp(profitStats.cogsUsd * egpRate)
                      : formatCurrency(profitStats.cogsUsd)
                  }
                  icon={Wallet}
                  index={2}
                  subtext={
                    egpRate !== null
                      ? `≈ ${formatCurrency(profitStats.cogsUsd)}`
                      : undefined
                  }
                  items={cogsItems}
                />
                <FinancialBreakdownCard
                  label="Gross Profit"
                  value={
                    egpRate !== null
                      ? formatEgp(profitStats.grossProfitUsd * egpRate)
                      : formatCurrency(profitStats.grossProfitUsd)
                  }
                  icon={TrendingUp}
                  tone={profitStats.grossProfitUsd >= 0 ? "emerald" : "red"}
                  index={3}
                  subtext={
                    egpRate !== null
                      ? `≈ ${formatCurrency(profitStats.grossProfitUsd)}`
                      : undefined
                  }
                  items={marginItems}
                />
                <FinancialBreakdownCard
                  label="Net Profit"
                  value={
                    egpRate !== null
                      ? formatEgp(profitStats.netProfitUsd * egpRate)
                      : formatCurrency(profitStats.netProfitUsd)
                  }
                  icon={TrendingUp}
                  tone={profitStats.netProfitUsd >= 0 ? "emerald" : "red"}
                  index={4}
                  subtext={
                    egpRate !== null
                      ? `≈ ${formatCurrency(profitStats.netProfitUsd)}`
                      : undefined
                  }
                  items={marginItems}
                />
              </>
            )}
          </div>

          {!loading && profitStats && (
            <Card className="mt-4 overflow-hidden p-0">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto]">
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-6">
                    <MarginBar
                      label="Gross Profit Margin"
                      percent={
                        profitStats.netRevenueUsd > 0
                          ? (profitStats.grossProfitUsd /
                              profitStats.netRevenueUsd) *
                            100
                          : 0
                      }
                    />
                    <MarginBar
                      label="Net Profit Margin"
                      percent={
                        profitStats.netRevenueUsd > 0
                          ? (profitStats.netProfitUsd /
                              profitStats.netRevenueUsd) *
                            100
                          : 0
                      }
                    />
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-5 border-t border-slate-200 p-5 dark:border-slate-800 sm:p-6 lg:w-56 lg:border-l lg:border-t-0">
                  <SidePanelStat
                    label="Total Discount"
                    valueUsd={
                      profitStats.revenueUsd - profitStats.netRevenueUsd
                    }
                    egpRate={egpRate}
                  />
                  <ExchangeRateStat egpRate={egpRate} />
                </div>
              </div>
            </Card>
          )}
        </section>

        {/* Secondary expenses */}
        <section>
          <SectionHeading
            title="Secondary Expenses"
            description="Annual infrastructure cost, kept simple"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))
            ) : (
              <>
                <StatCard
                  label="Annual Domain Cost"
                  value={egpValue(financials.annualDomainCost)}
                  subtext={egpSubtext(financials.annualDomainCost)}
                  icon={Globe}
                  index={0}
                />
                <StatCard
                  label="Annual Hosting Cost"
                  value={egpValue(financials.annualHostingCost)}
                  subtext={egpSubtext(financials.annualHostingCost)}
                  icon={Server}
                  index={1}
                />
                <StatCard
                  label="Annual Email Cost"
                  value={egpValue(financials.annualEmailCost)}
                  subtext={egpSubtext(financials.annualEmailCost)}
                  icon={Mail}
                  index={2}
                />
                <StatCard
                  label="Annual Shared Hosting Cost"
                  value={egpValue(financials.annualSharedHostingCost)}
                  subtext={egpSubtext(financials.annualSharedHostingCost)}
                  icon={Share2}
                  index={3}
                />
                <StatCard
                  label="Total Annual Cost"
                  value={egpValue(financials.totalAnnualCost)}
                  subtext={egpSubtext(financials.totalAnnualCost)}
                  icon={Wallet}
                  tone="emerald"
                  index={4}
                />
              </>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {loading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  label="Upcoming Renewal Expenses (30d)"
                  value={egpValue(financials.upcomingRenewalExpense)}
                  subtext={egpSubtext(financials.upcomingRenewalExpense)}
                  icon={DollarSign}
                  tone="amber"
                  index={0}
                />
                <StatCard
                  label="Services Requiring Renewal (30d)"
                  value={financials.servicesNeedingRenewal}
                  icon={CalendarClock}
                  index={1}
                />
              </>
            )}
          </div>

          <Card className="mt-4 overflow-hidden">
            {loading ? (
              <TableSkeleton cols={7} />
            ) : upcomingRenewals.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No services yet"
                description="Add domains, hosting, or email services to see upcoming renewals here."
              />
            ) : dueSoon.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Nothing due soon"
                description="No services are due for renewal within the next 30 days."
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto scrollbar-thin sm:block">
                  <table className="w-full min-w-[820px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        {[
                          "#",
                          "Client",
                          "Service",
                          "Provider",
                          "Expiration Date",
                          "Days Remaining",
                          "Final Price",
                          "Status",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dueSoon.map((r, index) => {
                        const Icon = KIND_ICON[r.kind];
                        return (
                          <tr
                            key={`${r.kind}-${r.id}`}
                            onClick={() => navigate(KIND_ROUTE[r.kind])}
                            className="cursor-pointer border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                          >
                            <td className="px-5 py-3.5 text-slate-400">
                              {index + 1}
                            </td>
                            <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                              {r.clientName}
                            </td>
                            <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                                <div>
                                  <p>{r.serviceName}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                              {r.provider}
                            </td>
                            <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                              {formatDate(r.expirationDate)}
                            </td>
                            <td
                              className={cn(
                                "px-5 py-3.5 font-medium",
                                r.renewal.daysRemaining < 0
                                  ? "text-slate-500"
                                  : r.renewal.daysRemaining <= 7
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-slate-700 dark:text-slate-300",
                              )}
                            >
                              {daysRemainingLabel(r.renewal.daysRemaining)}
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="font-medium text-slate-900 dark:text-slate-100">
                                {egpRate !== null
                                  ? `${formatEgp(r.annualCost * egpRate)}/yr`
                                  : `${formatCurrency(r.annualCost)}/yr`}
                              </p>
                              {egpRate !== null && (
                                <p className="text-xs text-slate-400">
                                  ≈ {formatCurrency(r.annualCost)}/yr
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <StatusBadge renewal={r.renewal} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 p-4 sm:hidden">
                  {dueSoon.map((r) => {
                    const Icon = KIND_ICON[r.kind];
                    return (
                      <div
                        key={`${r.kind}-${r.id}`}
                        onClick={() => navigate(KIND_ROUTE[r.kind])}
                        className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {r.serviceName}
                              </p>
                              <p className="text-xs text-slate-400">
                                {r.clientName} · {r.provider}
                              </p>
                            </div>
                          </div>
                          <StatusBadge renewal={r.renewal} />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm">
                          <div>
                            <p className="text-slate-900 dark:text-slate-100">
                              {formatDate(r.expirationDate)}
                            </p>
                            <p className="text-xs text-slate-400">
                              {daysRemainingLabel(r.renewal.daysRemaining)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {egpRate !== null
                                ? `${formatEgp(r.annualCost * egpRate)}/yr`
                                : `${formatCurrency(r.annualCost)}/yr`}
                            </p>
                            {egpRate !== null && (
                              <p className="text-xs text-slate-400">
                                ≈ {formatCurrency(r.annualCost)}/yr
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </section>

        {/* Shared hosting usage */}
        <section>
          <Card className="overflow-hidden">
            <CardHeader>
              <div>
                <CardTitle>Shared Hosting Usage</CardTitle>
                <CardDescription>
                  Renewal price for each shared hosting plan
                </CardDescription>
              </div>
            </CardHeader>

            {loading ? (
              <TableSkeleton cols={5} />
            ) : sharedHostingUsage.length === 0 ? (
              <EmptyState
                icon={Share2}
                title="No shared hosting plans yet"
                description="Add a shared hosting plan to see which clients are on it here."
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto scrollbar-thin sm:block">
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        {[
                          "#",
                          "Name",
                          "Provider",
                          "Expiration Date",
                          "Days Remaining",
                          "Final Price",
                          "Status",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sharedHostingUsage.map(({ plan }, index) => {
                        const renewal = getRenewalInfo(plan.expiration_date);
                        return (
                          <tr
                            key={plan.id}
                            onClick={() => navigate("/shared-hosting")}
                            className="cursor-pointer border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                          >
                            <td className="px-5 py-3.5 text-slate-400">
                              {index + 1}
                            </td>
                            <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                              {plan.name}
                            </td>
                            <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                              {plan.provider}
                            </td>
                            <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                              {formatDate(plan.expiration_date)}
                            </td>
                            <td
                              className={cn(
                                "px-5 py-3.5 font-medium",
                                renewal.daysRemaining < 0
                                  ? "text-slate-500"
                                  : renewal.daysRemaining <= 7
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-slate-700 dark:text-slate-300",
                              )}
                            >
                              {daysRemainingLabel(renewal.daysRemaining)}
                            </td>
                            <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                              {formatCurrency(withBankFee(plan.annual_cost))}/yr
                            </td>
                            <td className="px-5 py-3.5">
                              <StatusBadge renewal={renewal} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 p-4 sm:hidden">
                  {sharedHostingUsage.map(({ plan }) => {
                    const renewal = getRenewalInfo(plan.expiration_date);
                    return (
                      <div
                        key={plan.id}
                        onClick={() => navigate("/shared-hosting")}
                        className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {plan.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {plan.provider}
                            </p>
                          </div>
                          <StatusBadge renewal={renewal} />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm">
                          <div>
                            <p className="text-slate-900 dark:text-slate-100">
                              {formatDate(plan.expiration_date)}
                            </p>
                            <p className="text-xs text-slate-400">
                              {daysRemainingLabel(renewal.daysRemaining)}
                            </p>
                          </div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {formatCurrency(withBankFee(plan.annual_cost))}/yr
                            {egpRate !== null && (
                              <span className="ml-1 text-xs font-normal text-slate-400">
                                (≈{" "}
                                {formatEgp(
                                  withBankFee(plan.annual_cost) * egpRate,
                                )}
                                )
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </section>
      </div>
    </PageTransition>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h2>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}

/** A labeled percentage bar with a gradient fill — echoes the filled-area
 * look of a line chart without pretending to plot a real historical trend
 * (the app has no stored daily/monthly financial snapshots to chart). */
function MarginBar({ label, percent }: { label: string; percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const negative = percent < 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {label}
        </p>
        <p
          className={cn(
            "text-lg font-bold tabular-nums",
            negative
              ? "text-red-600 dark:text-red-400"
              : "text-slate-900 dark:text-slate-100",
          )}
        >
          {percent.toFixed(1)}%
        </p>
      </div>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn(
            "h-full rounded-full",
            negative
              ? "bg-red-500"
              : "bg-gradient-to-r from-brand-300 to-brand-600 dark:from-brand-500 dark:to-brand-300",
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

/** The live USD→EGP rate this whole page converts every USD figure with
 * (see useUsdToEgpRate) — shown here so the conversion itself is visible
 * and auditable, not just implied by the EGP figures it produces. Sits
 * above Total Discount in the Profit Margins card's side panel. */
function ExchangeRateStat({ egpRate }: { egpRate: number | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">Exchange Rate</p>
      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
        {egpRate !== null ? `$1 = ${egpRate.toFixed(2)} EGP` : "—"}
      </p>
      {egpRate === null && (
        <p className="text-xs text-slate-400">Unavailable right now</p>
      )}
    </div>
  );
}

/** One stat in the Profit Margins card's side panel — EGP primary with a
 * "≈ $USD" secondary line, matching every other Financial Analytics figure. */
function SidePanelStat({
  label,
  valueUsd,
  egpRate,
}: {
  label: string;
  valueUsd: number;
  egpRate: number | null;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
        {egpRate !== null
          ? formatEgp(valueUsd * egpRate)
          : formatCurrency(valueUsd)}
      </p>
      {egpRate !== null && (
        <p className="text-xs text-slate-400">≈ {formatCurrency(valueUsd)}</p>
      )}
    </div>
  );
}
