import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Plus, Trash2, Users } from "lucide-react";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ClientFormModal } from "@/components/clients/ClientFormModal";
import { ClientStatusBadge } from "@/components/clients/ClientStatusBadge";
import { useClients } from "@/hooks/useClients";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/contexts/ToastContext";
import { deleteClient } from "@/services/clients.service";
import { formatDate } from "@/utils/dates";
import type { ClientWithCounts } from "@/types";

export default function ClientsPage() {
  const { clients, loading, refetch } = useClients();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithCounts | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientWithCounts | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.client_name, c.agency_name, c.email, c.phone]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    );
  }, [clients, debouncedSearch]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClient(deleteTarget.id);
      toast({ title: "Client deleted", variant: "success" });
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast({
        title: "Couldn't delete client",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<ClientWithCounts>[] = [
    {
      key: "row_number",
      header: "#",
      render: (_c, index) => index + 1,
      className: "w-10 text-slate-400",
      headerClassName: "w-10",
    },
    {
      key: "name",
      header: "Client",
      render: (c) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {c.client_name}
          </p>
          {c.agency_name && (
            <p className="text-xs text-slate-400">{c.agency_name}</p>
          )}
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (c) => (
        <div className="text-xs">
          <p>{c.email || "—"}</p>
          <p className="text-slate-400">{c.phone || "—"}</p>
        </div>
      ),
    },
    {
      key: "start",
      header: "Start Project",
      render: (c) => formatDate(c.start_project_date),
    },
    {
      key: "domains",
      header: "Domains",
      render: (c) => c.domain_count,
      className: "text-center",
      headerClassName: "text-center",
    },
    {
      key: "hosting",
      header: "Hosting",
      render: (c) => c.hosting_count,
      className: "text-center",
      headerClassName: "text-center",
    },
    {
      key: "email",
      header: "Email",
      render: (c) => c.email_count,
      className: "text-center",
      headerClassName: "text-center",
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <ClientStatusBadge tier={c.worstRenewalTier} />,
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label="View client"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/clients/${c.id}`);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Edit client"
            onClick={(e) => {
              e.stopPropagation();
              setEditingClient(c);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Delete client"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(c);
            }}
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search clients by name, agency, email…"
            className="sm:max-w-xs"
          />
          <Button
            onClick={() => {
              setEditingClient(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </div>

        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            rows={filtered}
            loading={loading}
            keyExtractor={(c) => c.id}
            onRowClick={(c) => navigate(`/clients/${c.id}`)}
            emptyIcon={Users}
            emptyTitle={search ? "No clients match your search" : "No clients yet"}
            emptyDescription={
              search
                ? "Try a different name, agency, or email."
                : "Add your first client to start tracking their domains, hosting, and email services."
            }
            emptyActionLabel={search ? undefined : "Add Client"}
            onEmptyAction={
              search
                ? undefined
                : () => {
                    setEditingClient(null);
                    setFormOpen(true);
                  }
            }
            renderMobileCard={(c) => (
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {c.client_name}
                    </p>
                    {c.agency_name && (
                      <p className="text-xs text-slate-400">{c.agency_name}</p>
                    )}
                  </div>
                  <ClientStatusBadge tier={c.worstRenewalTier} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-slate-50 py-2 dark:bg-slate-800">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {c.domain_count}
                    </p>
                    <p className="text-slate-400">Domains</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 py-2 dark:bg-slate-800">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {c.hosting_count}
                    </p>
                    <p className="text-slate-400">Hosting</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 py-2 dark:bg-slate-800">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {c.email_count}
                    </p>
                    <p className="text-slate-400">Email</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/clients/${c.id}`);
                    }}
                  >
                    View
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Edit client"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingClient(c);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete client"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(c);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            )}
          />
        </Card>
      </div>

      <ClientFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={refetch}
        client={editingClient}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.client_name}?`}
        description="This permanently deletes the client and cannot be undone. Their domains, hosting, and email records will be unassigned."
        confirmLabel="Delete Client"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageTransition>
  );
}
