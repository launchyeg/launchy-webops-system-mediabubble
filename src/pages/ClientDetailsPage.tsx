import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronDown,
  Globe,
  Mail,
  Pencil,
  Phone,
  Plus,
  Server,
  StickyNote,
  Trash2,
  Loader2,
} from "lucide-react";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LifetimeBadge } from "@/components/shared/LifetimeBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ClientFormModal } from "@/components/clients/ClientFormModal";
import { DomainFormModal } from "@/components/domains/DomainFormModal";
import { HostingFormModal } from "@/components/hosting/HostingFormModal";
import { EmailFormModal } from "@/components/email/EmailFormModal";
import { useToast } from "@/contexts/ToastContext";
import { useClientOptions } from "@/hooks/useClientOptions";
import { getClient } from "@/services/clients.service";
import { deleteDomain, listDomainsByClient } from "@/services/domains.service";
import { deleteHosting, listHostingByClient } from "@/services/hosting.service";
import { deleteEmail, listEmailsByClient } from "@/services/emails.service";
import { getRenewalInfo, formatDate } from "@/utils/dates";
import { formatCurrency } from "@/utils/format";
import { applyDiscount } from "@/utils/pricing";
import { cn } from "@/lib/utils";
import type {
  ClientRow,
  DomainRow,
  HostingWithDomainNames,
  EmailRow,
} from "@/types";

export default function ClientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clientOptions } = useClientOptions();

  const [client, setClient] = useState<ClientRow | null>(null);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [hosting, setHosting] = useState<HostingWithDomainNames[]>([]);
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editClientOpen, setEditClientOpen] = useState(false);
  const [domainModal, setDomainModal] = useState<{ open: boolean; row: DomainRow | null }>({
    open: false,
    row: null,
  });
  const [hostingModal, setHostingModal] = useState<{ open: boolean; row: HostingWithDomainNames | null }>({
    open: false,
    row: null,
  });
  const [emailModal, setEmailModal] = useState<{ open: boolean; row: EmailRow | null }>({
    open: false,
    row: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "domain"; row: DomainRow }
    | { kind: "hosting"; row: HostingWithDomainNames }
    | { kind: "email"; row: EmailRow }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedHostingIds, setExpandedHostingIds] = useState<Set<string>>(new Set());

  const domainNameById = useMemo(
    () => new Map(domains.map((d) => [d.id, d.domain_name])),
    [domains]
  );

  const toggleHostingExpanded = (id: string) =>
    setExpandedHostingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [c, d, h, e] = await Promise.all([
        getClient(id),
        listDomainsByClient(id),
        listHostingByClient(id),
        listEmailsByClient(id),
      ]);
      setClient(c);
      setDomains(d);
      setHosting(h);
      setEmails(e);
    } catch (err) {
      toast({
        title: "Couldn't load client",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === "domain") await deleteDomain(deleteTarget.row.id);
      if (deleteTarget.kind === "hosting") await deleteHosting(deleteTarget.row.id);
      if (deleteTarget.kind === "email") await deleteEmail(deleteTarget.row.id);
      toast({ title: "Deleted", variant: "success" });
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast({
        title: "Couldn't delete",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!client) {
    return (
      <EmptyState
        icon={Building2}
        title="Client not found"
        description="This client may have been deleted."
        actionLabel="Back to Clients"
        onAction={() => navigate("/clients")}
      />
    );
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button
              onClick={() => navigate("/clients")}
              className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Clients
            </button>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {client.client_name}
            </h2>
            {client.agency_name && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {client.agency_name}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={() => setEditClientOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit Client
          </Button>
        </div>

        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem icon={Mail} label="Email" value={client.email || "—"} />
            <InfoItem icon={Phone} label="Phone" value={client.phone || "—"} />
            <InfoItem
              icon={Calendar}
              label="Start Project"
              value={formatDate(client.start_project_date)}
            />
            <InfoItem icon={Building2} label="Agency" value={client.agency_name || "—"} />
          </CardContent>
          {client.notes && (
            <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <p>{client.notes}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Domains */}
        <ServiceSection
          icon={Globe}
          title="Domains"
          count={domains.length}
          onAdd={() => setDomainModal({ open: true, row: null })}
          addLabel="Add Domain"
        >
          {domains.length === 0 ? (
            <EmptyState icon={Globe} title="No domains for this client yet" />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {domains.map((d) => (
                <ServiceRow
                  key={d.id}
                  title={d.domain_name}
                  subtitle={d.provider}
                  expirationDate={d.expiration_date}
                  annualCost={d.annual_cost}
                  commissionUsd={applyDiscount(d.commission_usd, d.discount_percent)}
                  extra={
                    <>
                      {d.account_email && <p className="text-xs text-slate-400">{d.account_email}</p>}
                      {d.notes && <p className="text-xs text-slate-400">{d.notes}</p>}
                    </>
                  }
                  onEdit={() => setDomainModal({ open: true, row: d })}
                  onDelete={() => setDeleteTarget({ kind: "domain", row: d })}
                />
              ))}
            </div>
          )}
        </ServiceSection>

        {/* Hosting */}
        <ServiceSection
          icon={Server}
          title="Hosting"
          count={hosting.length}
          onAdd={() => setHostingModal({ open: true, row: null })}
          addLabel="Add Hosting"
        >
          {hosting.length === 0 ? (
            <EmptyState icon={Server} title="No hosting accounts for this client yet" />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {hosting.map((h) => (
                <ServiceRow
                  key={h.id}
                  title={h.account_name}
                  subtitle={h.provider}
                  expirationDate={h.expiration_date}
                  annualCost={
                    h.host_type === "shared"
                      ? applyDiscount(h.shared_annual_cost, h.discount_percent)
                      : h.annual_cost
                  }
                  commissionUsd={
                    h.host_type === "shared"
                      ? 0
                      : applyDiscount(h.commission_usd, h.discount_percent)
                  }
                  extra={
                    h.host_type === "private" ? (
                      <>
                        {h.account_email && (
                          <p className="text-xs text-slate-400">{h.account_email}</p>
                        )}
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs text-slate-400">
                            {h.domainNames.length}{" "}
                            {h.domainNames.length === 1 ? "website" : "websites"}
                          </p>
                          {h.domainNames.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleHostingExpanded(h.id)}
                              className="inline-flex items-center gap-0.5 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                            >
                              {expandedHostingIds.has(h.id) ? "Hide" : "Show"} domains
                              <ChevronDown
                                className={cn(
                                  "h-3 w-3 transition-transform",
                                  expandedHostingIds.has(h.id) && "rotate-180"
                                )}
                              />
                            </button>
                          )}
                        </div>
                        {expandedHostingIds.has(h.id) && h.domainNames.length > 0 && (
                          <p className="text-xs text-slate-400">{h.domainNames.join(", ")}</p>
                        )}
                      </>
                    ) : (
                      <>
                        {h.domainNames.length > 0 && (
                          <p className="text-xs text-slate-400">{h.domainNames.join(", ")}</p>
                        )}
                        {h.notes && <p className="text-xs text-slate-400">{h.notes}</p>}
                      </>
                    )
                  }
                  onEdit={() => setHostingModal({ open: true, row: h })}
                  onDelete={() => setDeleteTarget({ kind: "hosting", row: h })}
                />
              ))}
            </div>
          )}
        </ServiceSection>

        {/* Email */}
        <ServiceSection
          icon={Mail}
          title="Email"
          count={emails.length}
          onAdd={() => setEmailModal({ open: true, row: null })}
          addLabel="Add Email"
        >
          {emails.length === 0 ? (
            <EmptyState icon={Mail} title="No emails for this client yet" />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {emails.map((e) => (
                <ServiceRow
                  key={e.id}
                  title={e.email_account}
                  subtitle={e.provider}
                  expirationDate={e.expiration_date}
                  annualCost={
                    e.is_lifetime
                      ? applyDiscount(e.lifetime_cost, e.discount_percent)
                      : e.annual_cost
                  }
                  commissionUsd={
                    e.is_lifetime ? 0 : applyDiscount(e.commission_usd, e.discount_percent)
                  }
                  isLifetime={e.is_lifetime}
                  extra={
                    <>
                      {e.domain_id && domainNameById.has(e.domain_id) && (
                        <p className="text-xs text-slate-400">
                          {domainNameById.get(e.domain_id)}
                        </p>
                      )}
                      {e.account_email && (
                        <p className="text-xs text-slate-400">{e.account_email}</p>
                      )}
                      {e.notes && <p className="text-xs text-slate-400">{e.notes}</p>}
                    </>
                  }
                  onEdit={() => setEmailModal({ open: true, row: e })}
                  onDelete={() => setDeleteTarget({ kind: "email", row: e })}
                />
              ))}
            </div>
          )}
        </ServiceSection>
      </div>

      <ClientFormModal
        open={editClientOpen}
        onClose={() => setEditClientOpen(false)}
        onSuccess={load}
        client={client}
      />

      <DomainFormModal
        open={domainModal.open}
        onClose={() => setDomainModal({ open: false, row: null })}
        onSuccess={load}
        domain={domainModal.row ? { ...domainModal.row, client_name: client.client_name } : null}
        clients={clientOptions}
        defaultClientId={client.id}
      />

      <HostingFormModal
        open={hostingModal.open}
        onClose={() => setHostingModal({ open: false, row: null })}
        onSuccess={load}
        hosting={
          hostingModal.row ? { ...hostingModal.row, client_name: client.client_name } : null
        }
        clients={clientOptions}
        defaultClientId={client.id}
      />

      <EmailFormModal
        open={emailModal.open}
        onClose={() => setEmailModal({ open: false, row: null })}
        onSuccess={load}
        email={
          emailModal.row ? { ...emailModal.row, client_name: client.client_name } : null
        }
        clients={clientOptions}
        defaultClientId={client.id}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this service?"
        description="This permanently removes the record and cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageTransition>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          {value}
        </p>
      </div>
    </div>
  );
}

function ServiceSection({
  icon: Icon,
  title,
  count,
  onAdd,
  addLabel,
  children,
}: {
  icon: typeof Mail;
  title: string;
  count: number;
  onAdd: () => void;
  addLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-400" />
          {title}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {count}
          </span>
        </CardTitle>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </CardHeader>
      {children}
    </Card>
  );
}

function ServiceRow({
  title,
  subtitle,
  expirationDate,
  annualCost,
  commissionUsd,
  isLifetime,
  extra,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle: string;
  expirationDate: string | null;
  annualCost: number;
  /** Added to annualCost for the displayed Final Price — omitted (or 0) for
   * a row with no commission concept, e.g. a Shared Host or Lifetime email
   * (whose discount is pre-applied to annualCost by the caller instead). */
  commissionUsd?: number;
  isLifetime?: boolean;
  /** Extra detail lines rendered under the subtitle — differs per service
   * type (linked domain/notes for Email, email/website count for Hosting,
   * account email/notes for Domain). */
  extra?: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-400">{subtitle}</p>
        {extra}
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <div className="text-sm">
          <p className="text-slate-700 dark:text-slate-300">
            {isLifetime ? "Never expires" : formatDate(expirationDate)}
          </p>
          <p className="text-xs text-slate-400">
            {formatCurrency(annualCost + (commissionUsd ?? 0))}
            {isLifetime ? "" : "/yr"}
          </p>
        </div>
        {isLifetime ? (
          <LifetimeBadge />
        ) : (
          <StatusBadge renewal={getRenewalInfo(expirationDate!)} />
        )}
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" aria-label="Edit" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Delete" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  );
}
