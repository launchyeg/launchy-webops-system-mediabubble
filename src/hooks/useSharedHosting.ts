import { useCallback, useEffect, useState } from "react";
import { listSharedHosting } from "@/services/sharedHosting.service";
import type { SharedHostingRow } from "@/types";

export function useSharedHosting() {
  const [sharedHosting, setSharedHosting] = useState<SharedHostingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSharedHosting(await listSharedHosting());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shared hosting plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { sharedHosting, loading, error, refetch };
}
