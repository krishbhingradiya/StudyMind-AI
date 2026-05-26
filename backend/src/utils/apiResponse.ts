import { Response } from "express";
import { ApiResponse } from "../types";

export function sendSuccess<T>(res: Response, data: T, message?: string, status = 200) {
  const body: ApiResponse<T> = { success: true, data, message };
  return res.status(status).json(body);
}

export function sendError(res: Response, error: string, status = 400) {
  let cleanError = error;
  if (error && (error.includes("Unexpected token '<'") || error.includes("is not valid JSON"))) {
    cleanError = "Supabase API returned an HTML response instead of JSON. This usually indicates that the SUPABASE_URL environment variable is configured incorrectly in your Render dashboard (e.g., pointing to your frontend URL or containing a typo), or Cloudflare is blocking the Render server's IP address. Please verify your Render environment variables.";
  }
  const body: ApiResponse = { success: false, error: cleanError };
  return res.status(status).json(body);
}
