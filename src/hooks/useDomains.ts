import { useCallback, useEffect, useState } from "react";
import { listDomains } from "@/services/domains.service";
import type { DomainWithClient } from "@/types";

export function useDomains() {
  const [domains, setDomains] = useState<DomainWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDomains(await listDomains());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load domains");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { domains, loading, error, refetch };
}
