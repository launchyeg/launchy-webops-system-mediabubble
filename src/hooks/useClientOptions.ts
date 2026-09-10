import { useEffect, useState } from "react";
import { listClientOptions } from "@/services/clients.service";
import type { ClientRow } from "@/types";

export function useClientOptions() {
  const [options, setOptions] = useState<Pick<ClientRow, "id" | "client_name">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    listClientOptions()
      .then((data) => mounted && setOptions(data))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return { clientOptions: options, loading };
}
