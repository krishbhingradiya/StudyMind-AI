import { Request, Response, NextFunction } from "express";
import { getSupabaseAdmin } from "../config/supabase";
import { sendError } from "../utils/apiResponse";
import { AuthUser } from "../types";

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  accessToken?: string;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return sendError(res, "Unauthorized: Missing token", 401);
    }

    const token = authHeader.split(" ")[1];
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return sendError(res, "Unauthorized: Invalid token", 401);
    }

    req.user = { id: data.user.id, email: data.user.email || "" };
    req.accessToken = token;
    next();
  } catch {
    return sendError(res, "Authentication failed", 401);
  }
}
