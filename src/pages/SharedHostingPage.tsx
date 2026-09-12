import { useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Share2, Trash2 } from "lucide-react";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ServiceFilters, type StatusFilterValue } from "@/components/shared/ServiceFilters";
import { SharedHostingFormModal } from "@/components/sharedHosting/SharedHostingFormModal";
import { useSharedHosting } from "@/hooks/useSharedHosting";
import { useHosting } from "@/hooks/useHosting";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/contexts/ToastContext";
import { deleteSharedHosting } from "@/services/sharedHosting.service";
import { getRenewalInfo, formatDate, daysRemainingLabel } from "@/utils/dates";
import { formatCurrency } from "@/utils/format";
import { HOSTING_PROVIDERS } from "@/utils/constants";
import type { SharedHostingRow } from "@/types";

export default function SharedHostingPage() {
  const { sharedHosting, loading, refetch } = useSharedHosting();
  const { hosting } = useHosting();
  const { toast } = useToast();

  // Total websites (domains) across every client hosting account linked to
  // each shared plan — a shared plan's own "how much is actually on this
  // server" count, distinct from the plan's own row in `hosting`.
  const websiteCountByPlan = useMemo(() => {
    const counts = new Map<string, number>();
    for (const h of hosting) {
      if (h.host_type === "shared" && h.shared_hosting_id) {
        counts.set(
          h.shared_hosting_id,
          (counts.get(h.shared_hosting_id) ?? 0) + h.domainNames.length
        );
      }
    }
    return counts;
  }, [hosting]);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [providerFilter, setProviderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SharedHostingRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SharedHostingRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const providers = useMemo(() => {
    const set = new Set<string>(HOSTING_PROVIDERS.filter((p) => p !== "Other"));
    sharedHosting.forEach((h) => set.add(h.provider));
    return Array.from(set).sort();
  }, [sharedHosting]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let rows = sharedHosting.filter((h) => {
      if (q && !h.name.toLowerCase().includes(q)) return false;
      if (providerFilter && h.provider !== providerFilter) return false;
      if (statusFilter !== "all") {
        const tier = getRenewalInfo(h.expiration_date).tier;
        if (tier !== statusFilter) return false;
      }
      return true;
    });
    rows = [...rows].sort((a, b) => {
      const diff =
        new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime();
      return sortDirection === "asc" ? diff : -diff;
    });
    return rows;
  }, [sharedHosting, debouncedSearch, providerFilter, statusFilter, sortDirection]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSharedHosting(deleteTarget.id);
      toast({ title: "Shared hosting plan deleted", variant: "success" });
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast({
        title: "Couldn't delete shared hosting plan",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<SharedHostingRow>[] = [
    {
      key: "row_number",
      header: "#",
      render: (_h, index) => index + 1,
      className: "w-10 text-slate-400",
      headerClassName: "w-10",
    },
    {
      key: "name",
      header: "Name",
      render: (h) => (
        <p className="font-medium text-slate-900 dark:text-slate-100">{h.name}</p>
      ),
    },
    { key: "provider", header: "Provider", render: (h) => h.provider },
    {
      key: "websites",
      header: "Total Websites",
      render: (h) => {
        const count = websiteCountByPlan.get(h.id) ?? 0;
        return (
          <span className={count === 0 ? "text-slate-400" : undefined}>
            {count} {count === 1 ? "website" : "websites"}
          </span>
        );
      },
    },
    {
      key: "expiration",
      header: "Expiration",
      render: (h) => (
        <div>
          <p>{formatDate(h.expiration_date)}</p>
          <p className="text-xs text-slate-400">
            {daysRemainingLabel(getRenewalInfo(h.expiration_date).daysRemaining)}
          </p>
        </div>
      ),
    },
    {
      key: "auto_renewal",
      header: "Auto Renewal",
      render: (h) =>
        h.auto_renewal ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <RefreshCw className="h-3.5 w-3.5" /> On
          </span>
        ) : (
          <span className="text-slate-400">Off</span>
        ),
    },
    {
      key: "cost",
      header: "Final Price",
      render: (h) => `${formatCurrency(h.annual_cost)}/yr`,
    },
    {
      key: "status",
      header: "Status",
      render: (h) => <StatusBadge renewal={getRenewalInfo(h.expiration_date)} />,
    },
    {
      key: "actions",
      header: "",
      render: (h) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Edit shared hosting plan"
            onClick={() => {
              setEditing(h);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Delete shared hosting plan"
            onClick={() => setDeleteTarget(h)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
  ];

  return (
    <PageTransition>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <ServiceFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search shared hosting plans…"
            providerFilter={providerFilter}
            onProviderFilterChange={setProviderFilter}
            providers={providers}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortDirection={sortDirection}
            onToggleSort={() =>
              setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
            }
          />
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add Shared Hosting
          </Button>
        </div>

        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            rows={filtered}
            loading={loading}
            keyExtractor={(h) => h.id}
            emptyIcon={Share2}
            emptyTitle={
              sharedHosting.length === 0
                ? "No shared hosting plans yet"
                : "No shared hosting plans match your filters"
            }
            emptyDescription={
              sharedHosting.length === 0
                ? "Add your first shared hosting plan to start tracking its renewal."
                : "Try adjusting your search or filters."
            }
            emptyActionLabel={sharedHosting.length === 0 ? "Add Shared Hosting" : undefined}
            onEmptyAction={
              sharedHosting.length === 0
                ? () => {
                    setEditing(null);
                    setFormOpen(true);
                  }
                : undefined
            }
            renderMobileCard={(h) => (
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {h.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {h.provider} · {websiteCountByPlan.get(h.id) ?? 0}{" "}
                      {(websiteCountByPlan.get(h.id) ?? 0) === 1 ? "website" : "websites"}
                    </p>
                  </div>
                  <StatusBadge renewal={getRenewalInfo(h.expiration_date)} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="text-slate-900 dark:text-slate-100">
                      {formatDate(h.expiration_date)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {daysRemainingLabel(getRenewalInfo(h.expiration_date).daysRemaining)}
                    </p>
                  </div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(h.annual_cost)}/yr
                  </p>
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Edit shared hosting plan"
                    onClick={() => {
                      setEditing(h);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete shared hosting plan"
                    onClick={() => setDeleteTarget(h)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            )}
          />
        </Card>
      </div>

      <SharedHostingFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={refetch}
        sharedHosting={editing}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name}?`}
        description="This permanently removes the shared hosting record and cannot be undone."
        confirmLabel="Delete Shared Hosting"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageTransition>
  );
}
