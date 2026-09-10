import { supabase } from "@/lib/supabaseClient";
import type { DomainInsert, DomainRow, DomainUpdate, DomainWithClient } from "@/types";

const SELECT = "*, clients(client_name)";

type RawRow = DomainRow & { clients: { client_name: string } | null };

function flatten(row: RawRow): DomainWithClient {
  const { clients, ...rest } = row;
  return { ...rest, client_name: clients?.client_name ?? null };
}

export async function listDomains(): Promise<DomainWithClient[]> {
  const { data, error } = await supabase
    .from("domains")
    .select(SELECT)
    .order("expiration_date", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as RawRow[]).map(flatten);
}

export async function listDomainsByClient(
  clientId: string
): Promise<DomainRow[]> {
  const { data, error } = await supabase
    .from("domains")
    .select("*")
    .eq("client_id", clientId)
    .order("expiration_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createDomain(input: DomainInsert): Promise<DomainRow> {
  const { data, error } = await supabase
    .from("domains")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateDomain(
  id: string,
  input: DomainUpdate
): Promise<DomainRow> {
  const { data, error } = await supabase
    .from("domains")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDomain(id: string): Promise<void> {
  const { error } = await supabase.from("domains").delete().eq("id", id);
  if (error) throw error;
}
