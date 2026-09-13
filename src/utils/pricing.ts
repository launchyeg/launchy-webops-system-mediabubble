import { BANK_FEE_PERCENT } from "./constants";

/** Applies a percentage discount to a commission amount only — never to
 * the base price or a combined total. Used wherever a domain's Final
 * Price is computed, so the discount stays consistent everywhere it's
 * shown (the form, the Domains table, Client Details, Client Overview). */
export function applyDiscount(
  commission: number,
  discountPercent: number | null | undefined
): number {
  const pct = discountPercent ?? 0;
  return commission * (1 - pct / 100);
}

/** Adds the bank's card-payment fee (BANK_FEE_PERCENT) on top of a raw
 * cost, giving the full price the company actually pays — before
 * commission or discount are layered on. This is a real cost, not a
 * markup: it's applied identically on the revenue side (Final Price to
 * Client, so the client covers it) and the cost side (Secondary Expenses /
 * COGS, so the company's books count it as an expense), so it never shows
 * up as extra profit — only Commission does that. Apply this to a
 * domain's annual_cost, a Private hosting account's annual_cost, a Shared
 * Hosting plan's own annual_cost, or a recurring email's annual_cost —
 * never to a Lifetime email's lifetime_cost (a one-time purchase, no bank
 * fee) or to Shared hosting's client-billed shared_annual_cost, neither of
 * which carries this fee. What's stored in the database stays the raw,
 * pre-fee cost the staff typed in — this multiplies it fresh every time,
 * so editing a record never compounds the fee. */
export function withBankFee(cost: number): number {
  return cost * (1 + BANK_FEE_PERCENT / 100);
}
