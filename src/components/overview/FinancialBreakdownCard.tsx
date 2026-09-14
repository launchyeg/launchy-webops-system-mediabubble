import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, Globe, Mail, Server, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCurrency, pluralize } from "@/utils/format";

const KIND_ICON = {
  domain: Globe,
  hosting: Server,
  email: Mail,
  shared_hosting: Share2,
} as const;

export interface BreakdownItem {
  id: string;
  serviceName: string;
  /** null for a Shared Hosting plan — it isn't tied to one client. */
  clientName: string | null;
  kind: keyof typeof KIND_ICON;
  amountUsd: number;
}

interface FinancialBreakdownCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  tone?: "default" | "amber" | "red" | "emerald";
  index?: number;
  /** Already filtered/sorted the way this card should present them —
   * this component just renders the list, it doesn't decide relevance or
   * order. */
  items: BreakdownItem[];
}

const TONE_CLASSES: Record<NonNullable<FinancialBreakdownCardProps["tone"]>, string> = {
  default: "bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  red: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
};

/** A Financial Analytics stat card with its own collapsible breakdown panel
 * underneath, listing exactly the services that make up that card's figure
 * — so the total can be audited line by line instead of only trusted as one
 * aggregate number (see StatCard for the plain, non-breakdown version this
 * mirrors visually). The card's own `value`/`subtext` follow whatever the
 * caller passes in (EGP-primary, same as the rest of the app), but the
 * breakdown rows below are deliberately always USD — a per-service
 * exception the user asked for specifically for this list, not a reversion
 * of the app's EGP-primary convention elsewhere. */
export function FinancialBreakdownCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = "default",
  index = 0,
  items,
}: FinancialBreakdownCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {value}
            </p>
            {subtext && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{subtext}</p>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              TONE_CLASSES[tone]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={items.length === 0}
        className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-2.5 text-left text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-default disabled:hover:bg-transparent dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/40"
      >
        <span>
          {items.length === 0
            ? "No services"
            : pluralize(items.length, "service")}
        </span>
        {items.length > 0 && (
          <ChevronDown
            className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")}
          />
        )}
      </button>

      {open && items.length > 0 && (
        <div className="max-h-64 overflow-y-auto border-t border-slate-100 dark:border-slate-800">
          {items.map((item) => {
            const ItemIcon = KIND_ICON[item.kind];
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 border-b border-slate-50 px-5 py-2 last:border-b-0 dark:border-slate-800/60"
              >
                <ItemIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                    {item.serviceName}
                  </p>
                  {item.clientName && (
                    <p className="truncate text-[11px] text-slate-400">{item.clientName}</p>
                  )}
                </div>
                <p
                  className={cn(
                    "shrink-0 text-right text-xs font-semibold",
                    item.amountUsd < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-700 dark:text-slate-300"
                  )}
                >
                  {formatCurrency(item.amountUsd)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
