import { differenceInCalendarDays, format, parseISO, isValid } from "date-fns";
import type { RenewalInfo, RenewalTier, ServiceStatus } from "@/types";

/**
 * Computes the renewal urgency tier for a service from its expiration date.
 * This is the single source of truth for renewal status across the app —
 * badges, colors, filters and analytics all derive from this function so
 * numbers never go stale or need to be hardcoded.
 *
 * Thresholds (per product spec):
 *  - more than 21 days remaining -> normal ("Active")
 *  - 21 days or less             -> light red   ("Renewing Soon")
 *  - 14 days or less             -> medium red  ("Urgent")
 *  - 7 days or less              -> strong red  ("Urgent")
 *  - expired                     -> clearly marked ("Expired")
 */
export function getRenewalInfo(
  expirationDate: string,
  today: Date = new Date()
): RenewalInfo {
  const exp = parseISO(expirationDate);
  const daysRemaining = isValid(exp)
    ? differenceInCalendarDays(exp, stripTime(today))
    : 0;

  let tier: RenewalTier;
  if (daysRemaining < 0) tier = "expired";
  else if (daysRemaining <= 7) tier = "urgent";
  else if (daysRemaining <= 14) tier = "warning";
  else if (daysRemaining <= 21) tier = "soon";
  else tier = "active";

  const label: Record<RenewalTier, string> = {
    active: "Active",
    soon: "Renewing Soon",
    warning: "Urgent",
    urgent: "Urgent",
    expired: "Expired",
  };

  return { tier, label: label[tier], daysRemaining };
}

function stripTime(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Maps a renewal tier to the cached, coarse `status` column value stored
 * on each service row (used only as a queryable cache — the UI always
 * trusts getRenewalInfo for display). */
export function renewalTierToServiceStatus(tier: RenewalTier): ServiceStatus {
  if (tier === "expired") return "expired";
  if (tier === "active") return "active";
  return "expiring_soon";
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = parseISO(dateStr);
  if (!isValid(d)) return "—";
  return format(d, "MMM d, yyyy");
}

export function toInputDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = parseISO(dateStr);
  if (!isValid(d)) return "";
  return format(d, "yyyy-MM-dd");
}

export function daysRemainingLabel(days: number): string {
  if (days < 0) {
    const overdue = Math.abs(days);
    return `Expired ${overdue} day${overdue === 1 ? "" : "s"} ago`;
  }
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}
