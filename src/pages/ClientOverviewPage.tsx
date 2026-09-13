import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ChevronDown,
  Eye,
  Globe,
  Mail,
  Server,
  Users,
} from "lucide-react";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LifetimeBadge } from "@/components/shared/LifetimeBadge";
import { ClientStatusBadge } from "@/components/clients/ClientStatusBadge";
import { useClientOverview, type ClientOverviewGroup } from "@/hooks/useClientOverview";
import { useDebounce } from "@/hooks/useDebounce";
import { useUsdToEgpRate } from "@/hooks/useUsdToEgpRate";
import { getRenewalInfo, formatDate } from "@/utils/dates";
import { formatCurrency, formatEgp } from "@/utils/format";
import { applyDiscount, withBankFee } from "@/utils/pricing";
import { cn } from "@/lib/utils";
import type { DomainWithClient, HostingWithClient, EmailWithClient } from "@/types";

const UNASSIGNED_KEY = "__unassigned__";

/** A price with its live-converted equivalent in the other currency, e.g.
 * "$420/yr" with "≈ £20,580/yr" underneath — `null` secondaryText just
 * omits the second line (rate still loading or unavailable). */
function DualPrice({
  primaryText,
  secondaryText,
  align = "right",
}: {
  primaryText: string;
  secondaryText: string | null;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : undefined}>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{primaryText}</p>
      {secondaryText && <p className="text-xs text-slate-400">≈ {secondaryText}</p>}
    </div>
  );
}

export default function ClientOverviewPage() {
  const { loading, groups } = useClientOverview();
  const { rate: egpRate } = useUsdToEgpRate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const navigate = useNavigate();

  // The Unassigned bucket (if present) starts expanded — it's a data-quality
  // signal worth surfacing immediately, not something to dig for.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([UNASSIGNED_KEY]));

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      const name = g.client?.client_name ?? "Unassigned";
      const agency = g.client?.agency_name ?? "";
      return name.toLowerCase().includes(q) || agency.toLowerCase().includes(q);
    });
  }, [groups, debouncedSearch]);

  const hasAnyClients = groups.length > 0;

  return (
    <PageTransition>
      <div className="flex flex-col gap-5">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search clients by name or agency…"
          className="sm:max-w-xs"
        />

        {loading ? (
          <Card className="overflow-hidden">
            <TableSkeleton cols={6} />
          </Card>
        ) : !hasAnyClients ? (
          <Card className="overflow-hidden">
            <EmptyState
              icon={Users}
              title="No clients yet"
              description="Add a client and their domains, hosting, or email to see everything rolled up here."
            />
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="overflow-hidden">
            <EmptyState icon={Users} title="No clients match your search" />
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((group) => {
              const key = group.client?.id ?? UNASSIGNED_KEY;
              return (
                <ClientGroupCard
                  key={key}
                  group={group}
                  egpRate={egpRate}
                  open={expanded.has(key)}
                  onToggle={() => toggle(key)}
                  onView={
                    group.client ? () => navigate(`/clients/${group.client!.id}`) : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function ClientGroupCard({
  group,
  egpRate,
  open,
  onToggle,
  onView,
}: {
  group: ClientOverviewGroup;
  egpRate: number | null;
  open: boolean;
  onToggle: () => void;
  onView?: () => void;
}) {
  const isUnassigned = !group.client;
  // Every service's total is now USD-native; EGP is only ever a
  // live-converted secondary figure, shown once the rate is available.
  const totalUsd = group.totalAnnualCostUsd;
  const totalEgp = egpRate !== null ? group.totalAnnualCostUsd * egpRate : null;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-slate-400 transition-transform",
              open && "rotate-180"
            )}
          />
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              isUnassigned
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            )}
          >
            {isUnassigned ? <AlertTriangle className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {group.client?.client_name ?? "Unassigned"}
            </p>
            <p className="text-xs text-slate-400">
              {isUnassigned
                ? "Domains, hosting, and email with no client selected"
                : group.client?.agency_name || "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pl-12 sm:gap-6 sm:pl-0">
          <CountPill icon={Globe} count={group.domains.length} label="Domains" />
          <CountPill icon={Server} count={group.hosting.length} label="Hosting" />
          <CountPill icon={Mail} count={group.emails.length} label="Email" />
          <div className="shrink-0">
            <DualPrice
              primaryText={`${formatCurrency(totalUsd)}/yr`}
              secondaryText={totalEgp !== null ? `${formatEgp(totalEgp)}/yr` : null}
            />
          </div>
          <ClientStatusBadge tier={group.worstTier} />
          {onView && (
            <span
              role="button"
              tabIndex={0}
              aria-label="View client"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  e.preventDefault();
                  onView();
                }
              }}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Eye className="h-4 w-4" />
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          {group.serviceCount === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-slate-400">
              No domains, hosting, or email for this client yet.
            </p>
          ) : (
            <>
              {group.domains.map((d) => (
                <DetailRow
                  key={`domain-${d.id}`}
                  icon={Globe}
                  kind="Domain"
                  data={d}
                  egpRate={egpRate}
                />
              ))}
              {group.hosting.map((h) => (
                <DetailRow
                  key={`hosting-${h.id}`}
                  icon={Server}
                  kind="Hosting"
                  data={h}
                  egpRate={egpRate}
                />
              ))}
              {group.emails.map((e) => (
                <DetailRow
                  key={`email-${e.id}`}
                  icon={Mail}
                  kind="Email"
                  data={e}
                  egpRate={egpRate}
                />
              ))}
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function CountPill({
  icon: Icon,
  count,
  label,
}: {
  icon: typeof Globe;
  count: number;
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="font-semibold text-slate-700 dark:text-slate-300">{count}</span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

type DetailRowData = DomainWithClient | HostingWithClient | EmailWithClient;

function DetailRow({
  icon: Icon,
  kind,
  data,
  egpRate,
}: {
  icon: typeof Globe;
  kind: "Domain" | "Hosting" | "Email";
  data: DetailRowData;
  egpRate: number | null;
}) {
  const name =
    "domain_name" in data ? data.domain_name : "account_name" in data ? data.account_name : data.email_account;
  const isLifetime = "is_lifetime" in data && data.is_lifetime;
  // Every price is USD-native now. Shared Host and Lifetime email have no
  // commission concept — each has its own separate cost field, discounted
  // directly. Domain, Private-host, and recurring-email discounts come off
  // commission_usd only. Domain, Private host, and recurring email base
  // costs also include the bank's 5% card-payment fee (see withBankFee in
  // utils/pricing.ts); Shared Host's shared_annual_cost and a Lifetime
  // email's lifetime_cost carry no such fee.
  const usd =
    "host_type" in data && data.host_type === "shared"
      ? applyDiscount(data.shared_annual_cost, data.discount_percent)
      : "is_lifetime" in data && data.is_lifetime
        ? applyDiscount(data.lifetime_cost, data.discount_percent)
        : withBankFee(data.annual_cost) + applyDiscount(data.commission_usd, data.discount_percent);

  const suffix = isLifetime ? "" : "/yr";
  const priceText = `${formatCurrency(usd)}${suffix}`;
  const convertedText = egpRate !== null ? `${formatEgp(usd * egpRate)}${suffix}` : null;

  return (
    <div className="flex flex-col gap-2 px-5 py-3 pl-12 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0 text-slate-400" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {name}
          </p>
          <p className="text-xs text-slate-400">
            {kind} · {data.provider}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 pl-6 sm:gap-6 sm:pl-0">
        <div className="text-sm">
          <p className="text-slate-700 dark:text-slate-300">
            {isLifetime ? "Never expires" : formatDate(data.expiration_date)}
          </p>
          <p className="text-xs text-slate-400">
            {priceText}
            {convertedText && (
              <span className="text-slate-400/70"> (≈ {convertedText})</span>
            )}
          </p>
        </div>
        {isLifetime ? (
          <LifetimeBadge />
        ) : (
          <StatusBadge renewal={getRenewalInfo(data.expiration_date!)} />
        )}
      </div>
    </div>
  );
}
