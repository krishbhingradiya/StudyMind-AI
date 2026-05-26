import { setupLogger } from "./utils/logger";
setupLogger();

import app from "./app";
import { env } from "./config/env";
import { getSupabaseAdmin } from "./config/supabase";

const PORT = env.port;

app.listen(PORT, async () => {
  console.log(`StudyMind API running on port ${PORT} [${env.nodeEnv}]`);
  
  // Verify Supabase Admin connection on startup to detect invalid credentials or IP blocks early
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error("\x1b[31m%s\x1b[0m", `[Supabase] connection failed: ${error.message}`);
    } else {
      console.log("\x1b[32m%s\x1b[0m", "[Supabase] connection verified successfully. Admin client is ready.");
    }
  } catch (err) {
    console.error("\x1b[31m%s\x1b[0m", `[Supabase] initialization error: ${(err as Error).message}`);
  }
});
