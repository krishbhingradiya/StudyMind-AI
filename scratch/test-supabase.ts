import { getSupabaseAdmin } from "../backend/src/config/supabase";
import { env } from "../backend/src/config/env";

async function test() {
  console.log("Supabase URL:", env.supabaseUrl);
  console.log("Supabase Service Key (first 10 chars):", env.supabaseServiceKey.substring(0, 10));

  try {
    const supabase = getSupabaseAdmin();
    // Try to call a simple auth admin method
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error("Supabase Admin Error:", error);
    } else {
      console.log("Successfully connected to Supabase! Users count:", data.users.length);
    }
  } catch (err) {
    console.error("Test execution failed:", err);
  }
}

test();
