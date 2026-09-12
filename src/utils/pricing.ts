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
