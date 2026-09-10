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
