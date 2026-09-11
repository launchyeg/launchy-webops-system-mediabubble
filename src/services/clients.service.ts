import { supabase } from "@/lib/supabaseClient";
import { getRenewalInfo } from "@/utils/dates";
import type { ClientInsert, ClientRow, ClientUpdate, ClientWithCounts, RenewalTier } from "@/types";

// Worst-first ordering used to roll many services up into one client status.
const TIER_SEVERITY: Record<RenewalTier, number> = {
  expired: 4,
  urgent: 3,
  warning: 2,
  soon: 1,
  active: 0,
};

export async function listClients(): Promise<ClientWithCounts[]> {
  const [{ data: clients, error }, domains, hosting, emails] = await Promise.all([
    supabase.from("clients").select("*").order("client_name", { ascending: true }),
    supabase.from("domains").select("client_id, expiration_date"),
    supabase.from("hosting").select("client_id, expiration_date"),
    supabase.from("emails").select("client_id, expiration_date"),
  ]);

  if (error) throw error;
  if (domains.error) throw domains.error;
  if (hosting.error) throw hosting.error;
  if (emails.error) throw emails.error;

  // expiration_date is null only for a lifetime email (paid once, never
  // expires) — it still counts toward that client's service counts below,
  // just never toward their worst renewal tier.
  type Row = { client_id: string | null; expiration_date: string | null };
  const allRows: Row[] = [
    ...(domains.data ?? []),
    ...(hosting.data ?? []),
    ...(emails.data ?? []),
  ];

  const forClient = (rows: { client_id: string | null }[], id: string) =>
    rows.filter((r) => r.client_id === id).length;

  const worstTierForClient = (id: string): RenewalTier | null => {
    const rows = allRows.filter((r) => r.client_id === id);
    if (rows.length === 0) return null;
    // A lifetime email (null expiration_date) never contributes to the
    // worst tier, but its mere presence still means this client has at
    // least an "active" service, not "no services" — hence the "active"
    // starting point below rather than reusing rows.length === 0.
    return rows.reduce<RenewalTier>((worst, row) => {
      if (row.expiration_date === null) return worst;
      const tier = getRenewalInfo(row.expiration_date).tier;
      return TIER_SEVERITY[tier] > TIER_SEVERITY[worst] ? tier : worst;
    }, "active");
  };

  return (clients ?? []).map((c) => ({
    ...c,
    domain_count: forClient(domains.data ?? [], c.id),
    hosting_count: forClient(hosting.data ?? [], c.id),
    email_count: forClient(emails.data ?? [], c.id),
    worstRenewalTier: worstTierForClient(c.id),
  }));
}

export async function getClient(id: string): Promise<ClientRow | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createClient(input: ClientInsert): Promise<ClientRow> {
  const { data, error } = await supabase
    .from("clients")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateClient(
  id: string,
  input: ClientUpdate
): Promise<ClientRow> {
  const { data, error } = await supabase
    .from("clients")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

export async function listClientOptions(): Promise<
  Pick<ClientRow, "id" | "client_name">[]
> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, client_name")
    .order("client_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
