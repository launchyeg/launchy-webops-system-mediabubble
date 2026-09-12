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
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { StatCardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useOverviewData } from "@/hooks/useOverviewData";
import { formatCurrency, formatEgp } from "@/utils/format";
import { getRenewalInfo, formatDate, daysRemainingLabel } from "@/utils/dates";
import { NET_PROFIT_DEDUCTION_PERCENT } from "@/utils/constants";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  domain: Globe,
  hosting: Server,
  email: Mail,
  shared_hosting: Share2,
} as const;
const KIND_LABEL = {
  domain: "Domain",
  hosting: "Hosting",
  email: "Email",
  shared_hosting: "Shared Hosting",
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
                  subtext={`${domainStats.expiringSoon} expiring soon · ${domainStats.expired} expired`}
                />
                <StatCard
                  label="Total Hosting Accounts"
                  value={hostingStats.total}
                  icon={Server}
                  index={2}
                  subtext={`${hostingStats.expiringSoon} expiring soon · ${hostingStats.expired} expired`}
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
                  value={formatCurrency(financials.annualDomainCost)}
                  icon={Globe}
                  index={0}
                />
                <StatCard
                  label="Annual Hosting Cost"
                  value={formatCurrency(financials.annualHostingCost)}
                  icon={Server}
                  index={1}
                />
                <StatCard
                  label="Annual Email Cost"
                  value={formatCurrency(financials.annualEmailCost)}
                  icon={Mail}
                  index={2}
                />
                <StatCard
                  label="Annual Shared Hosting Cost"
                  value={formatCurrency(financials.annualSharedHostingCost)}
                  icon={Share2}
                  index={3}
                />
                <StatCard
                  label="Total Annual Infrastructure Cost"
                  value={formatCurrency(financials.totalAnnualCost)}
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
                  value={formatCurrency(financials.upcomingRenewalExpense)}
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
                <StatCard
                  label="Revenue"
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
                />
                <StatCard
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
                />
                <StatCard
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
                />
                <StatCard
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
                />
                <StatCard
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
                    `After ${NET_PROFIT_DEDUCTION_PERCENT}% deduction` +
                    (egpRate !== null
                      ? ` · ≈ ${formatCurrency(profitStats.netProfitUsd)}`
                      : "")
                  }
                />
              </>
            )}
          </div>
        </section>

        {/* Upcoming renewals table */}
        <section>
          <Card className="overflow-hidden">
            <CardHeader>
              <div>
                <CardTitle>Upcoming Renewals</CardTitle>
                <CardDescription>
                  Closest expiration dates across all services
                </CardDescription>
              </div>
            </CardHeader>

            {loading ? (
              <TableSkeleton cols={7} />
            ) : upcomingRenewals.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No services yet"
                description="Add domains, hosting, or email services to see upcoming renewals here."
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto scrollbar-thin sm:block">
                  <table className="w-full min-w-[820px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        {[
                          "Client",
                          "Service",
                          "Provider",
                          "Expiration Date",
                          "Days Remaining",
                          "Annual Cost",
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
                      {upcomingRenewals.slice(0, 15).map((r) => {
                        const Icon = KIND_ICON[r.kind];
                        return (
                          <tr
                            key={`${r.kind}-${r.id}`}
                            onClick={() => navigate(KIND_ROUTE[r.kind])}
                            className="cursor-pointer border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                          >
                            <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                              {r.clientName}
                            </td>
                            <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                                <div>
                                  <p>{r.serviceName}</p>
                                  <p className="text-xs text-slate-400">
                                    {KIND_LABEL[r.kind]}
                                  </p>
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
                            <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                              {formatCurrency(r.annualCost)}
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
                  {upcomingRenewals.slice(0, 15).map((r) => {
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
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {formatCurrency(r.annualCost)}/yr
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

        {/* Shared hosting usage */}
        <section>
          <Card className="overflow-hidden">
            <CardHeader>
              <div>
                <CardTitle>Shared Hosting Usage</CardTitle>
                <CardDescription>
                  Which clients are on each shared plan, at a glance
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
                          "Plan",
                          "Provider",
                          "Expiration Date",
                          "Status",
                          "Clients Using It",
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
                      {sharedHostingUsage.map(({ plan, clientNames }) => (
                        <tr
                          key={plan.id}
                          onClick={() => navigate("/shared-hosting")}
                          className="cursor-pointer border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                            {plan.name}
                          </td>
                          <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                            {plan.provider}
                          </td>
                          <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                            {formatDate(plan.expiration_date)}
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusBadge
                              renewal={getRenewalInfo(plan.expiration_date)}
                            />
                          </td>
                          <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                            {clientNames.length === 0 ? (
                              <span className="text-slate-400">
                                No clients linked yet
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {clientNames.map((name) => (
                                  <span
                                    key={name}
                                    className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                  >
                                    {name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 p-4 sm:hidden">
                  {sharedHostingUsage.map(({ plan, clientNames }) => (
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
                        <StatusBadge
                          renewal={getRenewalInfo(plan.expiration_date)}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Expires {formatDate(plan.expiration_date)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {clientNames.length === 0 ? (
                          <span className="text-xs text-slate-400">
                            No clients linked yet
                          </span>
                        ) : (
                          clientNames.map((name) => (
                            <span
                              key={name}
                              className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {name}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
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
