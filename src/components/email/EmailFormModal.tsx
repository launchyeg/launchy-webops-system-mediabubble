import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { ProviderSelect } from "@/components/shared/ProviderSelect";
import { ClientSelect } from "@/components/shared/ClientSelect";
import { useToast } from "@/contexts/ToastContext";
import { createEmail, updateEmail } from "@/services/emails.service";
import { getRenewalInfo, renewalTierToServiceStatus } from "@/utils/dates";
import { EMAIL_PROVIDERS } from "@/utils/constants";
import { useUsdToEgpRate } from "@/hooks/useUsdToEgpRate";
import { useDomains } from "@/hooks/useDomains";
import { formatCurrency, formatEgp } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { ClientRow, EmailMailbox, EmailWithClient } from "@/types";

const EMPTY_MAILBOX: EmailMailbox = { email: "", password: "", storage: "" };

/** The local part of a mailbox address — everything before the domain
 * suffix if it matches `domain`, otherwise everything before the first
 * "@" (or the whole string, if there's no "@" at all yet). */
function localPartOf(email: string, domain: string | null): string {
  if (domain && email.toLowerCase().endsWith(`@${domain.toLowerCase()}`)) {
    return email.slice(0, email.length - domain.length - 1);
  }
  const at = email.indexOf("@");
  return at === -1 ? email : email.slice(0, at);
}

function withDomain(localPart: string, domain: string | null): string {
  return domain ? `${localPart}@${domain}` : localPart;
}

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
  domain_id: "",
  is_lifetime: false,
  expiration_date: "",
  annual_cost: "",
  commission_usd: "",
  lifetime_cost_egp: "",
  account_email: "",
  auto_renewal: false,
  mailboxes: [] as EmailMailbox[],
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
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  const isEdit = Boolean(email);
  const { rate: egpRate } = useUsdToEgpRate();
  const { domains } = useDomains();

  const clientDomains = useMemo(
    () => domains.filter((d) => d.client_id === form.client_id),
    [domains, form.client_id]
  );
  const selectedDomainName =
    clientDomains.find((d) => d.id === form.domain_id)?.domain_name ?? null;

  // Email Cost and Commission are per-mailbox rates — the client is billed
  // that rate times however many mailboxes are entered in the Mailboxes
  // section below.
  const mailboxCount = form.mailboxes.length;
  const perMailboxEmailCostUsd = Number(form.annual_cost) || 0;
  const perMailboxCommissionUsd = Number(form.commission_usd) || 0;
  const totalEmailCostUsd = perMailboxEmailCostUsd * mailboxCount;
  const totalCommissionUsd = perMailboxCommissionUsd * mailboxCount;
  const finalPriceUsd = totalEmailCostUsd + totalCommissionUsd;

  const handleClientChange = (clientId: string) =>
    // Switching clients invalidates the previously selected domain (it
    // belonged to the old client) — clear it and strip any "@domain" suffix
    // already composed into the mailbox rows.
    setForm((f) => ({
      ...f,
      client_id: clientId,
      domain_id: "",
      mailboxes: f.mailboxes.map((m) => ({
        ...m,
        email: localPartOf(m.email, selectedDomainName),
      })),
    }));

  const handleDomainChange = (domainId: string) =>
    setForm((f) => {
      const newDomain = clientDomains.find((d) => d.id === domainId)?.domain_name ?? null;
      return {
        ...f,
        domain_id: domainId,
        mailboxes: f.mailboxes.map((m) => ({
          ...m,
          email: withDomain(localPartOf(m.email, selectedDomainName), newDomain),
        })),
      };
    });

  const addMailbox = () =>
    setForm((f) => ({ ...f, mailboxes: [...f.mailboxes, { ...EMPTY_MAILBOX }] }));

  const updateMailbox = (index: number, patch: Partial<EmailMailbox>) =>
    setForm((f) => ({
      ...f,
      mailboxes: f.mailboxes.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));

  const updateMailboxLocalPart = (index: number, localPart: string) =>
    updateMailbox(index, { email: withDomain(localPart, selectedDomainName) });

  const removeMailbox = (index: number) => {
    setForm((f) => ({ ...f, mailboxes: f.mailboxes.filter((_, i) => i !== index) }));
    setVisiblePasswords((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  };

  const togglePasswordVisible = (index: number) =>
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  useEffect(() => {
    if (!open) return;
    setForm(
      email
        ? (() => {
            // annual_cost / commission_usd are stored as totals (per-mailbox
            // rate × mailbox count) — divide back out by the saved mailbox
            // count to recover the per-mailbox rate for these inputs.
            const storedMailboxCount = email.mailboxes?.length ?? 0;
            const perMailboxRate = (total: number) =>
              storedMailboxCount > 0 ? total / storedMailboxCount : total;
            return {
              email_account: email.email_account,
              provider: email.provider,
              domain_id: email.domain_id ?? "",
              is_lifetime: email.is_lifetime,
              expiration_date: email.expiration_date ?? "",
              annual_cost: String(perMailboxRate(email.annual_cost ?? 0)),
              commission_usd: String(perMailboxRate(email.commission_usd ?? 0)),
              lifetime_cost_egp: String(email.lifetime_cost_egp ?? ""),
              account_email: email.account_email ?? "",
              auto_renewal: email.auto_renewal,
              mailboxes: email.mailboxes ?? [],
              client_id: email.client_id ?? "",
              notes: email.notes ?? "",
            };
          })()
        : { ...EMPTY_FORM, client_id: defaultClientId ?? "" }
    );
    setVisiblePasswords(new Set());
  }, [email, open, defaultClientId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.client_id) {
      toast({ title: "Please select a client", variant: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const status = form.is_lifetime
        ? ("active" as const)
        : renewalTierToServiceStatus(getRenewalInfo(form.expiration_date).tier);
      const payload = {
        email_account: form.email_account.trim(),
        provider: form.provider.trim(),
        domain_id: form.domain_id || null,
        is_lifetime: form.is_lifetime,
        expiration_date: form.is_lifetime ? null : form.expiration_date,
        auto_renewal: form.is_lifetime ? false : form.auto_renewal,
        account_email: form.account_email.trim() || null,
        // Stored as totals (per-mailbox rate × mailbox count) so dashboard
        // sums (Overview's Annual Email Cost) reflect this service's true
        // cost — the form fields themselves hold the per-mailbox rate.
        annual_cost: form.is_lifetime ? 0 : totalEmailCostUsd,
        commission_usd: form.is_lifetime ? 0 : totalCommissionUsd,
        lifetime_cost_egp: form.is_lifetime ? Number(form.lifetime_cost_egp) || 0 : 0,
        mailboxes: form.mailboxes
          .filter((m) => m.email.trim() || m.password.trim() || m.storage.trim())
          .map((m) => ({
            email: m.email.trim(),
            password: m.password,
            storage: m.storage.trim(),
          })),
        client_id: form.client_id,
        notes: form.notes.trim() || null,
        status,
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" autoComplete="off">
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
            onChange={handleClientChange}
            required
            includeUnassigned={false}
          />
        </div>

        <Select
          label="Domain"
          value={form.domain_id}
          onChange={(e) => handleDomainChange(e.target.value)}
          disabled={!form.client_id}
          hint={
            !form.client_id
              ? "Select a client above first."
              : clientDomains.length === 0
                ? "This client has no domains on file yet — mailbox emails will need to be typed in full."
                : "Used to auto-append \"@domain\" to mailbox local parts below."
          }
        >
          <option value="">No domain selected</option>
          {clientDomains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.domain_name}
            </option>
          ))}
        </Select>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Pricing Duration
          </label>
          <div className="inline-flex w-fit rounded-lg border border-slate-300 p-0.5 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_lifetime: false }))}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                !form.is_lifetime
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              )}
            >
              Expiration Date
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_lifetime: true }))}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                form.is_lifetime
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              )}
            >
              Lifetime
            </button>
          </div>
        </div>

        {form.is_lifetime ? (
          <Input
            label="Annual Cost (EGP)"
            type="number"
            min="0"
            step="0.01"
            required
            hint="A one-time lifetime price, entered directly in Egyptian Pounds."
            value={form.lifetime_cost_egp}
            onChange={(e) => setForm((f) => ({ ...f, lifetime_cost_egp: e.target.value }))}
          />
        ) : (
          <>
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
                label="Email Cost (USD)"
                type="number"
                min="0"
                step="0.01"
                required
                hint="Per mailbox."
                value={form.annual_cost}
                onChange={(e) => setForm((f) => ({ ...f, annual_cost: e.target.value }))}
              />
            </div>
            <Input
              label="Commission (USD)"
              type="number"
              min="0"
              step="0.01"
              hint="Your company's fee for managing one mailbox, on top of its email cost. Per mailbox, like Email Cost above."
              value={form.commission_usd}
              onChange={(e) => setForm((f) => ({ ...f, commission_usd: e.target.value }))}
            />
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="text-xs font-medium text-slate-400">
                Final Price to Client
                <span className="ml-1 font-normal">
                  ({formatCurrency(perMailboxEmailCostUsd + perMailboxCommissionUsd)} ×{" "}
                  {mailboxCount} mailbox{mailboxCount === 1 ? "" : "es"})
                </span>
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
                    <dt>Email price</dt>
                    <dd>{formatEgp(totalEmailCostUsd * egpRate)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Commission</dt>
                    <dd>{formatEgp(totalCommissionUsd * egpRate)}</dd>
                  </div>
                </dl>
              )}
            </div>
          </>
        )}

        <Input
          label="Account Email"
          type="email"
          hint="The billing / admin login email for this service."
          value={form.account_email}
          onChange={(e) => setForm((f) => ({ ...f, account_email: e.target.value }))}
        />
        {!form.is_lifetime && (
          <Switch
            id="email-auto-renewal"
            checked={form.auto_renewal}
            onChange={(checked) => setForm((f) => ({ ...f, auto_renewal: checked }))}
            label="Auto Renewal Enabled"
          />
        )}
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Mailboxes
            </p>
            <Button type="button" size="sm" variant="outline" onClick={addMailbox}>
              <Plus className="h-4 w-4" />
              Add Mailbox
            </Button>
          </div>
          {form.mailboxes.map((mailbox, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  {selectedDomainName ? (
                    <Input
                      label="Email"
                      type="text"
                      name={`mailbox-email-${index}`}
                      autoComplete="off"
                      placeholder="sales"
                      suffix={`@${selectedDomainName}`}
                      value={localPartOf(mailbox.email, selectedDomainName)}
                      onChange={(e) => updateMailboxLocalPart(index, e.target.value)}
                    />
                  ) : (
                    <Input
                      label="Email"
                      type="email"
                      name={`mailbox-email-${index}`}
                      autoComplete="off"
                      placeholder="user@client.com"
                      value={mailbox.email}
                      onChange={(e) => updateMailbox(index, { email: e.target.value })}
                    />
                  )}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="mt-6 shrink-0"
                  aria-label="Remove mailbox"
                  onClick={() => removeMailbox(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Input
                    label="Password"
                    type={visiblePasswords.has(index) ? "text" : "password"}
                    name={`mailbox-password-${index}`}
                    autoComplete="new-password"
                    value={mailbox.password}
                    onChange={(e) => updateMailbox(index, { password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisible(index)}
                    className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label={visiblePasswords.has(index) ? "Hide password" : "Show password"}
                  >
                    {visiblePasswords.has(index) ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <Input
                  label="Email Storage"
                  placeholder="e.g. 30 GB"
                  value={mailbox.storage}
                  onChange={(e) => updateMailbox(index, { storage: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>

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
