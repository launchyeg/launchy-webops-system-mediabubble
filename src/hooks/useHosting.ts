import { useCallback, useEffect, useState } from "react";
import { listHosting } from "@/services/hosting.service";
import type { HostingWithClient } from "@/types";

export function useHosting() {
  const [hosting, setHosting] = useState<HostingWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setHosting(await listHosting());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hosting accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { hosting, loading, error, refetch };
}
