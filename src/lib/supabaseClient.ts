import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly in development rather than making silent, broken requests.
  console.error(
    "Missing Supabase environment variables. Copy .env.example to .env.local and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY."
  );
}

/**
 * Shared Supabase client for the app.
 *
 * Only the public URL and anon key are used here — both are safe to expose
 * in the frontend bundle. Data access is enforced by Postgres Row Level
 * Security policies (see supabase/schema.sql), not by keeping this client
 * secret. The service_role key must NEVER be used in frontend code.
 */
export const supabase = createClient<Database>(
  supabaseUrl ?? "",
  supabaseAnonKey ?? "",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
