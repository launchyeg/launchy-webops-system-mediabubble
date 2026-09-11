const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const preciseCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return currencyFormatter.format(0);
  }
  return Number.isInteger(value)
    ? currencyFormatter.format(value)
    : preciseCurrencyFormatter.format(value);
}

// Built manually (number formatting + a literal "£" prefix) rather than
// Intl's `currency: "EGP"` style — ICU renders that inconsistently across
// environments ("EGP", "E£", or Arabic text depending on locale data), so
// this guarantees the same "£1,234" output everywhere.
const egpNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function formatEgp(value: number | null | undefined): string {
  const amount = value === null || value === undefined || Number.isNaN(value) ? 0 : value;
  return `£${egpNumberFormatter.format(amount)}`;
}

export function pluralize(count: number, noun: string, plural?: string) {
  return `${count} ${count === 1 ? noun : plural ?? `${noun}s`}`;
}
