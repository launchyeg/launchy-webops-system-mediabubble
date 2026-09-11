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

const egpFormatter = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

export function formatEgp(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return egpFormatter.format(0);
  }
  return egpFormatter.format(value);
}

export function pluralize(count: number, noun: string, plural?: string) {
  return `${count} ${count === 1 ? noun : plural ?? `${noun}s`}`;
}
