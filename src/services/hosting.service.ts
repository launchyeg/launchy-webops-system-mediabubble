import { supabase } from "@/lib/supabaseClient";
import type { HostingInsert, HostingRow, HostingUpdate, HostingWithClient } from "@/types";

const SELECT = "*, clients(client_name)";

type RawRow = HostingRow & { clients: { client_name: string } | null };

function flatten(row: RawRow): HostingWithClient {
  const { clients, ...rest } = row;
  return { ...rest, client_name: clients?.client_name ?? null };
}

export async function listHosting(): Promise<HostingWithClient[]> {
  const { data, error } = await supabase
    .from("hosting")
    .select(SELECT)
    .order("expiration_date", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as RawRow[]).map(flatten);
}

export async function listHostingByClient(
  clientId: string
): Promise<HostingRow[]> {
  const { data, error } = await supabase
    .from("hosting")
    .select("*")
    .eq("client_id", clientId)
    .order("expiration_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createHosting(input: HostingInsert): Promise<HostingRow> {
  const { data, error } = await supabase
    .from("hosting")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateHosting(
  id: string,
  input: HostingUpdate
): Promise<HostingRow> {
  const { data, error } = await supabase
    .from("hosting")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteHosting(id: string): Promise<void> {
  const { error } = await supabase.from("hosting").delete().eq("id", id);
  if (error) throw error;
}

/** The ids of every domain currently linked to this hosting account, via
 * the hosting_domains join table. */
export async function listHostingDomainIds(hostingId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("hosting_domains")
    .select("domain_id")
    .eq("hosting_id", hostingId);
  if (error) throw error;
  return (data ?? []).map((row) => row.domain_id);
}

/** Replaces the full set of domains linked to this hosting account with
 * `domainIds` — deletes every existing link row for it, then re-inserts
 * the given set. Called after create/update in the Add/Edit Hosting form,
 * which always submits the complete list rather than incremental changes. */
export async function setHostingDomains(
  hostingId: string,
  domainIds: string[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("hosting_domains")
    .delete()
    .eq("hosting_id", hostingId);
  if (deleteError) throw deleteError;
  if (domainIds.length === 0) return;
  const { error: insertError } = await supabase
    .from("hosting_domains")
    .insert(domainIds.map((domain_id) => ({ hosting_id: hostingId, domain_id })));
  if (insertError) throw insertError;
}
