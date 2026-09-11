import { supabase } from "@/lib/supabaseClient";
import type { SharedHostingInsert, SharedHostingRow, SharedHostingUpdate } from "@/types";

export async function listSharedHosting(): Promise<SharedHostingRow[]> {
  const { data, error } = await supabase
    .from("shared_hosting")
    .select("*")
    .order("expiration_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createSharedHosting(
  input: SharedHostingInsert
): Promise<SharedHostingRow> {
  const { data, error } = await supabase
    .from("shared_hosting")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateSharedHosting(
  id: string,
  input: SharedHostingUpdate
): Promise<SharedHostingRow> {
  const { data, error } = await supabase
    .from("shared_hosting")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSharedHosting(id: string): Promise<void> {
  const { error } = await supabase.from("shared_hosting").delete().eq("id", id);
  if (error) throw error;
}
