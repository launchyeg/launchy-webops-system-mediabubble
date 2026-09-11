import { useEffect, useState } from "react";

// Cached at module scope so every consumer shares one fetch per page load
// instead of re-hitting the API each time a modal opens.
let cachedRate: number | null = null;
let inflight: Promise<number> | null = null;

async function fetchRate(): Promise<number> {
  const res = await fetch("https://api.exchangerate-api.com/v4/latest/EGP");
  if (!res.ok) throw new Error("Exchange rate request failed");
  const data = await res.json();
  const egpPerUsd = 1 / data.rates.USD; // API is EGP-based: rates.USD = USD per 1 EGP
  if (!Number.isFinite(egpPerUsd)) throw new Error("Invalid exchange rate response");
  return egpPerUsd;
}

/** Live USD→EGP rate (how many EGP per 1 USD), fetched from
 * exchangerate-api.com. Returns `null` while loading or if the request
 * fails — callers should fall back to showing USD only in that case. */
export function useUsdToEgpRate() {
  const [rate, setRate] = useState<number | null>(cachedRate);
  const [loading, setLoading] = useState(cachedRate === null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (cachedRate !== null) return;
    let cancelled = false;
    inflight ??= fetchRate();
    inflight
      .then((r) => {
        cachedRate = r;
        if (!cancelled) setRate(r);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { rate, loading, error };
}
