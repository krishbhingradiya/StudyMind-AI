"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseAdmin = getSupabaseAdmin;
exports.getSupabaseClient = getSupabaseClient;
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("./env");
let supabaseAdmin = null;
function getSupabaseAdmin() {
    if (!supabaseAdmin) {
        if (!env_1.env.supabaseUrl || !env_1.env.supabaseServiceKey) {
            throw new Error("Supabase credentials not configured");
        }
        supabaseAdmin = (0, supabase_js_1.createClient)(env_1.env.supabaseUrl, env_1.env.supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
    }
    return supabaseAdmin;
}
function getSupabaseClient(token) {
    return (0, supabase_js_1.createClient)(env_1.env.supabaseUrl, env_1.env.supabaseAnonKey || env_1.env.supabaseServiceKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
    });
}
