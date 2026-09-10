import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { RenewalInfo, RenewalTier } from "@/types";
import { cn } from "@/lib/utils";

const TIER_STYLES: Record<
  RenewalTier,
  { classes: string; icon: typeof CheckCircle2 }
> = {
  active: {
    classes:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  soon: {
    // light red — 21 days or less
    classes: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    icon: Clock,
  },
  warning: {
    // medium/darker red — 14 days or less
    classes: "bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-200",
    icon: AlertTriangle,
  },
  urgent: {
    // strong/dark red — 7 days or less
    classes: "bg-red-600 text-white dark:bg-red-700 dark:text-white",
    icon: AlertTriangle,
  },
  expired: {
    classes:
      "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900",
    icon: XCircle,
  },
};

export function StatusBadge({ renewal }: { renewal: RenewalInfo }) {
  const { classes, icon: Icon } = TIER_STYLES[renewal.tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        classes
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {renewal.label}
    </span>
  );
}
