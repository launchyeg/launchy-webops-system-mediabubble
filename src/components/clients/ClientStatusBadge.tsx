import { AlertTriangle, CheckCircle2, Clock, MinusCircle, XCircle } from "lucide-react";
import type { RenewalTier } from "@/types";
import { cn } from "@/lib/utils";

const TIER_CONFIG: Record<RenewalTier, { label: string; classes: string; icon: typeof CheckCircle2 }> = {
  active: {
    label: "Active",
    classes: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  soon: {
    label: "Renewing Soon",
    classes: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    icon: Clock,
  },
  warning: {
    label: "Urgent",
    classes: "bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-200",
    icon: AlertTriangle,
  },
  urgent: {
    label: "Urgent",
    classes: "bg-red-600 text-white dark:bg-red-700",
    icon: AlertTriangle,
  },
  expired: {
    label: "Expired Service",
    classes: "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900",
    icon: XCircle,
  },
};

/** Rolls a client's services up into a single status badge — the most
 * urgent renewal tier among everything they own. Clients with no services
 * yet show a neutral "No Services" badge. */
export function ClientStatusBadge({ tier }: { tier: RenewalTier | null }) {
  if (!tier) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <MinusCircle className="h-3.5 w-3.5" />
        No Services
      </span>
    );
  }

  const { label, classes, icon: Icon } = TIER_CONFIG[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        classes
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
