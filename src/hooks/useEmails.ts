import { useCallback, useEffect, useState } from "react";
import { listEmails } from "@/services/emails.service";
import type { EmailWithClient } from "@/types";

export function useEmails() {
  const [emails, setEmails] = useState<EmailWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEmails(await listEmails());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load emails");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { emails, loading, error, refetch };
}
