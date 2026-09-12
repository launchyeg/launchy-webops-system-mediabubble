import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TableSkeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** `index` is the row's position within the current (filtered/sorted)
   * `rows` array — handy for a "#" row-number column. */
  render: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  renderMobileCard: (row: T) => ReactNode;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

/**
 * Renders a full data table on md+ screens and a stacked card list on
 * mobile, from a single dataset — so every listing page stays usable on
 * small screens without duplicating markup.
 */
export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  loading,
  onRowClick,
  renderMobileCard,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
}: DataTableProps<T>) {
  if (loading) {
    return <TableSkeleton cols={columns.length} />;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto scrollbar-thin sm:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400",
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-slate-50 last:border-0 dark:border-slate-800/60",
                  onRowClick &&
                    "cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-5 py-3.5 align-middle text-slate-700 dark:text-slate-300",
                      col.className
                    )}
                  >
                    {col.render(row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="flex flex-col gap-3 p-4 sm:hidden">
        {rows.map((row) => (
          <div key={keyExtractor(row)} onClick={onRowClick ? () => onRowClick(row) : undefined}>
            {renderMobileCard(row)}
          </div>
        ))}
      </div>
    </>
  );
}
