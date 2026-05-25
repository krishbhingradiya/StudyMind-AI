import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    if (!env.supabaseUrl || !env.supabaseServiceKey) {
      throw new Error("Supabase credentials not configured");
    }
    supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabaseAdmin;
}

export function getSupabaseClient(token: string): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey || env.supabaseServiceKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
