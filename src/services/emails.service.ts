import { supabase } from "@/lib/supabaseClient";
import type { EmailInsert, EmailRow, EmailUpdate, EmailWithClient } from "@/types";

const SELECT = "*, clients(client_name)";

type RawRow = EmailRow & { clients: { client_name: string } | null };

function flatten(row: RawRow): EmailWithClient {
  const { clients, ...rest } = row;
  return { ...rest, client_name: clients?.client_name ?? null };
}

export async function listEmails(): Promise<EmailWithClient[]> {
  const { data, error } = await supabase
    .from("emails")
    .select(SELECT)
    .order("expiration_date", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as RawRow[]).map(flatten);
}

export async function listEmailsByClient(clientId: string): Promise<EmailRow[]> {
  const { data, error } = await supabase
    .from("emails")
    .select("*")
    .eq("client_id", clientId)
    .order("expiration_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createEmail(input: EmailInsert): Promise<EmailRow> {
  const { data, error } = await supabase
    .from("emails")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateEmail(id: string, input: EmailUpdate): Promise<EmailRow> {
  const { data, error } = await supabase
    .from("emails")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEmail(id: string): Promise<void> {
  const { error } = await supabase.from("emails").delete().eq("id", id);
  if (error) throw error;
}
