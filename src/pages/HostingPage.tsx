import { useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Server, Trash2 } from "lucide-react";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ServiceFilters, type StatusFilterValue } from "@/components/shared/ServiceFilters";
import { HostingFormModal } from "@/components/hosting/HostingFormModal";
import { useHosting } from "@/hooks/useHosting";
import { useClientOptions } from "@/hooks/useClientOptions";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/contexts/ToastContext";
import { deleteHosting } from "@/services/hosting.service";
import { getRenewalInfo, formatDate, daysRemainingLabel } from "@/utils/dates";
import { formatCurrency } from "@/utils/format";
import { HOSTING_PROVIDERS } from "@/utils/constants";
import type { HostingWithClient } from "@/types";

export default function HostingPage() {
  const { hosting, loading, refetch } = useHosting();
  const { clientOptions } = useClientOptions();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [clientFilter, setClientFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HostingWithClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HostingWithClient | null>(null);
  const [deleting, setDeleting] = useState(false);

  const providers = useMemo(() => {
    const set = new Set<string>(HOSTING_PROVIDERS.filter((p) => p !== "Other"));
    hosting.forEach((h) => set.add(h.provider));
    return Array.from(set).sort();
  }, [hosting]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let rows = hosting.filter((h) => {
      if (q && !h.account_name.toLowerCase().includes(q)) return false;
      if (clientFilter && h.client_id !== clientFilter) return false;
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
  }, [hosting, debouncedSearch, clientFilter, providerFilter, statusFilter, sortDirection]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteHosting(deleteTarget.id);
      toast({ title: "Hosting account deleted", variant: "success" });
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast({
        title: "Couldn't delete hosting account",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<HostingWithClient>[] = [
    {
      key: "account",
      header: "Hosting Account",
      render: (h) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {h.account_name}
          </p>
          <p className="text-xs text-slate-400">{h.account_email || "—"}</p>
        </div>
      ),
    },
    { key: "provider", header: "Provider", render: (h) => h.provider },
    { key: "client", header: "Client", render: (h) => h.client_name ?? "Unassigned" },
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
      header: "Annual Cost",
      render: (h) => formatCurrency(h.annual_cost),
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
            aria-label="Edit hosting account"
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
            aria-label="Delete hosting account"
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
            searchPlaceholder="Search hosting accounts…"
            clientFilter={clientFilter}
            onClientFilterChange={setClientFilter}
            clients={clientOptions}
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
            Add Hosting
          </Button>
        </div>

        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            rows={filtered}
            loading={loading}
            keyExtractor={(h) => h.id}
            emptyIcon={Server}
            emptyTitle={
              hosting.length === 0
                ? "No hosting accounts yet"
                : "No hosting accounts match your filters"
            }
            emptyDescription={
              hosting.length === 0
                ? "Add your first hosting account to start tracking its renewal."
                : "Try adjusting your search or filters."
            }
            emptyActionLabel={hosting.length === 0 ? "Add Hosting" : undefined}
            onEmptyAction={
              hosting.length === 0
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
                      {h.account_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {h.provider} · {h.client_name ?? "Unassigned"}
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
                    aria-label="Edit hosting account"
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
                    aria-label="Delete hosting account"
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

      <HostingFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={refetch}
        hosting={editing}
        clients={clientOptions}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.account_name}?`}
        description="This permanently removes the hosting account record and cannot be undone."
        confirmLabel="Delete Hosting"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageTransition>
  );
}
