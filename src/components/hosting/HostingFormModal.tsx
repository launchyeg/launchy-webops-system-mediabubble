import { type FormEvent, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { ProviderSelect } from "@/components/shared/ProviderSelect";
import { ClientSelect } from "@/components/shared/ClientSelect";
import { useToast } from "@/contexts/ToastContext";
import { createHosting, updateHosting } from "@/services/hosting.service";
import { getRenewalInfo, renewalTierToServiceStatus } from "@/utils/dates";
import { HOSTING_PROVIDERS } from "@/utils/constants";
import type { ClientRow, HostingWithClient } from "@/types";

interface HostingFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  hosting?: HostingWithClient | null;
  clients: Pick<ClientRow, "id" | "client_name">[];
  defaultClientId?: string;
}

const EMPTY_FORM = {
  account_name: "",
  provider: "",
  expiration_date: "",
  auto_renewal: false,
  account_email: "",
  annual_cost: "",
  client_id: "",
  notes: "",
};

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

  useEffect(() => {
    if (!open) return;
    setForm(
      hosting
        ? {
            account_name: hosting.account_name,
            provider: hosting.provider,
            expiration_date: hosting.expiration_date,
            auto_renewal: hosting.auto_renewal,
            account_email: hosting.account_email ?? "",
            annual_cost: String(hosting.annual_cost ?? ""),
            client_id: hosting.client_id ?? "",
            notes: hosting.notes ?? "",
          }
        : { ...EMPTY_FORM, client_id: defaultClientId ?? "" }
    );
  }, [hosting, open, defaultClientId]);

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
        account_name: form.account_name.trim(),
        provider: form.provider.trim(),
        expiration_date: form.expiration_date,
        auto_renewal: form.auto_renewal,
        account_email: form.account_email.trim() || null,
        annual_cost: Number(form.annual_cost) || 0,
        client_id: form.client_id,
        notes: form.notes.trim() || null,
        status: renewalTierToServiceStatus(tier),
      };
      if (isEdit && hosting) {
        await updateHosting(hosting.id, payload);
        toast({ title: "Hosting account updated", variant: "success" });
      } else {
        await createHosting(payload);
        toast({ title: "Hosting account added", variant: "success" });
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
      title={isEdit ? "Edit Hosting Account" : "Add Hosting Account"}
      description={
        isEdit ? "Update this hosting account's details." : "Register a new hosting account."
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Hosting Account Name / Identifier"
          required
          placeholder="e.g. client-site-prod"
          value={form.account_name}
          onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProviderSelect
            presets={HOSTING_PROVIDERS}
            value={form.provider}
            onChange={(v) => setForm((f) => ({ ...f, provider: v }))}
            label="Hosting Provider"
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
          label="Hosting Account Email"
          type="email"
          value={form.account_email}
          onChange={(e) => setForm((f) => ({ ...f, account_email: e.target.value }))}
        />
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
