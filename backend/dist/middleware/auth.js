"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const supabase_1 = require("../config/supabase");
const apiResponse_1 = require("../utils/apiResponse");
async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return (0, apiResponse_1.sendError)(res, "Unauthorized: Missing token", 401);
        }
        const token = authHeader.split(" ")[1];
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
            return (0, apiResponse_1.sendError)(res, "Unauthorized: Invalid token", 401);
        }
        req.user = { id: data.user.id, email: data.user.email || "" };
        req.accessToken = token;
        next();
    }
    catch {
        return (0, apiResponse_1.sendError)(res, "Authentication failed", 401);
    }
}
//# sourceMappingURL=auth.js.map