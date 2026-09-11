import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { ProviderSelect } from "@/components/shared/ProviderSelect";
import { ClientSelect } from "@/components/shared/ClientSelect";
import { useToast } from "@/contexts/ToastContext";
import {
  createHosting,
  listHostingDomainIds,
  setHostingDomains,
  updateHosting,
} from "@/services/hosting.service";
import { getRenewalInfo, renewalTierToServiceStatus } from "@/utils/dates";
import { HOSTING_PROVIDERS } from "@/utils/constants";
import { useUsdToEgpRate } from "@/hooks/useUsdToEgpRate";
import { useDomains } from "@/hooks/useDomains";
import { useSharedHosting } from "@/hooks/useSharedHosting";
import { formatCurrency, formatEgp } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { ClientRow, HostingWithClient, HostType } from "@/types";

interface HostingFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  hosting?: HostingWithClient | null;
  clients: Pick<ClientRow, "id" | "client_name">[];
  defaultClientId?: string;
}

const EMPTY_FORM = {
  host_type: "private" as HostType,
  account_name: "",
  shared_hosting_id: "",
  provider: "",
  expiration_date: "",
  auto_renewal: false,
  account_email: "",
  annual_cost: "",
  commission_usd: "",
  client_id: "",
  // Always at least one row, even blank — the Domains section keeps a
  // visible input ready rather than collapsing away when nothing's picked.
  domain_ids: [""] as string[],
  notes: "",
};

const withAtLeastOneDomainRow = (ids: string[]) => (ids.length === 0 ? [""] : ids);

export function HostingFormModal({
  open,
  onClose,
  onSuccess,
  hosting,
  clients,
  defaultClientId,
}: HostingFormModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(hosting);
  const { rate: egpRate } = useUsdToEgpRate();
  const { domains } = useDomains();
  const { sharedHosting } = useSharedHosting();

  const clientDomains = useMemo(
    () => domains.filter((d) => d.client_id === form.client_id),
    [domains, form.client_id]
  );

  const annualCostUsd = Number(form.annual_cost) || 0;
  const commissionUsd = Number(form.commission_usd) || 0;
  const finalPriceUsd = annualCostUsd + commissionUsd;

  useEffect(() => {
    if (!open) return;
    setForm(
      hosting
        ? {
            host_type: hosting.host_type,
            account_name: hosting.account_name,
            shared_hosting_id: hosting.shared_hosting_id ?? "",
            provider: hosting.provider,
            expiration_date: hosting.expiration_date,
            auto_renewal: hosting.auto_renewal,
            account_email: hosting.account_email ?? "",
            annual_cost: String(hosting.annual_cost ?? ""),
            commission_usd: String(hosting.commission_usd ?? ""),
            client_id: hosting.client_id ?? "",
            domain_ids: [""],
            notes: hosting.notes ?? "",
          }
        : { ...EMPTY_FORM, client_id: defaultClientId ?? "" }
    );
    if (hosting) {
      listHostingDomainIds(hosting.id)
        .then((ids) => setForm((f) => ({ ...f, domain_ids: withAtLeastOneDomainRow(ids) })))
        .catch((err) => {
          toast({
            title: "Couldn't load this account's linked domains",
            description: err instanceof Error ? err.message : undefined,
            variant: "error",
          });
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hosting, open, defaultClientId]);

  const handleClientChange = (clientId: string) =>
    // Switching clients invalidates any previously selected domains (they
    // belonged to the old client).
    setForm((f) => ({ ...f, client_id: clientId, domain_ids: [""] }));

  // A shared host's Provider and Account Email aren't typed manually — they
  // mirror the selected shared_hosting plan and become read-only.
  const sharedHostFields = (planId: string) => {
    const plan = sharedHosting.find((s) => s.id === planId);
    return { provider: plan?.provider ?? "", account_email: plan?.account_email ?? "" };
  };

  const handleHostTypeChange = (hostType: HostType) =>
    setForm((f) => ({
      ...f,
      host_type: hostType,
      ...(hostType === "shared" ? sharedHostFields(f.shared_hosting_id) : {}),
    }));

  const handleSharedHostChange = (planId: string) =>
    setForm((f) => ({ ...f, shared_hosting_id: planId, ...sharedHostFields(planId) }));

  const addDomainRow = () => setForm((f) => ({ ...f, domain_ids: [...f.domain_ids, ""] }));

  const updateDomainRow = (index: number, domainId: string) =>
    setForm((f) => ({
      ...f,
      domain_ids: f.domain_ids.map((id, i) => (i === index ? domainId : id)),
    }));

  const removeDomainRow = (index: number) =>
    setForm((f) => ({
      ...f,
      domain_ids: withAtLeastOneDomainRow(f.domain_ids.filter((_, i) => i !== index)),
    }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.client_id) {
      toast({ title: "Please select a client", variant: "error" });
      return;
    }
    const selectedSharedHost =
      form.host_type === "shared"
        ? sharedHosting.find((s) => s.id === form.shared_hosting_id)
        : null;
    if (form.host_type === "shared" && !selectedSharedHost) {
      toast({ title: "Please select a shared host", variant: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const tier = getRenewalInfo(form.expiration_date).tier;
      const payload = {
        host_type: form.host_type,
        // A shared host's name is a snapshot of the linked plan's name at
        // save time, not a live join — kept in sync with everywhere
        // account_name is already displayed as this row's title.
        account_name:
          form.host_type === "shared" ? selectedSharedHost!.name : form.account_name.trim(),
        shared_hosting_id: form.host_type === "shared" ? form.shared_hosting_id : null,
        provider: form.provider.trim(),
        expiration_date: form.expiration_date,
        auto_renewal: form.auto_renewal,
        account_email: form.account_email.trim() || null,
        annual_cost: Number(form.annual_cost) || 0,
        commission_usd: Number(form.commission_usd) || 0,
        client_id: form.client_id,
        notes: form.notes.trim() || null,
        status: renewalTierToServiceStatus(tier),
      };
      const domainIds = Array.from(new Set(form.domain_ids.filter((id) => id)));
      let hostingId: string;
      if (isEdit && hosting) {
        await updateHosting(hosting.id, payload);
        hostingId = hosting.id;
        toast({ title: "Hosting account updated", variant: "success" });
      } else {
        const created = await createHosting(payload);
        hostingId = created.id;
        toast({ title: "Hosting account added", variant: "success" });
      }
      await setHostingDomains(hostingId, domainIds);
      onSuccess();
      onClose();
    } catch (err) {
      toast({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Hosting Account" : "Add Hosting Account"}
      description={
        isEdit ? "Update this hosting account's details." : "Register a new hosting account."
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Host Type
          </label>
          <div className="inline-flex w-fit rounded-lg border border-slate-300 p-0.5 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleHostTypeChange("private")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                form.host_type === "private"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              )}
            >
              Private Host
            </button>
            <button
              type="button"
              onClick={() => handleHostTypeChange("shared")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                form.host_type === "shared"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              )}
            >
              Shared Host
            </button>
          </div>
        </div>

        {form.host_type === "private" ? (
          <Input
            label="Hosting Account Name / Identifier"
            required
            placeholder="e.g. client-site-prod"
            value={form.account_name}
            onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
          />
        ) : (
          <Select
            label="Shared Host"
            required
            value={form.shared_hosting_id}
            onChange={(e) => handleSharedHostChange(e.target.value)}
            hint={
              sharedHosting.length === 0
                ? "No shared hosting plans exist yet — add one on the Shared Hosting page first."
                : undefined
            }
          >
            <option value="" disabled>
              Select a shared host…
            </option>
            {sharedHosting.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProviderSelect
            presets={HOSTING_PROVIDERS}
            value={form.provider}
            onChange={(v) => setForm((f) => ({ ...f, provider: v }))}
            label="Hosting Provider"
            required
            disabled={form.host_type === "shared"}
            hint={form.host_type === "shared" ? "Set by the selected shared host." : undefined}
          />
          <ClientSelect
            clients={clients}
            value={form.client_id}
            onChange={handleClientChange}
            required
            includeUnassigned={false}
          />
        </div>

        <Input
          label="Hosting Account Email"
          type="email"
          value={form.account_email}
          disabled={form.host_type === "shared"}
          hint={form.host_type === "shared" ? "Set by the selected shared host." : undefined}
          onChange={(e) => setForm((f) => ({ ...f, account_email: e.target.value }))}
        />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Domains
            </p>
            {form.host_type === "private" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!form.client_id}
                onClick={addDomainRow}
              >
                <Plus className="h-4 w-4" />
                Add Domain
              </Button>
            )}
          </div>
          {!form.client_id && (
            <p className="text-xs text-slate-400">Select a client above first.</p>
          )}
          {form.domain_ids.map((domainId, index) => {
            const chosenElsewhere = new Set(
              form.domain_ids.filter((id, i) => i !== index && id)
            );
            const options = clientDomains.filter(
              (d) => d.id === domainId || !chosenElsewhere.has(d.id)
            );
            return (
              <div key={index} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Select
                    value={domainId}
                    onChange={(e) => updateDomainRow(index, e.target.value)}
                  >
                    <option value="">Select a domain…</option>
                    {options.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.domain_name}
                      </option>
                    ))}
                  </Select>
                </div>
                {form.host_type === "private" && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remove domain"
                    onClick={() => removeDomainRow(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Expiration Date"
            type="date"
            required
            value={form.expiration_date}
            onChange={(e) =>
              setForm((f) => ({ ...f, expiration_date: e.target.value }))
            }
          />
          <Input
            label="Annual Cost (USD)"
            type="number"
            min="0"
            step="0.01"
            required
            value={form.annual_cost}
            onChange={(e) => setForm((f) => ({ ...f, annual_cost: e.target.value }))}
          />
        </div>
        <Input
          label="Commission (USD)"
          type="number"
          min="0"
          step="0.01"
          hint="Your company's fee for managing this hosting account, on top of the annual cost."
          value={form.commission_usd}
          onChange={(e) => setForm((f) => ({ ...f, commission_usd: e.target.value }))}
        />
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-slate-400">
            Final Price to Client
          </p>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(finalPriceUsd)}
            {egpRate !== null && (
              <span className="ml-1.5 font-normal text-slate-500 dark:text-slate-400">
                (≈ {formatEgp(finalPriceUsd * egpRate)})
              </span>
            )}
          </p>
          {egpRate !== null && (
            <dl className="mt-1.5 space-y-0.5 border-t border-slate-200 pt-1.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <div className="flex justify-between gap-2">
                <dt>Hosting price</dt>
                <dd>{formatEgp(annualCostUsd * egpRate)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Commission</dt>
                <dd>{formatEgp(commissionUsd * egpRate)}</dd>
              </div>
            </dl>
          )}
        </div>
        <Switch
          id="hosting-auto-renewal"
          checked={form.auto_renewal}
          onChange={(checked) => setForm((f) => ({ ...f, auto_renewal: checked }))}
          label="Auto Renewal Enabled"
        />
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? "Save Changes" : "Add Hosting"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
