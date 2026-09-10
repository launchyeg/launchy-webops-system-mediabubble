import { useMemo, useState } from "react";
import { Globe, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ServiceFilters, type StatusFilterValue } from "@/components/shared/ServiceFilters";
import { DomainFormModal } from "@/components/domains/DomainFormModal";
import { useDomains } from "@/hooks/useDomains";
import { useClientOptions } from "@/hooks/useClientOptions";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/contexts/ToastContext";
import { deleteDomain } from "@/services/domains.service";
import { getRenewalInfo, formatDate, daysRemainingLabel } from "@/utils/dates";
import { formatCurrency } from "@/utils/format";
import { DOMAIN_PROVIDERS } from "@/utils/constants";
import type { DomainWithClient } from "@/types";

export default function DomainsPage() {
  const { domains, loading, refetch } = useDomains();
  const { clientOptions } = useClientOptions();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [clientFilter, setClientFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DomainWithClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DomainWithClient | null>(null);
  const [deleting, setDeleting] = useState(false);

  const providers = useMemo(() => {
    const set = new Set<string>(DOMAIN_PROVIDERS.filter((p) => p !== "Other"));
    domains.forEach((d) => set.add(d.provider));
    return Array.from(set).sort();
  }, [domains]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let rows = domains.filter((d) => {
      if (q && !d.domain_name.toLowerCase().includes(q)) return false;
      if (clientFilter && d.client_id !== clientFilter) return false;
      if (providerFilter && d.provider !== providerFilter) return false;
      if (statusFilter !== "all") {
        const tier = getRenewalInfo(d.expiration_date).tier;
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
  }, [domains, debouncedSearch, clientFilter, providerFilter, statusFilter, sortDirection]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDomain(deleteTarget.id);
      toast({ title: "Domain deleted", variant: "success" });
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast({
        title: "Couldn't delete domain",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<DomainWithClient>[] = [
    {
      key: "domain",
      header: "Domain",
      render: (d) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {d.domain_name}
          </p>
          <p className="text-xs text-slate-400">{d.account_email || "—"}</p>
        </div>
      ),
    },
    { key: "provider", header: "Provider", render: (d) => d.provider },
    { key: "client", header: "Client", render: (d) => d.client_name ?? "Unassigned" },
    {
      key: "expiration",
      header: "Expiration",
      render: (d) => (
        <div>
          <p>{formatDate(d.expiration_date)}</p>
          <p className="text-xs text-slate-400">
            {daysRemainingLabel(getRenewalInfo(d.expiration_date).daysRemaining)}
          </p>
        </div>
      ),
    },
    {
      key: "auto_renewal",
      header: "Auto Renewal",
      render: (d) =>
        d.auto_renewal ? (
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
      render: (d) => formatCurrency(d.annual_cost),
    },
    {
      key: "status",
      header: "Status",
      render: (d) => <StatusBadge renewal={getRenewalInfo(d.expiration_date)} />,
    },
    {
      key: "actions",
      header: "",
      render: (d) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Edit domain"
            onClick={() => {
              setEditing(d);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Delete domain"
            onClick={() => setDeleteTarget(d)}
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
            searchPlaceholder="Search domain names…"
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
            Add Domain
          </Button>
        </div>

        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            rows={filtered}
            loading={loading}
            keyExtractor={(d) => d.id}
            emptyIcon={Globe}
            emptyTitle={
              domains.length === 0 ? "No domains yet" : "No domains match your filters"
            }
            emptyDescription={
              domains.length === 0
                ? "Add your first domain to start tracking its renewal."
                : "Try adjusting your search or filters."
            }
            emptyActionLabel={domains.length === 0 ? "Add Domain" : undefined}
            onEmptyAction={
              domains.length === 0
                ? () => {
                    setEditing(null);
                    setFormOpen(true);
                  }
                : undefined
            }
            renderMobileCard={(d) => (
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {d.domain_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {d.provider} · {d.client_name ?? "Unassigned"}
                    </p>
                  </div>
                  <StatusBadge renewal={getRenewalInfo(d.expiration_date)} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="text-slate-900 dark:text-slate-100">
                      {formatDate(d.expiration_date)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {daysRemainingLabel(getRenewalInfo(d.expiration_date).daysRemaining)}
                    </p>
                  </div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(d.annual_cost)}/yr
                  </p>
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Edit domain"
                    onClick={() => {
                      setEditing(d);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete domain"
                    onClick={() => setDeleteTarget(d)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            )}
          />
        </Card>
      </div>

      <DomainFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={refetch}
        domain={editing}
        clients={clientOptions}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.domain_name}?`}
        description="This permanently removes the domain record and cannot be undone."
        confirmLabel="Delete Domain"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageTransition>
  );
}
