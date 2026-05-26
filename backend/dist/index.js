"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const supabase_1 = require("./config/supabase");
const PORT = env_1.env.port;
app_1.default.listen(PORT, async () => {
    console.log(`StudyMind API running on port ${PORT} [${env_1.env.nodeEnv}]`);
    // Verify Supabase Admin connection on startup to detect invalid credentials or IP blocks early
    try {
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { error } = await supabase.auth.admin.listUsers();
        if (error) {
            console.error("\x1b[31m%s\x1b[0m", `[Supabase] connection failed: ${error.message}`);
        }
        else {
            console.log("\x1b[32m%s\x1b[0m", "[Supabase] connection verified successfully. Admin client is ready.");
        }
    }
    catch (err) {
        console.error("\x1b[31m%s\x1b[0m", `[Supabase] initialization error: ${err.message}`);
    }
});
