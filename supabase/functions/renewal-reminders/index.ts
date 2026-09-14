// Scheduled Edge Function — emails the admin via Resend whenever a domain,
// hosting account, or recurring email account lands on exactly one of the
// RENEWAL_WINDOWS marks below (30 / 21 / 14 days out, same numbers as
// src/utils/constants.ts, plus a final 7-day reminder). Invoked once a day
// by a daily cron job set up in Supabase Studio (Integrations → Cron Jobs →
// Supabase Edge Function) — see README.md ("Renewal reminder emails
// (Resend)"). The frontend never calls this function directly.
//
// This is a separate Deno deployable from the Vite/React app, so it
// deliberately does not import anything from src/ — its own copy of the
// handful of constants and pricing helpers it needs (RENEWAL_WINDOWS,
// BANK_FEE_PERCENT, applyDiscount, withBankFee — mirroring
// src/utils/constants.ts and src/utils/pricing.ts) keeps it decoupled from
// frontend refactors.
//
// The "Final Price" shown per row is computed with the exact same formula
// the app itself uses on the Domains/Hosting/Emails pages: a Private
// service (a domain, a Private/non-shared hosting account, or a recurring
// email) is withBankFee(annual_cost) + applyDiscount(commission_usd,
// discount_percent); a Shared hosting account (no commission concept) is
// applyDiscount(shared_annual_cost, discount_percent) instead, with no bank
// fee. See src/utils/pricing.ts for the full rationale.
//
// Final Price is shown EGP-primary with the USD amount underneath, same
// convention as the rest of the app (see formatEgp/formatCurrency in
// src/utils/format.ts and the live rate in src/hooks/useUsdToEgpRate.ts) —
// this function fetches the same public exchangerate-api.com rate itself
// rather than sharing that hook's in-browser cache. If that fetch fails,
// the email falls back to USD-only, same as the app does.
//
// It queries `domains` / `hosting` / `emails` directly rather than the
// `upcoming_renewals` view in supabase/schema.sql: the view has no client
// name (only client_id) and, for a "shared" hosting row, reads `annual_cost`
// (always 0 for those — the real figure lives in `shared_annual_cost`),
// both of which this email needs to get right.
//
// Required secrets (`supabase secrets set NAME=value`, never committed):
//   RESEND_API_KEY    — from resend.com/api-keys
//   RESEND_FROM_EMAIL  — a sender address on a domain verified in Resend
//   ADMIN_EMAIL        — where these reminders should land
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the Edge Functions runtime — never set those yourself.
//
// Call with ?test=true to force-send a sample email immediately (using a
// fabricated row, or today's real due rows if there happen to be any) —
// the fastest way to confirm Resend/secrets are wired up correctly without
// waiting for a real expiration date to line up.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

/** Days-before-expiration marks this function reminds on. Mirrors
 * RENEWAL_WINDOWS in src/utils/constants.ts — kept as a separate literal
 * here on purpose, see file header. */
const RENEWAL_WINDOWS = [30, 21, 14, 7] as const;

/** The bank's card-payment fee. Mirrors BANK_FEE_PERCENT in
 * src/utils/constants.ts — see that file for the full rationale. */
const BANK_FEE_PERCENT = 5;

/** Mirrors applyDiscount in src/utils/pricing.ts: applies a percentage
 * discount to a commission (or a Shared host's own cost) only. */
function applyDiscount(
  amount: number,
  discountPercent: number | null | undefined,
): number {
  const pct = discountPercent ?? 0;
  return amount * (1 - pct / 100);
}

/** Mirrors withBankFee in src/utils/pricing.ts: adds the bank's
 * card-payment fee on top of a raw cost. Never applied to a Shared host's
 * shared_annual_cost or an Email's lifetime_cost — see that file. */
function withBankFee(cost: number): number {
  return cost * (1 + BANK_FEE_PERCENT / 100);
}

type ServiceKind = "domain" | "hosting" | "email";

interface RenewalRow {
  kind: ServiceKind;
  serviceName: string;
  clientName: string | null;
  /** clients.phone — the app has no separate numeric client ID, so this is
   * "the customer's number" in the sense of how to reach them. */
  clientPhone: string | null;
  provider: string;
  expirationDate: string; // yyyy-mm-dd
  daysRemaining: number;
  /** The final USD price billed to the client — see the file header for
   * the exact formula, which matches the app's own Domains/Hosting/Emails
   * pages. Not the raw registrar/host cost. */
  finalPrice: number;
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const adminEmail = Deno.env.get("ADMIN_EMAIL");

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !resendApiKey ||
      !fromEmail ||
      !adminEmail
    ) {
      return json(
        {
          error:
            "Missing one or more required secrets (RESEND_API_KEY, RESEND_FROM_EMAIL, ADMIN_EMAIL). Set them with `supabase secrets set`.",
        },
        500,
      );
    }

    // service_role bypasses RLS on purpose — this function has to see every
    // client's renewals, not just what an authenticated end-user can read.
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = utcMidnight(new Date());
    const horizonDays = Math.max(...RENEWAL_WINDOWS);
    const horizon = addDays(today, horizonDays);

    const rows = await fetchUpcomingRenewals(
      supabase,
      today,
      isoDate(today),
      isoDate(horizon),
    );
    const due = rows.filter((row) =>
      (RENEWAL_WINDOWS as readonly number[]).includes(row.daysRemaining),
    );

    const isTest = new URL(req.url).searchParams.get("test") === "true";
    if (due.length === 0 && !isTest) {
      return json({
        sent: false,
        reason: "No services due today",
        checked: rows.length,
      });
    }

    // Only fetched once we know an email is actually going out — no point
    // hitting the rate API on the (much more common) days there's nothing
    // due.
    const egpRate = await fetchEgpRate();

    const rowsForEmail = due.length > 0 ? due : [sampleRow()];
    const { subject, html } = buildEmail(
      rowsForEmail,
      due.length === 0,
      egpRate,
    );

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [adminEmail],
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      return json(
        {
          sent: false,
          error: `Resend API error (${resendRes.status}): ${detail}`,
        },
        502,
      );
    }

    return json({
      sent: true,
      count: due.length,
      test: due.length === 0 && isTest,
    });
  } catch (err) {
    return json(
      { error: String(err instanceof Error ? err.message : err) },
      500,
    );
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Mirrors useUsdToEgpRate in src/hooks/useUsdToEgpRate.ts: the same public,
 * keyless exchangerate-api.com endpoint, computing EGP-per-USD from its
 * EGP-based rates. Returns null on any failure (network error, bad
 * response) — callers should fall back to USD-only in that case, same as
 * the app does. */
async function fetchEgpRate(): Promise<number | null> {
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/EGP");
    if (!res.ok) return null;
    const data = await res.json();
    const egpPerUsd = 1 / data.rates.USD; // API is EGP-based: rates.USD = USD per 1 EGP
    return Number.isFinite(egpPerUsd) ? egpPerUsd : null;
  } catch {
    return null;
  }
}

// Mirrors formatCurrency/formatEgp in src/utils/format.ts.
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const preciseUsdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const egpNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function formatUsd(value: number): string {
  return Number.isInteger(value)
    ? usdFormatter.format(value)
    : preciseUsdFormatter.format(value);
}

function formatEgp(value: number): string {
  return `${egpNumberFormatter.format(value)} EGP`;
}

function utcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parses a Postgres `date` string ("yyyy-mm-dd") as UTC midnight, matching
 * `today`/`horizon` above so the day-count subtraction below can't drift a
 * day off from a local (non-UTC) server timezone. */
function daysUntil(dateStr: string, today: Date): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  return Math.round((target - today.getTime()) / 86_400_000);
}

async function fetchUpcomingRenewals(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  today: Date,
  fromDate: string,
  toDate: string,
): Promise<RenewalRow[]> {
  const [domains, hosting, emails] = await Promise.all([
    supabase
      .from("domains")
      .select(
        "domain_name, provider, expiration_date, annual_cost, commission_usd, discount_percent, clients(client_name, phone)",
      )
      .gte("expiration_date", fromDate)
      .lte("expiration_date", toDate),
    supabase
      .from("hosting")
      .select(
        "account_name, provider, expiration_date, annual_cost, commission_usd, shared_annual_cost, host_type, discount_percent, clients(client_name, phone)",
      )
      .gte("expiration_date", fromDate)
      .lte("expiration_date", toDate),
    supabase
      .from("emails")
      .select(
        "email_account, provider, expiration_date, annual_cost, commission_usd, discount_percent, clients(client_name, phone)",
      )
      .eq("is_lifetime", false) // lifetime emails have no expiration_date to check
      .gte("expiration_date", fromDate)
      .lte("expiration_date", toDate),
  ]);

  for (const result of [domains, hosting, emails]) {
    if (result.error) throw result.error;
  }

  const rows: RenewalRow[] = [];

  for (const d of domains.data ?? []) {
    rows.push({
      kind: "domain",
      serviceName: d.domain_name,
      clientName: d.clients?.client_name ?? null,
      clientPhone: d.clients?.phone ?? null,
      provider: d.provider,
      expirationDate: d.expiration_date,
      daysRemaining: daysUntil(d.expiration_date, today),
      finalPrice:
        withBankFee(Number(d.annual_cost) || 0) +
        applyDiscount(Number(d.commission_usd) || 0, d.discount_percent),
    });
  }

  for (const h of hosting.data ?? []) {
    rows.push({
      kind: "hosting",
      serviceName: h.account_name,
      clientName: h.clients?.client_name ?? null,
      clientPhone: h.clients?.phone ?? null,
      provider: h.provider,
      expirationDate: h.expiration_date,
      daysRemaining: daysUntil(h.expiration_date, today),
      finalPrice:
        h.host_type === "shared"
          ? applyDiscount(Number(h.shared_annual_cost) || 0, h.discount_percent)
          : withBankFee(Number(h.annual_cost) || 0) +
            applyDiscount(Number(h.commission_usd) || 0, h.discount_percent),
    });
  }

  for (const e of emails.data ?? []) {
    rows.push({
      kind: "email",
      serviceName: e.email_account,
      clientName: e.clients?.client_name ?? null,
      clientPhone: e.clients?.phone ?? null,
      provider: e.provider,
      expirationDate: e.expiration_date,
      daysRemaining: daysUntil(e.expiration_date, today),
      finalPrice:
        withBankFee(Number(e.annual_cost) || 0) +
        applyDiscount(Number(e.commission_usd) || 0, e.discount_percent),
    });
  }

  return rows;
}

function sampleRow(): RenewalRow {
  const expiration = isoDate(addDays(utcMidnight(new Date()), 7));
  return {
    kind: "domain",
    serviceName: "TEST — example.com",
    clientName: "Test Client (not real data)",
    clientPhone: "+20 100 000 0000",
    provider: "GoDaddy",
    expirationDate: expiration,
    daysRemaining: 7,
    finalPrice: 15,
  };
}

const KIND_LABEL: Record<ServiceKind, string> = {
  domain: "Domain",
  hosting: "Hosting",
  email: "Email",
};

/** Mirrors the app's own renewal badge styling
 * (src/components/shared/StatusBadge.tsx): pale background + dark red text
 * for the calmer tiers, solid vivid red + white text only for the most
 * urgent one — extended with one paler, distinctly amber tier for the
 * 30-day mark, which the app's own badges don't have (their scale starts at
 * 21). Deliberately NOT four different solid reds distinguished only by how
 * dark each one is — a darker red doesn't reliably read as "more urgent"
 * than a brighter one at a glance (it can read as the opposite), so
 * severity here is unambiguous: pale amber → pale pink → deeper pink →
 * solid red block. */
function windowStyle(days: number): { bg: string; text: string } {
  if (days <= 7) return { bg: "#dc2626", text: "#ffffff" };
  if (days <= 14) return { bg: "#fecaca", text: "#991b1b" };
  if (days <= 21) return { bg: "#fee2e2", text: "#b91c1c" };
  return { bg: "#fef3c7", text: "#92400e" };
}

function buildEmail(
  rows: RenewalRow[],
  isFallbackSample: boolean,
  egpRate: number | null,
): { subject: string; html: string } {
  const byWindow = new Map<number, RenewalRow[]>();
  for (const row of rows) {
    const bucket = byWindow.get(row.daysRemaining) ?? [];
    bucket.push(row);
    byWindow.set(row.daysRemaining, bucket);
  }
  const windows = [...byWindow.keys()].sort((a, b) => a - b);

  const subjectParts = windows.map(
    (w) => `${byWindow.get(w)!.length} due in ${w}d`,
  );
  const subject = isFallbackSample
    ? "mediaBubble Web OPS — Test renewal reminder"
    : `mediaBubble Web OPS — Renewal reminder: ${subjectParts.join(", ")}`;

  const sections = windows
    .map((w) => {
      const items = byWindow
        .get(w)!
        .map(
          (row) => `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:14px;color:#111;">
              <strong>${escapeHtml(row.serviceName)}</strong><br/>
              <span style="color:#666;font-size:12px;">${KIND_LABEL[row.kind]} · ${escapeHtml(row.provider)}</span>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:14px;color:#333;">
              ${escapeHtml(row.clientName ?? "Unassigned")}
              ${row.clientPhone ? `<br/><span style="color:#666;font-size:12px;">${escapeHtml(row.clientPhone)}</span>` : ""}
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:14px;color:#333;white-space:nowrap;">
              ${escapeHtml(row.expirationDate)}
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:14px;color:#333;text-align:right;white-space:nowrap;">
              ${
                egpRate !== null
                  ? `${escapeHtml(formatEgp(row.finalPrice * egpRate))}<br/><span style="color:#666;font-size:12px;">${escapeHtml(formatUsd(row.finalPrice))}</span>`
                  : escapeHtml(formatUsd(row.finalPrice))
              }
            </td>
          </tr>`,
        )
        .join("");

      const style = windowStyle(w);
      return `
        <tr>
          <td colspan="4" style="padding:18px 12px 6px;">
            <span style="display:inline-block;padding:4px 10px;border-radius:12px;background:${style.bg};color:${style.text};font-size:12px;font-weight:600;">
              ${w}-DAY REMINDER
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:0 12px 6px;font-size:12px;color:#666;font-weight:600;">Service</td>
          <td style="padding:0 12px 6px;font-size:12px;color:#666;font-weight:600;">Client</td>
          <td style="padding:0 12px 6px;font-size:12px;color:#666;font-weight:600;">Expires</td>
          <td style="padding:0 12px 6px;font-size:12px;color:#666;font-weight:600;text-align:right;">Final Price</td>
        </tr>
        ${items}`;
    })
    .join("");

  const testNotice = isFallbackSample
    ? `<p style="margin:0 0 20px;padding:12px 16px;background:#fef3c7;border-radius:8px;color:#92400e;font-size:13px;">
        This is a test email (no services are actually due today) — sent because this request included <code>?test=true</code>.
      </p>`
    : "";

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#f8f9fa;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee;">
      <div style="background:#111827;padding:20px 24px;">
        <span style="color:#fff;font-size:16px;font-weight:700;">mediaBubble Web OPS</span>
      </div>
      <div style="padding:24px;">
        <h1 style="margin:0 0 8px;font-size:18px;color:#111;">Renewal reminder</h1>
        <p style="margin:0 0 20px;font-size:14px;color:#555;">
          The following ${isFallbackSample ? "service" : rows.length === 1 ? "service" : "services"}
          ${isFallbackSample ? "is a sample — normally this section lists real services" : rows.length === 1 ? "is" : "are"}
          coming up for renewal. The price shown is the final price billed to the client — the raw
          cost plus the bank's card-payment fee and commission (after any discount), same as the
          app's own Domains/Hosting/Emails pages.
        </p>
        ${testNotice}
        <table style="width:100%;border-collapse:collapse;">
          ${sections}
        </table>
        <p style="margin:24px 0 0;font-size:12px;color:#999;">
          Sent automatically by mediaBubble Web OPS. Open the app to renew or update any of these services.
        </p>
      </div>
    </div>
  </div>`;

  return { subject, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
