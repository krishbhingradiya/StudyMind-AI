"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(res, data, message, status = 200) {
    const body = { success: true, data, message };
    return res.status(status).json(body);
}
function sendError(res, error, status = 400) {
    let cleanError = error;
    if (error && (error.includes("Unexpected token '<'") || error.includes("is not valid JSON"))) {
        cleanError = "Supabase API returned an HTML response instead of JSON. This usually indicates that the SUPABASE_URL environment variable is configured incorrectly in your Render dashboard (e.g., pointing to your frontend URL or containing a typo), or Cloudflare is blocking the Render server's IP address. Please verify your Render environment variables.";
    }
    const body = { success: false, error: cleanError };
    return res.status(status).json(body);
}
