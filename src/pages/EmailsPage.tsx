import { useMemo, useState } from "react";
import { Mail, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ServiceFilters, type StatusFilterValue } from "@/components/shared/ServiceFilters";
import { EmailFormModal } from "@/components/email/EmailFormModal";
import { useEmails } from "@/hooks/useEmails";
import { useClientOptions } from "@/hooks/useClientOptions";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/contexts/ToastContext";
import { deleteEmail } from "@/services/emails.service";
import { getRenewalInfo, formatDate, daysRemainingLabel } from "@/utils/dates";
import { formatCurrency } from "@/utils/format";
import { EMAIL_PROVIDERS } from "@/utils/constants";
import type { EmailWithClient } from "@/types";

export default function EmailsPage() {
  const { emails, loading, refetch } = useEmails();
  const { clientOptions } = useClientOptions();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [clientFilter, setClientFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmailWithClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailWithClient | null>(null);
  const [deleting, setDeleting] = useState(false);

  const providers = useMemo(() => {
    const set = new Set<string>(EMAIL_PROVIDERS.filter((p) => p !== "Other"));
    emails.forEach((e) => set.add(e.provider));
    return Array.from(set).sort();
  }, [emails]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let rows = emails.filter((e) => {
      if (q && !e.email_account.toLowerCase().includes(q)) return false;
      if (clientFilter && e.client_id !== clientFilter) return false;
      if (providerFilter && e.provider !== providerFilter) return false;
      if (statusFilter !== "all") {
        const tier = getRenewalInfo(e.expiration_date).tier;
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
  }, [emails, debouncedSearch, clientFilter, providerFilter, statusFilter, sortDirection]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEmail(deleteTarget.id);
      toast({ title: "Email deleted", variant: "success" });
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast({
        title: "Couldn't delete email",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<EmailWithClient>[] = [
    {
      key: "account",
      header: "Email Account",
      render: (e) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {e.email_account}
          </p>
          <p className="text-xs text-slate-400">{e.account_email || "—"}</p>
        </div>
      ),
    },
    { key: "provider", header: "Provider", render: (e) => e.provider },
    { key: "client", header: "Client", render: (e) => e.client_name ?? "Unassigned" },
    {
      key: "expiration",
      header: "Expiration",
      render: (e) => (
        <div>
          <p>{formatDate(e.expiration_date)}</p>
          <p className="text-xs text-slate-400">
            {daysRemainingLabel(getRenewalInfo(e.expiration_date).daysRemaining)}
          </p>
        </div>
      ),
    },
    {
      key: "auto_renewal",
      header: "Auto Renewal",
      render: (e) =>
        e.auto_renewal ? (
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
      render: (e) => formatCurrency(e.annual_cost),
    },
    {
      key: "status",
      header: "Status",
      render: (e) => <StatusBadge renewal={getRenewalInfo(e.expiration_date)} />,
    },
    {
      key: "actions",
      header: "",
      render: (e) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Edit email"
            onClick={() => {
              setEditing(e);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Delete email"
            onClick={() => setDeleteTarget(e)}
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
            searchPlaceholder="Search email accounts…"
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
            Add Email
          </Button>
        </div>

        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            rows={filtered}
            loading={loading}
            keyExtractor={(e) => e.id}
            emptyIcon={Mail}
            emptyTitle={emails.length === 0 ? "No emails yet" : "No emails match your filters"}
            emptyDescription={
              emails.length === 0
                ? "Add your first email account to start tracking its renewal."
                : "Try adjusting your search or filters."
            }
            emptyActionLabel={emails.length === 0 ? "Add Email" : undefined}
            onEmptyAction={
              emails.length === 0
                ? () => {
                    setEditing(null);
                    setFormOpen(true);
                  }
                : undefined
            }
            renderMobileCard={(e) => (
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {e.email_account}
                    </p>
                    <p className="text-xs text-slate-400">
                      {e.provider} · {e.client_name ?? "Unassigned"}
                    </p>
                  </div>
                  <StatusBadge renewal={getRenewalInfo(e.expiration_date)} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="text-slate-900 dark:text-slate-100">
                      {formatDate(e.expiration_date)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {daysRemainingLabel(getRenewalInfo(e.expiration_date).daysRemaining)}
                    </p>
                  </div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(e.annual_cost)}/yr
                  </p>
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Edit email"
                    onClick={() => {
                      setEditing(e);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete email"
                    onClick={() => setDeleteTarget(e)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            )}
          />
        </Card>
      </div>

      <EmailFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={refetch}
        email={editing}
        clients={clientOptions}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.email_account}?`}
        description="This permanently removes the email record and cannot be undone."
        confirmLabel="Delete Email"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageTransition>
  );
}
