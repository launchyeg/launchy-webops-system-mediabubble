import { type FormEvent, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { ProviderSelect } from "@/components/shared/ProviderSelect";
import { ClientSelect } from "@/components/shared/ClientSelect";
import { useToast } from "@/contexts/ToastContext";
import { createEmail, updateEmail } from "@/services/emails.service";
import { getRenewalInfo, renewalTierToServiceStatus } from "@/utils/dates";
import { EMAIL_PROVIDERS } from "@/utils/constants";
import type { ClientRow, EmailWithClient } from "@/types";

interface EmailFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  email?: EmailWithClient | null;
  clients: Pick<ClientRow, "id" | "client_name">[];
  defaultClientId?: string;
}

const EMPTY_FORM = {
  email_account: "",
  provider: "",
  expiration_date: "",
  auto_renewal: false,
  account_email: "",
  annual_cost: "",
  client_id: "",
  notes: "",
};

export function EmailFormModal({
  open,
  onClose,
  onSuccess,
  email,
  clients,
  defaultClientId,
}: EmailFormModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(email);

  useEffect(() => {
    if (!open) return;
    setForm(
      email
        ? {
            email_account: email.email_account,
            provider: email.provider,
            expiration_date: email.expiration_date,
            auto_renewal: email.auto_renewal,
            account_email: email.account_email ?? "",
            annual_cost: String(email.annual_cost ?? ""),
            client_id: email.client_id ?? "",
            notes: email.notes ?? "",
          }
        : { ...EMPTY_FORM, client_id: defaultClientId ?? "" }
    );
  }, [email, open, defaultClientId]);

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
        email_account: form.email_account.trim(),
        provider: form.provider.trim(),
        expiration_date: form.expiration_date,
        auto_renewal: form.auto_renewal,
        account_email: form.account_email.trim() || null,
        annual_cost: Number(form.annual_cost) || 0,
        client_id: form.client_id,
        notes: form.notes.trim() || null,
        status: renewalTierToServiceStatus(tier),
      };
      if (isEdit && email) {
        await updateEmail(email.id, payload);
        toast({ title: "Email updated", variant: "success" });
      } else {
        await createEmail(payload);
        toast({ title: "Email added", variant: "success" });
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
      title={isEdit ? "Edit Email" : "Add Email"}
      description={isEdit ? "Update this email account's details." : "Register a new email account."}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email Account / Service Name"
          required
          placeholder="e.g. team@client.com"
          value={form.email_account}
          onChange={(e) => setForm((f) => ({ ...f, email_account: e.target.value }))}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProviderSelect
            presets={EMAIL_PROVIDERS}
            value={form.provider}
            onChange={(v) => setForm((f) => ({ ...f, provider: v }))}
            label="Email Provider"
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
          label="Account Email"
          type="email"
          hint="The billing / admin login email for this service."
          value={form.account_email}
          onChange={(e) => setForm((f) => ({ ...f, account_email: e.target.value }))}
        />
        <Switch
          id="email-auto-renewal"
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
            {isEdit ? "Save Changes" : "Add Email"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
