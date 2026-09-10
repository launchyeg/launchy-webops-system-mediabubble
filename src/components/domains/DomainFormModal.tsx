import { type FormEvent, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { ProviderSelect } from "@/components/shared/ProviderSelect";
import { ClientSelect } from "@/components/shared/ClientSelect";
import { useToast } from "@/contexts/ToastContext";
import { createDomain, updateDomain } from "@/services/domains.service";
import { getRenewalInfo, renewalTierToServiceStatus } from "@/utils/dates";
import { DOMAIN_PROVIDERS } from "@/utils/constants";
import type { ClientRow, DomainWithClient } from "@/types";

interface DomainFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  domain?: DomainWithClient | null;
  clients: Pick<ClientRow, "id" | "client_name">[];
  defaultClientId?: string;
}

const EMPTY_FORM = {
  domain_name: "",
  provider: "",
  expiration_date: "",
  auto_renewal: false,
  account_email: "",
  annual_cost: "",
  client_id: "",
  notes: "",
};

export function DomainFormModal({
  open,
  onClose,
  onSuccess,
  domain,
  clients,
  defaultClientId,
}: DomainFormModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(domain);

  useEffect(() => {
    if (!open) return;
    setForm(
      domain
        ? {
            domain_name: domain.domain_name,
            provider: domain.provider,
            expiration_date: domain.expiration_date,
            auto_renewal: domain.auto_renewal,
            account_email: domain.account_email ?? "",
            annual_cost: String(domain.annual_cost ?? ""),
            client_id: domain.client_id ?? "",
            notes: domain.notes ?? "",
          }
        : { ...EMPTY_FORM, client_id: defaultClientId ?? "" }
    );
  }, [domain, open, defaultClientId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.client_id) {
      toast({ title: "Please select a client", variant: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const tier = getRenewalInfo(form.expiration_date).tier;
      const payload = {
        domain_name: form.domain_name.trim(),
        provider: form.provider.trim(),
        expiration_date: form.expiration_date,
        auto_renewal: form.auto_renewal,
        account_email: form.account_email.trim() || null,
        annual_cost: Number(form.annual_cost) || 0,
        client_id: form.client_id,
        notes: form.notes.trim() || null,
        status: renewalTierToServiceStatus(tier),
      };
      if (isEdit && domain) {
        await updateDomain(domain.id, payload);
        toast({ title: "Domain updated", variant: "success" });
      } else {
        await createDomain(payload);
        toast({ title: "Domain added", variant: "success" });
      }
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
      title={isEdit ? "Edit Domain" : "Add Domain"}
      description={isEdit ? "Update this domain's details." : "Register a new domain."}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Domain Name"
          required
          placeholder="example.com"
          value={form.domain_name}
          onChange={(e) => setForm((f) => ({ ...f, domain_name: e.target.value }))}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProviderSelect
            presets={DOMAIN_PROVIDERS}
            value={form.provider}
            onChange={(v) => setForm((f) => ({ ...f, provider: v }))}
            required
          />
          <ClientSelect
            clients={clients}
            value={form.client_id}
            onChange={(v) => setForm((f) => ({ ...f, client_id: v }))}
            required
            includeUnassigned={false}
          />
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
          label="Domain Account Email"
          type="email"
          hint="The login email for the registrar account."
          value={form.account_email}
          onChange={(e) => setForm((f) => ({ ...f, account_email: e.target.value }))}
        />
        <Switch
          id="domain-auto-renewal"
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
            {isEdit ? "Save Changes" : "Add Domain"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
