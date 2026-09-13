import { type FormEvent, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { ProviderSelect } from "@/components/shared/ProviderSelect";
import { useToast } from "@/contexts/ToastContext";
import {
  createSharedHosting,
  updateSharedHosting,
} from "@/services/sharedHosting.service";
import { getRenewalInfo, renewalTierToServiceStatus } from "@/utils/dates";
import { HOSTING_PROVIDERS } from "@/utils/constants";
import { useUsdToEgpRate } from "@/hooks/useUsdToEgpRate";
import { formatCurrency, formatEgp } from "@/utils/format";
import { withBankFee } from "@/utils/pricing";
import type { SharedHostingRow } from "@/types";

interface SharedHostingFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sharedHosting?: SharedHostingRow | null;
}

const EMPTY_FORM = {
  name: "",
  provider: "",
  account_email: "",
  expiration_date: "",
  auto_renewal: false,
  annual_cost: "",
  notes: "",
};

export function SharedHostingFormModal({
  open,
  onClose,
  onSuccess,
  sharedHosting,
}: SharedHostingFormModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(sharedHosting);
  const { rate: egpRate } = useUsdToEgpRate();

  const annualCostUsd = Number(form.annual_cost) || 0;
  // The bank charges its own card-payment fee on this plan's cost too — a
  // real cost, not a markup — applied the same way as domains, Private
  // hosting, and email (see withBankFee in utils/pricing.ts). annual_cost
  // itself keeps storing the raw, pre-fee figure typed below — see the
  // payload in handleSubmit.
  const annualCostWithFeeUsd = withBankFee(annualCostUsd);
  const bankFeeUsd = annualCostWithFeeUsd - annualCostUsd;

  useEffect(() => {
    if (!open) return;
    setForm(
      sharedHosting
        ? {
            name: sharedHosting.name,
            provider: sharedHosting.provider,
            account_email: sharedHosting.account_email ?? "",
            expiration_date: sharedHosting.expiration_date,
            auto_renewal: sharedHosting.auto_renewal,
            annual_cost: String(sharedHosting.annual_cost ?? ""),
            notes: sharedHosting.notes ?? "",
          }
        : EMPTY_FORM,
    );
  }, [sharedHosting, open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const tier = getRenewalInfo(form.expiration_date).tier;
      const payload = {
        name: form.name.trim(),
        provider: form.provider.trim(),
        account_email: form.account_email.trim() || null,
        expiration_date: form.expiration_date,
        auto_renewal: form.auto_renewal,
        // The raw, pre-bank-fee cost — exactly what was typed below. The
        // 5% fee is applied fresh wherever annual_cost is read (Final
        // Price, Secondary Expenses, Financial Analytics — see
        // withBankFee in utils/pricing.ts) rather than stored here, so
        // re-saving this same plan later never compounds the fee.
        annual_cost: annualCostUsd,
        notes: form.notes.trim() || null,
        status: renewalTierToServiceStatus(tier),
      };
      if (isEdit && sharedHosting) {
        await updateSharedHosting(sharedHosting.id, payload);
        toast({ title: "Shared hosting plan updated", variant: "success" });
      } else {
        await createSharedHosting(payload);
        toast({ title: "Shared hosting plan added", variant: "success" });
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
      title={isEdit ? "Edit Shared Hosting Plan" : "Add Shared Hosting Plan"}
      description={
        isEdit
          ? "Update this shared hosting plan's details."
          : "Register a new shared hosting plan or server."
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Name"
          required
          placeholder="e.g. Reseller Plan — Server 3"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <ProviderSelect
          presets={HOSTING_PROVIDERS}
          value={form.provider}
          onChange={(v) => setForm((f) => ({ ...f, provider: v }))}
          label="Hosting Provider"
          required
        />
        <Input
          label="Hosting Account Email"
          type="email"
          hint="The login / admin email for this shared server."
          value={form.account_email}
          onChange={(e) =>
            setForm((f) => ({ ...f, account_email: e.target.value }))
          }
          required
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Expiration Date"
            type="date"
            required
            hint="Drives this plan's renewal status badge in Upcoming Renewals."
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
            hint="Host's price only — the 5% bank fee is added automatically."
            value={form.annual_cost}
            onChange={(e) =>
              setForm((f) => ({ ...f, annual_cost: e.target.value }))
            }
          />
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-slate-400">Final Price</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(annualCostWithFeeUsd)}
            {egpRate !== null && (
              <span className="ml-1.5 font-normal text-slate-500 dark:text-slate-400">
                (≈ {formatEgp(annualCostWithFeeUsd * egpRate)})
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
                <dt>Bank fee (5%)</dt>
                <dd>{formatEgp(bankFeeUsd * egpRate)}</dd>
              </div>
            </dl>
          )}
        </div>
        <Switch
          id="shared-hosting-auto-renewal"
          checked={form.auto_renewal}
          onChange={(checked) =>
            setForm((f) => ({ ...f, auto_renewal: checked }))
          }
          label="Auto Renewal Enabled"
        />
        <Textarea
          label="Note"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? "Save Changes" : "Add Shared Hosting"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
