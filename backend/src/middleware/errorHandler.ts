import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/apiResponse";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error("[Error]", err.message, err.stack);
  const status = (err as Error & { status?: number }).status || 500;
  sendError(res, err.message || "Internal server error", status);
}

export function notFoundHandler(_req: Request, res: Response) {
  sendError(res, "Route not found", 404);
}
