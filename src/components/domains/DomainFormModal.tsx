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
import { useUsdToEgpRate } from "@/hooks/useUsdToEgpRate";
import { formatCurrency, formatEgp } from "@/utils/format";
import { applyDiscount, withBankFee } from "@/utils/pricing";
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
  commission_usd: "",
  discount_percent: "",
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
  const { rate: egpRate } = useUsdToEgpRate();

  const annualCostUsd = Number(form.annual_cost) || 0;
  // The bank charges its own card-payment fee on top of the registrar's
  // price — a real cost, not a markup. It's folded in here, before
  // commission, so it becomes part of the "full domain price" everywhere
  // downstream (Final Price, Secondary Expenses, Financial Analytics).
  // annual_cost itself keeps storing the raw, pre-fee figure typed below —
  // see the payload in handleSubmit.
  const annualCostWithFeeUsd = withBankFee(annualCostUsd);
  const bankFeeUsd = annualCostWithFeeUsd - annualCostUsd;
  const commissionUsd = Number(form.commission_usd) || 0;
  const discountPercent = Math.min(
    100,
    Math.max(0, Number(form.discount_percent) || 0),
  );
  const discountAmountUsd =
    commissionUsd - applyDiscount(commissionUsd, discountPercent);
  const netCommissionUsd = commissionUsd - discountAmountUsd;
  const finalPriceUsd = annualCostWithFeeUsd + netCommissionUsd;

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
            commission_usd: String(domain.commission_usd ?? ""),
            discount_percent: String(domain.discount_percent ?? ""),
            client_id: domain.client_id ?? "",
            notes: domain.notes ?? "",
          }
        : { ...EMPTY_FORM, client_id: defaultClientId ?? "" },
    );
  }, [domain, open, defaultClientId]);

  // Picking "Unknown" as the provider means there's no real data to enter
  // for this domain beyond its name/client — auto-fill every other field
  // with a placeholder representing "unknown": account_email gets the
  // literal text "Unknown" (its input is type="text", not type="email",
  // specifically so this isn't rejected by native email-format validation),
  // cost/commission/discount go to $0, auto-renewal goes off, and
  // expiration_date gets pushed to a far-future placeholder (2099-01-01) so
  // it never surfaces in renewal-urgency tracking (status badges, the
  // "Renewals Due" stat cards, "Upcoming Renewals") the way a real deadline
  // would — the schema has no true "unknown date" concept, so this is the
  // safest stand-in.
  const handleProviderChange = (v: string) =>
    setForm((f) =>
      v === "Unknown"
        ? {
            ...f,
            provider: v,
            account_email: "Unknown",
            expiration_date: "2099-01-01",
            annual_cost: "0",
            commission_usd: "0",
            discount_percent: "0",
            auto_renewal: false,
          }
        : { ...f, provider: v },
    );

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
        // The raw, pre-bank-fee cost — exactly what was typed above. The
        // 5% fee is applied fresh wherever annual_cost is read (Final
        // Price, Secondary Expenses, Financial Analytics — see
        // withBankFee in utils/pricing.ts) rather than stored here, so
        // re-saving this same domain later never compounds the fee.
        annual_cost: Number(form.annual_cost) || 0,
        commission_usd: Number(form.commission_usd) || 0,
        discount_percent: discountPercent,
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
      description={
        isEdit ? "Update this domain's details." : "Register a new domain."
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Domain Name"
          required
          placeholder="example.com"
          value={form.domain_name}
          onChange={(e) =>
            setForm((f) => ({ ...f, domain_name: e.target.value }))
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProviderSelect
            presets={DOMAIN_PROVIDERS}
            value={form.provider}
            onChange={handleProviderChange}
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
        <Input
          label="Domain Account Email"
          // "text", not "email" — a Provider="Unknown" domain gets the
          // literal placeholder "Unknown" here, which would fail native
          // email-format validation on type="email" and block saving.
          type="text"
          hint="The login email for the registrar account."
          value={form.account_email}
          onChange={(e) =>
            setForm((f) => ({ ...f, account_email: e.target.value }))
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Expiration Date"
            type="date"
            required
            hint="Drives this domain's renewal status badge and its place."
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
            hint="Registrar's price only — the 5% bank fee is added automatically."
            value={form.annual_cost}
            onChange={(e) =>
              setForm((f) => ({ ...f, annual_cost: e.target.value }))
            }
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-4">
          <Input
            label="Commission (USD)"
            type="number"
            min="0"
            step="0.01"
            hint="Your fee for managing this domain"
            value={form.commission_usd}
            onChange={(e) =>
              setForm((f) => ({ ...f, commission_usd: e.target.value }))
            }
          />
          <Input
            label="Discount (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            className="w-24"
            hint="Off the commission only."
            value={form.discount_percent}
            onChange={(e) => {
              const raw = e.target.value;
              // Clamp to [0, 100] as soon as it's out of range, rather than
              // only relying on native form validation at submit time —
              // otherwise the live preview below could briefly show a
              // negative discount amount while typing.
              const clamped =
                raw === ""
                  ? ""
                  : String(Math.min(100, Math.max(0, Number(raw))));
              setForm((f) => ({ ...f, discount_percent: clamped }));
            }}
          />
        </div>
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
                <dt>Domain price</dt>
                <dd>{formatEgp(annualCostUsd * egpRate)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Bank fee (5%)</dt>
                <dd>{formatEgp(bankFeeUsd * egpRate)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Commission</dt>
                <dd>{formatEgp(commissionUsd * egpRate)}</dd>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between gap-2 text-emerald-600 dark:text-emerald-400">
                  <dt>Discount ({discountPercent}%)</dt>
                  <dd>-{formatEgp(discountAmountUsd * egpRate)}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
        <Switch
          id="domain-auto-renewal"
          checked={form.auto_renewal}
          onChange={(checked) =>
            setForm((f) => ({ ...f, auto_renewal: checked }))
          }
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
